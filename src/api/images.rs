use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::api::ApiState;
use crate::ingestion::{IngestionService, ScanProgress};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

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

    match state.image_repo.list_all() {
        Ok(images) => {
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
    let id = path.into_inner();

    match state.image_repo.find_by_id(&id) {
        Ok(Some(image)) => {
            // TODO: Implement thumbnail generation in Phase 6
            HttpResponse::NotImplemented().json(serde_json::json!({
                "error": "Thumbnail generation not yet implemented"
            }))
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Image not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get thumbnail: {}", e)
        })),
    }
}

pub async fn delete_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();

    // TODO: Implement delete in image_repo
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "Delete not yet implemented"
    }))
}

pub async fn scan_directory(
    ingestion_service: web::Data<Arc<IngestionService>>,
    req: web::Json<ScanRequest>,
) -> impl Responder {
    let path = PathBuf::from(&req.path);
    let recursive = req.recursive.unwrap_or(true);

    if !path.exists() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Directory does not exist"
        }));
    }

    // Reset progress
    *SCAN_PROGRESS.lock().unwrap() = None;

    // Start scan in background (for now, synchronous)
    match ingestion_service.scan_directory(&path, recursive) {
        Ok(progress) => {
            let response = ScanProgressResponse {
                total_files: progress.total_files,
                processed: progress.processed,
                skipped: progress.skipped,
                errors: progress.errors,
                current_file: progress.current_file,
            };
            *SCAN_PROGRESS.lock().unwrap() = Some(response.clone());
            HttpResponse::Ok().json(response)
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to scan directory: {}", e)
        })),
    }
}

pub async fn get_scan_status() -> impl Responder {
    let progress = SCAN_PROGRESS.lock().unwrap();
    match progress.as_ref() {
        Some(p) => HttpResponse::Ok().json(p.clone()),
        None => HttpResponse::Ok().json(serde_json::json!({
            "status": "idle"
        })),
    }
}

