use crate::extraction::png::extract_png_metadata;
use crate::extraction::jpeg::extract_jpeg_metadata;
use crate::extraction::webp::extract_webp_metadata;
use crate::extraction::normalizer::PromptNormalizer;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedMetadata {
    pub prompt: Option<String>,
    pub negative_prompt: Option<String>,
    pub parameters: Option<String>,
    pub model: Option<String>,
    pub seed: Option<String>,
    pub steps: Option<String>,
    pub cfg_scale: Option<String>,
    pub sampler: Option<String>,
    pub size: Option<String>,
    pub other: Vec<(String, String)>, // key-value pairs for other metadata
}

pub struct MetadataExtractor;

impl MetadataExtractor {
    pub fn extract<P: AsRef<Path>>(path: P) -> anyhow::Result<ExtractedMetadata> {
        let path = path.as_ref();
        
        // Detect format by extension
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();

        let mut metadata = match ext.as_str() {
            "png" => extract_png_metadata(path)?,
            "jpg" | "jpeg" => extract_jpeg_metadata(path)?,
            "webp" => extract_webp_metadata(path)?,
            _ => ExtractedMetadata::empty(),
        };

        // Normalize prompts
        if let Some(ref mut prompt) = metadata.prompt {
            *prompt = PromptNormalizer::normalize(prompt);
        }

        if let Some(ref mut neg_prompt) = metadata.negative_prompt {
            *neg_prompt = PromptNormalizer::normalize(neg_prompt);
        }

        Ok(metadata)
    }
}

impl ExtractedMetadata {
    pub fn empty() -> Self {
        ExtractedMetadata {
            prompt: None,
            negative_prompt: None,
            parameters: None,
            model: None,
            seed: None,
            steps: None,
            cfg_scale: None,
            sampler: None,
            size: None,
            other: Vec::new(),
        }
    }
}

