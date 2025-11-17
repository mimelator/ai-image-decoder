use actix_web::{web, HttpResponse, Responder};
use crate::api::ApiState;

pub async fn export_prompts(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let format = query.get("format").map(|s| s.as_str()).unwrap_or("json");

    // Get all prompts
    let images = state.image_repo.list_all().unwrap_or_default();
    let mut all_prompts = Vec::new();
    for image in images {
        if let Ok(prompts) = state.prompt_repo.find_by_image_id(&image.id) {
            all_prompts.extend(prompts);
        }
    }

    match format {
        "markdown" => {
            let mut markdown = String::from("# Prompts Export\n\n");
            for prompt in all_prompts {
                markdown.push_str(&format!("## {}\n\n", prompt.id));
                markdown.push_str(&format!("**Prompt:** {}\n\n", prompt.prompt_text));
                if let Some(neg) = prompt.negative_prompt {
                    markdown.push_str(&format!("**Negative Prompt:** {}\n\n", neg));
                }
                markdown.push_str("---\n\n");
            }
            HttpResponse::Ok()
                .content_type("text/markdown")
                .body(markdown)
        }
        "json" => {
            HttpResponse::Ok()
                .content_type("application/json")
                .json(serde_json::json!({
                    "prompts": all_prompts,
                    "count": all_prompts.len()
                }))
        }
        _ => HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Format must be 'json' or 'markdown'"
        })),
    }
}

pub async fn export_images(
    state: web::Data<ApiState>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let format = query.get("format").map(|s| s.as_str()).unwrap_or("json");

    let images = state.image_repo.list_all().unwrap_or_default();

    match format {
        "markdown" => {
            let mut markdown = String::from("# Images Export\n\n");
            for image in images {
                markdown.push_str(&format!("## {}\n\n", image.file_name));
                markdown.push_str(&format!("- **Path:** {}\n", image.file_path));
                markdown.push_str(&format!("- **Format:** {}\n", image.format));
                if let (Some(w), Some(h)) = (image.width, image.height) {
                    markdown.push_str(&format!("- **Size:** {}x{}\n", w, h));
                }
                markdown.push_str("\n---\n\n");
            }
            HttpResponse::Ok()
                .content_type("text/markdown")
                .body(markdown)
        }
        "json" => {
            HttpResponse::Ok()
                .content_type("application/json")
                .json(serde_json::json!({
                    "images": images,
                    "count": images.len()
                }))
        }
        _ => HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Format must be 'json' or 'markdown'"
        })),
    }
}

pub async fn export_collection(
    state: web::Data<ApiState>,
    path: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    // TODO: Implement collection export
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "Collection export not yet implemented"
    }))
}

