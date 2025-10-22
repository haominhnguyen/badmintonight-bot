const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const apiRoutes = require('./api/v1');
const { 
  sanitizeRequestBody, 
  sanitizeQueryParams, 
  sanitizeParams,
  rateLimitConfig,
  securityHeaders 
} = require('./middleware/sanitize');
const { 
  detectSuspiciousActivity,
  logSecurityEvent 
} = require('./middleware/auth');
const {
  logger,
  requestLogger,
  errorLogger,
  performanceMonitor,
  statsRecorder,
  getHealthData
} = require('./middleware/monitoring');

const app = express();

// Security Headers
app.use(helmet(securityHeaders));

// Monitoring Middleware
app.use(requestLogger);
app.use(performanceMonitor);
app.use(statsRecorder);

// Security Middleware
app.use(detectSuspiciousActivity);

// Input Sanitization
app.use(sanitizeRequestBody);
app.use(sanitizeQueryParams);
app.use(sanitizeParams);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3100',
      'https://yourdomain.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// Rate Limiting
const generalLimiter = rateLimit(rateLimitConfig.general);
const adminLimiter = rateLimit(rateLimitConfig.admin);
const authLimiter = rateLimit(rateLimitConfig.auth);
const paymentLimiter = rateLimit(rateLimitConfig.payment);

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
});

// Swagger Configuration
// Swagger Configuration (using external swagger.js)

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Badminton Bot API Documentation'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = getHealthData();
  res.json(healthData);
});

// API Stats endpoint
app.get('/api/stats', (req, res) => {
  const { apiStats } = require('./middleware/monitoring');
  res.json({
    success: true,
    data: apiStats.getStats(),
    timestamp: new Date().toISOString()
  });
});

// API routes
// API Routes with specific rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Badminton Bot API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    status: 'running'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api-docs',
      'POST /api/auth/login',
      'GET /api/sessions',
      'GET /api/sessions/:id',
      'POST /api/admin/sessions',
      'PUT /api/admin/sessions/:id/court',
      'PUT /api/admin/sessions/:id/shuttle',
      'POST /api/admin/sessions/:id/calculate',
      'GET /api/payments',
      'POST /api/payments/:id/mark-paid',
      'GET /api/statistics/overview'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global Error:', error);
  
  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }
  
  // JSON parsing error
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      code: 'INVALID_JSON'
    });
  }
  
  // File size error
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      code: 'ENTITY_TOO_LARGE'
    });
  }
  
  // Rate limit error
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.API_PORT || 3100;

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
});

module.exports = app;
