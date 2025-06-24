// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State, SystemTray, SystemTrayEvent, SystemTrayMenu, CustomMenuItem};
use serde::{Deserialize, Serialize};
use tokio::fs;
use anyhow::Result;

mod data_processing;
mod file_operations;
mod performance_monitor;

use data_processing::DataProcessor;
use file_operations::FileManager;
use performance_monitor::PerformanceMonitor;

// Application state
#[derive(Default)]
struct AppState {
    data_processor: Arc<Mutex<DataProcessor>>,
    file_manager: Arc<Mutex<FileManager>>,
    performance_monitor: Arc<Mutex<PerformanceMonitor>>,
    open_files: Arc<Mutex<HashMap<String, PathBuf>>>,
}

// Data structures for IPC
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DataPoint {
    x: f64,
    y: f64,
    z: Option<f64>,
    value: Option<f64>,
    label: Option<String>,
    timestamp: Option<i64>,
    category: Option<String>,
    metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Dataset {
    id: String,
    name: String,
    description: Option<String>,
    data: Vec<DataPoint>,
    size: usize,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProcessingConfig {
    chunk_size: usize,
    parallel_processing: bool,
    memory_limit_mb: usize,
    use_streaming: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PerformanceMetrics {
    render_time: f64,
    frame_rate: f64,
    memory_usage: f64,
    data_size: usize,
    timestamp: i64,
}

// Tauri commands
#[tauri::command]
async fn load_dataset(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<Dataset, String> {
    let file_manager = state.file_manager.lock().unwrap();
    
    match file_manager.load_dataset(&file_path).await {
        Ok(dataset) => {
            // Store file reference
            let mut open_files = state.open_files.lock().unwrap();
            open_files.insert(dataset.id.clone(), PathBuf::from(file_path));
            
            Ok(dataset)
        }
        Err(e) => Err(format!("Failed to load dataset: {}", e)),
    }
}

#[tauri::command]
async fn save_dataset(
    dataset: Dataset,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let file_manager = state.file_manager.lock().unwrap();
    
    match file_manager.save_dataset(&dataset, &file_path).await {
        Ok(_) => {
            // Update file reference
            let mut open_files = state.open_files.lock().unwrap();
            open_files.insert(dataset.id.clone(), PathBuf::from(file_path));
            
            Ok(())
        }
        Err(e) => Err(format!("Failed to save dataset: {}", e)),
    }
}

#[tauri::command]
async fn process_large_dataset(
    dataset: Dataset,
    config: ProcessingConfig,
    state: State<'_, AppState>,
) -> Result<Dataset, String> {
    let data_processor = state.data_processor.lock().unwrap();
    
    match data_processor.process_large_dataset(dataset, config).await {
        Ok(processed_dataset) => Ok(processed_dataset),
        Err(e) => Err(format!("Processing failed: {}", e)),
    }
}

#[tauri::command]
async fn get_performance_metrics(
    state: State<'_, AppState>,
) -> Result<PerformanceMetrics, String> {
    let monitor = state.performance_monitor.lock().unwrap();
    
    match monitor.get_current_metrics() {
        Ok(metrics) => Ok(metrics),
        Err(e) => Err(format!("Failed to get metrics: {}", e)),
    }
}

#[tauri::command]
async fn optimize_for_large_dataset(
    dataset_size: usize,
    available_memory_mb: usize,
    state: State<'_, AppState>,
) -> Result<ProcessingConfig, String> {
    let data_processor = state.data_processor.lock().unwrap();
    
    match data_processor.optimize_config(dataset_size, available_memory_mb) {
        Ok(config) => Ok(config),
        Err(e) => Err(format!("Optimization failed: {}", e)),
    }
}

#[tauri::command]
async fn export_dataset(
    dataset: Dataset,
    export_path: String,
    format: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let file_manager = state.file_manager.lock().unwrap();
    
    match file_manager.export_dataset(&dataset, &export_path, &format).await {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Export failed: {}", e)),
    }
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "cpu_count": num_cpus::get(),
        "total_memory": sys_info::mem_info().map(|m| m.total).unwrap_or(0),
        "available_memory": sys_info::mem_info().map(|m| m.avail).unwrap_or(0),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "webgl_supported": true, // Assume WebGL is supported in Tauri
    });
    
    Ok(info)
}

#[tauri::command]
async fn stream_large_file(
    file_path: String,
    chunk_size: usize,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    tokio::spawn(async move {
        if let Err(e) = stream_file_chunks(&file_path, chunk_size, &app_handle).await {
            eprintln!("Streaming error: {}", e);
        }
    });
    
    Ok(())
}

async fn stream_file_chunks(
    file_path: &str,
    chunk_size: usize,
    app_handle: &tauri::AppHandle,
) -> Result<()> {
    let content = fs::read_to_string(file_path).await?;
    let lines: Vec<&str> = content.lines().collect();
    
    for chunk in lines.chunks(chunk_size) {
        let chunk_data: Vec<String> = chunk.iter().map(|s| s.to_string()).collect();
        
        app_handle.emit_all("file-chunk", &chunk_data)?;
        
        // Small delay to prevent overwhelming the frontend
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    }
    
    app_handle.emit_all("file-stream-complete", ())?;
    
    Ok(())
}

fn create_system_tray() -> SystemTray {
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}

fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "show" => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            "hide" => {
                let window = app.get_window("main").unwrap();
                window.hide().unwrap();
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        },
        _ => {}
    }
}

fn main() {
    // Initialize logging
    env_logger::init();
    
    // Create system tray
    let tray = create_system_tray();
    
    tauri::Builder::default()
        .manage(AppState::default())
        .system_tray(tray)
        .on_system_tray_event(handle_system_tray_event)
        .invoke_handler(tauri::generate_handler![
            load_dataset,
            save_dataset,
            process_large_dataset,
            get_performance_metrics,
            optimize_for_large_dataset,
            export_dataset,
            get_system_info,
            stream_large_file
        ])
        .setup(|app| {
            // Initialize performance monitoring
            let app_handle = app.handle();
            tokio::spawn(async move {
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    
                    if let Ok(info) = sys_info::mem_info() {
                        let metrics = PerformanceMetrics {
                            render_time: 0.0, // Will be updated from frontend
                            frame_rate: 0.0,  // Will be updated from frontend
                            memory_usage: info.total as f64 - info.avail as f64,
                            data_size: 0,     // Will be updated from frontend
                            timestamp: chrono::Utc::now().timestamp_millis(),
                        };
                        
                        let _ = app_handle.emit_all("performance-update", &metrics);
                    }
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}