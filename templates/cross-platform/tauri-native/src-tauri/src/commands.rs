use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

use crate::{AppState, system::SystemInfo, security::SecurityManager};

// System information commands
#[tauri::command]
pub async fn get_system_info(state: State<'_, AppState>) -> Result<SystemInfo, String> {
    info!("Getting system information");
    
    let system_info = state.system_info.lock().await;
    match system_info.as_ref() {
        Some(info) => Ok(info.clone()),
        None => {
            let info = SystemInfo::new().await.map_err(|e| {
                error!("Failed to get system info: {:?}", e);
                e.to_string()
            })?;
            Ok(info)
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PerformanceMetrics {
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub disk_usage: HashMap<String, u64>,
    pub network_usage: HashMap<String, u64>,
    pub process_count: usize,
    pub uptime: u64,
}

#[tauri::command]
pub async fn get_performance_metrics() -> Result<PerformanceMetrics, String> {
    info!("Getting performance metrics");
    
    use sysinfo::{System, SystemExt, ProcessExt, DiskExt, NetworkExt};
    
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let memory_usage = sys.used_memory();
    let process_count = sys.processes().len();
    let uptime = sys.uptime();
    
    // Disk usage
    let mut disk_usage = HashMap::new();
    for disk in sys.disks() {
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        let used_space = disk.total_space() - disk.available_space();
        disk_usage.insert(mount_point, used_space);
    }
    
    // Network usage
    let mut network_usage = HashMap::new();
    for (interface_name, data) in sys.networks() {
        let total_bytes = data.received() + data.transmitted();
        network_usage.insert(interface_name.clone(), total_bytes);
    }
    
    Ok(PerformanceMetrics {
        cpu_usage,
        memory_usage,
        disk_usage,
        network_usage,
        process_count,
        uptime,
    })
}

#[tauri::command]
pub async fn monitor_system_resources(
    app: AppHandle,
    interval_ms: u64,
) -> Result<(), String> {
    info!("Starting system resource monitoring with interval {}ms", interval_ms);
    
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(
            std::time::Duration::from_millis(interval_ms)
        );
        
        loop {
            interval.tick().await;
            
            match get_performance_metrics().await {
                Ok(metrics) => {
                    if let Err(e) = app.emit_all("system-metrics", &metrics) {
                        error!("Failed to emit system metrics: {:?}", e);
                        break;
                    }
                }
                Err(e) => {
                    error!("Failed to get performance metrics: {}", e);
                }
            }
        }
    });
    
    Ok(())
}

// Secure file system commands
#[tauri::command]
pub async fn read_file_secure(
    path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    info!("Reading file securely: {}", path);
    
    let security_manager = state.security_manager.lock().await;
    
    // Validate file path
    if !security_manager.is_path_allowed(&path) {
        warn!("Attempted to read unauthorized file: {}", path);
        return Err("Access denied: Path not allowed".to_string());
    }
    
    // Read file with error handling
    match tokio::fs::read_to_string(&path).await {
        Ok(content) => {
            info!("Successfully read file: {}", path);
            Ok(content)
        }
        Err(e) => {
            error!("Failed to read file {}: {:?}", path, e);
            Err(format!("Failed to read file: {}", e))
        }
    }
}

#[tauri::command]
pub async fn write_file_secure(
    path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("Writing file securely: {}", path);
    
    let security_manager = state.security_manager.lock().await;
    
    // Validate file path
    if !security_manager.is_path_allowed(&path) {
        warn!("Attempted to write to unauthorized file: {}", path);
        return Err("Access denied: Path not allowed".to_string());
    }
    
    // Validate content size (prevent DoS)
    if content.len() > security_manager.max_file_size() {
        warn!("Attempted to write oversized file: {} bytes", content.len());
        return Err("File too large".to_string());
    }
    
    // Write file with error handling
    match tokio::fs::write(&path, content).await {
        Ok(_) => {
            info!("Successfully wrote file: {}", path);
            Ok(())
        }
        Err(e) => {
            error!("Failed to write file {}: {:?}", path, e);
            Err(format!("Failed to write file: {}", e))
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: u64,
    pub is_directory: bool,
    pub permissions: String,
}

#[tauri::command]
pub async fn list_directory_secure(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileInfo>, String> {
    info!("Listing directory securely: {}", path);
    
    let security_manager = state.security_manager.lock().await;
    
    // Validate directory path
    if !security_manager.is_path_allowed(&path) {
        warn!("Attempted to list unauthorized directory: {}", path);
        return Err("Access denied: Path not allowed".to_string());
    }
    
    let mut entries = Vec::new();
    
    match tokio::fs::read_dir(&path).await {
        Ok(mut dir) => {
            while let Ok(Some(entry)) = dir.next_entry().await {
                let entry_path = entry.path();
                let metadata = match entry.metadata().await {
                    Ok(metadata) => metadata,
                    Err(e) => {
                        warn!("Failed to read metadata for {:?}: {:?}", entry_path, e);
                        continue;
                    }
                };
                
                let file_info = FileInfo {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    size: metadata.len(),
                    modified: metadata
                        .modified()
                        .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                        .duration_since(std::time::SystemTime::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    is_directory: metadata.is_dir(),
                    permissions: format!("{:o}", metadata.permissions().mode() & 0o777),
                };
                
                entries.push(file_info);
            }
            
            info!("Successfully listed {} entries in {}", entries.len(), path);
            Ok(entries)
        }
        Err(e) => {
            error!("Failed to list directory {}: {:?}", path, e);
            Err(format!("Failed to list directory: {}", e))
        }
    }
}

#[tauri::command]
pub async fn watch_directory(
    app: AppHandle,
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("Starting directory watch: {}", path);
    
    let security_manager = state.security_manager.lock().await;
    
    // Validate directory path
    if !security_manager.is_path_allowed(&path) {
        warn!("Attempted to watch unauthorized directory: {}", path);
        return Err("Access denied: Path not allowed".to_string());
    }
    
    let path_clone = path.clone();
    tokio::spawn(async move {
        use notify::{Watcher, RecursiveMode, Event};
        
        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        
        let mut watcher = match notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.blocking_send(event);
            }
        }) {
            Ok(watcher) => watcher,
            Err(e) => {
                error!("Failed to create file watcher: {:?}", e);
                return;
            }
        };
        
        if let Err(e) = watcher.watch(std::path::Path::new(&path_clone), RecursiveMode::Recursive) {
            error!("Failed to start watching directory: {:?}", e);
            return;
        }
        
        while let Some(event) = rx.recv().await {
            if let Err(e) = app.emit_all("file-system-event", &event) {
                error!("Failed to emit file system event: {:?}", e);
                break;
            }
        }
    });
    
    Ok(())
}

// Security commands
#[tauri::command]
pub async fn validate_file_integrity(
    path: String,
    expected_hash: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    info!("Validating file integrity: {}", path);
    
    let security_manager = state.security_manager.lock().await;
    
    match security_manager.validate_file_integrity(&path, &expected_hash).await {
        Ok(is_valid) => {
            info!("File integrity check for {}: {}", path, if is_valid { "PASS" } else { "FAIL" });
            Ok(is_valid)
        }
        Err(e) => {
            error!("Failed to validate file integrity: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn encrypt_data(
    data: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    info!("Encrypting data (length: {} bytes)", data.len());
    
    let security_manager = state.security_manager.lock().await;
    
    match security_manager.encrypt_data(&data, &password).await {
        Ok(encrypted) => {
            info!("Successfully encrypted data");
            Ok(encrypted)
        }
        Err(e) => {
            error!("Failed to encrypt data: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn decrypt_data(
    encrypted_data: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    info!("Decrypting data (length: {} bytes)", encrypted_data.len());
    
    let security_manager = state.security_manager.lock().await;
    
    match security_manager.decrypt_data(&encrypted_data, &password).await {
        Ok(decrypted) => {
            info!("Successfully decrypted data");
            Ok(decrypted)
        }
        Err(e) => {
            error!("Failed to decrypt data: {:?}", e);
            Err(e.to_string())
        }
    }
}

// Plugin system commands
#[tauri::command]
pub async fn register_plugin(
    name: String,
    config: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("Registering plugin: {}", name);
    
    let mut plugin_registry = state.plugin_registry.lock().await;
    plugin_registry.insert(name.clone(), config);
    
    info!("Successfully registered plugin: {}", name);
    Ok(())
}

#[tauri::command]
pub async fn unregister_plugin(
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!("Unregistering plugin: {}", name);
    
    let mut plugin_registry = state.plugin_registry.lock().await;
    
    match plugin_registry.remove(&name) {
        Some(_) => {
            info!("Successfully unregistered plugin: {}", name);
            Ok(())
        }
        None => {
            warn!("Plugin not found: {}", name);
            Err(format!("Plugin not found: {}", name))
        }
    }
}

#[tauri::command]
pub async fn list_plugins(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    info!("Listing registered plugins");
    
    let plugin_registry = state.plugin_registry.lock().await;
    let plugins: Vec<String> = plugin_registry.keys().cloned().collect();
    
    info!("Found {} registered plugins", plugins.len());
    Ok(plugins)
}

#[tauri::command]
pub async fn execute_plugin(
    name: String,
    args: HashMap<String, String>,
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    info!("Executing plugin: {} with {} args", name, args.len());
    
    let plugin_registry = state.plugin_registry.lock().await;
    
    match plugin_registry.get(&name) {
        Some(_config) => {
            // Here you would implement the actual plugin execution logic
            // For now, we'll return a simple response
            let mut result = HashMap::new();
            result.insert("status".to_string(), "executed".to_string());
            result.insert("plugin".to_string(), name);
            result.insert("timestamp".to_string(), chrono::Utc::now().to_rfc3339());
            
            info!("Successfully executed plugin: {}", name);
            Ok(result)
        }
        None => {
            warn!("Plugin not found: {}", name);
            Err(format!("Plugin not found: {}", name))
        }
    }
}