use crate::extraction::ExtractedMetadata;
use std::fs::File;
use std::path::Path;
use std::io::Read;
use log::debug;
use exif::Reader;

pub fn extract_jpeg_metadata<P: AsRef<Path>>(path: P) -> anyhow::Result<ExtractedMetadata> {
    let path = path.as_ref();
    let mut file = File::open(path)?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)?;
    
    let mut metadata = ExtractedMetadata::empty();

    // Try to parse EXIF data using kamadak-exif
    let mut cursor = std::io::Cursor::new(&buf);
    match Reader::new().read_from_container(&mut cursor) {
        Ok(exif) => {
            debug!("Found EXIF data in JPEG: {}", path.display());
            
            // Extract common EXIF fields that might contain prompts
            for field in exif.fields() {
                let tag_str = format!("{:?}", field.tag);
                let value_str = field.value.display_as(field.tag).to_string();
                
                // Clean up value (remove quotes if present)
                let value = value_str.strip_prefix('"')
                    .and_then(|s| s.strip_suffix('"'))
                    .unwrap_or(&value_str)
                    .to_string();
                
                if value.is_empty() {
                    continue;
                }
                
                // Match on tag string since Tag enum might not have all variants
                match tag_str.as_str() {
                    "ImageDescription" => {
                        if metadata.prompt.is_none() {
                            metadata.prompt = Some(value.clone());
                        }
                        metadata.other.push(("ImageDescription".to_string(), value));
                    }
                    "UserComment" => {
                        // UserComment often contains prompts or generation info
                        parse_potential_parameters(&value, &mut metadata);
                        metadata.other.push(("UserComment".to_string(), value));
                    }
                    "Artist" => {
                        metadata.other.push(("Artist".to_string(), value));
                    }
                    "Software" => {
                        // Software field might contain model name
                        if metadata.model.is_none() {
                            metadata.model = Some(value.clone());
                        }
                        metadata.other.push(("Software".to_string(), value));
                    }
                    "DateTime" | "DateTimeOriginal" | "DateTimeDigitized" => {
                        metadata.other.push((tag_str.clone(), value));
                    }
                    _ => {
                        // Store other fields
                        metadata.other.push((tag_str, value));
                    }
                }
            }
        }
        Err(e) => {
            debug!("No EXIF data found in JPEG {}: {}", path.display(), e);
        }
    }

    // Try to extract XMP data if present
    // XMP is often embedded in JPEG APP1 segment
    extract_xmp_from_jpeg(&buf, &mut metadata)?;

    Ok(metadata)
}

/// Extract XMP data from JPEG file
fn extract_xmp_from_jpeg(data: &[u8], metadata: &mut ExtractedMetadata) -> anyhow::Result<()> {
    // XMP data in JPEG is typically in APP1 segment with identifier "http://ns.adobe.com/xap/1.0/\0"
    let xmp_header = b"http://ns.adobe.com/xap/1.0/\0";
    
    // Search for XMP header
    for (i, window) in data.windows(xmp_header.len()).enumerate() {
        if window == xmp_header {
            // Found XMP header, try to extract XML data
            let xmp_start = i + xmp_header.len();
            if xmp_start < data.len() {
                // XMP data follows the header
                // Try to find XML content
                if let Ok(xml_str) = String::from_utf8(data[xmp_start..].to_vec()) {
                    parse_xmp_xml(&xml_str, metadata)?;
                }
            }
            break;
        }
    }
    
    Ok(())
}

/// Parse XMP XML to extract prompts and metadata
fn parse_xmp_xml(xml: &str, metadata: &mut ExtractedMetadata) -> anyhow::Result<()> {
    // Simple XMP parsing - look for common fields
    // Full XMP parsing would require an XML parser, but we can do basic regex matching
    
    // Look for dc:description (Dublin Core description)
    if let Some(desc_start) = xml.find("<dc:description>") {
        let desc_end = xml[desc_start..].find("</dc:description>");
        if let Some(end) = desc_end {
            let desc = &xml[desc_start + 16..desc_start + end];
            let desc = desc.trim();
            if !desc.is_empty() && metadata.prompt.is_none() {
                metadata.prompt = Some(desc.to_string());
            }
        }
    }
    
    // Look for xmp:Description
    if let Some(desc_start) = xml.find("<xmp:Description>") {
        let desc_end = xml[desc_start..].find("</xmp:Description>");
        if let Some(end) = desc_end {
            let desc = &xml[desc_start + 17..desc_start + end];
            let desc = desc.trim();
            if !desc.is_empty() && metadata.prompt.is_none() {
                metadata.prompt = Some(desc.to_string());
            }
        }
    }
    
    // Look for rdf:Description with description attribute
    if let Some(desc_start) = xml.find("rdf:Description") {
        if let Some(desc_attr) = xml[desc_start..].find("dc:description=\"") {
            let attr_start = desc_start + desc_attr + 15;
            if let Some(attr_end) = xml[attr_start..].find('"') {
                let desc = &xml[attr_start..attr_start + attr_end];
                if !desc.is_empty() && metadata.prompt.is_none() {
                    metadata.prompt = Some(desc.to_string());
                }
            }
        }
    }
    
    Ok(())
}

#[allow(dead_code)]
fn parse_potential_parameters(text: &str, metadata: &mut ExtractedMetadata) {
    // Check if the text looks like a Stable Diffusion parameters string
    if text.contains("Steps:") || text.contains("CFG scale:") || text.contains("Seed:") {
        // Try to parse as parameters string
        crate::extraction::png::parse_parameters_string(text, metadata);
    } else {
        // Might be a simple prompt, check for negative prompt marker
        if text.contains("Negative prompt:") {
            let lines: Vec<&str> = text.lines().collect();
            if !lines.is_empty() {
                metadata.prompt = Some(lines[0].trim().to_string());
            }
            for line in &lines {
                if line.trim().starts_with("Negative prompt:") {
                    let neg_prompt = line.trim().strip_prefix("Negative prompt:").unwrap_or("").trim();
                    if !neg_prompt.is_empty() {
                        metadata.negative_prompt = Some(neg_prompt.to_string());
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_potential_parameters() {
        let text = "beautiful landscape
Negative prompt: blurry
Steps: 20, Seed: 12345";
        
        let mut metadata = ExtractedMetadata::empty();
        parse_potential_parameters(text, &mut metadata);
        
        assert_eq!(metadata.prompt, Some("beautiful landscape".to_string()));
        assert_eq!(metadata.negative_prompt, Some("blurry".to_string()));
    }
}

