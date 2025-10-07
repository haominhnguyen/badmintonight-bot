# Badminton Bot Deployment Guide

## Tổng quan
Hướng dẫn deploy ứng dụng Badminton Bot lên VPS với domain `haominhnguyen.shop` sử dụng Docker và Nginx.

## Yêu cầu hệ thống
- Ubuntu 20.04+ hoặc Debian 10+
- RAM: Tối thiểu 2GB (khuyến nghị 4GB)
- Disk: Tối thiểu 20GB
- Root access

## Các script được tạo

### 1. `deploy.sh` - Script deploy chính
- Cài đặt Docker, Docker Compose, Nginx
- Cấu hình firewall và bảo mật
- Deploy ứng dụng với Docker
- Tự động cài đặt SSL certificate

### 2. `ssl-setup.sh` - Script cài đặt SSL
- Cài đặt Certbot
- Tạo SSL certificate với Let's Encrypt
- Cấu hình auto-renewal

### 3. `backup-restore.sh` - Script backup/restore
- Backup database, application data, Nginx config, SSL certificates
- Restore từ backup
- Tự động cleanup old backups

### 4. `monitor.sh` - Script monitoring
- Kiểm tra health của containers
- Monitor system resources
- Check SSL certificate expiry
- Generate status reports

### 5. `manage.sh` - Script quản lý chính
- Quản lý tất cả các script khác
- Start/stop/restart services
- View logs và status

## Hướng dẫn deploy

### Bước 1: Chuẩn bị VPS
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Tạo user mới (tùy chọn)
sudo adduser badminton
sudo usermod -aG sudo badminton
```

### Bước 2: Upload code lên VPS
```bash
# Sử dụng SCP hoặc Git
scp -r . user@your-vps-ip:/opt/badminton-bot
# hoặc
git clone your-repo-url /opt/badminton-bot
```

### Bước 3: Chạy script deploy
```bash
# Chuyển đến thư mục project
cd /opt/badminton-bot

# Cấp quyền thực thi
chmod +x *.sh

# Chạy script deploy chính
sudo ./deploy.sh
```

### Bước 4: Cấu hình environment
```bash
# Chỉnh sửa file .env
sudo nano /opt/badminton-bot/.env

# Cập nhật các giá trị:
# - POSTGRES_PASSWORD=your_secure_password
# - TELEGRAM_BOT_TOKEN=your_bot_token
# - TELEGRAM_WEBHOOK_URL=https://haominhnguyen.shop/webhook
# - JWT_SECRET=your_jwt_secret
# - ENCRYPTION_KEY=your_encryption_key
# - ADMIN_PASSWORD=your_admin_password
```

### Bước 5: Restart services
```bash
# Restart để áp dụng cấu hình mới
sudo ./manage.sh restart
```

## Các lệnh quản lý

### Quản lý services
```bash
# Xem trạng thái
sudo ./manage.sh status

# Start services
sudo ./manage.sh start

# Stop services
sudo ./manage.sh stop

# Restart services
sudo ./manage.sh restart

# Update application
sudo ./manage.sh update
```

### Quản lý logs
```bash
# Xem logs application
sudo ./manage.sh logs app

# Xem logs database
sudo ./manage.sh logs db

# Xem logs Nginx
sudo ./manage.sh logs nginx

# Xem logs system
sudo ./manage.sh logs system

# Xem logs monitor
sudo ./manage.sh logs monitor
```

### Backup và restore
```bash
# Tạo backup
sudo ./manage.sh backup

# List backups
sudo ./manage.sh list-backups

# Restore từ backup
sudo ./manage.sh restore 20240101_120000
```

### Monitoring
```bash
# Check status một lần
sudo ./manage.sh status

# Start continuous monitoring
sudo ./manage.sh monitor
```

## Cấu hình Nginx

File Nginx đã được cấu hình với:
- SSL/TLS encryption
- Rate limiting
- Security headers
- Gzip compression
- Health check endpoints

## Cấu hình SSL

SSL certificate được tự động cài đặt với Let's Encrypt:
- Domain: `haominhnguyen.shop`
- Auto-renewal được cấu hình
- Redirect HTTP to HTTPS

## Bảo mật

Script đã cấu hình:
- UFW firewall
- Fail2ban
- Rate limiting
- Security headers
- SSL/TLS encryption

## Monitoring

Hệ thống monitoring bao gồm:
- Container health checks
- System resource monitoring
- Application health checks
- SSL certificate expiry monitoring
- Log analysis

## Troubleshooting

### Kiểm tra logs
```bash
# Xem logs chi tiết
sudo ./manage.sh logs app 100
sudo ./manage.sh logs nginx 100
sudo ./manage.sh logs system 100
```

### Kiểm tra status
```bash
# Xem trạng thái tổng quan
sudo ./manage.sh status

# Xem thông tin hệ thống
sudo ./manage.sh info
```

### Restart services
```bash
# Restart tất cả services
sudo ./manage.sh restart

# Hoặc restart từng service
sudo systemctl restart nginx
cd /opt/badminton-bot && docker-compose -f docker-compose.prod.yml restart
```

## Cấu trúc thư mục

```
/opt/badminton-bot/
├── deploy.sh              # Script deploy chính
├── ssl-setup.sh           # Script cài đặt SSL
├── backup-restore.sh      # Script backup/restore
├── monitor.sh             # Script monitoring
├── manage.sh              # Script quản lý chính
├── docker-compose.prod.yml # Docker Compose production
├── nginx.conf             # Nginx configuration
├── .env                   # Environment variables
└── logs/                  # Application logs
```

## Lưu ý quan trọng

1. **Domain**: Đảm bảo domain `haominhnguyen.shop` đã được cấu hình DNS trỏ về IP của VPS
2. **Firewall**: Port 80 và 443 phải được mở
3. **SSL**: Certificate sẽ được tự động cài đặt
4. **Backup**: Nên tạo backup định kỳ
5. **Monitoring**: Nên chạy monitoring để theo dõi hệ thống

## Liên hệ

Nếu có vấn đề gì, vui lòng kiểm tra logs và status trước khi liên hệ support.
