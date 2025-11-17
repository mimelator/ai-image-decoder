use crate::storage::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub tag_type: String, // "style", "subject", "technique", "quality", "model", "negative"
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageTag {
    pub image_id: String,
    pub tag_id: String,
    pub confidence: f64,
    pub source: String, // "prompt", "metadata", "manual"
    pub created_at: String,
}

#[derive(Clone)]
pub struct TagRepository {
    db: Database,
}

impl TagRepository {
    pub fn new(db: Database) -> Self {
        TagRepository { db }
    }

    pub fn find_or_create(&self, name: &str, tag_type: &str) -> anyhow::Result<Tag> {
        // Normalize tag name (lowercase)
        let normalized_name = name.to_lowercase();

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Try to find existing tag
        let mut stmt = conn.prepare(
            "SELECT id, name, tag_type, created_at FROM tags WHERE name = ?1",
        )?;

        let existing = stmt.query_row(params![normalized_name], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                tag_type: row.get(2)?,
                created_at: row.get(3)?,
            })
        });

        match existing {
            Ok(tag) => Ok(tag),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Create new tag
                let id = Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();

                conn.execute(
                    "INSERT INTO tags (id, name, tag_type, created_at)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![id, normalized_name, tag_type, now],
                )?;

                Ok(Tag {
                    id,
                    name: normalized_name,
                    tag_type: tag_type.to_string(),
                    created_at: now,
                })
            }
            Err(e) => Err(e.into()),
        }
    }

    pub fn add_to_image(&self, image_tag: &ImageTag) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO image_tags (image_id, tag_id, confidence, source, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                image_tag.image_id,
                image_tag.tag_id,
                image_tag.confidence,
                image_tag.source,
                image_tag.created_at,
            ],
        )?;

        Ok(())
    }

    pub fn find_by_image_id(&self, image_id: &str) -> anyhow::Result<Vec<(Tag, ImageTag)>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT t.id, t.name, t.tag_type, t.created_at, it.confidence, it.source, it.created_at
             FROM tags t
             JOIN image_tags it ON t.id = it.tag_id
             WHERE it.image_id = ?1
             ORDER BY it.confidence DESC, t.name",
        )?;

        let tags = stmt.query_map(params![image_id], |row| {
            Ok((
                Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    tag_type: row.get(2)?,
                    created_at: row.get(3)?,
                },
                ImageTag {
                    image_id: image_id.to_string(),
                    tag_id: row.get(0)?,
                    confidence: row.get(4)?,
                    source: row.get(5)?,
                    created_at: row.get(6)?,
                },
            ))
        })?;

        let mut result = Vec::new();
        for tag in tags {
            result.push(tag?);
        }

        Ok(result)
    }

    pub fn suggest_tags(&self, query: &str, limit: usize) -> anyhow::Result<Vec<Tag>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, name, tag_type, created_at
             FROM tags
             WHERE name LIKE ?1
             ORDER BY name
             LIMIT ?2",
        )?;

        let search_pattern = format!("{}%", query.to_lowercase());
        let tags = stmt.query_map(params![search_pattern, limit as i32], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                tag_type: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?;

        let mut result = Vec::new();
        for tag in tags {
            result.push(tag?);
        }

        Ok(result)
    }
}

