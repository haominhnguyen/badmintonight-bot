#!/bin/bash

# Fix all executable permissions script
# This script sets executable permissions for all scripts and directories

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main function
main() {
    log_info "Starting executable permissions fix..."
    
    # Set executable permissions for all .sh files
    log_info "Setting executable permissions for all .sh files..."
    find . -name "*.sh" -type f -exec chmod +x {} \;
    log_success "All .sh files made executable"
    
    # Set executable permissions for all directories
    log_info "Setting executable permissions for all directories..."
    find . -type d -exec chmod +x {} \;
    log_success "All directories made executable"
    
    # Set executable permissions for specific files
    log_info "Setting executable permissions for specific files..."
    
    # Make package.json scripts executable (if any)
    if [[ -f "package.json" ]]; then
        chmod +x package.json
    fi
    
    # Make Docker files executable
    if [[ -f "Dockerfile" ]]; then
        chmod +x Dockerfile
    fi
    
    if [[ -f "Dockerfile.api" ]]; then
        chmod +x Dockerfile.api
    fi
    
    if [[ -f "Dockerfile.arm64" ]]; then
        chmod +x Dockerfile.arm64
    fi
    
    # Make docker-compose files executable
    find . -name "docker-compose*.yml" -type f -exec chmod +x {} \;
    
    # Make nginx config executable
    if [[ -f "nginx.conf" ]]; then
        chmod +x nginx.conf
    fi
    
    # Make env files executable
    if [[ -f ".env" ]]; then
        chmod +x .env
    fi
    
    if [[ -f "env.example" ]]; then
        chmod +x env.example
    fi
    
    # Make JSON files executable
    find . -name "*.json" -type f -exec chmod +x {} \;
    
    # Make YAML files executable
    find . -name "*.yml" -type f -exec chmod +x {} \;
    find . -name "*.yaml" -type f -exec chmod +x {} \;
    
    # Make markdown files executable
    find . -name "*.md" -type f -exec chmod +x {} \;
    
    # Make JavaScript files executable
    find . -name "*.js" -type f -exec chmod +x {} \;
    
    # Make TypeScript files executable
    find . -name "*.ts" -type f -exec chmod +x {} \;
    
    # Make CSS files executable
    find . -name "*.css" -type f -exec chmod +x {} \;
    
    # Make HTML files executable
    find . -name "*.html" -type f -exec chmod +x {} \;
    
    # Make SQL files executable
    find . -name "*.sql" -type f -exec chmod +x {} \;
    
    # Make Prisma files executable
    find . -name "*.prisma" -type f -exec chmod +x {} \;
    
    # Make all files in src directory executable
    if [[ -d "src" ]]; then
        find src -type f -exec chmod +x {} \;
        log_success "All files in src directory made executable"
    fi
    
    # Make all files in public directory executable
    if [[ -d "public" ]]; then
        find public -type f -exec chmod +x {} \;
        log_success "All files in public directory made executable"
    fi
    
    # Make all files in tests directory executable
    if [[ -d "tests" ]]; then
        find tests -type f -exec chmod +x {} \;
        log_success "All files in tests directory made executable"
    fi
    
    # Make all files in scripts directory executable
    if [[ -d "scripts" ]]; then
        find scripts -type f -exec chmod +x {} \;
        log_success "All files in scripts directory made executable"
    fi
    
    # Make all files in .github directory executable
    if [[ -d ".github" ]]; then
        find .github -type f -exec chmod +x {} \;
        log_success "All files in .github directory made executable"
    fi
    
    # Make all files in prisma directory executable
    if [[ -d "prisma" ]]; then
        find prisma -type f -exec chmod +x {} \;
        log_success "All files in prisma directory made executable"
    fi
    
    # Make all files in security directory executable
    if [[ -d "security" ]]; then
        find security -type f -exec chmod +x {} \;
        log_success "All files in security directory made executable"
    fi
    
    log_success "All executable permissions fixed!"
    
    # Show summary
    log_info "Summary of executable files:"
    echo "Scripts (.sh): $(find . -name "*.sh" -type f | wc -l)"
    echo "Directories: $(find . -type d | wc -l)"
    echo "Total files made executable: $(find . -type f -executable | wc -l)"
}

# Run main function
main "$@"
