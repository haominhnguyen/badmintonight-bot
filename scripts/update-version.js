#!/usr/bin/env node

/**
 * Script to update version metadata in HTML files
 * Usage: node scripts/update-version.js [version] [buildTime] [gitCommit]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version information
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = process.argv[2] || packageJson.version;
const buildTime = process.argv[3] || new Date().toISOString();
const gitCommit = process.argv[4] || getGitCommit();

function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.log('Git commit not available:', error.message);
    return 'unknown';
  }
}

function updateHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update version meta tag
    content = content.replace(
      /<meta name="version" content="[^"]*">/,
      `<meta name="version" content="${version}">`
    );
    
    // Update build-time meta tag
    content = content.replace(
      /<meta name="build-time" content="[^"]*">/,
      `<meta name="build-time" content="${buildTime}">`
    );
    
    // Update git-commit meta tag
    content = content.replace(
      /<meta name="git-commit" content="[^"]*">/,
      `<meta name="git-commit" content="${gitCommit}">`
    );
    
    // Add version info to title if not present
    if (!content.includes('version-info')) {
      content = content.replace(
        '</head>',
        `  <!-- Version Info -->
  <script>
    window.APP_VERSION = '${version}';
    window.BUILD_TIME = '${buildTime}';
    window.GIT_COMMIT = '${gitCommit}';
  </script>
</head>`
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated version metadata in ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function updateAllHtmlFiles() {
  const publicDir = path.join(__dirname, '../public');
  const htmlFiles = [
    'index.html',
    'admin.html',
    'login.html',
    'session.html',
    'test-login.html'
  ];
  
  console.log('🔄 Updating version metadata...');
  console.log(`Version: ${version}`);
  console.log(`Build Time: ${buildTime}`);
  console.log(`Git Commit: ${gitCommit}`);
  console.log('');
  
  htmlFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      updateHtmlFile(filePath);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });
  
  console.log('');
  console.log('✅ Version metadata update completed!');
}

// Run the update
updateAllHtmlFiles();
