# 🚀 Hướng dẫn Deploy Badminton Bot

## 📋 Yêu cầu trước khi deploy

### 1. Chuẩn bị môi trường
- Docker & Docker Compose
- Domain name (cho webhook)
- SSL certificate (cho HTTPS)
- Facebook Developer Account

### 2. Tạo Facebook App
1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo App mới → chọn "Business"
3. Thêm Messenger product
4. Tạo Page Access Token
5. Cấu hình Webhook URL

## 🔧 Cấu hình Production

### 1. Environment Variables

Tạo file `.env` với nội dung:

```env
# Facebook Messenger
PAGE_ACCESS_TOKEN=your_production_token
VERIFY_TOKEN=your_secure_verify_token
WEBHOOK_URL=https://your-domain.com/webhook
GROUP_IDS=group_id_1,group_id_2

# Database
DATABASE_URL="postgresql://badminton_user:secure_password@postgres:5432/badminton_bot?schema=public"
POSTGRES_PASSWORD=your_secure_password

# Server
PORT=3000
NODE_ENV=production

# Cron
VOTE_CRON_TIME="0 8 * * *"
```

### 2. SSL Certificate

```bash
# Tạo thư mục ssl
mkdir ssl

# Copy certificate files
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
```

## 🐳 Deploy với Docker

### 1. Development

```bash
# Clone repository
git clone <repository-url>
cd badminton-bot

# Cấu hình environment
cp env.example .env
# Chỉnh sửa .env

# Chạy services
docker-compose up --build

# Chạy migration
docker-compose exec app npx prisma migrate deploy

# Khởi tạo dữ liệu mẫu
docker-compose exec app npm run db:init
```

### 2. Production

```bash
# Deploy production
docker-compose -f docker-compose.prod.yml up -d --build

# Chạy migration
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Khởi tạo dữ liệu
docker-compose -f docker-compose.prod.yml exec app npm run db:init
```

## 🌐 Cấu hình Nginx

### 1. Cài đặt Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Cấu hình Reverse Proxy

Tạo file `/etc/nginx/sites-available/badminton-bot`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable site

```bash
sudo ln -s /etc/nginx/sites-available/badminton-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL với Let's Encrypt

### 1. Cài đặt Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### 2. Tạo certificate

```bash
sudo certbot --nginx -d your-domain.com
```

### 3. Auto-renewal

```bash
sudo crontab -e
# Thêm dòng:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📱 Cấu hình Facebook Webhook

### 1. Webhook URL
```
https://your-domain.com/webhook
```

### 2. Verify Token
Sử dụng token trong `.env` file

### 3. Webhook Fields
- `messages`
- `messaging_postbacks`

### 4. Test webhook
```bash
curl -X GET "https://your-domain.com/webhook?hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING&hub.mode=subscribe"
```

## 🔍 Monitoring & Logs

### 1. Health Check

```bash
curl https://your-domain.com/health
```

### 2. View Logs

```bash
# Docker logs
docker-compose logs -f app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. Database Monitoring

```bash
# Connect to database
docker-compose exec postgres psql -U badminton_user -d badminton_bot

# Check tables
\dt

# Check data
SELECT * FROM users;
SELECT * FROM sessions;
```

## 🚨 Troubleshooting

### 1. Webhook không hoạt động

```bash
# Kiểm tra webhook URL
curl -X GET "https://your-domain.com/webhook?hub.verify_token=YOUR_TOKEN&hub.challenge=test&hub.mode=subscribe"

# Kiểm tra logs
docker-compose logs app
```

### 2. Database connection failed

```bash
# Kiểm tra database
docker-compose exec postgres pg_isready -U badminton_user

# Kiểm tra connection string
echo $DATABASE_URL
```

### 3. Bot không gửi tin nhắn

```bash
# Kiểm tra PAGE_ACCESS_TOKEN
curl -X GET "https://graph.facebook.com/v18.0/me?access_token=YOUR_TOKEN"

# Kiểm tra cron status
curl https://your-domain.com/api/cron/status
```

## 🔄 Backup & Restore

### 1. Backup Database

```bash
# Tạo backup
docker-compose exec postgres pg_dump -U badminton_user badminton_bot > backup.sql

# Restore
docker-compose exec -T postgres psql -U badminton_user badminton_bot < backup.sql
```

### 2. Backup Files

```bash
# Backup logs
tar -czf logs-backup.tar.gz logs/

# Backup config
tar -czf config-backup.tar.gz .env docker-compose.yml
```

## 📈 Performance Tuning

### 1. Database Optimization

```sql
-- Tạo indexes
CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_sessions_play_date ON sessions(play_date);
```

### 2. Nginx Optimization

```nginx
# Thêm vào nginx.conf
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

### 3. Docker Optimization

```yaml
# Thêm vào docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 🔐 Security Checklist

- [ ] Sử dụng HTTPS
- [ ] Strong passwords cho database
- [ ] Firewall configuration
- [ ] Regular security updates
- [ ] Backup strategy
- [ ] Monitor logs
- [ ] Rate limiting
- [ ] Input validation

## 📞 Support

Nếu gặp vấn đề trong quá trình deploy:

1. Kiểm tra logs: `docker-compose logs -f`
2. Kiểm tra health: `curl https://your-domain.com/health`
3. Tạo issue trên GitHub
4. Liên hệ qua email

---

**Lưu ý**: Đây là hướng dẫn cơ bản, trong production cần thêm các biện pháp bảo mật và monitoring nâng cao.
