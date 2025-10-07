#!/bin/bash

# Setup Gmail secrets script
# This script helps setup Gmail secrets for GitHub Actions

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
    log_info "Setting up Gmail secrets for GitHub Actions..."
    
    echo "=========================================="
    echo "GMAIL SECRETS SETUP INSTRUCTIONS"
    echo "=========================================="
    echo ""
    echo "1. Go to your GitHub repository"
    echo "2. Click 'Settings' → 'Secrets and variables' → 'Actions'"
    echo "3. Click 'New repository secret'"
    echo ""
    echo "Add these secrets:"
    echo ""
    echo "Secret Name: GMAIL_USERNAME"
    echo "Secret Value: haonmdotdev@gmail.com"
    echo ""
    echo "Secret Name: GMAIL_APP_PASSWORD"
    echo "Secret Value: [Your 16-character app password]"
    echo ""
    echo "=========================================="
    echo "GMAIL APP PASSWORD SETUP"
    echo "=========================================="
    echo ""
    echo "1. Go to Google Account Settings:"
    echo "   https://myaccount.google.com/"
    echo ""
    echo "2. Click 'Security' → '2-Step Verification'"
    echo "   (Enable if not already enabled)"
    echo ""
    echo "3. Click 'App passwords'"
    echo "   (Only available after enabling 2FA)"
    echo ""
    echo "4. Select 'Mail' and 'Other (Custom name)'"
    echo "5. Enter 'GitHub Actions' as the name"
    echo "6. Click 'Generate'"
    echo "7. Copy the 16-character password"
    echo ""
    echo "=========================================="
    echo "TESTING INSTRUCTIONS"
    echo "=========================================="
    echo ""
    echo "1. After setting up secrets, push to main branch:"
    echo "   git add ."
    echo "   git commit -m 'feat: add Gmail notifications'"
    echo "   git push origin main"
    echo ""
    echo "2. Check GitHub Actions workflow"
    echo "3. Check your Gmail inbox for notifications"
    echo ""
    echo "=========================================="
    echo "TROUBLESHOOTING"
    echo "=========================================="
    echo ""
    echo "If notifications don't work:"
    echo "1. Check GitHub Actions logs for errors"
    echo "2. Verify secrets are set correctly"
    echo "3. Check if 2FA is enabled on Gmail"
    echo "4. Verify app password is correct"
    echo "5. Check spam folder in Gmail"
    echo ""
    
    log_success "Gmail secrets setup instructions provided!"
}

# Run main function
main "$@"
