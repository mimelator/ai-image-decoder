use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::storage::{
    Database, ImageRepository, PromptRepository, MetadataRepository,
    CollectionRepository, TagRepository,
};

pub mod server;
pub mod images;
pub mod prompts;
pub mod search;
pub mod collections;
pub mod tags;
pub mod export;
pub mod stats;

pub struct ApiState {
    pub db: Database,
    pub image_repo: ImageRepository,
    pub prompt_repo: PromptRepository,
    pub metadata_repo: MetadataRepository,
    pub collection_repo: CollectionRepository,
    pub tag_repo: TagRepository,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
}

// Health check endpoint
pub async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "ai-image-decoder"
    }))
}
