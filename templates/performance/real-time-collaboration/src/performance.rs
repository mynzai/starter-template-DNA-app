use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Performance metrics for the collaboration platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    /// Average operation latency in milliseconds
    pub avg_operation_latency_ms: f64,
    /// 95th percentile operation latency
    pub p95_operation_latency_ms: f64,
    /// Total operations processed
    pub total_operations: u64,
    /// Operations per second (throughput)
    pub operations_per_second: f64,
    /// Memory usage in bytes
    pub memory_usage_bytes: u64,
    /// Connection statistics
    pub connections: ConnectionMetrics,
    /// WebRTC performance
    pub webrtc: WebRTCMetrics,
    /// Document processing metrics
    pub document: DocumentMetrics,
    /// Timestamp of metrics collection
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionMetrics {
    pub active_connections: u32,
    pub total_connections: u64,
    pub avg_connection_time_ms: f64,
    pub connection_failures: u64,
    pub disconnections: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebRTCMetrics {
    pub avg_peer_latency_ms: f64,
    pub max_peer_latency_ms: u64,
    pub data_channels_active: u32,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub bytes_transmitted: u64,
    pub packet_loss_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetrics {
    pub documents_active: u32,
    pub total_document_operations: u64,
    pub avg_document_size_bytes: u64,
    pub conflicts_resolved: u64,
    pub sync_failures: u64,
}

/// Latency tracking utility
pub struct LatencyTracker {
    start_time: Instant,
}

impl LatencyTracker {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
        }
    }

    pub fn elapsed_ms(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }

    pub fn elapsed_microseconds(&self) -> u64 {
        self.start_time.elapsed().as_micros() as u64
    }
}

/// Performance monitoring and optimization system
pub struct PerformanceMonitor {
    /// Operation latency samples (circular buffer)
    operation_latencies: Arc<RwLock<VecDeque<u64>>>,
    /// Connection timing samples
    connection_timings: Arc<RwLock<VecDeque<u64>>>,
    /// WebRTC latency samples per peer
    peer_latencies: Arc<RwLock<HashMap<Uuid, VecDeque<u64>>>>,
    /// Total counters
    counters: Arc<RwLock<PerformanceCounters>>,
    /// Configuration
    config: PerformanceConfig,
    /// Alert thresholds
    alert_thresholds: AlertThresholds,
}

#[derive(Debug, Clone)]
struct PerformanceCounters {
    total_operations: u64,
    total_connections: u64,
    connection_failures: u64,
    disconnections: u64,
    messages_sent: u64,
    messages_received: u64,
    bytes_transmitted: u64,
    conflicts_resolved: u64,
    sync_failures: u64,
    active_connections: u32,
    active_documents: u32,
    data_channels_active: u32,
}

#[derive(Debug, Clone)]
pub struct PerformanceConfig {
    /// Maximum samples to keep in memory
    max_samples: usize,
    /// Sample retention period
    sample_retention_duration: Duration,
    /// Metrics collection interval
    collection_interval: Duration,
    /// Enable detailed profiling
    enable_profiling: bool,
}

#[derive(Debug, Clone)]
pub struct AlertThresholds {
    /// Maximum acceptable latency in milliseconds
    max_operation_latency_ms: u64,
    /// Maximum acceptable peer latency
    max_peer_latency_ms: u64,
    /// Maximum memory usage in bytes
    max_memory_usage_bytes: u64,
    /// Minimum throughput (ops/sec)
    min_throughput: f64,
    /// Maximum packet loss rate
    max_packet_loss_rate: f64,
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            max_samples: 10000,
            sample_retention_duration: Duration::from_secs(3600), // 1 hour
            collection_interval: Duration::from_secs(60), // 1 minute
            enable_profiling: true,
        }
    }
}

impl Default for AlertThresholds {
    fn default() -> Self {
        Self {
            max_operation_latency_ms: 150, // Target: <150ms
            max_peer_latency_ms: 200,
            max_memory_usage_bytes: 100 * 1024 * 1024, // 100MB per client
            min_throughput: 100.0, // 100 ops/sec minimum
            max_packet_loss_rate: 0.05, // 5% max packet loss
        }
    }
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self::with_config(PerformanceConfig::default(), AlertThresholds::default())
    }

    pub fn with_config(config: PerformanceConfig, thresholds: AlertThresholds) -> Self {
        Self {
            operation_latencies: Arc::new(RwLock::new(VecDeque::new())),
            connection_timings: Arc::new(RwLock::new(VecDeque::new())),
            peer_latencies: Arc::new(RwLock::new(HashMap::new())),
            counters: Arc::new(RwLock::new(PerformanceCounters::default())),
            config,
            alert_thresholds: thresholds,
        }
    }

    /// Record operation latency
    pub fn record_operation_latency(&self, latency_ms: u64) {
        let mut latencies = self.operation_latencies.write();
        latencies.push_back(latency_ms);
        
        // Keep only recent samples
        if latencies.len() > self.config.max_samples {
            latencies.pop_front();
        }

        // Update counters
        let mut counters = self.counters.write();
        counters.total_operations += 1;

        // Check for performance alerts
        if latency_ms > self.alert_thresholds.max_operation_latency_ms {
            self.trigger_latency_alert(latency_ms);
        }
    }

    /// Record connection timing
    pub fn record_connection_time(&self, connection_time_ms: u64, success: bool) {
        if success {
            let mut timings = self.connection_timings.write();
            timings.push_back(connection_time_ms);
            
            if timings.len() > self.config.max_samples {
                timings.pop_front();
            }

            let mut counters = self.counters.write();
            counters.total_connections += 1;
            counters.active_connections += 1;
        } else {
            let mut counters = self.counters.write();
            counters.connection_failures += 1;
        }
    }

    /// Record peer latency
    pub fn record_peer_latency(&self, peer_id: Uuid, latency_ms: u64) {
        let mut peer_latencies = self.peer_latencies.write();
        let latencies = peer_latencies.entry(peer_id).or_insert_with(VecDeque::new);
        latencies.push_back(latency_ms);
        
        if latencies.len() > self.config.max_samples {
            latencies.pop_front();
        }

        // Check for peer latency alerts
        if latency_ms > self.alert_thresholds.max_peer_latency_ms {
            self.trigger_peer_latency_alert(peer_id, latency_ms);
        }
    }

    /// Record WebRTC metrics
    pub fn record_webrtc_metrics(&self, bytes_sent: u64, bytes_received: u64, packet_loss: f64) {
        let mut counters = self.counters.write();
        counters.bytes_transmitted += bytes_sent + bytes_received;
        counters.messages_sent += 1;
        counters.messages_received += 1;

        // Check packet loss alerts
        if packet_loss > self.alert_thresholds.max_packet_loss_rate {
            self.trigger_packet_loss_alert(packet_loss);
        }
    }

    /// Record document operation metrics
    pub fn record_document_operation(&self, conflict_resolved: bool, sync_failed: bool) {
        let mut counters = self.counters.write();
        
        if conflict_resolved {
            counters.conflicts_resolved += 1;
        }
        
        if sync_failed {
            counters.sync_failures += 1;
        }
    }

    /// Update connection count
    pub fn update_connection_count(&self, active_connections: u32, data_channels: u32) {
        let mut counters = self.counters.write();
        counters.active_connections = active_connections;
        counters.data_channels_active = data_channels;
    }

    /// Update document count
    pub fn update_document_count(&self, active_documents: u32) {
        let mut counters = self.counters.write();
        counters.active_documents = active_documents;
    }

    /// Calculate current performance metrics
    pub async fn get_metrics(&self) -> anyhow::Result<serde_json::Value> {
        let operation_latencies = self.operation_latencies.read();
        let connection_timings = self.connection_timings.read();
        let peer_latencies = self.peer_latencies.read();
        let counters = self.counters.read();

        // Calculate operation latency statistics
        let (avg_op_latency, p95_op_latency) = if !operation_latencies.is_empty() {
            let sum: u64 = operation_latencies.iter().sum();
            let avg = sum as f64 / operation_latencies.len() as f64;
            
            let mut sorted_latencies: Vec<u64> = operation_latencies.iter().cloned().collect();
            sorted_latencies.sort();
            let p95_index = (sorted_latencies.len() as f64 * 0.95) as usize;
            let p95 = sorted_latencies.get(p95_index).cloned().unwrap_or(0);
            
            (avg, p95 as f64)
        } else {
            (0.0, 0.0)
        };

        // Calculate connection timing statistics
        let avg_connection_time = if !connection_timings.is_empty() {
            let sum: u64 = connection_timings.iter().sum();
            sum as f64 / connection_timings.len() as f64
        } else {
            0.0
        };

        // Calculate peer latency statistics
        let (avg_peer_latency, max_peer_latency) = if !peer_latencies.is_empty() {
            let all_latencies: Vec<u64> = peer_latencies.values()
                .flat_map(|latencies| latencies.iter().cloned())
                .collect();
            
            if !all_latencies.is_empty() {
                let sum: u64 = all_latencies.iter().sum();
                let avg = sum as f64 / all_latencies.len() as f64;
                let max = *all_latencies.iter().max().unwrap_or(&0);
                (avg, max)
            } else {
                (0.0, 0)
            }
        } else {
            (0.0, 0)
        };

        // Calculate throughput (operations per second)
        let operations_per_second = if !operation_latencies.is_empty() {
            // Simplified calculation - in reality you'd track over a time window
            counters.total_operations as f64 / self.config.collection_interval.as_secs() as f64
        } else {
            0.0
        };

        // Get memory usage (simplified - would use actual system metrics)
        let memory_usage_bytes = self.estimate_memory_usage();

        let metrics = PerformanceMetrics {
            avg_operation_latency_ms: avg_op_latency,
            p95_operation_latency_ms: p95_op_latency,
            total_operations: counters.total_operations,
            operations_per_second,
            memory_usage_bytes,
            connections: ConnectionMetrics {
                active_connections: counters.active_connections,
                total_connections: counters.total_connections,
                avg_connection_time_ms: avg_connection_time,
                connection_failures: counters.connection_failures,
                disconnections: counters.disconnections,
            },
            webrtc: WebRTCMetrics {
                avg_peer_latency_ms: avg_peer_latency,
                max_peer_latency_ms: max_peer_latency,
                data_channels_active: counters.data_channels_active,
                messages_sent: counters.messages_sent,
                messages_received: counters.messages_received,
                bytes_transmitted: counters.bytes_transmitted,
                packet_loss_rate: 0.0, // Would be calculated from actual WebRTC stats
            },
            document: DocumentMetrics {
                documents_active: counters.active_documents,
                total_document_operations: counters.total_operations,
                avg_document_size_bytes: 1024, // Placeholder
                conflicts_resolved: counters.conflicts_resolved,
                sync_failures: counters.sync_failures,
            },
            timestamp: chrono::Utc::now(),
        };

        Ok(serde_json::to_value(metrics)?)
    }

    /// Generate performance optimization recommendations
    pub async fn get_optimization_recommendations(&self) -> Vec<OptimizationRecommendation> {
        let mut recommendations = Vec::new();
        
        let operation_latencies = self.operation_latencies.read();
        let counters = self.counters.read();

        // Check latency performance
        if !operation_latencies.is_empty() {
            let avg_latency = operation_latencies.iter().sum::<u64>() as f64 / operation_latencies.len() as f64;
            
            if avg_latency > self.alert_thresholds.max_operation_latency_ms as f64 {
                recommendations.push(OptimizationRecommendation {
                    category: "Latency".to_string(),
                    severity: RecommendationSeverity::High,
                    description: format!("Average operation latency ({:.1}ms) exceeds target ({}ms)", 
                                       avg_latency, self.alert_thresholds.max_operation_latency_ms),
                    suggestions: vec![
                        "Consider implementing operation batching".to_string(),
                        "Optimize operational transformation algorithm".to_string(),
                        "Check network connectivity and reduce RTT".to_string(),
                        "Enable compression for data channels".to_string(),
                    ],
                });
            }
        }

        // Check memory usage
        let memory_usage = self.estimate_memory_usage();
        if memory_usage > self.alert_thresholds.max_memory_usage_bytes {
            recommendations.push(OptimizationRecommendation {
                category: "Memory".to_string(),
                severity: RecommendationSeverity::Medium,
                description: format!("Memory usage ({} MB) exceeds target ({} MB)", 
                                   memory_usage / 1024 / 1024, 
                                   self.alert_thresholds.max_memory_usage_bytes / 1024 / 1024),
                suggestions: vec![
                    "Implement operation history cleanup".to_string(),
                    "Reduce sample buffer sizes".to_string(),
                    "Optimize document state representation".to_string(),
                ],
            });
        }

        // Check connection stability
        if counters.connection_failures > 0 {
            let failure_rate = counters.connection_failures as f64 / counters.total_connections as f64;
            if failure_rate > 0.1 { // More than 10% failure rate
                recommendations.push(OptimizationRecommendation {
                    category: "Connectivity".to_string(),
                    severity: RecommendationSeverity::High,
                    description: format!("High connection failure rate: {:.1}%", failure_rate * 100.0),
                    suggestions: vec![
                        "Add TURN servers for better connectivity".to_string(),
                        "Implement connection retry logic".to_string(),
                        "Check firewall and NAT configurations".to_string(),
                    ],
                });
            }
        }

        recommendations
    }

    /// Estimate current memory usage
    fn estimate_memory_usage(&self) -> u64 {
        let operation_latencies = self.operation_latencies.read();
        let connection_timings = self.connection_timings.read();
        let peer_latencies = self.peer_latencies.read();

        // Rough estimation based on data structures
        let base_size = std::mem::size_of::<PerformanceMonitor>() as u64;
        let latency_size = operation_latencies.len() as u64 * 8; // u64 per sample
        let connection_size = connection_timings.len() as u64 * 8;
        let peer_size = peer_latencies.len() as u64 * (16 + 1000 * 8); // UUID + samples

        base_size + latency_size + connection_size + peer_size
    }

    // Alert methods
    fn trigger_latency_alert(&self, latency_ms: u64) {
        tracing::warn!("Operation latency alert: {}ms exceeds threshold {}ms", 
                      latency_ms, self.alert_thresholds.max_operation_latency_ms);
    }

    fn trigger_peer_latency_alert(&self, peer_id: Uuid, latency_ms: u64) {
        tracing::warn!("Peer {} latency alert: {}ms exceeds threshold {}ms", 
                      peer_id, latency_ms, self.alert_thresholds.max_peer_latency_ms);
    }

    fn trigger_packet_loss_alert(&self, packet_loss: f64) {
        tracing::warn!("Packet loss alert: {:.2}% exceeds threshold {:.2}%", 
                      packet_loss * 100.0, self.alert_thresholds.max_packet_loss_rate * 100.0);
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct OptimizationRecommendation {
    pub category: String,
    pub severity: RecommendationSeverity,
    pub description: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub enum RecommendationSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for PerformanceCounters {
    fn default() -> Self {
        Self {
            total_operations: 0,
            total_connections: 0,
            connection_failures: 0,
            disconnections: 0,
            messages_sent: 0,
            messages_received: 0,
            bytes_transmitted: 0,
            conflicts_resolved: 0,
            sync_failures: 0,
            active_connections: 0,
            active_documents: 0,
            data_channels_active: 0,
        }
    }
}