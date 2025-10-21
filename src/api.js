const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const expressValidator = require('express-validator');
const { body, validationResult, param } = expressValidator;
const db = require('./db');
const { computeSession, generateSummaryReport } = require('./compute');
const { 
  authenticateToken, 
  authorizeAdmin, 
  checkAdminPassword,
  generateToken,
  hashPassword,
  comparePassword,
  logSecurityEvent
} = require('./middleware/auth');
const { 
  sanitizeInput,
  validateCommonInputs,
  handleValidationErrors
} = require('./middleware/sanitize');

const router = express.Router();

// Security Middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3100',
      'https://yourdomain.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

router.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);

// Strict rate limiting for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many sensitive requests from this IP, please try again later.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Input Validation Middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Authentication Middleware (imported from middleware/auth)

// Admin Authorization Middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }
  next();
};

// Input Sanitization (imported from middleware/sanitize)

router.use(sanitizeInput);

// ========== AUTHENTICATION ENDPOINTS ==========

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Admin password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', [
  validateCommonInputs.password,
  handleValidationErrors
], checkAdminPassword, async (req, res) => {
  try {
    const { password } = req.body;
    
    // Log security event
    logSecurityEvent('ADMIN_LOGIN_ATTEMPT', req, { 
      success: true,
      userAgent: req.get('User-Agent')
    });

    // Generate JWT token
    const token = generateToken({
      id: 'admin',
      role: 'admin',
      loginTime: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        user: {
          id: 'admin',
          role: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    logSecurityEvent('ADMIN_LOGIN_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== SESSION MANAGEMENT ==========

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get all sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed]
 *         description: Filter by session status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of sessions to return
 *     responses:
 *       200:
 *         description: List of sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authenticateToken, [
  param('status').optional().isIn(['pending', 'completed']).withMessage('Invalid status'),
  param('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit')
], validateRequest, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const where = status ? { status } : {};
    
    const sessions = await db.prisma.session.findMany({
      where,
      orderBy: { playDate: 'desc' },
      take: parseInt(limit),
      include: {
        _count: {
          select: {
            votes: true,
            proxyVotes: true,
            payments: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: sessions,
      meta: {
        total: sessions.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error getting sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session details
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session details
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:id', authenticateToken, [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID')
], validateRequest, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);

    const session = await db.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        votes: {
          include: {
            user: {
              select: { id: true, name: true, gender: true, fbId: true }
            }
          }
        },
        proxyVotes: {
          include: {
            voter: {
              select: { id: true, name: true, fbId: true }
            },
            targetUser: {
              select: { id: true, name: true, gender: true }
            }
          }
        },
        payments: {
          orderBy: { amount: 'desc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Calculate statistics
    const yesVotes = session.votes.filter(v => v.voteType === 'VOTE_YES').length;
    const noVotes = session.votes.filter(v => v.voteType === 'VOTE_NO').length;
    const totalPaid = session.payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const totalUnpaid = session.payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: {
        ...session,
        stats: {
          totalVotes: session.votes.length,
          yesVotes,
          noVotes,
          proxyVotes: session.proxyVotes.length,
          totalPaid,
          totalUnpaid,
          paymentCompletionRate: session.payments.length > 0 
            ? (session.payments.filter(p => p.paid).length / session.payments.length * 100).toFixed(1) 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting session details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== ADMIN ENDPOINTS ==========

/**
 * @swagger
 * /api/admin/sessions:
 *   post:
 *     summary: Create new session
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Session date (YYYY-MM-DD)
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Invalid input or session already exists
 */
router.post('/admin/sessions', authenticateToken, requireAdmin, strictLimiter, [
  body('date').isISO8601().withMessage('Invalid date format')
], validateRequest, async (req, res) => {
  try {
    const { date } = req.body;
    
    // Check if there's already an active session
    const existingSession = await db.getCurrentSession();
    if (existingSession && existingSession.status === 'pending') {
      return res.status(400).json({
        success: false,
        error: `Active session already exists for ${existingSession.playDate.toLocaleDateString('vi-VN')}`,
        code: 'SESSION_ALREADY_EXISTS'
      });
    }
    
    const playDate = new Date(date);
    playDate.setHours(18, 0, 0, 0);

    const session = await db.createSession(playDate);

    res.status(201).json({
      success: true,
      data: session,
      message: `Session created for ${playDate.toLocaleDateString('vi-VN')}`
    });

  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/admin/sessions/{id}/court:
 *   put:
 *     summary: Update court count for session
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - count
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Court count updated
 *       404:
 *         description: Session not found
 */
router.put('/admin/sessions/:id/court', authenticateToken, requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  body('count').isInt({ min: 1, max: 10 }).withMessage('Count must be between 1 and 10')
], validateRequest, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { count } = req.body;
    
    const session = await db.prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    await db.prisma.session.update({
      where: { id: sessionId },
      data: { courtCount: count }
    });

    res.json({
      success: true,
      message: `Court count updated to ${count} for session ${session.playDate.toLocaleDateString('vi-VN')}`
    });

  } catch (error) {
    console.error('❌ Error updating court count:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/admin/sessions/{id}/shuttle:
 *   put:
 *     summary: Update shuttle count for session
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - count
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *     responses:
 *       200:
 *         description: Shuttle count updated
 *       404:
 *         description: Session not found
 */
router.put('/admin/sessions/:id/shuttle', authenticateToken, requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  body('count').isInt({ min: 1, max: 20 }).withMessage('Count must be between 1 and 20')
], validateRequest, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { count } = req.body;
    
    const session = await db.prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    await db.prisma.session.update({
      where: { id: sessionId },
      data: { shuttleCount: count }
    });

    res.json({
      success: true,
      message: `Shuttle count updated to ${count} for session ${session.playDate.toLocaleDateString('vi-VN')}`
    });

  } catch (error) {
    console.error('❌ Error updating shuttle count:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/admin/sessions/{id}/calculate:
 *   post:
 *     summary: Calculate session costs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Calculation completed
 *       404:
 *         description: Session not found
 */
router.post('/admin/sessions/:id/calculate', authenticateToken, requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID')
], validateRequest, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    const session = await db.prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const result = await computeSession(sessionId);
    
    // Update session
    await db.prisma.session.update({
      where: { id: sessionId },
      data: {
        totalCost: result.total,
        computed: true
      }
    });

    // Delete old payments and create new ones
    await db.prisma.payment.deleteMany({
      where: { sessionId: sessionId }
    });

    for (const participant of result.participants) {
      await db.prisma.payment.create({
        data: {
          sessionId: sessionId,
          userId: participant.userId,
          userName: participant.name,
          amount: participant.amount,
          paid: false
        }
      });
    }

    const report = generateSummaryReport(result);

    res.json({
      success: true,
      data: {
        sessionId,
        totalCost: result.total,
        participantCount: result.participants.length,
        report
      },
      message: 'Calculation completed successfully'
    });

  } catch (error) {
    console.error('❌ Error calculating session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== PAYMENT MANAGEMENT ==========

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get payments for current session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: integer
 *         description: Session ID (optional, defaults to current session)
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    let session;
    if (sessionId) {
      session = await db.prisma.session.findUnique({
        where: { id: parseInt(sessionId) }
      });
    } else {
      session = await db.getCurrentSession();
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const payments = await db.prisma.payment.findMany({
      where: { sessionId: session.id },
      orderBy: { userName: 'asc' }
    });

    res.json({
      success: true,
      data: payments,
      meta: {
        sessionId: session.id,
        sessionDate: session.playDate,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        paidAmount: payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0),
        unpaidAmount: payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error getting payments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/payments/{id}/mark-paid:
 *   post:
 *     summary: Mark payment as paid
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment marked as paid
 *       404:
 *         description: Payment not found
 */
router.post('/payments/:id/mark-paid', authenticateToken, requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('Invalid payment ID')
], validateRequest, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    
    const payment = await db.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        session: true
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // Check if session is completed
    if (payment.session.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot mark payment as paid for completed session',
        code: 'SESSION_COMPLETED'
      });
    }

    const updatedPayment = await db.prisma.payment.update({
      where: { id: paymentId },
      data: {
        paid: true,
        paidAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: `Payment marked as paid for ${payment.userName}`
    });

  } catch (error) {
    console.error('❌ Error marking payment as paid:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== STATISTICS ==========

/**
 * @swagger
 * /api/statistics/overview:
 *   get:
 *     summary: Get overview statistics
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview statistics
 */
router.get('/statistics/overview', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalSessions,
      activeSessions,
      completedSessions,
      totalUsers,
      recentSessions
    ] = await Promise.all([
      db.prisma.session.count(),
      db.prisma.session.count({ where: { status: 'pending' } }),
      db.prisma.session.count({ where: { status: 'completed' } }),
      db.prisma.user.count(),
      db.prisma.session.findMany({
        where: {
          playDate: { gte: thirtyDaysAgo },
          status: 'completed'
        },
        include: {
          _count: {
            select: {
              votes: true,
              proxyVotes: true,
              payments: true
            }
          }
        },
        orderBy: { playDate: 'desc' },
        take: 10
      })
    ]);

    // Calculate top participants
    const topParticipants = await db.prisma.user.findMany({
      include: {
        votes: {
          where: {
            session: {
              playDate: { gte: thirtyDaysAgo }
            }
          }
        },
        proxyVotes: {
          where: {
            session: {
              playDate: { gte: thirtyDaysAgo }
            }
          }
        }
      },
      orderBy: {
        votes: {
          _count: 'desc'
        }
      },
      take: 10
    });

    res.json({
      success: true,
      data: {
        sessions: {
          total: totalSessions,
          active: activeSessions,
          completed: completedSessions
        },
        users: {
          total: totalUsers
        },
        recentSessions,
        topParticipants: topParticipants.map(user => ({
          id: user.id,
          name: user.name,
          gender: user.gender,
          voteCount: user.votes.length,
          proxyVoteCount: user.proxyVotes.length,
          totalParticipation: user.votes.length + user.proxyVotes.length
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting overview statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ========== ERROR HANDLING ==========

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Global error handler
router.use((error, req, res, next) => {
  console.error('❌ API Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      code: 'INVALID_JSON'
    });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router;
