#!/bin/bash

# Clear Cloudflare cache script
# This script provides instructions to clear Cloudflare cache

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
    log_info "Cloudflare cache clearing instructions..."
    
    echo "=========================================="
    echo "CLOUDFLARE CACHE CLEARING INSTRUCTIONS"
    echo "=========================================="
    echo ""
    echo "1. Go to Cloudflare Dashboard:"
    echo "   https://dash.cloudflare.com"
    echo ""
    echo "2. Select your domain: haominhnguyen.shop"
    echo ""
    echo "3. Go to Caching tab"
    echo ""
    echo "4. Click 'Purge Everything'"
    echo ""
    echo "5. Or use API to clear cache:"
    echo "   curl -X POST \"https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache\" \\"
    echo "        -H \"Authorization: Bearer YOUR_API_TOKEN\" \\"
    echo "        -H \"Content-Type: application/json\" \\"
    echo "        --data '{\"purge_everything\":true}'"
    echo ""
    echo "6. Wait 1-2 minutes for cache to clear"
    echo ""
    echo "7. Test your domain:"
    echo "   curl -v https://haominhnguyen.shop/health"
    echo ""
    echo "=========================================="
    
    log_success "Cloudflare cache clearing instructions provided!"
}

# Run main function
main "$@"
