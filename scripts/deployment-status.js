#!/usr/bin/env node

/**
 * Comprehensive deployment status checker
 * Usage: node scripts/deployment-status.js
 */

const fs = require('fs');
const path = require('path');
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

function checkFile(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      log(`${description}: ${filePath}`, 'success');
      return true;
    } else {
      log(`${description}: ${filePath} - NOT FOUND`, 'error');
      return false;
    }
  } catch (error) {
    log(`${description}: ${filePath} - ERROR: ${error.message}`, 'error');
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(searchText)) {
        log(`${description}: Found "${searchText}"`, 'success');
        return true;
      } else {
        log(`${description}: "${searchText}" not found`, 'warning');
        return false;
      }
    } else {
      log(`${description}: File not found`, 'error');
      return false;
    }
  } catch (error) {
    log(`${description}: Error reading file - ${error.message}`, 'error');
    return false;
  }
}

function checkDockerConfiguration() {
  log('🐳 Checking Docker Configuration...', 'info');
  
  const dockerChecks = [
    { file: 'Dockerfile', content: 'COPY public ./public', desc: 'Dockerfile public copy' },
    { file: 'Dockerfile.arm64', content: 'COPY public ./public', desc: 'Dockerfile.arm64 public copy' },
    { file: 'docker-compose.prod.yml', content: 'dockerfile: Dockerfile.arm64', desc: 'docker-compose.prod.yml dockerfile' }
  ];
  
  let dockerScore = 0;
  dockerChecks.forEach(check => {
    if (checkFileContent(check.file, check.content, check.desc)) {
      dockerScore++;
    }
  });
  
  log(`Docker Configuration Score: ${dockerScore}/${dockerChecks.length}`, dockerScore === dockerChecks.length ? 'success' : 'warning');
  return dockerScore === dockerChecks.length;
}

function checkVersionAPI() {
  log('📊 Checking Version API...', 'info');
  
  const versionChecks = [
    { file: 'src/api/v1/version.js', desc: 'Version API file' },
    { file: 'src/api/v1/index.js', content: 'versionRoutes', desc: 'Version routes registration' }
  ];
  
  let versionScore = 0;
  versionChecks.forEach(check => {
    if (check.content) {
      if (checkFileContent(check.file, check.content, check.desc)) {
        versionScore++;
      }
    } else {
      if (checkFile(check.file, check.desc)) {
        versionScore++;
      }
    }
  });
  
  log(`Version API Score: ${versionScore}/${versionChecks.length}`, versionScore === versionChecks.length ? 'success' : 'warning');
  return versionScore === versionChecks.length;
}

function checkHTMLFiles() {
  log('🌐 Checking HTML Files...', 'info');
  
  const htmlFiles = [
    'public/index.html',
    'public/admin.html',
    'public/login.html',
    'public/session.html'
  ];
  
  let htmlScore = 0;
  htmlFiles.forEach(file => {
    if (checkFileContent(file, 'meta name="version"', `Version metadata in ${file}`)) {
      htmlScore++;
    }
  });
  
  log(`HTML Files Score: ${htmlScore}/${htmlFiles.length}`, htmlScore === htmlFiles.length ? 'success' : 'warning');
  return htmlScore === htmlFiles.length;
}

function checkScripts() {
  log('📜 Checking Deployment Scripts...', 'info');
  
  const scripts = [
    'scripts/update-version.js',
    'scripts/check-version.js',
    'scripts/fix-deployment.sh',
    'scripts/check-docker-build.sh',
    'scripts/check-cicd.sh'
  ];
  
  let scriptScore = 0;
  scripts.forEach(script => {
    if (checkFile(script, `Script: ${script}`)) {
      scriptScore++;
    }
  });
  
  log(`Scripts Score: ${scriptScore}/${scripts.length}`, scriptScore === scripts.length ? 'success' : 'warning');
  return scriptScore === scripts.length;
}

function checkPackageJson() {
  log('📦 Checking Package.json Scripts...', 'info');
  
  const requiredScripts = [
    'version:update',
    'version:check',
    'docker:check',
    'deploy:fix',
    'cicd:check'
  ];
  
  let packageScore = 0;
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    requiredScripts.forEach(script => {
      if (scripts[script]) {
        log(`Package script: ${script}`, 'success');
        packageScore++;
      } else {
        log(`Package script: ${script} - MISSING`, 'error');
      }
    });
  } catch (error) {
    log(`Error reading package.json: ${error.message}`, 'error');
  }
  
  log(`Package.json Score: ${packageScore}/${requiredScripts.length}`, packageScore === requiredScripts.length ? 'success' : 'warning');
  return packageScore === requiredScripts.length;
}

function checkCICDWorkflow() {
  log('🔄 Checking CI/CD Workflow...', 'info');
  
  const workflowChecks = [
    { content: 'Update version metadata', desc: 'Version metadata update step' },
    { content: 'Version check production', desc: 'Version check step' },
    { content: 'dockerfile: Dockerfile.arm64', desc: 'Docker build configuration' }
  ];
  
  let workflowScore = 0;
  workflowChecks.forEach(check => {
    if (checkFileContent('.github/workflows/ci-cd.yml', check.content, check.desc)) {
      workflowScore++;
    }
  });
  
  log(`CI/CD Workflow Score: ${workflowScore}/${workflowChecks.length}`, workflowScore === workflowChecks.length ? 'success' : 'warning');
  return workflowScore === workflowChecks.length;
}

function generateReport() {
  log('📋 Generating Deployment Report...', 'info');
  
  const report = {
    timestamp: new Date().toISOString(),
    docker: checkDockerConfiguration(),
    version: checkVersionAPI(),
    html: checkHTMLFiles(),
    scripts: checkScripts(),
    package: checkPackageJson(),
    cicd: checkCICDWorkflow()
  };
  
  const totalScore = Object.values(report).filter(Boolean).length;
  const maxScore = Object.keys(report).length - 1; // Exclude timestamp
  
  log(`\n🎯 Overall Deployment Score: ${totalScore}/${maxScore}`, totalScore === maxScore ? 'success' : 'warning');
  
  if (totalScore === maxScore) {
    log('🎉 All deployment checks passed! Your system is ready for deployment.', 'success');
  } else {
    log('⚠️  Some deployment checks failed. Please review the issues above.', 'warning');
  }
  
  // Save report to file
  const reportFile = `deployment-report-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportFile}`, 'info');
  
  return report;
}

function main() {
  console.log(colorize('\n🚀 Badminton Bot Deployment Status Checker\n', 'cyan'));
  
  const report = generateReport();
  
  console.log(colorize('\n📚 Available Commands:', 'magenta'));
  console.log('  npm run version:update  - Update version metadata');
  console.log('  npm run version:check   - Check version API');
  console.log('  npm run docker:check    - Check Docker build');
  console.log('  npm run deploy:fix      - Fix deployment issues');
  console.log('  npm run cicd:check      - Check CI/CD configuration');
  
  console.log(colorize('\n🔗 Useful URLs:', 'magenta'));
  console.log('  Main App: https://haominhnguyen.shop');
  console.log('  Version API: https://haominhnguyen.shop/api/v1/version');
  console.log('  Admin Panel: https://haominhnguyen.shop/admin.html');
  console.log('  API Docs: https://haominhnguyen.shop/api-docs');
  
  process.exit(report.docker && report.version && report.html && report.scripts && report.package && report.cicd ? 0 : 1);
}

// Run main function
main();
