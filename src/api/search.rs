use actix_web::{web, HttpResponse, Responder};
use crate::api::ApiState;

pub async fn global_search(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let search_query = query.get("q").map(|s| s.as_str()).unwrap_or("");

    if search_query.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Query parameter 'q' is required"
        }));
    }

    // Search prompts
    let prompts = state.prompt_repo.search(search_query).unwrap_or_default();

    // Search images by filename (simplified)
    let images = state.image_repo.list_all()
        .unwrap_or_default()
        .into_iter()
        .filter(|img| img.file_name.to_lowercase().contains(&search_query.to_lowercase()))
        .collect::<Vec<_>>();

    HttpResponse::Ok().json(serde_json::json!({
        "query": search_query,
        "prompts": prompts,
        "images": images,
        "counts": {
            "prompts": prompts.len(),
            "images": images.len()
        }
    }))
}

pub async fn search_images(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let search_query = query.get("q").map(|s| s.as_str()).unwrap_or("");

    let images = state.image_repo.list_all()
        .unwrap_or_default()
        .into_iter()
        .filter(|img| {
            img.file_name.to_lowercase().contains(&search_query.to_lowercase()) ||
            img.file_path.to_lowercase().contains(&search_query.to_lowercase())
        })
        .collect::<Vec<_>>();

    HttpResponse::Ok().json(serde_json::json!({
        "images": images,
        "count": images.len()
    }))
}

pub async fn search_prompts_endpoint(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let search_query = query.get("q").map(|s| s.as_str()).unwrap_or("");

    if search_query.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Query parameter 'q' is required"
        }));
    }

    match state.prompt_repo.search(search_query) {
        Ok(prompts) => HttpResponse::Ok().json(serde_json::json!({
            "prompts": prompts,
            "count": prompts.len()
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to search prompts: {}", e)
        })),
    }
}

