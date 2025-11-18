use crate::storage::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub folder_path: Option<String>,
    pub is_folder_based: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone)]
pub struct CollectionRepository {
    db: Database,
}

impl CollectionRepository {
    pub fn new(db: Database) -> Self {
        CollectionRepository { db }
    }

    pub fn create(&self, collection: &Collection) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute(
            "INSERT INTO collections (id, name, description, folder_path, is_folder_based, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                collection.id,
                collection.name,
                collection.description,
                collection.folder_path,
                if collection.is_folder_based { 1 } else { 0 },
                collection.created_at,
                collection.updated_at,
            ],
        )?;

        Ok(())
    }

    pub fn find_by_folder_path(&self, folder_path: &str) -> anyhow::Result<Option<Collection>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, name, description, folder_path, is_folder_based, created_at, updated_at
             FROM collections WHERE folder_path = ?1",
        )?;

        let collection = stmt.query_row(params![folder_path], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                folder_path: row.get(3)?,
                is_folder_based: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        });

        match collection {
            Ok(col) => Ok(Some(col)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn add_image(&self, collection_id: &str, image_id: &str) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR IGNORE INTO collection_images (collection_id, image_id, added_at)
             VALUES (?1, ?2, ?3)",
            params![collection_id, image_id, now],
        )?;

        Ok(())
    }

    pub fn list_all(&self) -> anyhow::Result<Vec<Collection>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, name, description, folder_path, is_folder_based, created_at, updated_at
             FROM collections ORDER BY name",
        )?;

        let collections = stmt.query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                folder_path: row.get(3)?,
                is_folder_based: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;

        let mut result = Vec::new();
        for collection in collections {
            result.push(collection?);
        }

        Ok(result)
    }

    pub fn find_by_id(&self, id: &str) -> anyhow::Result<Option<Collection>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, name, description, folder_path, is_folder_based, created_at, updated_at
             FROM collections WHERE id = ?1",
        )?;

        let collection = stmt.query_row(params![id], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                folder_path: row.get(3)?,
                is_folder_based: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        });

        match collection {
            Ok(col) => Ok(Some(col)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn update(&self, collection: &Collection) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE collections SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![collection.name, collection.description, now, collection.id],
        )?;

        Ok(())
    }

    pub fn delete(&self, id: &str) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute("DELETE FROM collections WHERE id = ?1", params![id])?;

        Ok(())
    }

    pub fn remove_image(&self, collection_id: &str, image_id: &str) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute(
            "DELETE FROM collection_images WHERE collection_id = ?1 AND image_id = ?2",
            params![collection_id, image_id],
        )?;

        Ok(())
    }

    pub fn get_image_ids(&self, collection_id: &str) -> anyhow::Result<Vec<String>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT image_id FROM collection_images WHERE collection_id = ?1 ORDER BY added_at DESC",
        )?;

        let image_ids = stmt.query_map(params![collection_id], |row| {
            Ok(row.get::<_, String>(0)?)
        })?;

        let mut result = Vec::new();
        for image_id in image_ids {
            result.push(image_id?);
        }

        Ok(result)
    }

    /// Get collections that need CLIP interrogation
    /// Returns collections that have images without clip_generated prompts
    pub fn get_collections_needing_clip(&self) -> anyhow::Result<Vec<String>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Find collections that have images without clip_generated prompts
        let mut stmt = conn.prepare(
            "SELECT DISTINCT ci.collection_id
             FROM collection_images ci
             WHERE NOT EXISTS (
                 SELECT 1 FROM prompts p
                 WHERE p.image_id = ci.image_id
                 AND p.prompt_type = 'clip_generated'
             )
             ORDER BY ci.collection_id",
        )?;

        let collection_ids = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        })?;

        let mut result = Vec::new();
        for collection_id in collection_ids {
            result.push(collection_id?);
        }

        Ok(result)
    }
}

