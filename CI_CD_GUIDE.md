# CI/CD Pipeline Guide cho Badminton Bot

## Tổng quan
Hướng dẫn thiết lập và sử dụng CI/CD pipeline cho ứng dụng Badminton Bot với GitHub Actions, Docker, và VPS deployment.

## Kiến trúc CI/CD

### 1. GitHub Actions Workflow
- **Trigger**: Push to main/develop branches, Pull requests
- **Jobs**: Test → Build → Deploy (Staging/Production)
- **Environments**: Staging, Production với approval gates

### 2. Deployment Strategy
- **Staging**: Tự động deploy từ branch `develop`
- **Production**: Tự động deploy từ branch `main`
- **Rollback**: Tự động rollback khi deployment thất bại

## Cấu trúc Files

```
.github/
├── workflows/
│   └── ci-cd.yml              # GitHub Actions workflow
└── SECRETS_SETUP.md           # Hướng dẫn cấu hình secrets

# Scripts
├── auto-deploy.sh             # Script deploy tự động
├── rollback.sh                # Script rollback
├── health-check.sh            # Script health check
├── manage.sh                  # Script quản lý chính
├── deploy.sh                  # Script deploy ban đầu
├── ssl-setup.sh               # Script cài đặt SSL
├── backup-restore.sh          # Script backup/restore
├── monitor.sh                 # Script monitoring

# Docker
├── docker-compose.yml         # Docker Compose development
├── docker-compose.prod.yml    # Docker Compose production
├── docker-compose.staging.yml # Docker Compose staging
└── Dockerfile                 # Docker image

# Documentation
├── CI_CD_GUIDE.md             # Hướng dẫn CI/CD
├── DEPLOYMENT_GUIDE.md        # Hướng dẫn deploy
└── .github/SECRETS_SETUP.md  # Hướng dẫn cấu hình secrets
```

## Cấu hình GitHub Secrets

### 1. Repository Secrets
```bash
# Production Server
PRODUCTION_HOST=your-production-server-ip
PRODUCTION_USERNAME=root
PRODUCTION_SSH_KEY=your-private-ssh-key

# Staging Server
STAGING_HOST=your-staging-server-ip
STAGING_USERNAME=root
STAGING_SSH_KEY=your-private-ssh-key

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 2. Environment Variables
```bash
# Staging Environment
NODE_ENV=staging
DATABASE_URL=postgresql://badminton_user:password@localhost:5433/badminton_bot_staging
PORT=3101

# Production Environment
NODE_ENV=production
DATABASE_URL=postgresql://badminton_user:password@localhost:5432/badminton_bot
PORT=3100
```

## Workflow Pipeline

### 1. Test Stage
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Generate Prisma client
- Run database migrations
- Run tests
- Run linting
- Run security audit
```

### 2. Build Stage
```yaml
- Setup Docker Buildx
- Login to Container Registry
- Extract metadata
- Build and push Docker image
- Cache layers
```

### 3. Deploy Stage
```yaml
# Staging (develop branch)
- Deploy to staging server
- Health check staging
- Notify deployment

# Production (main branch)
- Create backup
- Deploy to production server
- Health check production
- Notify deployment success/failure
```

### 4. Rollback Stage
```yaml
# Automatic rollback on failure
- Rollback to previous version
- Notify rollback
```

## Cấu hình VPS

### 1. Cài đặt Dependencies
```bash
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

### 2. Cấu hình SSH
```bash
# Tạo SSH key pair
ssh-keygen -t ed25519 -C "github-actions@haominhnguyen.shop"

# Thêm public key vào VPS
ssh-copy-id -i ~/.ssh/github_actions_ed25519.pub root@your-vps-ip

# Thêm private key vào GitHub Secrets
cat ~/.ssh/github_actions_ed25519
```

### 3. Cấu hình Nginx
```bash
# Production
server {
    listen 443 ssl http2;
    server_name haominhnguyen.shop;
    
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Staging
server {
    listen 80;
    server_name staging.haominhnguyen.shop;
    
    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Sử dụng CI/CD

### 1. Development Workflow
```bash
# Tạo feature branch
git checkout -b feature/new-feature

# Develop và commit
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Tạo Pull Request
# GitHub Actions sẽ chạy tests
```

### 2. Staging Deployment
```bash
# Merge feature vào develop
git checkout develop
git merge feature/new-feature
git push origin develop

# GitHub Actions sẽ tự động deploy lên staging
# Kiểm tra: https://staging.haominhnguyen.shop
```

### 3. Production Deployment
```bash
# Merge develop vào main
git checkout main
git merge develop
git push origin main

# GitHub Actions sẽ tự động deploy lên production
# Kiểm tra: https://haominhnguyen.shop
```

## Monitoring và Alerting

### 1. Health Checks
- **Application Health**: HTTP 200 response
- **Database Health**: Connection và query performance
- **SSL Certificate**: Expiry date monitoring
- **System Resources**: CPU, Memory, Disk usage

### 2. Notifications
- **Slack**: Deployment status, errors, alerts
- **Email**: Critical system alerts
- **Logs**: Centralized logging với rotation

### 3. Monitoring Commands
```bash
# Health check
sudo ./manage.sh health-check

# Quick check
sudo ./manage.sh quick-check

# Status
sudo ./manage.sh status

# Logs
sudo ./manage.sh logs app
sudo ./manage.sh logs nginx
sudo ./manage.sh logs system
```

## Backup và Recovery

### 1. Automatic Backups
- **Pre-deployment**: Tự động backup trước khi deploy
- **Daily**: Backup hàng ngày lúc 2:00 AM
- **Retention**: Giữ 7 ngày backup

### 2. Manual Backup
```bash
# Tạo backup
sudo ./manage.sh backup

# List backups
sudo ./manage.sh list-backups

# Restore từ backup
sudo ./manage.sh restore 20240101_120000
```

### 3. Rollback
```bash
# Rollback to specific backup
sudo ./manage.sh rollback 20240101_120000

# Quick rollback to latest
sudo ./manage.sh quick-rollback

# Emergency rollback
sudo ./rollback.sh emergency-rollback 20240101_120000
```

## Troubleshooting

### 1. Deployment Failures
```bash
# Check deployment logs
sudo ./manage.sh logs app

# Check system status
sudo ./manage.sh status

# Health check
sudo ./manage.sh health-check

# Rollback if needed
sudo ./manage.sh quick-rollback
```

### 2. Common Issues
- **SSH Connection**: Kiểm tra SSH key và permissions
- **Docker Issues**: Restart Docker service
- **Nginx Issues**: Test configuration và reload
- **SSL Issues**: Renew certificate với Let's Encrypt

### 3. Debug Commands
```bash
# Check containers
docker ps
docker logs badminton-bot-prod
docker logs badminton-postgres-prod

# Check Nginx
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log

# Check system
df -h
free -h
top
```

## Security Best Practices

### 1. Secrets Management
- Sử dụng GitHub Secrets
- Không hardcode credentials
- Rotate keys định kỳ
- Encrypt sensitive data

### 2. Access Control
- Giới hạn quyền truy cập
- Sử dụng SSH keys
- Enable fail2ban
- Monitor access logs

### 3. Network Security
- Cấu hình firewall
- Sử dụng HTTPS
- Enable security headers
- Rate limiting

## Performance Optimization

### 1. Docker Optimization
- Multi-stage builds
- Layer caching
- Image size optimization
- Health checks

### 2. Nginx Optimization
- Gzip compression
- Static file caching
- Rate limiting
- Security headers

### 3. Database Optimization
- Connection pooling
- Query optimization
- Index optimization
- Backup strategies

## Maintenance

### 1. Regular Tasks
- Update dependencies
- Security patches
- Certificate renewal
- Log rotation

### 2. Monitoring
- System resources
- Application performance
- Error rates
- User metrics

### 3. Cleanup
- Old Docker images
- Log files
- Backup files
- Temporary files

## Liên hệ và Support

### 1. Documentation
- README.md
- DEPLOYMENT_GUIDE.md
- CI_CD_GUIDE.md
- API documentation

### 2. Monitoring
- Health checks
- Alerts
- Logs
- Metrics

### 3. Support
- GitHub Issues
- Slack notifications
- Email alerts
- Documentation
