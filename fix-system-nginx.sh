#!/bin/bash

# Fix system nginx service
# This script fixes system nginx service configuration

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
    log_info "Fixing system nginx service..."
    
    # Stop nginx service
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    
    # Backup original nginx config
    log_info "Backing up original nginx config..."
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup || true
    
    # Copy new nginx config
    log_info "Copying new nginx config..."
    sudo cp nginx-system.conf /etc/nginx/nginx.conf
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
        return 1
    fi
    
    # Start nginx service
    log_info "Starting nginx service..."
    sudo systemctl start nginx
    
    # Enable nginx service
    log_info "Enabling nginx service..."
    sudo systemctl enable nginx
    
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
    
    # Show nginx status
    log_info "Nginx service status:"
    sudo systemctl status nginx --no-pager
    
    log_success "System nginx service fixed!"
}

# Run main function
main "$@"
