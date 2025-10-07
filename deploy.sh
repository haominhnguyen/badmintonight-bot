#!/bin/bash

# Badminton Bot Deployment Script for VPS
# Domain: haominhnguyen.shop
# Author: Auto-generated deployment script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="haominhnguyen.shop"
APP_NAME="badminton-bot"
PROJECT_DIR="/opt/badminton-bot"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"
SSL_DIR="/etc/letsencrypt/live/$DOMAIN"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

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

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install required packages
    apt install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        htop \
        nano \
        vim
    
    log_success "System dependencies installed"
}

install_docker() {
    log_info "Installing Docker..."
    
    # Remove old Docker installations
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group (if not root)
    if [[ $SUDO_USER ]]; then
        usermod -aG docker $SUDO_USER
    fi
    
    log_success "Docker installed successfully"
}

install_nginx() {
    log_info "Installing Nginx..."
    
    apt install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Remove default Nginx site
    rm -f /etc/nginx/sites-enabled/default
    
    log_success "Nginx installed successfully"
}

install_certbot() {
    log_info "Installing Certbot for SSL certificates..."
    
    apt install -y certbot python3-certbot-nginx
    
    log_success "Certbot installed successfully"
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

setup_fail2ban() {
    log_info "Configuring Fail2ban..."
    
    # Create jail.local
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log_success "Fail2ban configured"
}

create_project_directory() {
    log_info "Creating project directory..."
    
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    
    log_success "Project directory created at $PROJECT_DIR"
}

setup_nginx_config() {
    log_info "Setting up Nginx configuration..."
    
    # Create Nginx configuration
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
    
    # Enable the site
    ln -sf $NGINX_CONF $NGINX_ENABLED
    
    # Test Nginx configuration
    nginx -t
    
    log_success "Nginx configuration created"
}

setup_ssl_certificate() {
    log_info "Setting up SSL certificate..."
    
    # Stop Nginx temporarily
    systemctl stop nginx
    
    # Get SSL certificate
    certbot certonly --standalone \
        --email admin@$DOMAIN \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN,www.$DOMAIN
    
    # Start Nginx
    systemctl start nginx
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "SSL certificate configured"
}

create_docker_compose() {
    log_info "Creating Docker Compose configuration..."
    
    cat > $PROJECT_DIR/docker-compose.prod.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: badminton-postgres-prod
    environment:
      POSTGRES_DB: badminton_bot
      POSTGRES_USER: badminton_user
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U badminton_user -d badminton_bot"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    build: .
    container_name: badminton-bot-prod
    environment:
      DATABASE_URL: "postgresql://badminton_user:\${POSTGRES_PASSWORD}@postgres:5432/badminton_bot?schema=public"
      NODE_ENV: production
      PORT: 3100
      COURT_PRICE: \${COURT_PRICE:-120000}
      SHUTTLE_PRICE: \${SHUTTLE_PRICE:-25000}
      FEMALE_PRICE: \${FEMALE_PRICE:-40000}
    env_file:
      - .env
    ports:
      - "127.0.0.1:3100:3100"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3100/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data_prod:
EOF
    
    log_success "Docker Compose configuration created"
}

create_env_file() {
    log_info "Creating environment file..."
    
    cat > $PROJECT_DIR/.env << EOF
# Database
POSTGRES_PASSWORD=your_secure_password_here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://$DOMAIN/webhook

# Pricing (VND)
COURT_PRICE=120000
SHUTTLE_PRICE=25000
FEMALE_PRICE=40000

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Admin
ADMIN_PASSWORD=your_admin_password_here

# Monitoring
LOG_LEVEL=info
EOF
    
    log_warning "Please update the .env file with your actual values!"
    log_success "Environment file created"
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > /etc/systemd/system/badminton-bot.service << EOF
[Unit]
Description=Badminton Bot Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose -f $PROJECT_DIR/docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f $PROJECT_DIR/docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable badminton-bot.service
    
    log_success "Systemd service created"
}

create_backup_script() {
    log_info "Creating backup script..."
    
    cat > $PROJECT_DIR/backup.sh << 'EOF'
#!/bin/bash

# Backup script for Badminton Bot
BACKUP_DIR="/opt/backups/badminton-bot"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/badminton-bot"

mkdir -p $BACKUP_DIR

# Backup database
docker exec badminton-postgres-prod pg_dump -U badminton_user badminton_bot > $BACKUP_DIR/database_$DATE.sql

# Backup application data
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz -C $PROJECT_DIR logs

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF
    
    chmod +x $PROJECT_DIR/backup.sh
    
    # Add to crontab for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/backup.sh") | crontab -
    
    log_success "Backup script created"
}

create_monitoring_script() {
    log_info "Creating monitoring script..."
    
    cat > $PROJECT_DIR/monitor.sh << 'EOF'
#!/bin/bash

# Monitoring script for Badminton Bot
LOG_FILE="/var/log/badminton-bot-monitor.log"
PROJECT_DIR="/opt/badminton-bot"

# Check if containers are running
if ! docker ps | grep -q "badminton-bot-prod"; then
    echo "$(date): Badminton bot container is not running!" >> $LOG_FILE
    cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml up -d
fi

if ! docker ps | grep -q "badminton-postgres-prod"; then
    echo "$(date): PostgreSQL container is not running!" >> $LOG_FILE
    cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml up -d
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Disk usage is high: ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "$(date): Memory usage is high: ${MEM_USAGE}%" >> $LOG_FILE
fi
EOF
    
    chmod +x $PROJECT_DIR/monitor.sh
    
    # Add to crontab for monitoring every 5 minutes
    (crontab -l 2>/dev/null; echo "*/5 * * * * $PROJECT_DIR/monitor.sh") | crontab -
    
    log_success "Monitoring script created"
}

deploy_application() {
    log_info "Deploying application..."
    
    cd $PROJECT_DIR
    
    # Copy application files (assuming they're in current directory)
    if [ -f "package.json" ]; then
        log_info "Application files found, copying..."
        cp -r . $PROJECT_DIR/
    else
        log_warning "Application files not found in current directory"
        log_info "Please copy your application files to $PROJECT_DIR"
    fi
    
    # Build and start containers
    docker-compose -f docker-compose.prod.yml down || true
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    sleep 30
    
    # Check if services are running
    if docker ps | grep -q "badminton-bot-prod" && docker ps | grep -q "badminton-postgres-prod"; then
        log_success "Application deployed successfully!"
    else
        log_error "Application deployment failed!"
        exit 1
    fi
}

restart_nginx() {
    log_info "Restarting Nginx..."
    
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx restarted successfully"
    else
        log_error "Failed to restart Nginx"
        exit 1
    fi
}

show_status() {
    log_info "Checking deployment status..."
    
    echo ""
    echo "=== DEPLOYMENT STATUS ==="
    echo "Domain: https://$DOMAIN"
    echo "Project Directory: $PROJECT_DIR"
    echo ""
    
    echo "=== DOCKER CONTAINERS ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "=== NGINX STATUS ==="
    systemctl status nginx --no-pager -l
    echo ""
    
    echo "=== SSL CERTIFICATE ==="
    if [ -f "$SSL_DIR/fullchain.pem" ]; then
        echo "SSL Certificate: Valid"
        openssl x509 -in $SSL_DIR/fullchain.pem -text -noout | grep -A 2 "Validity"
    else
        echo "SSL Certificate: Not found"
    fi
    echo ""
    
    echo "=== FIREWALL STATUS ==="
    ufw status
    echo ""
    
    echo "=== NEXT STEPS ==="
    echo "1. Update the .env file with your actual values"
    echo "2. Set up your Telegram bot webhook: https://$DOMAIN/webhook"
    echo "3. Test the application: https://$DOMAIN/health"
    echo "4. Check logs: docker-compose -f $PROJECT_DIR/docker-compose.prod.yml logs"
    echo ""
}

# Main execution
main() {
    log_info "Starting Badminton Bot deployment for $DOMAIN"
    
    check_root
    install_dependencies
    install_docker
    install_nginx
    install_certbot
    setup_firewall
    setup_fail2ban
    create_project_directory
    setup_nginx_config
    setup_ssl_certificate
    create_docker_compose
    create_env_file
    create_systemd_service
    create_backup_script
    create_monitoring_script
    deploy_application
    restart_nginx
    show_status
    
    log_success "Deployment completed successfully!"
    log_info "Your Badminton Bot is now running at https://$DOMAIN"
}

# Run main function
main "$@"
