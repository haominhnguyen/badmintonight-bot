const { body, param, query, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous characters and scripts
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
}

/**
 * Sanitize object properties recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Express middleware to sanitize request body
 */
function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Express middleware to sanitize query parameters
 */
function sanitizeQueryParams(req, res, next) {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Express middleware to sanitize URL parameters
 */
function sanitizeParams(req, res, next) {
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Validation middleware for common inputs
 */
const validateCommonInputs = {
  // Validate session ID
  sessionId: param('id').isInt({ min: 1 }).withMessage('Session ID must be a positive integer'),
  
  // Validate payment ID
  paymentId: param('id').isInt({ min: 1 }).withMessage('Payment ID must be a positive integer'),
  
  // Validate user ID
  userId: param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  
  // Validate count inputs
  count: body('count').isInt({ min: 1, max: 100 }).withMessage('Count must be between 1 and 100'),
  
  // Validate date inputs
  date: body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  
  // Validate name inputs
  name: body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  
  // Validate password
  password: body('password').isLength({ min: 4, max: 50 }).withMessage('Password must be between 4 and 50 characters'),
  
  // Validate email
  email: body('email').isEmail().withMessage('Must be a valid email address'),
  
  // Validate amount
  amount: body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  
  // Validate gender
  gender: body('gender').isIn(['male', 'female']).withMessage('Gender must be male or female'),
  
  // Validate vote type
  voteType: body('voteType').isIn(['VOTE_YES', 'VOTE_NO']).withMessage('Vote type must be VOTE_YES or VOTE_NO'),
  
  // Validate session status
  status: body('status').isIn(['pending', 'completed', 'cancelled']).withMessage('Status must be pending, completed, or cancelled')
};

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
}

/**
 * Rate limiting configuration for different endpoints
 */
const rateLimitConfig = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  
  // Admin endpoints rate limit
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many admin requests from this IP, please try again later.'
    }
  },
  
  // Authentication endpoints rate limit
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login attempts per windowMs
    message: {
      success: false,
      message: 'Too many authentication attempts from this IP, please try again later.'
    }
  },
  
  // Payment endpoints rate limit
  payment: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 payment requests per windowMs
    message: {
      success: false,
      message: 'Too many payment requests from this IP, please try again later.'
    }
  }
};

/**
 * Security headers configuration
 */
const securityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  
  // Other security headers
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  noSniff: true,
  xssFilter: true,
  referrerPolicy: 'strict-origin-when-cross-origin'
};

module.exports = {
  sanitizeInput,
  sanitizeObject,
  sanitizeRequestBody,
  sanitizeQueryParams,
  sanitizeParams,
  validateCommonInputs,
  handleValidationErrors,
  rateLimitConfig,
  securityHeaders
};
