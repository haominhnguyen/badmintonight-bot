const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const sessionRoutes = require('./sessions');
const adminRoutes = require('./admin');
const paymentRoutes = require('./payments');
const statisticsRoutes = require('./statistics');
const healthRoutes = require('./health');
const cronRoutes = require('./cron');
const publicRoutes = require('./public');

// API Version middleware
router.use((req, res, next) => {
  req.apiVersion = 'v1';
  res.set('API-Version', 'v1');
  next();
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/health', healthRoutes);
router.use('/cron', cronRoutes);
router.use('/public', publicRoutes);

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      name: 'Badminton Bot API',
      description: 'Professional API for Badminton Bot - Money Management System',
      endpoints: {
        auth: '/api/v1/auth',
        sessions: '/api/v1/sessions',
        admin: '/api/v1/admin',
        payments: '/api/v1/payments',
        statistics: '/api/v1/statistics',
        health: '/api/v1/health',
        cron: '/api/v1/cron'
      },
      documentation: '/api-docs',
      status: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
