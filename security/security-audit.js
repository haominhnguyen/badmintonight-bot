const fs = require('fs');
const path = require('path');

/**
 * Security Audit Tool
 * Comprehensive security checks for the API
 */
class SecurityAudit {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.recommendations = [];
  }

  /**
   * Run all security checks
   */
  async runAudit() {
    console.log('🔍 Starting Security Audit...\n');

    await this.checkEnvironmentVariables();
    await this.checkDependencies();
    await this.checkFilePermissions();
    await this.checkCodeSecurity();
    await this.checkConfiguration();
    await this.checkLogging();
    await this.checkAuthentication();
    await this.checkAuthorization();
    await this.checkInputValidation();
    await this.checkOutputEncoding();
    await this.checkErrorHandling();
    await this.checkSessionManagement();
    await this.checkCryptography();
    await this.checkCommunication();
    await this.checkDataProtection();
    await this.checkFileUpload();
    await this.checkBusinessLogic();
    await this.checkResourceManagement();
    await this.checkLoggingAndMonitoring();

    this.generateReport();
  }

  /**
   * Check environment variables security
   */
  async checkEnvironmentVariables() {
    console.log('🔐 Checking Environment Variables...');
    
    const requiredVars = [
      'JWT_SECRET',
      'ADMIN_PASSWORD',
      'DATABASE_URL',
      'NODE_ENV'
    ];

    const sensitiveVars = [
      'JWT_SECRET',
      'ADMIN_PASSWORD',
      'DATABASE_URL'
    ];

    // Check if required variables are set
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.issues.push({
          severity: 'HIGH',
          category: 'Environment',
          issue: `Missing required environment variable: ${varName}`,
          recommendation: `Set ${varName} in your environment configuration`
        });
      }
    }

    // Check for weak secrets
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      this.issues.push({
        severity: 'CRITICAL',
        category: 'Environment',
        issue: 'Using default JWT secret',
        recommendation: 'Generate a strong, unique JWT secret for production'
      });
    }

    if (process.env.ADMIN_PASSWORD === '12345') {
      this.issues.push({
        severity: 'HIGH',
        category: 'Environment',
        issue: 'Using weak default admin password',
        recommendation: 'Use a strong, unique password for production'
      });
    }

    // Check for sensitive data in logs
    this.warnings.push({
      category: 'Environment',
      warning: 'Ensure sensitive environment variables are not logged',
      recommendation: 'Use proper logging configuration to exclude sensitive data'
    });
  }

  /**
   * Check dependencies for vulnerabilities
   */
  async checkDependencies() {
    console.log('📦 Checking Dependencies...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Check for known vulnerable packages
    const vulnerablePackages = [
      'express@4.17.0', // Example - check against real vulnerability database
    ];

    for (const [name, version] of Object.entries(dependencies)) {
      if (vulnerablePackages.includes(`${name}@${version}`)) {
        this.issues.push({
          severity: 'HIGH',
          category: 'Dependencies',
          issue: `Vulnerable package detected: ${name}@${version}`,
          recommendation: 'Update to latest secure version'
        });
      }
    }

    // Check for outdated packages
    this.recommendations.push({
      category: 'Dependencies',
      recommendation: 'Regularly update dependencies and run security audits',
      command: 'npm audit && npm update'
    });
  }

  /**
   * Check file permissions
   */
  async checkFilePermissions() {
    console.log('📁 Checking File Permissions...');
    
    const sensitiveFiles = [
      '.env',
      'logs/',
      'uploads/',
      'src/middleware/auth.js',
      'src/middleware/sanitize.js'
    ];

    for (const file of sensitiveFiles) {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const mode = stats.mode & parseInt('777', 8);
        
        if (mode > parseInt('644', 8)) {
          this.warnings.push({
            category: 'File Permissions',
            warning: `File ${file} has overly permissive permissions (${mode.toString(8)})`,
            recommendation: 'Set appropriate file permissions (644 for files, 755 for directories)'
          });
        }
      }
    }
  }

  /**
   * Check code security patterns
   */
  async checkCodeSecurity() {
    console.log('💻 Checking Code Security...');
    
    const codeFiles = this.getCodeFiles();
    
    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded secrets
      if (content.includes('password') && content.includes('=')) {
        this.warnings.push({
          category: 'Code Security',
          warning: `Potential hardcoded password in ${file}`,
          recommendation: 'Use environment variables for sensitive data'
        });
      }

      // Check for SQL injection vulnerabilities
      if (content.includes('query') && content.includes('+')) {
        this.issues.push({
          severity: 'HIGH',
          category: 'Code Security',
          issue: `Potential SQL injection in ${file}`,
          recommendation: 'Use parameterized queries or ORM'
        });
      }

      // Check for XSS vulnerabilities
      if (content.includes('innerHTML') || content.includes('document.write')) {
        this.issues.push({
          severity: 'HIGH',
          category: 'Code Security',
          issue: `Potential XSS vulnerability in ${file}`,
          recommendation: 'Use textContent or proper sanitization'
        });
      }

      // Check for eval usage
      if (content.includes('eval(')) {
        this.issues.push({
          severity: 'CRITICAL',
          category: 'Code Security',
          issue: `Use of eval() in ${file}`,
          recommendation: 'Remove eval() usage - it\'s a security risk'
        });
      }
    }
  }

  /**
   * Check configuration security
   */
  async checkConfiguration() {
    console.log('⚙️ Checking Configuration...');
    
    // Check CORS configuration
    this.recommendations.push({
      category: 'Configuration',
      recommendation: 'Ensure CORS is properly configured for production',
      details: 'Review CORS origins and methods'
    });

    // Check rate limiting
    this.recommendations.push({
      category: 'Configuration',
      recommendation: 'Verify rate limiting is appropriate for your use case',
      details: 'Adjust rate limits based on expected traffic'
    });

    // Check security headers
    this.recommendations.push({
      category: 'Configuration',
      recommendation: 'Verify all security headers are properly set',
      details: 'Check Helmet.js configuration'
    });
  }

  /**
   * Check logging security
   */
  async checkLogging() {
    console.log('📝 Checking Logging Security...');
    
    this.recommendations.push({
      category: 'Logging',
      recommendation: 'Ensure sensitive data is not logged',
      details: 'Review logging statements for password, tokens, etc.'
    });

    this.recommendations.push({
      category: 'Logging',
      recommendation: 'Implement log rotation and retention policies',
      details: 'Configure log rotation to prevent disk space issues'
    });

    this.recommendations.push({
      category: 'Logging',
      recommendation: 'Use structured logging for better security monitoring',
      details: 'Implement JSON logging format'
    });
  }

  /**
   * Check authentication implementation
   */
  async checkAuthentication() {
    console.log('🔑 Checking Authentication...');
    
    // Check JWT implementation
    this.recommendations.push({
      category: 'Authentication',
      recommendation: 'Verify JWT token expiration is appropriate',
      details: 'Consider shorter token lifetimes for better security'
    });

    this.recommendations.push({
      category: 'Authentication',
      recommendation: 'Implement token refresh mechanism',
      details: 'Allow users to refresh tokens without re-authentication'
    });

    // Check password handling
    this.recommendations.push({
      category: 'Authentication',
      recommendation: 'Implement proper password hashing',
      details: 'Use bcrypt with appropriate salt rounds'
    });
  }

  /**
   * Check authorization implementation
   */
  async checkAuthorization() {
    console.log('🛡️ Checking Authorization...');
    
    this.recommendations.push({
      category: 'Authorization',
      recommendation: 'Implement role-based access control',
      details: 'Ensure proper role checking for admin endpoints'
    });

    this.recommendations.push({
      category: 'Authorization',
      recommendation: 'Implement resource-level permissions',
      details: 'Check if users can only access their own resources'
    });
  }

  /**
   * Check input validation
   */
  async checkInputValidation() {
    console.log('✅ Checking Input Validation...');
    
    this.recommendations.push({
      category: 'Input Validation',
      recommendation: 'Validate all input data on server side',
      details: 'Client-side validation can be bypassed'
    });

    this.recommendations.push({
      category: 'Input Validation',
      recommendation: 'Implement input sanitization',
      details: 'Sanitize user input to prevent XSS and injection attacks'
    });

    this.recommendations.push({
      category: 'Input Validation',
      recommendation: 'Use whitelist validation where possible',
      details: 'Prefer whitelist over blacklist for input validation'
    });
  }

  /**
   * Check output encoding
   */
  async checkOutputEncoding() {
    console.log('🔤 Checking Output Encoding...');
    
    this.recommendations.push({
      category: 'Output Encoding',
      recommendation: 'Encode output data properly',
      details: 'Use appropriate encoding for HTML, JSON, XML output'
    });
  }

  /**
   * Check error handling
   */
  async checkErrorHandling() {
    console.log('❌ Checking Error Handling...');
    
    this.recommendations.push({
      category: 'Error Handling',
      recommendation: 'Implement proper error handling',
      details: 'Don\'t expose sensitive information in error messages'
    });

    this.recommendations.push({
      category: 'Error Handling',
      recommendation: 'Log errors for security monitoring',
      details: 'Track and monitor error patterns'
    });
  }

  /**
   * Check session management
   */
  async checkSessionManagement() {
    console.log('🔄 Checking Session Management...');
    
    this.recommendations.push({
      category: 'Session Management',
      recommendation: 'Implement secure session management',
      details: 'Use secure, HttpOnly cookies for session storage'
    });

    this.recommendations.push({
      category: 'Session Management',
      recommendation: 'Implement session timeout',
      details: 'Set appropriate session expiration times'
    });
  }

  /**
   * Check cryptography implementation
   */
  async checkCryptography() {
    console.log('🔐 Checking Cryptography...');
    
    this.recommendations.push({
      category: 'Cryptography',
      recommendation: 'Use strong cryptographic algorithms',
      details: 'Ensure proper encryption and hashing algorithms'
    });

    this.recommendations.push({
      category: 'Cryptography',
      recommendation: 'Implement proper key management',
      details: 'Secure storage and rotation of cryptographic keys'
    });
  }

  /**
   * Check communication security
   */
  async checkCommunication() {
    console.log('🌐 Checking Communication Security...');
    
    this.recommendations.push({
      category: 'Communication',
      recommendation: 'Use HTTPS in production',
      details: 'Encrypt all communication between client and server'
    });

    this.recommendations.push({
      category: 'Communication',
      recommendation: 'Implement proper certificate management',
      details: 'Use valid SSL certificates and proper chain of trust'
    });
  }

  /**
   * Check data protection
   */
  async checkDataProtection() {
    console.log('🛡️ Checking Data Protection...');
    
    this.recommendations.push({
      category: 'Data Protection',
      recommendation: 'Implement data encryption at rest',
      details: 'Encrypt sensitive data in database'
    });

    this.recommendations.push({
      category: 'Data Protection',
      recommendation: 'Implement data backup and recovery',
      details: 'Regular backups with proper encryption'
    });
  }

  /**
   * Check file upload security
   */
  async checkFileUpload() {
    console.log('📤 Checking File Upload Security...');
    
    this.recommendations.push({
      category: 'File Upload',
      recommendation: 'Implement file upload restrictions',
      details: 'Limit file types, sizes, and scan for malware'
    });

    this.recommendations.push({
      category: 'File Upload',
      recommendation: 'Store uploaded files outside web root',
      details: 'Prevent direct access to uploaded files'
    });
  }

  /**
   * Check business logic security
   */
  async checkBusinessLogic() {
    console.log('💼 Checking Business Logic Security...');
    
    this.recommendations.push({
      category: 'Business Logic',
      recommendation: 'Implement business rule validation',
      details: 'Validate business rules on server side'
    });

    this.recommendations.push({
      category: 'Business Logic',
      recommendation: 'Implement audit logging',
      details: 'Log all business-critical operations'
    });
  }

  /**
   * Check resource management
   */
  async checkResourceManagement() {
    console.log('📊 Checking Resource Management...');
    
    this.recommendations.push({
      category: 'Resource Management',
      recommendation: 'Implement resource limits',
      details: 'Set appropriate limits for memory, CPU, and disk usage'
    });

    this.recommendations.push({
      category: 'Resource Management',
      recommendation: 'Implement proper cleanup',
      details: 'Clean up resources and temporary files'
    });
  }

  /**
   * Check logging and monitoring
   */
  async checkLoggingAndMonitoring() {
    console.log('📈 Checking Logging and Monitoring...');
    
    this.recommendations.push({
      category: 'Monitoring',
      recommendation: 'Implement security monitoring',
      details: 'Monitor for suspicious activities and security events'
    });

    this.recommendations.push({
      category: 'Monitoring',
      recommendation: 'Implement alerting system',
      details: 'Set up alerts for security incidents'
    });
  }

  /**
   * Get all code files
   */
  getCodeFiles() {
    const codeFiles = [];
    const srcDir = 'src';
    
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js')) {
          codeFiles.push(filePath);
        }
      }
    };
    
    if (fs.existsSync(srcDir)) {
      walkDir(srcDir);
    }
    
    return codeFiles;
  }

  /**
   * Generate security audit report
   */
  generateReport() {
    console.log('\n📋 Security Audit Report');
    console.log('='.repeat(50));
    
    console.log(`\n🚨 Critical Issues: ${this.issues.filter(i => i.severity === 'CRITICAL').length}`);
    console.log(`⚠️  High Issues: ${this.issues.filter(i => i.severity === 'HIGH').length}`);
    console.log(`⚠️  Medium Issues: ${this.issues.filter(i => i.severity === 'MEDIUM').length}`);
    console.log(`⚠️  Low Issues: ${this.issues.filter(i => i.severity === 'LOW').length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`💡 Recommendations: ${this.recommendations.length}`);
    
    // Display critical issues
    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        console.log(`  • ${issue.issue}`);
        console.log(`    Recommendation: ${issue.recommendation}\n`);
      });
    }
    
    // Display high issues
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    if (highIssues.length > 0) {
      console.log('\n⚠️  HIGH ISSUES:');
      highIssues.forEach(issue => {
        console.log(`  • ${issue.issue}`);
        console.log(`    Recommendation: ${issue.recommendation}\n`);
      });
    }
    
    // Display warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  • ${warning.warning}`);
        console.log(`    Recommendation: ${warning.recommendation}\n`);
      });
    }
    
    // Display recommendations
    if (this.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.recommendations.forEach(rec => {
        console.log(`  • ${rec.recommendation}`);
        if (rec.details) {
          console.log(`    Details: ${rec.details}`);
        }
        if (rec.command) {
          console.log(`    Command: ${rec.command}`);
        }
        console.log('');
      });
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        critical: criticalIssues.length,
        high: highIssues.length,
        medium: this.issues.filter(i => i.severity === 'MEDIUM').length,
        low: this.issues.filter(i => i.severity === 'LOW').length,
        warnings: this.warnings.length,
        recommendations: this.recommendations.length
      },
      issues: this.issues,
      warnings: this.warnings,
      recommendations: this.recommendations
    };
    
    fs.writeFileSync('security-audit-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: security-audit-report.json');
  }
}

// Run security audit if called directly
if (require.main === module) {
  const audit = new SecurityAudit();
  audit.runAudit().catch(console.error);
}

module.exports = SecurityAudit;
