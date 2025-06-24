use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use anyhow::Result;

/// User presence information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPresence {
    pub user_id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub status: PresenceStatus,
    pub cursor_position: Option<CursorPosition>,
    pub selection: Option<TextSelection>,
    pub last_seen: chrono::DateTime<chrono::Utc>,
    pub connection_quality: ConnectionQuality,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PresenceStatus {
    Online,
    Away,
    Busy,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub document_id: Uuid,
    pub line: u32,
    pub column: u32,
    pub absolute_position: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextSelection {
    pub start: CursorPosition,
    pub end: CursorPosition,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionQuality {
    pub latency_ms: Option<u64>,
    pub signal_strength: u8, // 0-100
    pub packet_loss: f32,    // 0.0-1.0
}

/// Presence manager for tracking user activity and status
pub struct PresenceManager {
    /// Active users and their presence information
    users: Arc<RwLock<HashMap<Uuid, UserPresence>>>,
    /// Document-specific presence tracking
    document_users: Arc<RwLock<HashMap<Uuid, Vec<Uuid>>>>,
    /// Presence update callbacks
    presence_callbacks: Arc<RwLock<Vec<Box<dyn Fn(&UserPresence) + Send + Sync>>>>,
}

impl PresenceManager {
    pub fn new() -> Self {
        Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            document_users: Arc::new(RwLock::new(HashMap::new())),
            presence_callbacks: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Update user presence information
    pub async fn update_presence(&self, user_id: Uuid, presence: UserPresence) -> Result<()> {
        {
            let mut users = self.users.write();
            users.insert(user_id, presence.clone());
        }

        // Update document-specific tracking if cursor position is present
        if let Some(cursor) = &presence.cursor_position {
            let mut doc_users = self.document_users.write();
            let users_in_doc = doc_users.entry(cursor.document_id).or_insert_with(Vec::new);
            
            if !users_in_doc.contains(&user_id) {
                users_in_doc.push(user_id);
            }
        }

        // Notify callbacks
        self.notify_presence_update(&presence).await;

        tracing::debug!("Updated presence for user {}: {:?}", user_id, presence.status);
        Ok(())
    }

    /// Get presence information for a specific user
    pub fn get_user_presence(&self, user_id: Uuid) -> Option<UserPresence> {
        self.users.read().get(&user_id).cloned()
    }

    /// Get all users present in a specific document
    pub fn get_document_users(&self, document_id: Uuid) -> Vec<UserPresence> {
        let doc_users = self.document_users.read();
        let user_ids = doc_users.get(&document_id).cloned().unwrap_or_default();
        
        let users = self.users.read();
        user_ids
            .into_iter()
            .filter_map(|id| users.get(&id).cloned())
            .collect()
    }

    /// Get all active users
    pub fn get_all_active_users(&self) -> Vec<UserPresence> {
        self.users
            .read()
            .values()
            .filter(|presence| presence.status != PresenceStatus::Offline)
            .cloned()
            .collect()
    }

    /// Update cursor position for a user
    pub async fn update_cursor_position(
        &self,
        user_id: Uuid,
        cursor_position: CursorPosition,
    ) -> Result<()> {
        let mut users = self.users.write();
        
        if let Some(presence) = users.get_mut(&user_id) {
            presence.cursor_position = Some(cursor_position.clone());
            presence.last_seen = chrono::Utc::now();
            
            // Update document tracking
            drop(users); // Release lock before acquiring document_users lock
            
            let mut doc_users = self.document_users.write();
            let users_in_doc = doc_users.entry(cursor_position.document_id).or_insert_with(Vec::new);
            
            if !users_in_doc.contains(&user_id) {
                users_in_doc.push(user_id);
            }
        }

        Ok(())
    }

    /// Update text selection for a user
    pub async fn update_selection(
        &self,
        user_id: Uuid,
        selection: Option<TextSelection>,
    ) -> Result<()> {
        let mut users = self.users.write();
        
        if let Some(presence) = users.get_mut(&user_id) {
            presence.selection = selection;
            presence.last_seen = chrono::Utc::now();
        }

        Ok(())
    }

    /// Update connection quality for a user
    pub async fn update_connection_quality(
        &self,
        user_id: Uuid,
        quality: ConnectionQuality,
    ) -> Result<()> {
        let mut users = self.users.write();
        
        if let Some(presence) = users.get_mut(&user_id) {
            presence.connection_quality = quality;
            presence.last_seen = chrono::Utc::now();
        }

        Ok(())
    }

    /// Set user status (online, away, busy, offline)
    pub async fn set_user_status(&self, user_id: Uuid, status: PresenceStatus) -> Result<()> {
        let mut users = self.users.write();
        
        if let Some(presence) = users.get_mut(&user_id) {
            presence.status = status.clone();
            presence.last_seen = chrono::Utc::now();

            // If user goes offline, remove from all document tracking
            if status == PresenceStatus::Offline {
                drop(users); // Release lock
                self.remove_user_from_documents(user_id).await?;
            }
        }

        Ok(())
    }

    /// Remove user from all document tracking
    async fn remove_user_from_documents(&self, user_id: Uuid) -> Result<()> {
        let mut doc_users = self.document_users.write();
        
        for users_in_doc in doc_users.values_mut() {
            users_in_doc.retain(|&id| id != user_id);
        }

        // Clean up empty document entries
        doc_users.retain(|_, users| !users.is_empty());

        Ok(())
    }

    /// Get cursor positions for all users in a document
    pub fn get_document_cursors(&self, document_id: Uuid) -> Vec<(Uuid, CursorPosition)> {
        let doc_users = self.document_users.read();
        let user_ids = doc_users.get(&document_id).cloned().unwrap_or_default();
        
        let users = self.users.read();
        user_ids
            .into_iter()
            .filter_map(|id| {
                users.get(&id).and_then(|presence| {
                    presence.cursor_position.as_ref().map(|cursor| (id, cursor.clone()))
                })
            })
            .collect()
    }

    /// Get active selections for all users in a document
    pub fn get_document_selections(&self, document_id: Uuid) -> Vec<(Uuid, TextSelection)> {
        let doc_users = self.document_users.read();
        let user_ids = doc_users.get(&document_id).cloned().unwrap_or_default();
        
        let users = self.users.read();
        user_ids
            .into_iter()
            .filter_map(|id| {
                users.get(&id).and_then(|presence| {
                    presence.selection.as_ref().map(|selection| (id, selection.clone()))
                })
            })
            .collect()
    }

    /// Add presence update callback
    pub fn add_presence_callback<F>(&self, callback: F)
    where
        F: Fn(&UserPresence) + Send + Sync + 'static,
    {
        let mut callbacks = self.presence_callbacks.write();
        callbacks.push(Box::new(callback));
    }

    /// Notify all callbacks of presence update
    async fn notify_presence_update(&self, presence: &UserPresence) {
        let callbacks = self.presence_callbacks.read();
        for callback in callbacks.iter() {
            callback(presence);
        }
    }

    /// Clean up stale presence data
    pub async fn cleanup_stale_presence(&self, timeout_duration: chrono::Duration) -> Result<()> {
        let cutoff_time = chrono::Utc::now() - timeout_duration;
        let mut users_to_remove = Vec::new();

        {
            let users = self.users.read();
            for (user_id, presence) in users.iter() {
                if presence.last_seen < cutoff_time && presence.status != PresenceStatus::Offline {
                    users_to_remove.push(*user_id);
                }
            }
        }

        // Set stale users to offline
        for user_id in users_to_remove {
            self.set_user_status(user_id, PresenceStatus::Offline).await?;
            tracing::info!("Set stale user {} to offline", user_id);
        }

        Ok(())
    }

    /// Get presence statistics
    pub fn get_presence_stats(&self) -> PresenceStats {
        let users = self.users.read();
        let doc_users = self.document_users.read();

        let mut stats = PresenceStats {
            total_users: users.len() as u32,
            online_users: 0,
            away_users: 0,
            busy_users: 0,
            offline_users: 0,
            documents_with_users: doc_users.len() as u32,
            avg_users_per_document: 0.0,
        };

        for presence in users.values() {
            match presence.status {
                PresenceStatus::Online => stats.online_users += 1,
                PresenceStatus::Away => stats.away_users += 1,
                PresenceStatus::Busy => stats.busy_users += 1,
                PresenceStatus::Offline => stats.offline_users += 1,
            }
        }

        if stats.documents_with_users > 0 {
            let total_users_in_docs: usize = doc_users.values().map(|users| users.len()).sum();
            stats.avg_users_per_document = total_users_in_docs as f32 / stats.documents_with_users as f32;
        }

        stats
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PresenceStats {
    pub total_users: u32,
    pub online_users: u32,
    pub away_users: u32,
    pub busy_users: u32,
    pub offline_users: u32,
    pub documents_with_users: u32,
    pub avg_users_per_document: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_presence_update() {
        let manager = PresenceManager::new();
        let user_id = Uuid::new_v4();
        
        let presence = UserPresence {
            user_id,
            display_name: "Test User".to_string(),
            avatar_url: None,
            status: PresenceStatus::Online,
            cursor_position: None,
            selection: None,
            last_seen: chrono::Utc::now(),
            connection_quality: ConnectionQuality {
                latency_ms: Some(50),
                signal_strength: 85,
                packet_loss: 0.01,
            },
        };

        manager.update_presence(user_id, presence.clone()).await.unwrap();
        
        let retrieved = manager.get_user_presence(user_id).unwrap();
        assert_eq!(retrieved.user_id, user_id);
        assert_eq!(retrieved.status, PresenceStatus::Online);
    }

    #[tokio::test]
    async fn test_cursor_tracking() {
        let manager = PresenceManager::new();
        let user_id = Uuid::new_v4();
        let document_id = Uuid::new_v4();
        
        // First add user presence
        let presence = UserPresence {
            user_id,
            display_name: "Test User".to_string(),
            avatar_url: None,
            status: PresenceStatus::Online,
            cursor_position: None,
            selection: None,
            last_seen: chrono::Utc::now(),
            connection_quality: ConnectionQuality {
                latency_ms: Some(50),
                signal_strength: 85,
                packet_loss: 0.01,
            },
        };

        manager.update_presence(user_id, presence).await.unwrap();

        // Update cursor position
        let cursor = CursorPosition {
            document_id,
            line: 10,
            column: 5,
            absolute_position: 150,
        };

        manager.update_cursor_position(user_id, cursor.clone()).await.unwrap();
        
        let doc_cursors = manager.get_document_cursors(document_id);
        assert_eq!(doc_cursors.len(), 1);
        assert_eq!(doc_cursors[0].0, user_id);
        assert_eq!(doc_cursors[0].1.line, 10);
    }

    #[tokio::test]
    async fn test_stale_cleanup() {
        let manager = PresenceManager::new();
        let user_id = Uuid::new_v4();
        
        let mut presence = UserPresence {
            user_id,
            display_name: "Test User".to_string(),
            avatar_url: None,
            status: PresenceStatus::Online,
            cursor_position: None,
            selection: None,
            last_seen: chrono::Utc::now() - chrono::Duration::hours(2), // 2 hours ago
            connection_quality: ConnectionQuality {
                latency_ms: Some(50),
                signal_strength: 85,
                packet_loss: 0.01,
            },
        };

        manager.update_presence(user_id, presence).await.unwrap();
        
        // Cleanup stale presence (1 hour timeout)
        manager.cleanup_stale_presence(chrono::Duration::hours(1)).await.unwrap();
        
        let retrieved = manager.get_user_presence(user_id).unwrap();
        assert_eq!(retrieved.status, PresenceStatus::Offline);
    }
}