const express = require('express');
const router = express.Router();
const { getHealthData } = require('../../middleware/monitoring');

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: string
 *                   example: 2h 30m 15s
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: string
 *                       example: 45 MB
 *                     total:
 *                       type: string
 *                       example: 128 MB
 *                     external:
 *                       type: string
 *                       example: 12 MB
 *                 api:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                     successfulRequests:
 *                       type: integer
 *                     failedRequests:
 *                       type: integer
 *                     averageResponseTime:
 *                       type: number
 *                     successRate:
 *                       type: string
 *                     errorRate:
 *                       type: string
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 nodeVersion:
 *                   type: string
 *                   example: v18.17.0
 *                 platform:
 *                   type: string
 *                   example: linux
 */
router.get('/', (req, res) => {
  const healthData = getHealthData();
  res.json(healthData);
});

module.exports = router;
