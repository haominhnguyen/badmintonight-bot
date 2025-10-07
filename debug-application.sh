#!/bin/bash

# Debug Application Script
# Author: Auto-generated debug script

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

check_containers() {
    log_info "Checking container status..."
    
    if [[ $EUID -eq 0 ]]; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
    echo ""
}

check_application_logs() {
    log_info "Checking application logs..."
    
    if [[ $EUID -eq 0 ]]; then
        docker logs badminton-bot-prod --tail 50
    else
        sudo docker logs badminton-bot-prod --tail 50
    fi
    echo ""
}

check_database_logs() {
    log_info "Checking database logs..."
    
    if [[ $EUID -eq 0 ]]; then
        docker logs badminton-postgres-prod --tail 20
    else
        sudo docker logs badminton-postgres-prod --tail 20
    fi
    echo ""
}

check_nginx_logs() {
    log_info "Checking nginx logs..."
    
    if [[ $EUID -eq 0 ]]; then
        docker logs badminton-nginx --tail 20
    else
        sudo docker logs badminton-nginx --tail 20
    fi
    echo ""
}

check_application_health() {
    log_info "Checking application health..."
    
    # Check if application is responding
    if curl -s --connect-timeout 5 http://localhost:3100/health > /dev/null; then
        log_success "Application is responding on port 3100"
    else
        log_error "Application is not responding on port 3100"
    fi
    
    # Check if nginx is responding
    if curl -s --connect-timeout 5 http://localhost:80 > /dev/null; then
        log_success "Nginx is responding on port 80"
    else
        log_error "Nginx is not responding on port 80"
    fi
    
    # Check if HTTPS is working
    if curl -s --connect-timeout 5 -k https://localhost:443 > /dev/null; then
        log_success "HTTPS is responding on port 443"
    else
        log_warning "HTTPS is not responding on port 443"
    fi
}

check_database_connection() {
    log_info "Checking database connection..."
    
    # Check if database is accessible
    if [[ $EUID -eq 0 ]]; then
        docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot
    else
        sudo docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "Database is accessible"
    else
        log_error "Database is not accessible"
    fi
}

check_environment_variables() {
    log_info "Checking environment variables..."
    
    cd $PROJECT_DIR
    
    if [[ -f ".env" ]]; then
        log_success ".env file exists"
        echo "Environment variables:"
        cat .env | grep -v "PASSWORD\|SECRET\|KEY" | head -10
    else
        log_error ".env file not found"
    fi
}

restart_application() {
    log_info "Restarting application..."
    
    cd $PROJECT_DIR
    
    # Stop containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml down
    else
        sudo docker-compose -f docker-compose.prod.yml down
    fi
    
    # Wait a bit
    sleep 5
    
    # Start containers
    if [[ $EUID -eq 0 ]]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        sudo docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Wait for services to start
    sleep 30
    
    log_success "Application restarted"
}

# Main execution
main() {
    log_info "Starting application debug..."
    
    check_containers
    check_application_logs
    check_database_logs
    check_nginx_logs
    check_application_health
    check_database_connection
    check_environment_variables
    
    log_info "Debug completed!"
}

# Run main function
main "$@"
