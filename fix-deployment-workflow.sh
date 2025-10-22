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
    log_info "Fixing deployment workflow issues..."
    
    # Make scripts executable
    log_info "Making scripts executable..."
    chmod +x *.sh
    chmod +x scripts/*.sh
    
    # Create nginx directory if it doesn't exist
    if [ ! -d "nginx" ]; then
        log_info "Creating nginx directory..."
        mkdir -p nginx
    fi
    
    # Copy nginx config if needed
    if [ ! -f "nginx/nginx.conf" ]; then
        log_info "Copying nginx configuration..."
        cp nginx.conf nginx/nginx.conf
    fi
    
    # Create logs directory structure
    log_info "Creating logs directory structure..."
    mkdir -p logs/nginx
    
    # Fix permissions
    log_info "Fixing file permissions..."
    chmod 644 nginx/nginx.conf
    chmod 755 logs
    chmod 755 logs/nginx
    
    # Test docker-compose configuration
    log_info "Testing docker-compose configuration..."
    if docker-compose -f docker-compose.prod.yml config >/dev/null; then
        log_success "Docker-compose configuration is valid"
    else
        log_error "Docker-compose configuration has errors"
        docker-compose -f docker-compose.prod.yml config
        return 1
    fi
    
    # Check if required files exist
    log_info "Checking required files..."
    required_files=(
        "docker-compose.prod.yml"
        "nginx/nginx.conf"
        "Dockerfile.arm64"
        "package.json"
        "src/index.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "✓ $file exists"
        else
            log_error "✗ $file is missing"
            return 1
        fi
    done
    
    # Check environment variables
    log_info "Checking environment configuration..."
    if [ -f ".env" ]; then
        log_success "✓ .env file exists"
    else
        log_warning "⚠ .env file is missing - using defaults"
    fi
    
    log_success "Deployment workflow fixes completed!"
    log_info "You can now run: ./restart-containers.sh"
}

main "$@"
