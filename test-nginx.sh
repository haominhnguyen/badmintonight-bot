#!/bin/bash

# Test nginx configuration script
# This script tests nginx configuration and connectivity

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
    log_info "Starting nginx configuration test..."
    
    # Check if nginx container is running
    log_info "Checking nginx container status..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx container is running"
    else
        log_error "Nginx container is not running"
        return 1
    fi
    
    # Check nginx configuration
    log_info "Testing nginx configuration..."
    if sudo docker exec badminton-nginx nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration is invalid"
        return 1
    fi
    
    # Check if nginx is listening on port 80
    log_info "Checking if nginx is listening on port 80..."
    if sudo docker exec badminton-nginx netstat -tlnp | grep -q ":80 "; then
        log_success "Nginx is listening on port 80"
    else
        log_warning "Nginx is not listening on port 80"
    fi
    
    # Check if nginx is listening on port 443
    log_info "Checking if nginx is listening on port 443..."
    if sudo docker exec badminton-nginx netstat -tlnp | grep -q ":443 "; then
        log_success "Nginx is listening on port 443"
    else
        log_warning "Nginx is not listening on port 443"
    fi
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP health check passed"
    else
        log_warning "HTTP health check failed"
    fi
    
    # Test HTTPS connectivity (if SSL is available)
    log_info "Testing HTTPS connectivity..."
    if curl -f -s -k -o /dev/null https://localhost/health; then
        log_success "HTTPS health check passed"
    else
        log_warning "HTTPS health check failed (SSL may not be configured)"
    fi
    
    # Check nginx logs
    log_info "Checking nginx logs..."
    echo "=== Nginx Error Logs (last 10 lines) ==="
    sudo docker logs badminton-nginx --tail 10 2>&1 | grep -i error || echo "No errors found"
    
    echo "=== Nginx Access Logs (last 10 lines) ==="
    sudo docker logs badminton-nginx --tail 10 2>&1 | grep -v error || echo "No access logs found"
    
    # Check nginx processes
    log_info "Checking nginx processes..."
    echo "=== Nginx Processes ==="
    sudo docker exec badminton-nginx ps aux | grep nginx || echo "No nginx processes found"
    
    # Check nginx configuration details
    log_info "Checking nginx configuration details..."
    echo "=== Nginx Configuration Test ==="
    sudo docker exec badminton-nginx nginx -T 2>&1 | head -20
    
    log_success "Nginx configuration test completed!"
}

# Run main function
main "$@"
