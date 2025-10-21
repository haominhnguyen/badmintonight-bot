#!/usr/bin/env node

/**
 * Script to check and fix dependency issues
 * Usage: node scripts/fix-dependencies.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

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

function checkPackageJson() {
  log('🔍 Checking package.json...', 'info');
  
  if (!fs.existsSync('package.json')) {
    log('package.json not found', 'error');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for express-validator
  if (packageJson.dependencies && packageJson.dependencies['express-validator']) {
    log('express-validator found in dependencies', 'success');
    return true;
  } else {
    log('express-validator not found in dependencies', 'error');
    return false;
  }
}

function checkNodeModules() {
  log('🔍 Checking node_modules...', 'info');
  
  if (fs.existsSync('node_modules/express-validator')) {
    log('express-validator found in node_modules', 'success');
    return true;
  } else {
    log('express-validator not found in node_modules', 'error');
    return false;
  }
}

function installDependencies() {
  log('📦 Installing dependencies...', 'info');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('Dependencies installed successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to install dependencies: ${error.message}`, 'error');
    return false;
  }
}

function checkDockerfile() {
  log('🔍 Checking Dockerfile...', 'info');
  
  if (!fs.existsSync('Dockerfile')) {
    log('Dockerfile not found', 'error');
    return false;
  }
  
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  
  if (dockerfile.includes('npm ci --legacy-peer-deps')) {
    log('Dockerfile uses correct npm install command', 'success');
    return true;
  } else if (dockerfile.includes('npm ci --only=production')) {
    log('Dockerfile uses production-only install (may cause issues)', 'warning');
    return false;
  } else {
    log('Dockerfile npm install command not found', 'error');
    return false;
  }
}

function generateReport() {
  log('📊 Generating dependency report...', 'info');
  
  const report = {
    timestamp: new Date().toISOString(),
    packageJson: checkPackageJson(),
    nodeModules: checkNodeModules(),
    dockerfile: checkDockerfile()
  };
  
  const totalScore = Object.values(report).filter(Boolean).length;
  const maxScore = Object.keys(report).length - 1; // Exclude timestamp
  
  log(`\n🎯 Dependency Check Score: ${totalScore}/${maxScore}`, totalScore === maxScore ? 'success' : 'warning');
  
  if (totalScore === maxScore) {
    log('🎉 All dependency checks passed!', 'success');
  } else {
    log('⚠️  Some dependency issues found. Attempting to fix...', 'warning');
    
    // Try to fix issues
    if (!report.nodeModules) {
      log('Attempting to install missing dependencies...', 'info');
      if (installDependencies()) {
        log('Dependencies installed successfully', 'success');
      } else {
        log('Failed to install dependencies', 'error');
      }
    }
  }
  
  // Save report
  const reportFile = `dependency-report-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportFile}`, 'info');
  
  return report;
}

function main() {
  console.log(colorize('\n🔧 Dependency Fixer\n', 'cyan'));
  
  const report = generateReport();
  
  console.log(colorize('\n📋 Available Commands:', 'magenta'));
  console.log('  npm install                    - Install dependencies');
  console.log('  npm run docker:test            - Test Docker build');
  console.log('  npm run docker:rebuild         - Rebuild Docker image');
  console.log('  npm run swagger:test           - Test Swagger without DB');
  
  console.log(colorize('\n🔗 Next Steps:', 'magenta'));
  console.log('  1. Run: npm install');
  console.log('  2. Run: npm run docker:test');
  console.log('  3. If successful, deploy with: npm run docker:rebuild');
  
  process.exit(report.packageJson && report.nodeModules && report.dockerfile ? 0 : 1);
}

main();
