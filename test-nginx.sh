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
    
    # Test nginx configuration syntax
    log_info "Testing nginx configuration syntax..."
    if sudo docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf nginx:alpine nginx -t; then
        log_success "Nginx configuration syntax is valid"
    else
        log_error "Nginx configuration syntax is invalid"
        return 1
    fi
    
    # Check if nginx container is running
    log_info "Checking nginx container status..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx container is running"
    else
        log_warning "Nginx container is not running"
    fi
    
    # Test nginx configuration in running container
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_info "Testing nginx configuration in running container..."
        if sudo docker exec badminton-nginx nginx -t; then
            log_success "Nginx configuration is valid in running container"
        else
            log_error "Nginx configuration is invalid in running container"
            
            # Show nginx logs
            echo "=== Nginx Logs ==="
            sudo docker logs badminton-nginx --tail 20
            return 1
        fi
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
    
    # Show nginx status
    log_info "Nginx status:"
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep nginx || echo "No nginx container found"
    
    log_success "Nginx configuration test completed!"
}

# Run main function
main "$@"
