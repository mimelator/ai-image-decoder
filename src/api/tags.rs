use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::api::ApiState;
use crate::storage::tag_repo::ImageTag;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct AddTagRequest {
    pub tag_name: String,
    pub tag_type: String,
}

pub async fn list_tags(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    // TODO: Add list_all to tag_repo
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "List tags not yet implemented"
    }))
}

pub async fn get_tag(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    // TODO: Add find_by_id to tag_repo
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "Get tag by ID not yet implemented"
    }))
}

pub async fn get_tags_for_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let image_id = path.into_inner();

    match state.tag_repo.find_by_image_id(&image_id) {
        Ok(tags) => {
            let tag_list: Vec<_> = tags.into_iter().map(|(tag, _)| tag).collect();
            HttpResponse::Ok().json(serde_json::json!({
                "tags": tag_list
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get tags: {}", e)
        })),
    }
}

pub async fn get_tags_by_type(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    // TODO: Add get_by_type to tag_repo
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "Get tags by type not yet implemented"
    }))
}

pub async fn add_tag_to_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
    req: web::Json<AddTagRequest>,
) -> impl Responder {
    let image_id = path.into_inner();

    match state.tag_repo.find_or_create(&req.tag_name, &req.tag_type) {
        Ok(tag) => {
            let now = Utc::now().to_rfc3339();
            let image_tag = ImageTag {
                image_id: image_id.clone(),
                tag_id: tag.id.clone(),
                confidence: 1.0,
                source: "manual".to_string(),
                created_at: now,
            };

            match state.tag_repo.add_to_image(&image_tag) {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "tag": tag
                })),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to add tag: {}", e)
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create tag: {}", e)
        })),
    }
}

pub async fn remove_tag_from_image(
    state: web::Data<ApiState>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    // TODO: Implement remove tag
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "Remove tag not yet implemented"
    }))
}

