#!/bin/bash

# Check Container Status Script
# Author: Auto-generated container check script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

check_containers() {
    log_info "Checking container status..."
    
    # Check if running as root or with sudo
    local docker_cmd="docker"
    if [[ $EUID -ne 0 ]]; then
        docker_cmd="sudo docker"
    fi
    
    # List all containers
    log_info "All containers:"
    $docker_cmd ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Check specific containers
    local postgres_running=false
    local app_running=false
    
    if $docker_cmd ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
        postgres_running=true
        log_success "PostgreSQL container is running"
    else
        log_warning "PostgreSQL container is not running"
    fi
    
    if $docker_cmd ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        app_running=true
        log_success "App container is running"
    else
        log_warning "App container is not running"
    fi
    
    if $docker_cmd ps --format "{{.Names}}" | grep -q "badminton-nginx"; then
        log_success "Nginx container is running"
    else
        log_warning "Nginx container is not running"
    fi
    
    # Check container logs
    if [[ "$postgres_running" == "true" ]]; then
        log_info "PostgreSQL container logs (last 10 lines):"
        $docker_cmd logs --tail 10 badminton-postgres-prod
        echo ""
    fi
    
    if [[ "$app_running" == "true" ]]; then
        log_info "App container logs (last 10 lines):"
        $docker_cmd logs --tail 10 badminton-bot-prod
        echo ""
    fi
    
    # Check container health
    log_info "Container health status:"
    $docker_cmd ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=badminton"
    echo ""
    
    # Check if containers are healthy
    if $docker_cmd ps --filter "name=badminton" --filter "status=running" --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
        log_success "PostgreSQL container is healthy"
    else
        log_error "PostgreSQL container is not healthy"
    fi
    
    if $docker_cmd ps --filter "name=badminton" --filter "status=running" --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_success "App container is healthy"
    else
        log_error "App container is not healthy"
    fi
}

# Main execution
main() {
    log_info "Starting container status check..."
    check_containers
    log_success "Container status check completed!"
}

# Run main function
main "$@"
