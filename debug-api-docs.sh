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
    log_info "Debugging API Docs access..."
    
    log_info "Checking app container status..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_success "App container is running"
    else
        log_error "App container is not running"
        return 1
    fi
    
    log_info "Testing app container directly..."
    echo "Testing http://localhost:3100/api-docs"
    curl -v http://localhost:3100/api-docs 2>&1 || echo "Direct app access failed"
    
    log_info "Testing nginx proxy..."
    echo "Testing http://localhost/api-docs"
    curl -v http://localhost/api-docs 2>&1 || echo "Nginx proxy failed"
    
    log_info "Checking nginx status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service is not running"
    fi
    
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
    fi
    
    log_info "Checking nginx logs..."
    echo "Nginx access logs (last 10 lines):"
    sudo tail -10 /var/log/nginx/access.log || echo "No access logs found"
    
    echo "Nginx error logs (last 10 lines):"
    sudo tail -10 /var/log/nginx/error.log || echo "No error logs found"
    
    log_info "Checking app container logs..."
    echo "App container logs (last 10 lines):"
    sudo docker logs badminton-bot-prod --tail 10
    
    log_info "Testing different endpoints..."
    echo "Testing /health:"
    curl -v http://localhost/health 2>&1 || echo "Health check failed"
    
    echo "Testing /api/:"
    curl -v http://localhost/api/ 2>&1 || echo "API endpoint failed"
    
    echo "Testing /:"
    curl -v http://localhost/ 2>&1 || echo "Root endpoint failed"
    
    log_info "Checking port bindings..."
    sudo netstat -tlnp | grep -E ":(80|3100)" || echo "No ports found"
    
    log_info "Checking nginx configuration for api-docs..."
    if grep -q "api-docs" /etc/nginx/nginx.conf; then
        log_success "API-docs location found in nginx config"
        grep -A 10 "api-docs" /etc/nginx/nginx.conf
    else
        log_error "API-docs location not found in nginx config"
    fi
    
    log_success "API Docs debug completed!"
}

main "$@"
