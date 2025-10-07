#!/bin/bash

# Fix logs permissions script
# This script fixes permissions for the logs directory

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
    log_info "Starting logs permissions fix..."
    
    # Create logs directory if it doesn't exist
    if [[ ! -d "./logs" ]]; then
        log_info "Creating logs directory..."
        mkdir -p ./logs
        log_success "Logs directory created"
    else
        log_info "Logs directory already exists"
    fi
    
    # Set proper permissions for logs directory
    log_info "Setting logs directory permissions..."
    chmod 755 ./logs
    
    # Create log files if they don't exist
    touch ./logs/error.log
    touch ./logs/access.log
    touch ./logs/app.log
    
    # Set permissions for log files
    chmod 644 ./logs/*.log
    
    # Set ownership (if running as root)
    if [[ $EUID -eq 0 ]]; then
        log_info "Setting ownership for logs directory..."
        chown -R 1001:1001 ./logs
        log_success "Ownership set for logs directory"
    else
        log_warning "Not running as root, skipping ownership change"
    fi
    
    # Test write permissions
    log_info "Testing write permissions..."
    if echo "test" > ./logs/test.log 2>/dev/null; then
        rm -f ./logs/test.log
        log_success "Write permissions test passed"
    else
        log_error "Write permissions test failed"
        return 1
    fi
    
    log_success "Logs permissions fix completed!"
}

# Run main function
main "$@"
