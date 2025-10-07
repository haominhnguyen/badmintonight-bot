# CI/CD Workflow Summary

## Tổng quan
Workflow đã được cấu hình để chỉ build Docker và deploy khi push lên main branch với tính năng cancel builds cũ khi có build mới.

## Concurrency & Cancel Builds

### 1. Auto Cancel Previous Builds
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 2. Cách hoạt động
- **Khi push mới**: Tự động cancel build cũ đang chạy
- **Khi manual trigger**: Cancel build cũ nếu có
- **Group by**: Workflow name + branch name
- **Cancel**: Tất cả builds cũ trong cùng group

### 3. Lợi ích
- ✅ **Tiết kiệm resources**: Không chạy song song nhiều builds
- ✅ **Deploy mới nhất**: Chỉ deploy commit mới nhất
- ✅ **Tránh conflict**: Không có nhiều deployments cùng lúc
- ✅ **Tối ưu thời gian**: Không chờ builds cũ hoàn thành

## Workflow Triggers

### 1. Automatic Triggers
```bash
# Push to main branch
git push origin main
# → Tự động: Test → Build → Deploy Production
# → Cancel builds cũ nếu có
```

### 2. Manual Triggers
```bash
# GitHub Actions → Run workflow
# → Có thể chọn: Skip tests, Force deploy
```

### 3. Pull Request Triggers
```bash
# Pull request to main
# → Chỉ chạy tests, không build/deploy
```

## Workflow Jobs

### 1. Test Job
- **Trigger**: Push to main, Pull request, Manual (nếu không skip tests)
- **Purpose**: Run tests, linting, security audit
- **Skip**: Khi manual với skip_tests = true

### 2. Build Job
- **Trigger**: Push to main, Manual (nếu không skip tests)
- **Purpose**: Build Docker image với tests
- **Dependencies**: Test job

### 3. Build Skip Tests Job
- **Trigger**: Manual với skip_tests = true
- **Purpose**: Build Docker image không cần tests
- **Dependencies**: None

### 4. Deploy Production Job
- **Trigger**: Push to main, Manual
- **Purpose**: Deploy to production environment
- **Dependencies**: Build jobs

### 5. Rollback Job
- **Trigger**: Production deployment failure
- **Purpose**: Automatic rollback
- **Dependencies**: None

## Deployment Flow

### Normal Flow
```bash
# 1. Develop feature
git checkout -b feature/new-feature
# ... develop code ...

# 2. Test locally
npm test
npm run lint

# 3. Merge to main
git checkout main
git merge feature/new-feature
git push origin main

# 4. Automatic deployment
# → Tests run
# → Docker image build
# → Deploy to production
# → Health check
```

### Emergency Flow
```bash
# 1. Manual deployment
# → GitHub Actions → Run workflow
# → Skip tests: true
# → Force deploy: true

# 2. Or rollback
ssh root@your-server
cd /opt/badminton-bot
./manage.sh quick-rollback
```

## Environment Configuration

### Production Environment
- **URL**: https://haominhnguyen.shop
- **Database**: badminton_bot
- **Port**: 3100
- **Docker Compose**: docker-compose.prod.yml
- **Auto-deploy**: Push to main branch

## Build Configuration

### Docker Image
- **Registry**: Docker Hub (docker.io)
- **Image**: haominhnguyen/badmintonight-bot
- **Tags**: Branch name, SHA, latest
- **Platforms**: linux/amd64, linux/arm64

### Build Process
1. **Checkout code**
2. **Setup Docker Buildx**
3. **Login to Docker Hub**
4. **Extract metadata**
5. **Build and push image**
6. **Cache layers**

## Deployment Process

### Production Deployment
1. **Create backup**
2. **Deploy to production server**
3. **Health check**
4. **Notify success/failure**

### Rollback Process
1. **Detect deployment failure**
2. **Rollback to previous version**
3. **Notify rollback**

## Security & Monitoring

### Security
- **Secrets**: Docker Hub credentials, SSH keys
- **Environment protection**: Production environment
- **Access control**: Repository permissions

### Monitoring
- **Health checks**: Application endpoints
- **Notifications**: Slack alerts
- **Logs**: GitHub Actions, server logs

## Best Practices

### 1. Development
```bash
# Always test locally first
npm test
npm run lint

# Use feature branches
git checkout -b feature/new-feature
# ... develop ...
git push origin feature/new-feature
# Create pull request
```

### 2. Deployment
```bash
# Merge to main when ready
git checkout main
git merge feature/new-feature
git push origin main
# → Automatic deployment
```

### 3. Emergency
```bash
# Use manual deployment for hotfixes
# → Skip tests if necessary
# → Monitor deployment closely
# → Have rollback plan ready
```

## Troubleshooting

### Common Issues
1. **Build failures**: Check Dockerfile, dependencies
2. **Deployment failures**: Check server status, logs
3. **Health check failures**: Check application logs

### Debug Commands
```bash
# Check workflow status
# → GitHub Actions → Workflow runs

# Check server status
ssh root@your-server
cd /opt/badminton-bot
./manage.sh status
./manage.sh health-check

# Check logs
./manage.sh logs app
./manage.sh logs nginx
```

## Debug Workflow Issues

### 1. Job bị Skip
```bash
# Kiểm tra điều kiện if của job
# → GitHub Actions → Workflow runs → Job details
# → Xem "Skipped" reason
```

### 2. Dependencies Issues
```bash
# Kiểm tra needs dependencies
# → Build job phải success
# → Build-skip-tests job phải success (nếu skip tests)
```

### 3. Environment Protection
```bash
# Kiểm tra environment protection rules
# → Repository Settings → Environments → production
# → Xem protection rules
```

### 4. Secrets Issues
```bash
# Kiểm tra secrets có đầy đủ
# → Repository Settings → Secrets and variables → Actions
# → Xem các secrets: PRODUCTION_HOST, PRODUCTION_USERNAME, PRODUCTION_PASSWORD
```

### 5. YAML Syntax Issues
```bash
# Kiểm tra cú pháp YAML
# → GitHub Actions → Workflow runs → View logs
# → Xem lỗi cú pháp nếu có

# Common YAML syntax errors:
# - Indentation issues
# - Missing quotes
# - Invalid expressions
# - Job name with hyphens
# - Secrets in if conditions
```

### 6. GitHub Actions Expression Issues
```bash
# Lỗi thường gặp:
# ❌ if: secrets.SLACK_WEBHOOK_URL
# ❌ if: success() && secrets.SLACK_WEBHOOK_URL
# ✅ if: ${{ secrets.SLACK_WEBHOOK_URL }}
# ✅ if: success() && ${{ secrets.SLACK_WEBHOOK_URL }}

# Secrets trong if conditions:
# - Phải sử dụng ${{ }} syntax
# - Không thể sử dụng trực tiếp secrets
# - Cần wrap trong expression
```

### 7. Workflow Validation
```bash
# Test workflow locally
# → Sử dụng act (GitHub Actions locally)
# → Hoặc push small changes để test

# Check workflow syntax
# → GitHub Actions → Workflow runs
# → Xem "Workflow run" status
```

## Liên hệ

Nếu gặp vấn đề:
1. Kiểm tra GitHub Actions logs
2. Xem server status và logs
3. Thử rollback nếu cần
4. Liên hệ support team
