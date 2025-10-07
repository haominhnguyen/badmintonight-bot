#!/bin/bash

# Test nginx configuration script
# This script tests nginx configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Main function
main() {
    log_info "Testing nginx configuration..."
    
    # Check if nginx container is running
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx container is running"
    else
        log_error "Nginx container is not running"
        return 1
    fi
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo docker exec badminton-nginx nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
        return 1
    fi
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
        
        # Try different endpoints
        log_info "Trying different endpoints..."
        curl -v http://localhost/ 2>&1 || echo "Connection failed"
        curl -v http://localhost/health 2>&1 || echo "Health check failed"
    fi
    
    # Check nginx logs
    log_info "Checking nginx logs..."
    echo "=== Nginx Logs (last 10 lines) ==="
    sudo docker logs badminton-nginx --tail 10
    
    log_success "Nginx configuration test completed!"
}

# Run main function
main "$@"
