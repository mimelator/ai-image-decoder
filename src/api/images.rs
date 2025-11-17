use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::api::ApiState;
use crate::ingestion::{IngestionService, ScanProgress};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use log::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgressResponse {
    pub total_files: usize,
    pub processed: usize,
    pub skipped: usize,
    pub errors: usize,
    pub current_file: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanRequest {
    pub path: String,
    pub recursive: Option<bool>,
}

static SCAN_PROGRESS: Mutex<Option<ScanProgressResponse>> = Mutex::new(None);

// Helper to update scan progress
fn update_scan_progress(progress: ScanProgressResponse) {
    *SCAN_PROGRESS.lock().unwrap() = Some(progress);
}

pub async fn list_images(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let page = query
        .get("page")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(1);
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(50);
    
    // Support tag filtering via query parameter
    let tag_filter = query.get("tag").map(|s| s.as_str());

    match state.image_repo.list_all() {
        Ok(mut images) => {
            // Filter by tag if specified
            if let Some(tag_name) = tag_filter {
                images.retain(|image| {
                    // Check if image has this tag
                    if let Ok(tags) = state.tag_repo.find_by_image_id(&image.id) {
                        tags.iter().any(|(tag, _)| tag.name.to_lowercase() == tag_name.to_lowercase())
                    } else {
                        false
                    }
                });
            }
            
            let total = images.len();
            let start = (page - 1) * limit;
            let end = std::cmp::min(start + limit, total);
            let paginated = images.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

            HttpResponse::Ok().json(serde_json::json!({
                "images": paginated,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) / limit
                }
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to list images: {}", e)
        })),
    }
}

pub async fn get_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();

    match state.image_repo.find_by_id(&id) {
        Ok(Some(image)) => HttpResponse::Ok().json(image),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Image not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get image: {}", e)
        })),
    }
}

pub async fn get_thumbnail(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    use actix_web::http::header::{ContentType, ContentDisposition, DispositionType};
    use std::fs;
    use crate::utils::thumbnail;
    
    let id = path.into_inner();

    match state.image_repo.find_by_id(&id) {
        Ok(Some(image)) => {
            let image_path = std::path::Path::new(&image.file_path);
            
            // Try to find thumbnail (default location: ./data/thumbnails/)
            let thumbnail_base = std::path::Path::new("./data/thumbnails");
            let thumbnail_path = thumbnail::get_thumbnail_path(image_path, thumbnail_base);
            
            // Check if thumbnail exists
            if thumbnail_path.exists() {
                match fs::read(&thumbnail_path) {
                    Ok(file_data) => {
                        // Determine content type from thumbnail extension
                        let content_type = match thumbnail_path.extension().and_then(|s| s.to_str()) {
                            Some("png") => "image/png",
                            Some("jpg") | Some("jpeg") => "image/jpeg",
                            Some("webp") => "image/webp",
                            _ => "image/jpeg", // Default
                        };
                        
                        HttpResponse::Ok()
                            .content_type(ContentType(content_type.parse().unwrap()))
                            .insert_header(ContentDisposition {
                                disposition: DispositionType::Inline,
                                parameters: vec![],
                            })
                            .body(file_data)
                    }
                    Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to read thumbnail: {}", e)
                    })),
                }
            } else {
                // Thumbnail doesn't exist, return full image as fallback
                // (or could return 404, but returning full image is more user-friendly)
                if image_path.exists() {
                    match fs::read(image_path) {
                        Ok(file_data) => {
                            let content_type = match image.format.to_lowercase().as_str() {
                                "png" => "image/png",
                                "jpg" | "jpeg" => "image/jpeg",
                                "webp" => "image/webp",
                                _ => "application/octet-stream",
                            };
                            
                            HttpResponse::Ok()
                                .content_type(ContentType(content_type.parse().unwrap()))
                                .insert_header(ContentDisposition {
                                    disposition: DispositionType::Inline,
                                    parameters: vec![],
                                })
                                .body(file_data)
                        }
                        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                            "error": format!("Failed to read image: {}", e)
                        })),
                    }
                } else {
                    HttpResponse::NotFound().json(serde_json::json!({
                        "error": "Thumbnail not found and source image not available"
                    }))
                }
            }
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Image not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get thumbnail: {}", e)
        })),
    }
}

pub async fn get_image_file(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    use actix_web::http::header::{ContentType, ContentDisposition, DispositionType};
    use std::fs;
    
    let id = path.into_inner();

    match state.image_repo.find_by_id(&id) {
        Ok(Some(image)) => {
            // Check if file exists
            if !std::path::Path::new(&image.file_path).exists() {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Image file not found on disk"
                }));
            }
            
            // Read file
            match fs::read(&image.file_path) {
                Ok(file_data) => {
                    // Determine content type from format
                    let content_type = match image.format.to_lowercase().as_str() {
                        "png" => "image/png",
                        "jpg" | "jpeg" => "image/jpeg",
                        "webp" => "image/webp",
                        _ => "application/octet-stream",
                    };
                    
                    HttpResponse::Ok()
                        .content_type(ContentType(content_type.parse().unwrap()))
                        .insert_header(ContentDisposition {
                            disposition: DispositionType::Inline,
                            parameters: vec![],
                        })
                        .body(file_data)
                }
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to read image file: {}", e)
                })),
            }
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Image not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get image: {}", e)
        })),
    }
}

pub async fn delete_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();

    // Check if image exists
    match state.image_repo.find_by_id(&id) {
        Ok(Some(_)) => {
            match state.image_repo.delete(&id) {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Image deleted"
                })),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to delete image: {}", e)
                })),
            }
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Image not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to check image: {}", e)
        })),
    }
}

pub async fn scan_directory(
    ingestion_service: web::Data<IngestionService>,
    req: web::Json<ScanRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    info!("Scan endpoint called: path={}, recursive={:?}", req.path, req.recursive);
    
    let path = PathBuf::from(&req.path);
    let recursive = req.recursive.unwrap_or(true);
    
    info!("Path validated: exists={}, is_dir={}", path.exists(), path.is_dir());

    if !path.exists() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Directory does not exist"
        })));
    }

    if !path.is_dir() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Path is not a directory"
        })));
    }

    info!("Resetting progress...");
    // Reset progress
    update_scan_progress(ScanProgressResponse {
        total_files: 0,
        processed: 0,
        skipped: 0,
        errors: 0,
        current_file: Some("Starting scan...".to_string()),
    });

    info!("Cloning service...");
    // Start scan in background using actix_web::rt::spawn (compatible with actix runtime)
    // web::Data wraps in Arc internally, so get_ref() gives us &IngestionService
    // We need to clone it for the background task
    let service_clone = ingestion_service.get_ref().clone();
    let path_clone = path.clone();
    
    info!("Spawning background task...");
    // Start scan in background - use a simpler approach
    // Create a function pointer that can be safely moved into spawn_blocking
    actix_web::rt::spawn(async move {
        info!("Background task started");
        // Run scan in blocking thread with callback
        use crate::ingestion::ScanProgress;
        
        // Define a helper function that's Send + 'static
        fn update_progress_fn(progress: &ScanProgress) {
            update_scan_progress(ScanProgressResponse {
                total_files: progress.total_files,
                processed: progress.processed,
                skipped: progress.skipped,
                errors: progress.errors,
                current_file: progress.current_file.as_ref().map(|s| s.clone()),
            });
        }
        
        info!("Spawning blocking task...");
        let result = actix_web::rt::task::spawn_blocking(move || {
            info!("Blocking task started, calling scan_directory_with_callback...");
            service_clone.scan_directory_with_callback(&path_clone, recursive, Some(update_progress_fn as fn(&ScanProgress)))
        }).await;

        match result {
            Ok(Ok(progress)) => {
                let response = ScanProgressResponse {
                    total_files: progress.total_files,
                    processed: progress.processed,
                    skipped: progress.skipped,
                    errors: progress.errors,
                    current_file: None,
                };
                update_scan_progress(response);
                info!("Scan completed: {} files processed", progress.processed);
            }
            Ok(Err(e)) => {
                eprintln!("Scan error: {}", e);
                update_scan_progress(ScanProgressResponse {
                    total_files: 0,
                    processed: 0,
                    skipped: 0,
                    errors: 1,
                    current_file: Some(format!("Error: {}", e)),
                });
            }
            Err(e) => {
                eprintln!("Task error: {}", e);
                update_scan_progress(ScanProgressResponse {
                    total_files: 0,
                    processed: 0,
                    skipped: 0,
                    errors: 1,
                    current_file: Some(format!("Task error: {}", e)),
                });
            }
        }
    });

    // Return immediately with initial progress
    Ok(HttpResponse::Ok().json(ScanProgressResponse {
        total_files: 0,
        processed: 0,
        skipped: 0,
        errors: 0,
        current_file: Some("Scan started...".to_string()),
    }))
}

pub async fn get_scan_status() -> impl Responder {
    let progress = SCAN_PROGRESS.lock().unwrap();
    match progress.as_ref() {
        Some(p) => {
            // Check if scan is complete
            let is_complete = p.total_files > 0 && (p.processed + p.skipped + p.errors >= p.total_files);
            HttpResponse::Ok().json(serde_json::json!({
                "status": if is_complete { "idle" } else { "scanning" },
                "total_files": p.total_files,
                "processed": p.processed,
                "skipped": p.skipped,
                "errors": p.errors,
                "current_file": p.current_file
            }))
        }
        None => HttpResponse::Ok().json(serde_json::json!({
            "status": "idle"
        })),
    }
}

