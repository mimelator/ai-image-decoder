pub mod config;
pub mod storage;
pub mod ingestion;
pub mod extraction;
pub mod api;
pub mod utils;

// Re-export commonly used types
pub use storage::{Database, ImageRepository, PromptRepository, MetadataRepository, CollectionRepository, TagRepository};
pub use ingestion::{IngestionService, ScanProgress};

