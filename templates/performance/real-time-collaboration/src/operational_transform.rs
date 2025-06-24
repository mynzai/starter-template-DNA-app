use std::collections::VecDeque;
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use anyhow::{Result, anyhow};

/// Operation types for operational transformation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum OperationType {
    /// Insert text at position
    Insert { position: usize, content: String },
    /// Delete text from position with length
    Delete { position: usize, length: usize },
    /// Retain characters (no-op for transformation)
    Retain { length: usize },
}

/// Single operation with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub id: Uuid,
    pub client_id: Uuid,
    pub operation_type: OperationType,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub revision: u64,
}

/// Result of applying an operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationResult {
    pub success: bool,
    pub new_revision: u64,
    pub transformed_operations: Vec<Operation>,
    pub conflict_resolved: bool,
}

/// Transformation matrix for concurrent operations
#[derive(Debug, Clone)]
pub struct TransformationMatrix {
    /// Priority rules for operation types
    priority_rules: Vec<(OperationType, OperationType, TransformationRule)>,
}

#[derive(Debug, Clone)]
pub enum TransformationRule {
    /// First operation takes priority
    FirstPriority,
    /// Second operation takes priority
    SecondPriority,
    /// Both operations can be applied with position adjustment
    Compose(fn(&OperationType, &OperationType) -> Result<Vec<OperationType>>),
}

/// Main operational transformation engine
pub struct OperationalTransform {
    /// Current document state
    document_content: Arc<RwLock<String>>,
    /// Operation history for conflict resolution
    operation_history: Arc<RwLock<VecDeque<Operation>>>,
    /// Current document revision
    revision: Arc<RwLock<u64>>,
    /// Transformation matrix for concurrent operations
    transformation_matrix: TransformationMatrix,
    /// Maximum history size to prevent memory leaks
    max_history_size: usize,
}

impl OperationalTransform {
    pub fn new() -> Self {
        Self {
            document_content: Arc::new(RwLock::new(String::new())),
            operation_history: Arc::new(RwLock::new(VecDeque::new())),
            revision: Arc::new(RwLock::new(0)),
            transformation_matrix: TransformationMatrix::new(),
            max_history_size: 1000,
        }
    }

    /// Apply a single operation to the document
    pub async fn apply_operation(&self, operation: Operation) -> Result<OperationResult> {
        let mut content = self.document_content.write();
        let mut history = self.operation_history.write();
        let mut revision = self.revision.write();

        // Check for concurrent operations that need transformation
        let concurrent_ops = self.find_concurrent_operations(&operation, &history);
        let mut transformed_operations = Vec::new();
        let mut conflict_resolved = false;

        // Transform operation against concurrent operations
        let mut final_operation = operation.clone();
        for concurrent_op in concurrent_ops {
            match self.transform_operations(&final_operation, &concurrent_op)? {
                Some((transformed_op, _)) => {
                    final_operation = transformed_op;
                    conflict_resolved = true;
                }
                None => {
                    // Operations are incompatible, resolve by timestamp
                    if operation.timestamp < concurrent_op.timestamp {
                        // Current operation takes priority
                        transformed_operations.push(concurrent_op.clone());
                    } else {
                        // Concurrent operation takes priority, reject current
                        return Ok(OperationResult {
                            success: false,
                            new_revision: *revision,
                            transformed_operations: vec![concurrent_op.clone()],
                            conflict_resolved: true,
                        });
                    }
                }
            }
        }

        // Apply the final operation to document content
        let success = match &final_operation.operation_type {
            OperationType::Insert { position, content: insert_content } => {
                if *position <= content.len() {
                    content.insert_str(*position, insert_content);
                    true
                } else {
                    false
                }
            }
            OperationType::Delete { position, length } => {
                if *position < content.len() && *position + *length <= content.len() {
                    content.drain(*position..*position + *length);
                    true
                } else {
                    false
                }
            }
            OperationType::Retain { .. } => true, // No-op
        };

        if success {
            // Update revision and add to history
            *revision += 1;
            final_operation.revision = *revision;
            
            history.push_back(final_operation.clone());
            
            // Cleanup old history if needed
            if history.len() > self.max_history_size {
                history.pop_front();
            }

            transformed_operations.push(final_operation);
        }

        Ok(OperationResult {
            success,
            new_revision: *revision,
            transformed_operations,
            conflict_resolved,
        })
    }

    /// Find operations that occurred concurrently with the given operation
    fn find_concurrent_operations(
        &self,
        operation: &Operation,
        history: &VecDeque<Operation>,
    ) -> Vec<Operation> {
        history
            .iter()
            .filter(|op| {
                op.client_id != operation.client_id
                    && op.revision >= operation.revision
                    && (op.timestamp - operation.timestamp).num_milliseconds().abs() < 1000 // 1 second window
            })
            .cloned()
            .collect()
    }

    /// Transform two concurrent operations
    fn transform_operations(
        &self,
        op1: &Operation,
        op2: &Operation,
    ) -> Result<Option<(Operation, Operation)>> {
        use OperationType::*;

        match (&op1.operation_type, &op2.operation_type) {
            // Insert vs Insert
            (Insert { position: pos1, content: content1 }, Insert { position: pos2, content: content2 }) => {
                if pos1 <= pos2 {
                    // op1 comes first, adjust op2 position
                    let transformed_op2 = Operation {
                        operation_type: Insert {
                            position: pos2 + content1.len(),
                            content: content2.clone(),
                        },
                        ..op2.clone()
                    };
                    Ok(Some((op1.clone(), transformed_op2)))
                } else {
                    // op2 comes first, adjust op1 position
                    let transformed_op1 = Operation {
                        operation_type: Insert {
                            position: pos1 + content2.len(),
                            content: content1.clone(),
                        },
                        ..op1.clone()
                    };
                    Ok(Some((transformed_op1, op2.clone())))
                }
            }

            // Insert vs Delete
            (Insert { position: pos1, content }, Delete { position: pos2, length }) => {
                if pos1 <= *pos2 {
                    // Insert before delete, adjust delete position
                    let transformed_op2 = Operation {
                        operation_type: Delete {
                            position: pos2 + content.len(),
                            length: *length,
                        },
                        ..op2.clone()
                    };
                    Ok(Some((op1.clone(), transformed_op2)))
                } else if *pos1 >= pos2 + length {
                    // Insert after delete, adjust insert position
                    let transformed_op1 = Operation {
                        operation_type: Insert {
                            position: pos1 - length,
                            content: content.clone(),
                        },
                        ..op1.clone()
                    };
                    Ok(Some((transformed_op1, op2.clone())))
                } else {
                    // Insert within delete range - conflict resolution needed
                    self.resolve_insert_delete_conflict(op1, op2)
                }
            }

            // Delete vs Insert (symmetric case)
            (Delete { position: pos1, length }, Insert { position: pos2, content }) => {
                if *pos2 <= pos1 {
                    // Insert before delete, adjust delete position
                    let transformed_op1 = Operation {
                        operation_type: Delete {
                            position: pos1 + content.len(),
                            length: *length,
                        },
                        ..op1.clone()
                    };
                    Ok(Some((transformed_op1, op2.clone())))
                } else if *pos2 >= pos1 + length {
                    // Insert after delete, adjust insert position
                    let transformed_op2 = Operation {
                        operation_type: Insert {
                            position: pos2 - length,
                            content: content.clone(),
                        },
                        ..op2.clone()
                    };
                    Ok(Some((op1.clone(), transformed_op2)))
                } else {
                    // Insert within delete range
                    self.resolve_insert_delete_conflict(op2, op1)
                }
            }

            // Delete vs Delete
            (Delete { position: pos1, length: len1 }, Delete { position: pos2, length: len2 }) => {
                if pos1 + len1 <= *pos2 {
                    // Non-overlapping deletes, op1 before op2
                    let transformed_op2 = Operation {
                        operation_type: Delete {
                            position: pos2 - len1,
                            length: *len2,
                        },
                        ..op2.clone()
                    };
                    Ok(Some((op1.clone(), transformed_op2)))
                } else if pos2 + len2 <= *pos1 {
                    // Non-overlapping deletes, op2 before op1
                    let transformed_op1 = Operation {
                        operation_type: Delete {
                            position: pos1 - len2,
                            length: *len1,
                        },
                        ..op1.clone()
                    };
                    Ok(Some((transformed_op1, op2.clone())))
                } else {
                    // Overlapping deletes - merge them
                    self.resolve_overlapping_deletes(op1, op2)
                }
            }

            // Retain operations don't transform
            (Retain { .. }, _) | (_, Retain { .. }) => Ok(Some((op1.clone(), op2.clone()))),
        }
    }

    /// Resolve conflict when insert operation conflicts with delete
    fn resolve_insert_delete_conflict(
        &self,
        insert_op: &Operation,
        delete_op: &Operation,
    ) -> Result<Option<(Operation, Operation)>> {
        // Priority: preserve user intent - insert wins over delete
        // Adjust delete to exclude the inserted content
        if let (Insert { position: insert_pos, content }, Delete { position: delete_pos, length }) = 
            (&insert_op.operation_type, &delete_op.operation_type) {
            
            let offset_from_delete_start = *insert_pos as i64 - *delete_pos as i64;
            
            if offset_from_delete_start >= 0 && (offset_from_delete_start as usize) < *length {
                // Split delete operation around the insert
                let pre_delete_length = offset_from_delete_start as usize;
                let post_delete_start = insert_pos + content.len();
                let post_delete_length = length - pre_delete_length;
                
                let mut transformed_ops = vec![insert_op.clone()];
                
                // Add pre-delete if it has length
                if pre_delete_length > 0 {
                    transformed_ops.push(Operation {
                        operation_type: Delete {
                            position: *delete_pos,
                            length: pre_delete_length,
                        },
                        ..delete_op.clone()
                    });
                }
                
                // Add post-delete if it has length
                if post_delete_length > 0 {
                    transformed_ops.push(Operation {
                        operation_type: Delete {
                            position: post_delete_start,
                            length: post_delete_length,
                        },
                        ..delete_op.clone()
                    });
                }
                
                // Return the insert and the first transformed delete
                if transformed_ops.len() >= 2 {
                    Ok(Some((transformed_ops[0].clone(), transformed_ops[1].clone())))
                } else {
                    Ok(Some((insert_op.clone(), delete_op.clone())))
                }
            } else {
                Ok(Some((insert_op.clone(), delete_op.clone())))
            }
        } else {
            Err(anyhow!("Invalid operation types for insert-delete conflict resolution"))
        }
    }

    /// Resolve overlapping delete operations
    fn resolve_overlapping_deletes(
        &self,
        op1: &Operation,
        op2: &Operation,
    ) -> Result<Option<(Operation, Operation)>> {
        if let (Delete { position: pos1, length: len1 }, Delete { position: pos2, length: len2 }) = 
            (&op1.operation_type, &op2.operation_type) {
            
            // Merge overlapping deletes into a single delete operation
            let start = (*pos1).min(*pos2);
            let end = (*pos1 + *len1).max(*pos2 + *len2);
            let merged_length = end - start;
            
            let merged_delete = Operation {
                operation_type: Delete {
                    position: start,
                    length: merged_length,
                },
                // Use the earlier timestamp
                timestamp: if op1.timestamp < op2.timestamp { op1.timestamp } else { op2.timestamp },
                ..op1.clone()
            };
            
            // Return merged operation for both
            Ok(Some((merged_delete.clone(), merged_delete)))
        } else {
            Err(anyhow!("Invalid operation types for delete overlap resolution"))
        }
    }

    /// Get current document content
    pub fn get_content(&self) -> String {
        self.document_content.read().clone()
    }

    /// Get current document revision
    pub fn get_revision(&self) -> u64 {
        *self.revision.read()
    }

    /// Set document content (for initialization)
    pub fn set_content(&self, content: String) {
        *self.document_content.write() = content;
        *self.revision.write() += 1;
    }
}

impl TransformationMatrix {
    pub fn new() -> Self {
        Self {
            priority_rules: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_concurrent_inserts() {
        let ot = OperationalTransform::new();
        ot.set_content("Hello World".to_string());

        let op1 = Operation {
            id: Uuid::new_v4(),
            client_id: Uuid::new_v4(),
            operation_type: OperationType::Insert {
                position: 6,
                content: "Beautiful ".to_string(),
            },
            timestamp: chrono::Utc::now(),
            revision: 1,
        };

        let op2 = Operation {
            id: Uuid::new_v4(),
            client_id: Uuid::new_v4(),
            operation_type: OperationType::Insert {
                position: 6,
                content: "Amazing ".to_string(),
            },
            timestamp: chrono::Utc::now(),
            revision: 1,
        };

        let result1 = ot.apply_operation(op1).await.unwrap();
        assert!(result1.success);

        let result2 = ot.apply_operation(op2).await.unwrap();
        assert!(result2.success);
        assert!(result2.conflict_resolved);

        let final_content = ot.get_content();
        assert!(final_content.contains("Beautiful") && final_content.contains("Amazing"));
    }

    #[tokio::test]
    async fn test_insert_delete_conflict() {
        let ot = OperationalTransform::new();
        ot.set_content("Hello World".to_string());

        let insert_op = Operation {
            id: Uuid::new_v4(),
            client_id: Uuid::new_v4(),
            operation_type: OperationType::Insert {
                position: 6,
                content: "Beautiful ".to_string(),
            },
            timestamp: chrono::Utc::now(),
            revision: 1,
        };

        let delete_op = Operation {
            id: Uuid::new_v4(),
            client_id: Uuid::new_v4(),
            operation_type: OperationType::Delete {
                position: 5,
                length: 6, // Delete " World"
            },
            timestamp: chrono::Utc::now(),
            revision: 1,
        };

        let result1 = ot.apply_operation(insert_op).await.unwrap();
        assert!(result1.success);

        let result2 = ot.apply_operation(delete_op).await.unwrap();
        assert!(result2.success);
        assert!(result2.conflict_resolved);

        let final_content = ot.get_content();
        println!("Final content: {}", final_content);
        assert!(final_content.contains("Beautiful"));
    }
}