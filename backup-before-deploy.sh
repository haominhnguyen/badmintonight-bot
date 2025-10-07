#!/bin/bash

# Backup database before deployment script
# This script creates a backup before running migrations

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
    log_info "Starting database backup before deployment..."
    
    # Create backup directory
    BACKUP_DIR="/opt/backups/badminton-bot"
    DATE=$(date +%Y%m%d_%H%M%S)
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown $USER:$USER "$BACKUP_DIR"
    fi
    
    # Check if PostgreSQL container is running
    if sudo docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
        log_info "Creating database backup..."
        
        local db_backup_file="$BACKUP_DIR/database_backup_$DATE.sql"
        
        # Create database backup
        if sudo docker exec badminton-postgres-prod pg_dump \
            -U badminton_user \
            -h localhost \
            -p 5432 \
            badminton_bot > $db_backup_file; then
            
            log_success "Database backup created: $db_backup_file"
            
            # Compress backup
            gzip $db_backup_file
            log_success "Database backup compressed: ${db_backup_file}.gz"
        else
            log_warning "Database backup failed, but continuing..."
        fi
    else
        log_warning "PostgreSQL container not running, skipping backup"
    fi
    
    log_success "Database backup completed!"
}

# Run main function
main "$@"
