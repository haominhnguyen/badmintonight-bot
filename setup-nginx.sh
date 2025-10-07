#!/bin/bash

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
    log_info "Setting up nginx for port 80..."
    
    log_info "Installing nginx..."
    sudo apt-get update
    sudo apt-get install nginx -y
    
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    
    log_info "Backing up original nginx config..."
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup || true
    
    log_info "Copying nginx configuration..."
    sudo cp nginx.conf /etc/nginx/nginx.conf
    
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
    
    log_info "Starting nginx service..."
    sudo systemctl start nginx
    
    log_info "Enabling nginx service..."
    sudo systemctl enable nginx
    
    log_info "Checking nginx status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service failed to start"
        return 1
    fi
    
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
    fi
    
    log_info "Port bindings:"
    sudo netstat -tlnp | grep :80 || echo "Port 80 not found"
    
    log_success "Nginx setup completed!"
}

main "$@"
