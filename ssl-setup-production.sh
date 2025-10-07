#!/bin/bash

# SSL Setup Script for Production
# Author: Auto-generated SSL setup script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="haominhnguyen.shop"
EMAIL="admin@haominhnguyen.shop"

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

check_ssl_certificates() {
    log_info "Checking SSL certificates..."
    
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]] && [[ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]]; then
        log_success "SSL certificates already exist"
        return 0
    else
        log_warning "SSL certificates not found"
        return 1
    fi
}

install_certbot() {
    log_info "Installing Certbot..."
    
    # Update package list
    if [[ $EUID -eq 0 ]]; then
        apt-get update
        apt-get install -y certbot
    else
        sudo apt-get update
        sudo apt-get install -y certbot
    fi
    
    log_success "Certbot installed"
}

setup_ssl_certificates() {
    log_info "Setting up SSL certificates for $DOMAIN..."
    
    # Check if domain is accessible
    log_info "Checking domain accessibility..."
    if ! curl -s --connect-timeout 10 http://$DOMAIN > /dev/null; then
        log_warning "Domain $DOMAIN is not accessible. Skipping SSL setup."
        return 0
    fi
    
    # Stop nginx if running
    if [[ $EUID -eq 0 ]]; then
        systemctl stop nginx 2>/dev/null || true
    else
        sudo systemctl stop nginx 2>/dev/null || true
    fi
    
    # Stop any process using port 80
    if [[ $EUID -eq 0 ]]; then
        fuser -k 80/tcp 2>/dev/null || true
    else
        sudo fuser -k 80/tcp 2>/dev/null || true
    fi
    
    # Generate SSL certificate with webroot method
    if [[ $EUID -eq 0 ]]; then
        certbot certonly --webroot --non-interactive --agree-tos --email $EMAIL -d $DOMAIN --webroot-path /var/www/html
    else
        sudo certbot certonly --webroot --non-interactive --agree-tos --email $EMAIL -d $DOMAIN --webroot-path /var/www/html
    fi
    
    # If webroot fails, try standalone
    if [[ $? -ne 0 ]]; then
        log_info "Webroot method failed, trying standalone..."
        if [[ $EUID -eq 0 ]]; then
            certbot certonly --standalone --non-interactive --agree-tos --email $EMAIL -d $DOMAIN
        else
            sudo certbot certonly --standalone --non-interactive --agree-tos --email $EMAIL -d $DOMAIN
        fi
    fi
    
    log_success "SSL certificates generated"
}

setup_ssl_renewal() {
    log_info "Setting up SSL certificate renewal..."
    
    # Create renewal script
    cat > /tmp/ssl-renewal.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

certbot renew --quiet
systemctl reload nginx
EOF
    
    # Make script executable and move to cron
    if [[ $EUID -eq 0 ]]; then
        chmod +x /tmp/ssl-renewal.sh
        mv /tmp/ssl-renewal.sh /usr/local/bin/ssl-renewal.sh
        
        # Add to crontab (run daily at 2 AM)
        echo "0 2 * * * /usr/local/bin/ssl-renewal.sh" | crontab -
    else
        sudo chmod +x /tmp/ssl-renewal.sh
        sudo mv /tmp/ssl-renewal.sh /usr/local/bin/ssl-renewal.sh
        
        # Add to crontab (run daily at 2 AM)
        echo "0 2 * * * /usr/local/bin/ssl-renewal.sh" | sudo crontab -
    fi
    
    log_success "SSL renewal setup completed"
}

# Main execution
main() {
    log_info "Starting SSL setup for $DOMAIN..."
    
    # Check if certificates already exist
    if check_ssl_certificates; then
        log_info "SSL certificates already exist, skipping setup"
        return 0
    fi
    
    # Install certbot if not installed
    if ! command -v certbot &> /dev/null; then
        install_certbot
    fi
    
    # Setup SSL certificates
    setup_ssl_certificates
    
    # Setup renewal
    setup_ssl_renewal
    
    log_success "SSL setup completed for $DOMAIN!"
}

# Run main function
main "$@"
