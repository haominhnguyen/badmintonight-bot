#!/bin/bash

# Fix All Permissions Script
# Author: Auto-generated permission fix script

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
BACKUP_DIR="/opt/backups/badminton-bot"

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

fix_git_permissions() {
    log_info "Fixing git permissions..."
    
    cd $PROJECT_DIR
    
    # Fix git ownership
    sudo chown -R $USER:$USER .git
    sudo chmod -R 755 .git
    
    # Fix git safe directory
    sudo git config --global --add safe.directory $PROJECT_DIR
    
    log_success "Git permissions fixed"
}

fix_file_permissions() {
    log_info "Fixing file permissions..."
    
    cd $PROJECT_DIR
    
    # Fix ownership
    sudo chown -R $USER:$USER .
    
    # Fix permissions
    sudo chmod -R 755 .
    chmod +x *.sh
    
    log_success "File permissions fixed"
}

create_directories() {
    log_info "Creating directories..."
    
    # Create log directory
    sudo mkdir -p $LOG_DIR
    sudo chown $USER:$USER $LOG_DIR
    
    # Create backup directory
    sudo mkdir -p $BACKUP_DIR
    sudo chown $USER:$USER $BACKUP_DIR
    
    log_success "Directories created"
}

create_env_file() {
    log_info "Creating .env file..."
    
    cd $PROJECT_DIR
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        cat > .env << 'EOF'
# Production Environment Variables
POSTGRES_PASSWORD=badminton_secure_password_123
DATABASE_URL=postgresql://badminton_user:badminton_secure_password_123@postgres:5432/badminton_bot?schema=public
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
        log_success ".env file created"
    else
        log_info ".env file already exists"
    fi
}

# Main execution
main() {
    log_info "Starting permission fix..."
    
    fix_git_permissions
    fix_file_permissions
    create_directories
    create_env_file
    
    log_success "All permissions fixed!"
}

# Run main function
main "$@"
