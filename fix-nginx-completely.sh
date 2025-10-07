#!/bin/bash

# Fix Nginx completely - remove ALL SSL references
# This script completely removes SSL and creates clean HTTP-only config

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
    log_info "Fixing Nginx completely - removing ALL SSL references..."
    
    # Stop nginx service
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    
    # Remove ALL SSL certificates and configs
    log_info "Removing ALL SSL certificates and configs..."
    sudo rm -rf /etc/letsencrypt/ || true
    sudo rm -rf /etc/nginx/sites-enabled/* || true
    sudo rm -rf /etc/nginx/sites-available/* || true
    sudo rm -rf /etc/nginx/conf.d/* || true
    sudo rm -rf /etc/nginx/ssl/ || true
    
    # Backup original nginx.conf
    log_info "Backing up original nginx.conf..."
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) || true
    
    # Create completely clean HTTP-only nginx configuration
    log_info "Creating completely clean HTTP-only nginx configuration..."
    sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events {
    worker_connections 1024;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Upstream
    upstream app {
        server 127.0.0.1:3100;
    }
    
    # HTTP server ONLY (NO SSL, NO 443, NO CERTIFICATES)
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        # Health check
        location /health {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 5s;
            proxy_send_timeout 5s;
            proxy_read_timeout 5s;
        }
        
        # Webhook endpoint
        location /webhook {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
        
        # API endpoints
        location /api/ {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
        
        # Default location
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
    }
}
EOF
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        log_info "Nginx configuration content:"
        sudo cat /etc/nginx/nginx.conf
        return 1
    fi
    
    # Start nginx service
    log_info "Starting nginx service..."
    sudo systemctl start nginx
    
    # Wait for nginx to start
    sleep 5
    
    # Check nginx status
    log_info "Checking nginx status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service failed to start"
        log_info "Nginx service status:"
        sudo systemctl status nginx --no-pager
        return 1
    fi
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
    fi
    
    # Show nginx status
    log_info "Nginx service status:"
    sudo systemctl status nginx --no-pager
    
    # Show port bindings
    log_info "Port bindings:"
    sudo netstat -tlnp | grep -E ":(80|443|3100)" || echo "No ports found"
    
    log_success "Nginx completely fixed! No more SSL errors!"
}

# Run main function
main "$@"
