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

test_endpoint() {
    local url=$1
    local name=$2
    
    log_info "Testing $name: $url"
    
    if curl -f -s -o /dev/null "$url"; then
        log_success "$name is accessible"
        return 0
    else
        log_error "$name is not accessible"
        return 1
    fi
}

main() {
    log_info "Testing API endpoints..."
    
    # Test direct app container
    log_info "Testing direct app container (port 3100)..."
    if test_endpoint "http://localhost:3100/health" "App Health"; then
        log_success "App container is running on port 3100"
    else
        log_error "App container is not accessible on port 3100"
    fi
    
    # Test nginx proxy
    log_info "Testing nginx proxy (port 80)..."
    if test_endpoint "http://localhost/health" "Nginx Health"; then
        log_success "Nginx proxy is working"
    else
        log_error "Nginx proxy is not working"
    fi
    
    # Test API endpoints through nginx
    log_info "Testing API endpoints through nginx..."
    
    test_endpoint "http://localhost/api/health" "API Health"
    test_endpoint "http://localhost/api/v1/health" "API v1 Health"
    test_endpoint "http://localhost/api-docs" "API Docs"
    test_endpoint "http://localhost/docs" "Docs"
    test_endpoint "http://localhost/swagger" "Swagger"
    
    # Test webhook endpoint
    log_info "Testing webhook endpoint..."
    test_endpoint "http://localhost/webhook" "Webhook"
    
    # Check nginx configuration
    log_info "Checking nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
    fi
    
    # Check nginx status
    log_info "Checking nginx status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service is not running"
    fi
    
    # Check port bindings
    log_info "Checking port bindings..."
    log_info "Port 80 bindings:"
    sudo netstat -tlnp | grep :80 || echo "Port 80 not found"
    
    log_info "Port 3100 bindings:"
    sudo netstat -tlnp | grep :3100 || echo "Port 3100 not found"
    
    # Check docker containers
    log_info "Checking docker containers..."
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log_success "API endpoint testing completed!"
}

main "$@"
