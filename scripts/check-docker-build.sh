#!/bin/bash

# Script to check Docker build process and ensure proper image creation
# Usage: ./scripts/check-docker-build.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check Docker installation
check_docker() {
    log "🔍 Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    log "✅ Docker and Docker Compose are available"
}

# Check project files
check_project_files() {
    log "🔍 Checking project files..."
    
    local required_files=(
        "package.json"
        "Dockerfile"
        "Dockerfile.arm64"
        "docker-compose.yml"
        "docker-compose.prod.yml"
        "public/index.html"
        "src/api/v1/version.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log "✅ $file exists"
        else
            error "❌ $file is missing"
            exit 1
        fi
    done
}

# Check Dockerfile content
check_dockerfile() {
    log "🔍 Checking Dockerfile content..."
    
    # Check if public directory is copied in Dockerfile.arm64
    if grep -q "COPY public ./public" Dockerfile.arm64; then
        log "✅ Dockerfile.arm64 includes public directory copy"
    else
        error "❌ Dockerfile.arm64 missing public directory copy"
        exit 1
    fi
    
    # Check if public directory is copied in Dockerfile
    if grep -q "COPY public ./public" Dockerfile; then
        log "✅ Dockerfile includes public directory copy"
    else
        error "❌ Dockerfile missing public directory copy"
        exit 1
    fi
}

# Test Docker build
test_docker_build() {
    log "🔨 Testing Docker build..."
    
    # Build test image
    log "Building test image..."
    docker build -f Dockerfile.arm64 -t badminton-test:latest .
    
    if [ $? -eq 0 ]; then
        log "✅ Docker build successful"
    else
        error "❌ Docker build failed"
        exit 1
    fi
    
    # Check if public files are in the image
    log "Checking if public files are in the image..."
    if docker run --rm badminton-test:latest ls -la /app/public/ | grep -q "index.html"; then
        log "✅ index.html is present in the image"
    else
        error "❌ index.html is missing from the image"
        exit 1
    fi
    
    # Check if version API is in the image
    if docker run --rm badminton-test:latest ls -la /app/src/api/v1/ | grep -q "version.js"; then
        log "✅ version.js is present in the image"
    else
        error "❌ version.js is missing from the image"
        exit 1
    fi
}

# Check docker-compose configuration
check_docker_compose() {
    log "🔍 Checking docker-compose configuration..."
    
    # Check if docker-compose.prod.yml uses correct dockerfile
    if grep -q "dockerfile: Dockerfile.arm64" docker-compose.prod.yml; then
        log "✅ docker-compose.prod.yml uses Dockerfile.arm64"
    else
        error "❌ docker-compose.prod.yml not using Dockerfile.arm64"
        exit 1
    fi
}

# Test docker-compose build
test_docker_compose_build() {
    log "🔨 Testing docker-compose build..."
    
    # Build using docker-compose
    log "Building with docker-compose..."
    docker-compose -f docker-compose.prod.yml build
    
    if [ $? -eq 0 ]; then
        log "✅ docker-compose build successful"
    else
        error "❌ docker-compose build failed"
        exit 1
    fi
}

# Check image layers
check_image_layers() {
    log "🔍 Checking image layers..."
    
    # Show image history
    log "Image history:"
    docker history badminton-test:latest --no-trunc
    
    # Check image size
    log "Image size:"
    docker images badminton-test:latest
}

# Cleanup test image
cleanup() {
    log "🧹 Cleaning up test image..."
    docker rmi badminton-test:latest 2>/dev/null || true
    log "✅ Cleanup completed"
}

# Main function
main() {
    log "🚀 Starting Docker build check..."
    
    check_docker
    check_project_files
    check_dockerfile
    test_docker_build
    check_docker_compose
    test_docker_compose_build
    check_image_layers
    cleanup
    
    log "✅ Docker build check completed successfully!"
    log "🎉 Your Docker setup is ready for deployment!"
}

# Run main function
main "$@"
