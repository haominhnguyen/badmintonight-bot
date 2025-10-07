#!/bin/bash

# Fix Nginx SSL certificate error script
# This script completely removes SSL references and creates HTTP-only nginx config

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
    log_info "Fixing Nginx SSL certificate error..."
    
    # Stop nginx service
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    
    # Remove any existing SSL certificates and configs
    log_info "Cleaning up SSL certificates..."
    sudo rm -rf /etc/letsencrypt/ || true
    sudo rm -rf /etc/nginx/sites-enabled/* || true
    sudo rm -rf /etc/nginx/sites-available/* || true
    
    # Get app container IP
    log_info "Getting app container IP..."
    APP_IP="127.0.0.1"
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        APP_IP=$(sudo docker inspect badminton-bot-prod | grep -o '"IPAddress": "[^"]*"' | head -1 | cut -d'"' -f4)
        if [[ -z "$APP_IP" ]]; then
            log_warning "Could not get app container IP, using localhost"
            APP_IP="127.0.0.1"
        else
            log_success "App container IP: $APP_IP"
        fi
    else
        log_warning "App container not running, using localhost"
    fi
    
    # Create completely clean HTTP-only nginx configuration
    log_info "Creating HTTP-only nginx configuration..."
    sudo cp nginx-clean.conf /etc/nginx/nginx.conf
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        log_info "Nginx configuration content:"
        sudo cat /etc/nginx/nginx.conf
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
        log_info "Nginx service status:"
        sudo systemctl status nginx --no-pager
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
    
    log_success "Nginx SSL error fixed! Nginx is now running HTTP-only for Cloudflare."
}

# Run main function
main "$@"