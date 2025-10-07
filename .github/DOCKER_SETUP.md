# Docker Hub Setup cho CI/CD

## Tổng quan
Hướng dẫn cấu hình Docker Hub để sử dụng với GitHub Actions CI/CD pipeline.

## Lỗi gặp phải
```
ERROR: failed to build: failed to solve: failed to push ghcr.io/haominhnguyen/badmintonight-bot:develop: denied: installation not allowed to Create organization package
```

**Nguyên nhân**: GitHub Container Registry (GHCR) không cho phép tạo package cho organization mà không có quyền phù hợp.

**Giải pháp**: Sử dụng Docker Hub thay vì GHCR.

## Cấu hình Docker Hub

### Bước 1: Tạo Docker Hub Account
1. Truy cập https://hub.docker.com
2. Tạo account mới hoặc đăng nhập
3. Tạo repository: `haominhnguyen/badmintonight-bot`

### Bước 2: Tạo Access Token
1. Vào Docker Hub → Account Settings
2. Security → New Access Token
3. Tạo token với quyền "Read, Write, Delete"
4. Lưu token lại

### Bước 3: Cấu hình GitHub Secrets
Vào repository GitHub → Settings → Secrets and variables → Actions

Thêm các secrets sau:
```
DOCKER_USERNAME=haominhnguyen
DOCKER_PASSWORD=your_docker_hub_access_token
```

## Cấu hình Repository

### Docker Hub Repository Settings
1. Vào https://hub.docker.com/r/haominhnguyen/badmintonight-bot
2. Settings → Builds
3. Connect to GitHub repository
4. Enable automated builds

### GitHub Repository Settings
1. Vào repository GitHub
2. Settings → Secrets and variables → Actions
3. Thêm secrets:
   - `DOCKER_USERNAME`: Username Docker Hub
   - `DOCKER_PASSWORD`: Access token Docker Hub

## Workflow Configuration

### Dockerfile đã được sửa
```dockerfile
# Health check (JSON format)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3100/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]

# Run migration deploy and start app (JSON format)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

### GitHub Actions Workflow
```yaml
env:
  NODE_VERSION: '20'
  DOCKER_REGISTRY: docker.io
  IMAGE_NAME: haominhnguyen/badmintonight-bot

# Login to Docker Hub
- name: Log in to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

## Testing

### Test Docker Build Locally
```bash
# Build image
docker build -t haominhnguyen/badmintonight-bot:test .

# Test image
docker run -p 3100:3100 haominhnguyen/badmintonight-bot:test

# Push to Docker Hub
docker login
docker push haominhnguyen/badmintonight-bot:test
```

### Test GitHub Actions
1. Push code lên GitHub
2. Vào Actions tab
3. Xem workflow "CI/CD Pipeline"
4. Kiểm tra build và push

## Troubleshooting

### Lỗi Authentication
```
Error: failed to solve: failed to push docker.io/haominhnguyen/badmintonight-bot:develop: denied: requested access to the resource is denied
```

**Giải pháp**:
1. Kiểm tra Docker Hub credentials
2. Đảm bảo repository tồn tại
3. Kiểm tra access token permissions

### Lỗi JSONArgsRecommended
```
JSONArgsRecommended: JSON arguments recommended for CMD to prevent unintended behavior related to OS signals
```

**Giải pháp**: Đã sửa trong Dockerfile:
```dockerfile
# Thay vì
CMD npx prisma migrate deploy && npm start

# Sử dụng
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

### Lỗi Multi-platform Build
```
ERROR: failed to solve: failed to push docker.io/haominhnguyen/badmintonight-bot:develop: denied: installation not allowed to Create organization package
```

**Giải pháp**:
1. Sử dụng Docker Hub thay vì GHCR
2. Cấu hình đúng credentials
3. Kiểm tra repository permissions

## Alternative: Sử dụng GHCR

Nếu muốn sử dụng GHCR, cần:

### 1. Cấu hình Organization Settings
```bash
# Vào GitHub Organization Settings
# Packages → Package creation
# Cho phép "Any member" tạo packages
```

### 2. Cấu hình Repository Permissions
```bash
# Repository Settings → Actions → General
# Workflow permissions → "Read and write permissions"
```

### 3. Sử dụng Personal Access Token
```yaml
- name: Log in to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

## Best Practices

### 1. Security
- Sử dụng Access Token thay vì password
- Rotate tokens định kỳ
- Giới hạn permissions

### 2. Performance
- Sử dụng multi-stage builds
- Cache layers
- Optimize image size

### 3. Monitoring
- Monitor build times
- Check image vulnerabilities
- Track usage

## Liên hệ

Nếu gặp vấn đề:
1. Kiểm tra Docker Hub credentials
2. Xem GitHub Actions logs
3. Test build locally
4. Kiểm tra repository permissions
