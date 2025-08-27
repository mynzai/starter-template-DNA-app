use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use anyhow::{Result, anyhow};

/// Document content and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub created_by: Uuid,
    pub version: u64,
    pub metadata: DocumentMetadata,
}

/// Document metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub language: Option<String>,
    pub file_extension: Option<String>,
    pub size_bytes: usize,
    pub line_count: u32,
    pub character_count: usize,
    pub word_count: usize,
    pub collaborators: Vec<Uuid>,
    pub tags: Vec<String>,
}

/// Current state of a document including operational transform state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentState {
    pub document: Document,
    pub current_revision: u64,
    pub operation_count: u64,
    pub active_collaborators: Vec<Uuid>,
    pub last_operation_timestamp: Option<chrono::DateTime<chrono::Utc>>,
    pub conflict_count: u64,
    pub sync_state: SyncState,
}

/// Document synchronization state
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncState {
    /// All clients are synchronized
    Synchronized,
    /// Minor conflicts being resolved
    MinorConflicts,
    /// Major conflicts requiring manual resolution
    MajorConflicts,
    /// Document is being synchronized
    Synchronizing,
    /// Document is corrupted and needs recovery
    Corrupted,
}

/// Document version for conflict resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentVersion {
    pub version: u64,
    pub content: String,
    pub operations_applied: Vec<String>, // Operation IDs
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub author: Uuid,
}

/// Document manager for handling collaborative documents
pub struct DocumentManager {
    /// Active documents
    documents: Arc<RwLock<HashMap<Uuid, Document>>>,
    /// Document states including OT state
    document_states: Arc<RwLock<HashMap<Uuid, DocumentState>>>,
    /// Document version history for rollback
    version_history: Arc<RwLock<HashMap<Uuid, Vec<DocumentVersion>>>>,
    /// Maximum versions to keep per document
    max_versions_per_document: usize,
}

impl DocumentManager {
    pub fn new() -> Self {
        Self {
            documents: Arc::new(RwLock::new(HashMap::new())),
            document_states: Arc::new(RwLock::new(HashMap::new())),
            version_history: Arc::new(RwLock::new(HashMap::new())),
            max_versions_per_document: 100, // Keep last 100 versions
        }
    }

    /// Create a new document
    pub async fn create_document(
        &self,
        title: String,
        content: String,
        created_by: Uuid,
    ) -> Result<Document> {
        let document_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        let metadata = DocumentMetadata {
            language: Self::detect_language(&title, &content),
            file_extension: Self::extract_file_extension(&title),
            size_bytes: content.len(),
            line_count: content.lines().count() as u32,
            character_count: content.chars().count(),
            word_count: content.split_whitespace().count(),
            collaborators: vec![created_by],
            tags: Vec::new(),
        };

        let document = Document {
            id: document_id,
            title,
            content: content.clone(),
            created_at: now,
            updated_at: now,
            created_by,
            version: 1,
            metadata,
        };

        let document_state = DocumentState {
            document: document.clone(),
            current_revision: 1,
            operation_count: 0,
            active_collaborators: vec![created_by],
            last_operation_timestamp: None,
            conflict_count: 0,
            sync_state: SyncState::Synchronized,
        };

        // Create initial version
        let initial_version = DocumentVersion {
            version: 1,
            content,
            operations_applied: Vec::new(),
            timestamp: now,
            author: created_by,
        };

        // Store document, state, and initial version
        {
            let mut documents = self.documents.write();
            let mut states = self.document_states.write();
            let mut history = self.version_history.write();

            documents.insert(document_id, document.clone());
            states.insert(document_id, document_state);
            history.insert(document_id, vec![initial_version]);
        }

        tracing::info!("Created document {} by user {}", document_id, created_by);
        Ok(document)
    }

    /// Get a document by ID
    pub async fn get_document(&self, document_id: Uuid) -> Option<Document> {
        self.documents.read().get(&document_id).cloned()
    }

    /// Get document state including OT information
    pub async fn get_document_state(&self, document_id: Uuid) -> Result<DocumentState> {
        self.document_states
            .read()
            .get(&document_id)
            .cloned()
            .ok_or_else(|| anyhow!("Document not found: {}", document_id))
    }

    /// Update document content (called after successful OT operation)
    pub async fn update_document_content(
        &self,
        document_id: Uuid,
        new_content: String,
        updated_by: Uuid,
        operation_id: String,
    ) -> Result<()> {
        let now = chrono::Utc::now();
        
        {
            let mut documents = self.documents.write();
            let mut states = self.document_states.write();
            
            if let Some(document) = documents.get_mut(&document_id) {
                document.content = new_content.clone();
                document.updated_at = now;
                document.version += 1;
                
                // Update metadata
                document.metadata.size_bytes = new_content.len();
                document.metadata.line_count = new_content.lines().count() as u32;
                document.metadata.character_count = new_content.chars().count();
                document.metadata.word_count = new_content.split_whitespace().count();
                
                // Add collaborator if not already present
                if !document.metadata.collaborators.contains(&updated_by) {
                    document.metadata.collaborators.push(updated_by);
                }
            }
            
            if let Some(state) = states.get_mut(&document_id) {
                state.document.content = new_content.clone();
                state.document.updated_at = now;
                state.document.version += 1;
                state.current_revision += 1;
                state.operation_count += 1;
                state.last_operation_timestamp = Some(now);
                
                // Add collaborator to active list if not present
                if !state.active_collaborators.contains(&updated_by) {
                    state.active_collaborators.push(updated_by);
                }
            }
        }

        // Create new version
        self.create_version(document_id, new_content, operation_id, updated_by).await?;
        
        tracing::debug!("Updated document {} content by user {}", document_id, updated_by);
        Ok(())
    }

    /// Create a new version snapshot
    async fn create_version(
        &self,
        document_id: Uuid,
        content: String,
        operation_id: String,
        author: Uuid,
    ) -> Result<()> {
        let version = {
            let documents = self.documents.read();
            if let Some(document) = documents.get(&document_id) {
                document.version + 1
            } else {
                return Err(anyhow!("Document not found for versioning"));
            }
        };

        let new_version = DocumentVersion {
            version,
            content,
            operations_applied: vec![operation_id],
            timestamp: chrono::Utc::now(),
            author,
        };

        let mut history = self.version_history.write();
        let versions = history.entry(document_id).or_insert_with(Vec::new);
        versions.push(new_version);

        // Cleanup old versions if we exceed the limit
        if versions.len() > self.max_versions_per_document {
            versions.remove(0);
        }

        Ok(())
    }

    /// Update document sync state
    pub async fn update_sync_state(&self, document_id: Uuid, sync_state: SyncState) -> Result<()> {
        let mut states = self.document_states.write();
        
        if let Some(state) = states.get_mut(&document_id) {
            state.sync_state = sync_state;
            Ok(())
        } else {
            Err(anyhow!("Document state not found: {}", document_id))
        }
    }

    /// Increment conflict count
    pub async fn increment_conflict_count(&self, document_id: Uuid) -> Result<()> {
        let mut states = self.document_states.write();
        
        if let Some(state) = states.get_mut(&document_id) {
            state.conflict_count += 1;
            
            // Update sync state based on conflict count
            if state.conflict_count > 10 {
                state.sync_state = SyncState::MajorConflicts;
            } else if state.conflict_count > 3 {
                state.sync_state = SyncState::MinorConflicts;
            }
            
            Ok(())
        } else {
            Err(anyhow!("Document state not found: {}", document_id))
        }
    }

    /// Add/remove active collaborator
    pub async fn update_collaborator_status(
        &self,
        document_id: Uuid,
        user_id: Uuid,
        is_active: bool,
    ) -> Result<()> {
        let mut states = self.document_states.write();
        
        if let Some(state) = states.get_mut(&document_id) {
            if is_active && !state.active_collaborators.contains(&user_id) {
                state.active_collaborators.push(user_id);
            } else if !is_active {
                state.active_collaborators.retain(|&id| id != user_id);
            }
            Ok(())
        } else {
            Err(anyhow!("Document state not found: {}", document_id))
        }
    }

    /// Get document version history
    pub async fn get_version_history(&self, document_id: Uuid) -> Vec<DocumentVersion> {
        self.version_history
            .read()
            .get(&document_id)
            .cloned()
            .unwrap_or_default()
    }

    /// Rollback document to a specific version
    pub async fn rollback_to_version(
        &self,
        document_id: Uuid,
        target_version: u64,
        rollback_by: Uuid,
    ) -> Result<()> {
        let target_content = {
            let history = self.version_history.read();
            if let Some(versions) = history.get(&document_id) {
                versions
                    .iter()
                    .find(|v| v.version == target_version)
                    .map(|v| v.content.clone())
            } else {
                None
            }
        };

        if let Some(content) = target_content {
            let rollback_operation_id = format!("rollback-{}-{}", target_version, Uuid::new_v4());
            self.update_document_content(document_id, content, rollback_by, rollback_operation_id).await?;
            tracing::info!("Rolled back document {} to version {} by user {}", 
                         document_id, target_version, rollback_by);
            Ok(())
        } else {
            Err(anyhow!("Version {} not found for document {}", target_version, document_id))
        }
    }

    /// Get all documents for a user
    pub async fn get_user_documents(&self, user_id: Uuid) -> Vec<Document> {
        self.documents
            .read()
            .values()
            .filter(|doc| {
                doc.created_by == user_id || doc.metadata.collaborators.contains(&user_id)
            })
            .cloned()
            .collect()
    }

    /// Search documents by title or content
    pub async fn search_documents(&self, query: &str, user_id: Uuid) -> Vec<Document> {
        let query_lower = query.to_lowercase();
        
        self.documents
            .read()
            .values()
            .filter(|doc| {
                // User must have access to the document
                (doc.created_by == user_id || doc.metadata.collaborators.contains(&user_id))
                    && (doc.title.to_lowercase().contains(&query_lower)
                        || doc.content.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect()
    }

    /// Delete a document
    pub async fn delete_document(&self, document_id: Uuid, deleted_by: Uuid) -> Result<()> {
        let document = {
            let documents = self.documents.read();
            documents.get(&document_id).cloned()
        };

        if let Some(doc) = document {
            // Check if user has permission to delete
            if doc.created_by != deleted_by && !doc.metadata.collaborators.contains(&deleted_by) {
                return Err(anyhow!("User {} does not have permission to delete document {}", 
                                 deleted_by, document_id));
            }

            // Remove from all storage
            let mut documents = self.documents.write();
            let mut states = self.document_states.write();
            let mut history = self.version_history.write();

            documents.remove(&document_id);
            states.remove(&document_id);
            history.remove(&document_id);

            tracing::info!("Deleted document {} by user {}", document_id, deleted_by);
            Ok(())
        } else {
            Err(anyhow!("Document not found: {}", document_id))
        }
    }

    // Helper methods
    fn detect_language(title: &str, content: &str) -> Option<String> {
        // Simple language detection based on file extension or content patterns
        if let Some(ext) = Self::extract_file_extension(title) {
            match ext.as_str() {
                "rs" => Some("rust".to_string()),
                "js" | "jsx" => Some("javascript".to_string()),
                "ts" | "tsx" => Some("typescript".to_string()),
                "py" => Some("python".to_string()),
                "java" => Some("java".to_string()),
                "cpp" | "cc" | "cxx" => Some("cpp".to_string()),
                "c" => Some("c".to_string()),
                "go" => Some("go".to_string()),
                "rb" => Some("ruby".to_string()),
                "php" => Some("php".to_string()),
                "html" => Some("html".to_string()),
                "css" => Some("css".to_string()),
                "md" => Some("markdown".to_string()),
                "json" => Some("json".to_string()),
                "yaml" | "yml" => Some("yaml".to_string()),
                "xml" => Some("xml".to_string()),
                _ => None,
            }
        } else {
            // Simple content-based detection
            if content.contains("fn main()") || content.contains("use std::") {
                Some("rust".to_string())
            } else if content.contains("function") && content.contains("=>") {
                Some("javascript".to_string())
            } else if content.contains("def ") && content.contains("import ") {
                Some("python".to_string())
            } else {
                None
            }
        }
    }

    fn extract_file_extension(filename: &str) -> Option<String> {
        filename
            .rfind('.')
            .map(|dot_index| filename[dot_index + 1..].to_lowercase())
    }
}

impl Default for DocumentMetadata {
    fn default() -> Self {
        Self {
            language: None,
            file_extension: None,
            size_bytes: 0,
            line_count: 0,
            character_count: 0,
            word_count: 0,
            collaborators: Vec::new(),
            tags: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_document_creation() {
        let manager = DocumentManager::new();
        let user_id = Uuid::new_v4();
        
        let document = manager
            .create_document(
                "test.rs".to_string(),
                "fn main() { println!(\"Hello, world!\"); }".to_string(),
                user_id,
            )
            .await
            .unwrap();

        assert_eq!(document.title, "test.rs");
        assert_eq!(document.created_by, user_id);
        assert_eq!(document.metadata.language, Some("rust".to_string()));
        assert_eq!(document.metadata.file_extension, Some("rs".to_string()));
    }

    #[tokio::test]
    async fn test_document_update() {
        let manager = DocumentManager::new();
        let user_id = Uuid::new_v4();
        
        let document = manager
            .create_document(
                "test.txt".to_string(),
                "Original content".to_string(),
                user_id,
            )
            .await
            .unwrap();

        manager
            .update_document_content(
                document.id,
                "Updated content".to_string(),
                user_id,
                "op-123".to_string(),
            )
            .await
            .unwrap();

        let updated_doc = manager.get_document(document.id).await.unwrap();
        assert_eq!(updated_doc.content, "Updated content");
        assert!(updated_doc.version > document.version);
    }

    #[tokio::test]
    async fn test_version_rollback() {
        let manager = DocumentManager::new();
        let user_id = Uuid::new_v4();
        
        let document = manager
            .create_document(
                "test.txt".to_string(),
                "Version 1".to_string(),
                user_id,
            )
            .await
            .unwrap();

        // Update to version 2
        manager
            .update_document_content(
                document.id,
                "Version 2".to_string(),
                user_id,
                "op-1".to_string(),
            )
            .await
            .unwrap();

        // Update to version 3
        manager
            .update_document_content(
                document.id,
                "Version 3".to_string(),
                user_id,
                "op-2".to_string(),
            )
            .await
            .unwrap();

        // Rollback to version 2
        manager
            .rollback_to_version(document.id, 2, user_id)
            .await
            .unwrap();

        let rolled_back_doc = manager.get_document(document.id).await.unwrap();
        assert_eq!(rolled_back_doc.content, "Version 2");
    }
}