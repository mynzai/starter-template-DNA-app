use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::mpsc;
use uuid::Uuid;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};

use webrtc::api::interceptor_registry::register_default_interceptors;
use webrtc::api::media_engine::{MediaEngine, MIME_TYPE_VP8, MIME_TYPE_OPUS};
use webrtc::api::APIBuilder;
use webrtc::data_channel::data_channel_message::DataChannelMessage;
use webrtc::data_channel::RTCDataChannel;
use webrtc::ice_transport::ice_server::RTCIceServer;
use webrtc::interceptor::registry::Registry;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::track::track_local::track_local_static_rtp::TrackLocalStaticRTP;
use webrtc::track::track_local::TrackLocal;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RTCMessage {
    pub message_type: RTCMessageType,
    pub sender_id: Uuid,
    pub data: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RTCMessageType {
    Operation,
    Presence,
    Cursor,
    SystemInfo,
    PerformanceMetric,
}

#[derive(Debug, Clone)]
pub struct PeerConnectionInfo {
    pub id: Uuid,
    pub user_id: Uuid,
    pub connection: Arc<RTCPeerConnection>,
    pub data_channel: Option<Arc<RTCDataChannel>>,
    pub connected_at: chrono::DateTime<chrono::Utc>,
    pub last_ping: chrono::DateTime<chrono::Utc>,
    pub latency_ms: Option<u64>,
}

pub struct WebRTCManager {
    connections: Arc<RwLock<HashMap<Uuid, PeerConnectionInfo>>>,
    api: Arc<webrtc::api::API>,
    message_tx: mpsc::UnboundedSender<RTCMessage>,
    message_rx: Arc<RwLock<Option<mpsc::UnboundedReceiver<RTCMessage>>>>,
}

impl WebRTCManager {
    pub fn new() -> Self {
        let (message_tx, message_rx) = mpsc::unbounded_channel();
        
        // Create a MediaEngine object to configure the supported codec
        let mut media_engine = MediaEngine::default();
        
        // Setup the codecs you want to use
        media_engine.register_default_codecs().unwrap();
        
        // Create a InterceptorRegistry. This is the user configurable RTP/RTCP Pipeline.
        let mut registry = Registry::new();
        
        // Use the default set of Interceptors
        registry = register_default_interceptors(registry, &mut media_engine).unwrap();
        
        // Create the API object with the MediaEngine
        let api = APIBuilder::new()
            .with_media_engine(media_engine)
            .with_interceptor_registry(registry)
            .build();

        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            api: Arc::new(api),
            message_tx,
            message_rx: Arc::new(RwLock::new(Some(message_rx))),
        }
    }

    /// Create a new WebRTC peer connection
    pub async fn create_peer_connection(&self, remote_user_id: Uuid) -> Result<Uuid> {
        let connection_id = Uuid::new_v4();
        
        // Configure ICE servers (STUN/TURN)
        let config = RTCConfiguration {
            ice_servers: vec![
                RTCIceServer {
                    urls: vec!["stun:stun.l.google.com:19302".to_owned()],
                    ..Default::default()
                },
                // Add TURN servers for production
                // RTCIceServer {
                //     urls: vec!["turn:your-turn-server.com:3478".to_owned()],
                //     username: "username".to_owned(),
                //     credential: "password".to_owned(),
                //     ..Default::default()
                // },
            ],
            ..Default::default()
        };

        // Create the peer connection
        let peer_connection = Arc::new(self.api.new_peer_connection(config).await?);
        
        // Create data channel for real-time communication
        let data_channel = self.create_data_channel(&peer_connection, connection_id).await?;

        // Set up connection state monitoring
        let pc_clone = Arc::clone(&peer_connection);
        let connections_clone = Arc::clone(&self.connections);
        let conn_id = connection_id;
        
        peer_connection.on_peer_connection_state_change(Box::new(move |state| {
            let pc = Arc::clone(&pc_clone);
            let connections = Arc::clone(&connections_clone);
            Box::pin(async move {
                match state {
                    RTCPeerConnectionState::Connected => {
                        tracing::info!("Peer connection {} established", conn_id);
                        
                        // Update connection info
                        if let Some(mut conn_info) = connections.write().get_mut(&conn_id) {
                            conn_info.last_ping = chrono::Utc::now();
                        }
                    }
                    RTCPeerConnectionState::Disconnected | RTCPeerConnectionState::Failed => {
                        tracing::warn!("Peer connection {} lost", conn_id);
                        connections.write().remove(&conn_id);
                    }
                    RTCPeerConnectionState::Closed => {
                        tracing::info!("Peer connection {} closed", conn_id);
                        connections.write().remove(&conn_id);
                    }
                    _ => {}
                }
            })
        }));

        // Store connection info
        let connection_info = PeerConnectionInfo {
            id: connection_id,
            user_id: remote_user_id,
            connection: Arc::clone(&peer_connection),
            data_channel: Some(data_channel),
            connected_at: chrono::Utc::now(),
            last_ping: chrono::Utc::now(),
            latency_ms: None,
        };

        self.connections.write().insert(connection_id, connection_info);
        
        tracing::info!("Created WebRTC peer connection {} for user {}", connection_id, remote_user_id);
        Ok(connection_id)
    }

    /// Create a data channel for the peer connection
    async fn create_data_channel(
        &self,
        peer_connection: &Arc<RTCPeerConnection>,
        connection_id: Uuid,
    ) -> Result<Arc<RTCDataChannel>> {
        // Create data channel with ordered delivery for operations
        let data_channel = peer_connection
            .create_data_channel(
                "collaboration",
                Some(webrtc::data_channel::data_channel_init::RTCDataChannelInit {
                    ordered: Some(true),
                    max_retransmits: Some(3),
                    ..Default::default()
                }),
            )
            .await?;

        let dc_clone = Arc::clone(&data_channel);
        let message_tx = self.message_tx.clone();
        let conn_id = connection_id;

        // Handle incoming messages
        data_channel.on_message(Box::new(move |msg| {
            let tx = message_tx.clone();
            let dc = Arc::clone(&dc_clone);
            Box::pin(async move {
                if let Err(e) = Self::handle_data_channel_message(msg, tx, conn_id).await {
                    tracing::error!("Error handling data channel message: {}", e);
                }
            })
        }));

        // Handle data channel state changes
        data_channel.on_open(Box::new(move || {
            Box::pin(async move {
                tracing::info!("Data channel {} opened", conn_id);
            })
        }));

        data_channel.on_close(Box::new(move || {
            Box::pin(async move {
                tracing::info!("Data channel {} closed", conn_id);
            })
        }));

        Ok(data_channel)
    }

    /// Handle incoming data channel messages
    async fn handle_data_channel_message(
        msg: DataChannelMessage,
        message_tx: mpsc::UnboundedSender<RTCMessage>,
        connection_id: Uuid,
    ) -> Result<()> {
        let data = String::from_utf8(msg.data.to_vec())?;
        
        match serde_json::from_str::<RTCMessage>(&data) {
            Ok(rtc_message) => {
                // Forward message to application
                if let Err(e) = message_tx.send(rtc_message) {
                    tracing::error!("Failed to forward RTC message: {}", e);
                }
            }
            Err(e) => {
                tracing::warn!("Invalid RTC message format from {}: {}", connection_id, e);
            }
        }

        Ok(())
    }

    /// Send message to a specific peer
    pub async fn send_message(&self, user_id: Uuid, message: RTCMessage) -> Result<()> {
        let connections = self.connections.read();
        
        let connection = connections
            .values()
            .find(|conn| conn.user_id == user_id)
            .ok_or_else(|| anyhow!("No connection found for user {}", user_id))?;

        if let Some(data_channel) = &connection.data_channel {
            let serialized = serde_json::to_string(&message)?;
            data_channel.send_text(serialized).await?;
        }

        Ok(())
    }

    /// Broadcast message to all connected peers
    pub async fn broadcast_message(&self, message: RTCMessage) -> Result<()> {
        let connections = self.connections.read();
        let serialized = serde_json::to_string(&message)?;

        for connection in connections.values() {
            if let Some(data_channel) = &connection.data_channel {
                if let Err(e) = data_channel.send_text(serialized.clone()).await {
                    tracing::warn!("Failed to send message to {}: {}", connection.user_id, e);
                }
            }
        }

        Ok(())
    }

    /// Get message receiver (should be called once during initialization)
    pub fn get_message_receiver(&self) -> Option<mpsc::UnboundedReceiver<RTCMessage>> {
        self.message_rx.write().take()
    }

    /// Measure latency to a peer
    pub async fn measure_latency(&self, user_id: Uuid) -> Result<u64> {
        let start_time = std::time::Instant::now();
        
        let ping_message = RTCMessage {
            message_type: RTCMessageType::SystemInfo,
            sender_id: Uuid::new_v4(), // Use a placeholder sender ID
            data: serde_json::json!({ "type": "ping", "timestamp": chrono::Utc::now() }),
            timestamp: chrono::Utc::now(),
        };

        // Send ping and wait for pong (simplified - would need proper ping/pong handling)
        self.send_message(user_id, ping_message).await?;
        
        // In a real implementation, you'd wait for a pong response
        // For now, we'll simulate the latency measurement
        let latency_ms = start_time.elapsed().as_millis() as u64;
        
        // Update connection latency
        let mut connections = self.connections.write();
        if let Some(connection) = connections.values_mut().find(|conn| conn.user_id == user_id) {
            connection.latency_ms = Some(latency_ms);
            connection.last_ping = chrono::Utc::now();
        }

        Ok(latency_ms)
    }

    /// Get connection statistics
    pub async fn get_connection_stats(&self) -> Vec<ConnectionStats> {
        let connections = self.connections.read();
        let mut stats = Vec::new();

        for connection in connections.values() {
            let connection_stats = ConnectionStats {
                connection_id: connection.id,
                user_id: connection.user_id,
                connected_at: connection.connected_at,
                last_ping: connection.last_ping,
                latency_ms: connection.latency_ms,
                is_connected: connection.data_channel.is_some(),
            };
            stats.push(connection_stats);
        }

        stats
    }

    /// Close a specific connection
    pub async fn close_connection(&self, connection_id: Uuid) -> Result<()> {
        let mut connections = self.connections.write();
        
        if let Some(connection_info) = connections.remove(&connection_id) {
            connection_info.connection.close().await?;
            tracing::info!("Closed connection {}", connection_id);
        }

        Ok(())
    }

    /// Close all connections
    pub async fn close_all_connections(&self) -> Result<()> {
        let mut connections = self.connections.write();
        
        for (id, connection_info) in connections.drain() {
            if let Err(e) = connection_info.connection.close().await {
                tracing::warn!("Error closing connection {}: {}", id, e);
            }
        }

        tracing::info!("Closed all WebRTC connections");
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectionStats {
    pub connection_id: Uuid,
    pub user_id: Uuid,
    pub connected_at: chrono::DateTime<chrono::Utc>,
    pub last_ping: chrono::DateTime<chrono::Utc>,
    pub latency_ms: Option<u64>,
    pub is_connected: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_webrtc_manager_creation() {
        let manager = WebRTCManager::new();
        assert!(manager.connections.read().is_empty());
    }

    #[tokio::test]
    async fn test_peer_connection_creation() {
        let manager = WebRTCManager::new();
        let user_id = Uuid::new_v4();
        
        let result = manager.create_peer_connection(user_id).await;
        assert!(result.is_ok());
        
        let connection_id = result.unwrap();
        assert!(manager.connections.read().contains_key(&connection_id));
    }

    #[tokio::test]
    async fn test_message_serialization() {
        let message = RTCMessage {
            message_type: RTCMessageType::Operation,
            sender_id: Uuid::new_v4(),
            data: serde_json::json!({"test": "data"}),
            timestamp: chrono::Utc::now(),
        };

        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: RTCMessage = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(message.sender_id, deserialized.sender_id);
    }
}