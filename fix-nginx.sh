#!/bin/bash

# Fix nginx configuration script
# This script fixes nginx configuration issues

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
    log_info "Starting nginx configuration fix..."
    
    # Stop nginx container if running
    log_info "Stopping nginx container..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        sudo docker stop badminton-nginx
        sudo docker rm badminton-nginx
        log_success "Nginx container stopped and removed"
    else
        log_info "Nginx container not running"
    fi
    
    # Check if SSL certificates exist
    log_info "Checking SSL certificates..."
    if [[ -f "/etc/letsencrypt/live/haominhnguyen.shop/fullchain.pem" ]]; then
        log_success "SSL certificates found"
        USE_SSL=true
    else
        log_warning "SSL certificates not found, using HTTP-only configuration"
        USE_SSL=false
    fi
    
    # Use appropriate nginx configuration
    if [[ "$USE_SSL" == "true" ]]; then
        log_info "Using SSL-enabled nginx configuration..."
        cp nginx.conf nginx.conf.current
    else
        log_info "Using HTTP-only nginx configuration..."
        cp nginx-http-test.conf nginx.conf.current
    fi
    
    # Ensure app container is running before starting nginx
    log_info "Ensuring app container is running..."
    if ! sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_info "Starting app container..."
        sudo docker-compose -f docker-compose.prod.yml up -d app
        sleep 10
    fi
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo docker run --rm -v $(pwd)/nginx.conf.current:/etc/nginx/nginx.conf nginx:alpine nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
        return 1
    fi
    
    # Start nginx with correct configuration
    log_info "Starting nginx with fixed configuration..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Wait for nginx to start
    sleep 10
    
    # Check if nginx is running
    log_info "Checking nginx status..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx is running"
    else
        log_error "Nginx failed to start"
        return 1
    fi
    
    # Test nginx connectivity
    log_info "Testing nginx connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "Nginx HTTP connectivity test passed"
    else
        log_warning "Nginx HTTP connectivity test failed"
    fi
    
    # Check nginx logs
    log_info "Checking nginx logs..."
    echo "=== Nginx Logs (last 10 lines) ==="
    sudo docker logs badminton-nginx --tail 10
    
    log_success "Nginx configuration fix completed!"
}

# Run main function
main "$@"
