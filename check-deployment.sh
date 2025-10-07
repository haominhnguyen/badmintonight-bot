#!/bin/bash

# Check deployment status script
# This script checks the complete deployment status

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
    log_info "Checking complete deployment status..."
    
    # Check Docker containers
    log_info "Checking Docker containers..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
        log_success "PostgreSQL container is running"
    else
        log_error "PostgreSQL container is not running"
    fi
    
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_success "App container is running"
    else
        log_error "App container is not running"
    fi
    
    # Nginx checks removed
    
    # Check HTTP connectivity
    log_info "Checking HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
    fi
    
    # Check port bindings
    log_info "Checking port bindings..."
    echo "Port 3100: $(sudo netstat -tlnp | grep :3100 | wc -l) listeners"
    
    # Show deployment summary
    log_info "Deployment summary:"
    echo "  - App container: $(sudo docker ps --format '{{.Names}}' | grep badminton-bot-prod || echo 'Not running')"
    echo "  - PostgreSQL container: $(sudo docker ps --format '{{.Names}}' | grep badminton-postgres-prod || echo 'Not running')"
    
    # Test different endpoints
    log_info "Testing different endpoints..."
    echo "Testing /health:"
    curl -v http://localhost/health 2>&1 || echo "Health check failed"
    
    echo "Testing /:"
    curl -v http://localhost/ 2>&1 || echo "Root endpoint failed"
    
    log_success "Deployment status check completed!"
}

# Run main function
main "$@"
