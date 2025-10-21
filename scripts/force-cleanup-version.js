#!/usr/bin/env node

/**
 * Script to forcefully clean up duplicate version metadata in HTML files
 * Usage: node scripts/force-cleanup-version.js
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

function forceCleanupHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Remove ALL version info scripts first
    const versionScriptRegex = /<!-- Version Info -->\s*<script>\s*window\.APP_VERSION = '[^']*';\s*window\.BUILD_TIME = '[^']*';\s*window\.GIT_COMMIT = '[^']*';\s*<\/script>/g;
    const beforeCount = (content.match(versionScriptRegex) || []).length;
    
    if (beforeCount > 0) {
      content = content.replace(versionScriptRegex, '');
      modified = true;
      log(`Removed ${beforeCount} version scripts from ${filePath}`, 'success');
    }
    
    // Clean up extra whitespace and empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/\n\s*<\/head>/g, '\n</head>');
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      log(`Force cleaned ${filePath}`, 'success');
      return true;
    } else {
      log(`No cleanup needed for ${filePath}`, 'info');
      return false;
    }
    
  } catch (error) {
    log(`Error force cleaning ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

function forceCleanupAllHtmlFiles() {
  const publicDir = path.join(__dirname, '../public');
  const htmlFiles = [
    'index.html',
    'admin.html',
    'login.html',
    'session.html',
    'test-login.html'
  ];
  
  log('🧹 Starting FORCE cleanup of duplicate version metadata...', 'info');
  
  let cleanedCount = 0;
  
  htmlFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      if (forceCleanupHtmlFile(filePath)) {
        cleanedCount++;
      }
    } else {
      log(`File not found: ${filePath}`, 'warning');
    }
  });
  
  log(`Force cleanup completed! ${cleanedCount} files were cleaned.`, cleanedCount > 0 ? 'success' : 'info');
}

function main() {
  console.log(colorize('\n🧹 HTML Version Metadata FORCE Cleanup Tool\n', 'cyan'));
  
  forceCleanupAllHtmlFiles();
  
  console.log(colorize('\n📚 Next Steps:', 'magenta'));
  console.log('1. Run: npm run version:update');
  console.log('2. Check files with: npm run deployment:status');
  console.log('3. Commit changes and push to trigger CI/CD');
}

// Run main function
main();
