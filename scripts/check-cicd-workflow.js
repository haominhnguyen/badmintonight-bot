#!/usr/bin/env node

/**
 * Script to check CI/CD workflow configuration and simulate deployment
 * Usage: node scripts/check-cicd-workflow.js
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

function checkCICDWorkflow() {
  log('🔍 Checking CI/CD Workflow Configuration...', 'info');
  
  const workflowFile = '.github/workflows/ci-cd.yml';
  
  if (!fs.existsSync(workflowFile)) {
    log('CI/CD workflow file not found', 'error');
    return false;
  }
  
  const content = fs.readFileSync(workflowFile, 'utf8');
  
  // Check for required steps
  const requiredSteps = [
    'Update version metadata',
    'Version check production',
    'dockerfile: Dockerfile.arm64',
    'docker/build-push-action',
    'appleboy/ssh-action'
  ];
  
  let score = 0;
  requiredSteps.forEach(step => {
    if (content.includes(step)) {
      log(`Found: ${step}`, 'success');
      score++;
    } else {
      log(`Missing: ${step}`, 'error');
    }
  });
  
  log(`CI/CD Workflow Score: ${score}/${requiredSteps.length}`, score === requiredSteps.length ? 'success' : 'warning');
  return score === requiredSteps.length;
}

function checkVersionUpdateStep() {
  log('🔍 Checking Version Update Step...', 'info');
  
  const workflowFile = '.github/workflows/ci-cd.yml';
  const content = fs.readFileSync(workflowFile, 'utf8');
  
  // Check if version update step exists and is properly configured
  if (content.includes('Update version metadata')) {
    log('Version metadata update step exists', 'success');
    
    // Check if it runs the correct command
    if (content.includes('node scripts/update-version.js')) {
      log('Version update script is correctly referenced', 'success');
      return true;
    } else {
      log('Version update script not found in workflow', 'warning');
      return false;
    }
  } else {
    log('Version metadata update step not found', 'error');
    return false;
  }
}

function checkVersionCheckStep() {
  log('🔍 Checking Version Check Step...', 'info');
  
  const workflowFile = '.github/workflows/ci-cd.yml';
  const content = fs.readFileSync(workflowFile, 'utf8');
  
  // Check if version check step exists
  if (content.includes('Version check production')) {
    log('Version check step exists', 'success');
    
    // Check if it checks the correct API endpoint
    if (content.includes('/api/v1/version')) {
      log('Version API endpoint is correctly referenced', 'success');
      return true;
    } else {
      log('Version API endpoint not found in workflow', 'warning');
      return false;
    }
  } else {
    log('Version check step not found', 'error');
    return false;
  }
}

function checkDockerBuildStep() {
  log('🔍 Checking Docker Build Step...', 'info');
  
  const workflowFile = '.github/workflows/ci-cd.yml';
  const content = fs.readFileSync(workflowFile, 'utf8');
  
  // Check if Docker build uses correct dockerfile
  if (content.includes('file: Dockerfile.arm64')) {
    log('Docker build uses Dockerfile.arm64', 'success');
    return true;
  } else {
    log('Docker build does not specify Dockerfile.arm64', 'warning');
    return false;
  }
}

function simulateDeploymentSteps() {
  log('🚀 Simulating Deployment Steps...', 'info');
  
  const steps = [
    '1. Checkout code',
    '2. Update version metadata',
    '3. Build Docker image',
    '4. Push Docker image',
    '5. Deploy to production',
    '6. Health check',
    '7. Version check',
    '8. Send notification'
  ];
  
  steps.forEach((step, index) => {
    setTimeout(() => {
      log(`Step ${index + 1}: ${step}`, 'info');
    }, index * 500);
  });
  
  return new Promise(resolve => {
    setTimeout(() => {
      log('Simulation completed', 'success');
      resolve(true);
    }, steps.length * 500);
  });
}

function generateCICDReport() {
  log('📊 Generating CI/CD Report...', 'info');
  
  const report = {
    timestamp: new Date().toISOString(),
    workflow: checkCICDWorkflow(),
    versionUpdate: checkVersionUpdateStep(),
    versionCheck: checkVersionCheckStep(),
    dockerBuild: checkDockerBuildStep()
  };
  
  const totalScore = Object.values(report).filter(Boolean).length;
  const maxScore = Object.keys(report).length - 1; // Exclude timestamp
  
  log(`\n🎯 CI/CD Configuration Score: ${totalScore}/${maxScore}`, totalScore === maxScore ? 'success' : 'warning');
  
  if (totalScore === maxScore) {
    log('🎉 CI/CD workflow is properly configured!', 'success');
  } else {
    log('⚠️  Some CI/CD configuration issues found. Please review above.', 'warning');
  }
  
  // Save report to file
  const reportFile = `cicd-report-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportFile}`, 'info');
  
  return report;
}

async function main() {
  console.log(colorize('\n🚀 CI/CD Workflow Checker\n', 'cyan'));
  
  const report = generateCICDReport();
  
  console.log(colorize('\n📚 Available Commands:', 'magenta'));
  console.log('  npm run version:update        - Update version metadata');
  console.log('  npm run version:check         - Check version API');
  console.log('  npm run deployment:status     - Check deployment status');
  console.log('  npm run version:force-cleanup - Clean up duplicate version info');
  
  console.log(colorize('\n🔗 CI/CD Workflow:', 'magenta'));
  console.log('  GitHub Actions: .github/workflows/ci-cd.yml');
  console.log('  Triggers: push to main, workflow_dispatch');
  console.log('  Steps: test → build → deploy → version-check');
  
  console.log(colorize('\n🌐 Production URLs:', 'magenta'));
  console.log('  Main App: https://haominhnguyen.shop');
  console.log('  Version API: https://haominhnguyen.shop/api/v1/version');
  console.log('  Admin Panel: https://haominhnguyen.shop/admin.html');
  
  // Simulate deployment steps
  await simulateDeploymentSteps();
  
  process.exit(report.workflow && report.versionUpdate && report.versionCheck && report.dockerBuild ? 0 : 1);
}

// Run main function
main();
