# PowerShell script for Windows deployment
# restart-containers.ps1

param(
    [switch]$Force
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Info {
    param([string]$Message)
    Write-Host "${Blue}[INFO]${Reset} $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${Green}[SUCCESS]${Reset} $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}[WARNING]${Reset} $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}[ERROR]${Reset} $Message"
}

function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-Endpoint {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

# Main execution
Write-Info "Starting Windows PowerShell deployment..."

# Check Docker
if (-not (Test-DockerRunning)) {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit 1
}

Write-Success "Docker is running"

# Stop existing containers
Write-Info "Stopping existing containers..."
try {
    docker-compose -f docker-compose.prod.yml down
    Write-Success "Containers stopped"
}
catch {
    Write-Warning "Could not stop containers: $($_.Exception.Message)"
}

# Remove old containers
Write-Info "Cleaning up old containers..."
try {
    docker rm -f badminton-nginx badminton-nginx-prod 2>$null
    Write-Success "Old containers removed"
}
catch {
    Write-Warning "Could not remove old containers"
}

# Create directories
Write-Info "Creating necessary directories..."
New-Item -ItemType Directory -Force -Path "nginx" | Out-Null
New-Item -ItemType Directory -Force -Path "logs\nginx" | Out-Null

# Copy nginx config
if (-not (Test-Path "nginx\nginx.conf") -and (Test-Path "nginx.conf")) {
    Write-Info "Copying nginx configuration..."
    Copy-Item "nginx.conf" "nginx\nginx.conf"
    Write-Success "Nginx config copied"
}

# Start services
Write-Info "Starting services..."
try {
    docker-compose -f docker-compose.prod.yml up -d
    Write-Success "Services started"
}
catch {
    Write-Error "Failed to start services: $($_.Exception.Message)"
    exit 1
}

# Wait for services
Write-Info "Waiting for services to start..."
Start-Sleep -Seconds 30

# Check container status
Write-Info "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test connectivity
Write-Info "Testing connectivity..."

# Test app container
if (Test-Endpoint "http://localhost:3100/health") {
    Write-Success "✓ App container responding on port 3100"
}
else {
    Write-Warning "⚠ App container not responding on port 3100"
}

# Test nginx proxy
if (Test-Endpoint "http://localhost/api/v1/version") {
    Write-Success "✓ API accessible via nginx proxy"
}
else {
    Write-Warning "⚠ API not accessible via nginx proxy"
}

# Test API docs
if (Test-Endpoint "http://localhost/api-docs") {
    Write-Success "✓ API docs accessible"
}
else {
    Write-Warning "⚠ API docs not accessible"
}

Write-Success "Deployment completed!"
Write-Info "You can now access:"
Write-Info "  - API Docs: http://localhost/api-docs"
Write-Info "  - API Version: http://localhost/api/v1/version"
Write-Info "  - Health Check: http://localhost/health"
