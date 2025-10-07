#!/bin/bash

# Backup and Restore Script for Badminton Bot
# Author: Auto-generated backup script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/badminton-bot"
BACKUP_DIR="/opt/backups/badminton-bot"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

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

check_root() {
    # Allow running as non-root for CI/CD environments
    if [[ $EUID -ne 0 ]]; then
        log_warning "Running as non-root user. Some operations may require sudo."
        # Don't exit, just warn
    fi
}

create_backup_directory() {
    log_info "Creating backup directory..."
    if [[ $EUID -eq 0 ]]; then
        mkdir -p $BACKUP_DIR
    else
        sudo mkdir -p $BACKUP_DIR
    fi
    log_success "Backup directory created: $BACKUP_DIR"
}

backup_database() {
    log_info "Backing up database..."
    
    local db_backup_file="$BACKUP_DIR/database_$DATE.sql"
    
    # Check if container exists and is running
    local container_exists=false
    if [[ $EUID -eq 0 ]]; then
        if docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
            container_exists=true
        fi
    else
        if sudo docker ps --format "{{.Names}}" | grep -q "badminton-postgres-prod"; then
            container_exists=true
        fi
    fi
    
    if [[ "$container_exists" == "false" ]]; then
        log_warning "PostgreSQL container not running, skipping database backup"
        return 0
    fi
    
    # Create database backup
    if [[ $EUID -eq 0 ]]; then
        docker exec badminton-postgres-prod pg_dump \
            -U badminton_user \
            -h localhost \
            -p 5432 \
            badminton_bot > $db_backup_file
    else
        sudo docker exec badminton-postgres-prod pg_dump \
            -U badminton_user \
            -h localhost \
            -p 5432 \
            badminton_bot > $db_backup_file
    fi
    
    if [ -f "$db_backup_file" ] && [ -s "$db_backup_file" ]; then
        log_success "Database backup created: $db_backup_file"
        
        # Compress database backup
        gzip $db_backup_file
        log_success "Database backup compressed: ${db_backup_file}.gz"
    else
        log_error "Database backup failed"
        exit 1
    fi
}

backup_application_data() {
    log_info "Backing up application data..."
    
    local app_backup_file="$BACKUP_DIR/app_data_$DATE.tar.gz"
    
    # Create application data backup
    tar -czf $app_backup_file \
        -C $PROJECT_DIR \
        logs \
        .env \
        docker-compose.prod.yml \
        nginx.conf 2>/dev/null || true
    
    if [ -f "$app_backup_file" ] && [ -s "$app_backup_file" ]; then
        log_success "Application data backup created: $app_backup_file"
    else
        log_warning "Application data backup may be empty"
    fi
}

backup_nginx_config() {
    log_info "Backing up Nginx configuration..."
    
    local nginx_backup_file="$BACKUP_DIR/nginx_config_$DATE.tar.gz"
    
    # Backup Nginx configuration
    tar -czf $nginx_backup_file \
        -C /etc/nginx \
        sites-available/badminton-bot \
        sites-enabled/badminton-bot 2>/dev/null || true
    
    if [ -f "$nginx_backup_file" ] && [ -s "$nginx_backup_file" ]; then
        log_success "Nginx configuration backup created: $nginx_backup_file"
    else
        log_warning "Nginx configuration backup may be empty"
    fi
}

backup_ssl_certificates() {
    log_info "Backing up SSL certificates..."
    
    local ssl_backup_file="$BACKUP_DIR/ssl_certificates_$DATE.tar.gz"
    
    # Backup SSL certificates
    if [ -d "/etc/letsencrypt/live/haominhnguyen.shop" ]; then
        tar -czf $ssl_backup_file \
            -C /etc/letsencrypt \
            live/haominhnguyen.shop \
            archive/haominhnguyen.shop 2>/dev/null || true
        
        if [ -f "$ssl_backup_file" ] && [ -s "$ssl_backup_file" ]; then
            log_success "SSL certificates backup created: $ssl_backup_file"
        else
            log_warning "SSL certificates backup may be empty"
        fi
    else
        log_warning "SSL certificates not found"
    fi
}

create_backup_manifest() {
    log_info "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/backup_manifest_$DATE.txt"
    
    cat > $manifest_file << EOF
Backup Manifest - $DATE
========================

Backup Date: $(date)
Project Directory: $PROJECT_DIR
Backup Directory: $BACKUP_DIR

Files included in this backup:
- Database: database_$DATE.sql.gz
- Application Data: app_data_$DATE.tar.gz
- Nginx Config: nginx_config_$DATE.tar.gz
- SSL Certificates: ssl_certificates_$DATE.tar.gz

System Information:
- OS: $(uname -a)
- Docker Version: $(sudo docker --version 2>/dev/null || docker --version)
- Docker Compose Version: $(sudo docker-compose --version 2>/dev/null || docker-compose --version)
- Nginx Version: $(nginx -v 2>&1)

Container Status:
$(sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

Disk Usage:
$(df -h $BACKUP_DIR)

Backup Size:
$(du -sh $BACKUP_DIR/backup_*_$DATE.*)
EOF
    
    log_success "Backup manifest created: $manifest_file"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Remove old database backups
    find $BACKUP_DIR -name "database_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old application data backups
    find $BACKUP_DIR -name "app_data_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old Nginx config backups
    find $BACKUP_DIR -name "nginx_config_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old SSL certificate backups
    find $BACKUP_DIR -name "ssl_certificates_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old manifests
    find $BACKUP_DIR -name "backup_manifest_*.txt" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log_success "Old backups cleaned up"
}

show_backup_status() {
    log_info "Backup Status:"
    
    echo ""
    echo "=== BACKUP SUMMARY ==="
    echo "Backup Date: $DATE"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    
    echo "=== BACKUP FILES ==="
    ls -lah $BACKUP_DIR/backup_*_$DATE.* 2>/dev/null || echo "No backup files found"
    echo ""
    
    echo "=== BACKUP SIZE ==="
    du -sh $BACKUP_DIR/backup_*_$DATE.* 2>/dev/null || echo "No backup files found"
    echo ""
    
    echo "=== TOTAL BACKUP SIZE ==="
    du -sh $BACKUP_DIR
    echo ""
}

restore_database() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring database from $backup_file..."
    
    # Stop application
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f $PROJECT_DIR/docker-compose.prod.yml stop app
    else
        sudo docker-compose -f $PROJECT_DIR/docker-compose.prod.yml stop app
    fi
    
    # Restore database
    if [[ $backup_file == *.gz ]]; then
        if [[ $EUID -eq 0 ]]; then
            gunzip -c $backup_file | docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot
        else
            gunzip -c $backup_file | sudo docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot
        fi
    else
        if [[ $EUID -eq 0 ]]; then
            docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot < $backup_file
        else
            sudo docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot < $backup_file
        fi
    fi
    
    # Start application
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f $PROJECT_DIR/docker-compose.prod.yml start app
    else
        sudo docker-compose -f $PROJECT_DIR/docker-compose.prod.yml start app
    fi
    
    log_success "Database restored successfully"
}

restore_application_data() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring application data from $backup_file..."
    
    # Extract application data
    tar -xzf $backup_file -C $PROJECT_DIR
    
    log_success "Application data restored successfully"
}

restore_nginx_config() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring Nginx configuration from $backup_file..."
    
    # Extract Nginx configuration
    tar -xzf $backup_file -C /
    
    # Test Nginx configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    log_success "Nginx configuration restored successfully"
}

restore_ssl_certificates() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring SSL certificates from $backup_file..."
    
    # Extract SSL certificates
    tar -xzf $backup_file -C /
    
    # Set proper permissions
    chown -R root:root /etc/letsencrypt
    chmod -R 755 /etc/letsencrypt
    
    log_success "SSL certificates restored successfully"
}

list_backups() {
    log_info "Available backups:"
    
    echo ""
    echo "=== AVAILABLE BACKUPS ==="
    ls -lah $BACKUP_DIR/backup_manifest_*.txt 2>/dev/null | while read line; do
        echo "$line"
    done
    echo ""
    
    echo "=== BACKUP DETAILS ==="
    for manifest in $BACKUP_DIR/backup_manifest_*.txt; do
        if [ -f "$manifest" ]; then
            echo "Backup: $(basename $manifest)"
            echo "Date: $(head -n 3 $manifest | tail -n 1 | cut -d' ' -f3-)"
            echo "Files:"
            ls -lah $BACKUP_DIR/backup_*_$(basename $manifest .txt | cut -d'_' -f3-).* 2>/dev/null || echo "  No files found"
            echo ""
        fi
    done
}

# Main functions
backup() {
    log_info "Starting backup process..."
    
    check_root
    create_backup_directory
    backup_database
    backup_application_data
    backup_nginx_config
    backup_ssl_certificates
    create_backup_manifest
    cleanup_old_backups
    show_backup_status
    
    log_success "Backup completed successfully!"
}

restore() {
    local backup_date=$1
    
    if [ -z "$backup_date" ]; then
        log_error "Please specify backup date (format: YYYYMMDD_HHMMSS)"
        echo "Usage: $0 restore YYYYMMDD_HHMMSS"
        echo "Available backups:"
        list_backups
        exit 1
    fi
    
    log_info "Starting restore process for backup: $backup_date..."
    
    check_root
    
    # Find backup files
    local db_backup="$BACKUP_DIR/database_${backup_date}.sql.gz"
    local app_backup="$BACKUP_DIR/app_data_${backup_date}.tar.gz"
    local nginx_backup="$BACKUP_DIR/nginx_config_${backup_date}.tar.gz"
    local ssl_backup="$BACKUP_DIR/ssl_certificates_${backup_date}.tar.gz"
    
    # Restore components
    if [ -f "$db_backup" ]; then
        restore_database $db_backup
    else
        log_warning "Database backup not found: $db_backup"
    fi
    
    if [ -f "$app_backup" ]; then
        restore_application_data $app_backup
    else
        log_warning "Application data backup not found: $app_backup"
    fi
    
    if [ -f "$nginx_backup" ]; then
        restore_nginx_config $nginx_backup
    else
        log_warning "Nginx configuration backup not found: $nginx_backup"
    fi
    
    if [ -f "$ssl_backup" ]; then
        restore_ssl_certificates $ssl_backup
    else
        log_warning "SSL certificates backup not found: $ssl_backup"
    fi
    
    log_success "Restore completed successfully!"
}

# Script usage
show_usage() {
    echo "Usage: $0 {backup|restore|list}"
    echo ""
    echo "Commands:"
    echo "  backup              - Create a full backup"
    echo "  restore <date>      - Restore from backup (date format: YYYYMMDD_HHMMSS)"
    echo "  list               - List available backups"
    echo ""
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 restore 20240101_120000"
    echo "  $0 list"
}

# Main execution
case "$1" in
    backup)
        backup
        ;;
    restore)
        restore $2
        ;;
    list)
        list_backups
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
