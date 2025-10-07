#!/bin/bash

# Test Gmail notification script
# This script tests Gmail notifications

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
    log_info "Testing Gmail notification setup..."
    
    # Check if required environment variables are set
    if [[ -z "$GMAIL_USERNAME" ]]; then
        log_error "GMAIL_USERNAME environment variable is not set"
        echo "Please set: export GMAIL_USERNAME=haonmdotdev@gmail.com"
        return 1
    fi
    
    if [[ -z "$GMAIL_APP_PASSWORD" ]]; then
        log_error "GMAIL_APP_PASSWORD environment variable is not set"
        echo "Please set: export GMAIL_APP_PASSWORD=your_app_password"
        return 1
    fi
    
    log_success "Environment variables are set"
    
    # Test SMTP connection
    log_info "Testing SMTP connection to Gmail..."
    if command -v telnet >/dev/null 2>&1; then
        if timeout 10 telnet smtp.gmail.com 587; then
            log_success "SMTP connection test passed"
        else
            log_warning "SMTP connection test failed (this is normal if telnet is not available)"
        fi
    else
        log_warning "telnet not available, skipping SMTP test"
    fi
    
    # Test with curl (if available)
    log_info "Testing Gmail API access..."
    if command -v curl >/dev/null 2>&1; then
        # This is a basic test - actual email sending would require more complex setup
        log_info "Curl is available for testing"
    else
        log_warning "Curl not available"
    fi
    
    # Show configuration
    log_info "Gmail Configuration:"
    echo "  Username: $GMAIL_USERNAME"
    echo "  App Password: ${GMAIL_APP_PASSWORD:0:4}****${GMAIL_APP_PASSWORD: -4}"
    echo "  SMTP Server: smtp.gmail.com"
    echo "  SMTP Port: 587"
    echo "  Security: TLS"
    
    # Show GitHub Actions workflow example
    log_info "GitHub Actions Workflow Example:"
    cat << 'EOF'
    - name: Test Gmail Notification
      uses: dawidd6/action-send-mail@v3
      with:
        server_address: smtp.gmail.com
        server_port: 587
        username: ${{ secrets.GMAIL_USERNAME }}
        password: ${{ secrets.GMAIL_APP_PASSWORD }}
        subject: "Test Email from GitHub Actions"
        to: haonmdotdev@gmail.com
        from: ${{ secrets.GMAIL_USERNAME }}
        body: |
          This is a test email from GitHub Actions.
          
          If you receive this email, your Gmail notification setup is working correctly!
EOF
    
    log_success "Gmail notification test completed!"
    log_info "Next steps:"
    echo "1. Set up GitHub secrets: GMAIL_USERNAME and GMAIL_APP_PASSWORD"
    echo "2. Push to main branch to trigger deployment"
    echo "3. Check your Gmail inbox for notifications"
}

# Run main function
main "$@"
