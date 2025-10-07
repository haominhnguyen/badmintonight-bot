#!/bin/bash

# Verify no SSL references script
# This script verifies that there are no SSL references in the project

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
    log_info "Verifying no SSL references in the project..."
    
    # Check shell scripts
    log_info "Checking shell scripts for SSL references..."
    if grep -r "ssl\|cert\|key\|letsencrypt\|443" --include="*.sh" .; then
        log_error "Found SSL references in shell scripts!"
        return 1
    else
        log_success "No SSL references found in shell scripts"
    fi
    
    # Check nginx config
    log_info "Checking nginx configuration for SSL references..."
    if grep -q "ssl\|cert\|key\|letsencrypt\|443" nginx.conf; then
        log_error "Found SSL references in nginx configuration!"
        return 1
    else
        log_success "No SSL references found in nginx configuration"
    fi
    
    # Check for port 80 only
    log_info "Checking nginx configuration for HTTP-only setup..."
    if grep -q "listen 80" nginx.conf; then
        log_success "Nginx is configured for HTTP-only (port 80)"
    else
        log_warning "Nginx may not be configured for HTTP-only"
    fi
    
    # Check for port 443
    log_info "Checking for port 443 references..."
    if grep -r "443" --include="*.sh" --include="*.conf" .; then
        log_warning "Found port 443 references:"
        grep -r "443" --include="*.sh" --include="*.conf" .
    else
        log_success "No port 443 references found"
    fi
    
    # Show nginx configuration summary
    log_info "Nginx configuration summary:"
    echo "  - Configuration file: nginx.conf"
    echo "  - HTTP-only: $(grep -c 'listen 80' nginx.conf) listeners on port 80"
    echo "  - SSL references: $(grep -c 'ssl\|cert\|key\|letsencrypt' nginx.conf || echo '0')"
    echo "  - Port 443 references: $(grep -c '443' nginx.conf || echo '0')"
    
    log_success "SSL verification completed! Project is SSL-free!"
}

# Run main function
main "$@"
