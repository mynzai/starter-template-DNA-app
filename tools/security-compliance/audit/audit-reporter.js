import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import winston from 'winston';
import cron from 'node-cron';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Audit Reporter
 * Generates comprehensive security audit trails and compliance reports
 */
export class AuditReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './reports/audit';
    this.format = options.format || 'html';
    this.timeRange = options.timeRange || 30 * 24 * 60 * 60 * 1000; // 30 days
    this.auditLogPath = path.join(this.outputDir, 'audit.log');
    this.auditDbPath = path.join(this.outputDir, 'audit-events.json');
    
    this.auditEvents = [];
    this.logger = this.createAuditLogger();
    
    this.loadAuditEvents();
  }
  
  /**
   * Create audit logger
   */
  createAuditLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: this.auditLogPath,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }
  
  /**
   * Load existing audit events
   */
  async loadAuditEvents() {
    try {
      if (await fs.pathExists(this.auditDbPath)) {
        this.auditEvents = await fs.readJson(this.auditDbPath);
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to load audit events: ${error.message}`));
      this.auditEvents = [];
    }
  }
  
  /**
   * Save audit events
   */
  async saveAuditEvents() {
    try {
      await fs.ensureDir(path.dirname(this.auditDbPath));
      await fs.writeJson(this.auditDbPath, this.auditEvents, { spaces: 2 });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to save audit events: ${error.message}`));
    }
  }
  
  /**
   * Log audit event
   */
  async logAuditEvent(event) {
    const auditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      ...event
    };
    
    // Add to in-memory collection
    this.auditEvents.push(auditEvent);
    
    // Keep only events within time range
    const cutoffTime = Date.now() - this.timeRange;
    this.auditEvents = this.auditEvents.filter(
      e => new Date(e.timestamp).getTime() > cutoffTime
    );
    
    // Log to Winston
    this.logger.info('Security audit event', auditEvent);
    
    // Save to database
    await this.saveAuditEvents();
    
    return auditEvent;
  }
  
  /**
   * Generate comprehensive audit report
   */
  async generateReport(reportType = 'all', outputPath = null) {
    await fs.ensureDir(this.outputDir);
    
    const report = {
      timestamp: new Date().toISOString(),
      reportType,
      timeRange: this.timeRange,
      summary: {},
      sections: {}
    };
    
    try {
      // Generate different report sections based on type
      if (reportType === 'all' || reportType === 'security') {
        console.log(chalk.blue('📊 Generating security audit report...'));
        report.sections.security = await this.generateSecurityAuditReport();
      }
      
      if (reportType === 'all' || reportType === 'compliance') {
        console.log(chalk.blue('📋 Generating compliance audit report...'));
        report.sections.compliance = await this.generateComplianceAuditReport();
      }
      
      if (reportType === 'all' || reportType === 'vulnerability') {
        console.log(chalk.blue('🔍 Generating vulnerability audit report...'));
        report.sections.vulnerability = await this.generateVulnerabilityAuditReport();
      }
      
      if (reportType === 'all' || reportType === 'access') {
        console.log(chalk.blue('🔐 Generating access audit report...'));
        report.sections.access = await this.generateAccessAuditReport();
      }
      
      if (reportType === 'all' || reportType === 'policy') {
        console.log(chalk.blue('📜 Generating policy audit report...'));
        report.sections.policy = await this.generatePolicyAuditReport();
      }
      
      // Calculate overall summary
      report.summary = this.calculateReportSummary(report.sections);
      
      // Generate output in requested format
      const finalOutputPath = outputPath || this.generateOutputPath(reportType);
      await this.renderReport(report, finalOutputPath);
      
      console.log(chalk.green(`✅ Audit report generated: ${finalOutputPath}`));
      
      return {
        report,
        outputPath: finalOutputPath
      };
      
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate security audit report
   */
  async generateSecurityAuditReport() {
    const securityEvents = this.auditEvents.filter(e => 
      e.category === 'security' || e.type === 'security-scan' || e.type === 'vulnerability-detected'
    );
    
    const report = {
      title: 'Security Audit Report',
      timeRange: this.formatTimeRange(),
      totalEvents: securityEvents.length,
      summary: {
        securityScans: 0,
        vulnerabilitiesDetected: 0,
        securityIncidents: 0,
        remediatedIssues: 0
      },
      events: [],
      trends: {},
      recommendations: []
    };
    
    // Analyze security events
    securityEvents.forEach(event => {
      switch (event.type) {
        case 'security-scan':
          report.summary.securityScans++;
          break;
        case 'vulnerability-detected':
          report.summary.vulnerabilitiesDetected++;
          break;
        case 'security-incident':
          report.summary.securityIncidents++;
          break;
        case 'vulnerability-remediated':
          report.summary.remediatedIssues++;
          break;
      }
      
      report.events.push({
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity || 'medium',
        description: event.description,
        metadata: event.metadata
      });
    });
    
    // Calculate trends
    report.trends = this.calculateSecurityTrends(securityEvents);
    
    // Generate recommendations
    report.recommendations = this.generateSecurityRecommendations(report);
    
    return report;
  }
  
  /**
   * Generate compliance audit report
   */
  async generateComplianceAuditReport() {
    const complianceEvents = this.auditEvents.filter(e => 
      e.category === 'compliance' || e.type === 'compliance-check' || e.type === 'policy-violation'
    );
    
    const report = {
      title: 'Compliance Audit Report',
      timeRange: this.formatTimeRange(),
      totalEvents: complianceEvents.length,
      summary: {
        complianceChecks: 0,
        policyViolations: 0,
        dataAccessEvents: 0,
        consentEvents: 0
      },
      standards: {
        gdpr: { events: 0, violations: 0, status: 'compliant' },
        soc2: { events: 0, violations: 0, status: 'compliant' },
        hipaa: { events: 0, violations: 0, status: 'compliant' }
      },
      events: [],
      violations: [],
      recommendations: []
    };
    
    // Analyze compliance events
    complianceEvents.forEach(event => {
      switch (event.type) {
        case 'compliance-check':
          report.summary.complianceChecks++;
          break;
        case 'policy-violation':
          report.summary.policyViolations++;
          report.violations.push({
            timestamp: event.timestamp,
            standard: event.standard,
            violation: event.description,
            severity: event.severity
          });
          break;
        case 'data-access':
          report.summary.dataAccessEvents++;
          break;
        case 'consent-given':
        case 'consent-withdrawn':
          report.summary.consentEvents++;
          break;
      }
      
      // Track by compliance standard
      if (event.standard && report.standards[event.standard]) {
        report.standards[event.standard].events++;
        if (event.type === 'policy-violation') {
          report.standards[event.standard].violations++;
          if (report.standards[event.standard].violations > 0) {
            report.standards[event.standard].status = 'non-compliant';
          }
        }
      }
      
      report.events.push({
        timestamp: event.timestamp,
        type: event.type,
        standard: event.standard,
        description: event.description,
        severity: event.severity
      });
    });
    
    // Generate recommendations
    report.recommendations = this.generateComplianceRecommendations(report);
    
    return report;
  }
  
  /**
   * Generate vulnerability audit report
   */
  async generateVulnerabilityAuditReport() {
    const vulnEvents = this.auditEvents.filter(e => 
      e.category === 'vulnerability' || e.type.includes('vulnerability')
    );
    
    const report = {
      title: 'Vulnerability Audit Report',
      timeRange: this.formatTimeRange(),
      totalEvents: vulnEvents.length,
      summary: {
        vulnerabilitiesFound: 0,
        vulnerabilitiesFixed: 0,
        dependencyUpdates: 0,
        criticalVulnerabilities: 0
      },
      vulnerabilities: [],
      trends: {},
      recommendations: []
    };
    
    // Analyze vulnerability events
    vulnEvents.forEach(event => {
      switch (event.type) {
        case 'vulnerability-detected':
          report.summary.vulnerabilitiesFound++;
          if (event.severity === 'critical') {
            report.summary.criticalVulnerabilities++;
          }
          report.vulnerabilities.push({
            timestamp: event.timestamp,
            package: event.package,
            vulnerability: event.vulnerability,
            severity: event.severity,
            status: 'detected'
          });
          break;
        case 'vulnerability-fixed':
          report.summary.vulnerabilitiesFixed++;
          break;
        case 'dependency-updated':
          report.summary.dependencyUpdates++;
          break;
      }
    });
    
    // Calculate trends
    report.trends = this.calculateVulnerabilityTrends(vulnEvents);
    
    // Generate recommendations
    report.recommendations = this.generateVulnerabilityRecommendations(report);
    
    return report;
  }
  
  /**
   * Generate access audit report
   */
  async generateAccessAuditReport() {
    const accessEvents = this.auditEvents.filter(e => 
      e.category === 'access' || e.type.includes('access') || e.type.includes('auth')
    );
    
    const report = {
      title: 'Access Audit Report',
      timeRange: this.formatTimeRange(),
      totalEvents: accessEvents.length,
      summary: {
        loginAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        privilegedAccess: 0,
        suspiciousActivity: 0
      },
      events: [],
      userActivity: {},
      recommendations: []
    };
    
    // Analyze access events
    accessEvents.forEach(event => {
      switch (event.type) {
        case 'login-attempt':
          report.summary.loginAttempts++;
          if (event.success) {
            report.summary.successfulLogins++;
          } else {
            report.summary.failedLogins++;
          }
          break;
        case 'privileged-access':
          report.summary.privilegedAccess++;
          break;
        case 'suspicious-activity':
          report.summary.suspiciousActivity++;
          break;
      }
      
      // Track user activity
      if (event.user) {
        if (!report.userActivity[event.user]) {
          report.userActivity[event.user] = {
            logins: 0,
            privilegedAccess: 0,
            lastActivity: event.timestamp
          };
        }
        
        const userStats = report.userActivity[event.user];
        if (event.type === 'login-attempt' && event.success) {
          userStats.logins++;
        }
        if (event.type === 'privileged-access') {
          userStats.privilegedAccess++;
        }
        userStats.lastActivity = event.timestamp;
      }
      
      report.events.push({
        timestamp: event.timestamp,
        type: event.type,
        user: event.user,
        ip: event.ip,
        success: event.success,
        description: event.description
      });
    });
    
    // Generate recommendations
    report.recommendations = this.generateAccessRecommendations(report);
    
    return report;
  }
  
  /**
   * Generate policy audit report
   */
  async generatePolicyAuditReport() {
    const policyEvents = this.auditEvents.filter(e => 
      e.category === 'policy' || e.type.includes('policy')
    );
    
    const report = {
      title: 'Policy Audit Report',
      timeRange: this.formatTimeRange(),
      totalEvents: policyEvents.length,
      summary: {
        policyChecks: 0,
        policyViolations: 0,
        policyUpdates: 0,
        enforcementActions: 0
      },
      policies: {},
      violations: [],
      recommendations: []
    };
    
    // Analyze policy events
    policyEvents.forEach(event => {
      switch (event.type) {
        case 'policy-check':
          report.summary.policyChecks++;
          break;
        case 'policy-violation':
          report.summary.policyViolations++;
          report.violations.push({
            timestamp: event.timestamp,
            policy: event.policy,
            rule: event.rule,
            severity: event.severity,
            description: event.description
          });
          break;
        case 'policy-updated':
          report.summary.policyUpdates++;
          break;
        case 'enforcement-action':
          report.summary.enforcementActions++;
          break;
      }
      
      // Track by policy
      if (event.policy) {
        if (!report.policies[event.policy]) {
          report.policies[event.policy] = {
            checks: 0,
            violations: 0,
            lastCheck: event.timestamp
          };
        }
        
        const policyStats = report.policies[event.policy];
        if (event.type === 'policy-check') {
          policyStats.checks++;
        }
        if (event.type === 'policy-violation') {
          policyStats.violations++;
        }
        policyStats.lastCheck = event.timestamp;
      }
    });
    
    // Generate recommendations
    report.recommendations = this.generatePolicyRecommendations(report);
    
    return report;
  }
  
  /**
   * Calculate report summary
   */
  calculateReportSummary(sections) {
    const summary = {
      totalEvents: 0,
      criticalIssues: 0,
      remediatedIssues: 0,
      complianceStatus: 'compliant',
      securityPosture: 'good',
      riskLevel: 'low'
    };
    
    Object.values(sections).forEach(section => {
      if (section.totalEvents) {
        summary.totalEvents += section.totalEvents;
      }
      
      // Count critical issues
      if (section.summary?.criticalVulnerabilities) {
        summary.criticalIssues += section.summary.criticalVulnerabilities;
      }
      if (section.summary?.securityIncidents) {
        summary.criticalIssues += section.summary.securityIncidents;
      }
      
      // Count remediated issues
      if (section.summary?.remediatedIssues) {
        summary.remediatedIssues += section.summary.remediatedIssues;
      }
      if (section.summary?.vulnerabilitiesFixed) {
        summary.remediatedIssues += section.summary.vulnerabilitiesFixed;
      }
      
      // Check compliance status
      if (section.standards) {
        Object.values(section.standards).forEach(standard => {
          if (standard.status === 'non-compliant') {
            summary.complianceStatus = 'non-compliant';
          }
        });
      }
    });
    
    // Determine security posture and risk level
    if (summary.criticalIssues > 10) {
      summary.securityPosture = 'poor';
      summary.riskLevel = 'high';
    } else if (summary.criticalIssues > 5) {
      summary.securityPosture = 'fair';
      summary.riskLevel = 'medium';
    } else if (summary.criticalIssues > 0) {
      summary.riskLevel = 'medium';
    }
    
    return summary;
  }
  
  /**
   * Render report in specified format
   */
  async renderReport(report, outputPath) {
    const extension = path.extname(outputPath).toLowerCase();
    
    switch (extension) {
      case '.html':
        await this.renderHTMLReport(report, outputPath);
        break;
      case '.json':
        await fs.writeJson(outputPath, report, { spaces: 2 });
        break;
      case '.csv':
        await this.renderCSVReport(report, outputPath);
        break;
      case '.pdf':
        await this.renderPDFReport(report, outputPath);
        break;
      default:
        await fs.writeJson(outputPath, report, { spaces: 2 });
    }
  }
  
  /**
   * Render HTML report
   */
  async renderHTMLReport(report, outputPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Audit Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: #e9ecef; border-radius: 5px; }
        .metric-value { font-size: 1.5em; font-weight: bold; color: #0066cc; }
        .metric-label { font-size: 0.9em; color: #666; }
        .risk-high { color: #dc3545; }
        .risk-medium { color: #ffc107; }
        .risk-low { color: #28a745; }
        .compliant { color: #28a745; }
        .non-compliant { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .severity-critical { background-color: #f8d7da; color: #721c24; }
        .severity-high { background-color: #fff3cd; color: #856404; }
        .severity-medium { background-color: #cce5ff; color: #004085; }
        .severity-low { background-color: #d4edda; color: #155724; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; }
        .recommendations ul { margin: 10px 0; }
        .recommendations li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Security Audit Report</h1>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        <p><strong>Report Type:</strong> ${report.reportType}</p>
        <p><strong>Time Range:</strong> ${this.formatTimeRange()}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Executive Summary</h2>
        <div class="metric">
            <div class="metric-value">${report.summary.totalEvents}</div>
            <div class="metric-label">Total Events</div>
        </div>
        <div class="metric">
            <div class="metric-value risk-${report.summary.riskLevel}">${report.summary.criticalIssues}</div>
            <div class="metric-label">Critical Issues</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.remediatedIssues}</div>
            <div class="metric-label">Remediated Issues</div>
        </div>
        <div class="metric">
            <div class="metric-value ${report.summary.complianceStatus === 'compliant' ? 'compliant' : 'non-compliant'}">
                ${report.summary.complianceStatus.toUpperCase()}
            </div>
            <div class="metric-label">Compliance Status</div>
        </div>
        <div class="metric">
            <div class="metric-value risk-${report.summary.riskLevel}">${report.summary.riskLevel.toUpperCase()}</div>
            <div class="metric-label">Risk Level</div>
        </div>
    </div>
    
    ${Object.entries(report.sections).map(([sectionName, section]) => `
    <div class="section">
        <h2>${section.title}</h2>
        <p><strong>Total Events:</strong> ${section.totalEvents}</p>
        
        ${section.summary ? `
        <h3>Summary</h3>
        ${Object.entries(section.summary).map(([key, value]) => `
        <div class="metric">
            <div class="metric-value">${value}</div>
            <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
        </div>
        `).join('')}
        ` : ''}
        
        ${section.violations && section.violations.length > 0 ? `
        <h3>Recent Violations</h3>
        <table>
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Severity</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                ${section.violations.slice(0, 10).map(violation => `
                <tr>
                    <td>${new Date(violation.timestamp).toLocaleString()}</td>
                    <td><span class="severity-${violation.severity}">${violation.severity}</span></td>
                    <td>${violation.description || violation.violation}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        ${section.recommendations && section.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>🔧 Recommendations</h3>
            <ul>
                ${section.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
    `).join('')}
    
    <div class="section">
        <h2>📄 Report Information</h2>
        <p>This report was automatically generated by the DNA Security & Compliance Suite.</p>
        <p><strong>Report Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        <p><strong>Next Report:</strong> Automated reports are generated daily</p>
    </div>
</body>
</html>
    `;
    
    await fs.writeFile(outputPath, html);
  }
  
  /**
   * Render CSV report
   */
  async renderCSVReport(report, outputPath) {
    const events = [];
    
    // Flatten all events from all sections
    Object.entries(report.sections).forEach(([sectionName, section]) => {
      if (section.events) {
        section.events.forEach(event => {
          events.push({
            section: sectionName,
            timestamp: event.timestamp,
            type: event.type,
            severity: event.severity || 'medium',
            description: event.description,
            metadata: JSON.stringify(event.metadata || {})
          });
        });
      }
    });
    
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'section', title: 'Section' },
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'type', title: 'Type' },
        { id: 'severity', title: 'Severity' },
        { id: 'description', title: 'Description' },
        { id: 'metadata', title: 'Metadata' }
      ]
    });
    
    await csvWriter.writeRecords(events);
  }
  
  /**
   * Render PDF report (mock implementation)
   */
  async renderPDFReport(report, outputPath) {
    // Mock implementation - in practice, use a library like puppeteer or PDFKit
    console.log(chalk.yellow('📄 PDF generation not fully implemented - generating HTML instead'));
    
    const htmlPath = outputPath.replace('.pdf', '.html');
    await this.renderHTMLReport(report, htmlPath);
  }
  
  /**
   * Setup automated reporting
   */
  async setupAutomatedReporting() {
    console.log(chalk.blue('⚙️  Setting up automated audit reporting...'));
    
    // Daily security report
    cron.schedule('0 6 * * *', async () => {
      try {
        console.log(chalk.blue('📊 Generating daily security report...'));
        await this.generateReport('security');
      } catch (error) {
        console.error(chalk.red('❌ Daily security report failed:'), error.message);
      }
    });
    
    // Weekly comprehensive report
    cron.schedule('0 8 * * 1', async () => {
      try {
        console.log(chalk.blue('📋 Generating weekly comprehensive report...'));
        await this.generateReport('all');
      } catch (error) {
        console.error(chalk.red('❌ Weekly comprehensive report failed:'), error.message);
      }
    });
    
    // Monthly compliance report
    cron.schedule('0 9 1 * *', async () => {
      try {
        console.log(chalk.blue('📜 Generating monthly compliance report...'));
        await this.generateReport('compliance');
      } catch (error) {
        console.error(chalk.red('❌ Monthly compliance report failed:'), error.message);
      }
    });
    
    console.log(chalk.green('✅ Automated reporting configured'));
  }
  
  /**
   * Helper methods
   */
  
  generateEventId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateOutputPath(reportType) {
    const timestamp = new Date().toISOString().split('T')[0];
    return path.join(this.outputDir, `audit-report-${reportType}-${timestamp}.${this.format}`);
  }
  
  formatTimeRange() {
    const days = Math.floor(this.timeRange / (24 * 60 * 60 * 1000));
    return `Last ${days} days`;
  }
  
  calculateSecurityTrends(events) {
    // Mock implementation - calculate security trends
    return {
      vulnerabilityTrend: 'decreasing',
      scanFrequency: 'daily',
      averageRemediationTime: '2.5 days'
    };
  }
  
  calculateVulnerabilityTrends(events) {
    // Mock implementation - calculate vulnerability trends
    return {
      detectionRate: '95%',
      remediationRate: '87%',
      meanTimeToRemediation: '3.2 days'
    };
  }
  
  generateSecurityRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.vulnerabilitiesDetected > 10) {
      recommendations.push('Increase frequency of vulnerability scanning');
    }
    
    if (report.summary.securityIncidents > 0) {
      recommendations.push('Review and strengthen incident response procedures');
    }
    
    if (report.summary.securityScans < 7) {
      recommendations.push('Implement daily automated security scanning');
    }
    
    return recommendations;
  }
  
  generateComplianceRecommendations(report) {
    const recommendations = [];
    
    Object.entries(report.standards).forEach(([standard, data]) => {
      if (data.violations > 0) {
        recommendations.push(`Address ${standard.toUpperCase()} compliance violations`);
      }
    });
    
    if (report.summary.policyViolations > 5) {
      recommendations.push('Review and update security policies');
    }
    
    return recommendations;
  }
  
  generateVulnerabilityRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.criticalVulnerabilities > 0) {
      recommendations.push('Immediately address all critical vulnerabilities');
    }
    
    if (report.summary.vulnerabilitiesFound > report.summary.vulnerabilitiesFixed) {
      recommendations.push('Accelerate vulnerability remediation efforts');
    }
    
    return recommendations;
  }
  
  generateAccessRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.failedLogins > report.summary.successfulLogins * 0.1) {
      recommendations.push('Investigate high failed login rate');
    }
    
    if (report.summary.suspiciousActivity > 0) {
      recommendations.push('Review and investigate suspicious access patterns');
    }
    
    return recommendations;
  }
  
  generatePolicyRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.policyViolations > 0) {
      recommendations.push('Address policy violations and strengthen enforcement');
    }
    
    Object.entries(report.policies).forEach(([policy, data]) => {
      if (data.violations > data.checks * 0.1) {
        recommendations.push(`Review and update ${policy} policy rules`);
      }
    });
    
    return recommendations;
  }
}