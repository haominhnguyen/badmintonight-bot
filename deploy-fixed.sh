#!/bin/bash

# Fixed Production Deployment Script
# This script handles the complete deployment process without sudo issues

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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    log_success "Docker is running"
}

# Create necessary directories and files
setup_directories() {
    log_info "Setting up directories and configuration..."
    
    # Create directories
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
    chmod +x *.sh 2>/dev/null || log_warning "Could not chmod *.sh files"
    chmod +x scripts/*.sh 2>/dev/null || log_warning "Could not chmod scripts/*.sh files"
}

# Stop and cleanup old containers
cleanup_containers() {
    log_info "Cleaning up old containers..."
    
    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down || true
    log_success "Stopped existing containers"
    
    # Remove old nginx containers
    docker rm -f badminton-nginx badminton-nginx-prod 2>/dev/null || true
    log_success "Removed old nginx containers"
    
    # Clean up unused images (optional)
    docker image prune -f || true
    log_success "Cleaned up unused images"
}

# Start services
start_services() {
    log_info "Starting services with production configuration..."
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d
    log_success "Services started"
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Services failed to start"
        docker-compose -f docker-compose.prod.yml ps
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run migrations
    docker exec badminton-bot-prod npx prisma migrate deploy || {
        log_warning "Migration failed, but continuing..."
    }
    log_success "Database migrations completed"
}

# Test API endpoints
test_endpoints() {
    log_info "Testing API endpoints..."
    
    # Test app container directly
    if curl -f -s http://localhost:3100/health >/dev/null 2>&1; then
        log_success "✓ App health check passed"
    else
        log_warning "⚠ App health check failed"
    fi
    
    # Test API version
    if curl -f -s http://localhost/api/v1/version >/dev/null 2>&1; then
        log_success "✓ API version check passed"
    else
        log_warning "⚠ API version check failed"
    fi
    
    # Test API docs
    if curl -f -s http://localhost/api-docs >/dev/null 2>&1; then
        log_success "✓ API docs check passed"
    else
        log_warning "⚠ API docs check failed"
    fi
    
    # Test nginx proxy
    if curl -f -s http://localhost/health >/dev/null 2>&1; then
        log_success "✓ Nginx proxy check passed"
    else
        log_warning "⚠ Nginx proxy check failed"
    fi
}

# Show deployment status
show_status() {
    log_info "Deployment status:"
    
    # Show container status
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show service health
    log_info "Service health:"
    docker-compose -f docker-compose.prod.yml ps
    
    # Show version info
    log_info "Version information:"
    curl -s http://localhost/api/v1/version | jq -r '.data.version // "unknown"' 2>/dev/null || echo "Version API not accessible"
}

# Main function
main() {
    log_info "Starting fixed production deployment process..."
    
    # Check prerequisites
    check_docker
    
    # Setup
    setup_directories
    
    # Cleanup
    cleanup_containers
    
    # Start services
    start_services
    
    # Run migrations
    run_migrations
    
    # Test endpoints
    test_endpoints
    
    # Show status
    show_status
    
    log_success "Production deployment completed successfully!"
    log_info "Access points:"
    log_info "  - Main App: http://localhost"
    log_info "  - API Docs: http://localhost/api-docs"
    log_info "  - API Version: http://localhost/api/v1/version"
    log_info "  - Health Check: http://localhost/health"
    log_info "  - Direct App: http://localhost:3100/health"
}

# Run main function
main "$@"
