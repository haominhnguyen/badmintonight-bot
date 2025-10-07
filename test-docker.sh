#!/bin/bash

# Test Docker Build Script
# This script tests Docker build locally before pushing to registry

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="haominhnguyen/badmintonight-bot"
TAG="test"
PORT=3100

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "Docker is available"
}

check_dockerfile() {
    log_info "Checking Dockerfile..."
    
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    log_success "Dockerfile found"
}

build_image() {
    log_info "Building Docker image..."
    
    docker build -t $IMAGE_NAME:$TAG .
    
    if [ $? -eq 0 ]; then
        log_success "Docker image built successfully"
    else
        log_error "Docker build failed"
        exit 1
    fi
}

test_image() {
    log_info "Testing Docker image..."
    
    # Start container in background
    docker run -d --name badminton-test -p $PORT:$PORT $IMAGE_NAME:$TAG
    
    # Wait for container to start
    sleep 10
    
    # Check if container is running
    if docker ps | grep -q "badminton-test"; then
        log_success "Container is running"
    else
        log_error "Container failed to start"
        docker logs badminton-test
        exit 1
    fi
    
    # Test health endpoint
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
            log_success "Health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            docker logs badminton-test
            exit 1
        fi
        
        log_info "Health check attempt $attempt/$max_attempts"
        sleep 5
        ((attempt++))
    done
}

cleanup() {
    log_info "Cleaning up test container..."
    
    # Stop and remove container
    docker stop badminton-test 2>/dev/null || true
    docker rm badminton-test 2>/dev/null || true
    
    log_success "Cleanup completed"
}

show_image_info() {
    log_info "Docker image information:"
    
    echo ""
    echo "=== IMAGE DETAILS ==="
    docker images $IMAGE_NAME:$TAG
    echo ""
    
    echo "=== IMAGE SIZE ==="
    docker images $IMAGE_NAME:$TAG --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo ""
    
    echo "=== IMAGE LAYERS ==="
    docker history $IMAGE_NAME:$TAG
    echo ""
}

test_multi_platform() {
    log_info "Testing multi-platform build..."
    
    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        log_warning "Docker buildx not available, skipping multi-platform test"
        return 0
    fi
    
    # Create buildx builder
    docker buildx create --name multiarch --use 2>/dev/null || true
    
    # Test build for multiple platforms
    docker buildx build --platform linux/amd64,linux/arm64 -t $IMAGE_NAME:$TAG-multi .
    
    log_success "Multi-platform build completed"
}

push_to_registry() {
    local push=$1
    
    if [ "$push" = "true" ]; then
        log_info "Pushing image to Docker Hub..."
        
        # Check if logged in to Docker Hub
        if ! docker info | grep -q "Username"; then
            log_warning "Not logged in to Docker Hub, skipping push"
            return 0
        fi
        
        docker push $IMAGE_NAME:$TAG
        
        if [ $? -eq 0 ]; then
            log_success "Image pushed successfully"
        else
            log_error "Failed to push image"
            exit 1
        fi
    else
        log_info "Skipping push to registry (use --push to enable)"
    fi
}

# Main execution
main() {
    log_info "Starting Docker build test..."
    
    check_docker
    check_dockerfile
    build_image
    test_image
    show_image_info
    test_multi_platform
    cleanup
    
    log_success "Docker build test completed successfully!"
}

# Script usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --push              - Push image to Docker Hub after build"
    echo "  --no-test           - Skip container testing"
    echo "  --no-cleanup        - Skip cleanup after test"
    echo "  --help              - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Build and test locally"
    echo "  $0 --push           # Build, test, and push to Docker Hub"
    echo "  $0 --no-test         # Build only, skip testing"
}

# Parse arguments
PUSH=false
NO_TEST=false
NO_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --no-test)
            NO_TEST=true
            shift
            ;;
        --no-cleanup)
            NO_CLEANUP=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main

# Push if requested
if [ "$PUSH" = "true" ]; then
    push_to_registry true
fi

log_success "All tests completed!"
