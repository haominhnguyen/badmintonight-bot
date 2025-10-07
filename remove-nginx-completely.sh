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
    log_info "Removing nginx completely from server..."
    
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    
    log_info "Disabling nginx service..."
    sudo systemctl disable nginx || true
    
    log_info "Killing all nginx processes..."
    sudo pkill nginx || true
    sleep 2
    
    log_info "Removing nginx package..."
    sudo apt-get remove --purge nginx nginx-common nginx-core -y || true
    
    log_info "Removing nginx configuration files..."
    sudo rm -rf /etc/nginx/ || true
    sudo rm -rf /var/log/nginx/ || true
    sudo rm -rf /var/www/html/ || true
    sudo rm -rf /etc/letsencrypt/ || true
    
    log_info "Removing nginx user and group..."
    sudo userdel nginx || true
    sudo groupdel nginx || true
    
    log_info "Cleaning up nginx dependencies..."
    sudo apt-get autoremove -y || true
    sudo apt-get autoclean || true
    
    log_info "Checking if nginx is completely removed..."
    if command -v nginx >/dev/null 2>&1; then
        log_warning "Nginx command still exists"
    else
        log_success "Nginx command removed"
    fi
    
    if sudo systemctl is-active nginx >/dev/null 2>&1; then
        log_warning "Nginx service still active"
    else
        log_success "Nginx service removed"
    fi
    
    if [[ -d "/etc/nginx" ]]; then
        log_warning "Nginx config directory still exists"
    else
        log_success "Nginx config directory removed"
    fi
    
    log_info "Checking port 80..."
    if sudo netstat -tlnp | grep :80; then
        log_warning "Port 80 still in use:"
        sudo netstat -tlnp | grep :80
    else
        log_success "Port 80 is free"
    fi
    
    log_info "Checking port 443..."
    if sudo netstat -tlnp | grep :443; then
        log_warning "Port 443 still in use:"
        sudo netstat -tlnp | grep :443
    else
        log_success "Port 443 is free"
    fi
    
    log_success "Nginx completely removed from server!"
}

main "$@"
