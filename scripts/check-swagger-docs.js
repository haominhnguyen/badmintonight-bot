#!/usr/bin/env node

/**
 * Script to check and test Swagger documentation
 * Usage: node scripts/check-swagger-docs.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  const color = type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'blue';
  console.log(colorize(`${prefix} [${timestamp}] ${message}`, color));
}

function checkSwaggerConfig() {
  log('🔍 Checking Swagger Configuration...', 'info');
  
  const swaggerFile = 'src/swagger.js';
  
  if (!fs.existsSync(swaggerFile)) {
    log('Swagger configuration file not found', 'error');
    return false;
  }
  
  const content = fs.readFileSync(swaggerFile, 'utf8');
  
  // Check for required components
  const requiredComponents = [
    'apis: [',
    'tags: [',
    'schemas: {',
    'securitySchemes: {',
    'BearerAuth: {',
    'ApiKeyAuth: {'
  ];
  
  let score = 0;
  requiredComponents.forEach(component => {
    if (content.includes(component)) {
      log(`Found: ${component}`, 'success');
      score++;
    } else {
      log(`Missing: ${component}`, 'error');
    }
  });
  
  log(`Swagger Configuration Score: ${score}/${requiredComponents.length}`, score === requiredComponents.length ? 'success' : 'warning');
  return score === requiredComponents.length;
}

function checkApiFiles() {
  log('🔍 Checking API Files...', 'info');
  
  const apiFiles = [
    'src/api/v1/auth.js',
    'src/api/v1/sessions.js',
    'src/api/v1/admin.js',
    'src/api/v1/payments.js',
    'src/api/v1/statistics.js',
    'src/api/v1/health.js',
    'src/api/v1/cron.js',
    'src/api/v1/public.js',
    'src/api/v1/version.js',
    'src/api/v1/index.js'
  ];
  
  let score = 0;
  apiFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`Found: ${file}`, 'success');
      score++;
    } else {
      log(`Missing: ${file}`, 'error');
    }
  });
  
  log(`API Files Score: ${score}/${apiFiles.length}`, score === apiFiles.length ? 'success' : 'warning');
  return score === apiFiles.length;
}

function checkSwaggerAnnotations() {
  log('🔍 Checking Swagger Annotations...', 'info');
  
  const apiFiles = [
    'src/api/v1/auth.js',
    'src/api/v1/sessions.js',
    'src/api/v1/admin.js',
    'src/api/v1/payments.js',
    'src/api/v1/statistics.js',
    'src/api/v1/health.js',
    'src/api/v1/cron.js',
    'src/api/v1/public.js',
    'src/api/v1/version.js'
  ];
  
  let totalEndpoints = 0;
  let documentedEndpoints = 0;
  
  apiFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Count router endpoints
      const routerMatches = content.match(/router\.(get|post|put|delete|patch)\(/g);
      if (routerMatches) {
        totalEndpoints += routerMatches.length;
      }
      
      // Count swagger annotations
      const swaggerMatches = content.match(/\/\*\*[\s\S]*?@swagger[\s\S]*?\*\//g);
      if (swaggerMatches) {
        documentedEndpoints += swaggerMatches.length;
      }
      
      log(`File ${file}: ${routerMatches ? routerMatches.length : 0} endpoints, ${swaggerMatches ? swaggerMatches.length : 0} documented`, 'info');
    }
  });
  
  const documentationRate = totalEndpoints > 0 ? (documentedEndpoints / totalEndpoints * 100).toFixed(1) : 0;
  
  log(`Total Endpoints: ${totalEndpoints}`, 'info');
  log(`Documented Endpoints: ${documentedEndpoints}`, 'info');
  log(`Documentation Rate: ${documentationRate}%`, documentationRate >= 80 ? 'success' : 'warning');
  
  return documentationRate >= 80;
}

function checkSwaggerTags() {
  log('🔍 Checking Swagger Tags...', 'info');
  
  const swaggerFile = 'src/swagger.js';
  const content = fs.readFileSync(swaggerFile, 'utf8');
  
  const expectedTags = [
    'Authentication',
    'Sessions',
    'Admin',
    'Payments',
    'Statistics',
    'Health',
    'Cron',
    'Public',
    'System'
  ];
  
  let score = 0;
  expectedTags.forEach(tag => {
    if (content.includes(`name: '${tag}'`)) {
      log(`Found tag: ${tag}`, 'success');
      score++;
    } else {
      log(`Missing tag: ${tag}`, 'error');
    }
  });
  
  log(`Swagger Tags Score: ${score}/${expectedTags.length}`, score === expectedTags.length ? 'success' : 'warning');
  return score === expectedTags.length;
}

function checkSwaggerSchemas() {
  log('🔍 Checking Swagger Schemas...', 'info');
  
  const swaggerFile = 'src/swagger.js';
  const content = fs.readFileSync(swaggerFile, 'utf8');
  
  const expectedSchemas = [
    'LoginRequest',
    'LoginResponse',
    'CreateSessionRequest',
    'SetCourtRequest',
    'SetShuttleRequest',
    'StatisticsOverview',
    'ValidationError',
    'UnauthorizedError',
    'ForbiddenError',
    'NotFoundError',
    'InternalServerError',
    'RateLimitError'
  ];
  
  let score = 0;
  expectedSchemas.forEach(schema => {
    if (content.includes(`${schema}: {`)) {
      log(`Found schema: ${schema}`, 'success');
      score++;
    } else {
      log(`Missing schema: ${schema}`, 'error');
    }
  });
  
  log(`Swagger Schemas Score: ${score}/${expectedSchemas.length}`, score === expectedSchemas.length ? 'success' : 'warning');
  return score === expectedSchemas.length;
}

function generateSwaggerReport() {
  log('📊 Generating Swagger Documentation Report...', 'info');
  
  const report = {
    timestamp: new Date().toISOString(),
    config: checkSwaggerConfig(),
    apiFiles: checkApiFiles(),
    annotations: checkSwaggerAnnotations(),
    tags: checkSwaggerTags(),
    schemas: checkSwaggerSchemas()
  };
  
  const totalScore = Object.values(report).filter(Boolean).length;
  const maxScore = Object.keys(report).length - 1; // Exclude timestamp
  
  log(`\n🎯 Swagger Documentation Score: ${totalScore}/${maxScore}`, totalScore === maxScore ? 'success' : 'warning');
  
  if (totalScore === maxScore) {
    log('🎉 Swagger documentation is complete!', 'success');
  } else {
    log('⚠️  Some Swagger documentation issues found. Please review above.', 'warning');
  }
  
  // Save report to file
  const reportFile = `swagger-report-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportFile}`, 'info');
  
  return report;
}

function listAllEndpoints() {
  log('📋 Listing All API Endpoints...', 'info');
  
  const endpoints = [
    // Authentication
    'POST /api/v1/auth/login',
    'GET /api/v1/auth/verify',
    'POST /api/v1/auth/refresh',
    
    // Sessions
    'GET /api/v1/sessions',
    'GET /api/v1/sessions/:id',
    'GET /api/v1/sessions/:id/payments',
    
    // Admin
    'POST /api/v1/admin/sessions',
    'POST /api/v1/admin/sessions/inactive',
    'PUT /api/v1/admin/sessions/:id/court',
    'PUT /api/v1/admin/sessions/:id/shuttle',
    'POST /api/v1/admin/sessions/:id/calculate',
    'GET /api/v1/admin/sessions',
    'POST /api/v1/admin/set-court',
    'POST /api/v1/admin/set-shuttle',
    'POST /api/v1/admin/summary',
    'POST /api/v1/admin/complete',
    'POST /api/v1/admin/mark-paid',
    'GET /api/v1/admin/payments',
    'GET /api/v1/admin/unpaid-users',
    'GET /api/v1/admin/payment-summary',
    'POST /api/v1/admin/reset',
    
    // Payments
    'GET /api/v1/payments',
    'POST /api/v1/payments/:id/mark-paid',
    'GET /api/v1/payments/user-payments',
    'GET /api/v1/payments/users/:fbId/payments',
    
    // Statistics
    'GET /api/v1/statistics/overview',
    
    // Health
    'GET /api/v1/health',
    
    // Cron
    'GET /api/v1/cron/status',
    'POST /api/v1/cron/vote-now',
    
    // Public
    'GET /api/v1/public/sessions',
    'GET /api/v1/public/sessions/:id',
    'GET /api/v1/public/statistics/overview',
    'GET /api/v1/public/payments/user-payments',
    'GET /api/v1/public/admin/sessions',
    'GET /api/v1/public/admin/payment-summary',
    
    // System
    'GET /api/v1/version',
    'GET /api/v1/version/health',
    'POST /api/v1/version/deploy',
    
    // API Info
    'GET /api/v1/'
  ];
  
  log(`Total API Endpoints: ${endpoints.length}`, 'info');
  
  console.log(colorize('\n📚 API Endpoints by Category:', 'magenta'));
  
  const categories = {
    'Authentication': endpoints.filter(e => e.includes('/auth/')),
    'Sessions': endpoints.filter(e => e.includes('/sessions') && !e.includes('/admin/')),
    'Admin': endpoints.filter(e => e.includes('/admin/')),
    'Payments': endpoints.filter(e => e.includes('/payments') && !e.includes('/admin/')),
    'Statistics': endpoints.filter(e => e.includes('/statistics')),
    'Health': endpoints.filter(e => e.includes('/health')),
    'Cron': endpoints.filter(e => e.includes('/cron/')),
    'Public': endpoints.filter(e => e.includes('/public/')),
    'System': endpoints.filter(e => e.includes('/version')),
    'API Info': endpoints.filter(e => e === 'GET /api/v1/')
  };
  
  Object.entries(categories).forEach(([category, categoryEndpoints]) => {
    if (categoryEndpoints.length > 0) {
      console.log(colorize(`\n${category}:`, 'cyan'));
      categoryEndpoints.forEach(endpoint => {
        console.log(`  ${endpoint}`);
      });
    }
  });
}

async function main() {
  console.log(colorize('\n📚 Swagger Documentation Checker\n', 'cyan'));
  
  const report = generateSwaggerReport();
  
  console.log(colorize('\n📋 Available Commands:', 'magenta'));
  console.log('  npm run version:update        - Update version metadata');
  console.log('  npm run version:check         - Check version API');
  console.log('  npm run deployment:status     - Check deployment status');
  console.log('  npm run cicd:workflow         - Check CI/CD workflow');
  
  console.log(colorize('\n🔗 Swagger Documentation:', 'magenta'));
  console.log('  Local: http://localhost:3100/api-docs');
  console.log('  Production: https://haominhnguyen.shop/api-docs');
  
  console.log(colorize('\n🌐 API Base URLs:', 'magenta'));
  console.log('  Development: http://localhost:3100/api/v1');
  console.log('  Production: https://haominhnguyen.shop/api/v1');
  
  // List all endpoints
  listAllEndpoints();
  
  process.exit(report.config && report.apiFiles && report.annotations && report.tags && report.schemas ? 0 : 1);
}

// Run main function
main();
