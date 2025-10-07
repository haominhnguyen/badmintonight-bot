#!/bin/bash

# Debug deployment script
# This script debugs the deployment issues

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
    log_info "Debugging deployment issues..."
    
    # Check app container
    log_info "Checking app container..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_success "App container is running"
        
        # Check app container logs
        log_info "App container logs (last 10 lines):"
        sudo docker logs badminton-bot-prod --tail 10
        
        # Test app container directly
        log_info "Testing app container directly..."
        if curl -f -s -o /dev/null http://localhost:3100/health; then
            log_success "App container is responding on port 3100"
        else
            log_warning "App container is not responding on port 3100"
        fi
    else
        log_error "App container is not running"
    fi
    
    # Check nginx service
    log_info "Checking nginx service..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
        
        # Check nginx configuration
        log_info "Testing nginx configuration..."
        if sudo nginx -t; then
            log_success "Nginx configuration is valid"
        else
            log_error "Nginx configuration is invalid"
        fi
        
        # Check nginx logs
        log_info "Nginx logs (last 10 lines):"
        sudo journalctl -u nginx --no-pager -n 10
        
        # Test nginx directly
        log_info "Testing nginx directly..."
        if curl -f -s -o /dev/null http://localhost/health; then
            log_success "Nginx is responding on port 80"
        else
            log_warning "Nginx is not responding on port 80"
        fi
    else
        log_error "Nginx service is not running"
    fi
    
    # Check port bindings
    log_info "Checking port bindings..."
    sudo netstat -tlnp | grep -E ":(80|3100)" || echo "No ports found"
    
    # Test different endpoints
    log_info "Testing different endpoints..."
    echo "Testing /health:"
    curl -v http://localhost/health 2>&1 || echo "Health check failed"
    
    echo "Testing /:"
    curl -v http://localhost/ 2>&1 || echo "Root endpoint failed"
    
    echo "Testing /webhook:"
    curl -v http://localhost/webhook 2>&1 || echo "Webhook endpoint failed"
    
    echo "Testing /api/:"
    curl -v http://localhost/api/ 2>&1 || echo "API endpoint failed"
    
    # Check system resources
    log_info "Checking system resources..."
    echo "CPU usage:"
    top -bn1 | grep "Cpu(s)" || echo "CPU info not available"
    
    echo "Memory usage:"
    free -h || echo "Memory info not available"
    
    echo "Disk usage:"
    df -h || echo "Disk info not available"
    
    log_success "Debug completed!"
}

# Run main function
main "$@"
