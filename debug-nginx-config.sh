#!/bin/bash

# Debug nginx configuration script
# This script shows current nginx configuration and identifies SSL issues

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
    log_info "Debugging nginx configuration..."
    
    # Show current nginx config
    log_info "Current nginx configuration:"
    echo "=========================================="
    sudo cat /etc/nginx/nginx.conf
    echo "=========================================="
    
    # Check for SSL references
    log_info "Checking for SSL references in nginx config..."
    if grep -q "ssl\|cert\|key\|letsencrypt\|443" /etc/nginx/nginx.conf; then
        log_warning "Found SSL references in nginx config:"
        grep -n "ssl\|cert\|key\|letsencrypt\|443" /etc/nginx/nginx.conf
    else
        log_success "No SSL references found in nginx config"
    fi
    
    # Check nginx service status
    log_info "Checking nginx service status..."
    sudo systemctl status nginx --no-pager
    
    # Check nginx configuration test
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration test passed"
    else
        log_error "Nginx configuration test failed"
        log_info "Nginx error logs:"
        sudo journalctl -u nginx --no-pager -n 10
    fi
    
    # Check port bindings
    log_info "Checking port bindings..."
    sudo netstat -tlnp | grep -E ":(80|443|3100)" || echo "No ports found"
    
    # Check for other nginx config files
    log_info "Checking for other nginx config files..."
    echo "Files in /etc/nginx/:"
    sudo ls -la /etc/nginx/
    echo ""
    echo "Files in /etc/nginx/sites-enabled/:"
    sudo ls -la /etc/nginx/sites-enabled/ || echo "No sites-enabled directory"
    echo ""
    echo "Files in /etc/nginx/sites-available/:"
    sudo ls -la /etc/nginx/sites-available/ || echo "No sites-available directory"
    echo ""
    echo "Files in /etc/nginx/conf.d/:"
    sudo ls -la /etc/nginx/conf.d/ || echo "No conf.d directory"
    
    # Check for Let's Encrypt certificates
    log_info "Checking for Let's Encrypt certificates..."
    if [[ -d "/etc/letsencrypt" ]]; then
        log_warning "Let's Encrypt directory exists:"
        sudo ls -la /etc/letsencrypt/
    else
        log_success "No Let's Encrypt directory found"
    fi
    
    # Show nginx processes
    log_info "Nginx processes:"
    sudo ps aux | grep nginx || echo "No nginx processes found"
    
    log_success "Nginx configuration debug completed!"
}

# Run main function
main "$@"
