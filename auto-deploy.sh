#!/bin/bash

# Auto Deploy Script for Badminton Bot
# This script is called by GitHub Actions for automated deployment
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
DOMAIN="haominhnguyen.shop"
BACKUP_DIR="/opt/backups/badminton-bot"
LOG_FILE="/var/log/badminton-bot-deploy.log"

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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    # Check if Docker is running
    if ! systemctl is-active --quiet docker; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Nginx is running
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

create_backup() {
    log_info "Creating backup before deployment..."
    
    # Create backup directory if it doesn't exist
    mkdir -p $BACKUP_DIR
    
    # Create timestamped backup
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_deploy_backup_$backup_timestamp"
    
    # Backup database
    if docker ps | grep -q "badminton-postgres-prod"; then
        docker exec badminton-postgres-prod pg_dump -U badminton_user badminton_bot > "${backup_file}_database.sql"
        gzip "${backup_file}_database.sql"
        log_success "Database backup created"
    else
        log_warning "Database container not running, skipping database backup"
    fi
    
    # Backup application data
    if [ -d "$PROJECT_DIR/logs" ]; then
        tar -czf "${backup_file}_app_data.tar.gz" -C $PROJECT_DIR logs .env
        log_success "Application data backup created"
    fi
    
    # Backup Nginx configuration
    tar -czf "${backup_file}_nginx_config.tar.gz" -C /etc/nginx sites-available/badminton-bot sites-enabled/badminton-bot
    log_success "Nginx configuration backup created"
    
    log_success "Backup completed: $backup_timestamp"
}

pull_latest_code() {
    log_info "Pulling latest code from repository..."
    
    cd $PROJECT_DIR
    
    # Check if it's a git repository
    if [ -d ".git" ]; then
        # Stash any local changes
        git stash push -m "Auto-stash before deployment $(date)"
        
        # Pull latest changes
        git pull origin main
        
        log_success "Code updated successfully"
    else
        log_warning "Not a git repository, skipping code update"
    fi
}

update_docker_images() {
    log_info "Updating Docker images..."
    
    cd $PROJECT_DIR
    
    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull
    
    log_success "Docker images updated"
}

deploy_application() {
    log_info "Deploying application..."
    
    cd $PROJECT_DIR
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down
    
    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    log_success "Application deployed"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    cd $PROJECT_DIR
    
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
    
    # Run migrations
    docker exec badminton-bot-prod npx prisma migrate deploy
    
    log_success "Database migrations completed"
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

check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    local cert_file="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    
    if [ -f "$cert_file" ]; then
        local cert_expiry=$(openssl x509 -in $cert_file -noout -dates | grep notAfter | cut -d= -f2)
        local cert_expiry_epoch=$(date -d "$cert_expiry" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (cert_expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            log_warning "SSL certificate expires in $days_until_expiry days"
        else
            log_success "SSL certificate valid for $days_until_expiry days"
        fi
    else
        log_error "SSL certificate not found"
        return 1
    fi
}

restart_nginx() {
    log_info "Restarting Nginx..."
    
    # Test Nginx configuration
    if nginx -t; then
        systemctl reload nginx
        log_success "Nginx reloaded successfully"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "Cleanup completed"
}

send_notification() {
    local status=$1
    local message=$2
    
    log_info "Sending notification: $message"
    
    # Send to log file
    echo "$(date '+%Y-%m-%d %H:%M:%S') [NOTIFICATION] $message" >> $LOG_FILE
    
    # You can add more notification methods here (email, Slack, etc.)
    # Example: curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   $SLACK_WEBHOOK_URL
}

rollback() {
    log_info "Rolling back to previous version..."
    
    cd $PROJECT_DIR
    
    # Find the most recent backup
    local latest_backup=$(ls -t $BACKUP_DIR/pre_deploy_backup_*_database.sql.gz 2>/dev/null | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    log_info "Rolling back using backup: $latest_backup"
    
    # Stop current containers
    docker-compose -f docker-compose.prod.yml down
    
    # Restore database
    gunzip -c $latest_backup | docker exec -i badminton-postgres-prod psql -U badminton_user -d badminton_bot
    
    # Start containers
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services
    sleep 30
    
    # Health check
    if health_check; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback failed - health check failed"
        exit 1
    fi
}

show_deployment_status() {
    log_info "Deployment Status:"
    
    echo ""
    echo "=== DEPLOYMENT SUMMARY ==="
    echo "Deployment Time: $(date)"
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

# Main deployment function
deploy() {
    log_info "Starting automated deployment..."
    
    check_prerequisites
    create_backup
    pull_latest_code
    update_docker_images
    deploy_application
    run_database_migrations
    restart_nginx
    health_check
    check_ssl_certificate
    cleanup_old_images
    show_deployment_status
    
    send_notification "success" "Deployment completed successfully at $(date)"
    log_success "Deployment completed successfully!"
}

# Main execution
case "$1" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    health-check)
        health_check
        ;;
    status)
        show_deployment_status
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|status}"
        echo ""
        echo "Commands:"
        echo "  deploy       - Deploy the application"
        echo "  rollback     - Rollback to previous version"
        echo "  health-check - Check application health"
        echo "  status       - Show deployment status"
        exit 1
        ;;
esac
