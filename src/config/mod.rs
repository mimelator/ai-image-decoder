use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub storage: StorageConfig,
    pub thumbnail: ThumbnailConfig,
    pub scanning: ScanningConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub database_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub thumbnail_path: String,
    pub max_thumbnail_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailConfig {
    pub enabled: bool,
    pub size: u32,
    pub quality: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanningConfig {
    pub recursive: bool,
    pub scan_interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        // Load .env file if it exists
        dotenv::dotenv().ok();

        Ok(Config {
            server: ServerConfig {
                host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: env::var("PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()
                    .unwrap_or(8080),
            },
            database: DatabaseConfig {
                database_path: env::var("DATABASE_PATH")
                    .unwrap_or_else(|_| "./data/images.db".to_string()),
            },
            storage: StorageConfig {
                thumbnail_path: env::var("THUMBNAIL_PATH")
                    .unwrap_or_else(|_| "./data/thumbnails".to_string()),
                max_thumbnail_size: env::var("MAX_THUMBNAIL_SIZE")
                    .unwrap_or_else(|_| "512".to_string())
                    .parse()
                    .unwrap_or(512),
            },
            thumbnail: ThumbnailConfig {
                enabled: env::var("THUMBNAIL_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .unwrap_or(true),
                size: env::var("THUMBNAIL_SIZE")
                    .unwrap_or_else(|_| "256".to_string())
                    .parse()
                    .unwrap_or(256),
                quality: env::var("THUMBNAIL_QUALITY")
                    .unwrap_or_else(|_| "85".to_string())
                    .parse()
                    .unwrap_or(85),
            },
            scanning: ScanningConfig {
                recursive: env::var("SCAN_RECURSIVE")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .unwrap_or(true),
                scan_interval: env::var("SCAN_INTERVAL")
                    .unwrap_or_else(|_| "3600".to_string())
                    .parse()
                    .unwrap_or(3600),
            },
            logging: LoggingConfig {
                level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
            },
        })
    }
}

