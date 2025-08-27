use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use anyhow::{Result, anyhow};

/// WebRTC signaling messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SignalingMessage {
    /// Join a signaling room
    Join {
        room_id: String,
        user_id: String,
        user_name: String,
    },
    /// Leave a signaling room
    Leave {
        room_id: String,
        user_id: String,
    },
    /// WebRTC offer
    Offer {
        room_id: String,
        from_user: String,
        to_user: String,
        offer: serde_json::Value,
    },
    /// WebRTC answer
    Answer {
        room_id: String,
        from_user: String,
        to_user: String,
        answer: serde_json::Value,
    },
    /// ICE candidate
    IceCandidate {
        room_id: String,
        from_user: String,
        to_user: String,
        candidate: serde_json::Value,
    },
    /// Room user list update
    UserList {
        room_id: String,
        users: Vec<UserInfo>,
    },
    /// Error message
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub user_id: String,
    pub user_name: String,
    pub connected_at: chrono::DateTime<chrono::Utc>,
}

/// Connection information for a WebSocket client
#[derive(Debug)]
struct ClientConnection {
    user_id: Option<String>,
    room_id: Option<String>,
    user_name: Option<String>,
    sender: tokio::sync::mpsc::UnboundedSender<Message>,
    connected_at: chrono::DateTime<chrono::Utc>,
}

/// Signaling room for WebRTC coordination
#[derive(Debug)]
struct SignalingRoom {
    room_id: String,
    clients: HashMap<Uuid, String>, // connection_id -> user_id
    created_at: chrono::DateTime<chrono::Utc>,
}

/// WebRTC signaling server for peer connection establishment
pub struct SignalingServer {
    bind_address: String,
    clients: Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
    rooms: Arc<RwLock<HashMap<String, SignalingRoom>>>,
}

impl SignalingServer {
    pub fn new(bind_address: String) -> Self {
        Self {
            bind_address,
            clients: Arc::new(RwLock::new(HashMap::new())),
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Start the signaling server
    pub async fn start(&self) -> Result<()> {
        let listener = TcpListener::bind(&self.bind_address).await?;
        tracing::info!("Signaling server listening on {}", self.bind_address);

        while let Ok((stream, addr)) = listener.accept().await {
            tracing::info!("New WebSocket connection from {}", addr);
            
            let clients = Arc::clone(&self.clients);
            let rooms = Arc::clone(&self.rooms);
            
            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(stream, clients, rooms).await {
                    tracing::error!("Error handling WebSocket connection: {}", e);
                }
            });
        }

        Ok(())
    }

    /// Handle a new WebSocket connection
    async fn handle_connection(
        stream: TcpStream,
        clients: Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        let ws_stream = accept_async(stream).await?;
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
        let connection_id = Uuid::new_v4();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

        // Add client connection
        {
            let mut clients_guard = clients.write();
            clients_guard.insert(connection_id, ClientConnection {
                user_id: None,
                room_id: None,
                user_name: None,
                sender: tx,
                connected_at: chrono::Utc::now(),
            });
        }

        // Spawn task to handle outgoing messages
        let clients_clone = Arc::clone(&clients);
        tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if let Err(e) = ws_sender.send(message).await {
                    tracing::error!("Error sending WebSocket message: {}", e);
                    break;
                }
            }
        });

        // Handle incoming messages
        while let Some(message) = ws_receiver.next().await {
            match message? {
                Message::Text(text) => {
                    if let Err(e) = Self::handle_message(
                        connection_id,
                        text,
                        Arc::clone(&clients),
                        Arc::clone(&rooms),
                    ).await {
                        tracing::error!("Error handling message: {}", e);
                        // Send error back to client
                        let error_msg = SignalingMessage::Error {
                            message: format!("Error processing message: {}", e),
                        };
                        Self::send_to_client(connection_id, error_msg, &clients).await;
                    }
                }
                Message::Close(_) => {
                    tracing::info!("WebSocket connection {} closed", connection_id);
                    break;
                }
                _ => {} // Ignore binary, ping, pong messages
            }
        }

        // Clean up connection
        Self::cleanup_connection(connection_id, &clients, &rooms).await;
        Ok(())
    }

    /// Handle a signaling message
    async fn handle_message(
        connection_id: Uuid,
        message_text: String,
        clients: Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        let message: SignalingMessage = serde_json::from_str(&message_text)?;
        
        match message {
            SignalingMessage::Join { room_id, user_id, user_name } => {
                Self::handle_join(connection_id, room_id, user_id, user_name, &clients, &rooms).await?;
            }
            SignalingMessage::Leave { room_id, user_id } => {
                Self::handle_leave(connection_id, room_id, user_id, &clients, &rooms).await?;
            }
            SignalingMessage::Offer { room_id, from_user, to_user, offer } => {
                Self::handle_offer(room_id, from_user, to_user, offer, &clients, &rooms).await?;
            }
            SignalingMessage::Answer { room_id, from_user, to_user, answer } => {
                Self::handle_answer(room_id, from_user, to_user, answer, &clients, &rooms).await?;
            }
            SignalingMessage::IceCandidate { room_id, from_user, to_user, candidate } => {
                Self::handle_ice_candidate(room_id, from_user, to_user, candidate, &clients, &rooms).await?;
            }
            _ => {
                return Err(anyhow!("Unexpected message type"));
            }
        }

        Ok(())
    }

    /// Handle join room request
    async fn handle_join(
        connection_id: Uuid,
        room_id: String,
        user_id: String,
        user_name: String,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        // Update client connection
        {
            let mut clients_guard = clients.write();
            if let Some(client) = clients_guard.get_mut(&connection_id) {
                client.user_id = Some(user_id.clone());
                client.room_id = Some(room_id.clone());
                client.user_name = Some(user_name.clone());
            }
        }

        // Add to room
        {
            let mut rooms_guard = rooms.write();
            let room = rooms_guard.entry(room_id.clone()).or_insert_with(|| SignalingRoom {
                room_id: room_id.clone(),
                clients: HashMap::new(),
                created_at: chrono::Utc::now(),
            });
            
            room.clients.insert(connection_id, user_id.clone());
        }

        // Send updated user list to all room members
        Self::broadcast_user_list(&room_id, clients, rooms).await?;
        
        tracing::info!("User {} joined room {}", user_id, room_id);
        Ok(())
    }

    /// Handle leave room request
    async fn handle_leave(
        connection_id: Uuid,
        room_id: String,
        user_id: String,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        // Remove from room
        {
            let mut rooms_guard = rooms.write();
            if let Some(room) = rooms_guard.get_mut(&room_id) {
                room.clients.remove(&connection_id);
                
                // Remove empty rooms
                if room.clients.is_empty() {
                    rooms_guard.remove(&room_id);
                    tracing::info!("Removed empty room {}", room_id);
                }
            }
        }

        // Update client connection
        {
            let mut clients_guard = clients.write();
            if let Some(client) = clients_guard.get_mut(&connection_id) {
                client.room_id = None;
            }
        }

        // Send updated user list to remaining room members
        Self::broadcast_user_list(&room_id, clients, rooms).await?;
        
        tracing::info!("User {} left room {}", user_id, room_id);
        Ok(())
    }

    /// Handle WebRTC offer
    async fn handle_offer(
        room_id: String,
        from_user: String,
        to_user: String,
        offer: serde_json::Value,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        _rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        let message = SignalingMessage::Offer {
            room_id,
            from_user,
            to_user: to_user.clone(),
            offer,
        };

        Self::send_to_user(&to_user, message, clients).await;
        Ok(())
    }

    /// Handle WebRTC answer
    async fn handle_answer(
        room_id: String,
        from_user: String,
        to_user: String,
        answer: serde_json::Value,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        _rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        let message = SignalingMessage::Answer {
            room_id,
            from_user,
            to_user: to_user.clone(),
            answer,
        };

        Self::send_to_user(&to_user, message, clients).await;
        Ok(())
    }

    /// Handle ICE candidate
    async fn handle_ice_candidate(
        room_id: String,
        from_user: String,
        to_user: String,
        candidate: serde_json::Value,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        _rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        let message = SignalingMessage::IceCandidate {
            room_id,
            from_user,
            to_user: to_user.clone(),
            candidate,
        };

        Self::send_to_user(&to_user, message, clients).await;
        Ok(())
    }

    /// Broadcast user list to all room members
    async fn broadcast_user_list(
        room_id: &str,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) -> Result<()> {
        let user_list = {
            let rooms_guard = rooms.read();
            let clients_guard = clients.read();
            
            if let Some(room) = rooms_guard.get(room_id) {
                room.clients
                    .values()
                    .filter_map(|user_id| {
                        clients_guard.values().find(|client| {
                            client.user_id.as_ref() == Some(user_id)
                        }).map(|client| UserInfo {
                            user_id: user_id.clone(),
                            user_name: client.user_name.clone().unwrap_or_default(),
                            connected_at: client.connected_at,
                        })
                    })
                    .collect::<Vec<_>>()
            } else {
                Vec::new()
            }
        };

        let message = SignalingMessage::UserList {
            room_id: room_id.to_string(),
            users: user_list,
        };

        Self::broadcast_to_room(room_id, message, clients, rooms).await;
        Ok(())
    }

    /// Send message to a specific user
    async fn send_to_user(
        user_id: &str,
        message: SignalingMessage,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
    ) {
        let clients_guard = clients.read();
        
        for client in clients_guard.values() {
            if client.user_id.as_ref() == Some(&user_id.to_string()) {
                let json_message = match serde_json::to_string(&message) {
                    Ok(json) => json,
                    Err(e) => {
                        tracing::error!("Failed to serialize message: {}", e);
                        return;
                    }
                };
                
                if let Err(e) = client.sender.send(Message::Text(json_message)) {
                    tracing::error!("Failed to send message to user {}: {}", user_id, e);
                }
                break;
            }
        }
    }

    /// Send message to a specific client
    async fn send_to_client(
        connection_id: Uuid,
        message: SignalingMessage,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
    ) {
        let clients_guard = clients.read();
        
        if let Some(client) = clients_guard.get(&connection_id) {
            let json_message = match serde_json::to_string(&message) {
                Ok(json) => json,
                Err(e) => {
                    tracing::error!("Failed to serialize message: {}", e);
                    return;
                }
            };
            
            if let Err(e) = client.sender.send(Message::Text(json_message)) {
                tracing::error!("Failed to send message to client {}: {}", connection_id, e);
            }
        }
    }

    /// Broadcast message to all clients in a room
    async fn broadcast_to_room(
        room_id: &str,
        message: SignalingMessage,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) {
        let connection_ids = {
            let rooms_guard = rooms.read();
            if let Some(room) = rooms_guard.get(room_id) {
                room.clients.keys().cloned().collect::<Vec<_>>()
            } else {
                Vec::new()
            }
        };

        let json_message = match serde_json::to_string(&message) {
            Ok(json) => json,
            Err(e) => {
                tracing::error!("Failed to serialize broadcast message: {}", e);
                return;
            }
        };

        let clients_guard = clients.read();
        for connection_id in connection_ids {
            if let Some(client) = clients_guard.get(&connection_id) {
                if let Err(e) = client.sender.send(Message::Text(json_message.clone())) {
                    tracing::error!("Failed to broadcast to client {}: {}", connection_id, e);
                }
            }
        }
    }

    /// Clean up a disconnected connection
    async fn cleanup_connection(
        connection_id: Uuid,
        clients: &Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
        rooms: &Arc<RwLock<HashMap<String, SignalingRoom>>>,
    ) {
        let (room_id, user_id) = {
            let mut clients_guard = clients.write();
            if let Some(client) = clients_guard.remove(&connection_id) {
                (client.room_id, client.user_id)
            } else {
                (None, None)
            }
        };

        // Remove from room if applicable
        if let (Some(room_id), Some(user_id)) = (room_id, user_id) {
            {
                let mut rooms_guard = rooms.write();
                if let Some(room) = rooms_guard.get_mut(&room_id) {
                    room.clients.remove(&connection_id);
                    
                    // Remove empty rooms
                    if room.clients.is_empty() {
                        rooms_guard.remove(&room_id);
                        tracing::info!("Removed empty room {} after cleanup", room_id);
                    }
                }
            }

            // Broadcast updated user list
            let _ = Self::broadcast_user_list(&room_id, clients, rooms).await;
            tracing::info!("Cleaned up connection for user {} in room {}", user_id, room_id);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signaling_message_serialization() {
        let message = SignalingMessage::Join {
            room_id: "test-room".to_string(),
            user_id: "user-123".to_string(),
            user_name: "Test User".to_string(),
        };

        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: SignalingMessage = serde_json::from_str(&serialized).unwrap();

        if let SignalingMessage::Join { room_id, user_id, user_name } = deserialized {
            assert_eq!(room_id, "test-room");
            assert_eq!(user_id, "user-123");
            assert_eq!(user_name, "Test User");
        } else {
            panic!("Unexpected message type");
        }
    }
}