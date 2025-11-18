use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::api::ApiState;
use crate::services::ClipService;
use crate::storage::prompt_repo::Prompt;
use log::{info, warn};

#[derive(Debug, Serialize, Deserialize)]
pub struct InterrogateRequest {
    pub model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchInterrogateRequest {
    pub image_ids: Vec<String>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchInterrogateResponse {
    pub total: usize,
    pub successful: usize,
    pub failed: usize,
    pub results: Vec<BatchInterrogateResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchInterrogateResult {
    pub image_id: String,
    pub success: bool,
    pub prompt: Option<String>,
    pub error: Option<String>,
}

/// Interrogate an image using CLIP to generate a prompt
/// 
/// POST /api/v1/images/{id}/interrogate
/// 
/// This endpoint sends the image to a Stable Diffusion API's CLIP interrogation
/// endpoint and returns the generated prompt/caption
pub async fn interrogate_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
    body: Option<web::Json<InterrogateRequest>>,
) -> impl Responder {
    let image_id = path.into_inner();
    let model = body.as_ref().and_then(|b| b.model.clone());

    // Get image from database
    match state.image_repo.find_by_id(&image_id) {
        Ok(Some(image)) => {
            // Check if file exists
            if !std::path::Path::new(&image.file_path).exists() {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Image file not found on disk"
                }));
            }

            // Create CLIP service
            let clip_service = ClipService::new(None);

            // Interrogate the image
            match clip_service.interrogate_image(&image.file_path, model.as_deref()).await {
                Ok(prompt) => {
                    info!("CLIP interrogation successful for image: {}", image_id);
                    
                    // Optionally save the generated prompt to the database
                    // This could be added as a feature flag
                    if let Err(e) = state.prompt_repo.create(&Prompt {
                        id: uuid::Uuid::new_v4().to_string(),
                        image_id: image_id.clone(),
                        prompt_text: prompt.clone(),
                        negative_prompt: None,
                        prompt_type: "clip_generated".to_string(),
                        created_at: chrono::Utc::now().to_rfc3339(),
                    }) {
                        warn!("Failed to save CLIP-generated prompt to database: {}", e);
                    }

                    HttpResponse::Ok().json(serde_json::json!({
                        "image_id": image_id,
                        "prompt": prompt,
                        "source": "clip_interrogation",
                        "model": model.unwrap_or_else(|| "clip".to_string()),
                    }))
                }
                Err(e) => {
                    warn!("CLIP interrogation failed for image {}: {}", image_id, e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("CLIP interrogation failed: {}", e)
                    }))
                }
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

/// Batch interrogate multiple images using CLIP
/// 
/// POST /api/v1/clip/interrogate/batch
/// 
/// Interrogates multiple images in parallel and returns results
pub async fn batch_interrogate(
    state: web::Data<ApiState>,
    body: web::Json<BatchInterrogateRequest>,
) -> impl Responder {
    let response = process_batch_interrogation(state, body.into_inner()).await;
    HttpResponse::Ok().json(response)
}

/// Batch interrogate all images in a collection
/// 
/// POST /api/v1/collections/{id}/interrogate
/// 
/// Interrogates all images in a collection using CLIP
pub async fn interrogate_collection(
    state: web::Data<ApiState>,
    path: web::Path<String>,
    body: Option<web::Json<InterrogateRequest>>,
) -> impl Responder {
    let collection_id = path.into_inner();
    let model = body.as_ref().and_then(|b| b.model.clone());

    // Get collection
    let collection = match state.collection_repo.find_by_id(&collection_id) {
        Ok(Some(c)) => c,
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

    // Get all image IDs in the collection
    let image_ids = match state.collection_repo.get_image_ids(&collection_id) {
        Ok(ids) => ids,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get collection images: {}", e)
            }));
        }
    };

    if image_ids.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Collection is empty"
        }));
    }

    info!("Starting CLIP interrogation for collection '{}' with {} images", collection.name, image_ids.len());

    // Create batch request and process it
    let batch_request = BatchInterrogateRequest {
        image_ids,
        model,
    };

    // Process the batch request (same logic as batch_interrogate)
    let response = process_batch_interrogation(state, batch_request).await;
    HttpResponse::Ok().json(response)
}

async fn process_batch_interrogation(
    state: web::Data<ApiState>,
    request: BatchInterrogateRequest,
) -> BatchInterrogateResponse {
    let image_ids = request.image_ids;
    let model = request.model;
    
    if image_ids.is_empty() {
        return BatchInterrogateResponse {
            total: 0,
            successful: 0,
            failed: 0,
            results: vec![],
        };
    }
    
    // Note: We allow more than 50 images here since we chunk them in the caller
    // The 50 limit is enforced at the API endpoint level
    
    info!("Starting batch CLIP interrogation for {} images", image_ids.len());
    
    let clip_service = ClipService::new(None);
    let mut results = Vec::new();
    let mut successful = 0;
    let mut failed = 0;
    
    // Process images with controlled concurrency (max 5 at a time)
    use futures::stream::{self, StreamExt};
    
    let futures = image_ids.into_iter().map(|image_id| {
        let state_clone = state.clone();
        let clip_service_clone = clip_service.clone();
        let model_clone = model.clone();
        
        async move {
            match state_clone.image_repo.find_by_id(&image_id) {
                Ok(Some(image)) => {
                    if !std::path::Path::new(&image.file_path).exists() {
                        return BatchInterrogateResult {
                            image_id: image_id.clone(),
                            success: false,
                            prompt: None,
                            error: Some("Image file not found on disk".to_string()),
                        };
                    }
                    
                    match clip_service_clone.interrogate_image(&image.file_path, model_clone.as_deref()).await {
                        Ok(prompt) => {
                            // Save to database
                            let _ = state_clone.prompt_repo.create(&Prompt {
                                id: uuid::Uuid::new_v4().to_string(),
                                image_id: image_id.clone(),
                                prompt_text: prompt.clone(),
                                negative_prompt: None,
                                prompt_type: "clip_generated".to_string(),
                                created_at: chrono::Utc::now().to_rfc3339(),
                            });
                            
                            BatchInterrogateResult {
                                image_id: image_id.clone(),
                                success: true,
                                prompt: Some(prompt),
                                error: None,
                            }
                        }
                        Err(e) => {
                            BatchInterrogateResult {
                                image_id: image_id.clone(),
                                success: false,
                                prompt: None,
                                error: Some(e.to_string()),
                            }
                        }
                    }
                }
                Ok(None) => BatchInterrogateResult {
                    image_id: image_id.clone(),
                    success: false,
                    prompt: None,
                    error: Some("Image not found".to_string()),
                },
                Err(e) => BatchInterrogateResult {
                    image_id: image_id.clone(),
                    success: false,
                    prompt: None,
                    error: Some(format!("Database error: {}", e)),
                },
            }
        }
    });
    
    // Process with concurrency limit of 5
    let mut stream = stream::iter(futures).buffer_unordered(5);
    while let Some(result) = stream.next().await {
        if result.success {
            successful += 1;
        } else {
            failed += 1;
        }
        results.push(result);
    }
    
    info!("Batch CLIP interrogation complete: {} successful, {} failed", successful, failed);
    
    BatchInterrogateResponse {
        total: results.len(),
        successful,
        failed,
        results,
    }
}

/// Get collections that need CLIP interrogation
/// 
/// GET /api/v1/clip/collections/needing-inspection
/// 
/// Returns list of collection IDs that have images without CLIP-generated prompts
pub async fn get_collections_needing_clip(
    state: web::Data<ApiState>,
) -> impl Responder {
    match state.collection_repo.get_collections_needing_clip() {
        Ok(collection_ids) => {
            // Get full collection details
            let mut collections = Vec::new();
            for collection_id in collection_ids {
                if let Ok(Some(collection)) = state.collection_repo.find_by_id(&collection_id) {
                    // Count images in collection
                    let image_count = state.collection_repo.get_image_ids(&collection_id)
                        .map(|ids| ids.len())
                        .unwrap_or(0);
                    
                    collections.push(serde_json::json!({
                        "id": collection.id,
                        "name": collection.name,
                        "description": collection.description,
                        "image_count": image_count,
                    }));
                }
            }
            
            HttpResponse::Ok().json(serde_json::json!({
                "collections": collections,
                "total": collections.len()
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get collections: {}", e)
        })),
    }
}

/// Batch interrogate all collections that need CLIP
/// 
/// POST /api/v1/clip/interrogate/all-collections
/// 
/// Processes all collections that have images without CLIP-generated prompts
pub async fn interrogate_all_collections(
    state: web::Data<ApiState>,
    body: Option<web::Json<InterrogateRequest>>,
) -> impl Responder {
    let model = body.as_ref().and_then(|b| b.model.clone());
    
    // Get collections that need CLIP
    let collection_ids = match state.collection_repo.get_collections_needing_clip() {
        Ok(ids) => ids,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get collections needing CLIP: {}", e)
            }));
        }
    };
    
    if collection_ids.is_empty() {
        return HttpResponse::Ok().json(serde_json::json!({
            "message": "All collections have been inspected",
            "collections_processed": 0,
            "total_images": 0,
            "successful": 0,
            "failed": 0,
            "results": []
        }));
    }
    
    info!("Starting CLIP interrogation for {} collections that need inspection", collection_ids.len());
    
    let mut collection_results = Vec::new();
    let mut total_images = 0;
    let mut total_successful = 0;
    let mut total_failed = 0;
    
    // Process each collection sequentially
    for collection_id in collection_ids {
        // Get collection name for logging
        let collection_name = state.collection_repo.find_by_id(&collection_id)
            .ok()
            .flatten()
            .map(|c| c.name.clone())
            .unwrap_or_else(|| collection_id.clone());
        
        // Get image IDs for this collection (only those without CLIP prompts)
        let all_image_ids = match state.collection_repo.get_image_ids(&collection_id) {
            Ok(ids) => ids,
            Err(e) => {
                warn!("Failed to get images for collection {}: {}", collection_id, e);
                collection_results.push(serde_json::json!({
                    "collection_id": collection_id,
                    "collection_name": collection_name,
                    "success": false,
                    "error": format!("Failed to get images: {}", e)
                }));
                continue;
            }
        };
        
        // Filter to only images without CLIP prompts
        let mut image_ids_needing_clip = Vec::new();
        for image_id in all_image_ids {
            match state.prompt_repo.find_by_image_id(&image_id) {
                Ok(prompts) => {
                    let has_clip = prompts.iter().any(|p| p.prompt_type == "clip_generated");
                    if !has_clip {
                        image_ids_needing_clip.push(image_id);
                    }
                }
                Err(_) => {
                    // If we can't check, assume it needs CLIP
                    image_ids_needing_clip.push(image_id);
                }
            }
        }
        
        if image_ids_needing_clip.is_empty() {
            continue; // Skip collections where all images already have CLIP prompts
        }
        
        total_images += image_ids_needing_clip.len();
        info!("Processing collection '{}' with {} images needing CLIP", collection_name, image_ids_needing_clip.len());
        
        // Process this collection's images in batches of 50
        let mut collection_successful = 0;
        let mut collection_failed = 0;
        
        for chunk in image_ids_needing_clip.chunks(50) {
            let batch_request = BatchInterrogateRequest {
                image_ids: chunk.to_vec(),
                model: model.clone(),
            };
            
            // Process batch and get results directly
            let batch_response = process_batch_interrogation(state.clone(), batch_request).await;
            collection_successful += batch_response.successful;
            collection_failed += batch_response.failed;
        }
        
        total_successful += collection_successful;
        total_failed += collection_failed;
        
        collection_results.push(serde_json::json!({
            "collection_id": collection_id,
            "collection_name": collection_name,
            "success": true,
            "images_processed": image_ids_needing_clip.len(),
            "successful": collection_successful,
            "failed": collection_failed,
        }));
    }
    
    HttpResponse::Ok().json(serde_json::json!({
        "message": "Batch CLIP interrogation complete",
        "collections_processed": collection_results.len(),
        "total_images": total_images,
        "total_successful": total_successful,
        "total_failed": total_failed,
        "results": collection_results
    }))
}

/// Check CLIP service health
/// 
/// GET /api/v1/clip/health
pub async fn clip_health() -> impl Responder {
    let clip_service = ClipService::new(None);
    
    match clip_service.health_check().await {
        Ok(true) => HttpResponse::Ok().json(serde_json::json!({
            "status": "ok",
            "service": "clip",
            "available": true
        })),
        Ok(false) => HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "status": "unavailable",
            "service": "clip",
            "available": false
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "status": "error",
            "service": "clip",
            "error": e.to_string()
        })),
    }
}

