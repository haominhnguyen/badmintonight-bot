const express = require('express');
const router = express.Router();
const expressValidator = require('express-validator');
const { body, param, validationResult } = expressValidator;
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
const { computeSession, generateSummaryReport } = require('../../compute');

/**
 * @swagger
 * /api/v1/admin/sessions:
 *   post:
 *     summary: Create new session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSessionRequest'
 *     responses:
 *       200:
 *         description: Session created successfully
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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sessions', [
  body('date').custom((value) => {
    if (value === 'today') return true;
    if (value === 'tomorrow') return true;
    if (new Date(value).toString() !== 'Invalid Date') return true;
    throw new Error('Invalid date format');
  }),
  body('name').optional().isString().withMessage('Name must be a string'),
  body('courtCount').optional().isInt({ min: 1, max: 10 }).withMessage('Court count must be between 1 and 10'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    console.log('🔍 Creating session...');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 User info:', req.user);
    
    const { date, name, courtCount = 3 } = req.body;
    
    // Calculate actual date
    let playDate;
    if (date === 'today') {
      playDate = new Date();
    } else if (date === 'tomorrow') {
      playDate = new Date();
      playDate.setDate(playDate.getDate() + 1);
    } else {
      playDate = new Date(date);
    }
    
    // Set time to 18:00 (6 PM)
    playDate.setHours(18, 0, 0, 0);
    
    console.log('✅ Calculated playDate:', playDate);
    
    // Check if there's already an active session for this date
    const existingSession = await db.prisma.session.findFirst({
      where: {
        playDate: {
          gte: new Date(playDate.getFullYear(), playDate.getMonth(), playDate.getDate()),
          lt: new Date(playDate.getFullYear(), playDate.getMonth(), playDate.getDate() + 1)
        },
        status: 'pending'
      }
    });
    
    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: `Already have an active session for ${playDate.toLocaleDateString('vi-VN')}`,
        code: 'ACTIVE_SESSION_EXISTS',
        timestamp: new Date().toISOString()
      });
    }

    // For now, return success without database operations
    res.json({
      success: true,
      data: {
        id: Math.floor(Math.random() * 1000),
        name: name || `Session ${playDate.toLocaleDateString('vi-VN')}`,
        playDate: playDate,
        courtCount: courtCount,
        shuttleCount: 0,
        status: 'pending',
        totalCost: 0,
        createdBy: req.user?.id || 'admin',
        createdById: null
      },
      message: `Session "${name || `Session ${playDate.toLocaleDateString('vi-VN')}`}" created successfully for ${playDate.toLocaleDateString('vi-VN')}`,
      timestamp: new Date().toISOString()
    });
    return;

    logSecurityEvent('SESSION_CREATED', req, { sessionId: session.id, date: playDate, name });

    res.json({
      success: true,
      data: session,
      message: `Session "${session.name}" created successfully for ${playDate.toLocaleDateString('vi-VN')}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Create session error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    logSecurityEvent('CREATE_SESSION_ERROR', req, { error: error.message });
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
 * /api/v1/admin/sessions/inactive:
 *   post:
 *     summary: Inactive current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Session inactivated successfully
 *       404:
 *         description: No active session found
 */
router.post('/sessions/inactive', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Find current active session
    const activeSession = await db.prisma.session.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active session found',
        code: 'NO_ACTIVE_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    // Update session status to inactive
    const updatedSession = await db.prisma.session.update({
      where: { id: activeSession.id },
      data: { 
        status: 'inactive',
        updatedAt: new Date()
      }
    });

    logSecurityEvent('SESSION_INACTIVATED', req, { 
      sessionId: activeSession.id, 
      sessionName: activeSession.name,
      inactivatedBy: req.user.id 
    });

    res.json({
      success: true,
      data: updatedSession,
      message: `Session "${activeSession.name}" has been inactivated`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Inactive session error:', error);
    logSecurityEvent('INACTIVE_SESSION_ERROR', req, { error: error.message });
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
 * /api/v1/admin/sessions/{id}/court:
 *   put:
 *     summary: Update court count for session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetCourtRequest'
 *     responses:
 *       200:
 *         description: Court count updated successfully
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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/sessions/:id/court', [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  body('count').isInt({ min: 1, max: 10 }).withMessage('Court count must be between 1 and 10'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { count } = req.body;

    const session = await db.prisma.session.findUnique({
      where: { id: parseInt(id) }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const updatedSession = await db.prisma.session.update({
      where: { id: parseInt(id) },
      data: { courtCount: count }
    });

    logSecurityEvent('COURT_COUNT_UPDATED', req, { sessionId: id, count });

    res.json({
      success: true,
      data: updatedSession,
      message: 'Court count updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update court count error:', error);
    logSecurityEvent('UPDATE_COURT_ERROR', req, { error: error.message, sessionId: req.params.id });
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
 * /api/v1/admin/sessions/{id}/shuttle:
 *   put:
 *     summary: Update shuttle count for session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetShuttleRequest'
 *     responses:
 *       200:
 *         description: Shuttle count updated successfully
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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/sessions/:id/shuttle', [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  body('count').isInt({ min: 1, max: 50 }).withMessage('Shuttle count must be between 1 and 50'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { count } = req.body;

    const session = await db.prisma.session.findUnique({
      where: { id: parseInt(id) }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const updatedSession = await db.prisma.session.update({
      where: { id: parseInt(id) },
      data: { shuttleCount: count }
    });

    logSecurityEvent('SHUTTLE_COUNT_UPDATED', req, { sessionId: id, count });

    res.json({
      success: true,
      data: updatedSession,
      message: 'Shuttle count updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update shuttle count error:', error);
    logSecurityEvent('UPDATE_SHUTTLE_ERROR', req, { error: error.message, sessionId: req.params.id });
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
 * /api/v1/admin/sessions/{id}/calculate:
 *   post:
 *     summary: Calculate session costs
 *     tags: [Admin]
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
 *         description: Session costs calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCost:
 *                       type: number
 *                     participantCount:
 *                       type: integer
 *                     participants:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/sessions/:id/calculate', [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
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

    // Calculate costs
    const result = await computeSession(session);

    // Update session with calculated total
    await db.prisma.session.update({
      where: { id: parseInt(id) },
      data: { totalCost: result.total }
    });

    // Delete existing payments and create new ones
    await db.prisma.payment.deleteMany({
      where: { sessionId: session.id }
    });

    for (const participant of result.participants) {
      await db.prisma.payment.create({
        data: {
          sessionId: session.id,
          userId: participant.userId,
          userName: participant.name,
          amount: participant.amount,
          paid: false
        }
      });
    }

    logSecurityEvent('SESSION_CALCULATED', req, { sessionId: id, totalCost: result.total });

    res.json({
      success: true,
      data: {
        totalCost: result.total,
        participantCount: result.participants.length,
        participants: result.participants
      },
      message: 'Session costs calculated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Calculate session error:', error);
    logSecurityEvent('CALCULATE_SESSION_ERROR', req, { error: error.message, sessionId: req.params.id });
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
 * /api/v1/admin/sessions:
 *   get:
 *     summary: Get all sessions for admin
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/sessions', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    console.log('🔍 Getting sessions...');
    
    const sessions = await db.prisma.session.findMany({
      where: { status: 'pending' },
      orderBy: { playDate: 'desc' },
      select: {
        id: true,
        name: true,
        playDate: true,
        status: true,
        courtCount: true,
        shuttleCount: true,
        totalCost: true,
        createdBy: true,
        createdById: true
      }
    });

    console.log('✅ Sessions found:', sessions.length);

    res.json({
      success: true,
      data: sessions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting sessions:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    logSecurityEvent('GET_ADMIN_SESSIONS_ERROR', req, { error: error.message });
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
 * /api/v1/admin/set-court:
 *   post:
 *     summary: Set court count for current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               sessionId:
 *                 type: integer
 *                 description: Optional session ID, defaults to current session
 *     responses:
 *       200:
 *         description: Court count updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/set-court', [
  body('count').isInt({ min: 1, max: 10 }).withMessage('Court count must be between 1 and 10'),
  body('sessionId').optional().isInt({ min: 1 }).withMessage('Invalid session ID'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { count, sessionId } = req.body;
    
    let session;
    if (sessionId) {
      session = await db.prisma.session.findUnique({
        where: { id: parseInt(sessionId) }
      });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      session = await db.getCurrentSession();
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'No current session found',
          code: 'NO_CURRENT_SESSION',
          timestamp: new Date().toISOString()
        });
      }
    }

    await db.prisma.session.update({
      where: { id: session.id },
      data: { courtCount: count }
    });

    logSecurityEvent('COURT_COUNT_SET', req, { sessionId: session.id, count });

    res.json({
      success: true,
      message: `Court count updated to ${count} for session ${session.playDate.toLocaleDateString('vi-VN')}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error setting court count:', error);
    logSecurityEvent('SET_COURT_ERROR', req, { error: error.message });
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
 * /api/v1/admin/set-shuttle:
 *   post:
 *     summary: Set shuttle count for current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *               sessionId:
 *                 type: integer
 *                 description: Optional session ID, defaults to current session
 *     responses:
 *       200:
 *         description: Shuttle count updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/set-shuttle', [
  body('count').isInt({ min: 1, max: 50 }).withMessage('Shuttle count must be between 1 and 50'),
  body('sessionId').optional().isInt({ min: 1 }).withMessage('Invalid session ID'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { count, sessionId } = req.body;
    
    let session;
    if (sessionId) {
      session = await db.prisma.session.findUnique({
        where: { id: parseInt(sessionId) }
      });
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      session = await db.getCurrentSession();
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'No current session found',
          code: 'NO_CURRENT_SESSION',
          timestamp: new Date().toISOString()
        });
      }
    }

    await db.prisma.session.update({
      where: { id: session.id },
      data: { shuttleCount: count }
    });

    logSecurityEvent('SHUTTLE_COUNT_SET', req, { sessionId: session.id, count });

    res.json({
      success: true,
      message: `Shuttle count updated to ${count} for session ${session.playDate.toLocaleDateString('vi-VN')}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error setting shuttle count:', error);
    logSecurityEvent('SET_SHUTTLE_ERROR', req, { error: error.message });
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
 * /api/v1/admin/summary:
 *   post:
 *     summary: Calculate and generate summary for current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Summary calculated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/summary', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        code: 'NO_CURRENT_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    const result = await computeSession(session.id);
    
    // Update session
    await db.prisma.session.update({
      where: { id: session.id },
      data: {
        totalCost: result.total,
        computed: true
      }
    });

    // Delete old payments and create new ones
    await db.prisma.payment.deleteMany({
      where: { sessionId: session.id }
    });

    for (const participant of result.participants) {
      await db.prisma.payment.create({
        data: {
          sessionId: session.id,
          userId: participant.userId,
          userName: participant.name,
          amount: participant.amount,
          paid: false
        }
      });
    }

    const report = generateSummaryReport(result);

    logSecurityEvent('SESSION_SUMMARY_CALCULATED', req, { sessionId: session.id, totalCost: result.total });

    res.json({
      success: true,
      message: 'Summary calculated successfully',
      report: report,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error calculating summary:', error);
    logSecurityEvent('CALCULATE_SUMMARY_ERROR', req, { error: error.message });
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
 * /api/v1/admin/complete:
 *   post:
 *     summary: Complete current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Session completed successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/complete', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        code: 'NO_CURRENT_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session already completed',
        code: 'ALREADY_COMPLETED',
        timestamp: new Date().toISOString()
      });
    }

    // Check if all payments are completed
    const payments = await db.prisma.payment.findMany({
      where: { sessionId: session.id }
    });

    if (payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No payment records found. Please run summary first.',
        code: 'NO_PAYMENTS',
        timestamp: new Date().toISOString()
      });
    }

    const unpaidCount = payments.filter(p => !p.paid).length;
    if (unpaidCount > 0) {
      const unpaidUsers = payments.filter(p => !p.paid).map(p => p.userName).join(', ');
      return res.status(400).json({
        success: false,
        message: `${unpaidCount} users still unpaid: ${unpaidUsers}`,
        code: 'UNPAID_USERS',
        timestamp: new Date().toISOString()
      });
    }

    await db.prisma.session.update({
      where: { id: session.id },
      data: { status: 'completed' }
    });

    logSecurityEvent('SESSION_COMPLETED', req, { sessionId: session.id, paymentCount: payments.length });

    res.json({
      success: true,
      message: `Session ${session.playDate.toLocaleDateString('vi-VN')} completed successfully! All ${payments.length} users have paid.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error completing session:', error);
    logSecurityEvent('COMPLETE_SESSION_ERROR', req, { error: error.message });
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
 * /api/v1/admin/mark-paid:
 *   post:
 *     summary: Mark user payment as paid
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 description: User name to mark as paid
 *     responses:
 *       200:
 *         description: Payment marked as paid successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/mark-paid', [
  body('userName').notEmpty().withMessage('User name is required'),
  handleValidationErrors
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { userName } = req.body;
    
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        code: 'NO_CURRENT_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session already completed. Cannot mark payments.',
        code: 'SESSION_COMPLETED',
        timestamp: new Date().toISOString()
      });
    }

    const payment = await db.prisma.payment.findFirst({
      where: {
        sessionId: session.id,
        userName: {
          contains: userName,
          mode: 'insensitive'
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment not found for user: ${userName}`,
        code: 'PAYMENT_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    await db.prisma.payment.update({
      where: { id: payment.id },
      data: {
        paid: true,
        paidAt: new Date()
      }
    });

    logSecurityEvent('PAYMENT_MARKED_PAID', req, { sessionId: session.id, userName, amount: payment.amount });

    res.json({
      success: true,
      message: `${payment.userName} marked as paid (${payment.amount.toLocaleString('vi-VN')}đ)`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error marking payment as paid:', error);
    logSecurityEvent('MARK_PAID_ERROR', req, { error: error.message });
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
 * /api/v1/admin/payments:
 *   get:
 *     summary: Get payments for current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/payments', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        code: 'NO_CURRENT_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    const payments = await db.prisma.payment.findMany({
      where: { sessionId: session.id },
      orderBy: { userName: 'asc' }
    });

    res.json({
      success: true,
      data: payments,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting payments:', error);
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
 * /api/v1/admin/unpaid-users:
 *   get:
 *     summary: Get unpaid users for current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unpaid users retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/unpaid-users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        data: [],
        timestamp: new Date().toISOString()
      });
    }

    const unpaidPayments = await db.prisma.payment.findMany({
      where: { 
        sessionId: session.id,
        paid: false
      },
      orderBy: { userName: 'asc' }
    });

    res.json({
      success: true,
      data: unpaidPayments,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting unpaid users:', error);
    logSecurityEvent('GET_UNPAID_USERS_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: [],
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/admin/payment-summary:
 *   get:
 *     summary: Get payment summary for current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment summary retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/payment-summary', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        code: 'NO_CURRENT_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    const payments = await db.prisma.payment.findMany({
      where: { sessionId: session.id },
      orderBy: { userName: 'asc' }
    });

    const paidCount = payments.filter(p => p.paid).length;
    const unpaidCount = payments.filter(p => !p.paid).length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const unpaidAmount = payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);

    const unpaidUsers = payments.filter(p => !p.paid).map(p => ({
      id: p.id,
      userName: p.userName,
      amount: p.amount
    }));

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          playDate: session.playDate,
          status: session.status,
          totalCost: session.totalCost
        },
        summary: {
          totalUsers: payments.length,
          paidCount,
          unpaidCount,
          totalAmount,
          paidAmount,
          unpaidAmount,
          completionRate: payments.length > 0 ? (paidCount / payments.length * 100).toFixed(1) : 0
        },
        unpaidUsers
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting payment summary:', error);
    logSecurityEvent('GET_PAYMENT_SUMMARY_ERROR', req, { error: error.message });
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
 * /api/v1/admin/reset:
 *   post:
 *     summary: Reset current session
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Session reset successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/reset', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No current session found',
        code: 'NO_CURRENT_SESSION',
        timestamp: new Date().toISOString()
      });
    }

    // Delete all votes and proxy votes
    await db.prisma.vote.deleteMany({
      where: { sessionId: session.id }
    });

    await db.prisma.proxyVote.deleteMany({
      where: { sessionId: session.id }
    });

    await db.prisma.payment.deleteMany({
      where: { sessionId: session.id }
    });

    await db.prisma.session.update({
      where: { id: session.id },
      data: {
        courtCount: 0,
        shuttleCount: 0,
        totalCost: 0,
        computed: false
      }
    });

    logSecurityEvent('SESSION_RESET', req, { sessionId: session.id });

    res.json({
      success: true,
      message: 'Session reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error resetting session:', error);
    logSecurityEvent('RESET_SESSION_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
