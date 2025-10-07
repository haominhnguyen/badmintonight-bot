# GitHub Secrets và Environment Variables Setup

## Tổng quan
Hướng dẫn cấu hình GitHub Secrets và Environment Variables cho CI/CD pipeline.

## GitHub Secrets cần thiết

### 1. Production Server Secrets
```
PRODUCTION_HOST=your-production-server-ip
PRODUCTION_USERNAME=root
PRODUCTION_SSH_KEY=your-private-ssh-key
```

### 2. Staging Server Secrets
```
STAGING_HOST=your-staging-server-ip
STAGING_USERNAME=root
STAGING_SSH_KEY=your-private-ssh-key
```

### 3. Notification Secrets
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Cách cấu hình GitHub Secrets

### Bước 1: Truy cập Repository Settings
1. Vào repository trên GitHub
2. Click vào tab "Settings"
3. Trong sidebar, click vào "Secrets and variables"
4. Click vào "Actions"

### Bước 2: Thêm Secrets
1. Click "New repository secret"
2. Nhập tên secret (ví dụ: `PRODUCTION_HOST`)
3. Nhập giá trị secret
4. Click "Add secret"

### Bước 3: Thêm Environment Variables
1. Click "New environment"
2. Tạo environment "staging"
3. Tạo environment "production"
4. Thêm secrets cho từng environment

## Cấu hình SSH Key

### Bước 1: Tạo SSH Key Pair
```bash
# Trên máy local
ssh-keygen -t ed25519 -C "github-actions@haominhnguyen.shop"
# Lưu file: ~/.ssh/github_actions_ed25519
```

### Bước 2: Thêm Public Key vào VPS
```bash
# Copy public key vào VPS
ssh-copy-id -i ~/.ssh/github_actions_ed25519.pub root@your-vps-ip

# Hoặc thủ công:
cat ~/.ssh/github_actions_ed25519.pub >> ~/.ssh/authorized_keys
```

### Bước 3: Thêm Private Key vào GitHub Secrets
```bash
# Copy private key
cat ~/.ssh/github_actions_ed25519

# Thêm vào GitHub Secrets với tên: PRODUCTION_SSH_KEY
```

## Environment Variables

### Staging Environment
```
NODE_ENV=staging
DATABASE_URL=postgresql://badminton_user:password@localhost:5433/badminton_bot_staging
PORT=3101
```

### Production Environment
```
NODE_ENV=production
DATABASE_URL=postgresql://badminton_user:password@localhost:5432/badminton_bot
PORT=3100
```

## Cấu hình VPS cho CI/CD

### Bước 1: Cài đặt dependencies
```bash
# Cài đặt Docker và Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cài đặt Git
apt update && apt install -y git

# Cài đặt Nginx
apt install -y nginx
```

### Bước 2: Cấu hình SSH
```bash
# Tạo user cho GitHub Actions
useradd -m -s /bin/bash github-actions
usermod -aG docker github-actions

# Cấu hình SSH key
mkdir -p /home/github-actions/.ssh
chmod 700 /home/github-actions/.ssh
chown github-actions:github-actions /home/github-actions/.ssh
```

### Bước 3: Cấu hình Nginx cho Staging
```bash
# Tạo Nginx config cho staging
cat > /etc/nginx/sites-available/badminton-staging << EOF
server {
    listen 80;
    server_name staging.haominhnguyen.shop;
    
    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable staging site
ln -s /etc/nginx/sites-available/badminton-staging /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Cấu hình Slack Notifications

### Bước 1: Tạo Slack App
1. Vào https://api.slack.com/apps
2. Click "Create New App"
3. Chọn "From scratch"
4. Nhập tên app và workspace

### Bước 2: Cấu hình Incoming Webhooks
1. Trong app settings, click "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to On
3. Click "Add New Webhook to Workspace"
4. Chọn channel để nhận notifications
5. Copy Webhook URL

### Bước 3: Thêm Webhook URL vào GitHub Secrets
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Testing CI/CD Pipeline

### Bước 1: Test Staging Deployment
```bash
# Push code lên branch develop
git checkout develop
git push origin develop

# Kiểm tra GitHub Actions
# Vào repository > Actions tab
# Xem workflow "CI/CD Pipeline"
```

### Bước 2: Test Production Deployment
```bash
# Merge develop vào main
git checkout main
git merge develop
git push origin main

# Kiểm tra production deployment
```

## Troubleshooting

### Lỗi SSH Connection
```bash
# Test SSH connection
ssh -i ~/.ssh/github_actions_ed25519 root@your-vps-ip

# Kiểm tra SSH logs
tail -f /var/log/auth.log
```

### Lỗi Docker Permission
```bash
# Thêm user vào docker group
usermod -aG docker github-actions

# Restart Docker service
systemctl restart docker
```

### Lỗi Nginx Configuration
```bash
# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

## Security Best Practices

1. **SSH Key Security**
   - Sử dụng ed25519 keys
   - Không commit private keys
   - Rotate keys định kỳ

2. **Secrets Management**
   - Không hardcode secrets
   - Sử dụng GitHub Secrets
   - Encrypt sensitive data

3. **Access Control**
   - Giới hạn quyền truy cập
   - Sử dụng least privilege
   - Monitor access logs

4. **Network Security**
   - Sử dụng VPN nếu cần
   - Cấu hình firewall
   - Enable fail2ban

## Monitoring và Alerting

### Health Checks
- Application health endpoint
- Database connection
- SSL certificate expiry
- Disk space monitoring

### Alerting Channels
- Slack notifications
- Email alerts
- SMS notifications (optional)

### Log Management
- Centralized logging
- Log rotation
- Error tracking
- Performance monitoring
