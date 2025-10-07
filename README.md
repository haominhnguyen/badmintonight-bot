# Badminton Bot

A Telegram bot for managing badminton court bookings and sessions.

## Features

- Court booking management
- Session scheduling
- User management
- Payment tracking
- Statistics and reporting

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **SSL**: Cloudflare

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- PostgreSQL 15+

### Development

```bash
# Clone repository
git clone <repository-url>
cd badminton-bot

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your configuration

# Start development
npm run dev
```

### Production Deployment

```bash
# Deploy to production
sudo ./deploy.sh
```

## Configuration

### Environment Variables

Create `.env` file with:

```env
# Database
POSTGRES_PASSWORD=your_password
DATABASE_URL=postgresql://user:password@postgres:5432/badminton_bot

# Application
NODE_ENV=production
PORT=3100

# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
WEBHOOK_URL=https://yourdomain.com/webhook

# API Configuration
API_BASE_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
```

### Cloudflare Setup

1. **Add your domain to Cloudflare**
2. **Update DNS records to point to your server IP**
3. **Enable proxy (Orange cloud)**
4. **Set SSL mode to "Full (strict)"**
5. **Enable "Always Use HTTPS"**

#### **Universal Certificate Setup:**

1. **Add TXT records for certificate validation:**
   ```bash
   # Run setup script
   chmod +x setup-cloudflare-dns.sh
   ./setup-cloudflare-dns.sh
   ```

2. **Add these TXT records in Cloudflare Dashboard:**
   ```
   Record 1:
   Type: TXT
   Name: _acme-challenge.haominhnguyen.shop
   Content: usEnvqo8vxGxhbjPz0TmEcxXmCjPD9rTLflbaSvc4mc
   
   Record 2:
   Type: TXT
   Name: _acme-challenge.haominhnguyen.shop
   Content: -NKvGZr3GQU1ulZktMF1RPRxILL4HQrWjmKlbslgu5Y
   ```

3. **Verify DNS records:**
   ```bash
   chmod +x verify-cloudflare-dns.sh
   ./verify-cloudflare-dns.sh
   ```

4. **Test HTTPS connectivity:**
   ```bash
   chmod +x test-https-connectivity.sh
   ./test-https-connectivity.sh
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /webhook` - Telegram webhook
- `GET /api/` - API endpoints

## Scripts

- `deploy.sh` - Complete deployment
- `fix-all-permissions.sh` - Fix file permissions
- `fix-logs-permissions.sh` - Fix logs permissions
- `setup-nginx.sh` - Setup nginx configuration
- `check-containers.sh` - Check container status
- `manage.sh` - Container management

## Docker Services

- **app**: Main application (Node.js)
- **postgres**: Database (PostgreSQL)
- **nginx**: Reverse proxy (Nginx)

## CI/CD

Automated deployment via GitHub Actions:
- Runs on push to `main` branch
- Builds Docker images
- Deploys to production server
- Runs database migrations
- Tests connectivity
- **Gmail notifications** for deployment status

### Gmail Notifications Setup

1. **Enable 2FA** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → App passwords
   - Select "Mail" → "Other (Custom name)"
   - Enter "GitHub Actions"
   - Copy the 16-character password

3. **Add GitHub Secrets**:
   - `GMAIL_USERNAME`: `haonmdotdev@gmail.com`
   - `GMAIL_APP_PASSWORD`: `[your 16-character app password]`

4. **Test Notifications**:
   ```bash
   # Run setup script
   chmod +x setup-gmail-secrets.sh
   ./setup-gmail-secrets.sh
   
   # Test notifications
   chmod +x test-gmail-notification.sh
   ./test-gmail-notification.sh
   ```

**Notification Types:**
- ✅ **Deployment Success**: Email when deployment completes
- ❌ **Deployment Failure**: Email when deployment fails
- ⚠️ **Rollback**: Email when rollback is executed

## License

MIT License