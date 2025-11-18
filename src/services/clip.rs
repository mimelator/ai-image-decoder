use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;
use anyhow::{Result, Context};
use log::{info, debug};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipConfig {
    pub base_url: String,
    pub timeout_secs: u64,
    pub enabled: bool,
}

impl Default for ClipConfig {
    fn default() -> Self {
        // Ensure .env file is loaded (idempotent, safe to call multiple times)
        dotenv::dotenv().ok();
        
        ClipConfig {
            base_url: env::var("STABLE_DIFFUSION_BASE_URL")
                .or_else(|_| env::var("STABLE_DIFFUSION_API_URL"))
                .unwrap_or_else(|_| "http://localhost:7860".to_string()),
            timeout_secs: env::var("CLIP_TIMEOUT_SECS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
            enabled: env::var("CLIP_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .to_lowercase() == "true",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct InterrogateRequest {
    image: String, // base64 encoded image
    model: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct InterrogateResponse {
    caption: Option<String>,
    #[serde(rename = "info")]
    info: Option<String>,
}

#[derive(Clone)]
pub struct ClipService {
    config: ClipConfig,
    client: reqwest::Client,
}

impl ClipService {
    pub fn new(config: Option<ClipConfig>) -> Self {
        let config = config.unwrap_or_default();
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .expect("Failed to create HTTP client");
        
        ClipService { config, client }
    }

    /// Generate a prompt from an image using CLIP interrogation
    /// 
    /// This sends the image to the Stable Diffusion API's interrogate endpoint
    /// and returns the generated prompt/caption
    pub async fn interrogate_image<P: AsRef<Path>>(
        &self,
        image_path: P,
        model: Option<&str>,
    ) -> Result<String> {
        if !self.config.enabled {
            return Err(anyhow::anyhow!("CLIP service is disabled"));
        }

        let image_path = image_path.as_ref();
        
        // Read and encode image as base64
        let image_data = std::fs::read(image_path)
            .with_context(|| format!("Failed to read image: {}", image_path.display()))?;
        
        use base64::{Engine as _, engine::general_purpose};
        let base64_image = general_purpose::STANDARD.encode(&image_data);
        
        // Use the model parameter or default to "clip" (common for Automatic1111)
        let model_name = model.unwrap_or("clip");
        
        // Try different API endpoints - Automatic1111 uses /sdapi/v1/interrogate
        let endpoints = vec![
            format!("{}/sdapi/v1/interrogate", self.config.base_url),
            format!("{}/api/v1/interrogate", self.config.base_url),
            format!("{}/interrogate", self.config.base_url),
        ];

        let mut last_error = None;
        
        for endpoint in endpoints {
            debug!("Trying CLIP endpoint: {}", endpoint);
            
            let request_body = serde_json::json!({
                "image": base64_image,
                "model": model_name,
            });

            match self.client
                .post(&endpoint)
                .json(&request_body)
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        // Try to parse as JSON first
                        let response_text = response.text().await?;
                        
                        // Try parsing as InterrogateResponse
                        match serde_json::from_str::<InterrogateResponse>(&response_text) {
                            Ok(result) => {
                                if let Some(caption) = result.caption {
                                    info!("CLIP interrogation successful for: {}", image_path.display());
                                    return Ok(caption);
                                } else if let Some(info) = result.info {
                                    // Some APIs return the caption in an "info" field
                                    if let Ok(info_json) = serde_json::from_str::<serde_json::Value>(&info) {
                                        if let Some(caption) = info_json.get("caption").and_then(|v| v.as_str()) {
                                            return Ok(caption.to_string());
                                        }
                                    }
                                    return Ok(info);
                                }
                            }
                            Err(_) => {
                                // Try parsing as plain JSON object with different structure
                                if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&response_text) {
                                    if let Some(caption) = json_value.get("caption").and_then(|v| v.as_str()) {
                                        return Ok(caption.to_string());
                                    }
                                    if let Some(caption) = json_value.get("prompt").and_then(|v| v.as_str()) {
                                        return Ok(caption.to_string());
                                    }
                                }
                                // If it's not empty, return as-is (might be plain text)
                                if !response_text.trim().is_empty() {
                                    return Ok(response_text);
                                }
                            }
                        }
                    } else {
                        let status = response.status();
                        debug!("Endpoint {} returned status: {}", endpoint, status);
                        if status == 404 {
                            continue; // Try next endpoint
                        }
                        let error_text = response.text().await.unwrap_or_default();
                        last_error = Some(anyhow::anyhow!("API error: {} - {}", status, error_text));
                    }
                }
                Err(e) => {
                    debug!("Request to {} failed: {}", endpoint, e);
                    last_error = Some(e.into());
                }
            }
        }

        Err(last_error.unwrap_or_else(|| {
            anyhow::anyhow!("Failed to interrogate image: all endpoints failed")
        }))
    }

    /// Check if the CLIP service is available
    pub async fn health_check(&self) -> Result<bool> {
        if !self.config.enabled {
            return Ok(false);
        }

        // Try to ping the API
        let health_endpoints = vec![
            format!("{}/sdapi/v1/options", self.config.base_url),
            format!("{}/api/health", self.config.base_url),
            format!("{}/health", self.config.base_url),
        ];

        for endpoint in health_endpoints {
            if self.client.get(&endpoint).send().await.is_ok() {
                return Ok(true);
            }
        }

        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clip_config_default() {
        let config = ClipConfig::default();
        assert!(!config.base_url.is_empty());
        assert!(config.timeout_secs > 0);
    }
}

