#!/bin/bash

# Script to fix deployment issues and ensure latest version is deployed
# Usage: ./scripts/fix-deployment.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    log "✅ Project directory confirmed"
}

# Update version metadata
update_version_metadata() {
    log "🔄 Updating version metadata..."
    
    if [ -f "scripts/update-version.js" ]; then
        node scripts/update-version.js
        log "✅ Version metadata updated"
    else
        warn "Version update script not found, skipping..."
    fi
}

# Check Docker images
check_docker_images() {
    log "🔍 Checking Docker images..."
    
    # List all images
    info "Current Docker images:"
    docker images | grep badminton || echo "No badminton images found"
    
    # Check if containers are running
    info "Running containers:"
    docker ps | grep badminton || echo "No badminton containers running"
}

# Force rebuild and redeploy
force_rebuild() {
    log "🔨 Force rebuilding and redeploying..."
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down || true
    
    # Remove old images
    log "Removing old images..."
    docker rmi $(docker images | grep badminton | awk '{print $3}') 2>/dev/null || true
    
    # Build new images
    log "Building new images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check health
    log "Checking service health..."
    docker-compose -f docker-compose.prod.yml ps
}

# Verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."
    
    # Check if services are running
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log "✅ Services are running"
    else
        error "❌ Services are not running"
        return 1
    fi
    
    # Check version API
    log "Checking version API..."
    sleep 10
    
    if curl -f -s http://localhost:3100/api/v1/version >/dev/null 2>&1; then
        log "✅ Version API is accessible"
        
        # Get version info
        VERSION_INFO=$(curl -s http://localhost:3100/api/v1/version)
        echo "Version Info: $VERSION_INFO"
    else
        warn "⚠️  Version API not accessible"
    fi
    
    # Check main page
    if curl -f -s http://localhost:3100 >/dev/null 2>&1; then
        log "✅ Main application is accessible"
    else
        error "❌ Main application not accessible"
    fi
}

# Clean up old images
cleanup_old_images() {
    log "🧹 Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused images
    docker image prune -a -f --filter "until=24h" || true
    
    log "✅ Cleanup completed"
}

# Main function
main() {
    log "🚀 Starting deployment fix process..."
    
    check_directory
    update_version_metadata
    check_docker_images
    force_rebuild
    verify_deployment
    cleanup_old_images
    
    log "✅ Deployment fix process completed!"
    log "🌐 Application should be accessible at: http://localhost:3100"
    log "📊 Version API: http://localhost:3100/api/v1/version"
}

# Run main function
main "$@"
