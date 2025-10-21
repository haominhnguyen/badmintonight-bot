#!/usr/bin/env node

/**
 * Script to check version information from the API
 * Usage: node scripts/check-version.js [url]
 */

const https = require('https');
const http = require('http');

const API_URL = process.argv[2] || 'https://haominhnguyen.shop/api/v1/version';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function checkVersion() {
  console.log('🔍 Checking version information...');
  console.log(`📡 API URL: ${API_URL}`);
  console.log('');
  
  try {
    const response = await makeRequest(API_URL);
    
    if (response.success) {
      const data = response.data;
      
      console.log('✅ Version check successful!');
      console.log('');
      console.log('📊 Version Information:');
      console.log(`  🏷️  Version: ${data.version}`);
      console.log(`  🏗️  Build Time: ${data.buildTime}`);
      console.log(`  📝 Git Commit: ${data.gitCommit}`);
      console.log(`  🌿 Git Branch: ${data.gitBranch}`);
      console.log(`  🟢 Node Version: ${data.nodeVersion}`);
      console.log(`  🌍 Environment: ${data.environment}`);
      console.log(`  ⏱️  Uptime: ${data.uptime}`);
      console.log(`  🚀 Last Deploy: ${data.lastDeploy}`);
      console.log(`  📅 Timestamp: ${data.timestamp}`);
      console.log('');
      console.log('🎯 Features:');
      data.features.forEach(feature => {
        console.log(`  • ${feature}`);
      });
      console.log('');
      console.log(`🔗 Status: ${data.status}`);
      
    } else {
      console.log('❌ Version check failed!');
      console.log(`Error: ${response.error || response.message}`);
    }
    
  } catch (error) {
    console.log('❌ Version check failed!');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('  • Check if the server is running');
    console.log('  • Verify the API URL is correct');
    console.log('  • Check network connectivity');
    console.log('  • Ensure the version API endpoint is accessible');
  }
}

// Run the check
checkVersion();
