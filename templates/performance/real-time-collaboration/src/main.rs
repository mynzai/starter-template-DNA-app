// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use dashmap::DashMap;
use parking_lot::RwLock;
use tauri::{State, Manager};
use tokio::sync::broadcast;
use uuid::Uuid;

mod webrtc;
mod operational_transform;
mod performance;
mod presence;
mod signaling;
mod document;

use webrtc::WebRTCManager;
use operational_transform::{OperationalTransform, Operation, OperationResult};
use performance::{PerformanceMonitor, LatencyTracker};
use presence::{PresenceManager, UserPresence};
use signaling::SignalingServer;
use document::{DocumentManager, Document, DocumentState};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CollaborationSession {
    pub id: Uuid,
    pub document_id: Uuid,
    pub participants: Vec<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PeerConnection {
    pub id: Uuid,
    pub user_id: Uuid,
    pub connected_at: chrono::DateTime<chrono::Utc>,
    pub latency_ms: Option<u64>,
}

// Global application state
pub struct AppState {
    pub webrtc_manager: Arc<WebRTCManager>,
    pub ot_engine: Arc<OperationalTransform>,
    pub performance_monitor: Arc<PerformanceMonitor>,
    pub presence_manager: Arc<PresenceManager>,
    pub document_manager: Arc<DocumentManager>,
    pub sessions: Arc<DashMap<Uuid, CollaborationSession>>,
    pub connections: Arc<DashMap<Uuid, PeerConnection>>,
    pub operation_tx: broadcast::Sender<Operation>,
}

impl AppState {
    pub fn new() -> Self {
        let (operation_tx, _) = broadcast::channel(1000);
        
        Self {
            webrtc_manager: Arc::new(WebRTCManager::new()),
            ot_engine: Arc::new(OperationalTransform::new()),
            performance_monitor: Arc::new(PerformanceMonitor::new()),
            presence_manager: Arc::new(PresenceManager::new()),
            document_manager: Arc::new(DocumentManager::new()),
            sessions: Arc::new(DashMap::new()),
            connections: Arc::new(DashMap::new()),
            operation_tx,
        }
    }
}

// Tauri commands for frontend communication
#[tauri::command]
async fn create_session(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<CollaborationSession, String> {
    let session_id = Uuid::new_v4();
    let doc_uuid = Uuid::parse_str(&document_id)
        .map_err(|e| format!("Invalid document ID: {}", e))?;
    
    let session = CollaborationSession {
        id: session_id,
        document_id: doc_uuid,
        participants: vec![],
        created_at: chrono::Utc::now(),
    };
    
    state.sessions.insert(session_id, session.clone());
    
    tracing::info!("Created collaboration session: {}", session_id);
    Ok(session)
}

#[tauri::command]
async fn join_session(
    session_id: String,
    user_id: String,
    state: State<'_, AppState>,
) -> Result<CollaborationSession, String> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|e| format!("Invalid session ID: {}", e))?;
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|e| format!("Invalid user ID: {}", e))?;
    
    let mut session = state.sessions.get_mut(&session_uuid)
        .ok_or("Session not found")?;
    
    if !session.participants.contains(&user_uuid) {
        session.participants.push(user_uuid);
    }
    
    // Create peer connection
    let connection = PeerConnection {
        id: Uuid::new_v4(),
        user_id: user_uuid,
        connected_at: chrono::Utc::now(),
        latency_ms: None,
    };
    
    state.connections.insert(connection.id, connection);
    
    tracing::info!("User {} joined session {}", user_uuid, session_uuid);
    Ok(session.clone())
}

#[tauri::command]
async fn apply_operation(
    operation_data: String,
    session_id: String,
    state: State<'_, AppState>,
) -> Result<OperationResult, String> {
    let session_uuid = Uuid::parse_str(&session_id)
        .map_err(|e| format!("Invalid session ID: {}", e))?;
    
    let operation: Operation = serde_json::from_str(&operation_data)
        .map_err(|e| format!("Invalid operation data: {}", e))?;
    
    // Start latency tracking
    let latency_tracker = LatencyTracker::new();
    
    // Apply operational transformation
    let result = state.ot_engine.apply_operation(operation.clone())
        .await
        .map_err(|e| format!("Failed to apply operation: {}", e))?;
    
    // Broadcast operation to other clients
    if let Err(e) = state.operation_tx.send(operation) {
        tracing::warn!("Failed to broadcast operation: {}", e);
    }
    
    // Record performance metrics
    let latency = latency_tracker.elapsed_ms();
    state.performance_monitor.record_operation_latency(latency);
    
    if latency > 150 {
        tracing::warn!("Operation latency exceeded target: {}ms", latency);
    }
    
    Ok(result)
}

#[tauri::command]
async fn get_document_state(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<DocumentState, String> {
    let doc_uuid = Uuid::parse_str(&document_id)
        .map_err(|e| format!("Invalid document ID: {}", e))?;
    
    let document_state = state.document_manager.get_document_state(doc_uuid)
        .await
        .map_err(|e| format!("Failed to get document state: {}", e))?;
    
    Ok(document_state)
}

#[tauri::command]
async fn update_user_presence(
    user_id: String,
    presence_data: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|e| format!("Invalid user ID: {}", e))?;
    
    let presence: UserPresence = serde_json::from_str(&presence_data)
        .map_err(|e| format!("Invalid presence data: {}", e))?;
    
    state.presence_manager.update_presence(user_uuid, presence)
        .await
        .map_err(|e| format!("Failed to update presence: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn get_performance_metrics(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let metrics = state.performance_monitor.get_metrics()
        .await
        .map_err(|e| format!("Failed to get performance metrics: {}", e))?;
    
    Ok(metrics)
}

#[tauri::command]
async fn create_webrtc_connection(
    remote_user_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let remote_uuid = Uuid::parse_str(&remote_user_id)
        .map_err(|e| format!("Invalid user ID: {}", e))?;
    
    let connection_id = state.webrtc_manager.create_peer_connection(remote_uuid)
        .await
        .map_err(|e| format!("Failed to create WebRTC connection: {}", e))?;
    
    Ok(connection_id.to_string())
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    
    // Initialize application state
    let app_state = AppState::new();
    
    // Start signaling server in background
    let signaling_server = SignalingServer::new("127.0.0.1:8080".to_string());
    tokio::spawn(async move {
        if let Err(e) = signaling_server.start().await {
            tracing::error!("Signaling server error: {}", e);
        }
    });
    
    tracing::info!("Starting Real-time Collaboration Platform");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            create_session,
            join_session,
            apply_operation,
            get_document_state,
            update_user_presence,
            get_performance_metrics,
            create_webrtc_connection
        ])
        .setup(|app| {
            tracing::info!("Tauri application setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    Ok(())
}