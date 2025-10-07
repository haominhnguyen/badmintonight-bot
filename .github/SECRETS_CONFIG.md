# Cấu hình GitHub Secrets cho Production Server

## Thông tin Server
- **Host**: 51.120.247.250
- **Protocol**: SSH với username/password
- **Deployment**: Tự động khi push lên main branch

## GitHub Secrets cần cấu hình

### 1. Truy cập GitHub Secrets
1. Vào repository trên GitHub
2. Click vào tab "Settings"
3. Trong sidebar, click vào "Secrets and variables"
4. Click vào "Actions"

### 2. Thêm Production Secrets

#### PRODUCTION_HOST
```
Name: PRODUCTION_HOST
Value: 51.120.247.250
```

#### PRODUCTION_USERNAME
```
Name: PRODUCTION_USERNAME
Value: your-username
```

#### PRODUCTION_PASSWORD
```
Name: PRODUCTION_PASSWORD
Value: your-password
```

### 3. Thêm Docker Hub Secrets

#### DOCKER_USERNAME
```
Name: DOCKER_USERNAME
Value: haominhnguyen
```

#### DOCKER_PASSWORD
```
Name: DOCKER_PASSWORD
Value: your-docker-hub-access-token
```

### 4. Thêm Notification Secrets (Optional)

#### SLACK_WEBHOOK_URL
```
Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

**Note**: SLACK_WEBHOOK_URL là optional. Nếu không có, workflow vẫn chạy bình thường nhưng không gửi Slack notifications.

## Cấu hình Server

### 1. Chuẩn bị Server
```bash
# SSH vào server
ssh your-username@51.120.247.250

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cài đặt Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Cài đặt Git
apt update && apt install -y git

# Cài đặt Nginx
apt install -y nginx
```

### 2. Tạo Project Directory
```bash
# Tạo thư mục project
mkdir -p /opt/badminton-bot
cd /opt/badminton-bot

# Clone repository
git clone https://github.com/haominhnguyen/badmintonight-bot.git .

# Cấp quyền thực thi
chmod +x *.sh
```

### 3. Cấu hình Environment
```bash
# Tạo file .env
nano /opt/badminton-bot/.env

# Thêm các biến môi trường:
DATABASE_URL=postgresql://badminton_user:your_password@postgres:5432/badminton_bot?schema=public
NODE_ENV=production
PORT=3100
COURT_PRICE=120000
SHUTTLE_PRICE=25000
FEMALE_PRICE=40000
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://haominhnguyen.shop/webhook
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
ADMIN_PASSWORD=your_admin_password
```

### 4. Cấu hình Nginx
```bash
# Tạo Nginx config
cat > /etc/nginx/sites-available/badminton-bot << EOF
server {
    listen 80;
    server_name haominhnguyen.shop www.haominhnguyen.shop;
    
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/badminton-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test và reload Nginx
nginx -t
systemctl reload nginx
```

### 5. Cấu hình SSL (Optional)
```bash
# Cài đặt Certbot
apt install -y certbot python3-certbot-nginx

# Tạo SSL certificate
certbot --nginx -d haominhnguyen.shop -d www.haominhnguyen.shop

# Test auto-renewal
certbot renew --dry-run
```

## Testing Deployment

### 1. Test Manual Deployment
```bash
# SSH vào server
ssh your-username@51.120.247.250

# Chạy deployment thủ công
cd /opt/badminton-bot
./manage.sh deploy
```

### 2. Test GitHub Actions
```bash
# Push code lên main branch
git push origin main

# Kiểm tra GitHub Actions
# → Vào repository → Actions tab
# → Xem workflow "CI/CD Pipeline"
```

### 3. Kiểm tra Application
```bash
# Kiểm tra containers
docker ps

# Kiểm tra logs
./manage.sh logs app

# Kiểm tra health
./manage.sh health-check

# Kiểm tra website
curl https://haominhnguyen.shop/health
```

## Troubleshooting

### 1. SSH Connection Issues
```bash
# Test SSH connection
ssh your-username@51.120.247.250

# Kiểm tra firewall
ufw status

# Kiểm tra SSH service
systemctl status ssh
```

### 2. Docker Issues
```bash
# Kiểm tra Docker service
systemctl status docker

# Kiểm tra Docker logs
docker logs badminton-bot-prod
docker logs badminton-postgres-prod
```

### 3. Nginx Issues
```bash
# Kiểm tra Nginx config
nginx -t

# Kiểm tra Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 4. Application Issues
```bash
# Kiểm tra application logs
./manage.sh logs app

# Kiểm tra database
./manage.sh logs db

# Kiểm tra system
./manage.sh logs system
```

## Security Best Practices

### 1. Server Security
```bash
# Cập nhật hệ thống
apt update && apt upgrade -y

# Cấu hình firewall
ufw enable
ufw allow ssh
ufw allow 80
ufw allow 443

# Cài đặt fail2ban
apt install -y fail2ban
systemctl enable fail2ban
```

### 2. Secrets Security
- Không commit secrets vào code
- Sử dụng GitHub Secrets
- Rotate passwords định kỳ
- Monitor access logs

### 3. Application Security
- Sử dụng HTTPS
- Cấu hình security headers
- Enable rate limiting
- Monitor logs

## Monitoring

### 1. Health Checks
```bash
# Application health
curl https://haominhnguyen.shop/health

# System status
./manage.sh status

# Resource usage
./manage.sh health-check
```

### 2. Logs
```bash
# Application logs
./manage.sh logs app

# System logs
./manage.sh logs system

# Nginx logs
./manage.sh logs nginx
```

### 3. Alerts
- GitHub Actions notifications
- Slack notifications (nếu cấu hình)
- Email alerts (nếu cấu hình)

## Liên hệ

Nếu gặp vấn đề:
1. Kiểm tra GitHub Actions logs
2. Xem server status và logs
3. Test SSH connection
4. Kiểm tra Docker và Nginx
5. Liên hệ support team
