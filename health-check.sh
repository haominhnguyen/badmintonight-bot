#!/bin/bash

# Health Check Script for Badminton Bot
# This script performs comprehensive health checks for the application
# Domain: haominhnguyen.shop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/badminton-bot"
DOMAIN="haominhnguyen.shop"
LOG_FILE="/var/log/badminton-bot-health.log"
ALERT_EMAIL="admin@haominhnguyen.shop"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5
SSL_EXPIRY_THRESHOLD=30

# Health check results
declare -A HEALTH_STATUS
HEALTH_STATUS[overall]="HEALTHY"
HEALTH_STATUS[containers]="HEALTHY"
HEALTH_STATUS[database]="HEALTHY"
HEALTH_STATUS[application]="HEALTHY"
HEALTH_STATUS[nginx]="HEALTHY"
HEALTH_STATUS[ssl]="HEALTHY"
HEALTH_STATUS[system]="HEALTHY"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> $LOG_FILE
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> $LOG_FILE
}

check_containers() {
    log_info "Checking Docker containers..."
    
    local app_running=false
    local db_running=false
    local app_healthy=false
    local db_healthy=false
    
    # Check if containers are running
    if docker ps | grep -q "badminton-bot-prod"; then
        app_running=true
        log_success "Application container is running"
    else
        log_error "Application container is not running!"
        HEALTH_STATUS[containers]="UNHEALTHY"
        return 1
    fi
    
    if docker ps | grep -q "badminton-postgres-prod"; then
        db_running=true
        log_success "Database container is running"
    else
        log_error "Database container is not running!"
        HEALTH_STATUS[containers]="UNHEALTHY"
        return 1
    fi
    
    # Check container health
    local app_health=$(docker inspect --format='{{.State.Health.Status}}' badminton-bot-prod 2>/dev/null || echo "unknown")
    local db_health=$(docker inspect --format='{{.State.Health.Status}}' badminton-postgres-prod 2>/dev/null || echo "unknown")
    
    if [ "$app_health" = "healthy" ]; then
        app_healthy=true
        log_success "Application container health: $app_health"
    elif [ "$app_health" = "unknown" ]; then
        log_warning "Application container health: $app_health (no health check configured)"
    else
        log_error "Application container health: $app_health"
        HEALTH_STATUS[containers]="UNHEALTHY"
    fi
    
    if [ "$db_health" = "healthy" ]; then
        db_healthy=true
        log_success "Database container health: $db_health"
    elif [ "$db_health" = "unknown" ]; then
        log_warning "Database container health: $db_health (no health check configured)"
    else
        log_error "Database container health: $db_health"
        HEALTH_STATUS[containers]="UNHEALTHY"
    fi
    
    if [ "$app_running" = true ] && [ "$db_running" = true ]; then
        HEALTH_STATUS[containers]="HEALTHY"
    fi
}

check_database() {
    log_info "Checking database connection..."
    
    # Test database connection
    if docker exec badminton-postgres-prod pg_isready -U badminton_user -d badminton_bot >/dev/null 2>&1; then
        log_success "Database connection: OK"
        HEALTH_STATUS[database]="HEALTHY"
    else
        log_error "Database connection failed!"
        HEALTH_STATUS[database]="UNHEALTHY"
        return 1
    fi
    
    # Check database size
    local db_size=$(docker exec badminton-postgres-prod psql -U badminton_user -d badminton_bot -t -c "SELECT pg_size_pretty(pg_database_size('badminton_bot'));" 2>/dev/null | xargs)
    log_info "Database size: $db_size"
    
    # Check active connections
    local active_connections=$(docker exec badminton-postgres-prod psql -U badminton_user -d badminton_bot -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
    log_info "Active connections: $active_connections"
    
    # Check for long-running queries
    local long_queries=$(docker exec badminton-postgres-prod psql -U badminton_user -d badminton_bot -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';" 2>/dev/null | xargs)
    if [ "$long_queries" -gt 0 ]; then
        log_warning "Long-running queries detected: $long_queries"
    fi
}

check_application() {
    log_info "Checking application health..."
    
    # Check if application responds
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:3100/health" 2>/dev/null || echo "0")
    
    if (( $(echo "$response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        log_warning "Slow response time: ${response_time}s (threshold: ${RESPONSE_TIME_THRESHOLD}s)"
    else
        log_success "Response time: ${response_time}s"
    fi
    
    # Check HTTP status
    local http_status=$(curl -o /dev/null -s -w '%{http_code}' "http://localhost:3100/health" 2>/dev/null || echo "000")
    
    if [ "$http_status" = "200" ]; then
        log_success "Application health check: OK"
        HEALTH_STATUS[application]="HEALTHY"
    else
        log_error "Application health check failed: HTTP $http_status"
        HEALTH_STATUS[application]="UNHEALTHY"
        return 1
    fi
    
    # Check application logs for errors
    if [ -d "$PROJECT_DIR/logs" ]; then
        local error_count=$(find $PROJECT_DIR/logs -name "*.log" -mtime -1 -exec grep -l "ERROR\|FATAL" {} \; 2>/dev/null | wc -l)
        if [ $error_count -gt 0 ]; then
            log_warning "Found $error_count log files with errors in the last 24 hours"
        else
            log_success "No recent errors in application logs"
        fi
    fi
}

check_nginx() {
    log_info "Checking Nginx status..."
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
        HEALTH_STATUS[nginx]="HEALTHY"
    else
        log_error "Nginx is not running!"
        HEALTH_STATUS[nginx]="UNHEALTHY"
        return 1
    fi
    
    # Check Nginx configuration
    if nginx -t >/dev/null 2>&1; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors!"
        HEALTH_STATUS[nginx]="UNHEALTHY"
        return 1
    fi
    
    # Check Nginx logs for errors
    local nginx_errors=$(grep -c "error" /var/log/nginx/error.log 2>/dev/null || echo "0")
    if [ $nginx_errors -gt 0 ]; then
        log_warning "Found $nginx_errors errors in Nginx error log"
    else
        log_success "No errors in Nginx error log"
    fi
}

check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    local cert_file="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    
    if [ -f "$cert_file" ]; then
        log_success "SSL certificate file exists"
        
        # Check certificate expiry
        local cert_expiry=$(openssl x509 -in $cert_file -noout -dates | grep notAfter | cut -d= -f2)
        local cert_expiry_epoch=$(date -d "$cert_expiry" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (cert_expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_until_expiry -lt $SSL_EXPIRY_THRESHOLD ]; then
            log_warning "SSL certificate expires in $days_until_expiry days (threshold: $SSL_EXPIRY_THRESHOLD days)"
            HEALTH_STATUS[ssl]="WARNING"
        else
            log_success "SSL certificate valid for $days_until_expiry days"
            HEALTH_STATUS[ssl]="HEALTHY"
        fi
        
        # Check certificate chain
        if openssl verify -CAfile $cert_file $cert_file >/dev/null 2>&1; then
            log_success "SSL certificate chain is valid"
        else
            log_error "SSL certificate chain is invalid"
            HEALTH_STATUS[ssl]="UNHEALTHY"
        fi
    else
        log_error "SSL certificate not found!"
        HEALTH_STATUS[ssl]="UNHEALTHY"
        return 1
    fi
}

check_system_resources() {
    log_info "Checking system resources..."
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        log_warning "High CPU usage: ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
        HEALTH_STATUS[system]="WARNING"
    else
        log_success "CPU usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $memory_usage -gt $MEMORY_THRESHOLD ]; then
        log_warning "High memory usage: ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)"
        HEALTH_STATUS[system]="WARNING"
    else
        log_success "Memory usage: ${memory_usage}%"
    fi
    
    # Disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $disk_usage -gt $DISK_THRESHOLD ]; then
        log_warning "High disk usage: ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)"
        HEALTH_STATUS[system]="WARNING"
    else
        log_success "Disk usage: ${disk_usage}%"
    fi
    
    # Check load average
    local load_avg=$(cat /proc/loadavg | awk '{print $1}')
    local cpu_cores=$(nproc)
    local load_threshold=$(echo "$cpu_cores * 0.8" | bc)
    
    if (( $(echo "$load_avg > $load_threshold" | bc -l) )); then
        log_warning "High load average: $load_avg (threshold: $load_threshold)"
        HEALTH_STATUS[system]="WARNING"
    else
        log_success "Load average: $load_avg"
    fi
}

check_network_connectivity() {
    log_info "Checking network connectivity..."
    
    # Check if domain resolves
    if nslookup $DOMAIN >/dev/null 2>&1; then
        log_success "Domain resolution: OK"
    else
        log_error "Domain resolution failed!"
        return 1
    fi
    
    # Check if HTTPS is accessible
    if curl -f -s "https://$DOMAIN/health" >/dev/null 2>&1; then
        log_success "HTTPS connectivity: OK"
    else
        log_error "HTTPS connectivity failed!"
        return 1
    fi
    
    # Check if HTTP redirects to HTTPS
    local http_redirect=$(curl -s -o /dev/null -w '%{http_code}' "http://$DOMAIN" 2>/dev/null || echo "000")
    if [ "$http_redirect" = "301" ] || [ "$http_redirect" = "302" ]; then
        log_success "HTTP to HTTPS redirect: OK"
    else
        log_warning "HTTP to HTTPS redirect: $http_redirect"
    fi
}

check_log_files() {
    log_info "Checking log files..."
    
    # Check application logs
    if [ -d "$PROJECT_DIR/logs" ]; then
        local log_count=$(find $PROJECT_DIR/logs -name "*.log" | wc -l)
        log_info "Application log files: $log_count"
        
        # Check for recent errors
        local error_count=$(find $PROJECT_DIR/logs -name "*.log" -mtime -1 -exec grep -l "ERROR\|FATAL" {} \; 2>/dev/null | wc -l)
        if [ $error_count -gt 0 ]; then
            log_warning "Found $error_count log files with errors in the last 24 hours"
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

generate_health_report() {
    log_info "Generating health report..."
    
    local report_file="/var/log/badminton-bot-health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > $report_file << EOF
Badminton Bot Health Report
==========================
Generated: $(date)
Domain: $DOMAIN

=== OVERALL STATUS ===
Overall: ${HEALTH_STATUS[overall]}
Containers: ${HEALTH_STATUS[containers]}
Database: ${HEALTH_STATUS[database]}
Application: ${HEALTH_STATUS[application]}
Nginx: ${HEALTH_STATUS[nginx]}
SSL: ${HEALTH_STATUS[ssl]}
System: ${HEALTH_STATUS[system]}

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
    
    log_success "Health report generated: $report_file"
}

send_alert() {
    local message=$1
    local subject="Badminton Bot Health Alert - $(date)"
    
    log_warning "Sending alert: $message"
    
    # Send email alert (if mail is configured)
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" $ALERT_EMAIL
        log_info "Alert email sent to $ALERT_EMAIL"
    else
        log_warning "Mail command not available, alert not sent"
    fi
    
    # Log alert
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ALERT] $message" >> $LOG_FILE
}

determine_overall_health() {
    local unhealthy_count=0
    local warning_count=0
    
    for component in "${!HEALTH_STATUS[@]}"; do
        if [ "${HEALTH_STATUS[$component]}" = "UNHEALTHY" ]; then
            ((unhealthy_count++))
        elif [ "${HEALTH_STATUS[$component]}" = "WARNING" ]; then
            ((warning_count++))
        fi
    done
    
    if [ $unhealthy_count -gt 0 ]; then
        HEALTH_STATUS[overall]="UNHEALTHY"
        log_error "System is UNHEALTHY ($unhealthy_count components unhealthy)"
    elif [ $warning_count -gt 0 ]; then
        HEALTH_STATUS[overall]="WARNING"
        log_warning "System has WARNINGS ($warning_count components with warnings)"
    else
        HEALTH_STATUS[overall]="HEALTHY"
        log_success "System is HEALTHY"
    fi
}

# Main health check function
health_check() {
    log_info "Starting comprehensive health check..."
    
    check_containers
    check_database
    check_application
    check_nginx
    check_ssl_certificate
    check_system_resources
    check_network_connectivity
    check_log_files
    determine_overall_health
    generate_health_report
    
    # Send alerts if needed
    if [ "${HEALTH_STATUS[overall]}" = "UNHEALTHY" ]; then
        send_alert "System is UNHEALTHY! Immediate attention required."
    elif [ "${HEALTH_STATUS[overall]}" = "WARNING" ]; then
        send_alert "System has WARNINGS! Monitor closely."
    fi
    
    log_success "Health check completed!"
}

# Quick health check
quick_check() {
    log_info "Starting quick health check..."
    
    check_containers
    check_application
    check_nginx
    
    if [ "${HEALTH_STATUS[containers]}" = "HEALTHY" ] && [ "${HEALTH_STATUS[application]}" = "HEALTHY" ] && [ "${HEALTH_STATUS[nginx]}" = "HEALTHY" ]; then
        log_success "Quick health check passed!"
        return 0
    else
        log_error "Quick health check failed!"
        return 1
    fi
}

# Script usage
show_usage() {
    echo "Usage: $0 {health-check|quick-check|report}"
    echo ""
    echo "Commands:"
    echo "  health-check        - Perform comprehensive health check"
    echo "  quick-check         - Perform quick health check"
    echo "  report             - Generate health report only"
    echo ""
    echo "Examples:"
    echo "  $0 health-check"
    echo "  $0 quick-check"
    echo "  $0 report"
}

# Main execution
case "$1" in
    health-check)
        health_check
        ;;
    quick-check)
        quick_check
        ;;
    report)
        generate_health_report
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
