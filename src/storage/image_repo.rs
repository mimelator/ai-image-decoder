use crate::storage::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub format: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub hash: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_scanned_at: String,
}

#[derive(Clone)]
pub struct ImageRepository {
    db: Database,
}

impl ImageRepository {
    pub fn new(db: Database) -> Self {
        ImageRepository { db }
    }

    pub fn create(&self, image: &Image) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute(
            "INSERT INTO images (id, file_path, file_name, file_size, format, width, height, hash, created_at, updated_at, last_scanned_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                image.id,
                image.file_path,
                image.file_name,
                image.file_size as i64,
                image.format,
                image.width.map(|w| w as i32),
                image.height.map(|h| h as i32),
                image.hash,
                image.created_at,
                image.updated_at,
                image.last_scanned_at,
            ],
        )?;

        Ok(())
    }

    pub fn find_by_path(&self, file_path: &str) -> anyhow::Result<Option<Image>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, file_path, file_name, file_size, format, width, height, hash, created_at, updated_at, last_scanned_at
             FROM images WHERE file_path = ?1",
        )?;

        let image = stmt.query_row(params![file_path], |row| {
            Ok(Image {
                id: row.get(0)?,
                file_path: row.get(1)?,
                file_name: row.get(2)?,
                file_size: row.get::<_, i64>(3)? as u64,
                format: row.get(4)?,
                width: row.get::<_, Option<i32>>(5)?.map(|w| w as u32),
                height: row.get::<_, Option<i32>>(6)?.map(|h| h as u32),
                hash: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                last_scanned_at: row.get(10)?,
            })
        });

        match image {
            Ok(img) => Ok(Some(img)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn find_by_id(&self, id: &str) -> anyhow::Result<Option<Image>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, file_path, file_name, file_size, format, width, height, hash, created_at, updated_at, last_scanned_at
             FROM images WHERE id = ?1",
        )?;

        let image = stmt.query_row(params![id], |row| {
            Ok(Image {
                id: row.get(0)?,
                file_path: row.get(1)?,
                file_name: row.get(2)?,
                file_size: row.get::<_, i64>(3)? as u64,
                format: row.get(4)?,
                width: row.get::<_, Option<i32>>(5)?.map(|w| w as u32),
                height: row.get::<_, Option<i32>>(6)?.map(|h| h as u32),
                hash: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                last_scanned_at: row.get(10)?,
            })
        });

        match image {
            Ok(img) => Ok(Some(img)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn update_last_scanned(&self, id: &str) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE images SET last_scanned_at = ?1, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    pub fn list_all(&self) -> anyhow::Result<Vec<Image>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, file_path, file_name, file_size, format, width, height, hash, created_at, updated_at, last_scanned_at
             FROM images ORDER BY created_at DESC",
        )?;

        let images = stmt.query_map([], |row| {
            Ok(Image {
                id: row.get(0)?,
                file_path: row.get(1)?,
                file_name: row.get(2)?,
                file_size: row.get::<_, i64>(3)? as u64,
                format: row.get(4)?,
                width: row.get::<_, Option<i32>>(5)?.map(|w| w as u32),
                height: row.get::<_, Option<i32>>(6)?.map(|h| h as u32),
                hash: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                last_scanned_at: row.get(10)?,
            })
        })?;

        let mut result = Vec::new();
        for image in images {
            result.push(image?);
        }

        Ok(result)
    }
}

