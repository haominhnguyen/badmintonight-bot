#!/bin/bash

# SSL Certificate Setup Script for Badminton Bot
# Domain: haominhnguyen.shop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="haominhnguyen.shop"
EMAIL="admin@$DOMAIN"
NGINX_CONF="/etc/nginx/sites-available/badminton-bot"
SSL_DIR="/etc/letsencrypt/live/$DOMAIN"

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
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

install_certbot() {
    log_info "Installing Certbot..."
    
    apt update
    apt install -y certbot python3-certbot-nginx
    
    log_success "Certbot installed"
}

setup_ssl_certificate() {
    log_info "Setting up SSL certificate for $DOMAIN..."
    
    # Stop Nginx temporarily
    systemctl stop nginx
    
    # Get SSL certificate
    certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN,www.$DOMAIN \
        --non-interactive
    
    # Start Nginx
    systemctl start nginx
    
    log_success "SSL certificate obtained"
}

setup_auto_renewal() {
    log_info "Setting up automatic SSL renewal..."
    
    # Create renewal script
    cat > /etc/cron.d/certbot-renew << EOF
# Renew Let's Encrypt certificates twice daily
0 12 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx"
0 0 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF
    
    # Test renewal
    certbot renew --dry-run
    
    log_success "Auto-renewal configured"
}

update_nginx_ssl() {
    log_info "Updating Nginx configuration with SSL..."
    
    # Backup current config
    cp $NGINX_CONF $NGINX_CONF.backup
    
    # Update Nginx configuration
    cat > $NGINX_CONF << EOF
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=webhook:10m rate=5r/s;

# Upstream for the application
upstream badminton_app {
    server 127.0.0.1:3100;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration
    ssl_certificate $SSL_DIR/fullchain.pem;
    ssl_certificate_key $SSL_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Webhook endpoint
    location /webhook {
        limit_req zone=webhook burst=20 nodelay;
        proxy_pass http://badminton_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://badminton_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check
    location /health {
        proxy_pass http://badminton_app;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files (if any)
    location /static/ {
        alias /opt/badminton-bot/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Default location
    location / {
        return 404;
    }
}
EOF
    
    # Test Nginx configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    log_success "Nginx configuration updated with SSL"
}

check_ssl_status() {
    log_info "Checking SSL certificate status..."
    
    if [ -f "$SSL_DIR/fullchain.pem" ]; then
        log_success "SSL certificate found"
        
        # Show certificate details
        echo ""
        echo "=== SSL CERTIFICATE DETAILS ==="
        openssl x509 -in $SSL_DIR/fullchain.pem -text -noout | grep -A 2 "Validity"
        echo ""
        
        # Test SSL
        echo "=== SSL TEST ==="
        echo "Testing SSL connection to $DOMAIN..."
        if curl -s -I "https://$DOMAIN" | grep -q "200 OK"; then
            log_success "SSL is working correctly"
        else
            log_warning "SSL test failed - check your configuration"
        fi
    else
        log_error "SSL certificate not found"
        exit 1
    fi
}

show_ssl_info() {
    log_info "SSL Certificate Information:"
    
    echo ""
    echo "=== SSL CERTIFICATE INFO ==="
    echo "Domain: $DOMAIN"
    echo "Certificate Path: $SSL_DIR"
    echo "Email: $EMAIL"
    echo ""
    
    echo "=== CERTIFICATE FILES ==="
    ls -la $SSL_DIR/
    echo ""
    
    echo "=== RENEWAL STATUS ==="
    certbot certificates
    echo ""
    
    echo "=== NEXT STEPS ==="
    echo "1. Test your website: https://$DOMAIN"
    echo "2. Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo "3. Monitor renewal: certbot certificates"
    echo ""
}

# Main execution
main() {
    log_info "Setting up SSL certificate for $DOMAIN"
    
    check_root
    install_certbot
    setup_ssl_certificate
    setup_auto_renewal
    update_nginx_ssl
    check_ssl_status
    show_ssl_info
    
    log_success "SSL setup completed successfully!"
    log_info "Your website is now available at https://$DOMAIN"
}

# Run main function
main "$@"
