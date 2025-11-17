use crate::storage::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub id: String,
    pub image_id: String,
    pub prompt_text: String,
    pub negative_prompt: Option<String>,
    pub prompt_type: String, // "positive", "negative", "full"
    pub created_at: String,
}

#[derive(Clone)]
pub struct PromptRepository {
    db: Database,
}

impl PromptRepository {
    pub fn new(db: Database) -> Self {
        PromptRepository { db }
    }

    pub fn create(&self, prompt: &Prompt) -> anyhow::Result<()> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        conn.execute(
            "INSERT INTO prompts (id, image_id, prompt_text, negative_prompt, prompt_type, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                prompt.id,
                prompt.image_id,
                prompt.prompt_text,
                prompt.negative_prompt,
                prompt.prompt_type,
                prompt.created_at,
            ],
        )?;

        // Update FTS5 index
        conn.execute(
            "INSERT INTO prompts_fts (rowid, prompt_text, negative_prompt)
             VALUES ((SELECT rowid FROM prompts WHERE id = ?1), ?2, ?3)",
            params![prompt.id, prompt.prompt_text, prompt.negative_prompt],
        )?;

        Ok(())
    }

    pub fn list_all(&self, order_by: Option<&str>) -> anyhow::Result<Vec<Prompt>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let order_clause = order_by.unwrap_or("created_at DESC");
        let query = format!(
            "SELECT id, image_id, prompt_text, negative_prompt, prompt_type, created_at
             FROM prompts ORDER BY {}",
            order_clause
        );

        let mut stmt = conn.prepare(&query)?;

        let prompts = stmt.query_map([], |row| {
            Ok(Prompt {
                id: row.get(0)?,
                image_id: row.get(1)?,
                prompt_text: row.get(2)?,
                negative_prompt: row.get(3)?,
                prompt_type: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut result = Vec::new();
        for prompt in prompts {
            result.push(prompt?);
        }

        Ok(result)
    }

    pub fn find_by_image_id(&self, image_id: &str) -> anyhow::Result<Vec<Prompt>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, image_id, prompt_text, negative_prompt, prompt_type, created_at
             FROM prompts WHERE image_id = ?1 ORDER BY created_at DESC",
        )?;

        let prompts = stmt.query_map(params![image_id], |row| {
            Ok(Prompt {
                id: row.get(0)?,
                image_id: row.get(1)?,
                prompt_text: row.get(2)?,
                negative_prompt: row.get(3)?,
                prompt_type: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut result = Vec::new();
        for prompt in prompts {
            result.push(prompt?);
        }

        Ok(result)
    }

    pub fn search(&self, query: &str) -> anyhow::Result<Vec<Prompt>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT p.id, p.image_id, p.prompt_text, p.negative_prompt, p.prompt_type, p.created_at
             FROM prompts p
             JOIN prompts_fts fts ON p.rowid = fts.rowid
             WHERE prompts_fts MATCH ?1
             ORDER BY rank",
        )?;

        let prompts = stmt.query_map(params![query], |row| {
            Ok(Prompt {
                id: row.get(0)?,
                image_id: row.get(1)?,
                prompt_text: row.get(2)?,
                negative_prompt: row.get(3)?,
                prompt_type: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut result = Vec::new();
        for prompt in prompts {
            result.push(prompt?);
        }

        Ok(result)
    }

    pub fn find_by_id(&self, id: &str) -> anyhow::Result<Option<Prompt>> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, image_id, prompt_text, negative_prompt, prompt_type, created_at
             FROM prompts WHERE id = ?1",
        )?;

        let prompt = stmt.query_row(params![id], |row| {
            Ok(Prompt {
                id: row.get(0)?,
                image_id: row.get(1)?,
                prompt_text: row.get(2)?,
                negative_prompt: row.get(3)?,
                prompt_type: row.get(4)?,
                created_at: row.get(5)?,
            })
        });

        match prompt {
            Ok(p) => Ok(Some(p)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

