use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use anyhow::{Result, anyhow};
use ring::digest;
use argon2::{Argon2, PasswordHasher, PasswordVerifier, password_hash::{rand_core::OsRng, PasswordHash, SaltString}};

#[derive(Debug, Clone)]
pub struct SecurityManager {
    allowed_paths: HashSet<PathBuf>,
    max_file_size: usize,
    security_policies: SecurityPolicies,
    encryption_key: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicies {
    pub allow_network_access: bool,
    pub allow_file_system_access: bool,
    pub allow_shell_execution: bool,
    pub require_user_confirmation: bool,
    pub sandbox_mode: bool,
    pub max_file_size_mb: usize,
    pub allowed_extensions: HashSet<String>,
    pub blocked_extensions: HashSet<String>,
}

impl Default for SecurityPolicies {
    fn default() -> Self {
        let mut allowed_extensions = HashSet::new();
        allowed_extensions.extend([
            "txt".to_string(), "json".to_string(), "yaml".to_string(), "yml".to_string(),
            "toml".to_string(), "csv".to_string(), "md".to_string(), "log".to_string(),
            "png".to_string(), "jpg".to_string(), "jpeg".to_string(), "gif".to_string(),
            "svg".to_string(), "pdf".to_string(),
        ]);
        
        let mut blocked_extensions = HashSet::new();
        blocked_extensions.extend([
            "exe".to_string(), "bat".to_string(), "cmd".to_string(), "com".to_string(),
            "scr".to_string(), "vbs".to_string(), "js".to_string(), "jar".to_string(),
            "sh".to_string(), "ps1".to_string(), "msi".to_string(),
        ]);
        
        Self {
            allow_network_access: false,
            allow_file_system_access: true,
            allow_shell_execution: false,
            require_user_confirmation: true,
            sandbox_mode: true,
            max_file_size_mb: 10,
            allowed_extensions,
            blocked_extensions,
        }
    }
}

impl SecurityManager {
    pub async fn new() -> Result<Self> {
        info!("Initializing security manager...");
        
        let mut allowed_paths = HashSet::new();
        
        // Add default allowed paths based on OS
        if let Some(home_dir) = dirs::home_dir() {
            allowed_paths.insert(home_dir.join("Documents"));
            allowed_paths.insert(home_dir.join("Downloads"));
            allowed_paths.insert(home_dir.join("Desktop"));
        }
        
        // Add application data directories
        if let Some(app_data_dir) = dirs::data_dir() {
            allowed_paths.insert(app_data_dir.join("tauri-native-platform"));
        }
        
        // Add temporary directory
        allowed_paths.insert(std::env::temp_dir());
        
        // Generate encryption key
        let encryption_key = Self::generate_encryption_key();
        
        let security_manager = Self {
            allowed_paths,
            max_file_size: 10 * 1024 * 1024, // 10MB
            security_policies: SecurityPolicies::default(),
            encryption_key,
        };
        
        info!("Security manager initialized with {} allowed paths", security_manager.allowed_paths.len());
        Ok(security_manager)
    }
    
    pub fn is_path_allowed(&self, path: &str) -> bool {
        let path = Path::new(path);
        
        // Resolve the path to prevent directory traversal attacks
        let canonical_path = match path.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                warn!("Failed to canonicalize path: {}", path.display());
                return false;
            }
        };
        
        // Check if the path is within any allowed directory
        for allowed_path in &self.allowed_paths {
            if canonical_path.starts_with(allowed_path) {
                // Additional check for file extension
                if let Some(extension) = canonical_path.extension() {
                    let ext = extension.to_string_lossy().to_lowercase();
                    
                    // Block dangerous extensions
                    if self.security_policies.blocked_extensions.contains(&ext) {
                        warn!("Blocked file extension: {}", ext);
                        return false;
                    }
                    
                    // Allow only permitted extensions if specified
                    if !self.security_policies.allowed_extensions.is_empty() 
                        && !self.security_policies.allowed_extensions.contains(&ext) {
                        warn!("File extension not allowed: {}", ext);
                        return false;
                    }
                }
                
                return true;
            }
        }
        
        warn!("Path not in allowed directories: {}", canonical_path.display());
        false
    }
    
    pub fn max_file_size(&self) -> usize {
        self.max_file_size
    }
    
    pub async fn validate_file_integrity(&self, path: &str, expected_hash: &str) -> Result<bool> {
        info!("Validating file integrity: {}", path);
        
        if !self.is_path_allowed(path) {
            return Err(anyhow!("Path not allowed: {}", path));
        }
        
        let file_content = tokio::fs::read(path).await
            .map_err(|e| anyhow!("Failed to read file: {}", e))?;
        
        let actual_hash = digest::digest(&digest::SHA256, &file_content);
        let actual_hash_hex = hex::encode(actual_hash.as_ref());
        
        let is_valid = actual_hash_hex.eq_ignore_ascii_case(expected_hash);
        
        if is_valid {
            info!("File integrity validation passed");
        } else {
            warn!("File integrity validation failed. Expected: {}, Actual: {}", expected_hash, actual_hash_hex);
        }
        
        Ok(is_valid)
    }
    
    pub async fn encrypt_data(&self, data: &str, password: &str) -> Result<String> {
        info!("Encrypting data (length: {} bytes)", data.len());
        
        // Generate salt
        let salt = SaltString::generate(&mut OsRng);
        
        // Hash password with Argon2
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)
            .map_err(|e| anyhow!("Failed to hash password: {}", e))?;
        
        // For simplicity, we'll use a basic XOR encryption with the hashed password
        // In production, you'd want to use AES or another proper encryption algorithm
        let key_bytes = password_hash.hash.unwrap().as_bytes();
        let data_bytes = data.as_bytes();
        
        let mut encrypted = Vec::with_capacity(data_bytes.len());
        for (i, &byte) in data_bytes.iter().enumerate() {
            let key_byte = key_bytes[i % key_bytes.len()];
            encrypted.push(byte ^ key_byte);
        }
        
        // Combine salt and encrypted data
        let result = format!("{}:{}", salt, base64::encode(encrypted));
        
        info!("Data encrypted successfully");
        Ok(result)
    }
    
    pub async fn decrypt_data(&self, encrypted_data: &str, password: &str) -> Result<String> {
        info!("Decrypting data (length: {} bytes)", encrypted_data.len());
        
        let parts: Vec<&str> = encrypted_data.split(':').collect();
        if parts.len() != 2 {
            return Err(anyhow!("Invalid encrypted data format"));
        }
        
        let salt_str = parts[0];
        let encrypted_base64 = parts[1];
        
        // Parse salt
        let salt = SaltString::new(salt_str)
            .map_err(|e| anyhow!("Invalid salt format: {}", e))?;
        
        // Hash password with the same salt
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)
            .map_err(|e| anyhow!("Failed to hash password: {}", e))?;
        
        // Decode encrypted data
        let encrypted_bytes = base64::decode(encrypted_base64)
            .map_err(|e| anyhow!("Failed to decode base64: {}", e))?;
        
        // Decrypt using XOR (same as encryption)
        let key_bytes = password_hash.hash.unwrap().as_bytes();
        let mut decrypted = Vec::with_capacity(encrypted_bytes.len());
        
        for (i, &byte) in encrypted_bytes.iter().enumerate() {
            let key_byte = key_bytes[i % key_bytes.len()];
            decrypted.push(byte ^ key_byte);
        }
        
        let result = String::from_utf8(decrypted)
            .map_err(|e| anyhow!("Failed to convert decrypted data to string: {}", e))?;
        
        info!("Data decrypted successfully");
        Ok(result)
    }
    
    pub fn add_allowed_path(&mut self, path: PathBuf) {
        info!("Adding allowed path: {}", path.display());
        self.allowed_paths.insert(path);
    }
    
    pub fn remove_allowed_path(&mut self, path: &Path) {
        info!("Removing allowed path: {}", path.display());
        self.allowed_paths.remove(path);
    }
    
    pub fn update_security_policies(&mut self, policies: SecurityPolicies) {
        info!("Updating security policies");
        self.security_policies = policies;
        self.max_file_size = self.security_policies.max_file_size_mb * 1024 * 1024;
    }
    
    pub fn get_security_policies(&self) -> &SecurityPolicies {
        &self.security_policies
    }
    
    pub async fn audit_security(&self) -> Result<SecurityAuditReport> {
        info!("Performing security audit...");
        
        let mut report = SecurityAuditReport {
            timestamp: chrono::Utc::now().to_rfc3339(),
            overall_score: 0,
            findings: Vec::new(),
            recommendations: Vec::new(),
        };
        
        let mut score = 100;
        
        // Check security policies
        if self.security_policies.allow_network_access {
            score -= 10;
            report.findings.push("Network access is enabled".to_string());
            report.recommendations.push("Disable network access if not required".to_string());
        }
        
        if self.security_policies.allow_shell_execution {
            score -= 20;
            report.findings.push("Shell execution is enabled".to_string());
            report.recommendations.push("Disable shell execution to prevent code injection".to_string());
        }
        
        if !self.security_policies.sandbox_mode {
            score -= 15;
            report.findings.push("Sandbox mode is disabled".to_string());
            report.recommendations.push("Enable sandbox mode for enhanced security".to_string());
        }
        
        if !self.security_policies.require_user_confirmation {
            score -= 10;
            report.findings.push("User confirmation is not required for sensitive operations".to_string());
            report.recommendations.push("Enable user confirmation for sensitive operations".to_string());
        }
        
        // Check file system permissions
        let allowed_path_count = self.allowed_paths.len();
        if allowed_path_count > 10 {
            score -= 5;
            report.findings.push(format!("Large number of allowed paths: {}", allowed_path_count));
            report.recommendations.push("Review and minimize allowed file system paths".to_string());
        }
        
        // Check file size limits
        if self.max_file_size > 100 * 1024 * 1024 { // 100MB
            score -= 5;
            report.findings.push("Large maximum file size limit".to_string());
            report.recommendations.push("Consider reducing maximum file size limit".to_string());
        }
        
        report.overall_score = score.max(0);
        
        info!("Security audit completed. Score: {}/100", report.overall_score);
        Ok(report)
    }
    
    fn generate_encryption_key() -> Vec<u8> {
        use ring::rand::{SystemRandom, SecureRandom};
        
        let rng = SystemRandom::new();
        let mut key = vec![0u8; 32]; // 256-bit key
        rng.fill(&mut key).expect("Failed to generate encryption key");
        key
    }
    
    pub async fn scan_for_threats(&self, path: &str) -> Result<ThreatScanResult> {
        info!("Scanning for threats: {}", path);
        
        if !self.is_path_allowed(path) {
            return Err(anyhow!("Path not allowed for scanning: {}", path));
        }
        
        let mut result = ThreatScanResult {
            path: path.to_string(),
            threats_found: Vec::new(),
            risk_level: RiskLevel::Low,
            scan_duration_ms: 0,
        };
        
        let start_time = std::time::Instant::now();
        
        // Read file content
        let content = match tokio::fs::read_to_string(path).await {
            Ok(content) => content,
            Err(_) => {
                // Try reading as binary
                let bytes = tokio::fs::read(path).await
                    .map_err(|e| anyhow!("Failed to read file: {}", e))?;
                String::from_utf8_lossy(&bytes).to_string()
            }
        };
        
        // Simple threat detection patterns
        let threat_patterns = [
            ("eval(", "Potential code injection"),
            ("exec(", "Potential code execution"),
            ("system(", "System command execution"),
            ("<script", "Potential XSS"),
            ("javascript:", "JavaScript URL"),
            ("data:text/html", "Data URL with HTML"),
            ("rm -rf", "Destructive command"),
            ("del /f /q", "Destructive command"),
            ("DROP TABLE", "SQL injection attempt"),
            ("SELECT * FROM", "Potential SQL injection"),
        ];
        
        for (pattern, description) in &threat_patterns {
            if content.to_lowercase().contains(&pattern.to_lowercase()) {
                result.threats_found.push(ThreatInfo {
                    threat_type: description.to_string(),
                    severity: if pattern.contains("rm -rf") || pattern.contains("DROP TABLE") {
                        ThreatSeverity::High
                    } else if pattern.contains("exec") || pattern.contains("eval") {
                        ThreatSeverity::Medium
                    } else {
                        ThreatSeverity::Low
                    },
                    description: format!("Found pattern: {}", pattern),
                });
            }
        }
        
        // Determine overall risk level
        result.risk_level = if result.threats_found.iter().any(|t| matches!(t.severity, ThreatSeverity::High)) {
            RiskLevel::High
        } else if result.threats_found.iter().any(|t| matches!(t.severity, ThreatSeverity::Medium)) {
            RiskLevel::Medium
        } else if !result.threats_found.is_empty() {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        };
        
        result.scan_duration_ms = start_time.elapsed().as_millis() as u64;
        
        info!("Threat scan completed. {} threats found, risk level: {:?}", 
              result.threats_found.len(), result.risk_level);
        
        Ok(result)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecurityAuditReport {
    pub timestamp: String,
    pub overall_score: i32,
    pub findings: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThreatScanResult {
    pub path: String,
    pub threats_found: Vec<ThreatInfo>,
    pub risk_level: RiskLevel,
    pub scan_duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThreatInfo {
    pub threat_type: String,
    pub severity: ThreatSeverity,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ThreatSeverity {
    Low,
    Medium,
    High,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

// Content Security Policy manager
pub struct CSPManager;

impl CSPManager {
    pub fn generate_csp_header(policies: &SecurityPolicies) -> String {
        let mut csp_parts = Vec::new();
        
        // Default sources
        csp_parts.push("default-src 'self' tauri:".to_string());
        
        // Script sources
        if policies.sandbox_mode {
            csp_parts.push("script-src 'self'".to_string());
        } else {
            csp_parts.push("script-src 'self' 'unsafe-inline'".to_string());
        }
        
        // Style sources
        csp_parts.push("style-src 'self' 'unsafe-inline'".to_string());
        
        // Image sources
        csp_parts.push("img-src 'self' asset: https: tauri: data:".to_string());
        
        // Font sources
        csp_parts.push("font-src 'self' data:".to_string());
        
        // Connect sources
        if policies.allow_network_access {
            csp_parts.push("connect-src 'self' https: wss: ipc: http://ipc.localhost".to_string());
        } else {
            csp_parts.push("connect-src 'self' ipc: http://ipc.localhost".to_string());
        }
        
        // Media sources
        csp_parts.push("media-src 'self' asset:".to_string());
        
        // Object sources (restrict for security)
        csp_parts.push("object-src 'none'".to_string());
        
        // Base URI
        csp_parts.push("base-uri 'self'".to_string());
        
        // Frame ancestors
        csp_parts.push("frame-ancestors 'none'".to_string());
        
        csp_parts.join("; ")
    }
    
    pub fn validate_csp_compliance(content: &str) -> Vec<String> {
        let mut violations = Vec::new();
        
        // Check for inline scripts
        if content.contains("<script") && content.contains("javascript:") {
            violations.push("Inline JavaScript detected".to_string());
        }
        
        // Check for eval usage
        if content.contains("eval(") {
            violations.push("eval() usage detected".to_string());
        }
        
        // Check for inline event handlers
        let inline_events = ["onclick", "onload", "onerror", "onmouseover"];
        for event in &inline_events {
            if content.to_lowercase().contains(event) {
                violations.push(format!("Inline event handler detected: {}", event));
            }
        }
        
        violations
    }
}