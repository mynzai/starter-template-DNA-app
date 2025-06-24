use log::{error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sysinfo::{System, SystemExt, ProcessExt, DiskExt, NetworkExt, CpuExt};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub hostname: String,
    pub cpu_info: CpuInfo,
    pub memory_info: MemoryInfo,
    pub disk_info: HashMap<String, u64>,
    pub network_info: HashMap<String, NetworkInterface>,
    pub process_count: usize,
    pub boot_time: u64,
    pub uptime: u64,
    pub cpu_usage: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuInfo {
    pub name: String,
    pub brand: String,
    pub cores: usize,
    pub frequency: u64,
    pub usage_per_core: Vec<f32>,
    pub global_usage: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub free: u64,
    pub swap_total: u64,
    pub swap_used: u64,
    pub swap_free: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkInterface {
    pub name: String,
    pub received: u64,
    pub transmitted: u64,
    pub packets_received: u64,
    pub packets_transmitted: u64,
    pub errors_received: u64,
    pub errors_transmitted: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub disk_usage: u64,
    pub start_time: u64,
    pub status: String,
    pub parent_pid: Option<u32>,
}

impl SystemInfo {
    pub async fn new() -> Result<Self> {
        info!("Collecting system information...");
        
        let mut sys = System::new_all();
        sys.refresh_all();
        
        // Wait a moment for accurate CPU usage calculation
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        sys.refresh_cpu();
        
        let os_name = sys.name().unwrap_or_else(|| "Unknown".to_string());
        let os_version = sys.os_version().unwrap_or_else(|| "Unknown".to_string());
        let kernel_version = sys.kernel_version().unwrap_or_else(|| "Unknown".to_string());
        let hostname = sys.host_name().unwrap_or_else(|| "Unknown".to_string());
        
        // CPU information
        let cpus = sys.cpus();
        let cpu_info = if let Some(first_cpu) = cpus.first() {
            CpuInfo {
                name: first_cpu.name().to_string(),
                brand: first_cpu.brand().to_string(),
                cores: cpus.len(),
                frequency: first_cpu.frequency(),
                usage_per_core: cpus.iter().map(|cpu| cpu.cpu_usage()).collect(),
                global_usage: sys.global_cpu_info().cpu_usage(),
            }
        } else {
            CpuInfo {
                name: "Unknown".to_string(),
                brand: "Unknown".to_string(),
                cores: 0,
                frequency: 0,
                usage_per_core: Vec::new(),
                global_usage: 0.0,
            }
        };
        
        // Memory information
        let memory_info = MemoryInfo {
            total: sys.total_memory(),
            used: sys.used_memory(),
            available: sys.available_memory(),
            free: sys.free_memory(),
            swap_total: sys.total_swap(),
            swap_used: sys.used_swap(),
            swap_free: sys.free_swap(),
        };
        
        // Disk information
        let mut disk_info = HashMap::new();
        for disk in sys.disks() {
            let mount_point = disk.mount_point().to_string_lossy().to_string();
            let used_space = disk.total_space() - disk.available_space();
            disk_info.insert(mount_point, used_space);
        }
        
        // Network information
        let mut network_info = HashMap::new();
        for (interface_name, data) in sys.networks() {
            let interface = NetworkInterface {
                name: interface_name.clone(),
                received: data.received(),
                transmitted: data.transmitted(),
                packets_received: data.packets_received(),
                packets_transmitted: data.packets_transmitted(),
                errors_received: data.errors_on_received(),
                errors_transmitted: data.errors_on_transmitted(),
            };
            network_info.insert(interface_name.clone(), interface);
        }
        
        let process_count = sys.processes().len();
        let boot_time = sys.boot_time();
        let uptime = sys.uptime();
        let cpu_usage = sys.global_cpu_info().cpu_usage();
        
        let system_info = SystemInfo {
            os_name,
            os_version,
            kernel_version,
            hostname,
            cpu_info,
            memory_info,
            disk_info,
            network_info,
            process_count,
            boot_time,
            uptime,
            cpu_usage,
        };
        
        info!("System information collected successfully");
        Ok(system_info)
    }
    
    pub async fn get_processes(&self) -> Result<Vec<ProcessInfo>> {
        info!("Getting process information...");
        
        let mut sys = System::new_all();
        sys.refresh_all();
        
        let mut processes = Vec::new();
        
        for (pid, process) in sys.processes() {
            let process_info = ProcessInfo {
                pid: pid.as_u32(),
                name: process.name().to_string(),
                cpu_usage: process.cpu_usage(),
                memory_usage: process.memory(),
                disk_usage: process.disk_usage().total_read_bytes + process.disk_usage().total_written_bytes,
                start_time: process.start_time(),
                status: format!("{:?}", process.status()),
                parent_pid: process.parent().map(|p| p.as_u32()),
            };
            processes.push(process_info);
        }
        
        // Sort by CPU usage (descending)
        processes.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
        
        info!("Retrieved {} processes", processes.len());
        Ok(processes)
    }
    
    pub async fn get_system_performance(&self) -> Result<SystemPerformance> {
        info!("Getting system performance metrics...");
        
        let mut sys = System::new_all();
        sys.refresh_all();
        
        // Wait for accurate CPU readings
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        sys.refresh_cpu();
        
        let cpu_usage = sys.global_cpu_info().cpu_usage();
        let memory_usage_percent = (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0;
        
        let mut disk_usage_percent = HashMap::new();
        for disk in sys.disks() {
            let mount_point = disk.mount_point().to_string_lossy().to_string();
            let usage_percent = if disk.total_space() > 0 {
                ((disk.total_space() - disk.available_space()) as f32 / disk.total_space() as f32) * 100.0
            } else {
                0.0
            };
            disk_usage_percent.insert(mount_point, usage_percent);
        }
        
        let performance = SystemPerformance {
            cpu_usage,
            memory_usage_percent,
            disk_usage_percent,
            network_throughput: self.calculate_network_throughput().await?,
            load_average: self.get_load_average(),
            temperature: self.get_system_temperature().await?,
        };
        
        info!("System performance metrics collected");
        Ok(performance)
    }
    
    async fn calculate_network_throughput(&self) -> Result<HashMap<String, f64>> {
        let mut throughput = HashMap::new();
        
        // This is a simplified calculation - in a real implementation,
        // you'd want to calculate throughput over time
        for (interface_name, interface) in &self.network_info {
            let total_bytes = interface.received + interface.transmitted;
            let throughput_mbps = total_bytes as f64 / (1024.0 * 1024.0); // Convert to MB
            throughput.insert(interface_name.clone(), throughput_mbps);
        }
        
        Ok(throughput)
    }
    
    fn get_load_average(&self) -> Vec<f64> {
        // This is a placeholder - actual implementation would depend on the OS
        vec![0.0, 0.0, 0.0] // 1min, 5min, 15min load averages
    }
    
    async fn get_system_temperature(&self) -> Result<Option<f32>> {
        // This is a placeholder - actual implementation would use platform-specific APIs
        // to get temperature readings from sensors
        Ok(None)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemPerformance {
    pub cpu_usage: f32,
    pub memory_usage_percent: f32,
    pub disk_usage_percent: HashMap<String, f32>,
    pub network_throughput: HashMap<String, f64>,
    pub load_average: Vec<f64>,
    pub temperature: Option<f32>,
}

// Hardware monitoring functions
pub struct HardwareMonitor;

impl HardwareMonitor {
    pub async fn get_cpu_temperatures() -> Result<Vec<f32>> {
        // Platform-specific temperature monitoring
        #[cfg(target_os = "linux")]
        {
            Self::get_linux_cpu_temperatures().await
        }
        
        #[cfg(target_os = "windows")]
        {
            Self::get_windows_cpu_temperatures().await
        }
        
        #[cfg(target_os = "macos")]
        {
            Self::get_macos_cpu_temperatures().await
        }
        
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            Ok(Vec::new())
        }
    }
    
    #[cfg(target_os = "linux")]
    async fn get_linux_cpu_temperatures() -> Result<Vec<f32>> {
        use std::path::Path;
        
        let mut temperatures = Vec::new();
        let thermal_path = Path::new("/sys/class/thermal");
        
        if thermal_path.exists() {
            let mut entries = tokio::fs::read_dir(thermal_path).await?;
            
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                if path.is_dir() && path.file_name().unwrap().to_str().unwrap().starts_with("thermal_zone") {
                    let temp_file = path.join("temp");
                    if temp_file.exists() {
                        if let Ok(temp_str) = tokio::fs::read_to_string(temp_file).await {
                            if let Ok(temp_millidegrees) = temp_str.trim().parse::<i32>() {
                                let temp_celsius = temp_millidegrees as f32 / 1000.0;
                                temperatures.push(temp_celsius);
                            }
                        }
                    }
                }
            }
        }
        
        Ok(temperatures)
    }
    
    #[cfg(target_os = "windows")]
    async fn get_windows_cpu_temperatures() -> Result<Vec<f32>> {
        // Windows temperature monitoring would require WMI or other APIs
        // This is a placeholder implementation
        Ok(Vec::new())
    }
    
    #[cfg(target_os = "macos")]
    async fn get_macos_cpu_temperatures() -> Result<Vec<f32>> {
        // macOS temperature monitoring would require IOKit or other APIs
        // This is a placeholder implementation
        Ok(Vec::new())
    }
    
    pub async fn get_fan_speeds() -> Result<Vec<u32>> {
        // Platform-specific fan speed monitoring
        // This is a placeholder implementation
        Ok(Vec::new())
    }
    
    pub async fn get_power_consumption() -> Result<Option<f32>> {
        // Platform-specific power consumption monitoring
        // This is a placeholder implementation
        Ok(None)
    }
}

// System health monitoring
pub struct SystemHealthMonitor;

impl SystemHealthMonitor {
    pub async fn check_system_health() -> Result<SystemHealth> {
        info!("Checking system health...");
        
        let mut health = SystemHealth {
            overall_status: HealthStatus::Good,
            cpu_health: HealthStatus::Good,
            memory_health: HealthStatus::Good,
            disk_health: HealthStatus::Good,
            network_health: HealthStatus::Good,
            issues: Vec::new(),
            recommendations: Vec::new(),
        };
        
        let sys_info = SystemInfo::new().await?;
        
        // Check CPU health
        if sys_info.cpu_usage > 90.0 {
            health.cpu_health = HealthStatus::Warning;
            health.issues.push("High CPU usage detected".to_string());
            health.recommendations.push("Consider closing unnecessary applications".to_string());
        }
        
        // Check memory health
        let memory_usage_percent = (sys_info.memory_info.used as f32 / sys_info.memory_info.total as f32) * 100.0;
        if memory_usage_percent > 90.0 {
            health.memory_health = HealthStatus::Critical;
            health.issues.push("Critical memory usage detected".to_string());
            health.recommendations.push("Free up memory by closing applications".to_string());
        } else if memory_usage_percent > 80.0 {
            health.memory_health = HealthStatus::Warning;
            health.issues.push("High memory usage detected".to_string());
        }
        
        // Check disk health
        for (mount_point, _used_space) in &sys_info.disk_info {
            // This would need actual disk usage percentage calculation
            // Placeholder for now
            if mount_point == "/" || mount_point.contains("C:") {
                // Check if system disk is getting full
                // Implementation would go here
            }
        }
        
        // Determine overall health
        if health.cpu_health == HealthStatus::Critical || health.memory_health == HealthStatus::Critical {
            health.overall_status = HealthStatus::Critical;
        } else if health.cpu_health == HealthStatus::Warning || health.memory_health == HealthStatus::Warning {
            health.overall_status = HealthStatus::Warning;
        }
        
        info!("System health check completed: {:?}", health.overall_status);
        Ok(health)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemHealth {
    pub overall_status: HealthStatus,
    pub cpu_health: HealthStatus,
    pub memory_health: HealthStatus,
    pub disk_health: HealthStatus,
    pub network_health: HealthStatus,
    pub issues: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum HealthStatus {
    Good,
    Warning,
    Critical,
}