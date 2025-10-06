const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  authorizeAdmin,
  logSecurityEvent 
} = require('../../middleware/auth');
const cron = require('../../cron');

/**
 * @swagger
 * /api/v1/cron/status:
 *   get:
 *     summary: Get cron job status
 *     tags: [Cron]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cron status retrieved successfully
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
 *                     running:
 *                       type: boolean
 *                     jobs:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = cron.getJobStatus();
    
    res.json({
      success: true,
      data: {
        running: cron.isRunning,
        jobs: status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting cron status:', error);
    logSecurityEvent('GET_CRON_STATUS_ERROR', req, { error: error.message });
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
 * /api/v1/cron/vote-now:
 *   post:
 *     summary: Send vote now message
 *     tags: [Cron]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vote message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/vote-now', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await cron.sendVoteNow();
    
    logSecurityEvent('VOTE_NOW_TRIGGERED', req, {});
    
    res.json({
      success: true,
      message: 'Vote message sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending vote now:', error);
    logSecurityEvent('SEND_VOTE_NOW_ERROR', req, { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
