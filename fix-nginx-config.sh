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
    
    # Stop nginx container
    log_info "Stopping nginx container..."
    sudo docker stop badminton-nginx || true
    sudo docker rm badminton-nginx || true
    
    # Wait for app container to be ready
    log_info "Waiting for app container to be ready..."
    for i in {1..30}; do
        if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
            log_success "App container is running"
            break
        fi
        
        if [[ $i -eq 30 ]]; then
            log_warning "App container is not ready after 30 attempts"
        fi
        
        sleep 2
    done
    
    # Check if SSL certificates exist
    log_info "Checking SSL certificates..."
    if [[ -f "/etc/letsencrypt/live/haominhnguyen.shop/fullchain.pem" ]]; then
        log_success "SSL certificates found, using HTTPS configuration"
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
    
    # Start nginx container
    log_info "Starting nginx container..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Wait for nginx to start
    sleep 10
    
    # Check if nginx is running
    log_info "Checking nginx status..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx is running"
    else
        log_error "Nginx failed to start"
        
        # Show nginx logs
        echo "=== Nginx Logs ==="
        sudo docker logs badminton-nginx 2>&1 || echo "No logs found"
        return 1
    fi
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo docker exec badminton-nginx nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
        
        # Show nginx configuration
        echo "=== Nginx Configuration ==="
        sudo docker exec badminton-nginx cat /etc/nginx/nginx.conf
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
    
    log_success "Nginx configuration fix completed!"
}

# Run main function
main "$@"
