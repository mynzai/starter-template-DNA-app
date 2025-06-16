use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub render_time: f64,
    pub frame_rate: f64,
    pub memory_usage: f64,
    pub data_size: usize,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub memory_total: u64,
    pub memory_available: u64,
    pub memory_used: u64,
    pub gpu_memory_usage: Option<f64>,
    pub disk_io: Option<f64>,
    pub network_io: Option<f64>,
}

pub struct PerformanceMonitor {
    metrics_history: VecDeque<PerformanceMetrics>,
    system_metrics: VecDeque<SystemMetrics>,
    max_history_size: usize,
    start_time: Instant,
}

impl Default for PerformanceMonitor {
    fn default() -> Self {
        Self {
            metrics_history: VecDeque::new(),
            system_metrics: VecDeque::new(),
            max_history_size: 1000, // Keep last 1000 measurements
            start_time: Instant::now(),
        }
    }
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn new_with_capacity(capacity: usize) -> Self {
        Self {
            metrics_history: VecDeque::with_capacity(capacity),
            system_metrics: VecDeque::with_capacity(capacity),
            max_history_size: capacity,
            start_time: Instant::now(),
        }
    }
    
    /// Record a new performance measurement
    pub fn record_metrics(&mut self, metrics: PerformanceMetrics) {
        if self.metrics_history.len() >= self.max_history_size {
            self.metrics_history.pop_front();
        }
        
        self.metrics_history.push_back(metrics);
    }
    
    /// Get current performance metrics
    pub fn get_current_metrics(&self) -> Result<PerformanceMetrics> {
        let system_info = self.get_system_metrics()?;
        
        let metrics = PerformanceMetrics {
            render_time: 0.0, // Will be updated from frontend
            frame_rate: 0.0,  // Will be updated from frontend
            memory_usage: system_info.memory_used as f64 / (1024.0 * 1024.0), // MB
            data_size: 0,     // Will be updated from frontend
            timestamp: chrono::Utc::now().timestamp_millis(),
        };
        
        Ok(metrics)
    }
    
    /// Get system performance metrics
    pub fn get_system_metrics(&self) -> Result<SystemMetrics> {
        let memory_info = sys_info::mem_info()
            .map_err(|e| anyhow::anyhow!("Failed to get memory info: {}", e))?;
        
        let cpu_usage = self.get_cpu_usage().unwrap_or(0.0);
        
        let metrics = SystemMetrics {
            cpu_usage,
            memory_total: memory_info.total,
            memory_available: memory_info.avail,
            memory_used: memory_info.total - memory_info.avail,
            gpu_memory_usage: self.get_gpu_memory_usage(),
            disk_io: self.get_disk_io(),
            network_io: self.get_network_io(),
        };
        
        Ok(metrics)
    }
    
    /// Calculate average metrics over a time window
    pub fn get_average_metrics(&self, window_seconds: u64) -> Option<PerformanceMetrics> {
        let current_time = chrono::Utc::now().timestamp_millis();
        let window_start = current_time - (window_seconds as i64 * 1000);
        
        let window_metrics: Vec<&PerformanceMetrics> = self.metrics_history
            .iter()
            .filter(|m| m.timestamp >= window_start)
            .collect();
        
        if window_metrics.is_empty() {
            return None;
        }
        
        let count = window_metrics.len() as f64;
        let avg_render_time = window_metrics.iter().map(|m| m.render_time).sum::<f64>() / count;
        let avg_frame_rate = window_metrics.iter().map(|m| m.frame_rate).sum::<f64>() / count;
        let avg_memory_usage = window_metrics.iter().map(|m| m.memory_usage).sum::<f64>() / count;
        let avg_data_size = window_metrics.iter().map(|m| m.data_size).sum::<usize>() / window_metrics.len();
        
        Some(PerformanceMetrics {
            render_time: avg_render_time,
            frame_rate: avg_frame_rate,
            memory_usage: avg_memory_usage,
            data_size: avg_data_size,
            timestamp: current_time,
        })
    }
    
    /// Get performance statistics
    pub fn get_performance_stats(&self) -> serde_json::Value {
        if self.metrics_history.is_empty() {
            return serde_json::json!({
                "count": 0,
                "message": "No metrics available"
            });
        }
        
        let render_times: Vec<f64> = self.metrics_history.iter().map(|m| m.render_time).collect();
        let frame_rates: Vec<f64> = self.metrics_history.iter().map(|m| m.frame_rate).collect();
        let memory_usage: Vec<f64> = self.metrics_history.iter().map(|m| m.memory_usage).collect();
        
        serde_json::json!({
            "count": self.metrics_history.len(),
            "uptime_seconds": self.start_time.elapsed().as_secs(),
            "render_time": {
                "min": render_times.iter().fold(f64::INFINITY, |a, &b| a.min(b)),
                "max": render_times.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b)),
                "avg": render_times.iter().sum::<f64>() / render_times.len() as f64,
                "p95": self.percentile(&render_times, 0.95),
                "p99": self.percentile(&render_times, 0.99),
            },
            "frame_rate": {
                "min": frame_rates.iter().fold(f64::INFINITY, |a, &b| a.min(b)),
                "max": frame_rates.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b)),
                "avg": frame_rates.iter().sum::<f64>() / frame_rates.len() as f64,
                "p95": self.percentile(&frame_rates, 0.95),
                "p99": self.percentile(&frame_rates, 0.99),
            },
            "memory_usage": {
                "min": memory_usage.iter().fold(f64::INFINITY, |a, &b| a.min(b)),
                "max": memory_usage.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b)),
                "avg": memory_usage.iter().sum::<f64>() / memory_usage.len() as f64,
                "current": memory_usage.last().unwrap_or(&0.0),
            }
        })
    }
    
    /// Check if performance is within acceptable thresholds
    pub fn is_performance_healthy(&self) -> bool {
        let recent_metrics = self.get_average_metrics(10); // Last 10 seconds
        
        if let Some(metrics) = recent_metrics {
            // Define performance thresholds
            let max_render_time = 100.0; // 100ms
            let min_frame_rate = 30.0;    // 30fps
            let max_memory_usage = 2048.0; // 2GB
            
            metrics.render_time < max_render_time &&
            metrics.frame_rate > min_frame_rate &&
            metrics.memory_usage < max_memory_usage
        } else {
            true // No recent data, assume healthy
        }
    }
    
    /// Get performance alerts
    pub fn get_performance_alerts(&self) -> Vec<String> {
        let mut alerts = Vec::new();
        
        if let Some(recent) = self.get_average_metrics(30) {
            if recent.render_time > 200.0 {
                alerts.push("High render time detected (>200ms)".to_string());
            }
            
            if recent.frame_rate < 20.0 {
                alerts.push("Low frame rate detected (<20fps)".to_string());
            }
            
            if recent.memory_usage > 4096.0 {
                alerts.push("High memory usage detected (>4GB)".to_string());
            }
        }
        
        // Check system metrics
        if let Ok(system) = self.get_system_metrics() {
            if system.cpu_usage > 90.0 {
                alerts.push("High CPU usage detected (>90%)".to_string());
            }
            
            let memory_usage_percent = (system.memory_used as f64 / system.memory_total as f64) * 100.0;
            if memory_usage_percent > 95.0 {
                alerts.push("Critical memory usage detected (>95%)".to_string());
            }
        }
        
        alerts
    }
    
    /// Clear metrics history
    pub fn clear_history(&mut self) {
        self.metrics_history.clear();
        self.system_metrics.clear();
    }
    
    /// Export metrics to JSON
    pub fn export_metrics(&self) -> Result<String> {
        let export_data = serde_json::json!({
            "export_time": chrono::Utc::now().to_rfc3339(),
            "uptime_seconds": self.start_time.elapsed().as_secs(),
            "metrics_count": self.metrics_history.len(),
            "metrics": self.metrics_history,
            "statistics": self.get_performance_stats(),
            "alerts": self.get_performance_alerts(),
        });
        
        serde_json::to_string_pretty(&export_data)
            .map_err(|e| anyhow::anyhow!("Failed to serialize metrics: {}", e))
    }
    
    // Helper methods for system monitoring
    fn get_cpu_usage(&self) -> Option<f64> {
        // This is a simplified CPU usage calculation
        // In a real implementation, you might want to use a proper system monitoring library
        sys_info::cpu_speed().ok().map(|speed| {
            // Placeholder calculation
            (speed as f64 / 3000.0).min(100.0)
        })
    }
    
    fn get_gpu_memory_usage(&self) -> Option<f64> {
        // GPU memory usage would require platform-specific APIs
        // This is a placeholder implementation
        None
    }
    
    fn get_disk_io(&self) -> Option<f64> {
        // Disk I/O monitoring would require platform-specific APIs
        // This is a placeholder implementation
        None
    }
    
    fn get_network_io(&self) -> Option<f64> {
        // Network I/O monitoring would require platform-specific APIs
        // This is a placeholder implementation
        None
    }
    
    fn percentile(&self, values: &[f64], p: f64) -> f64 {
        if values.is_empty() {
            return 0.0;
        }
        
        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        
        let index = (p * (sorted.len() - 1) as f64).round() as usize;
        sorted[index.min(sorted.len() - 1)]
    }
    
    /// Monitor memory usage and trigger cleanup if needed
    pub fn check_memory_pressure(&self) -> bool {
        if let Ok(system) = self.get_system_metrics() {
            let usage_percent = (system.memory_used as f64 / system.memory_total as f64) * 100.0;
            usage_percent > 85.0 // Trigger cleanup at 85% memory usage
        } else {
            false
        }
    }
    
    /// Get recommended optimizations based on current performance
    pub fn get_optimization_recommendations(&self) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        if let Some(recent) = self.get_average_metrics(60) {
            if recent.render_time > 50.0 {
                recommendations.push("Consider reducing dataset size or enabling level-of-detail rendering".to_string());
            }
            
            if recent.frame_rate < 30.0 {
                recommendations.push("Enable WebGL acceleration or reduce animation complexity".to_string());
            }
            
            if recent.memory_usage > 1024.0 {
                recommendations.push("Enable data streaming or increase buffer management".to_string());
            }
            
            if recent.data_size > 500000 {
                recommendations.push("Consider data aggregation or sampling for large datasets".to_string());
            }
        }
        
        if let Ok(system) = self.get_system_metrics() {
            if system.cpu_usage > 80.0 {
                recommendations.push("Enable parallel processing or reduce computational complexity".to_string());
            }
            
            let memory_usage_percent = (system.memory_used as f64 / system.memory_total as f64) * 100.0;
            if memory_usage_percent > 80.0 {
                recommendations.push("Close other applications or increase system memory".to_string());
            }
        }
        
        if recommendations.is_empty() {
            recommendations.push("Performance is optimal".to_string());
        }
        
        recommendations
    }
}