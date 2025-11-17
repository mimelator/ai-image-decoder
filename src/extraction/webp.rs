use crate::extraction::ExtractedMetadata;
use std::path::Path;

pub fn extract_webp_metadata<P: AsRef<Path>>(path: P) -> anyhow::Result<ExtractedMetadata> {
    let path = path.as_ref();
    
    // Read the WebP file and parse chunks manually
    // WebP format is similar to PNG with chunks
    let file_data = std::fs::read(path)?;
    let text_chunks = parse_webp_chunks(&file_data)?;

    let mut metadata = ExtractedMetadata::empty();

    // Parse parameters field (similar to PNG)
    for (key, value) in &text_chunks {
        match key.as_str() {
            "parameters" => {
                metadata.parameters = Some(value.clone());
                // Try to parse the parameters string
                crate::extraction::png::parse_parameters_string(value, &mut metadata);
            }
            "prompt" => {
                metadata.prompt = Some(value.clone());
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

fn parse_webp_chunks(data: &[u8]) -> anyhow::Result<Vec<(String, String)>> {
    let mut chunks = Vec::new();

    // WebP file format:
    // - RIFF header (12 bytes): "RIFF" + size + "WEBP"
    // - Chunks: "VP8 ", "VP8L", "VP8X", "EXIF", "XMP ", "ANIM", etc.
    
    if data.len() < 12 {
        return Ok(chunks);
    }

    // Check RIFF header
    if &data[0..4] != b"RIFF" {
        return Ok(chunks);
    }

    if data.len() < 12 || &data[8..12] != b"WEBP" {
        return Ok(chunks);
    }

    let mut offset = 12;

    while offset < data.len() {
        if offset + 8 > data.len() {
            break;
        }

        // Read chunk type (4 bytes)
        let chunk_type = String::from_utf8_lossy(&data[offset..offset + 4]).to_string();
        offset += 4;

        // Read chunk size (4 bytes, little-endian)
        if offset + 4 > data.len() {
            break;
        }

        let length = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;

        offset += 4;

        if offset + length > data.len() {
            break;
        }

        // Handle different chunk types
        match chunk_type.as_str() {
            "EXIF" => {
                // EXIF data - try to parse
                // For now, we'll store it as raw data
                // TODO: Parse EXIF properly
                let exif_data = &data[offset..offset + length];
                if let Ok(text) = String::from_utf8(exif_data.to_vec()) {
                    chunks.push(("EXIF".to_string(), text));
                }
            }
            "XMP " => {
                // XMP data - XML format
                let xmp_data = &data[offset..offset + length];
                if let Ok(text) = String::from_utf8(xmp_data.to_vec()) {
                    // Try to extract prompts from XMP
                    parse_xmp_for_prompts(&text, &mut chunks);
                    chunks.push(("XMP".to_string(), text));
                }
            }
            _ => {
                // Other chunks - skip for now
            }
        }

        offset += length;
        // Chunk size must be even
        if length % 2 != 0 {
            offset += 1;
        }
    }

    Ok(chunks)
}

fn parse_xmp_for_prompts(xmp_data: &str, chunks: &mut Vec<(String, String)>) {
    // Simple XMP parsing - look for description fields
    // XMP is XML, so we'll do basic string matching
    
    // Look for dc:description
    if let Some(start) = xmp_data.find("<dc:description>") {
        if let Some(end) = xmp_data[start..].find("</dc:description>") {
            let desc = &xmp_data[start + 16..start + end];
            if !desc.is_empty() {
                chunks.push(("description".to_string(), desc.to_string()));
            }
        }
    }

    // Look for rdf:Description with description attribute
    if let Some(start) = xmp_data.find("rdf:Description") {
        // Try to find description attribute
        if let Some(desc_start) = xmp_data[start..].find("dc:description=\"") {
            let attr_start = start + desc_start + 16;
            if let Some(desc_end) = xmp_data[attr_start..].find("\"") {
                let desc = &xmp_data[attr_start..attr_start + desc_end];
                if !desc.is_empty() {
                    chunks.push(("description".to_string(), desc.to_string()));
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_xmp_for_prompts() {
        let xmp = r#"<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:description>beautiful landscape, mountains</dc:description>
        </rdf:Description>"#;
        
        let mut chunks = Vec::new();
        parse_xmp_for_prompts(xmp, &mut chunks);
        
        assert!(!chunks.is_empty());
    }
}

