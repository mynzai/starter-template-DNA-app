use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use tokio::sync::RwLock;
use std::sync::Arc;

// Plugin system for extensible functionality
pub struct PluginManager {
    plugins: Arc<RwLock<HashMap<String, Box<dyn Plugin + Send + Sync>>>>,
    plugin_configs: Arc<RwLock<HashMap<String, PluginConfig>>>,
}

#[async_trait::async_trait]
pub trait Plugin {
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    fn description(&self) -> &str;
    async fn initialize(&mut self, config: &PluginConfig) -> Result<()>;
    async fn execute(&self, args: &HashMap<String, String>) -> Result<PluginResult>;
    async fn cleanup(&mut self) -> Result<()>;
    fn get_capabilities(&self) -> Vec<String>;
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginConfig {
    pub name: String,
    pub enabled: bool,
    pub settings: HashMap<String, serde_json::Value>,
    pub permissions: PluginPermissions,
    pub auto_start: bool,
    pub priority: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginPermissions {
    pub file_system_access: bool,
    pub network_access: bool,
    pub system_commands: bool,
    pub window_management: bool,
    pub notifications: bool,
    pub allowed_paths: Vec<String>,
    pub allowed_domains: Vec<String>,
}

impl Default for PluginPermissions {
    fn default() -> Self {
        Self {
            file_system_access: false,
            network_access: false,
            system_commands: false,
            window_management: false,
            notifications: false,
            allowed_paths: Vec::new(),
            allowed_domains: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginResult {
    pub success: bool,
    pub data: serde_json::Value,
    pub message: String,
    pub execution_time_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub enabled: bool,
    pub capabilities: Vec<String>,
    pub permissions: PluginPermissions,
}

impl PluginManager {
    pub fn new() -> Self {
        Self {
            plugins: Arc::new(RwLock::new(HashMap::new())),
            plugin_configs: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn register_plugin(
        &self, 
        mut plugin: Box<dyn Plugin + Send + Sync>, 
        config: PluginConfig
    ) -> Result<()> {
        let plugin_name = plugin.name().to_string();
        info!("Registering plugin: {}", plugin_name);
        
        // Initialize the plugin
        plugin.initialize(&config).await
            .map_err(|e| anyhow!("Failed to initialize plugin {}: {}", plugin_name, e))?;
        
        // Store plugin and config
        {
            let mut plugins = self.plugins.write().await;
            let mut configs = self.plugin_configs.write().await;
            
            plugins.insert(plugin_name.clone(), plugin);
            configs.insert(plugin_name.clone(), config);
        }
        
        info!("Successfully registered plugin: {}", plugin_name);
        Ok(())
    }
    
    pub async fn unregister_plugin(&self, name: &str) -> Result<()> {
        info!("Unregistering plugin: {}", name);
        
        let mut plugins = self.plugins.write().await;
        let mut configs = self.plugin_configs.write().await;
        
        if let Some(mut plugin) = plugins.remove(name) {
            // Cleanup the plugin
            if let Err(e) = plugin.cleanup().await {
                warn!("Error during plugin cleanup for {}: {}", name, e);
            }
            
            configs.remove(name);
            info!("Successfully unregistered plugin: {}", name);
            Ok(())
        } else {
            Err(anyhow!("Plugin not found: {}", name))
        }
    }
    
    pub async fn execute_plugin(
        &self, 
        name: &str, 
        args: HashMap<String, String>
    ) -> Result<PluginResult> {
        info!("Executing plugin: {} with {} args", name, args.len());
        
        let plugins = self.plugins.read().await;
        let configs = self.plugin_configs.read().await;
        
        let plugin = plugins.get(name)
            .ok_or_else(|| anyhow!("Plugin not found: {}", name))?;
        
        let config = configs.get(name)
            .ok_or_else(|| anyhow!("Plugin config not found: {}", name))?;
        
        if !config.enabled {
            return Err(anyhow!("Plugin is disabled: {}", name));
        }
        
        let start_time = std::time::Instant::now();
        
        match plugin.execute(&args).await {
            Ok(mut result) => {
                result.execution_time_ms = start_time.elapsed().as_millis() as u64;
                info!("Plugin {} executed successfully in {}ms", name, result.execution_time_ms);
                Ok(result)
            }
            Err(e) => {
                error!("Plugin {} execution failed: {}", name, e);
                Err(e)
            }
        }
    }
    
    pub async fn list_plugins(&self) -> Vec<PluginInfo> {
        let plugins = self.plugins.read().await;
        let configs = self.plugin_configs.read().await;
        
        let mut plugin_list = Vec::new();
        
        for (name, plugin) in plugins.iter() {
            if let Some(config) = configs.get(name) {
                plugin_list.push(PluginInfo {
                    name: plugin.name().to_string(),
                    version: plugin.version().to_string(),
                    description: plugin.description().to_string(),
                    enabled: config.enabled,
                    capabilities: plugin.get_capabilities(),
                    permissions: config.permissions.clone(),
                });
            }
        }
        
        plugin_list.sort_by(|a, b| a.name.cmp(&b.name));
        plugin_list
    }
    
    pub async fn enable_plugin(&self, name: &str) -> Result<()> {
        info!("Enabling plugin: {}", name);
        
        let mut configs = self.plugin_configs.write().await;
        
        if let Some(config) = configs.get_mut(name) {
            config.enabled = true;
            info!("Plugin {} enabled", name);
            Ok(())
        } else {
            Err(anyhow!("Plugin not found: {}", name))
        }
    }
    
    pub async fn disable_plugin(&self, name: &str) -> Result<()> {
        info!("Disabling plugin: {}", name);
        
        let mut configs = self.plugin_configs.write().await;
        
        if let Some(config) = configs.get_mut(name) {
            config.enabled = false;
            info!("Plugin {} disabled", name);
            Ok(())
        } else {
            Err(anyhow!("Plugin not found: {}", name))
        }
    }
    
    pub async fn get_plugin_info(&self, name: &str) -> Result<PluginInfo> {
        let plugins = self.plugins.read().await;
        let configs = self.plugin_configs.read().await;
        
        let plugin = plugins.get(name)
            .ok_or_else(|| anyhow!("Plugin not found: {}", name))?;
        
        let config = configs.get(name)
            .ok_or_else(|| anyhow!("Plugin config not found: {}", name))?;
        
        Ok(PluginInfo {
            name: plugin.name().to_string(),
            version: plugin.version().to_string(),
            description: plugin.description().to_string(),
            enabled: config.enabled,
            capabilities: plugin.get_capabilities(),
            permissions: config.permissions.clone(),
        })
    }
}

// Built-in plugins

// File System Plugin
pub struct FileSystemPlugin {
    name: String,
    version: String,
}

impl FileSystemPlugin {
    pub fn new() -> Self {
        Self {
            name: "filesystem".to_string(),
            version: "1.0.0".to_string(),
        }
    }
}

#[async_trait::async_trait]
impl Plugin for FileSystemPlugin {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    fn description(&self) -> &str {
        "Advanced file system operations plugin"
    }
    
    async fn initialize(&mut self, _config: &PluginConfig) -> Result<()> {
        info!("Initializing FileSystem plugin");
        Ok(())
    }
    
    async fn execute(&self, args: &HashMap<String, String>) -> Result<PluginResult> {
        let operation = args.get("operation")
            .ok_or_else(|| anyhow!("Missing 'operation' parameter"))?;
        
        match operation.as_str() {
            "list" => {
                let path = args.get("path")
                    .ok_or_else(|| anyhow!("Missing 'path' parameter"))?;
                
                let entries = tokio::fs::read_dir(path).await?;
                let mut files = Vec::new();
                
                let mut entries = entries;
                while let Some(entry) = entries.next_entry().await? {
                    files.push(entry.file_name().to_string_lossy().to_string());
                }
                
                Ok(PluginResult {
                    success: true,
                    data: serde_json::json!({ "files": files }),
                    message: format!("Listed {} files", files.len()),
                    execution_time_ms: 0,
                })
            }
            "create_dir" => {
                let path = args.get("path")
                    .ok_or_else(|| anyhow!("Missing 'path' parameter"))?;
                
                tokio::fs::create_dir_all(path).await?;
                
                Ok(PluginResult {
                    success: true,
                    data: serde_json::json!({ "created": path }),
                    message: "Directory created successfully".to_string(),
                    execution_time_ms: 0,
                })
            }
            _ => Err(anyhow!("Unknown operation: {}", operation))
        }
    }
    
    async fn cleanup(&mut self) -> Result<()> {
        info!("Cleaning up FileSystem plugin");
        Ok(())
    }
    
    fn get_capabilities(&self) -> Vec<String> {
        vec![
            "list_files".to_string(),
            "create_directory".to_string(),
            "file_operations".to_string(),
        ]
    }
}

// System Information Plugin
pub struct SystemInfoPlugin {
    name: String,
    version: String,
}

impl SystemInfoPlugin {
    pub fn new() -> Self {
        Self {
            name: "system_info".to_string(),
            version: "1.0.0".to_string(),
        }
    }
}

#[async_trait::async_trait]
impl Plugin for SystemInfoPlugin {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    fn description(&self) -> &str {
        "System information and monitoring plugin"
    }
    
    async fn initialize(&mut self, _config: &PluginConfig) -> Result<()> {
        info!("Initializing SystemInfo plugin");
        Ok(())
    }
    
    async fn execute(&self, args: &HashMap<String, String>) -> Result<PluginResult> {
        let info_type = args.get("type")
            .ok_or_else(|| anyhow!("Missing 'type' parameter"))?;
        
        match info_type.as_str() {
            "cpu" => {
                use sysinfo::{System, SystemExt, CpuExt};
                let mut sys = System::new_all();
                sys.refresh_cpu();
                
                let cpu_info = serde_json::json!({
                    "usage": sys.global_cpu_info().cpu_usage(),
                    "cores": sys.cpus().len(),
                    "name": sys.cpus().first().map(|c| c.name()).unwrap_or("Unknown")
                });
                
                Ok(PluginResult {
                    success: true,
                    data: cpu_info,
                    message: "CPU information retrieved".to_string(),
                    execution_time_ms: 0,
                })
            }
            "memory" => {
                use sysinfo::{System, SystemExt};
                let sys = System::new_all();
                
                let memory_info = serde_json::json!({
                    "total": sys.total_memory(),
                    "used": sys.used_memory(),
                    "available": sys.available_memory(),
                    "usage_percent": (sys.used_memory() as f64 / sys.total_memory() as f64) * 100.0
                });
                
                Ok(PluginResult {
                    success: true,
                    data: memory_info,
                    message: "Memory information retrieved".to_string(),
                    execution_time_ms: 0,
                })
            }
            _ => Err(anyhow!("Unknown info type: {}", info_type))
        }
    }
    
    async fn cleanup(&mut self) -> Result<()> {
        info!("Cleaning up SystemInfo plugin");
        Ok(())
    }
    
    fn get_capabilities(&self) -> Vec<String> {
        vec![
            "cpu_info".to_string(),
            "memory_info".to_string(),
            "system_monitoring".to_string(),
        ]
    }
}

// Notification Plugin
pub struct NotificationPlugin {
    name: String,
    version: String,
}

impl NotificationPlugin {
    pub fn new() -> Self {
        Self {
            name: "notifications".to_string(),
            version: "1.0.0".to_string(),
        }
    }
}

#[async_trait::async_trait]
impl Plugin for NotificationPlugin {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    fn description(&self) -> &str {
        "System notifications and alerts plugin"
    }
    
    async fn initialize(&mut self, _config: &PluginConfig) -> Result<()> {
        info!("Initializing Notification plugin");
        Ok(())
    }
    
    async fn execute(&self, args: &HashMap<String, String>) -> Result<PluginResult> {
        let action = args.get("action")
            .ok_or_else(|| anyhow!("Missing 'action' parameter"))?;
        
        match action.as_str() {
            "show" => {
                let title = args.get("title").unwrap_or(&"Notification".to_string());
                let body = args.get("body").unwrap_or(&"No message".to_string());
                
                // In a real implementation, you'd use the Tauri notification API
                info!("Showing notification: {} - {}", title, body);
                
                Ok(PluginResult {
                    success: true,
                    data: serde_json::json!({
                        "title": title,
                        "body": body,
                        "shown": true
                    }),
                    message: "Notification shown successfully".to_string(),
                    execution_time_ms: 0,
                })
            }
            _ => Err(anyhow!("Unknown action: {}", action))
        }
    }
    
    async fn cleanup(&mut self) -> Result<()> {
        info!("Cleaning up Notification plugin");
        Ok(())
    }
    
    fn get_capabilities(&self) -> Vec<String> {
        vec![
            "show_notifications".to_string(),
            "alert_system".to_string(),
        ]
    }
}

// Plugin registry for easy management
pub struct PluginRegistry {
    manager: PluginManager,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self {
            manager: PluginManager::new(),
        }
    }
    
    pub async fn register_built_in_plugins(&self) -> Result<()> {
        info!("Registering built-in plugins...");
        
        // Register FileSystem plugin
        let fs_config = PluginConfig {
            name: "filesystem".to_string(),
            enabled: true,
            settings: HashMap::new(),
            permissions: PluginPermissions {
                file_system_access: true,
                ..Default::default()
            },
            auto_start: true,
            priority: 1,
        };
        
        self.manager.register_plugin(
            Box::new(FileSystemPlugin::new()),
            fs_config
        ).await?;
        
        // Register SystemInfo plugin
        let sys_config = PluginConfig {
            name: "system_info".to_string(),
            enabled: true,
            settings: HashMap::new(),
            permissions: PluginPermissions::default(),
            auto_start: true,
            priority: 2,
        };
        
        self.manager.register_plugin(
            Box::new(SystemInfoPlugin::new()),
            sys_config
        ).await?;
        
        // Register Notification plugin
        let notif_config = PluginConfig {
            name: "notifications".to_string(),
            enabled: true,
            settings: HashMap::new(),
            permissions: PluginPermissions {
                notifications: true,
                ..Default::default()
            },
            auto_start: true,
            priority: 3,
        };
        
        self.manager.register_plugin(
            Box::new(NotificationPlugin::new()),
            notif_config
        ).await?;
        
        info!("Built-in plugins registered successfully");
        Ok(())
    }
    
    pub fn get_manager(&self) -> &PluginManager {
        &self.manager
    }
}