use actix_web::{web, HttpResponse, Responder};
use crate::api::ApiState;

pub async fn get_stats(state: web::Data<ApiState>) -> impl Responder {
    let images = state.image_repo.list_all().unwrap_or_default();
    let collections = state.collection_repo.list_all().unwrap_or_default();

    // Count prompts
    let mut prompt_count = 0;
    for image in &images {
        if let Ok(prompts) = state.prompt_repo.find_by_image_id(&image.id) {
            prompt_count += prompts.len();
        }
    }

    // Count tags
    let mut tag_count = 0;
    for image in &images {
        if let Ok(tags) = state.tag_repo.find_by_image_id(&image.id) {
            tag_count += tags.len();
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "images": {
            "total": images.len()
        },
        "prompts": {
            "total": prompt_count
        },
        "collections": {
            "total": collections.len()
        },
        "tags": {
            "total": tag_count
        }
    }))
}

pub async fn get_image_stats(state: web::Data<ApiState>) -> impl Responder {
    let images = state.image_repo.list_all().unwrap_or_default();

    let mut format_counts = std::collections::HashMap::new();
    let mut total_size = 0u64;

    for image in &images {
        *format_counts.entry(image.format.clone()).or_insert(0) += 1;
        total_size += image.file_size;
    }

    HttpResponse::Ok().json(serde_json::json!({
        "total": images.len(),
        "total_size": total_size,
        "formats": format_counts
    }))
}

pub async fn get_prompt_stats(state: web::Data<ApiState>) -> impl Responder {
    let images = state.image_repo.list_all().unwrap_or_default();
    let mut prompt_count = 0;
    let mut unique_prompts = std::collections::HashSet::new();

    for image in &images {
        if let Ok(prompts) = state.prompt_repo.find_by_image_id(&image.id) {
            prompt_count += prompts.len();
            for prompt in prompts {
                unique_prompts.insert(prompt.prompt_text);
            }
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "total": prompt_count,
        "unique": unique_prompts.len()
    }))
}

