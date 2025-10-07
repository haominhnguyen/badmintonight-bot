#!/bin/bash

# Rollback Script for Badminton Bot
# This script handles rollback operations for the application
# Domain: haominhnguyen.shop

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
LOG_FILE="/var/log/badminton-bot-rollback.log"
DOMAIN="haominhnguyen.shop"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> $LOG_FILE
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> $LOG_FILE
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

list_available_backups() {
    log_info "Available backups:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    echo ""
    echo "=== AVAILABLE BACKUPS ==="
    ls -lah $BACKUP_DIR/backup_*_database.sql.gz 2>/dev/null | while read line; do
        echo "$line"
    done
    echo ""
    
    echo "=== BACKUP DETAILS ==="
    for backup in $BACKUP_DIR/backup_*_database.sql.gz; do
        if [ -f "$backup" ]; then
            local backup_name=$(basename $backup)
            local backup_date=$(echo $backup_name | sed 's/backup_\(.*\)_database.sql.gz/\1/')
            local backup_size=$(du -h $backup | cut -f1)
            local backup_time=$(stat -c %y $backup | cut -d' ' -f1,2)
            
            echo "Backup: $backup_name"
            echo "  Date: $backup_date"
            echo "  Size: $backup_size"
            echo "  Created: $backup_time"
            echo ""
        fi
    done
}

select_backup() {
    local backup_date=$1
    
    if [ -z "$backup_date" ]; then
        log_error "Please specify backup date (format: YYYYMMDD_HHMMSS)"
        echo "Usage: $0 rollback YYYYMMDD_HHMMSS"
        echo ""
        list_available_backups
        exit 1
    fi
    
    local backup_file="$BACKUP_DIR/backup_${backup_date}_database.sql.gz"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        echo "Available backups:"
        list_available_backups
        exit 1
    fi
    
    echo "$backup_file"
}

create_rollback_backup() {
    log_info "Creating backup before rollback..."
    
    local rollback_timestamp=$(date +%Y%m%d_%H%M%S)
    local rollback_backup="$BACKUP_DIR/rollback_backup_$rollback_timestamp"
    
    # Backup current database
    if docker ps | grep -q "badminton-postgres-prod"; then
        docker exec badminton-postgres-prod pg_dump -U badminton_user badminton_bot > "${rollback_backup}_database.sql"
        gzip "${rollback_backup}_database.sql"
        log_success "Current database backed up: ${rollback_backup}_database.sql.gz"
    else
        log_warning "Database container not running, skipping current database backup"
    fi
    
    # Backup current application data
    if [ -d "$PROJECT_DIR/logs" ]; then
        tar -czf "${rollback_backup}_app_data.tar.gz" -C $PROJECT_DIR logs .env
        log_success "Current application data backed up: ${rollback_backup}_app_data.tar.gz"
    fi
    
    echo "$rollback_timestamp"
}

stop_services() {
    log_info "Stopping services..."
    
    cd $PROJECT_DIR
    
    # Stop application containers
    docker-compose -f docker-compose.prod.yml down
    
    # Stop Nginx
    systemctl stop nginx
    
    log_success "Services stopped"
}

restore_database() {
    local backup_file=$1
    
    log_info "Restoring database from $backup_file..."
    
    # Start database container
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml up -d postgres
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot >/dev/null 2>&1; then
            log_success "Database is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Database is not ready after $max_attempts attempts"
            exit 1
        fi
        
        log_info "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    # Restore database
    if [[ $backup_file == *.gz ]]; then
        gunzip -c $backup_file | docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot
    else
        docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot < $backup_file
    fi
    
    log_success "Database restored successfully"
}

restore_application_data() {
    local backup_date=$1
    
    log_info "Restoring application data..."
    
    local app_backup="$BACKUP_DIR/backup_${backup_date}_app_data.tar.gz"
    
    if [ -f "$app_backup" ]; then
        tar -xzf $app_backup -C $PROJECT_DIR
        log_success "Application data restored"
    else
        log_warning "Application data backup not found: $app_backup"
    fi
}

restore_nginx_config() {
    local backup_date=$1
    
    log_info "Restoring Nginx configuration..."
    
    local nginx_backup="$BACKUP_DIR/backup_${backup_date}_nginx_config.tar.gz"
    
    if [ -f "$nginx_backup" ]; then
        tar -xzf $nginx_backup -C /
        nginx -t
        log_success "Nginx configuration restored"
    else
        log_warning "Nginx configuration backup not found: $nginx_backup"
    fi
}

start_services() {
    log_info "Starting services..."
    
    cd $PROJECT_DIR
    
    # Start all containers
    docker-compose -f docker-compose.prod.yml up -d
    
    # Start Nginx
    systemctl start nginx
    
    # Wait for services to be ready
    sleep 30
    
    log_success "Services started"
}

health_check() {
    log_info "Performing health check..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Check if application responds
        if curl -f -s "http://localhost:3100/health" >/dev/null 2>&1; then
            log_success "Application health check passed"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            return 1
        fi
        
        log_info "Health check attempt $attempt/$max_attempts"
        sleep 5
        ((attempt++))
    done
}

verify_rollback() {
    log_info "Verifying rollback..."
    
    # Check container status
    if ! docker ps | grep -q "badminton-bot-prod"; then
        log_error "Application container is not running"
        return 1
    fi
    
    if ! docker ps | grep -q "badminton-postgres-prod"; then
        log_error "Database container is not running"
        return 1
    fi
    
    # Check Nginx status
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx is not running"
        return 1
    fi
    
    # Check application health
    if ! health_check; then
        log_error "Application health check failed"
        return 1
    fi
    
    log_success "Rollback verification passed"
}

show_rollback_status() {
    log_info "Rollback Status:"
    
    echo ""
    echo "=== ROLLBACK SUMMARY ==="
    echo "Rollback Time: $(date)"
    echo "Project Directory: $PROJECT_DIR"
    echo "Domain: https://$DOMAIN"
    echo ""
    
    echo "=== CONTAINER STATUS ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "=== APPLICATION HEALTH ==="
    if curl -f -s "http://localhost:3100/health" >/dev/null 2>&1; then
        echo "Application: HEALTHY"
    else
        echo "Application: UNHEALTHY"
    fi
    echo ""
    
    echo "=== NGINX STATUS ==="
    systemctl status nginx --no-pager -l
    echo ""
    
    echo "=== SSL CERTIFICATE ==="
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo "SSL Certificate: VALID"
        openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates | grep notAfter
    else
        echo "SSL Certificate: NOT FOUND"
    fi
    echo ""
}

send_rollback_notification() {
    local status=$1
    local message=$2
    
    log_info "Sending rollback notification: $message"
    
    # Send to log file
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ROLLBACK_NOTIFICATION] $message" >> $LOG_FILE
    
    # You can add more notification methods here (email, Slack, etc.)
    # Example: curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   $SLACK_WEBHOOK_URL
}

# Main rollback function
rollback() {
    local backup_date=$1
    
    log_info "Starting rollback process..."
    
    check_root
    
    # Select backup
    local backup_file=$(select_backup $backup_date)
    log_info "Selected backup: $backup_file"
    
    # Create rollback backup
    local rollback_timestamp=$(create_rollback_backup)
    
    # Stop services
    stop_services
    
    # Restore components
    restore_database $backup_file
    restore_application_data $backup_date
    restore_nginx_config $backup_date
    
    # Start services
    start_services
    
    # Verify rollback
    if verify_rollback; then
        log_success "Rollback completed successfully!"
        show_rollback_status
        send_rollback_notification "success" "Rollback completed successfully at $(date)"
    else
        log_error "Rollback verification failed!"
        send_rollback_notification "failure" "Rollback verification failed at $(date)"
        exit 1
    fi
}

# Quick rollback to latest backup
quick_rollback() {
    log_info "Starting quick rollback to latest backup..."
    
    # Find latest backup
    local latest_backup=$(ls -t $BACKUP_DIR/backup_*_database.sql.gz 2>/dev/null | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backup found for quick rollback"
        exit 1
    fi
    
    # Extract backup date from filename
    local backup_date=$(basename $latest_backup | sed 's/backup_\(.*\)_database.sql.gz/\1/')
    
    log_info "Latest backup found: $backup_date"
    
    # Perform rollback
    rollback $backup_date
}

# Emergency rollback (force)
emergency_rollback() {
    local backup_date=$1
    
    log_warning "Starting emergency rollback..."
    
    check_root
    
    # Select backup
    local backup_file=$(select_backup $backup_date)
    log_info "Selected backup: $backup_file"
    
    # Force stop all services
    log_info "Force stopping all services..."
    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml down --remove-orphans
    systemctl stop nginx
    
    # Force restore database
    log_info "Force restoring database..."
    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml up -d postgres
    sleep 10
    gunzip -c $backup_file | docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot
    
    # Force start services
    log_info "Force starting services..."
    docker-compose -f $PROJECT_DIR/docker-compose.prod.yml up -d
    systemctl start nginx
    
    # Wait and check
    sleep 30
    
    if health_check; then
        log_success "Emergency rollback completed!"
    else
        log_error "Emergency rollback failed!"
        exit 1
    fi
}

# Script usage
show_usage() {
    echo "Usage: $0 {rollback|quick-rollback|emergency-rollback|list} [backup_date]"
    echo ""
    echo "Commands:"
    echo "  rollback <date>     - Rollback to specific backup (format: YYYYMMDD_HHMMSS)"
    echo "  quick-rollback      - Rollback to latest backup"
    echo "  emergency-rollback <date> - Force rollback (use with caution)"
    echo "  list               - List available backups"
    echo ""
    echo "Examples:"
    echo "  $0 rollback 20240101_120000"
    echo "  $0 quick-rollback"
    echo "  $0 emergency-rollback 20240101_120000"
    echo "  $0 list"
}

# Main execution
case "$1" in
    rollback)
        rollback $2
        ;;
    quick-rollback)
        quick_rollback
        ;;
    emergency-rollback)
        emergency_rollback $2
        ;;
    list)
        list_available_backups
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
