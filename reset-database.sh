#!/bin/bash

# Reset database script
# This script resets the PostgreSQL database completely

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
    log_info "Starting database reset..."
    
    # Stop all containers
    log_info "Stopping all containers..."
    sudo docker-compose -f docker-compose.prod.yml down
    
    # Remove PostgreSQL volume
    log_info "Removing PostgreSQL volume..."
    sudo docker volume rm badmintonight-bot_postgres_data_prod 2>/dev/null || true
    
    # Remove PostgreSQL container
    log_info "Removing PostgreSQL container..."
    sudo docker rm badminton-postgres-prod 2>/dev/null || true
    
    # Start PostgreSQL container
    log_info "Starting PostgreSQL container..."
    sudo docker-compose -f docker-compose.prod.yml up -d postgres
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if sudo docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot > /dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        
        if [[ $i -eq 30 ]]; then
            log_error "PostgreSQL is not ready after 30 attempts"
            return 1
        fi
        
        sleep 2
    done
    
    # Run Prisma migrations
    log_info "Running Prisma migrations..."
    sudo docker-compose -f docker-compose.prod.yml up -d app
    
    # Wait for app to be ready
    log_info "Waiting for app to be ready..."
    sleep 10
    
    log_success "Database reset completed!"
}

# Run main function
main "$@"
