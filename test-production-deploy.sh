#!/bin/bash

# Test Production Deployment Locally
# This script simulates the production deployment process locally

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

main() {
    log_info "Testing production deployment locally..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Test the fixed deployment script
    log_info "Running deploy-fixed.sh..."
    chmod +x deploy-fixed.sh
    ./deploy-fixed.sh
    
    # Additional tests
    log_info "Running additional tests..."
    
    # Test all endpoints
    log_info "Testing all endpoints..."
    
    endpoints=(
        "http://localhost:3100/health"
        "http://localhost:3100/api/v1/version"
        "http://localhost/api/v1/version"
        "http://localhost/api-docs"
        "http://localhost/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" >/dev/null 2>&1; then
            log_success "✓ $endpoint"
        else
            log_warning "⚠ $endpoint"
        fi
    done
    
    # Check container logs for errors
    log_info "Checking container logs for errors..."
    
    if docker logs badminton-bot-prod --tail 20 2>&1 | grep -i error; then
        log_warning "Found errors in app container logs"
    else
        log_success "No errors found in app container logs"
    fi
    
    if docker logs badminton-nginx-prod --tail 20 2>&1 | grep -i error; then
        log_warning "Found errors in nginx container logs"
    else
        log_success "No errors found in nginx container logs"
    fi
    
    # Show final status
    log_info "Final deployment status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log_success "Local deployment test completed!"
    log_info "If all tests passed, you can now push to production."
}

main "$@"
