#!/bin/bash

# Script to check CI/CD configuration and fix deployment issues
# Usage: ./scripts/check-cicd.sh

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

# Check GitHub Actions workflow
check_github_workflow() {
    log "🔍 Checking GitHub Actions workflow..."
    
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        log "✅ CI/CD workflow file exists"
        
        # Check if version update step exists
        if grep -q "Update version metadata" .github/workflows/ci-cd.yml; then
            log "✅ Version metadata update step exists"
        else
            warn "⚠️  Version metadata update step missing"
        fi
        
        # Check if version check step exists
        if grep -q "Version check production" .github/workflows/ci-cd.yml; then
            log "✅ Version check step exists"
        else
            warn "⚠️  Version check step missing"
        fi
        
        # Check if Docker build uses correct dockerfile
        if grep -q "dockerfile: Dockerfile.arm64" .github/workflows/ci-cd.yml; then
            log "✅ Docker build uses Dockerfile.arm64"
        else
            warn "⚠️  Docker build may not use correct dockerfile"
        fi
        
    else
        error "❌ CI/CD workflow file not found"
        exit 1
    fi
}

# Check Docker configuration
check_docker_config() {
    log "🔍 Checking Docker configuration..."
    
    # Check if Dockerfile.arm64 exists and has public copy
    if [ -f "Dockerfile.arm64" ]; then
        if grep -q "COPY public ./public" Dockerfile.arm64; then
            log "✅ Dockerfile.arm64 includes public directory"
        else
            error "❌ Dockerfile.arm64 missing public directory copy"
        fi
    else
        error "❌ Dockerfile.arm64 not found"
    fi
    
    # Check docker-compose.prod.yml
    if [ -f "docker-compose.prod.yml" ]; then
        if grep -q "dockerfile: Dockerfile.arm64" docker-compose.prod.yml; then
            log "✅ docker-compose.prod.yml uses Dockerfile.arm64"
        else
            error "❌ docker-compose.prod.yml not using Dockerfile.arm64"
        fi
    else
        error "❌ docker-compose.prod.yml not found"
    fi
}

# Check version API
check_version_api() {
    log "🔍 Checking version API..."
    
    if [ -f "src/api/v1/version.js" ]; then
        log "✅ Version API file exists"
        
        # Check if version.js is included in index.js
        if grep -q "versionRoutes" src/api/v1/index.js; then
            log "✅ Version routes are registered"
        else
            error "❌ Version routes not registered in index.js"
        fi
    else
        error "❌ Version API file not found"
    fi
}

# Check HTML files
check_html_files() {
    log "🔍 Checking HTML files..."
    
    local html_files=(
        "public/index.html"
        "public/admin.html"
        "public/login.html"
        "public/session.html"
    )
    
    for file in "${html_files[@]}"; do
        if [ -f "$file" ]; then
            if grep -q 'meta name="version"' "$file"; then
                log "✅ $file has version metadata"
            else
                warn "⚠️  $file missing version metadata"
            fi
        else
            warn "⚠️  $file not found"
        fi
    done
}

# Check scripts
check_scripts() {
    log "🔍 Checking deployment scripts..."
    
    local scripts=(
        "scripts/update-version.js"
        "scripts/check-version.js"
        "scripts/fix-deployment.sh"
        "scripts/check-docker-build.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            log "✅ $script exists"
            if [ -x "$script" ]; then
                log "✅ $script is executable"
            else
                warn "⚠️  $script is not executable"
            fi
        else
            error "❌ $script not found"
        fi
    done
}

# Check package.json scripts
check_package_scripts() {
    log "🔍 Checking package.json scripts..."
    
    if [ -f "package.json" ]; then
        local required_scripts=(
            "version:update"
            "version:check"
            "docker:check"
            "deploy:fix"
        )
        
        for script in "${required_scripts[@]}"; do
            if grep -q "\"$script\"" package.json; then
                log "✅ $script script exists"
            else
                error "❌ $script script missing from package.json"
            fi
        done
    else
        error "❌ package.json not found"
    fi
}

# Generate deployment report
generate_report() {
    log "📊 Generating deployment report..."
    
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
Badminton Bot Deployment Report
Generated: $(date)
================================

Docker Configuration:
- Dockerfile.arm64: $(grep -c "COPY public" Dockerfile.arm64 2>/dev/null || echo "0") public copy commands
- docker-compose.prod.yml: $(grep -c "dockerfile: Dockerfile.arm64" docker-compose.prod.yml 2>/dev/null || echo "0") dockerfile references

Version API:
- Version API file: $(test -f src/api/v1/version.js && echo "✅ Exists" || echo "❌ Missing")
- Version routes: $(grep -c "versionRoutes" src/api/v1/index.js 2>/dev/null || echo "0") registrations

HTML Files:
- index.html: $(grep -c 'meta name="version"' public/index.html 2>/dev/null || echo "0") version meta tags
- admin.html: $(grep -c 'meta name="version"' public/admin.html 2>/dev/null || echo "0") version meta tags

Scripts:
- update-version.js: $(test -f scripts/update-version.js && echo "✅ Exists" || echo "❌ Missing")
- check-version.js: $(test -f scripts/check-version.js && echo "✅ Exists" || echo "❌ Missing")
- fix-deployment.sh: $(test -f scripts/fix-deployment.sh && echo "✅ Exists" || echo "❌ Missing")

CI/CD Workflow:
- Version update step: $(grep -c "Update version metadata" .github/workflows/ci-cd.yml 2>/dev/null || echo "0") occurrences
- Version check step: $(grep -c "Version check production" .github/workflows/ci-cd.yml 2>/dev/null || echo "0") occurrences

Recommendations:
1. Ensure Dockerfile.arm64 includes: COPY public ./public
2. Ensure docker-compose.prod.yml uses: dockerfile: Dockerfile.arm64
3. Run: npm run docker:check to verify Docker build
4. Run: npm run deploy:fix to fix deployment issues
5. Check CI/CD logs for deployment status

EOF

    log "📄 Report generated: $report_file"
}

# Main function
main() {
    log "🚀 Starting CI/CD configuration check..."
    
    check_github_workflow
    check_docker_config
    check_version_api
    check_html_files
    check_scripts
    check_package_scripts
    generate_report
    
    log "✅ CI/CD configuration check completed!"
    log "📋 Check the generated report for details"
    log "🔧 Run 'npm run docker:check' to verify Docker build"
    log "🔧 Run 'npm run deploy:fix' to fix deployment issues"
}

# Run main function
main "$@"
