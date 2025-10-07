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
    log_info "Fixing API Docs access..."
    
    log_info "Checking app container..."
    if ! sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_error "App container is not running"
        return 1
    fi
    
    log_info "Testing app container directly..."
    if curl -f -s -o /dev/null http://localhost:3100/api-docs; then
        log_success "App container API Docs is accessible"
    else
        log_warning "App container API Docs is not accessible"
        log_info "Checking app container logs..."
        sudo docker logs badminton-bot-prod --tail 20
    fi
    
    log_info "Restarting nginx service..."
    sudo systemctl restart nginx
    
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
    
    log_info "Testing API Docs through nginx..."
    if curl -f -s -o /dev/null http://localhost/api-docs; then
        log_success "API Docs is accessible through nginx"
    else
        log_warning "API Docs is not accessible through nginx"
        
        log_info "Checking nginx logs..."
        sudo tail -10 /var/log/nginx/error.log
        
        log_info "Testing with verbose curl..."
        curl -v http://localhost/api-docs 2>&1 || echo "API Docs test failed"
    fi
    
    log_info "Testing different API Docs paths..."
    echo "Testing /api-docs:"
    curl -v http://localhost/api-docs 2>&1 || echo "Failed"
    
    echo "Testing /api-docs/:"
    curl -v http://localhost/api-docs/ 2>&1 || echo "Failed"
    
    echo "Testing /docs:"
    curl -v http://localhost/docs 2>&1 || echo "Failed"
    
    echo "Testing /swagger:"
    curl -v http://localhost/swagger 2>&1 || echo "Failed"
    
    log_info "Checking nginx configuration..."
    echo "Current nginx config for api-docs:"
    grep -A 10 "api-docs" /etc/nginx/nginx.conf || echo "No api-docs config found"
    
    log_success "API Docs fix completed!"
}

main "$@"
