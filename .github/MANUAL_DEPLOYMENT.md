# Manual Deployment Guide

## Tổng quan
Hướng dẫn sử dụng manual deployment từ GitHub Actions workflow với các tùy chọn linh hoạt.

## Cách sử dụng Manual Deployment

### 1. Truy cập GitHub Actions
1. Vào repository trên GitHub
2. Click vào tab "Actions"
3. Chọn workflow "CI/CD Pipeline"
4. Click "Run workflow"

### 2. Cấu hình Deployment Options

#### Environment Selection
- **Production**: Deploy lên môi trường production (chỉ có production)

#### Skip Tests Option
- **Skip tests**: Bỏ qua bước test (chỉ build và deploy)
- **Run tests**: Chạy đầy đủ test suite trước khi deploy

#### Force Deploy Option
- **Force deployment**: Deploy ngay cả khi tests fail
- **Normal deployment**: Chỉ deploy khi tests pass

## Workflow Behavior

### Automatic Deployment (Push Events)
```bash
# Push to main branch  
git push origin main
# → Tự động build Docker và deploy to production
```

### Manual Deployment (Workflow Dispatch)
```bash
# Manual deploy to production
# → Chọn environment: production
# → Skip tests: false (recommended)
# → Force deploy: false

# Emergency deploy (skip tests)
# → Chọn environment: production
# → Skip tests: true
# → Force deploy: true
```

## Deployment Scenarios

### 1. Normal Development Flow
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
# → Automatic build Docker và deploy to production
```

### 2. Hotfix Deployment
```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix
# ... fix critical issue ...

# 2. Manual deploy to production
# → GitHub Actions → Run workflow
# → Environment: production
# → Skip tests: true (for urgent fixes)
# → Force deploy: true
```

### 3. Emergency Rollback
```bash
# 1. Manual rollback
# → GitHub Actions → Run workflow
# → Environment: production
# → Skip tests: true
# → Force deploy: true

# 2. Or use server commands
ssh root@your-server
cd /opt/badminton-bot
./manage.sh quick-rollback
```

## Workflow Jobs

### 1. Test Job
- **Trigger**: Push events, Pull requests, Manual (if skip_tests = false)
- **Purpose**: Run tests, linting, security audit
- **Skip**: When skip_tests = true

### 2. Build Job
- **Trigger**: Push events, Manual (if skip_tests = false)
- **Purpose**: Build Docker image
- **Dependencies**: Test job

### 3. Build Skip Tests Job
- **Trigger**: Manual (if skip_tests = true)
- **Purpose**: Build Docker image without tests
- **Dependencies**: None

### 4. Deploy Production Job
- **Trigger**: Push to main, Manual (environment = production)
- **Purpose**: Deploy to production environment
- **Dependencies**: Build jobs

### 5. Rollback Job
- **Trigger**: Production deployment failure
- **Purpose**: Automatic rollback
- **Dependencies**: None

## Environment Configuration

### Production Environment
- **URL**: https://haominhnguyen.shop
- **Database**: badminton_bot
- **Port**: 3100
- **Auto-deploy**: Push to main branch

## Best Practices

### 1. Development Workflow
```bash
# Always test locally first
npm test
npm run lint

# Use staging for testing
git push origin develop
# → Test on staging environment

# Only merge to main when ready
git checkout main
git merge develop
git push origin main
```

### 2. Emergency Procedures
```bash
# For critical issues
# 1. Manual deploy with skip tests
# 2. Monitor deployment logs
# 3. Verify health checks
# 4. Rollback if needed
```

### 3. Monitoring
```bash
# Check deployment status
# → GitHub Actions → Workflow runs

# Check application health
# → https://haominhnguyen.shop/health
# → https://staging.haominhnguyen.shop/health

# Check server logs
ssh root@your-server
cd /opt/badminton-bot
./manage.sh logs app
```

## Troubleshooting

### 1. Deployment Failures
```bash
# Check workflow logs
# → GitHub Actions → Failed workflow → View logs

# Check server status
ssh root@your-server
cd /opt/badminton-bot
./manage.sh status
./manage.sh health-check
```

### 2. Rollback Issues
```bash
# Manual rollback
ssh root@your-server
cd /opt/badminton-bot
./manage.sh rollback 20240101_120000

# Check available backups
./manage.sh list-backups
```

### 3. Health Check Failures
```bash
# Check application logs
./manage.sh logs app

# Check database logs
./manage.sh logs db

# Check system logs
./manage.sh logs system
```

## Security Considerations

### 1. Manual Deployment
- Requires repository write access
- Environment protection rules apply
- Audit trail in GitHub Actions

### 2. Force Deploy
- Use only for critical fixes
- Monitor deployment closely
- Have rollback plan ready

### 3. Skip Tests
- Use only when necessary
- Verify functionality manually
- Run tests after deployment

## Notifications

### 1. Slack Notifications
- Deployment success/failure
- Rollback notifications
- Health check alerts

### 2. Email Notifications
- Critical deployment failures
- Security alerts
- System warnings

### 3. GitHub Notifications
- Workflow status
- Deployment results
- Error details

## Liên hệ

Nếu gặp vấn đề với manual deployment:
1. Kiểm tra GitHub Actions logs
2. Xem server status và logs
3. Thử rollback nếu cần
4. Liên hệ support team
