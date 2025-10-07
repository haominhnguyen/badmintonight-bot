#!/bin/bash

# Production Setup Script
# Author: Auto-generated setup script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/badminton-bot"
LOG_DIR="/var/log/badminton-bot"

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

setup_environment() {
    log_info "Setting up production environment..."
    
    cd $PROJECT_DIR
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        log_info "Creating .env file..."
        cat > .env << EOF
# Production Environment Variables
# Copy this file to .env and update the values

# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://badminton_user:your_secure_password_here@postgres:5432/badminton_bot?schema=public

# Application Configuration
NODE_ENV=production
PORT=3100
API_PORT=3101
API_BASE_URL=https://haominhnguyen.shop/api
FRONTEND_URL=https://haominhnguyen.shop

# Bot Configuration
BOT_TOKEN=your_bot_token_here
WEBHOOK_URL=https://haominhnguyen.shop/webhook
PAGE_ACCESS_TOKEN=your_page_access_token_here
VERIFY_TOKEN=your_verify_token_here

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
ADMIN_PASSWORD=your_admin_password_here
ENCRYPTION_KEY=your_encryption_key_here

# Pricing Configuration
COURT_PRICE=120000
SHUTTLE_PRICE=25000
FEMALE_PRICE=40000

# Cron Configuration
VOTE_CRON_TIME=0 8 * * *
GROUP_IDS=your_group_ids_here

# Logging
LOG_LEVEL=INFO

# External APIs (if needed)
# API_KEY=your_api_key_here
# EXTERNAL_SERVICE_URL=https://api.example.com
EOF
        log_success ".env file created"
    else
        log_info ".env file already exists"
    fi
}

setup_directories() {
    log_info "Setting up directories..."
    
    # Create log directory
    if [[ ! -d "$LOG_DIR" ]]; then
        if [[ $EUID -eq 0 ]]; then
            mkdir -p $LOG_DIR
        else
            sudo mkdir -p $LOG_DIR
        fi
        log_success "Log directory created: $LOG_DIR"
    else
        log_info "Log directory already exists: $LOG_DIR"
    fi
    
    # Create backup directory
    if [[ ! -d "/opt/backups/badminton-bot" ]]; then
        if [[ $EUID -eq 0 ]]; then
            mkdir -p /opt/backups/badminton-bot
        else
            sudo mkdir -p /opt/backups/badminton-bot
        fi
        log_success "Backup directory created: /opt/backups/badminton-bot"
    else
        log_info "Backup directory already exists"
    fi
}

setup_scripts() {
    log_info "Setting up scripts..."
    
    cd $PROJECT_DIR
    
    # Make all scripts executable
    chmod +x *.sh
    
    log_success "Scripts made executable"
}

setup_docker() {
    log_info "Setting up Docker..."
    
    cd $PROJECT_DIR
    
    # Stop any running containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    else
        sudo docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    fi
    
    # Pull latest images
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml pull
    else
        sudo docker-compose -f docker-compose.prod.yml pull
    fi
    
    log_success "Docker setup completed"
}

# Main execution
main() {
    log_info "Starting production setup..."
    
    setup_environment
    setup_directories
    setup_scripts
    setup_docker
    
    log_success "Production setup completed!"
}

# Run main function
main "$@"
