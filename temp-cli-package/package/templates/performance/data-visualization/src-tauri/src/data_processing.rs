use anyhow::Result;
use polars::prelude::*;
use rayon::prelude::*;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    pub x: f64,
    pub y: f64,
    pub z: Option<f64>,
    pub value: Option<f64>,
    pub label: Option<String>,
    pub timestamp: Option<i64>,
    pub category: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dataset {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub data: Vec<DataPoint>,
    pub size: usize,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingConfig {
    pub chunk_size: usize,
    pub parallel_processing: bool,
    pub memory_limit_mb: usize,
    pub use_streaming: bool,
}

pub struct DataProcessor {
    thread_pool: rayon::ThreadPool,
}

impl Default for DataProcessor {
    fn default() -> Self {
        let thread_pool = rayon::ThreadPoolBuilder::new()
            .num_threads(num_cpus::get())
            .build()
            .expect("Failed to create thread pool");
        
        Self { thread_pool }
    }
}

impl DataProcessor {
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Process large datasets with optimized performance
    pub async fn process_large_dataset(
        &self,
        mut dataset: Dataset,
        config: ProcessingConfig,
    ) -> Result<Dataset> {
        log::info!("Processing dataset with {} points", dataset.size);
        
        if config.parallel_processing && dataset.data.len() > config.chunk_size {
            dataset.data = self.process_parallel_chunks(&dataset.data, config.chunk_size)?;
        } else {
            dataset.data = self.process_sequential(&dataset.data)?;
        }
        
        dataset.updated_at = chrono::Utc::now();
        dataset.size = dataset.data.len();
        
        log::info!("Processed dataset: {} points", dataset.size);
        Ok(dataset)
    }
    
    /// Process data in parallel chunks for better performance
    fn process_parallel_chunks(&self, data: &[DataPoint], chunk_size: usize) -> Result<Vec<DataPoint>> {
        let processed_chunks: Vec<Vec<DataPoint>> = data
            .par_chunks(chunk_size)
            .map(|chunk| {
                chunk
                    .iter()
                    .map(|point| self.process_single_point(point))
                    .collect()
            })
            .collect();
        
        Ok(processed_chunks.into_iter().flatten().collect())
    }
    
    /// Process data sequentially for smaller datasets
    fn process_sequential(&self, data: &[DataPoint]) -> Result<Vec<DataPoint>> {
        Ok(data
            .iter()
            .map(|point| self.process_single_point(point))
            .collect())
    }
    
    /// Process individual data point with optimizations
    fn process_single_point(&self, point: &DataPoint) -> DataPoint {
        let mut processed = point.clone();
        
        // Apply data cleaning and transformations
        if let Some(value) = processed.value {
            // Normalize outliers
            if value.is_infinite() || value.is_nan() {
                processed.value = Some(0.0);
            }
        }
        
        // Generate derived fields if missing
        if processed.timestamp.is_none() {
            processed.timestamp = Some(chrono::Utc::now().timestamp_millis());
        }
        
        if processed.category.is_none() {
            processed.category = Some(self.classify_point(&processed));
        }
        
        processed
    }
    
    /// Classify data points into categories
    fn classify_point(&self, point: &DataPoint) -> String {
        let value = point.value.unwrap_or(0.0);
        
        match value {
            v if v > 0.8 => "high".to_string(),
            v if v > 0.5 => "medium".to_string(),
            v if v > 0.2 => "low".to_string(),
            _ => "minimal".to_string(),
        }
    }
    
    /// Optimize processing configuration based on dataset size and available memory
    pub fn optimize_config(&self, dataset_size: usize, available_memory_mb: usize) -> Result<ProcessingConfig> {
        let parallel_threshold = 10000;
        let memory_per_point = 150; // bytes per data point (approximate)
        let safe_memory_usage = (available_memory_mb * 1024 * 1024) / 2; // Use 50% of available memory
        
        let max_points_in_memory = safe_memory_usage / memory_per_point;
        let chunk_size = if dataset_size > max_points_in_memory {
            max_points_in_memory / num_cpus::get()
        } else {
            dataset_size / num_cpus::get().max(1)
        }.max(1000); // Minimum chunk size
        
        Ok(ProcessingConfig {
            chunk_size,
            parallel_processing: dataset_size > parallel_threshold,
            memory_limit_mb: available_memory_mb,
            use_streaming: dataset_size > max_points_in_memory,
        })
    }
    
    /// Convert dataset to Polars DataFrame for advanced analytics
    pub fn to_dataframe(&self, dataset: &Dataset) -> Result<DataFrame> {
        let mut x_values = Vec::new();
        let mut y_values = Vec::new();
        let mut z_values = Vec::new();
        let mut value_values = Vec::new();
        let mut categories = Vec::new();
        let mut timestamps = Vec::new();
        
        for point in &dataset.data {
            x_values.push(point.x);
            y_values.push(point.y);
            z_values.push(point.z);
            value_values.push(point.value);
            categories.push(point.category.clone());
            timestamps.push(point.timestamp);
        }
        
        let df = df! [
            "x" => x_values,
            "y" => y_values,
            "z" => z_values,
            "value" => value_values,
            "category" => categories,
            "timestamp" => timestamps,
        ]?;
        
        Ok(df)
    }
    
    /// Generate statistical summary of dataset
    pub fn generate_stats(&self, dataset: &Dataset) -> Result<serde_json::Value> {
        let df = self.to_dataframe(dataset)?;
        
        let stats = serde_json::json!({
            "count": dataset.data.len(),
            "x_stats": {
                "min": df.column("x")?.min::<f64>(),
                "max": df.column("x")?.max::<f64>(),
                "mean": df.column("x")?.mean(),
                "std": df.column("x")?.std(1),
            },
            "y_stats": {
                "min": df.column("y")?.min::<f64>(),
                "max": df.column("y")?.max::<f64>(),
                "mean": df.column("y")?.mean(),
                "std": df.column("y")?.std(1),
            },
            "value_stats": {
                "min": df.column("value")?.min::<f64>(),
                "max": df.column("value")?.max::<f64>(),
                "mean": df.column("value")?.mean(),
                "std": df.column("value")?.std(1),
            },
            "categories": df.column("category")?.n_unique(),
        });
        
        Ok(stats)
    }
    
    /// Filter dataset based on criteria
    pub fn filter_dataset(&self, dataset: &Dataset, filter_expr: &str) -> Result<Dataset> {
        let df = self.to_dataframe(dataset)?;
        
        // Simple filtering examples - can be extended
        let filtered_df = match filter_expr {
            "high_value" => df.filter(&col("value").gt(lit(0.7)))?,
            "positive_x" => df.filter(&col("x").gt(lit(0.0)))?,
            "recent" => {
                let one_hour_ago = chrono::Utc::now().timestamp_millis() - (60 * 60 * 1000);
                df.filter(&col("timestamp").gt(lit(one_hour_ago)))?
            },
            _ => df, // No filter
        };
        
        // Convert back to Dataset
        let mut filtered_dataset = dataset.clone();
        filtered_dataset.data = self.dataframe_to_points(&filtered_df)?;
        filtered_dataset.size = filtered_dataset.data.len();
        filtered_dataset.updated_at = chrono::Utc::now();
        
        Ok(filtered_dataset)
    }
    
    /// Convert Polars DataFrame back to DataPoint vector
    fn dataframe_to_points(&self, df: &DataFrame) -> Result<Vec<DataPoint>> {
        let mut points = Vec::new();
        let height = df.height();
        
        for i in 0..height {
            let point = DataPoint {
                x: df.column("x")?.get(i)?.try_extract::<f64>()?,
                y: df.column("y")?.get(i)?.try_extract::<f64>()?,
                z: df.column("z")?.get(i)?.try_extract::<Option<f64>>()?,
                value: df.column("value")?.get(i)?.try_extract::<Option<f64>>()?,
                category: df.column("category")?.get(i)?.try_extract::<Option<String>>()?,
                timestamp: df.column("timestamp")?.get(i)?.try_extract::<Option<i64>>()?,
                label: None,
                metadata: None,
            };
            points.push(point);
        }
        
        Ok(points)
    }
    
    /// Aggregate data for reduced resolution visualization
    pub fn aggregate_for_visualization(&self, dataset: &Dataset, target_points: usize) -> Result<Dataset> {
        if dataset.data.len() <= target_points {
            return Ok(dataset.clone());
        }
        
        let df = self.to_dataframe(dataset)?;
        let step = dataset.data.len() / target_points;
        
        // Use systematic sampling for now - can be improved with clustering
        let sampled_indices: Vec<usize> = (0..dataset.data.len()).step_by(step).collect();
        let sampled_data: Vec<DataPoint> = sampled_indices
            .iter()
            .filter_map(|&i| dataset.data.get(i).cloned())
            .collect();
        
        let mut aggregated_dataset = dataset.clone();
        aggregated_dataset.data = sampled_data;
        aggregated_dataset.size = aggregated_dataset.data.len();
        aggregated_dataset.updated_at = chrono::Utc::now();
        
        Ok(aggregated_dataset)
    }
}