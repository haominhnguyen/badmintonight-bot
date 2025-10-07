# Badminton Bot API

Professional REST API for Badminton Bot money management system with enterprise-grade security.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start API server
npm run api

# Development mode
npm run api:dev
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:3101/api-docs
- **Health Check**: http://localhost:3101/health
- **Base URL**: http://localhost:3101/api

## 🔐 Security Features

### ISMS Compliance
- **Helmet.js**: Security headers protection
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Express-validator with sanitization
- **XSS Protection**: Input sanitization and CSP headers
- **SQL Injection Prevention**: Prisma ORM with parameterized queries

### Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'
```

## 🔑 Authentication

### Login
```bash
curl -X POST http://localhost:3101/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "12345"}'
```

### Using JWT Token
```bash
curl -X GET http://localhost:3101/api/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Sessions
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:id` - Get session details

### Admin (Requires Authentication)
- `POST /api/admin/sessions` - Create new session
- `PUT /api/admin/sessions/:id/court` - Update court count
- `PUT /api/admin/sessions/:id/shuttle` - Update shuttle count
- `POST /api/admin/sessions/:id/calculate` - Calculate costs

### Payments
- `GET /api/payments` - Get payments
- `POST /api/payments/:id/mark-paid` - Mark payment as paid

### Statistics
- `GET /api/statistics/overview` - Get overview statistics

## 🛡️ Security Best Practices

### 1. Environment Variables
```bash
# Required security variables
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ADMIN_PASSWORD=strong-password-here
API_PORT=3101
FRONTEND_URL=https://yourdomain.com
```

### 2. Rate Limiting
- **General**: 1000 requests per 15 minutes
- **Sensitive endpoints**: 10 requests per 15 minutes
- **IP-based**: Per IP address tracking

### 3. Input Validation
```javascript
// All inputs are validated and sanitized
body('count').isInt({ min: 1, max: 10 }).withMessage('Invalid count')
body('date').isISO8601().withMessage('Invalid date format')
```

### 4. Error Handling
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "count",
      "message": "Count must be between 1 and 10"
    }
  ]
}
```

## 🔍 Monitoring & Logging

### Health Check
```bash
curl http://localhost:3101/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

### Request Logging
All requests are logged with:
- Method and path
- Response status code
- Response time in milliseconds

## 🚨 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `MISSING_TOKEN` | Access token required | 401 |
| `INVALID_TOKEN` | Invalid or expired token | 403 |
| `INSUFFICIENT_PRIVILEGES` | Admin privileges required | 403 |
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `SESSION_NOT_FOUND` | Session not found | 404 |
| `PAYMENT_NOT_FOUND` | Payment not found | 404 |
| `INTERNAL_ERROR` | Internal server error | 500 |

## 🔧 Development

### Running Tests
```bash
# Install test dependencies
npm install --save-dev jest supertest

# Run tests
npm test
```

### Code Quality
```bash
# Install linting tools
npm install --save-dev eslint prettier

# Lint code
npm run lint

# Format code
npm run format
```

## 🐳 Docker Deployment

### API Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3101
CMD ["npm", "run", "api"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3101:3101"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      - postgres
```

## 📈 Performance

### Optimizations
- **Connection Pooling**: Prisma connection pooling
- **Query Optimization**: Selective field loading
- **Caching**: Response caching for statistics
- **Compression**: Gzip compression enabled

### Monitoring
- **Response Times**: Tracked per endpoint
- **Memory Usage**: Process monitoring
- **Database Queries**: Prisma query logging
- **Error Rates**: Error tracking and alerting

## 🔒 Security Audit Checklist

- [x] Helmet.js security headers
- [x] CORS configuration
- [x] Rate limiting implementation
- [x] JWT authentication
- [x] Input validation and sanitization
- [x] SQL injection prevention
- [x] XSS protection
- [x] Error handling without information leakage
- [x] HTTPS enforcement (in production)
- [x] Environment variable security
- [x] Request logging
- [x] Graceful shutdown handling

## 📞 Support

For security issues or API support:
- **Email**: security@badmintonbot.com
- **Documentation**: http://localhost:3101/api-docs
- **Health Check**: http://localhost:3101/health

---

**⚠️ Security Notice**: This API implements enterprise-grade security measures. Always use HTTPS in production and keep your JWT secrets secure.
