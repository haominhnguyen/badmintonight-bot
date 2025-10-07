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

main() {
    log_info "Force removing nginx completely..."
    
    log_info "Killing ALL nginx processes..."
    sudo pkill -9 nginx || true
    sudo killall -9 nginx || true
    sleep 3
    
    log_info "Stopping nginx service..."
    sudo systemctl stop nginx || true
    sudo systemctl disable nginx || true
    
    log_info "Removing nginx from systemd..."
    sudo systemctl reset-failed nginx || true
    sudo systemctl daemon-reload
    
    log_info "Force removing nginx packages..."
    sudo apt-get remove --purge nginx nginx-common nginx-core nginx-full nginx-light nginx-extras -y || true
    sudo apt-get autoremove --purge -y || true
    
    log_info "Force removing nginx directories..."
    sudo rm -rf /etc/nginx/ || true
    sudo rm -rf /var/log/nginx/ || true
    sudo rm -rf /var/www/ || true
    sudo rm -rf /etc/letsencrypt/ || true
    sudo rm -rf /var/cache/nginx/ || true
    sudo rm -rf /var/lib/nginx/ || true
    
    log_info "Force removing nginx user and group..."
    sudo userdel -f nginx || true
    sudo groupdel -f nginx || true
    
    log_info "Force removing nginx systemd files..."
    sudo rm -f /lib/systemd/system/nginx.service || true
    sudo rm -f /etc/systemd/system/nginx.service || true
    sudo rm -f /etc/init.d/nginx || true
    sudo rm -f /etc/rc*.d/*nginx || true
    
    log_info "Force removing nginx binaries..."
    sudo rm -f /usr/sbin/nginx || true
    sudo rm -f /usr/bin/nginx || true
    sudo rm -f /usr/local/bin/nginx || true
    
    log_info "Force removing nginx config files..."
    sudo find /etc -name "*nginx*" -type f -delete || true
    sudo find /etc -name "*nginx*" -type d -exec rm -rf {} + || true
    
    log_info "Cleaning up package cache..."
    sudo apt-get clean || true
    sudo apt-get autoclean || true
    
    log_info "Checking if nginx is completely removed..."
    
    if command -v nginx >/dev/null 2>&1; then
        log_error "Nginx command still exists!"
        which nginx
    else
        log_success "Nginx command removed"
    fi
    
    if sudo systemctl is-active nginx >/dev/null 2>&1; then
        log_error "Nginx service still active!"
        sudo systemctl status nginx
    else
        log_success "Nginx service removed"
    fi
    
    if pgrep nginx >/dev/null 2>&1; then
        log_error "Nginx processes still running!"
        ps aux | grep nginx
    else
        log_success "No nginx processes running"
    fi
    
    if [[ -d "/etc/nginx" ]]; then
        log_error "Nginx config directory still exists!"
        sudo ls -la /etc/nginx/
    else
        log_success "Nginx config directory removed"
    fi
    
    log_info "Checking port bindings..."
    echo "Port 80:"
    sudo netstat -tlnp | grep :80 || echo "Port 80 is free"
    
    echo "Port 443:"
    sudo netstat -tlnp | grep :443 || echo "Port 443 is free"
    
    log_info "Checking nginx packages..."
    if dpkg -l | grep nginx; then
        log_error "Nginx packages still installed!"
        dpkg -l | grep nginx
    else
        log_success "No nginx packages installed"
    fi
    
    log_info "Final cleanup..."
    sudo apt-get update || true
    sudo apt-get autoremove -y || true
    
    log_success "Nginx force removed completely!"
}

main "$@"
