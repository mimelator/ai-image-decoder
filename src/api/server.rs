use actix_web::{web, App, HttpServer};
use actix_files::Files;
use actix_cors::Cors;
use crate::api::{ApiState, health, version};
use crate::api::images::*;
use crate::api::prompts::*;
use crate::api::search::*;
use crate::api::collections::*;
use crate::api::tags::*;
use crate::api::export::*;
use crate::api::stats::*;
use crate::config::Config;
use crate::storage::{
    Database, ImageRepository, PromptRepository, MetadataRepository,
    CollectionRepository, TagRepository,
};
use crate::ingestion::IngestionService;
use std::fs;
use std::sync::Arc;

async fn index_handler() -> actix_web::Result<actix_web::HttpResponse> {
    let content = fs::read_to_string("./static/index.html")
        .unwrap_or_else(|_| "<h1>AI Image Decoder</h1><p>Web UI coming soon</p>".to_string());
    Ok(actix_web::HttpResponse::Ok()
        .content_type("text/html")
        .body(content))
}

pub async fn start_server(config: Config) -> std::io::Result<()> {
    // Initialize database
    let db = Database::new(&config.database)
        .expect("Failed to initialize database");
    
    // Initialize repositories
    let image_repo = ImageRepository::new(db.clone());
    let prompt_repo = PromptRepository::new(db.clone());
    let metadata_repo = MetadataRepository::new(db.clone());
    let collection_repo = CollectionRepository::new(db.clone());
    let tag_repo = TagRepository::new(db.clone());
    
    // Initialize ingestion service (for scan endpoint) with config for thumbnail generation
    let ingestion_service = IngestionService::with_config(db.clone(), &config);
    
    // Create API state
    let api_state = web::Data::new(ApiState {
        db: db.clone(),
        image_repo: image_repo.clone(),
        prompt_repo: prompt_repo.clone(),
        metadata_repo: metadata_repo.clone(),
        collection_repo: collection_repo.clone(),
        tag_repo: tag_repo.clone(),
    });
    
    // Create ingestion service state for scan endpoint
    // web::Data wraps in Arc internally, so we pass the service directly
    let ingestion_state = web::Data::new(ingestion_service);

    log::info!("Starting server on {}:{}", config.server.host, config.server.port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .app_data(api_state.clone())
            .wrap(cors)
            .wrap(
                actix_web::middleware::Logger::default()
                    .exclude_regex(r"/api/v1/images/scan/status")
            ) // Exclude frequent polling endpoint from logs
            // Health check
            .route("/health", web::get().to(health))
            // Version
            .route("/version", web::get().to(version))
            // API v1 routes
            .service(
                web::scope("/api/v1")
                    // Images
                    .route("/images", web::get().to(list_images))
                    .route("/images/{id}", web::get().to(get_image))
                    .route("/images/{id}/thumbnail", web::get().to(get_thumbnail))
                    .route("/images/{id}/file", web::get().to(get_image_file))
                    .route("/images/{id}", web::delete().to(delete_image))
                    .app_data(ingestion_state.clone())
                    .route("/images/scan", web::post().to(scan_directory))
                    .route("/images/scan/status", web::get().to(get_scan_status))
                    // Prompts
                    .route("/prompts", web::get().to(list_prompts))
                    .route("/prompts/{id}", web::get().to(get_prompt))
                    .route("/prompts/search", web::get().to(search_prompts))
                    .route("/prompts/image/{image_id}", web::get().to(get_prompts_for_image))
                    // Search
                    .route("/search", web::get().to(global_search))
                    .route("/search/images", web::get().to(search_images))
                    .route("/search/prompts", web::get().to(search_prompts_endpoint))
                    // Collections
                    .route("/collections", web::get().to(list_collections))
                    .route("/collections", web::post().to(create_collection))
                    .route("/collections/{id}", web::get().to(get_collection))
                    .route("/collections/{id}", web::put().to(update_collection))
                    .route("/collections/{id}", web::delete().to(delete_collection))
                    .route("/collections/{id}/images", web::post().to(add_image_to_collection))
                    .route("/collections/{id}/images/{image_id}", web::delete().to(remove_image_from_collection))
                    .route("/collections/from-folder", web::post().to(create_collection_from_folder))
                    .route("/collections/folder/{path}", web::get().to(get_collection_by_folder))
                    // Tags
                    .route("/tags", web::get().to(list_tags))
                    .route("/tags/{id}", web::get().to(get_tag))
                    .route("/tags/image/{image_id}", web::get().to(get_tags_for_image))
                    .route("/tags/type/{type}", web::get().to(get_tags_by_type))
                    .route("/tags/image/{image_id}", web::post().to(add_tag_to_image))
                    .route("/tags/image/{image_id}/{tag_id}", web::delete().to(remove_tag_from_image))
                    // Export
                    .route("/export/prompts", web::get().to(export_prompts))
                    .route("/export/images", web::get().to(export_images))
                    .route("/export/collection/{id}", web::get().to(export_collection))
                    // Statistics
                    .route("/stats", web::get().to(get_stats))
                    .route("/stats/images", web::get().to(get_image_stats))
                    .route("/stats/prompts", web::get().to(get_prompt_stats))
            )
            // Static files - use absolute path
            .service(Files::new("/static", {
                let mut path = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
                path.push("static");
                path.to_string_lossy().to_string()
            }))
            // Serve image files
            .service(
                web::scope("/images")
                    .service(Files::new("/", "/").show_files_listing())
            )
            // Root
            .route("/", web::get().to(index_handler))
    })
    .bind(format!("{}:{}", config.server.host, config.server.port))?
    .run()
    .await
}

