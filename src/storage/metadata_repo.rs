use crate::storage::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub id: String,
    pub image_id: String,
    pub key: String,
    pub value: String,
    pub metadata_type: String, // "generation", "exif", "xmp", "custom"
    pub created_at: String,
}

#[derive(Clone)]
pub struct MetadataRepository {
    db: Database,
}

impl MetadataRepository {
    pub fn new(db: Database) -> Self {
        MetadataRepository { db }
    }

    pub fn create(&self, metadata: &Metadata) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO metadata (id, image_id, key, value, metadata_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                metadata.id,
                metadata.image_id,
                metadata.key,
                metadata.value,
                metadata.metadata_type,
                metadata.created_at,
            ],
        )?;

        Ok(())
    }

    pub fn find_by_image_id(&self, image_id: &str) -> anyhow::Result<Vec<Metadata>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, image_id, key, value, metadata_type, created_at
             FROM metadata WHERE image_id = ?1 ORDER BY key",
        )?;

        let metadata = stmt.query_map(params![image_id], |row| {
            Ok(Metadata {
                id: row.get(0)?,
                image_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                metadata_type: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut result = Vec::new();
        for meta in metadata {
            result.push(meta?);
        }

        Ok(result)
    }

    pub fn find_by_key(&self, image_id: &str, key: &str, metadata_type: &str) -> anyhow::Result<Option<Metadata>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, image_id, key, value, metadata_type, created_at
             FROM metadata WHERE image_id = ?1 AND key = ?2 AND metadata_type = ?3",
        )?;

        let metadata = stmt.query_row(params![image_id, key, metadata_type], |row| {
            Ok(Metadata {
                id: row.get(0)?,
                image_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                metadata_type: row.get(4)?,
                created_at: row.get(5)?,
            })
        });

        match metadata {
            Ok(meta) => Ok(Some(meta)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

