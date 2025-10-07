#!/bin/bash

# Nginx Manager Script
# This script manages nginx container and system service

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
    log_info "Managing nginx service..."
    
    # Stop system nginx service
    log_info "Stopping system nginx service..."
    sudo systemctl stop nginx || true
    sudo systemctl disable nginx || true
    
    # Stop nginx container if running
    log_info "Stopping nginx container..."
    sudo docker stop badminton-nginx || true
    sudo docker rm badminton-nginx || true
    
    # Start nginx container
    log_info "Starting nginx container..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Wait for nginx to start
    sleep 10
    
    # Check if nginx container is running
    log_info "Checking nginx container status..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx container is running"
    else
        log_error "Nginx container failed to start"
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
    fi
    
    # Show nginx status
    log_info "Nginx status:"
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep nginx
    
    log_success "Nginx management completed!"
}

# Run main function
main "$@"
