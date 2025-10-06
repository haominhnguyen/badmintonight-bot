const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';

/**
 * Generate JWT token for admin
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'badminton-bot',
    audience: 'badminton-bot-admin'
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'badminton-bot',
      audience: 'badminton-bot-admin'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} - Password match result
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Express middleware to authenticate JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Express middleware to authorize admin access
 */
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}

/**
 * Express middleware to check admin password (for web interface)
 */
function checkAdminPassword(req, res, next) {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password required'
    });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Invalid password'
    });
  }

  next();
}

/**
 * Express middleware to validate session ownership
 */
function validateSessionOwnership(req, res, next) {
  const sessionId = req.params.id || req.body.sessionId;
  const userId = req.user?.id;

  if (!sessionId || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID and user ID required'
    });
  }

  // Add session ownership validation logic here
  // For now, allow all authenticated users
  next();
}

/**
 * Express middleware to validate payment ownership
 */
function validatePaymentOwnership(req, res, next) {
  const paymentId = req.params.id;
  const userId = req.user?.id;

  if (!paymentId || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Payment ID and user ID required'
    });
  }

  // Add payment ownership validation logic here
  // For now, allow all authenticated users
  next();
}

/**
 * Express middleware to check rate limiting for sensitive operations
 */
function checkRateLimit(limit = 10, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);
    }
    
    // Check current attempts
    const userAttempts = attempts.get(key) || [];
    if (userAttempts.length >= limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts, please try again later'
      });
    }
    
    // Record this attempt
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    next();
  };
}

/**
 * Express middleware to log security events
 */
function logSecurityEvent(event, req, additionalData = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    ...additionalData
  };
  
  console.log(`[SECURITY] ${event}:`, JSON.stringify(logData));
}

/**
 * Express middleware to detect suspicious activity
 */
function detectSuspiciousActivity(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress;
  
  // Check for common bot patterns
  // Allow health check and API docs for all user agents
  if (req.url === '/health' || req.url === '/api-docs' || req.url.startsWith('/api-docs')) {
    return next();
  }
  
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /python/i,
    /java/i,
    /php/i
  ];
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot && !userAgent.includes('badminton-bot')) {
    logSecurityEvent('SUSPICIOUS_BOT_DETECTED', req, { userAgent });
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /or\s+1\s*=\s*1/i,
    /'\s*or\s*'/i
  ];
  
  const queryString = JSON.stringify(req.query) + JSON.stringify(req.body);
  const hasSqlInjection = sqlPatterns.some(pattern => pattern.test(queryString));
  
  if (hasSqlInjection) {
    logSecurityEvent('SQL_INJECTION_ATTEMPT', req, { queryString });
    return res.status(400).json({
      success: false,
      message: 'Invalid request'
    });
  }
  
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  authorizeAdmin,
  checkAdminPassword,
  validateSessionOwnership,
  validatePaymentOwnership,
  checkRateLimit,
  logSecurityEvent,
  detectSuspiciousActivity
};
