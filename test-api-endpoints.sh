#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

test_endpoint() {
    local url=$1
    local description=$2
    
    log_info "Testing $description: $url"
    
    if curl -f -s -o /dev/null "$url"; then
        log_success "$description is accessible"
        return 0
    else
        log_warning "$description is not accessible"
        curl -v "$url" 2>&1 | head -10
        return 1
    fi
}

main() {
    log_info "Testing API endpoints..."
    
    # Test basic health endpoint
    test_endpoint "http://localhost:3100/health" "App Health (Direct)"
    test_endpoint "http://localhost/health" "App Health (via Nginx)"
    
    # Test API version endpoint
    test_endpoint "http://localhost:3100/api/v1/version" "API Version (Direct)"
    test_endpoint "http://localhost/api/v1/version" "API Version (via Nginx)"
    
    # Test API docs
    test_endpoint "http://localhost:3100/api-docs" "API Docs (Direct)"
    test_endpoint "http://localhost/api-docs" "API Docs (via Nginx)"
    
    # Test API info endpoint
    test_endpoint "http://localhost:3100/api/v1/" "API Info (Direct)"
    test_endpoint "http://localhost/api/v1/" "API Info (via Nginx)"
    
    log_info "API endpoint testing completed!"
}

main "$@"
