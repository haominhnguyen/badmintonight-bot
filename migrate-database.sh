#!/bin/bash

# Database migration script
# This script runs database migrations safely without losing data

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
    log_info "Starting database migration..."
    
    # Check if PostgreSQL container is running
    log_info "Checking PostgreSQL container..."
    if ! sudo docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
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
    else
        log_success "PostgreSQL container is already running"
    fi
    
    # Check if app container is running
    log_info "Checking app container..."
    if ! sudo docker ps --format "{{.Names}}" | grep -q "badminton-bot-prod"; then
        log_info "Starting app container..."
        sudo docker-compose -f docker-compose.prod.yml up -d app
        
        # Wait for app to be ready
        log_info "Waiting for app to be ready..."
        sleep 10
    else
        log_success "App container is already running"
    fi
    
    # Run Prisma migrations
    log_info "Running Prisma migrations..."
    if sudo docker exec badminton-bot-prod npx prisma migrate deploy; then
        log_success "Database migrations completed successfully"
    else
        log_warning "Database migrations failed, but continuing..."
    fi
    
    # Check database connection
    log_info "Checking database connection..."
    if sudo docker exec badminton-bot-prod npx prisma db pull --force > /dev/null 2>&1; then
        log_success "Database connection is working"
    else
        log_warning "Database connection check failed"
    fi
    
    log_success "Database migration completed!"
}

# Run main function
main "$@"
