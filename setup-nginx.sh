#!/bin/bash

# Setup nginx script
# This script sets up nginx with HTTP-only configuration

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
    log_info "Setting up nginx with HTTP-only configuration..."
    
    # Stop nginx service
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    
    # Remove any existing configs
    log_info "Removing any existing configs..."
    sudo rm -rf /etc/nginx/sites-enabled/* || true
    sudo rm -rf /etc/nginx/sites-available/* || true
    sudo rm -rf /etc/nginx/conf.d/* || true
    
    # Copy nginx configuration
    log_info "Copying nginx configuration..."
    sudo cp nginx.conf /etc/nginx/nginx.conf
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
    
    # Start nginx service
    log_info "Starting nginx service..."
    sudo systemctl start nginx
    
    # Wait for nginx to start
    sleep 5
    
    # Check nginx status
    log_info "Checking nginx status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service failed to start"
        return 1
    fi
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
    fi
    
    log_success "Nginx setup completed!"
}

# Run main function
main "$@"
