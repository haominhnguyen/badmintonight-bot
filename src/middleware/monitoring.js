const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Logger class for structured logging
 */
class Logger {
  constructor(service = 'api') {
    this.service = service;
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      service: this.service,
      message: message,
      ...meta
    };
  }

  /**
   * Write log to file
   */
  writeToFile(level, message, meta = {}) {
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    const formattedMessage = this.formatMessage(level, message, meta);
    
    fs.appendFileSync(logFile, JSON.stringify(formattedMessage) + '\n');
  }

  /**
   * Check if log level should be written
   */
  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  /**
   * Log error
   */
  error(message, meta = {}) {
    if (this.shouldLog('ERROR')) {
      console.error(`[ERROR] ${message}`, meta);
      this.writeToFile('ERROR', message, meta);
    }
  }

  /**
   * Log warning
   */
  warn(message, meta = {}) {
    if (this.shouldLog('WARN')) {
      console.warn(`[WARN] ${message}`, meta);
      this.writeToFile('WARN', message, meta);
    }
  }

  /**
   * Log info
   */
  info(message, meta = {}) {
    if (this.shouldLog('INFO')) {
      console.log(`[INFO] ${message}`, meta);
      this.writeToFile('INFO', message, meta);
    }
  }

  /**
   * Log debug
   */
  debug(message, meta = {}) {
    if (this.shouldLog('DEBUG')) {
      console.log(`[DEBUG] ${message}`, meta);
      this.writeToFile('DEBUG', message, meta);
    }
  }
}

// Create logger instance
const logger = new Logger();

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Add request ID to request object
  req.requestId = requestId;
  req.startTime = startTime;

  // Log request
  logger.info('Request received', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    headers: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer ***' : undefined
    }
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Response sent', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(data).length
    });

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Error logging middleware
 */
function errorLogger(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  next(err);
}

/**
 * Performance monitoring middleware
 */
function performanceMonitor(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }

    // Log performance metrics
    logger.debug('Request performance', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      duration: `${duration.toFixed(2)}ms`,
      statusCode: res.statusCode
    });
  });

  next();
}

/**
 * Security event logging
 */
function securityLogger(event, req, additionalData = {}) {
  logger.warn('Security event', {
    event,
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    ...additionalData
  });
}

/**
 * API usage statistics
 */
class ApiStats {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      endpoints: {},
      hourlyStats: {},
      dailyStats: {}
    };
  }

  recordRequest(endpoint, method, statusCode, duration) {
    this.stats.totalRequests++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update average response time
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + duration) / 
      this.stats.totalRequests;

    // Track endpoint usage
    const key = `${method} ${endpoint}`;
    if (!this.stats.endpoints[key]) {
      this.stats.endpoints[key] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        successCount: 0,
        errorCount: 0
      };
    }
    
    this.stats.endpoints[key].count++;
    this.stats.endpoints[key].totalDuration += duration;
    this.stats.endpoints[key].averageDuration = 
      this.stats.endpoints[key].totalDuration / this.stats.endpoints[key].count;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.stats.endpoints[key].successCount++;
    } else {
      this.stats.endpoints[key].errorCount++;
    }

    // Track hourly stats
    const hour = new Date().toISOString().substring(0, 13);
    if (!this.stats.hourlyStats[hour]) {
      this.stats.hourlyStats[hour] = { requests: 0, errors: 0 };
    }
    this.stats.hourlyStats[hour].requests++;
    if (statusCode >= 400) {
      this.stats.hourlyStats[hour].errors++;
    }

    // Track daily stats
    const day = new Date().toISOString().substring(0, 10);
    if (!this.stats.dailyStats[day]) {
      this.stats.dailyStats[day] = { requests: 0, errors: 0 };
    }
    this.stats.dailyStats[day].requests++;
    if (statusCode >= 400) {
      this.stats.dailyStats[day].errors++;
    }
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      errorRate: this.stats.totalRequests > 0 ? 
        (this.stats.failedRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// Create API stats instance
const apiStats = new ApiStats();

/**
 * Stats recording middleware
 */
function statsRecorder(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    apiStats.recordRequest(req.route?.path || req.path, req.method, res.statusCode, duration);
  });

  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Health check data
 */
function getHealthData() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
    },
    api: apiStats.getStats(),
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform
  };
}

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceMonitor,
  securityLogger,
  apiStats,
  statsRecorder,
  getHealthData
};
