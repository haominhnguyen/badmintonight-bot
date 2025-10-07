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
    log_info "Checking nginx status on server..."
    
    log_info "Checking nginx service status..."
    if sudo systemctl is-active nginx >/dev/null 2>&1; then
        log_warning "Nginx service is active"
        sudo systemctl status nginx --no-pager
    else
        log_success "Nginx service is not active"
    fi
    
    log_info "Checking nginx command..."
    if command -v nginx >/dev/null 2>&1; then
        log_warning "Nginx command exists:"
        which nginx
        nginx -v
    else
        log_success "Nginx command not found"
    fi
    
    log_info "Checking nginx processes..."
    if pgrep nginx >/dev/null 2>&1; then
        log_warning "Nginx processes running:"
        ps aux | grep nginx
    else
        log_success "No nginx processes running"
    fi
    
    log_info "Checking nginx directories..."
    if [[ -d "/etc/nginx" ]]; then
        log_warning "Nginx config directory exists:"
        sudo ls -la /etc/nginx/
    else
        log_success "Nginx config directory not found"
    fi
    
    if [[ -d "/var/log/nginx" ]]; then
        log_warning "Nginx log directory exists:"
        sudo ls -la /var/log/nginx/
    else
        log_success "Nginx log directory not found"
    fi
    
    if [[ -d "/var/www/html" ]]; then
        log_warning "Nginx web directory exists:"
        sudo ls -la /var/www/html/
    else
        log_success "Nginx web directory not found"
    fi
    
    log_info "Checking port bindings..."
    echo "Port 80:"
    sudo netstat -tlnp | grep :80 || echo "No listeners on port 80"
    
    echo "Port 443:"
    sudo netstat -tlnp | grep :443 || echo "No listeners on port 443"
    
    log_info "Checking nginx package..."
    if dpkg -l | grep nginx; then
        log_warning "Nginx packages installed:"
        dpkg -l | grep nginx
    else
        log_success "No nginx packages installed"
    fi
    
    log_success "Nginx status check completed!"
}

main "$@"
