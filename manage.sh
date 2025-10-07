#!/bin/bash

# Main Management Script for Badminton Bot
# Domain: haominhnguyen.shop
# Author: Auto-generated management script

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

make_scripts_executable() {
    log_info "Making scripts executable..."
    
    chmod +x deploy.sh
    # SSL setup removed
    chmod +x backup-restore.sh
    chmod +x monitor.sh
    chmod +x auto-deploy.sh
    chmod +x rollback.sh
    chmod +x health-check.sh
    chmod +x manage.sh
    
    log_success "Scripts made executable"
}

deploy() {
    log_info "Starting deployment..."
    ./deploy.sh
    log_success "Deployment completed!"
}

# SSL setup removed

backup() {
    log_info "Starting backup..."
    ./backup-restore.sh backup
    log_success "Backup completed!"
}

restore() {
    local backup_date=$1
    if [ -z "$backup_date" ]; then
        log_error "Please specify backup date (format: YYYYMMDD_HHMMSS)"
        echo "Usage: $0 restore YYYYMMDD_HHMMSS"
        echo "Available backups:"
        ./backup-restore.sh list
        exit 1
    fi
    
    log_info "Starting restore from backup: $backup_date..."
    ./backup-restore.sh restore $backup_date
    log_success "Restore completed!"
}

list_backups() {
    log_info "Listing available backups..."
    ./backup-restore.sh list
}

status() {
    log_info "Checking system status..."
    ./monitor.sh status
}

monitor() {
    log_info "Starting continuous monitoring..."
    ./monitor.sh monitor
}

logs() {
    local service=$1
    local lines=${2:-50}
    
    log_info "Showing logs for $service..."
    ./monitor.sh logs $service $lines
}

restart() {
    log_info "Restarting services..."
    
    cd $PROJECT_DIR
    
    # Restart Docker containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d
    else
        sudo docker-compose -f docker-compose.prod.yml down
        sudo docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Restart Nginx
    systemctl restart nginx
    
    # Wait for services to be ready
    sleep 10
    
    # Check status
    if [[ $EUID -eq 0 ]]; then
        if docker ps | grep -q "badminton-bot-prod" && docker ps | grep -q "badminton-postgres-prod"; then
            log_success "Services restarted successfully!"
        else
            log_error "Failed to restart services!"
            exit 1
        fi
    else
        if sudo docker ps | grep -q "badminton-bot-prod" && sudo docker ps | grep -q "badminton-postgres-prod"; then
            log_success "Services restarted successfully!"
        else
            log_error "Failed to restart services!"
            exit 1
        fi
    fi
}

stop() {
    log_info "Stopping services..."
    
    cd $PROJECT_DIR
    
    # Stop Docker containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml down
    else
        sudo docker-compose -f docker-compose.prod.yml down
    fi
    
    # Stop Nginx
    systemctl stop nginx
    
    log_success "Services stopped!"
}

start() {
    log_info "Starting services..."
    
    cd $PROJECT_DIR
    
    # Start Docker containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        sudo docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Start Nginx
    systemctl start nginx
    
    # Wait for services to be ready
    sleep 10
    
    # Check status
    if [[ $EUID -eq 0 ]]; then
        if docker ps | grep -q "badminton-bot-prod" && docker ps | grep -q "badminton-postgres-prod"; then
            log_success "Services started successfully!"
        else
            log_error "Failed to start services!"
            exit 1
        fi
    else
        if sudo docker ps | grep -q "badminton-bot-prod" && sudo docker ps | grep -q "badminton-postgres-prod"; then
            log_success "Services started successfully!"
        else
            log_error "Failed to start services!"
            exit 1
        fi
    fi
}

update() {
    log_info "Updating application..."
    
    cd $PROJECT_DIR
    
    # Pull latest changes (if using git)
    if [ -d ".git" ]; then
        git pull origin main
    else
        log_warning "Not a git repository, skipping git pull"
    fi
    
    # Rebuild and restart containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml build
        docker-compose -f docker-compose.prod.yml up -d
    else
        sudo docker-compose -f docker-compose.prod.yml down
        sudo docker-compose -f docker-compose.prod.yml build
        sudo docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Wait for services to be ready
    sleep 30
    
    # Check status
    if [[ $EUID -eq 0 ]]; then
        if docker ps | grep -q "badminton-bot-prod" && docker ps | grep -q "badminton-postgres-prod"; then
            log_success "Application updated successfully!"
        else
            log_error "Failed to update application!"
            exit 1
        fi
    else
        if sudo docker ps | grep -q "badminton-bot-prod" && sudo docker ps | grep -q "badminton-postgres-prod"; then
            log_success "Application updated successfully!"
        else
            log_error "Failed to update application!"
            exit 1
        fi
    fi
}

cleanup() {
    log_info "Cleaning up system..."
    
    # Clean Docker
    if [[ $EUID -eq 0 ]]; then
        docker system prune -f
        docker volume prune -f
    else
        sudo docker system prune -f
        sudo docker volume prune -f
    fi
    
    # Clean logs
    find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Clean temporary files
    rm -rf /tmp/*
    
    log_success "Cleanup completed!"
}

show_info() {
    log_info "Badminton Bot Management System"
    
    echo ""
    echo "=== SYSTEM INFORMATION ==="
    echo "Domain: https://$DOMAIN"
    echo "Project Directory: $PROJECT_DIR"
    echo "OS: $(uname -a)"
    echo "Uptime: $(uptime)"
    echo ""
    
    echo "=== DOCKER STATUS ==="
    if [[ $EUID -eq 0 ]]; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
    echo ""
    
    echo "=== NGINX STATUS ==="
    systemctl status nginx --no-pager -l
    echo ""
    
    echo "=== DISK USAGE ==="
    df -h
    echo ""
    
    echo "=== MEMORY USAGE ==="
    free -h
    echo ""
}

show_usage() {
    echo "Badminton Bot Management Script"
    echo "Domain: $DOMAIN"
    echo ""
    echo "Usage: $0 {command} [options]"
    echo ""
    echo "Commands:"
    echo "  deploy              - Deploy the application (first time setup)"
    # SSL setup removed
    echo "  start               - Start all services"
    echo "  stop                - Stop all services"
    echo "  restart             - Restart all services"
    echo "  update              - Update application"
    echo "  status              - Check system status"
    echo "  monitor             - Start continuous monitoring"
    echo "  logs <service> [lines] - Show logs for specific service"
    echo "  backup              - Create backup"
    echo "  restore <date>      - Restore from backup"
    echo "  list-backups        - List available backups"
    echo "  cleanup             - Clean up system"
    echo "  info                - Show system information"
    echo "  health-check        - Perform comprehensive health check"
    echo "  quick-check         - Perform quick health check"
    echo "  rollback <date>     - Rollback to specific backup"
    echo "  quick-rollback      - Rollback to latest backup"
    echo "  auto-deploy         - Run automated deployment"
    echo ""
    echo "Available services for logs:"
    echo "  app                 - Application logs"
    echo "  db                  - Database logs"
    echo "  nginx               - Nginx logs"
    echo "  system              - System logs"
    echo "  monitor             - Monitor logs"
    echo ""
    echo "Examples:"
    echo "  $0 deploy           # First time deployment"
    # SSL setup removed
    echo "  $0 status           # Check status"
    echo "  $0 logs app 100     # Show last 100 lines of app logs"
    echo "  $0 backup           # Create backup"
    echo "  $0 restore 20240101_120000  # Restore from backup"
    echo "  $0 health-check     # Comprehensive health check"
    echo "  $0 rollback 20240101_120000  # Rollback to backup"
    echo "  $0 auto-deploy      # Automated deployment"
    echo ""
}

# Main execution
case "$1" in
    deploy)
        check_root
        make_scripts_executable
        deploy
        ;;
    # SSL setup removed
    start)
        check_root
        start
        ;;
    stop)
        check_root
        stop
        ;;
    restart)
        check_root
        restart
        ;;
    update)
        check_root
        update
        ;;
    status)
        status
        ;;
    monitor)
        monitor
        ;;
    logs)
        logs $2 $3
        ;;
    backup)
        check_root
        backup
        ;;
    restore)
        check_root
        restore $2
        ;;
    list-backups)
        list_backups
        ;;
    cleanup)
        check_root
        cleanup
        ;;
    info)
        show_info
        ;;
    health-check)
        ./health-check.sh health-check
        ;;
    quick-check)
        ./health-check.sh quick-check
        ;;
    rollback)
        check_root
        ./rollback.sh rollback $2
        ;;
    quick-rollback)
        check_root
        ./rollback.sh quick-rollback
        ;;
    auto-deploy)
        check_root
        ./auto-deploy.sh deploy
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
