#!/usr/bin/env node

/**
 * Docker Version Management Script
 * Usage: node scripts/docker-version-manager.js [command]
 * Commands: build, tag, push, list, clean
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

function getVersionInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = packageJson.version;
  
  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    log('Git information not available', 'warning');
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const buildTime = new Date().toISOString();
  
  return {
    version,
    gitCommit,
    gitBranch,
    timestamp,
    buildTime
  };
}

function buildDockerImage() {
  log('🏗️ Building Docker image...', 'info');
  
  try {
    execSync('docker build -t badminton-bot .', { stdio: 'inherit' });
    log('Docker image built successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to build Docker image: ${error.message}`, 'error');
    return false;
  }
}

function tagDockerImages() {
  log('🏷️ Tagging Docker images...', 'info');
  
  const versionInfo = getVersionInfo();
  const { version, gitCommit, timestamp } = versionInfo;
  
  const tags = [
    'badminton-bot:latest',
    `badminton-bot:${version}`,
    `badminton-bot:${version}-${gitCommit}`,
    `badminton-bot:${version}-${timestamp}`,
    `badminton-bot:v${version}`,
    `badminton-bot:build-${timestamp}`
  ];
  
  try {
    for (const tag of tags) {
      log(`Tagging: ${tag}`, 'info');
      execSync(`docker tag badminton-bot ${tag}`, { stdio: 'inherit' });
    }
    
    log('Docker images tagged successfully', 'success');
    return tags;
  } catch (error) {
    log(`Failed to tag Docker images: ${error.message}`, 'error');
    return false;
  }
}

function listDockerImages() {
  log('📋 Listing Docker images...', 'info');
  
  try {
    execSync('docker images | grep badminton-bot', { stdio: 'inherit' });
    return true;
  } catch (error) {
    log('No badminton-bot images found', 'warning');
    return false;
  }
}

function pushDockerImages(registry = 'your-registry.com') {
  log(`📤 Pushing Docker images to registry: ${registry}`, 'info');
  
  const versionInfo = getVersionInfo();
  const { version, gitCommit } = versionInfo;
  
  const tags = [
    `${registry}/badminton-bot:latest`,
    `${registry}/badminton-bot:${version}`,
    `${registry}/badminton-bot:${version}-${gitCommit}`,
    `${registry}/badminton-bot:v${version}`
  ];
  
  try {
    for (const tag of tags) {
      log(`Pushing: ${tag}`, 'info');
      execSync(`docker push ${tag}`, { stdio: 'inherit' });
    }
    
    log('Docker images pushed successfully', 'success');
    return tags;
  } catch (error) {
    log(`Failed to push Docker images: ${error.message}`, 'error');
    return false;
  }
}

function cleanDockerImages() {
  log('🧹 Cleaning Docker images...', 'info');
  
  try {
    // Remove dangling images
    execSync('docker image prune -f', { stdio: 'inherit' });
    
    // Remove old badminton-bot images (keep latest 3)
    execSync('docker images badminton-bot --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | tail -n +2 | head -n -3 | awk "{print $1}" | xargs -r docker rmi', { stdio: 'inherit' });
    
    log('Docker images cleaned successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to clean Docker images: ${error.message}`, 'error');
    return false;
  }
}

function generateVersionReport() {
  log('📊 Generating version report...', 'info');
  
  const versionInfo = getVersionInfo();
  
  const report = {
    timestamp: new Date().toISOString(),
    version: versionInfo.version,
    gitCommit: versionInfo.gitCommit,
    gitBranch: versionInfo.gitBranch,
    buildTime: versionInfo.buildTime,
    tags: [
      'badminton-bot:latest',
      `badminton-bot:${versionInfo.version}`,
      `badminton-bot:${versionInfo.version}-${versionInfo.gitCommit}`,
      `badminton-bot:v${versionInfo.version}`
    ]
  };
  
  // Save report
  const reportFile = `docker-version-report-${versionInfo.timestamp}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportFile}`, 'info');
  
  return report;
}

function main() {
  const command = process.argv[2] || 'build';
  
  console.log(colorize('\n🐳 Docker Version Manager\n', 'cyan'));
  
  const versionInfo = getVersionInfo();
  log(`Version: ${versionInfo.version}`, 'info');
  log(`Git Commit: ${versionInfo.gitCommit}`, 'info');
  log(`Git Branch: ${versionInfo.gitBranch}`, 'info');
  
  switch (command) {
    case 'build':
      if (buildDockerImage()) {
        tagDockerImages();
        listDockerImages();
      }
      break;
      
    case 'tag':
      tagDockerImages();
      listDockerImages();
      break;
      
    case 'push':
      const registry = process.argv[3] || 'your-registry.com';
      pushDockerImages(registry);
      break;
      
    case 'list':
      listDockerImages();
      break;
      
    case 'clean':
      cleanDockerImages();
      break;
      
    case 'report':
      generateVersionReport();
      break;
      
    default:
      log(`Unknown command: ${command}`, 'error');
      console.log(colorize('\n📋 Available Commands:', 'magenta'));
      console.log('  build  - Build and tag Docker image');
      console.log('  tag    - Tag existing Docker image');
      console.log('  push   - Push images to registry');
      console.log('  list   - List Docker images');
      console.log('  clean  - Clean old Docker images');
      console.log('  report - Generate version report');
      process.exit(1);
  }
  
  console.log(colorize('\n🎉 Docker version management completed!', 'success'));
}

main();
