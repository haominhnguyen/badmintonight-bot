const express = require('express');
const router = express.Router();
const expressValidator = require('express-validator');
const { body, param, query, validationResult } = expressValidator;
const { 
  authenticateToken, 
  authorizeAdmin,
  logSecurityEvent 
} = require('../../middleware/auth');
const { 
  validateCommonInputs,
  handleValidationErrors 
} = require('../../middleware/sanitize');
const db = require('../../db');

/**
 * @swagger
 * /api/v1/sessions:
 *   get:
 *     summary: Get all sessions
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of sessions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter by session status
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    const where = status ? { status } : {};
    
    const [sessions, total] = await Promise.all([
      db.prisma.session.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              votes: true,
              proxyVotes: true,
              payments: true
            }
          }
        }
      }),
      db.prisma.session.count({ where })
    ]);

    const sessionsWithCounts = sessions.map(session => ({
      ...session,
      participantCount: session._count.votes + session._count.proxyVotes,
      proxyVoteCount: session._count.proxyVotes
    }));

    res.json({
      success: true,
      data: sessionsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get sessions error:', error);
    logSecurityEvent('GET_SESSIONS_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/sessions/{id}:
 *   get:
 *     summary: Get session by ID
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Session'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  handleValidationErrors
], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await db.prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: {
        votes: {
          include: { user: true }
        },
        proxyVotes: {
          include: { 
            voter: true,
            targetUser: true
          }
        },
        payments: true,
        _count: {
          select: {
            votes: true,
            proxyVotes: true,
            payments: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const sessionWithCounts = {
      ...session,
      participantCount: session._count.votes + session._count.proxyVotes,
      proxyVoteCount: session._count.proxyVotes
    };

    res.json({
      success: true,
      data: sessionWithCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get session error:', error);
    logSecurityEvent('GET_SESSION_ERROR', req, { error: error.message, sessionId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/sessions/{id}/payments:
 *   get:
 *     summary: Get payments for a specific session
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *       - in: query
 *         name: paid
 *         schema:
 *           type: boolean
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id/payments', [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  handleValidationErrors
], authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const paidOnly = req.query.paid === 'true';
    const unpaidOnly = req.query.paid === 'false';

    const where = { sessionId };
    if (paidOnly) {
      where.paid = true;
    } else if (unpaidOnly) {
      where.paid = false;
    }

    const payments = await db.prisma.payment.findMany({
      where,
      orderBy: { amount: 'desc' }
    });

    const summary = {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      paid: payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0),
      unpaid: payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0),
      count: payments.length,
      paidCount: payments.filter(p => p.paid).length,
      unpaidCount: payments.filter(p => !p.paid).length
    };

    res.json({
      success: true,
      data: payments,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/v1/sessions/:id/payments:', error);
    logSecurityEvent('GET_SESSION_PAYMENTS_ERROR', req, { error: error.message, sessionId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
