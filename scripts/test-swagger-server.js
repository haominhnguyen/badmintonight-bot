#!/usr/bin/env node

/**
 * Test server for Swagger documentation without database
 * Usage: node scripts/test-swagger-server.js
 */

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../src/swagger');

const app = express();
const PORT = 3100;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Badminton Bot API Documentation'
}));

// Mock API endpoints for testing
app.get('/api/v1/version', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.1',
      buildTime: new Date().toISOString(),
      gitCommit: 'test-commit',
      gitBranch: 'main',
      nodeVersion: process.version,
      environment: 'test',
      uptime: '0s',
      lastDeploy: new Date().toISOString(),
      features: ['Test Mode'],
      status: 'healthy'
    },
    message: 'Version information retrieved successfully'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: '0s',
    memory: {
      used: '45 MB',
      total: '128 MB',
      external: '12 MB'
    },
    api: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      successRate: '100%',
      errorRate: '0%'
    },
    version: '1.0.1',
    nodeVersion: process.version,
    platform: process.platform
  });
});

app.get('/api/v1/', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.1',
      name: 'Badminton Bot API',
      description: 'Professional API for Badminton Bot - Money Management System',
      endpoints: {
        auth: '/api/v1/auth',
        sessions: '/api/v1/sessions',
        admin: '/api/v1/admin',
        payments: '/api/v1/payments',
        statistics: '/api/v1/statistics',
        health: '/api/v1/health',
        cron: '/api/v1/cron',
        version: '/api/v1/version'
      },
      documentation: '/api-docs',
      status: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Badminton Bot API - Test Server',
    version: '1.0.1',
    documentation: '/api-docs',
    health: '/api/v1/health',
    status: 'running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`📚 Swagger Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🔗 API Info: http://localhost:${PORT}/api/v1/`);
  console.log(`\n✅ Server started successfully!`);
  console.log(`📖 You can now view the complete Swagger documentation at: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
