// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{error, info, warn};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State, Window};
use tokio::sync::Mutex;

mod commands;
mod system;
mod security;
mod plugins;

use commands::*;
use system::SystemInfo;
use security::SecurityManager;

// Application state
#[derive(Debug, Default)]
struct AppState {
    system_info: Mutex<Option<SystemInfo>>,
    security_manager: Mutex<SecurityManager>,
    plugin_registry: Mutex<HashMap<String, String>>,
}

// Performance metrics
#[derive(Debug, Serialize, Deserialize, Clone)]
struct PerformanceMetrics {
    startup_time: u64,
    memory_usage: u64,
    cpu_usage: f32,
    disk_usage: HashMap<String, u64>,
}

// Window management
#[tauri::command]
async fn create_window(
    app: AppHandle,
    label: String,
    title: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    info!("Creating new window: {}", label);
    
    let window = tauri::WindowBuilder::new(&app, &label, tauri::WindowUrl::default())
        .title(&title)
        .inner_size(width, height)
        .center()
        .resizable(true)
        .build()
        .map_err(|e| {
            error!("Failed to create window: {:?}", e);
            e.to_string()
        })?;

    // Apply security policies to new window
    apply_window_security(&window).await?;
    
    Ok(())
}

// Security policies for windows
async fn apply_window_security(window: &Window) -> Result<(), String> {
    // Disable right-click context menu in production
    #[cfg(not(debug_assertions))]
    {
        window.with_webview(|webview| {
            #[cfg(target_os = "windows")]
            {
                // Windows WebView2 security settings
                unsafe {
                    use webview2_com::*;
                    let _ = webview.controller().SetIsHostObjectAllowed(false);
                    let _ = webview.controller().SetIsScriptDebuggingEnabled(false);
                }
            }
        }).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// Application initialization
#[tauri::command]
async fn initialize_app(state: State<'_, AppState>) -> Result<PerformanceMetrics, String> {
    info!("Initializing application...");
    
    let start_time = std::time::Instant::now();
    
    // Initialize system info
    let system_info = SystemInfo::new().await.map_err(|e| {
        error!("Failed to initialize system info: {:?}", e);
        e.to_string()
    })?;
    
    // Initialize security manager
    let security_manager = SecurityManager::new().await.map_err(|e| {
        error!("Failed to initialize security manager: {:?}", e);
        e.to_string()
    })?;
    
    // Store in state
    *state.system_info.lock().await = Some(system_info.clone());
    *state.security_manager.lock().await = security_manager;
    
    let startup_time = start_time.elapsed().as_millis() as u64;
    
    let metrics = PerformanceMetrics {
        startup_time,
        memory_usage: system_info.memory_info.used,
        cpu_usage: system_info.cpu_usage,
        disk_usage: system_info.disk_info,
    };
    
    info!("Application initialized in {}ms", startup_time);
    Ok(metrics)
}

// Health check endpoint
#[tauri::command]
async fn health_check() -> Result<HashMap<String, String>, String> {
    let mut status = HashMap::new();
    
    status.insert("status".to_string(), "healthy".to_string());
    status.insert("timestamp".to_string(), chrono::Utc::now().to_rfc3339());
    status.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
    
    Ok(status)
}

// Error handler
fn handle_error(error: &str) {
    error!("Application error: {}", error);
    
    // In production, you might want to send error reports
    #[cfg(not(debug_assertions))]
    {
        // Send to error reporting service
        tokio::spawn(async move {
            // Implementation for error reporting
        });
    }
}

fn main() {
    // Initialize logging
    env_logger::Builder::from_default_env()
        .filter_level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        .init();
    
    info!("Starting Tauri Native Platform v{}", env!("CARGO_PKG_VERSION"));
    
    let app_state = AppState::default();
    
    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            // Core commands
            initialize_app,
            health_check,
            create_window,
            
            // System commands
            get_system_info,
            get_performance_metrics,
            monitor_system_resources,
            
            // File system commands
            read_file_secure,
            write_file_secure,
            list_directory_secure,
            watch_directory,
            
            // Security commands
            validate_file_integrity,
            encrypt_data,
            decrypt_data,
            
            // Plugin commands
            register_plugin,
            unregister_plugin,
            list_plugins,
            execute_plugin
        ])
        .setup(|app| {
            info!("Application setup complete");
            
            // Set up global error handler
            let app_handle = app.handle();
            std::panic::set_hook(Box::new(move |panic_info| {
                error!("Panic occurred: {:?}", panic_info);
                let _ = app_handle.emit_all("app-panic", panic_info.to_string());
            }));
            
            Ok(())
        })
        .on_window_event(|event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    info!("Window close requested");
                    // Perform cleanup before closing
                    api.prevent_close();
                    
                    let window = event.window().clone();
                    tauri::async_runtime::spawn(async move {
                        // Cleanup operations
                        if let Err(e) = cleanup_before_close(&window).await {
                            error!("Cleanup failed: {}", e);
                        }
                        let _ = window.close();
                    });
                }
                tauri::WindowEvent::Focused(focused) => {
                    if *focused {
                        info!("Window gained focus");
                    } else {
                        info!("Window lost focus");
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Cleanup before window close
async fn cleanup_before_close(window: &Window) -> Result<(), String> {
    info!("Performing cleanup before close...");
    
    // Save window state
    if let Err(e) = window.emit("save-state", ()) {
        warn!("Failed to emit save-state event: {:?}", e);
    }
    
    // Wait a moment for cleanup to complete
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    
    info!("Cleanup complete");
    Ok(())
}