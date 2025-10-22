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
    log_info "Restarting containers with fixed configuration..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down || true
    
    # Remove old nginx container if exists
    log_info "Removing old nginx container..."
    docker rm -f badminton-nginx || true
    
    # Start services
    log_info "Starting services with production configuration..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Check container status
    log_info "Checking container status..."
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    if command -v curl >/dev/null 2>&1; then
        # Test direct app access
        if curl -f -s http://localhost:3100/health >/dev/null; then
            log_success "App container is responding on port 3100"
        else
            log_warning "App container is not responding on port 3100"
        fi
        
        # Test nginx proxy
        if curl -f -s http://localhost/api/v1/version >/dev/null; then
            log_success "API version endpoint is accessible via nginx"
        else
            log_warning "API version endpoint is not accessible via nginx"
        fi
        
        # Test API docs
        if curl -f -s http://localhost/api-docs >/dev/null; then
            log_success "API docs are accessible via nginx"
        else
            log_warning "API docs are not accessible via nginx"
        fi
    else
        log_warning "curl not available, skipping endpoint tests"
    fi
    
    log_success "Container restart completed!"
}

main "$@"
