use actix_web::{web, HttpResponse, Responder};
use crate::api::ApiState;

pub async fn list_prompts(
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

    // Get all prompts (simplified for now)
    match state.image_repo.list_all() {
        Ok(images) => {
            let mut all_prompts = Vec::new();
            for image in images {
                if let Ok(prompts) = state.prompt_repo.find_by_image_id(&image.id) {
                    all_prompts.extend(prompts);
                }
            }

            let total = all_prompts.len();
            let start = (page - 1) * limit;
            let end = std::cmp::min(start + limit, total);
            let paginated = all_prompts.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

            HttpResponse::Ok().json(serde_json::json!({
                "prompts": paginated,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) / limit
                }
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to list prompts: {}", e)
        })),
    }
}

pub async fn get_prompt(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();

    match state.prompt_repo.find_by_id(&id) {
        Ok(Some(prompt)) => HttpResponse::Ok().json(prompt),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Prompt not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get prompt: {}", e)
        })),
    }
}

pub async fn search_prompts(
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

pub async fn get_prompts_for_image(
    state: web::Data<ApiState>,
    path: web::Path<String>,
) -> impl Responder {
    let image_id = path.into_inner();

    match state.prompt_repo.find_by_image_id(&image_id) {
        Ok(prompts) => HttpResponse::Ok().json(serde_json::json!({
            "prompts": prompts
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get prompts: {}", e)
        })),
    }
}

