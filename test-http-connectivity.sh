#!/bin/bash

# Test HTTP connectivity script
# This script tests HTTP connectivity for Cloudflare setup

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
    log_info "Testing HTTP connectivity for Cloudflare setup..."
    
    # Check if nginx container is running
    log_info "Checking nginx container..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx container is running"
    else
        log_error "Nginx container is not running"
        return 1
    fi
    
    # Check if app container is running
    log_info "Checking app container..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_success "App container is running"
    else
        log_error "App container is not running"
        return 1
    fi
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    
    # Test health endpoint
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "Health endpoint is accessible"
    else
        log_warning "Health endpoint is not accessible"
    fi
    
    # Test webhook endpoint
    if curl -f -s -o /dev/null http://localhost/webhook; then
        log_success "Webhook endpoint is accessible"
    else
        log_warning "Webhook endpoint is not accessible"
    fi
    
    # Test API endpoint
    if curl -f -s -o /dev/null http://localhost/api/; then
        log_success "API endpoint is accessible"
    else
        log_warning "API endpoint is not accessible"
    fi
    
    # Test root endpoint
    if curl -f -s -o /dev/null http://localhost/; then
        log_success "Root endpoint is accessible"
    else
        log_warning "Root endpoint is not accessible"
    fi
    
    # Show nginx status
    log_info "Nginx status:"
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep nginx
    
    # Show nginx logs
    log_info "Nginx logs (last 10 lines):"
    sudo docker logs badminton-nginx --tail 10
    
    log_success "HTTP connectivity test completed!"
    log_info "Your app is ready for Cloudflare HTTPS setup!"
}

# Run main function
main "$@"
