use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;
use polars::prelude::*;

use crate::data_processing::{Dataset, DataPoint};

pub struct FileManager {
    temp_dir: std::path::PathBuf,
}

impl Default for FileManager {
    fn default() -> Self {
        let temp_dir = std::env::temp_dir().join("dataviz-platform");
        std::fs::create_dir_all(&temp_dir).unwrap_or_default();
        
        Self { temp_dir }
    }
}

impl FileManager {
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Load dataset from various file formats
    pub async fn load_dataset(&self, file_path: &str) -> Result<Dataset> {
        let path = Path::new(file_path);
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();
        
        log::info!("Loading dataset from: {}", file_path);
        
        match extension.as_str() {
            "csv" => self.load_csv(file_path).await,
            "json" => self.load_json(file_path).await,
            "parquet" => self.load_parquet(file_path).await,
            _ => Err(anyhow::anyhow!("Unsupported file format: {}", extension)),
        }
    }
    
    async fn load_csv(&self, file_path: &str) -> Result<Dataset> {
        let df = LazyFrame::scan_csv(file_path, ScanArgsCSV::default())?
            .collect()?;
        
        self.dataframe_to_dataset(df, file_path).await
    }
    
    async fn load_json(&self, file_path: &str) -> Result<Dataset> {
        let content = fs::read_to_string(file_path).await?;
        
        // Try to parse as array of data points first
        if let Ok(data_points) = serde_json::from_str::<Vec<DataPoint>>(&content) {
            return Ok(Dataset {
                id: uuid::Uuid::new_v4().to_string(),
                name: Path::new(file_path)
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                description: Some("Loaded from JSON file".to_string()),
                data: data_points.clone(),
                size: data_points.len(),
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
            });
        }
        
        // Try to parse as complete dataset
        if let Ok(dataset) = serde_json::from_str::<Dataset>(&content) {
            return Ok(dataset);
        }
        
        // Try to parse as generic JSON and convert
        let json_value: serde_json::Value = serde_json::from_str(&content)?;
        self.json_to_dataset(json_value, file_path).await
    }
    
    async fn load_parquet(&self, file_path: &str) -> Result<Dataset> {
        let df = LazyFrame::scan_parquet(file_path, ScanArgsParquet::default())?
            .collect()?;
        
        self.dataframe_to_dataset(df, file_path).await
    }
    
    async fn dataframe_to_dataset(&self, df: DataFrame, file_path: &str) -> Result<Dataset> {
        let mut data_points = Vec::new();
        let height = df.height();
        
        // Try to identify columns
        let x_col = self.find_column(&df, &["x", "X", "longitude", "lon", "lng"])?;
        let y_col = self.find_column(&df, &["y", "Y", "latitude", "lat"])?;
        let z_col = self.find_column(&df, &["z", "Z", "altitude", "alt", "elevation"]).ok();
        let value_col = self.find_column(&df, &["value", "val", "amount", "count", "size"]).ok();
        let category_col = self.find_column(&df, &["category", "cat", "type", "class", "group"]).ok();
        let timestamp_col = self.find_column(&df, &["timestamp", "time", "date", "ts"]).ok();
        let label_col = self.find_column(&df, &["label", "name", "title", "id"]).ok();
        
        for i in 0..height {
            let point = DataPoint {
                x: self.get_float_value(&df, &x_col, i)?,
                y: self.get_float_value(&df, &y_col, i)?,
                z: z_col.as_ref().and_then(|col| self.get_float_value(&df, col, i).ok()),
                value: value_col.as_ref().and_then(|col| self.get_float_value(&df, col, i).ok()),
                category: category_col.as_ref().and_then(|col| self.get_string_value(&df, col, i).ok()),
                timestamp: timestamp_col.as_ref().and_then(|col| self.get_timestamp_value(&df, col, i).ok()),
                label: label_col.as_ref().and_then(|col| self.get_string_value(&df, col, i).ok()),
                metadata: None,
            };
            data_points.push(point);
        }
        
        Ok(Dataset {
            id: uuid::Uuid::new_v4().to_string(),
            name: Path::new(file_path)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            description: Some(format!("Loaded from {} with {} rows", file_path, height)),
            data: data_points,
            size: height,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }
    
    async fn json_to_dataset(&self, json: serde_json::Value, file_path: &str) -> Result<Dataset> {
        let mut data_points = Vec::new();
        
        match json {
            serde_json::Value::Array(arr) => {
                for (i, item) in arr.iter().enumerate() {
                    if let Some(point) = self.json_object_to_point(item, i)? {
                        data_points.push(point);
                    }
                }
            }
            serde_json::Value::Object(obj) => {
                // Handle object with array data
                for (key, value) in obj.iter() {
                    if let serde_json::Value::Array(arr) = value {
                        for (i, item) in arr.iter().enumerate() {
                            if let Some(point) = self.json_object_to_point(item, i)? {
                                data_points.push(point);
                            }
                        }
                        break; // Use first array found
                    }
                }
            }
            _ => return Err(anyhow::anyhow!("Invalid JSON structure for dataset")),
        }
        
        Ok(Dataset {
            id: uuid::Uuid::new_v4().to_string(),
            name: Path::new(file_path)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            description: Some("Loaded from JSON file".to_string()),
            data: data_points,
            size: data_points.len(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }
    
    fn json_object_to_point(&self, item: &serde_json::Value, index: usize) -> Result<Option<DataPoint>> {
        if let serde_json::Value::Object(obj) = item {
            let x = self.extract_number(obj, &["x", "X", "longitude", "lon"])
                .ok_or_else(|| anyhow::anyhow!("Missing x coordinate"))?;
            let y = self.extract_number(obj, &["y", "Y", "latitude", "lat"])
                .ok_or_else(|| anyhow::anyhow!("Missing y coordinate"))?;
            
            Ok(Some(DataPoint {
                x,
                y,
                z: self.extract_number(obj, &["z", "Z", "altitude"]),
                value: self.extract_number(obj, &["value", "val", "amount"]),
                category: self.extract_string(obj, &["category", "type", "class"]),
                timestamp: self.extract_number(obj, &["timestamp", "time"])
                    .map(|n| n as i64),
                label: self.extract_string(obj, &["label", "name", "id"])
                    .or_else(|| Some(format!("Point {}", index))),
                metadata: Some(serde_json::Value::Object(obj.clone())),
            }))
        } else {
            Ok(None)
        }
    }
    
    fn extract_number(&self, obj: &serde_json::Map<String, serde_json::Value>, keys: &[&str]) -> Option<f64> {
        for key in keys {
            if let Some(value) = obj.get(*key) {
                match value {
                    serde_json::Value::Number(n) => return n.as_f64(),
                    serde_json::Value::String(s) => {
                        if let Ok(n) = s.parse::<f64>() {
                            return Some(n);
                        }
                    }
                    _ => continue,
                }
            }
        }
        None
    }
    
    fn extract_string(&self, obj: &serde_json::Map<String, serde_json::Value>, keys: &[&str]) -> Option<String> {
        for key in keys {
            if let Some(value) = obj.get(*key) {
                match value {
                    serde_json::Value::String(s) => return Some(s.clone()),
                    serde_json::Value::Number(n) => return Some(n.to_string()),
                    _ => continue,
                }
            }
        }
        None
    }
    
    /// Save dataset to file
    pub async fn save_dataset(&self, dataset: &Dataset, file_path: &str) -> Result<()> {
        let path = Path::new(file_path);
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("json")
            .to_lowercase();
        
        log::info!("Saving dataset to: {}", file_path);
        
        match extension.as_str() {
            "csv" => self.save_csv(dataset, file_path).await,
            "json" => self.save_json(dataset, file_path).await,
            "parquet" => self.save_parquet(dataset, file_path).await,
            _ => self.save_json(dataset, file_path).await, // Default to JSON
        }
    }
    
    async fn save_csv(&self, dataset: &Dataset, file_path: &str) -> Result<()> {
        let df = self.dataset_to_dataframe(dataset)?;
        
        let mut file = std::fs::File::create(file_path)?;
        CsvWriter::new(&mut file)
            .has_header(true)
            .finish(&mut df.clone())?;
        
        Ok(())
    }
    
    async fn save_json(&self, dataset: &Dataset, file_path: &str) -> Result<()> {
        let json = serde_json::to_string_pretty(dataset)?;
        fs::write(file_path, json).await?;
        Ok(())
    }
    
    async fn save_parquet(&self, dataset: &Dataset, file_path: &str) -> Result<()> {
        let df = self.dataset_to_dataframe(dataset)?;
        
        let mut file = std::fs::File::create(file_path)?;
        ParquetWriter::new(&mut file)
            .finish(&mut df.clone())?;
        
        Ok(())
    }
    
    /// Export dataset in various formats
    pub async fn export_dataset(&self, dataset: &Dataset, export_path: &str, format: &str) -> Result<()> {
        match format.to_lowercase().as_str() {
            "csv" => self.save_csv(dataset, export_path).await,
            "json" => self.save_json(dataset, export_path).await,
            "parquet" => self.save_parquet(dataset, export_path).await,
            "excel" => self.export_excel(dataset, export_path).await,
            _ => Err(anyhow::anyhow!("Unsupported export format: {}", format)),
        }
    }
    
    async fn export_excel(&self, dataset: &Dataset, export_path: &str) -> Result<()> {
        // For now, export as CSV (Excel compatibility)
        // TODO: Add proper Excel export with xlsx crate
        self.save_csv(dataset, &export_path.replace(".xlsx", ".csv")).await
    }
    
    // Helper methods
    fn find_column(&self, df: &DataFrame, candidates: &[&str]) -> Result<String> {
        let columns = df.get_column_names();
        
        for candidate in candidates {
            if columns.contains(candidate) {
                return Ok(candidate.to_string());
            }
        }
        
        // Case-insensitive search
        for candidate in candidates {
            for column in &columns {
                if column.to_lowercase() == candidate.to_lowercase() {
                    return Ok(column.to_string());
                }
            }
        }
        
        Err(anyhow::anyhow!("Required column not found. Available: {:?}", columns))
    }
    
    fn get_float_value(&self, df: &DataFrame, column: &str, row: usize) -> Result<f64> {
        let value = df.column(column)?.get(row)?;
        
        match value {
            AnyValue::Float64(f) => Ok(f),
            AnyValue::Float32(f) => Ok(f as f64),
            AnyValue::Int64(i) => Ok(i as f64),
            AnyValue::Int32(i) => Ok(i as f64),
            AnyValue::UInt64(i) => Ok(i as f64),
            AnyValue::UInt32(i) => Ok(i as f64),
            AnyValue::Utf8(s) => s.parse::<f64>()
                .map_err(|_| anyhow::anyhow!("Cannot convert '{}' to float", s)),
            _ => Err(anyhow::anyhow!("Unsupported value type for float conversion")),
        }
    }
    
    fn get_string_value(&self, df: &DataFrame, column: &str, row: usize) -> Result<String> {
        let value = df.column(column)?.get(row)?;
        
        match value {
            AnyValue::Utf8(s) => Ok(s.to_string()),
            AnyValue::Int64(i) => Ok(i.to_string()),
            AnyValue::Float64(f) => Ok(f.to_string()),
            _ => Ok(format!("{:?}", value)),
        }
    }
    
    fn get_timestamp_value(&self, df: &DataFrame, column: &str, row: usize) -> Result<i64> {
        let value = df.column(column)?.get(row)?;
        
        match value {
            AnyValue::Int64(i) => Ok(i),
            AnyValue::UInt64(i) => Ok(i as i64),
            AnyValue::Utf8(s) => {
                // Try to parse ISO date string
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
                    Ok(dt.timestamp_millis())
                } else {
                    s.parse::<i64>()
                        .map_err(|_| anyhow::anyhow!("Cannot convert '{}' to timestamp", s))
                }
            }
            _ => Err(anyhow::anyhow!("Unsupported value type for timestamp conversion")),
        }
    }
    
    fn dataset_to_dataframe(&self, dataset: &Dataset) -> Result<DataFrame> {
        let mut x_values = Vec::new();
        let mut y_values = Vec::new();
        let mut z_values = Vec::new();
        let mut value_values = Vec::new();
        let mut categories = Vec::new();
        let mut timestamps = Vec::new();
        let mut labels = Vec::new();
        
        for point in &dataset.data {
            x_values.push(point.x);
            y_values.push(point.y);
            z_values.push(point.z);
            value_values.push(point.value);
            categories.push(point.category.clone());
            timestamps.push(point.timestamp);
            labels.push(point.label.clone());
        }
        
        let df = df! [
            "x" => x_values,
            "y" => y_values,
            "z" => z_values,
            "value" => value_values,
            "category" => categories,
            "timestamp" => timestamps,
            "label" => labels,
        ]?;
        
        Ok(df)
    }
}