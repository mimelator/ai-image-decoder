use crate::extraction::{ExtractedMetadata, apply_comfyui_to_metadata};
use std::path::Path;

pub fn extract_png_metadata<P: AsRef<Path>>(path: P) -> anyhow::Result<ExtractedMetadata> {
    let path = path.as_ref();
    
    // Read the PNG file and parse text chunks manually
    // The png crate doesn't expose text chunks directly, so we parse the file manually
    let file_data = std::fs::read(path)?;
    let text_chunks = parse_png_text_chunks(&file_data)?;

    let mut metadata = ExtractedMetadata::empty();

    // Parse parameters field (most common in Stable Diffusion)
    // Process parameters first to extract ComfyUI prompts
    let mut has_comfyui_workflow = false;
    for (key, value) in &text_chunks {
        if key == "parameters" && value.trim_start().starts_with('{') {
            has_comfyui_workflow = true;
            metadata.parameters = Some(value.clone());
            // Try to parse as ComfyUI workflow - this will set metadata.prompt to readable text
            apply_comfyui_to_metadata(value, &mut metadata);
            break; // Process parameters first, then continue with other chunks
        }
    }
    
    // Now process all chunks
    for (key, value) in &text_chunks {
        match key.as_str() {
            "parameters" => {
                // Already processed above if it's ComfyUI
                if !has_comfyui_workflow {
                    metadata.parameters = Some(value.clone());
                    // Try to parse as standard Stable Diffusion parameters string
                    parse_parameters_string(value, &mut metadata);
                }
            }
            "prompt" => {
                // Only set if we don't already have a prompt from ComfyUI
                // Also check if this "prompt" field is actually JSON (ComfyUI workflow)
                // If it is, don't use it as the prompt - we've already extracted the readable prompt
                if metadata.prompt.is_none() {
                    // If it's JSON, try to extract readable prompt from it
                    if value.trim_start().starts_with('{') {
                        apply_comfyui_to_metadata(value, &mut metadata);
                    } else {
                        metadata.prompt = Some(value.clone());
                    }
                }
            }
            "negative_prompt" => {
                metadata.negative_prompt = Some(value.clone());
            }
            "model" => {
                metadata.model = Some(value.clone());
            }
            "seed" => {
                metadata.seed = Some(value.clone());
            }
            "steps" => {
                metadata.steps = Some(value.clone());
            }
            "cfg_scale" | "CFG scale" => {
                metadata.cfg_scale = Some(value.clone());
            }
            "sampler" => {
                metadata.sampler = Some(value.clone());
            }
            "size" => {
                metadata.size = Some(value.clone());
            }
            _ => {
                metadata.other.push((key.clone(), value.clone()));
            }
        }
    }

    Ok(metadata)
}

fn parse_png_text_chunks(data: &[u8]) -> anyhow::Result<Vec<(String, String)>> {
    let mut chunks = Vec::new();
    let mut offset = 8; // Skip PNG signature

    while offset < data.len() {
        if offset + 8 > data.len() {
            break;
        }

        // Read chunk length (4 bytes, big-endian)
        let length = u32::from_be_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;

        offset += 4;

        if offset + 4 > data.len() {
            break;
        }

        // Read chunk type (4 bytes)
        let chunk_type = String::from_utf8_lossy(&data[offset..offset + 4]).to_string();
        offset += 4;

        if chunk_type == "IEND" {
            break;
        }

        if offset + length + 4 > data.len() {
            break;
        }

        // Read chunk data
        if chunk_type == "tEXt" && length > 0 {
            let chunk_data = &data[offset..offset + length];
            
            // tEXt format: keyword (null-terminated) + text (null-terminated)
            if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
                let keyword = String::from_utf8_lossy(&chunk_data[..null_pos]).to_string();
                if null_pos + 1 < chunk_data.len() {
                    let text = String::from_utf8_lossy(&chunk_data[null_pos + 1..]).to_string();
                    chunks.push((keyword, text));
                }
            }
        }

        offset += length;
        offset += 4; // Skip CRC
    }

    Ok(chunks)
}

pub(crate) fn parse_parameters_string(params: &str, metadata: &mut ExtractedMetadata) {
    // Parameters string format:
    // "prompt text
    // Negative prompt: negative prompt text
    // Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512, Model: ..."
    
    let lines: Vec<&str> = params.lines().collect();
    
    if lines.is_empty() {
        return;
    }

    // First line is usually the positive prompt
    if metadata.prompt.is_none() {
        metadata.prompt = Some(lines[0].trim().to_string());
    }

    // Look for negative prompt
    for line in &lines {
        if line.trim().starts_with("Negative prompt:") {
            let neg_prompt = line.trim().strip_prefix("Negative prompt:").unwrap_or("").trim();
            if !neg_prompt.is_empty() {
                metadata.negative_prompt = Some(neg_prompt.to_string());
            }
        }
    }

    // Parse parameters from the last line or throughout
    let params_line = lines.last().unwrap_or(&"");
    
    // Extract common parameters using regex-like parsing
    for part in params_line.split(',') {
        let part = part.trim();
        
        if part.starts_with("Steps:") {
            metadata.steps = part.strip_prefix("Steps:").map(|s| s.trim().to_string());
        } else if part.starts_with("Sampler:") {
            metadata.sampler = part.strip_prefix("Sampler:").map(|s| s.trim().to_string());
        } else if part.starts_with("CFG scale:") {
            metadata.cfg_scale = part.strip_prefix("CFG scale:").map(|s| s.trim().to_string());
        } else if part.starts_with("Seed:") {
            metadata.seed = part.strip_prefix("Seed:").map(|s| s.trim().to_string());
        } else if part.starts_with("Size:") {
            metadata.size = part.strip_prefix("Size:").map(|s| s.trim().to_string());
        } else if part.starts_with("Model:") {
            metadata.model = part.strip_prefix("Model:").map(|s| s.trim().to_string());
        } else if part.contains("Model hash:") {
            // Skip model hash, but could store it in other
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_parameters_string() {
        let params = "beautiful landscape, mountains, sunset
Negative prompt: blurry, low quality
Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512, Model: stable-diffusion-v1-5";

        let mut metadata = ExtractedMetadata::empty();
        parse_parameters_string(params, &mut metadata);

        assert_eq!(metadata.prompt, Some("beautiful landscape, mountains, sunset".to_string()));
        assert_eq!(metadata.negative_prompt, Some("blurry, low quality".to_string()));
        assert_eq!(metadata.steps, Some("20".to_string()));
        assert_eq!(metadata.sampler, Some("Euler a".to_string()));
        assert_eq!(metadata.cfg_scale, Some("7".to_string()));
        assert_eq!(metadata.seed, Some("12345".to_string()));
        assert_eq!(metadata.size, Some("512x512".to_string()));
        assert_eq!(metadata.model, Some("stable-diffusion-v1-5".to_string()));
    }
}

