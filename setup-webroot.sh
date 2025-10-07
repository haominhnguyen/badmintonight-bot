#!/bin/bash

# Setup Webroot for SSL Certificate Generation
# Author: Auto-generated webroot setup script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEBROOT_PATH="/var/www/html"
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

setup_webroot() {
    log_info "Setting up webroot for SSL certificate generation..."
    
    # Create webroot directory
    if [[ $EUID -eq 0 ]]; then
        mkdir -p $WEBROOT_PATH
        chown -R www-data:www-data $WEBROOT_PATH
        chmod -R 755 $WEBROOT_PATH
    else
        sudo mkdir -p $WEBROOT_PATH
        sudo chown -R www-data:www-data $WEBROOT_PATH
        sudo chmod -R 755 $WEBROOT_PATH
    fi
    
    # Create a simple index.html
    cat > $WEBROOT_PATH/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>SSL Certificate Setup</title>
</head>
<body>
    <h1>SSL Certificate Setup in Progress</h1>
    <p>This page is used for SSL certificate generation.</p>
</body>
</html>
EOF
    
    # Create .well-known directory for ACME challenges
    if [[ $EUID -eq 0 ]]; then
        mkdir -p $WEBROOT_PATH/.well-known/acme-challenge
        chown -R www-data:www-data $WEBROOT_PATH/.well-known
        chmod -R 755 $WEBROOT_PATH/.well-known
    else
        sudo mkdir -p $WEBROOT_PATH/.well-known/acme-challenge
        sudo chown -R www-data:www-data $WEBROOT_PATH/.well-known
        sudo chmod -R 755 $WEBROOT_PATH/.well-known
    fi
    
    log_success "Webroot setup completed"
}

# Main execution
main() {
    log_info "Starting webroot setup..."
    setup_webroot
    log_success "Webroot setup completed!"
}

# Run main function
main "$@"
