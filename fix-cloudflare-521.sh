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
    log_info "Fixing Cloudflare 521 error..."
    
    # Check if nginx is running
    if ! sudo systemctl is-active nginx | grep -q "active"; then
        log_error "Nginx is not running. Starting nginx..."
        sudo systemctl start nginx
    fi
    
    # Check if app container is running
    if ! sudo docker ps | grep -q "badminton-bot-prod"; then
        log_error "App container is not running. Starting containers..."
        sudo docker-compose -f docker-compose.prod.yml up -d
        sleep 30
    fi
    
    # Update nginx config for Cloudflare compatibility
    log_info "Updating nginx config for Cloudflare compatibility..."
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
    
    # HTTP server (for Cloudflare)
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        
        # Cloudflare IP ranges (optional, for security)
        # allow 173.245.48.0/20;
        # allow 103.21.244.0/22;
        # allow 103.22.200.0/22;
        # allow 103.31.4.0/22;
        # allow 141.101.64.0/18;
        # allow 108.162.192.0/18;
        # allow 190.93.240.0/20;
        # allow 188.114.96.0/20;
        # allow 197.234.240.0/22;
        # allow 198.41.128.0/17;
        # allow 162.158.0.0/15;
        # allow 104.16.0.0/13;
        # allow 104.24.0.0/14;
        # allow 172.64.0.0/13;
        # allow 131.0.72.0/22;
        # deny all;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        # Cloudflare specific headers
        add_header X-Forwarded-Proto $scheme;
        add_header X-Real-IP $remote_addr;
        add_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
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
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    if curl -f -s -o /dev/null http://localhost/health; then
        log_success "HTTP connectivity test passed"
    else
        log_warning "HTTP connectivity test failed"
    fi
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    test_endpoint() {
        local url=$1
        local name=$2
        
        if curl -f -s -o /dev/null "$url"; then
            log_success "$name is accessible"
            return 0
        else
            log_error "$name is not accessible"
            return 1
        fi
    }
    
    test_endpoint "http://localhost/health" "Health"
    test_endpoint "http://localhost/api/health" "API Health"
    test_endpoint "http://localhost/api/v1/public/statistics/overview" "Statistics API"
    test_endpoint "http://localhost/api-docs" "API Docs"
    
    # Check port bindings
    log_info "Checking port bindings..."
    log_info "Port 80 bindings:"
    sudo netstat -tlnp | grep :80 || echo "Port 80 not found"
    
    log_info "Port 3100 bindings:"
    sudo netstat -tlnp | grep :3100 || echo "Port 3100 not found"
    
    # Check docker containers
    log_info "Checking docker containers..."
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log_success "Cloudflare 521 error fixed!"
    log_info "Your API should now be accessible at:"
    log_info "  http://51.120.247.250/api/v1/public/statistics/overview"
    log_info "  http://51.120.247.250/health"
    log_info "  http://51.120.247.250/api-docs"
}

main "$@"

