#!/bin/bash

# Test nginx configuration script
# This script tests nginx configuration and provides debugging info

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
    log_info "Testing nginx configuration..."
    
    # Check nginx service status
    log_info "Checking nginx service status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service is not running"
        log_info "Nginx service status:"
        sudo systemctl status nginx --no-pager
        return 1
    fi
    
    # Test nginx configuration syntax
    log_info "Testing nginx configuration syntax..."
    if sudo nginx -t; then
        log_success "Nginx configuration syntax is valid"
    else
        log_error "Nginx configuration syntax is invalid"
        log_info "Nginx configuration content:"
        sudo cat /etc/nginx/nginx.conf
        return 1
    fi
    
    # Check for SSL references
    log_info "Checking for SSL references in nginx config..."
    if grep -q "ssl\|cert\|key\|letsencrypt" /etc/nginx/nginx.conf; then
        log_warning "Found SSL references in nginx config:"
        grep -n "ssl\|cert\|key\|letsencrypt" /etc/nginx/nginx.conf
        log_info "This may cause issues with HTTP-only setup"
    else
        log_success "No SSL references found in nginx config"
    fi
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
        log_info "Testing different endpoints:"
        echo "Testing /health:"
        curl -v http://localhost/health 2>&1 || echo "Health check failed"
        echo "Testing /:"
        curl -v http://localhost/ 2>&1 || echo "Root endpoint failed"
    fi
    
    # Check nginx logs
    log_info "Checking nginx logs for errors..."
    if sudo journalctl -u nginx --no-pager -n 20 | grep -i error; then
        log_warning "Found errors in nginx logs:"
        sudo journalctl -u nginx --no-pager -n 20 | grep -i error
    else
        log_success "No errors found in nginx logs"
    fi
    
    # Check port bindings
    log_info "Checking port bindings..."
    sudo netstat -tlnp | grep -E ":(80|3100)" || echo "No ports found"
    
    # Show nginx configuration summary
    log_info "Nginx configuration summary:"
    echo "  - Configuration file: /etc/nginx/nginx.conf"
    echo "  - Service status: $(sudo systemctl is-active nginx)"
    echo "  - Port 80: $(sudo netstat -tlnp | grep :80 | wc -l) listeners"
    echo "  - App container: $(sudo docker ps --format '{{.Names}}' | grep badminton-bot-prod || echo 'Not running')"
    
    log_success "Nginx configuration test completed!"
}

# Run main function
main "$@"
