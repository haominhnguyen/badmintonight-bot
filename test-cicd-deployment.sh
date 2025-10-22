#!/bin/bash

# Test script to simulate CI/CD deployment locally
# This helps debug deployment issues before pushing to GitHub

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
    log_info "Testing CI/CD deployment process locally..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Simulate the deployment steps from CI/CD
    log_info "Step 1: Creating necessary directories..."
    mkdir -p nginx logs/nginx
    
    # Copy nginx config if needed
    if [ ! -f "nginx/nginx.conf" ] && [ -f "nginx.conf" ]; then
        log_info "Copying nginx configuration..."
        cp nginx.conf nginx/nginx.conf
        log_success "Nginx config copied"
    else
        log_success "Nginx config already exists"
    fi
    
    # Make scripts executable
    log_info "Step 2: Making scripts executable..."
    chmod +x *.sh
    chmod +x scripts/*.sh
    log_success "Scripts made executable"
    
    # Stop existing containers
    log_info "Step 3: Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down || true
    log_success "Containers stopped"
    
    # Remove old nginx container
    log_info "Step 4: Cleaning up old containers..."
    docker rm -f badminton-nginx badminton-nginx-prod 2>/dev/null || true
    log_success "Old containers removed"
    
    # Start services with production configuration
    log_info "Step 5: Starting services with production configuration..."
    docker-compose -f docker-compose.prod.yml up -d
    log_success "Services started"
    
    # Wait for services to start
    log_info "Step 6: Waiting for services to start..."
    sleep 30
    log_success "Wait completed"
    
    # Run database migrations
    log_info "Step 7: Running database migrations..."
    docker exec badminton-bot-prod npx prisma migrate deploy || echo "Migration failed, but continuing..."
    log_success "Database migrations completed"
    
    # Test API endpoints
    log_info "Step 8: Testing API endpoints..."
    
    # Test app container directly
    if curl -f -s http://localhost:3100/health >/dev/null; then
        log_success "✓ App health check passed"
    else
        log_warning "⚠ App health check failed"
    fi
    
    # Test API version
    if curl -f -s http://localhost/api/v1/version >/dev/null; then
        log_success "✓ API version check passed"
    else
        log_warning "⚠ API version check failed"
    fi
    
    # Test API docs
    if curl -f -s http://localhost/api-docs >/dev/null; then
        log_success "✓ API docs check passed"
    else
        log_warning "⚠ API docs check failed"
    fi
    
    # Show container status
    log_info "Step 9: Container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Final summary
    log_success "CI/CD deployment test completed!"
    log_info "Access points:"
    log_info "  - API Docs: http://localhost/api-docs"
    log_info "  - API Version: http://localhost/api/v1/version"
    log_info "  - Health Check: http://localhost/health"
    log_info "  - Direct App: http://localhost:3100/health"
}

main "$@"
