#!/bin/bash

# Force Rebuild and Deploy
# This script forces a complete rebuild and deployment

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
    log_info "Starting force rebuild and deployment..."
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Stop all containers
    log_info "Stopping all containers..."
    docker-compose -f docker-compose.prod.yml down || true
    docker stop $(docker ps -q) 2>/dev/null || true
    
    # Remove all containers
    log_info "Removing all containers..."
    docker rm -f $(docker ps -aq) 2>/dev/null || true
    
    # Remove all images
    log_info "Removing all images..."
    docker rmi -f $(docker images -q) 2>/dev/null || true
    
    # Clean up system
    log_info "Cleaning up Docker system..."
    docker system prune -af || true
    
    # Create necessary directories
    log_info "Setting up directories..."
    mkdir -p nginx logs/nginx
    
    # Copy nginx config
    if [ ! -f "nginx/nginx.conf" ] && [ -f "nginx.conf" ]; then
        cp nginx.conf nginx/nginx.conf
        log_success "Nginx config copied"
    fi
    
    # Build and start services
    log_info "Building and starting services..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services
    log_info "Waiting for services to start..."
    sleep 60
    
    # Check status
    log_info "Checking service status..."
    docker-compose -f docker-compose.prod.yml ps
    
    # Test endpoints
    log_info "Testing endpoints..."
    sleep 30
    
    if curl -f -s http://localhost:3100/health >/dev/null 2>&1; then
        log_success "✓ App container is healthy"
    else
        log_warning "⚠ App container health check failed"
    fi
    
    if curl -f -s http://localhost/api/v1/version >/dev/null 2>&1; then
        log_success "✓ API is accessible via nginx"
    else
        log_warning "⚠ API not accessible via nginx"
    fi
    
    # Show final status
    log_info "Final status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log_success "Force rebuild and deployment completed!"
}

main "$@"
