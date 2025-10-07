#!/bin/bash

# Simple deployment script
# This script handles the complete deployment process

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
    log_info "Starting deployment process..."
    
    # Fix permissions
    log_info "Fixing permissions..."
    sudo chmod +x fix-all-permissions.sh
    sudo ./fix-all-permissions.sh
    
    # Fix logs permissions
    log_info "Fixing logs permissions..."
    sudo chmod +x fix-logs-permissions.sh
    sudo ./fix-logs-permissions.sh
    
    # Start services
    log_info "Starting services..."
    sudo docker-compose -f docker-compose.prod.yml up -d
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    sudo docker exec badminton-bot-prod npx prisma migrate deploy || echo "Migration failed, but continuing..."
    
    # Fix nginx with simple config
    log_info "Fixing nginx with simple config..."
    sudo chmod +x fix-nginx-simple.sh
    sudo ./fix-nginx-simple.sh
    
    # Fix API Docs
    log_info "Fixing API Docs access..."
    sudo chmod +x fix-api-docs.sh
    sudo ./fix-api-docs.sh
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    sudo chmod +x test-api-endpoints.sh
    sudo ./test-api-endpoints.sh
    
    # Check containers
    log_info "Checking containers..."
    sudo chmod +x check-containers.sh
    sudo ./check-containers.sh
    
    # Show status
    log_info "Showing final status..."
    sudo chmod +x manage.sh
    sudo ./manage.sh status
    
    log_success "Deployment completed!"
}

# Run main function
main "$@"