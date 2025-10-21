const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * @swagger
 * /api/v1/version:
 *   get:
 *     summary: Get application version and deployment info
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Version information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                     buildTime:
 *                       type: string
 *                     gitCommit:
 *                       type: string
 *                     gitBranch:
 *                       type: string
 *                     nodeVersion:
 *                       type: string
 *                     environment:
 *                       type: string
 *                     uptime:
 *                       type: string
 *                     lastDeploy:
 *                       type: string
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/', async (req, res) => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
    const startTime = process.uptime();
    
    // Get git information if available
    let gitCommit = 'unknown';
    let gitBranch = 'unknown';
    
    try {
      const { execSync } = require('child_process');
      gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.log('Git information not available:', error.message);
    }
    
    // Get build time from environment or current time
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();
    
    // Get last deploy time from environment or current time
    const lastDeploy = process.env.LAST_DEPLOY_TIME || new Date().toISOString();
    
    // Format uptime
    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
      if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    };
    
    const versionInfo = {
      version: packageJson.version,
      buildTime: buildTime,
      gitCommit: gitCommit,
      gitBranch: gitBranch,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: formatUptime(startTime),
      lastDeploy: lastDeploy,
      features: [
        'Badminton Session Management',
        'Payment Tracking',
        'User Statistics',
        'Admin Panel',
        'API Documentation',
        'Real-time Updates',
        'Mobile Responsive',
        'Security Features'
      ],
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: versionInfo,
      message: 'Version information retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting version info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve version information',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/version/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     uptime:
 *                       type: string
 */
router.get('/health', (req, res) => {
  const uptime = process.uptime();
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };
  
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: formatUptime(uptime),
      environment: process.env.NODE_ENV || 'development'
    },
    message: 'Application is running'
  });
});

/**
 * @swagger
 * /api/v1/version/deploy:
 *   post:
 *     summary: Update deployment information
 *     tags: [System]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deployTime:
 *                 type: string
 *               gitCommit:
 *                 type: string
 *               gitBranch:
 *                 type: string
 *               buildNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deployment information updated
 */
router.post('/deploy', (req, res) => {
  try {
    const { deployTime, gitCommit, gitBranch, buildNumber } = req.body;
    
    // Update environment variables
    if (deployTime) process.env.LAST_DEPLOY_TIME = deployTime;
    if (gitCommit) process.env.GIT_COMMIT = gitCommit;
    if (gitBranch) process.env.GIT_BRANCH = gitBranch;
    if (buildNumber) process.env.BUILD_NUMBER = buildNumber;
    
    res.json({
      success: true,
      data: {
        deployTime: deployTime || new Date().toISOString(),
        gitCommit: gitCommit || 'unknown',
        gitBranch: gitBranch || 'unknown',
        buildNumber: buildNumber || 'unknown'
      },
      message: 'Deployment information updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating deployment info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deployment information',
      message: error.message
    });
  }
});

module.exports = router;
