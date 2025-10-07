#!/bin/bash

# Fix Application Startup Script
# Author: Auto-generated application fix script

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

fix_environment_variables() {
    log_info "Fixing environment variables..."
    
    cd $PROJECT_DIR
    
    # Ensure .env file exists and has correct values
    if [[ ! -f ".env" ]]; then
        log_info "Creating .env file..."
        cat > .env << 'EOF'
# Production Environment Variables
POSTGRES_PASSWORD=badminton_secure_password_123
DATABASE_URL=postgresql://badminton_user:badminton_secure_password_123@badminton-postgres-prod:5432/badminton_bot?schema=public
NODE_ENV=production
PORT=3100
API_PORT=3101
API_BASE_URL=https://haominhnguyen.shop/api
FRONTEND_URL=https://haominhnguyen.shop
BOT_TOKEN=your_bot_token_here
WEBHOOK_URL=https://haominhnguyen.shop/webhook
PAGE_ACCESS_TOKEN=your_page_access_token_here
VERIFY_TOKEN=your_verify_token_here
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
ADMIN_PASSWORD=your_admin_password_here
ENCRYPTION_KEY=your_encryption_key_here
COURT_PRICE=120000
SHUTTLE_PRICE=25000
FEMALE_PRICE=40000
VOTE_CRON_TIME=0 8 * * *
GROUP_IDS=your_group_ids_here
LOG_LEVEL=INFO
EOF
    fi
    
    log_success "Environment variables fixed"
}

fix_database_connection() {
    log_info "Fixing database connection..."
    
    cd $PROJECT_DIR
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    for i in {1..30}; do
        if [[ $EUID -eq 0 ]]; then
            if docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot > /dev/null 2>&1; then
                log_success "Database is ready"
                break
            fi
        else
            if sudo docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot > /dev/null 2>&1; then
                log_success "Database is ready"
                break
            fi
        fi
        
        if [[ $i -eq 30 ]]; then
            log_error "Database is not ready after 30 attempts"
            return 1
        fi
        
        sleep 2
    done
}

fix_application_startup() {
    log_info "Fixing application startup..."
    
    cd $PROJECT_DIR
    
    # Stop and restart application container
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
    for i in {1..60}; do
        if curl -s --connect-timeout 5 http://localhost:3100/health > /dev/null 2>&1; then
            log_success "Application is responding"
            return 0
        fi
        
        if [[ $i -eq 60 ]]; then
            log_error "Application is not responding after 60 attempts"
            return 1
        fi
        
        sleep 2
    done
}

check_application_logs() {
    log_info "Checking application logs for errors..."
    
    if [[ $EUID -eq 0 ]]; then
        docker logs badminton-bot-prod --tail 20
    else
        sudo docker logs badminton-bot-prod --tail 20
    fi
}

# Main execution
main() {
    log_info "Starting application startup fix..."
    
    fix_environment_variables
    fix_database_connection
    fix_application_startup
    check_application_logs
    
    log_success "Application startup fix completed!"
}

# Run main function
main "$@"
