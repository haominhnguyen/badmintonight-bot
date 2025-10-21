const express = require('express');
const router = express.Router();
const expressValidator = require('express-validator');
const { param, query, validationResult } = expressValidator;
const { 
  authenticateToken, 
  authorizeAdmin,
  logSecurityEvent 
} = require('../../middleware/auth');
const { 
  handleValidationErrors 
} = require('../../middleware/sanitize');
const db = require('../../db');

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Get payments for a session
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
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
 *                     $ref: '#/components/schemas/Payment'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', [
  query('sessionId').isInt({ min: 1 }).withMessage('Invalid session ID'),
  handleValidationErrors
], authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.query;

    const payments = await db.prisma.payment.findMany({
      where: { sessionId: parseInt(sessionId) },
      orderBy: { userName: 'asc' }
    });

    res.json({
      success: true,
      data: payments,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get payments error:', error);
    logSecurityEvent('GET_PAYMENTS_ERROR', req, { error: error.message });
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
 * /api/v1/payments/{id}/mark-paid:
 *   post:
 *     summary: Mark payment as paid
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment marked as paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:id/mark-paid', [
  param('id').isInt({ min: 1 }).withMessage('Invalid payment ID'),
  handleValidationErrors
], authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await db.prisma.payment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Check if session is still active
    const session = await db.prisma.session.findUnique({
      where: { id: payment.sessionId }
    });

    if (!session || session.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark payment for completed session',
        code: 'SESSION_COMPLETED',
        timestamp: new Date().toISOString()
      });
    }

    const updatedPayment = await db.prisma.payment.update({
      where: { id: parseInt(id) },
      data: { 
        paid: true,
        paidAt: new Date()
      }
    });

    logSecurityEvent('PAYMENT_MARKED_PAID', req, { 
      paymentId: id, 
      userName: payment.userName,
      amount: payment.amount 
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Payment marked as paid successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mark payment paid error:', error);
    logSecurityEvent('MARK_PAYMENT_ERROR', req, { error: error.message, paymentId: req.params.id });
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
 * /api/v1/payments/user-payments:
 *   get:
 *     summary: Get all user payments summary
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of payments to return
 *       - in: query
 *         name: paid
 *         schema:
 *           type: boolean
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: User payments retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/user-payments', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const paidOnly = req.query.paid === 'true';
    const unpaidOnly = req.query.paid === 'false';

    // Get all payments with session info
    const payments = await db.prisma.payment.findMany({
      include: {
        session: {
          select: {
            id: true,
            playDate: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Group by user
    const userPaymentsMap = new Map();

    payments.forEach(payment => {
      if (!userPaymentsMap.has(payment.userId)) {
        userPaymentsMap.set(payment.userId, {
          userId: payment.userId,
          userName: payment.userName,
          payments: [],
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          paidCount: 0,
          unpaidCount: 0
        });
      }

      const userData = userPaymentsMap.get(payment.userId);
      userData.payments.push({
        id: payment.id,
        amount: payment.amount,
        paid: payment.paid,
        paidAt: payment.paidAt,
        sessionDate: payment.session.playDate,
        sessionId: payment.session.id,
        sessionStatus: payment.session.status
      });
      
      userData.totalAmount += payment.amount;
      
      if (payment.paid) {
        userData.paidAmount += payment.amount;
        userData.paidCount++;
      } else {
        userData.unpaidAmount += payment.amount;
        userData.unpaidCount++;
      }
    });

    let userPayments = Array.from(userPaymentsMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Apply filters
    if (paidOnly) {
      userPayments = userPayments.filter(user => user.paidCount > 0);
    } else if (unpaidOnly) {
      userPayments = userPayments.filter(user => user.unpaidCount > 0);
    }

    res.json({
      success: true,
      data: userPayments,
      summary: {
        totalUsers: userPayments.length,
        totalAmount: userPayments.reduce((sum, u) => sum + u.totalAmount, 0),
        totalPaid: userPayments.reduce((sum, u) => sum + u.paidAmount, 0),
        totalUnpaid: userPayments.reduce((sum, u) => sum + u.unpaidAmount, 0)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/v1/payments/user-payments:', error);
    logSecurityEvent('GET_USER_PAYMENTS_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/payments/users/{fbId}/payments:
 *   get:
 *     summary: Get payment history for a specific user
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fbId
 *         required: true
 *         schema:
 *           type: string
 *         description: Facebook ID of the user
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of payments to return
 *     responses:
 *       200:
 *         description: User payment history retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/users/:fbId/payments', [
  param('fbId').notEmpty().withMessage('Facebook ID is required'),
  handleValidationErrors
], authenticateToken, async (req, res) => {
  try {
    const fbId = req.params.fbId;
    const limit = parseInt(req.query.limit) || 30;

    const user = await db.getUserByFbId(fbId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const payments = await db.prisma.payment.findMany({
      where: { userId: user.id },
      include: {
        session: {
          select: {
            id: true,
            playDate: true,
            status: true,
            totalCost: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
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
      data: {
        user: {
          id: user.id,
          fbId: user.fbId,
          name: user.name,
          gender: user.gender
        },
        payments,
        summary
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/v1/payments/users/:fbId/payments:', error);
    logSecurityEvent('GET_USER_PAYMENT_HISTORY_ERROR', req, { error: error.message, fbId: req.params.fbId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
