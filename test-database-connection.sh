#!/bin/bash

# Test Database Connection Script
# Author: Auto-generated database test script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/badminton-bot"

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

test_database_container() {
    log_info "Testing database container..."
    
    # Check if postgres container is running
    if [[ $EUID -eq 0 ]]; then
        if docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
            log_success "PostgreSQL container is running"
        else
            log_error "PostgreSQL container is not running"
            return 1
        fi
    else
        if sudo docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
            log_success "PostgreSQL container is running"
        else
            log_error "PostgreSQL container is not running"
            return 1
        fi
    fi
}

test_database_health() {
    log_info "Testing database health..."
    
    # Check database health
    if [[ $EUID -eq 0 ]]; then
        if docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot; then
            log_success "Database is ready and accepting connections"
        else
            log_error "Database is not ready"
            return 1
        fi
    else
        if sudo docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot; then
            log_success "Database is ready and accepting connections"
        else
            log_error "Database is not ready"
            return 1
        fi
    fi
}

test_database_connection() {
    log_info "Testing database connection from app container..."
    
    # Test connection from app container
    if [[ $EUID -eq 0 ]]; then
        if docker exec badminton-bot-prod node -e "
            const { Client } = require('pg');
            const client = new Client({
                connectionString: process.env.DATABASE_URL
            });
            client.connect()
                .then(() => {
                    console.log('Database connection successful');
                    client.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('Database connection failed:', err.message);
                    process.exit(1);
                });
        "; then
            log_success "Database connection from app container successful"
        else
            log_error "Database connection from app container failed"
            return 1
        fi
    else
        if sudo docker exec badminton-bot-prod node -e "
            const { Client } = require('pg');
            const client = new Client({
                connectionString: process.env.DATABASE_URL
            });
            client.connect()
                .then(() => {
                    console.log('Database connection successful');
                    client.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('Database connection failed:', err.message);
                    process.exit(1);
                });
        "; then
            log_success "Database connection from app container successful"
        else
            log_error "Database connection from app container failed"
            return 1
        fi
    fi
}

check_environment_variables() {
    log_info "Checking environment variables..."
    
    cd $PROJECT_DIR
    
    if [[ -f ".env" ]]; then
        log_info "Environment variables in .env:"
        echo "POSTGRES_PASSWORD: $(grep POSTGRES_PASSWORD .env | cut -d'=' -f2)"
        echo "DATABASE_URL: $(grep DATABASE_URL .env | cut -d'=' -f2)"
    else
        log_error ".env file not found"
        return 1
    fi
}

check_database_logs() {
    log_info "Checking database logs..."
    
    if [[ $EUID -eq 0 ]]; then
        docker logs badminton-postgres-prod --tail 20
    else
        sudo docker logs badminton-postgres-prod --tail 20
    fi
}

check_app_logs() {
    log_info "Checking application logs..."
    
    if [[ $EUID -eq 0 ]]; then
        docker logs badminton-bot-prod --tail 20
    else
        sudo docker logs badminton-bot-prod --tail 20
    fi
}

# Main execution
main() {
    log_info "Starting database connection test..."
    
    test_database_container
    test_database_health
    test_database_connection
    check_environment_variables
    check_database_logs
    check_app_logs
    
    log_success "Database connection test completed!"
}

# Run main function
main "$@"
