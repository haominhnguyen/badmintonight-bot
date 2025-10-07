#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

main() {
    log_info "Fixing SSL and HTTPS protocol..."
    
    # Check if nginx is running
    if ! sudo systemctl is-active nginx | grep -q "active"; then
        log_error "Nginx is not running. Please start nginx first."
        return 1
    fi
    
    # Update nginx config to handle HTTPS redirects
    log_info "Updating nginx config for HTTPS handling..."
    sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events {
    worker_connections 1024;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    default_type application/octet-stream;
    
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    upstream app {
        server 127.0.0.1:3100;
    }
    
    # HTTP server (redirect to HTTPS)
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        
        # Redirect all HTTP requests to HTTPS
        return 301 https://$host$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl default_server;
        listen [::]:443 ssl default_server;
        server_name _;
        
        # SSL configuration
        ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
        ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        
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
        
        location /api-docs {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
        
        location /docs {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
        
        location /swagger {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 10s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
        }
        
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
    
    # Generate self-signed SSL certificate if not exists
    log_info "Generating self-signed SSL certificate..."
    if [[ ! -f "/etc/ssl/certs/ssl-cert-snakeoil.pem" ]]; then
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
            -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        log_success "Self-signed SSL certificate generated"
    else
        log_info "SSL certificate already exists"
    fi
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
    
    # Restart nginx
    log_info "Restarting nginx..."
    sudo systemctl restart nginx
    
    # Check nginx status
    log_info "Checking nginx status..."
    if sudo systemctl is-active nginx | grep -q "active"; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service failed to start"
        return 1
    fi
    
    # Test HTTPS connectivity
    log_info "Testing HTTPS connectivity..."
    if curl -k -f -s -o /dev/null https://localhost/health; then
        log_success "HTTPS connectivity test passed"
    else
        log_warning "HTTPS connectivity test failed"
    fi
    
    # Test HTTP redirect
    log_info "Testing HTTP to HTTPS redirect..."
    if curl -f -s -o /dev/null -L http://localhost/health; then
        log_success "HTTP to HTTPS redirect is working"
    else
        log_warning "HTTP to HTTPS redirect failed"
    fi
    
    # Check port bindings
    log_info "Checking port bindings..."
    log_info "Port 80 bindings:"
    sudo netstat -tlnp | grep :80 || echo "Port 80 not found"
    
    log_info "Port 443 bindings:"
    sudo netstat -tlnp | grep :443 || echo "Port 443 not found"
    
    log_success "SSL and HTTPS protocol fixed!"
    log_info "You can now access your API at:"
    log_info "  HTTP:  http://51.120.247.250/api/v1/public/statistics/overview"
    log_info "  HTTPS: https://51.120.247.250/api/v1/public/statistics/overview"
}

main "$@"
