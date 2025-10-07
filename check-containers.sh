#!/bin/bash

# Check Container Status Script
# This script checks the status of all containers and services

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
    log_info "Checking container status..."
    
    # Check PostgreSQL container
    log_info "Checking PostgreSQL container..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
        log_success "PostgreSQL container is running"
    else
        log_warning "PostgreSQL container is not running"
    fi
    
    # Check app container
    log_info "Checking app container..."
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_success "App container is running"
    else
        log_warning "App container is not running"
    fi
    
    # Nginx check removed
    
    # Show all containers
    log_info "All containers:"
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Nginx status removed
    
    log_success "Container status check completed!"
}

# Run main function
main "$@"