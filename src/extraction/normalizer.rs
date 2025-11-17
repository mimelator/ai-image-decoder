use regex::Regex;

pub struct PromptNormalizer;

impl PromptNormalizer {
    /// Normalize a prompt by cleaning whitespace, removing control characters, etc.
    pub fn normalize(prompt: &str) -> String {
        let mut normalized = prompt.to_string();

        // Remove control characters (except newlines and tabs)
        normalized = normalized
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
            .collect();

        // Normalize whitespace
        // Replace multiple spaces with single space
        let re = Regex::new(r"[ \t]+").unwrap();
        normalized = re.replace_all(&normalized, " ").to_string();

        // Normalize line breaks
        normalized = normalized.replace("\r\n", "\n");
        normalized = normalized.replace('\r', "\n");

        // Remove leading/trailing whitespace from each line
        let lines: Vec<String> = normalized
            .lines()
            .map(|line| line.trim().to_string())
            .collect();
        normalized = lines.join("\n");

        // Remove multiple consecutive newlines
        let re = Regex::new(r"\n{3,}").unwrap();
        normalized = re.replace_all(&normalized, "\n\n").to_string();

        // Trim overall string
        normalized.trim().to_string()
    }

    /// Clean prompt by removing common artifacts
    pub fn clean(prompt: &str) -> String {
        let mut cleaned = Self::normalize(prompt);

        // Remove common prompt artifacts
        // Remove excessive commas
        let re = Regex::new(r",\s*,").unwrap();
        cleaned = re.replace_all(&cleaned, ",").to_string();

        // Remove trailing commas
        cleaned = cleaned.trim_end_matches(',').trim().to_string();

        cleaned
    }

    /// Extract prompt segments (comma-separated phrases)
    pub fn extract_segments(prompt: &str) -> Vec<String> {
        prompt
            .split(',')
            .map(|s| Self::normalize(s))
            .filter(|s| !s.is_empty())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_whitespace() {
        let input = "beautiful   landscape,   mountains";
        let output = PromptNormalizer::normalize(input);
        assert_eq!(output, "beautiful landscape, mountains");
    }

    #[test]
    fn test_normalize_line_breaks() {
        let input = "beautiful landscape\r\nmountains\r\nsunset";
        let output = PromptNormalizer::normalize(input);
        assert_eq!(output, "beautiful landscape\nmountains\nsunset");
    }

    #[test]
    fn test_clean_trailing_commas() {
        let input = "beautiful landscape, mountains,";
        let output = PromptNormalizer::clean(input);
        assert_eq!(output, "beautiful landscape, mountains");
    }

    #[test]
    fn test_extract_segments() {
        let input = "beautiful landscape, mountains, sunset";
        let segments = PromptNormalizer::extract_segments(input);
        assert_eq!(segments.len(), 3);
        assert_eq!(segments[0], "beautiful landscape");
        assert_eq!(segments[1], "mountains");
        assert_eq!(segments[2], "sunset");
    }
}

