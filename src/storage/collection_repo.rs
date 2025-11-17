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
}

