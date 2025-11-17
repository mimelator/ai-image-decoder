use crate::extraction::normalizer::PromptNormalizer;
use regex::Regex;
use std::collections::HashSet;

pub struct TagExtractor {
    style_patterns: Vec<Regex>,
    quality_patterns: Vec<Regex>,
    technique_patterns: Vec<Regex>,
}

impl TagExtractor {
    pub fn new() -> Self {
        TagExtractor {
            style_patterns: Self::build_style_patterns(),
            quality_patterns: Self::build_quality_patterns(),
            technique_patterns: Self::build_technique_patterns(),
        }
    }

    pub fn extract_from_prompt(
        &self,
        prompt: &str,
        negative_prompt: Option<&str>,
    ) -> anyhow::Result<Vec<(String, String, f64)>> {
        // Returns: (tag_name, tag_type, confidence)
        let mut tags = Vec::new();
        let mut seen_tags = HashSet::new();

        // Extract from positive prompt
        let segments = PromptNormalizer::extract_segments(prompt);
        for segment in segments {
            let normalized = segment.to_lowercase();
            
            // Check style patterns
            for pattern in &self.style_patterns {
                if pattern.is_match(&normalized) {
                    let tag_name = normalized.clone();
                    if !seen_tags.contains(&tag_name) {
                        tags.push((tag_name.clone(), "style".to_string(), 0.8));
                        seen_tags.insert(tag_name);
                    }
                }
            }

            // Check quality patterns
            for pattern in &self.quality_patterns {
                if pattern.is_match(&normalized) {
                    let tag_name = normalized.clone();
                    if !seen_tags.contains(&tag_name) {
                        tags.push((tag_name.clone(), "quality".to_string(), 0.9));
                        seen_tags.insert(tag_name);
                    }
                }
            }

            // Check technique patterns
            for pattern in &self.technique_patterns {
                if pattern.is_match(&normalized) {
                    let tag_name = normalized.clone();
                    if !seen_tags.contains(&tag_name) {
                        tags.push((tag_name.clone(), "technique".to_string(), 0.85));
                        seen_tags.insert(tag_name);
                    }
                }
            }

            // Extract subject tags (common nouns/phrases)
            if self.looks_like_subject(&normalized) {
                let tag_name = normalized.clone();
                if !seen_tags.contains(&tag_name) && tag_name.len() > 2 {
                    tags.push((tag_name.clone(), "subject".to_string(), 0.7));
                    seen_tags.insert(tag_name);
                }
            }
        }

        // Extract from negative prompt (as negative tags)
        if let Some(neg_prompt) = negative_prompt {
            let neg_segments = PromptNormalizer::extract_segments(neg_prompt);
            for segment in neg_segments {
                let normalized = segment.to_lowercase();
                if normalized.len() > 2 && !seen_tags.contains(&normalized) {
                    tags.push((normalized.clone(), "negative".to_string(), 0.8));
                    seen_tags.insert(normalized);
                }
            }
        }

        Ok(tags)
    }

    fn looks_like_subject(&self, text: &str) -> bool {
        // Simple heuristic: if it's a common word/phrase and not a technical term
        let common_subjects = [
            "portrait", "landscape", "animal", "nature", "city", "building",
            "architecture", "person", "face", "woman", "man", "child",
            "flower", "tree", "mountain", "ocean", "sky", "sunset", "sunrise",
            "forest", "desert", "beach", "river", "lake", "bird", "cat", "dog",
            "car", "house", "street", "bridge", "castle", "tower",
        ];

        common_subjects.iter().any(|&subject| text.contains(subject))
    }

    fn build_style_patterns() -> Vec<Regex> {
        vec![
            Regex::new(r"photorealistic|photo.*real").unwrap(),
            Regex::new(r"anime|manga").unwrap(),
            Regex::new(r"oil.*paint|oil painting").unwrap(),
            Regex::new(r"watercolor|water.*color").unwrap(),
            Regex::new(r"digital.*art|digital art").unwrap(),
            Regex::new(r"sketch|drawing").unwrap(),
            Regex::new(r"3d.*render|3d render").unwrap(),
            Regex::new(r"pixel.*art|pixel art").unwrap(),
            Regex::new(r"abstract").unwrap(),
            Regex::new(r"impressionist|impressionism").unwrap(),
            Regex::new(r"surreal|surrealism").unwrap(),
            Regex::new(r"minimalist|minimalism").unwrap(),
        ]
    }

    fn build_quality_patterns() -> Vec<Regex> {
        vec![
            Regex::new(r"masterpiece|best.*quality").unwrap(),
            Regex::new(r"ultra.*detail|ultra detailed").unwrap(),
            Regex::new(r"high.*detail|highly detailed").unwrap(),
            Regex::new(r"8k|4k|2k").unwrap(),
            Regex::new(r"professional|pro").unwrap(),
            Regex::new(r"sharp.*focus|sharp focus").unwrap(),
            Regex::new(r"high.*resolution|high res").unwrap(),
        ]
    }

    fn build_technique_patterns() -> Vec<Regex> {
        vec![
            Regex::new(r"cinematic.*light|cinematic lighting").unwrap(),
            Regex::new(r"depth.*of.*field|dof|bokeh").unwrap(),
            Regex::new(r"soft.*light|soft lighting").unwrap(),
            Regex::new(r"dramatic.*light|dramatic lighting").unwrap(),
            Regex::new(r"golden.*hour|golden hour").unwrap(),
            Regex::new(r"blue.*hour|blue hour").unwrap(),
            Regex::new(r"hdr|high.*dynamic.*range").unwrap(),
            Regex::new(r"wide.*angle|wide angle").unwrap(),
            Regex::new(r"macro|close.*up").unwrap(),
            Regex::new(r"long.*exposure|long exposure").unwrap(),
        ]
    }
}

impl Default for TagExtractor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_style_tags() {
        let extractor = TagExtractor::new();
        let tags = extractor.extract_from_prompt(
            "beautiful landscape, photorealistic, mountains, 8k, highly detailed",
            None,
        ).unwrap();

        assert!(tags.iter().any(|(name, tag_type, _)| name.contains("photorealistic") && tag_type == "style"));
        assert!(tags.iter().any(|(name, tag_type, _)| name.contains("8k") && tag_type == "quality"));
        assert!(tags.iter().any(|(name, tag_type, _)| name.contains("landscape") && tag_type == "subject"));
    }

    #[test]
    fn test_extract_negative_tags() {
        let extractor = TagExtractor::new();
        let tags = extractor.extract_from_prompt(
            "beautiful landscape",
            Some("blurry, low quality, deformed"),
        ).unwrap();

        assert!(tags.iter().any(|(name, tag_type, _)| name.contains("blurry") && tag_type == "negative"));
    }
}

