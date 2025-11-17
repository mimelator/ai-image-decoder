use anyhow::Result;
use rusqlite::Connection;
use std::path::Path;
use std::sync::{Arc, Mutex};
use crate::config::DatabaseConfig;

pub mod image_repo;
pub mod prompt_repo;
pub mod metadata_repo;
pub mod collection_repo;
pub mod tag_repo;

pub use image_repo::ImageRepository;
pub use prompt_repo::PromptRepository;
pub use metadata_repo::MetadataRepository;
pub use collection_repo::CollectionRepository;
pub use tag_repo::TagRepository;

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(config: &DatabaseConfig) -> Result<Self> {
        // Ensure data directory exists
        if let Some(parent) = Path::new(&config.database_path).parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&config.database_path)?;
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        // Images table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                format TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                hash TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_scanned_at TEXT NOT NULL
            )",
            [],
        )?;

        // Prompts table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                image_id TEXT NOT NULL,
                prompt_text TEXT NOT NULL,
                negative_prompt TEXT,
                prompt_type TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Metadata table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS metadata (
                id TEXT PRIMARY KEY,
                image_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                metadata_type TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
                UNIQUE(image_id, key, metadata_type)
            )",
            [],
        )?;

        // Collections table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                folder_path TEXT,
                is_folder_based INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Collection images table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collection_images (
                collection_id TEXT NOT NULL,
                image_id TEXT NOT NULL,
                added_at TEXT NOT NULL,
                PRIMARY KEY (collection_id, image_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Tags table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                tag_type TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Image tags table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS image_tags (
                image_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                confidence REAL NOT NULL DEFAULT 1.0,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (image_id, tag_id),
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Scan directories table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS scan_directories (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                recursive INTEGER NOT NULL DEFAULT 1,
                last_scanned_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_images_path ON images(file_path)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_images_format ON images(format)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_prompts_image ON prompts(image_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_prompts_text ON prompts(prompt_text)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_metadata_image ON metadata(image_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_metadata_key ON metadata(key)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collection_images_collection ON collection_images(collection_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collection_images_image ON collection_images(image_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collections_folder_path ON collections(folder_path)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(tag_type)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_image_tags_image ON image_tags(image_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_image_tags_tag ON image_tags(tag_id)",
            [],
        )?;

        // Create FTS5 virtual table for full-text search
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
                prompt_text,
                negative_prompt,
                content='prompts',
                content_rowid='rowid'
            )",
            [],
        )?;

        Ok(())
    }

    pub fn get_connection(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_database_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let config = DatabaseConfig {
            database_path: db_path.to_str().unwrap().to_string(),
        };
        
        let db = Database::new(&config).unwrap();
        assert!(db_path.exists());
    }
}

