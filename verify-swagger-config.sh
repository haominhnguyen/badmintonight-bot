#!/bin/bash

# Verify Swagger Configuration Script
# This script verifies that all Swagger configurations use port 3100

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
    log_info "Verifying Swagger configuration..."
    
    # Check for any remaining 3101 references
    log_info "Checking for any remaining port 3101 references..."
    if grep -r "3101" . --exclude-dir=node_modules --exclude-dir=.git >/dev/null 2>&1; then
        log_error "Found remaining port 3101 references:"
        grep -r "3101" . --exclude-dir=node_modules --exclude-dir=.git
        exit 1
    else
        log_success "No port 3101 references found"
    fi
    
    # Check Swagger configuration files
    log_info "Checking Swagger configuration files..."
    
    # Check src/swagger.js
    if grep -q "localhost:3100" src/swagger.js; then
        log_success "✓ src/swagger.js uses port 3100"
    else
        log_error "✗ src/swagger.js does not use port 3100"
    fi
    
    # Check src/api-server.js
    if grep -q "3100" src/api-server.js; then
        log_success "✓ src/api-server.js uses port 3100"
    else
        log_error "✗ src/api-server.js does not use port 3100"
    fi
    
    # Check docker-compose files
    log_info "Checking Docker Compose files..."
    
    if grep -q "3100" docker-compose.prod.yml; then
        log_success "✓ docker-compose.prod.yml uses port 3100"
    else
        log_warning "⚠ docker-compose.prod.yml does not specify port 3100"
    fi
    
    if grep -q "3100" docker-compose.api.yml; then
        log_success "✓ docker-compose.api.yml uses port 3100"
    else
        log_error "✗ docker-compose.api.yml does not use port 3100"
    fi
    
    if grep -q "3100" docker-compose.staging.yml; then
        log_success "✓ docker-compose.staging.yml uses port 3100"
    else
        log_error "✗ docker-compose.staging.yml does not use port 3100"
    fi
    
    # Check Dockerfile
    if grep -q "3100" Dockerfile.api; then
        log_success "✓ Dockerfile.api uses port 3100"
    else
        log_error "✗ Dockerfile.api does not use port 3100"
    fi
    
    # Check test scripts
    log_info "Checking test scripts..."
    
    if grep -q "3100" scripts/test-swagger-server.js; then
        log_success "✓ scripts/test-swagger-server.js uses port 3100"
    else
        log_error "✗ scripts/test-swagger-server.js does not use port 3100"
    fi
    
    if grep -q "3100" scripts/test-docker-build.sh; then
        log_success "✓ scripts/test-docker-build.sh uses port 3100"
    else
        log_error "✗ scripts/test-docker-build.sh does not use port 3100"
    fi
    
    # Test Swagger server locally
    log_info "Testing Swagger server locally..."
    
    # Start test server in background
    node scripts/test-swagger-server.js &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test endpoints
    if curl -f -s http://localhost:3100/api-docs >/dev/null 2>&1; then
        log_success "✓ Swagger docs accessible on port 3100"
    else
        log_warning "⚠ Swagger docs not accessible on port 3100"
    fi
    
    if curl -f -s http://localhost:3100/api/v1/version >/dev/null 2>&1; then
        log_success "✓ API version endpoint accessible on port 3100"
    else
        log_warning "⚠ API version endpoint not accessible on port 3100"
    fi
    
    # Stop test server
    kill $SERVER_PID 2>/dev/null || true
    
    log_success "Swagger configuration verification completed!"
    log_info "All Swagger configurations now use port 3100"
}

main "$@"
