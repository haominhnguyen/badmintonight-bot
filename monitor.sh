#!/bin/bash

# Monitoring and Logs Script for Badminton Bot
# Author: Auto-generated monitoring script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/badminton-bot"
LOG_DIR="/var/log/badminton-bot"
MONITOR_LOG="$LOG_DIR/monitor.log"
ALERT_EMAIL="admin@haominhnguyen.shop"
DOMAIN="haominhnguyen.shop"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> $MONITOR_LOG
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> $MONITOR_LOG
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> $MONITOR_LOG
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> $MONITOR_LOG
}

setup_logging() {
    log_info "Setting up logging directory..."
    mkdir -p $LOG_DIR
    touch $MONITOR_LOG
    log_success "Logging directory created: $LOG_DIR"
}

check_containers() {
    log_info "Checking Docker containers..."
    
    local app_running=false
    local db_running=false
    
    # Check if containers are running
    if docker ps | grep -q "badminton-bot-prod"; then
        app_running=true
        log_success "Application container is running"
    else
        log_error "Application container is not running!"
        return 1
    fi
    
    if docker ps | grep -q "badminton-postgres-prod"; then
        db_running=true
        log_success "Database container is running"
    else
        log_error "Database container is not running!"
        return 1
    fi
    
    # Check container health
    local app_health=$(docker inspect --format='{{.State.Health.Status}}' badminton-bot-prod 2>/dev/null || echo "unknown")
    local db_health=$(docker inspect --format='{{.State.Health.Status}}' badminton-postgres-prod 2>/dev/null || echo "unknown")
    
    if [ "$app_health" != "healthy" ] && [ "$app_health" != "unknown" ]; then
        log_warning "Application container health: $app_health"
    fi
    
    if [ "$db_health" != "healthy" ] && [ "$db_health" != "unknown" ]; then
        log_warning "Database container health: $db_health"
    fi
}

check_system_resources() {
    log_info "Checking system resources..."
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        log_warning "High CPU usage: ${cpu_usage}%"
    else
        log_success "CPU usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $memory_usage -gt $MEMORY_THRESHOLD ]; then
        log_warning "High memory usage: ${memory_usage}%"
    else
        log_success "Memory usage: ${memory_usage}%"
    fi
    
    # Disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $disk_usage -gt $DISK_THRESHOLD ]; then
        log_warning "High disk usage: ${disk_usage}%"
    else
        log_success "Disk usage: ${disk_usage}%"
    fi
}

check_application_health() {
    log_info "Checking application health..."
    
    # Check if application responds
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3100/health" 2>/dev/null || echo "0")
    
    if (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        log_warning "Slow response time: ${response_time}s"
    else
        log_success "Response time: ${response_time}s"
    fi
    
    # Check HTTP status
    local http_status=$(curl -o /dev/null -s -w '%{http_code}' "http://localhost:3100/health" 2>/dev/null || echo "000")
    
    if [ "$http_status" = "200" ]; then
        log_success "Application health check: OK"
    else
        log_error "Application health check failed: HTTP $http_status"
        return 1
    fi
}

check_nginx_status() {
    log_info "Checking Nginx status..."
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running!"
        return 1
    fi
    
    # Check Nginx configuration
    if nginx -t >/dev/null 2>&1; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors!"
        return 1
    fi
}

check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    local cert_file="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    
    if [ -f "$cert_file" ]; then
        local cert_expiry=$(openssl x509 -in $cert_file -noout -dates | grep notAfter | cut -d= -f2)
        local cert_expiry_epoch=$(date -d "$cert_expiry" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (cert_expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            log_warning "SSL certificate expires in $days_until_expiry days"
        else
            log_success "SSL certificate valid for $days_until_expiry days"
        fi
    else
        log_error "SSL certificate not found!"
        return 1
    fi
}

check_database_connection() {
    log_info "Checking database connection..."
    
    # Test database connection
    if docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot >/dev/null 2>&1; then
        log_success "Database connection: OK"
    else
        log_error "Database connection failed!"
        return 1
    fi
    
    # Check database size
    local db_size=$(docker exec badminton-postgres-prod psql -U badminton_user -d badminton_bot -t -c "SELECT pg_size_pretty(pg_database_size('badminton_bot'));" 2>/dev/null | xargs)
    log_info "Database size: $db_size"
}

check_log_files() {
    log_info "Checking log files..."
    
    # Check application logs
    if [ -d "$PROJECT_DIR/logs" ]; then
        local log_count=$(find $PROJECT_DIR/logs -name "*.log" | wc -l)
        log_info "Application log files: $log_count"
        
        # Check for errors in recent logs
        local error_count=$(find $PROJECT_DIR/logs -name "*.log" -mtime -1 -exec grep -l "ERROR\|FATAL" {} \; 2>/dev/null | wc -l)
        if [ $error_count -gt 0 ]; then
            log_warning "Found $error_count log files with errors"
        else
            log_success "No recent errors in application logs"
        fi
    else
        log_warning "Application logs directory not found"
    fi
    
    # Check system logs
    local system_errors=$(journalctl --since "1 hour ago" --priority=err --no-pager | wc -l)
    if [ $system_errors -gt 0 ]; then
        log_warning "Found $system_errors system errors in the last hour"
    else
        log_success "No recent system errors"
    fi
}

generate_status_report() {
    log_info "Generating status report..."
    
    local report_file="$LOG_DIR/status_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > $report_file << EOF
Badminton Bot Status Report
==========================
Generated: $(date)
Domain: $DOMAIN

=== SYSTEM INFORMATION ===
OS: $(uname -a)
Uptime: $(uptime)
Load Average: $(cat /proc/loadavg)

=== RESOURCE USAGE ===
CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
Memory Usage: $(free | awk 'NR==2{printf "%.0f%%", $3*100/$2}')
Disk Usage: $(df / | awk 'NR==2 {print $5}')

=== DOCKER CONTAINERS ===
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

=== APPLICATION STATUS ===
Health Check: $(curl -o /dev/null -s -w '%{http_code}' "http://localhost:3100/health" 2>/dev/null || echo "FAILED")
Response Time: $(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3100/health" 2>/dev/null || echo "N/A")s

=== NGINX STATUS ===
Status: $(systemctl is-active nginx)
Configuration: $(nginx -t >/dev/null 2>&1 && echo "VALID" || echo "INVALID")

=== SSL CERTIFICATE ===
Certificate: $(if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then echo "EXISTS"; else echo "MISSING"; fi)
Expiry: $(if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates | grep notAfter | cut -d= -f2; else echo "N/A"; fi)

=== DATABASE STATUS ===
Connection: $(docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot >/dev/null 2>&1 && echo "OK" || echo "FAILED")
Size: $(docker exec badminton-postgres-prod psql -U badminton_user -d badminton_bot -t -c "SELECT pg_size_pretty(pg_database_size('badminton_bot'));" 2>/dev/null | xargs || echo "N/A")

=== RECENT LOGS ===
Application Logs (last 10 lines):
$(tail -n 10 $PROJECT_DIR/logs/*.log 2>/dev/null || echo "No logs found")

System Logs (last 5 errors):
$(journalctl --since "1 hour ago" --priority=err --no-pager | tail -n 5 || echo "No errors found")
EOF
    
    log_success "Status report generated: $report_file"
}

send_alert() {
    local message=$1
    local subject="Badminton Bot Alert - $(date)"
    
    log_warning "Sending alert: $message"
    
    # Send email alert (if mail is configured)
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" $ALERT_EMAIL
        log_info "Alert email sent to $ALERT_EMAIL"
    else
        log_warning "Mail command not available, alert not sent"
    fi
    
    # Log alert
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ALERT] $message" >> $MONITOR_LOG
}

monitor_continuously() {
    log_info "Starting continuous monitoring..."
    
    while true; do
        local alerts=()
        
        # Check containers
        if ! check_containers >/dev/null 2>&1; then
            alerts+=("Container health check failed")
        fi
        
        # Check system resources
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
        if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
            alerts+=("High CPU usage: ${cpu_usage}%")
        fi
        
        local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ $memory_usage -gt $MEMORY_THRESHOLD ]; then
            alerts+=("High memory usage: ${memory_usage}%")
        fi
        
        local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
        if [ $disk_usage -gt $DISK_THRESHOLD ]; then
            alerts+=("High disk usage: ${disk_usage}%")
        fi
        
        # Check application health
        local http_status=$(curl -o /dev/null -s -w '%{http_code}' "http://localhost:3100/health" 2>/dev/null || echo "000")
        if [ "$http_status" != "200" ]; then
            alerts+=("Application health check failed: HTTP $http_status")
        fi
        
        # Send alerts if any
        if [ ${#alerts[@]} -gt 0 ]; then
            for alert in "${alerts[@]}"; do
                send_alert "$alert"
            done
        fi
        
        # Wait before next check
        sleep 300  # 5 minutes
    done
}

show_logs() {
    local service=$1
    local lines=${2:-50}
    
    case $service in
        app)
            log_info "Showing application logs (last $lines lines)..."
            docker logs --tail $lines badminton-bot-prod
            ;;
        db)
            log_info "Showing database logs (last $lines lines)..."
            docker logs --tail $lines badminton-postgres-prod
            ;;
        nginx)
            log_info "Showing Nginx logs (last $lines lines)..."
            tail -n $lines /var/log/nginx/access.log
            tail -n $lines /var/log/nginx/error.log
            ;;
        system)
            log_info "Showing system logs (last $lines lines)..."
            journalctl --no-pager -n $lines
            ;;
        monitor)
            log_info "Showing monitor logs (last $lines lines)..."
            tail -n $lines $MONITOR_LOG
            ;;
        *)
            echo "Usage: $0 logs {app|db|nginx|system|monitor} [lines]"
            echo "Available services: app, db, nginx, system, monitor"
            ;;
    esac
}

# Main functions
status() {
    log_info "Checking system status..."
    
    setup_logging
    check_containers
    check_system_resources
    check_application_health
    check_nginx_status
    check_ssl_certificate
    check_database_connection
    check_log_files
    generate_status_report
    
    log_success "Status check completed!"
}

monitor() {
    log_info "Starting monitoring..."
    
    setup_logging
    monitor_continuously
}

logs() {
    show_logs $1 $2
}

# Script usage
show_usage() {
    echo "Usage: $0 {status|monitor|logs}"
    echo ""
    echo "Commands:"
    echo "  status              - Check system status and generate report"
    echo "  monitor             - Start continuous monitoring"
    echo "  logs <service> [lines] - Show logs for specific service"
    echo ""
    echo "Available services for logs:"
    echo "  app                 - Application logs"
    echo "  db                  - Database logs"
    echo "  nginx               - Nginx logs"
    echo "  system              - System logs"
    echo "  monitor             - Monitor logs"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 monitor"
    echo "  $0 logs app 100"
}

# Main execution
case "$1" in
    status)
        status
        ;;
    monitor)
        monitor
        ;;
    logs)
        logs $2 $3
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
