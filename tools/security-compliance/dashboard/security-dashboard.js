import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import chalk from 'chalk';
import { SecurityScanner } from '../security/security-scanner.js';
import { ComplianceValidator } from '../compliance/compliance-validator.js';
import { VulnerabilityManager } from '../vulnerability/vulnerability-manager.js';
import { AuditReporter } from '../audit/audit-reporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Dashboard
 * Real-time web interface for security monitoring and compliance
 */
export class SecurityDashboard {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.host = options.host || 'localhost';
    this.app = express();
    this.server = null;
    
    // Initialize components
    this.scanner = new SecurityScanner();
    this.validator = new ComplianceValidator();
    this.vulnManager = new VulnerabilityManager();
    this.auditReporter = new AuditReporter();
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // CORS for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }
  
  /**
   * Setup API routes
   */
  setupRoutes() {
    // Dashboard home
    this.app.get('/', (req, res) => {
      res.send(this.renderDashboard());
    });
    
    // API endpoints
    this.app.get('/api/status', this.getStatus.bind(this));
    this.app.get('/api/security/summary', this.getSecuritySummary.bind(this));
    this.app.get('/api/compliance/summary', this.getComplianceSummary.bind(this));
    this.app.get('/api/vulnerabilities/summary', this.getVulnerabilitySummary.bind(this));
    this.app.get('/api/audit/recent', this.getRecentAuditEvents.bind(this));
    
    // Actions
    this.app.post('/api/security/scan', this.triggerSecurityScan.bind(this));
    this.app.post('/api/compliance/check', this.triggerComplianceCheck.bind(this));
    this.app.post('/api/vulnerabilities/scan', this.triggerVulnerabilityScan.bind(this));
    
    // Reports
    this.app.get('/api/reports/generate/:type', this.generateReport.bind(this));
  }
  
  /**
   * Start dashboard server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Stop dashboard server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Initialize dashboard
   */
  async initialize() {
    // Create public directory for static files
    const publicDir = path.join(__dirname, 'public');
    await fs.ensureDir(publicDir);
    
    // Create basic dashboard assets
    await this.createDashboardAssets(publicDir);
    
    console.log(chalk.green('✅ Security dashboard initialized'));
  }
  
  /**
   * API Handlers
   */
  
  async getStatus(req, res) {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        service: 'DNA Security & Compliance Suite',
        version: '1.0.0',
        status: 'healthy',
        components: {
          scanner: 'operational',
          compliance: 'operational',
          vulnerability: 'operational',
          audit: 'operational'
        }
      };
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async getSecuritySummary(req, res) {
    try {
      // Mock security summary - in practice, this would aggregate recent scan results
      const summary = {
        lastScan: new Date().toISOString(),
        totalIssues: 15,
        critical: 2,
        high: 5,
        medium: 6,
        low: 2,
        trending: 'improving',
        scansToday: 12,
        owaspCoverage: {
          'A01:2021-Broken Access Control': { findings: 3, severity: 'medium' },
          'A02:2021-Cryptographic Failures': { findings: 1, severity: 'high' },
          'A03:2021-Injection': { findings: 2, severity: 'critical' },
          'A05:2021-Security Misconfiguration': { findings: 4, severity: 'medium' }
        }
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async getComplianceSummary(req, res) {
    try {
      // Mock compliance summary
      const summary = {
        lastCheck: new Date().toISOString(),
        overallStatus: 'compliant',
        standards: {
          gdpr: { status: 'compliant', score: 95, lastCheck: new Date().toISOString() },
          soc2: { status: 'compliant', score: 92, lastCheck: new Date().toISOString() },
          hipaa: { status: 'non-compliant', score: 78, lastCheck: new Date().toISOString() }
        },
        violations: 3,
        remediationItems: 8
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async getVulnerabilitySummary(req, res) {
    try {
      // Mock vulnerability summary
      const summary = {
        lastScan: new Date().toISOString(),
        totalVulnerabilities: 23,
        newVulnerabilities: 3,
        fixedVulnerabilities: 7,
        severityBreakdown: {
          critical: 1,
          high: 4,
          medium: 12,
          low: 6
        },
        topPackages: [
          { name: 'lodash', vulnerabilities: 3, severity: 'medium' },
          { name: 'express', vulnerabilities: 2, severity: 'high' },
          { name: 'request', vulnerabilities: 1, severity: 'critical' }
        ],
        remediationProgress: 76
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async getRecentAuditEvents(req, res) {
    try {
      // Mock recent audit events
      const events = [
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          type: 'security-scan',
          severity: 'info',
          description: 'Automated security scan completed',
          details: { issuesFound: 3, timeElapsed: '2.3s' }
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          type: 'vulnerability-detected',
          severity: 'medium',
          description: 'New vulnerability detected in lodash package',
          details: { package: 'lodash', version: '4.17.20', cve: 'CVE-2021-23337' }
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          type: 'compliance-check',
          severity: 'info',
          description: 'GDPR compliance validation passed',
          details: { standard: 'gdpr', score: 95 }
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          type: 'policy-violation',
          severity: 'high',
          description: 'Security policy violation detected',
          details: { policy: 'authentication', rule: 'mfa-required' }
        }
      ];
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async triggerSecurityScan(req, res) {
    try {
      console.log(chalk.blue('🔍 Triggering security scan from dashboard...'));
      
      // Start scan asynchronously
      const scanPromise = this.scanner.runScan('all', './');
      
      res.json({ 
        message: 'Security scan initiated',
        scanId: `scan_${Date.now()}`,
        status: 'in-progress'
      });
      
      // Log audit event
      await this.auditReporter.logAuditEvent({
        type: 'security-scan',
        category: 'security',
        description: 'Security scan triggered from dashboard',
        user: req.ip,
        metadata: { trigger: 'manual', source: 'dashboard' }
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async triggerComplianceCheck(req, res) {
    try {
      console.log(chalk.blue('📋 Triggering compliance check from dashboard...'));
      
      const { standard = 'all' } = req.body;
      
      // Start compliance check asynchronously
      const checkPromise = this.validator.validateCompliance(standard);
      
      res.json({ 
        message: 'Compliance check initiated',
        checkId: `check_${Date.now()}`,
        standard,
        status: 'in-progress'
      });
      
      // Log audit event
      await this.auditReporter.logAuditEvent({
        type: 'compliance-check',
        category: 'compliance',
        description: `Compliance check triggered for ${standard}`,
        user: req.ip,
        metadata: { standard, trigger: 'manual', source: 'dashboard' }
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async triggerVulnerabilityScan(req, res) {
    try {
      console.log(chalk.blue('📦 Triggering vulnerability scan from dashboard...'));
      
      // Start vulnerability scan asynchronously
      const scanPromise = this.vulnManager.scanVulnerabilities('dependencies');
      
      res.json({ 
        message: 'Vulnerability scan initiated',
        scanId: `vuln_${Date.now()}`,
        status: 'in-progress'
      });
      
      // Log audit event
      await this.auditReporter.logAuditEvent({
        type: 'vulnerability-scan',
        category: 'vulnerability',
        description: 'Vulnerability scan triggered from dashboard',
        user: req.ip,
        metadata: { trigger: 'manual', source: 'dashboard' }
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async generateReport(req, res) {
    try {
      const { type } = req.params;
      
      console.log(chalk.blue(`📊 Generating ${type} report from dashboard...`));
      
      const result = await this.auditReporter.generateReport(type);
      
      res.json({ 
        message: 'Report generated successfully',
        reportPath: result.outputPath,
        reportType: type,
        timestamp: new Date().toISOString()
      });
      
      // Log audit event
      await this.auditReporter.logAuditEvent({
        type: 'report-generated',
        category: 'audit',
        description: `${type} report generated from dashboard`,
        user: req.ip,
        metadata: { reportType: type, outputPath: result.outputPath }
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Render main dashboard HTML
   */
  renderDashboard() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DNA Security & Compliance Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: #f8f9fa; 
            color: #333;
            line-height: 1.6;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 20px 40px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 1.8em; margin-bottom: 5px; }
        .header p { opacity: 0.9; }
        .container { padding: 30px 40px; max-width: 1200px; margin: 0 auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin-bottom: 30px; }
        .card { 
            background: white; 
            border-radius: 12px; 
            padding: 25px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            border: 1px solid #e9ecef;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .card h3 { margin-bottom: 15px; color: #495057; font-size: 1.1em; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
        .metric-value { font-size: 1.5em; font-weight: bold; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-danger { color: #dc3545; }
        .btn { 
            background: #007bff; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 0.9em;
            transition: background 0.2s;
            margin: 5px 5px 5px 0;
        }
        .btn:hover { background: #0056b3; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #1e7e34; }
        .btn-warning { background: #ffc107; color: #212529; }
        .btn-warning:hover { background: #e0a800; }
        .activity-feed { max-height: 300px; overflow-y: auto; }
        .activity-item { 
            padding: 12px; 
            border-left: 3px solid #007bff; 
            background: #f8f9fa; 
            margin-bottom: 10px; 
            border-radius: 0 6px 6px 0;
        }
        .activity-item.security { border-left-color: #007bff; }
        .activity-item.vulnerability { border-left-color: #ffc107; }
        .activity-item.compliance { border-left-color: #28a745; }
        .activity-item.policy { border-left-color: #dc3545; }
        .activity-time { font-size: 0.8em; color: #6c757d; }
        .activity-desc { margin-top: 5px; }
        .loading { opacity: 0.6; pointer-events: none; }
        .footer { 
            text-align: center; 
            padding: 20px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
            margin-top: 40px;
        }
        .refresh-btn { 
            position: absolute; 
            top: 20px; 
            right: 40px; 
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
        }
        .refresh-btn:hover { background: rgba(255,255,255,0.3); }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 DNA Security & Compliance Dashboard</h1>
        <p>Real-time security monitoring and compliance validation</p>
        <button class="btn refresh-btn" onclick="refreshDashboard()">🔄 Refresh</button>
    </div>
    
    <div class="container">
        <div class="grid">
            <!-- Security Overview -->
            <div class="card">
                <h3>🔍 Security Overview</h3>
                <div id="security-summary">
                    <div class="metric">
                        <span class="metric-label">Total Issues</span>
                        <span class="metric-value status-warning" id="security-total">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Critical</span>
                        <span class="metric-value status-danger" id="security-critical">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">High</span>
                        <span class="metric-value status-warning" id="security-high">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Scans Today</span>
                        <span class="metric-value status-good" id="security-scans">--</span>
                    </div>
                </div>
                <button class="btn" onclick="triggerSecurityScan()">🔍 Run Security Scan</button>
            </div>
            
            <!-- Compliance Status -->
            <div class="card">
                <h3>📋 Compliance Status</h3>
                <div id="compliance-summary">
                    <div class="metric">
                        <span class="metric-label">Overall Status</span>
                        <span class="metric-value status-good" id="compliance-status">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">GDPR</span>
                        <span class="metric-value status-good" id="gdpr-score">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">SOC2</span>
                        <span class="metric-value status-good" id="soc2-score">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">HIPAA</span>
                        <span class="metric-value status-warning" id="hipaa-score">--</span>
                    </div>
                </div>
                <button class="btn btn-success" onclick="triggerComplianceCheck()">📋 Check Compliance</button>
            </div>
            
            <!-- Vulnerability Management -->
            <div class="card">
                <h3>📦 Vulnerabilities</h3>
                <div id="vulnerability-summary">
                    <div class="metric">
                        <span class="metric-label">Total Vulnerabilities</span>
                        <span class="metric-value status-warning" id="vuln-total">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Critical</span>
                        <span class="metric-value status-danger" id="vuln-critical">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Fixed This Week</span>
                        <span class="metric-value status-good" id="vuln-fixed">--</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Remediation Progress</span>
                        <span class="metric-value status-good" id="vuln-progress">--</span>
                    </div>
                </div>
                <button class="btn btn-warning" onclick="triggerVulnerabilityScan()">📦 Scan Dependencies</button>
            </div>
            
            <!-- Recent Activity -->
            <div class="card" style="grid-column: 1 / -1;">
                <h3>📊 Recent Activity</h3>
                <div class="activity-feed" id="activity-feed">
                    <p>Loading recent events...</p>
                </div>
            </div>
        </div>
        
        <!-- Actions -->
        <div class="card">
            <h3>🔧 Quick Actions</h3>
            <button class="btn" onclick="generateReport('security')">📊 Security Report</button>
            <button class="btn btn-success" onclick="generateReport('compliance')">📋 Compliance Report</button>
            <button class="btn btn-warning" onclick="generateReport('vulnerability')">📦 Vulnerability Report</button>
            <button class="btn" onclick="generateReport('all')">📄 Full Report</button>
        </div>
    </div>
    
    <div class="footer">
        <p>DNA Security & Compliance Suite v1.0.0 | Auto-refresh every 30 seconds</p>
    </div>
    
    <script>
        // Dashboard JavaScript
        let refreshInterval;
        
        async function loadDashboard() {
            try {
                // Load security summary
                const securityResponse = await fetch('/api/security/summary');
                const security = await securityResponse.json();
                
                document.getElementById('security-total').textContent = security.totalIssues;
                document.getElementById('security-critical').textContent = security.critical;
                document.getElementById('security-high').textContent = security.high;
                document.getElementById('security-scans').textContent = security.scansToday;
                
                // Load compliance summary
                const complianceResponse = await fetch('/api/compliance/summary');
                const compliance = await complianceResponse.json();
                
                document.getElementById('compliance-status').textContent = compliance.overallStatus;
                document.getElementById('gdpr-score').textContent = compliance.standards.gdpr.score + '%';
                document.getElementById('soc2-score').textContent = compliance.standards.soc2.score + '%';
                document.getElementById('hipaa-score').textContent = compliance.standards.hipaa.score + '%';
                
                // Load vulnerability summary
                const vulnResponse = await fetch('/api/vulnerabilities/summary');
                const vuln = await vulnResponse.json();
                
                document.getElementById('vuln-total').textContent = vuln.totalVulnerabilities;
                document.getElementById('vuln-critical').textContent = vuln.severityBreakdown.critical;
                document.getElementById('vuln-fixed').textContent = vuln.fixedVulnerabilities;
                document.getElementById('vuln-progress').textContent = vuln.remediationProgress + '%';
                
                // Load recent activity
                const activityResponse = await fetch('/api/audit/recent');
                const events = await activityResponse.json();
                
                const activityFeed = document.getElementById('activity-feed');
                activityFeed.innerHTML = events.map(event => 
                    \`<div class="activity-item \${event.type.split('-')[0]}">
                        <div class="activity-time">\${new Date(event.timestamp).toLocaleString()}</div>
                        <div class="activity-desc">\${event.description}</div>
                    </div>\`
                ).join('');
                
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            }
        }
        
        async function triggerSecurityScan() {
            try {
                const button = event.target;
                button.disabled = true;
                button.textContent = '⏳ Scanning...';
                
                const response = await fetch('/api/security/scan', { method: 'POST' });
                const result = await response.json();
                
                alert('Security scan initiated: ' + result.message);
                
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = '🔍 Run Security Scan';
                    loadDashboard();
                }, 3000);
                
            } catch (error) {
                console.error('Failed to trigger security scan:', error);
                alert('Failed to start security scan');
            }
        }
        
        async function triggerComplianceCheck() {
            try {
                const button = event.target;
                button.disabled = true;
                button.textContent = '⏳ Checking...';
                
                const response = await fetch('/api/compliance/check', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ standard: 'all' })
                });
                const result = await response.json();
                
                alert('Compliance check initiated: ' + result.message);
                
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = '📋 Check Compliance';
                    loadDashboard();
                }, 3000);
                
            } catch (error) {
                console.error('Failed to trigger compliance check:', error);
                alert('Failed to start compliance check');
            }
        }
        
        async function triggerVulnerabilityScan() {
            try {
                const button = event.target;
                button.disabled = true;
                button.textContent = '⏳ Scanning...';
                
                const response = await fetch('/api/vulnerabilities/scan', { method: 'POST' });
                const result = await response.json();
                
                alert('Vulnerability scan initiated: ' + result.message);
                
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = '📦 Scan Dependencies';
                    loadDashboard();
                }, 3000);
                
            } catch (error) {
                console.error('Failed to trigger vulnerability scan:', error);
                alert('Failed to start vulnerability scan');
            }
        }
        
        async function generateReport(type) {
            try {
                const button = event.target;
                button.disabled = true;
                button.textContent = '⏳ Generating...';
                
                const response = await fetch(\`/api/reports/generate/\${type}\`);
                const result = await response.json();
                
                alert('Report generated: ' + result.message);
                
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = button.textContent.replace('⏳ Generating...', button.getAttribute('data-original') || '📊 Report');
                }, 2000);
                
            } catch (error) {
                console.error('Failed to generate report:', error);
                alert('Failed to generate report');
            }
        }
        
        function refreshDashboard() {
            loadDashboard();
        }
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', () => {
            loadDashboard();
            
            // Auto-refresh every 30 seconds
            refreshInterval = setInterval(loadDashboard, 30000);
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        });
    </script>
</body>
</html>
    `;
  }
  
  /**
   * Create dashboard assets
   */
  async createDashboardAssets(publicDir) {
    // Create a simple favicon
    const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#667eea"/>
  <text x="16" y="20" text-anchor="middle" fill="white" font-size="16">🔒</text>
</svg>
    `;
    
    await fs.writeFile(path.join(publicDir, 'favicon.svg'), favicon);
  }
}