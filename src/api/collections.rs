use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::api::ApiState;
use crate::storage::collection_repo::Collection;
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCollectionRequest {
    pub name: String,
    pub description: Option<String>,
    pub folder_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCollectionRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFromFolderRequest {
    pub folder_path: String,
}

pub async fn list_collections(state: web::Data<ApiState>) -> impl Responder {
    match state.collection_repo.list_all() {
        Ok(collections) => HttpResponse::Ok().json(serde_json::json!({
            "collections": collections
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to list collections: {}", e)
        })),
    }
}

pub async fn create_collection(
    state: web::Data<ApiState>,
    req: web::Json<CreateCollectionRequest>,
) -> impl Responder {
    let now = Utc::now().to_rfc3339();
    let collection = Collection {
        id: Uuid::new_v4().to_string(),
        name: req.name.clone(),
        description: req.description.clone(),
        folder_path: req.folder_path.clone(),
        is_folder_based: req.folder_path.is_some(),
        created_at: now.clone(),
        updated_at: now,
    };

    match state.collection_repo.create(&collection) {
        Ok(_) => HttpResponse::Created().json(collection),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create collection: {}", e)
        })),
    }
}

pub async fn get_collection(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();

    match state.collection_repo.find_by_id(&id) {
        Ok(Some(collection)) => HttpResponse::Ok().json(collection),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Collection not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get collection: {}", e)
        })),
    }
}

pub async fn update_collection(
    state: web::Data<ApiState>,
    path: web::Path<String>,
    req: web::Json<UpdateCollectionRequest>,
) -> impl Responder {
    let id = path.into_inner();

    // Get existing collection
    let existing = match state.collection_repo.find_by_id(&id) {
        Ok(Some(col)) => col,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Collection not found"
            }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get collection: {}", e)
            }));
        }
    };

    // Update collection with new values
    let updated = Collection {
        id: existing.id.clone(),
        name: req.name.clone().unwrap_or(existing.name),
        description: req.description.clone().or(existing.description),
        folder_path: existing.folder_path.clone(), // Don't allow changing folder_path
        is_folder_based: existing.is_folder_based, // Don't allow changing is_folder_based
        created_at: existing.created_at.clone(),
        updated_at: Utc::now().to_rfc3339(),
    };

    match state.collection_repo.update(&updated) {
        Ok(_) => HttpResponse::Ok().json(updated),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update collection: {}", e)
        })),
    }
}

pub async fn delete_collection(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();

    // Check if collection exists
    match state.collection_repo.find_by_id(&id) {
        Ok(Some(_)) => {
            match state.collection_repo.delete(&id) {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Collection deleted"
                })),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to delete collection: {}", e)
                })),
            }
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Collection not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to check collection: {}", e)
        })),
    }
}

pub async fn add_image_to_collection(
    state: web::Data<ApiState>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let collection_id = path.into_inner();
    let image_id = req.get("image_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if image_id.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "image_id is required"
        }));
    }

    match state.collection_repo.add_image(&collection_id, image_id) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to add image to collection: {}", e)
        })),
    }
}

pub async fn remove_image_from_collection(
    state: web::Data<ApiState>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (collection_id, image_id) = path.into_inner();

    match state.collection_repo.remove_image(&collection_id, &image_id) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Image removed from collection"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to remove image from collection: {}", e)
        })),
    }
}

pub async fn create_collection_from_folder(
    state: web::Data<ApiState>,
    req: web::Json<CreateFromFolderRequest>,
) -> impl Responder {
    match state.collection_repo.find_by_folder_path(&req.folder_path) {
        Ok(Some(collection)) => HttpResponse::Ok().json(collection),
        Ok(None) => {
            // Create new collection
            let now = Utc::now().to_rfc3339();
            let folder_name = std::path::Path::new(&req.folder_path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown")
                .to_string();

            let collection = Collection {
                id: Uuid::new_v4().to_string(),
                name: folder_name,
                description: Some(format!("Auto-created from folder: {}", req.folder_path)),
                folder_path: Some(req.folder_path.clone()),
                is_folder_based: true,
                created_at: now.clone(),
                updated_at: now,
            };

            match state.collection_repo.create(&collection) {
                Ok(_) => HttpResponse::Created().json(collection),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to create collection: {}", e)
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to check collection: {}", e)
        })),
    }
}

pub async fn get_collection_by_folder(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let folder_path = path.into_inner();

    match state.collection_repo.find_by_folder_path(&folder_path) {
        Ok(Some(collection)) => HttpResponse::Ok().json(collection),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Collection not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get collection: {}", e)
        })),
    }
}

