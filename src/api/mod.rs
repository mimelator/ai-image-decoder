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
pub mod version_check;

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

// Version endpoint
pub async fn version(query: web::Query<std::collections::HashMap<String, String>>) -> impl Responder {
    use crate::api::version_check;
    
    // Get current version
    let current_version = version_check::get_current_version();
    
    // Check if force refresh is requested
    let force = query.get("force").and_then(|v| v.parse::<bool>().ok()).unwrap_or(false);
    
    // Check for updates (non-blocking, uses cache unless forced)
    let version_info = version_check::check_for_updates(force).await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "version": current_version,
        "latest_version": version_info.latest,
        "update_available": version_info.update_available,
        "last_checked": version_info.last_checked
    }))
}
