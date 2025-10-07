#!/bin/bash

# Update .env Database Connection Script
# Author: Auto-generated database connection fix script

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

update_database_url() {
    log_info "Updating DATABASE_URL in .env file..."
    
    cd $PROJECT_DIR
    
    if [[ -f ".env" ]]; then
        # Backup current .env
        cp .env .env.backup
        
        # Update DATABASE_URL (ensure it uses service name 'postgres')
        sed -i 's|DATABASE_URL=postgresql://badminton_user:badminton_secure_password_123@badminton-postgres-prod:5432/badminton_bot|DATABASE_URL=postgresql://badminton_user:badminton_secure_password_123@postgres:5432/badminton_bot|g' .env
        
        log_success "DATABASE_URL updated in .env file"
        
        # Show the updated line
        log_info "Updated DATABASE_URL:"
        grep "DATABASE_URL" .env
    else
        log_error ".env file not found"
        return 1
    fi
}

restart_application() {
    log_info "Restarting application with updated database connection..."
    
    cd $PROJECT_DIR
    
    # Stop application container
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml stop app
        sleep 5
        docker-compose -f docker-compose.prod.yml start app
    else
        sudo docker-compose -f docker-compose.prod.yml stop app
        sleep 5
        sudo docker-compose -f docker-compose.prod.yml start app
    fi
    
    # Wait for application to start
    log_info "Waiting for application to start..."
    for i in {1..30}; do
        if curl -s --connect-timeout 5 http://localhost:3100/health > /dev/null 2>&1; then
            log_success "Application is responding"
            return 0
        fi
        
        if [[ $i -eq 30 ]]; then
            log_error "Application is not responding after 30 attempts"
            return 1
        fi
        
        sleep 2
    done
}

# Main execution
main() {
    log_info "Starting database connection update..."
    
    update_database_url
    restart_application
    
    log_success "Database connection update completed!"
}

# Run main function
main "$@"
