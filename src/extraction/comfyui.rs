use crate::extraction::ExtractedMetadata;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct ComfyUIWorkflow {
    pub readable_prompt: Option<String>,
    pub negative_prompt: Option<String>,
    pub model: Option<String>,
    pub seed: Option<String>,
    pub steps: Option<String>,
    pub cfg_scale: Option<String>,
    pub sampler: Option<String>,
    pub width: Option<String>,
    pub height: Option<String>,
    pub lora: Option<String>,
}

pub fn parse_comfyui_workflow(json_str: &str) -> anyhow::Result<ComfyUIWorkflow> {
    let json: Value = serde_json::from_str(json_str)?;
    
    let mut workflow = ComfyUIWorkflow {
        readable_prompt: None,
        negative_prompt: None,
        model: None,
        seed: None,
        steps: None,
        cfg_scale: None,
        sampler: None,
        width: None,
        height: None,
        lora: None,
    };

    // ComfyUI workflows are stored as objects with node IDs as keys
    if let Value::Object(nodes) = json {
        for (_node_id, node_value) in nodes {
            // node_value is already a Value::Object
            if let Value::Object(node) = &node_value {
                // Look for ImpactWildcardProcessor or similar nodes with populated_text
                if let Some(class_type) = node.get("class_type").and_then(|v| v.as_str()) {
                    if class_type.contains("Wildcard") || class_type.contains("Text") || class_type.contains("Prompt") {
                        // Extract populated_text (the readable prompt) - this is the actual prompt text
                        if let Some(populated_text) = node
                            .get("inputs")
                            .and_then(|i| i.get("populated_text"))
                            .and_then(|v| v.as_str())
                        {
                            if workflow.readable_prompt.is_none() && !populated_text.is_empty() {
                                workflow.readable_prompt = Some(populated_text.to_string());
                            }
                        }

                        // Also check for wildcard_text as fallback
                        if workflow.readable_prompt.is_none() {
                            if let Some(wildcard_text) = node
                                .get("inputs")
                                .and_then(|i| i.get("wildcard_text"))
                                .and_then(|v| v.as_str())
                            {
                                if !wildcard_text.is_empty() {
                                    workflow.readable_prompt = Some(wildcard_text.to_string());
                                }
                            }
                        }
                    }

                    // Extract from Efficient Loader or CheckpointLoaderSimple
                    if class_type.contains("Loader") || class_type.contains("Checkpoint") {
                        // Extract model name
                        if workflow.model.is_none() {
                            if let Some(ckpt_name) = node
                                .get("inputs")
                                .and_then(|i| i.get("ckpt_name"))
                                .and_then(|v| v.as_str())
                            {
                                workflow.model = Some(ckpt_name.to_string());
                            }
                        }

                        // Extract negative prompt
                        if workflow.negative_prompt.is_none() {
                            if let Some(negative) = node
                                .get("inputs")
                                .and_then(|i| i.get("negative"))
                                .and_then(|v| v.as_str())
                            {
                                if !negative.is_empty() {
                                    workflow.negative_prompt = Some(negative.to_string());
                                }
                            }
                        }

                        // Extract LoRA
                        if workflow.lora.is_none() {
                            if let Some(lora_name) = node
                                .get("inputs")
                                .and_then(|i| i.get("lora_name"))
                                .and_then(|v| v.as_str())
                            {
                                workflow.lora = Some(lora_name.to_string());
                            }
                        }
                    }

                    // Extract from KSampler or KSampler (Efficient)
                    if class_type.contains("Sampler") {
                        // Extract steps
                        if let Some(steps) = node
                            .get("inputs")
                            .and_then(|i| i.get("steps"))
                            .and_then(|v| v.as_u64())
                        {
                            workflow.steps = Some(steps.to_string());
                        }

                        // Extract CFG scale
                        if let Some(cfg) = node
                            .get("inputs")
                            .and_then(|i| i.get("cfg"))
                            .and_then(|v| v.as_f64())
                        {
                            workflow.cfg_scale = Some(cfg.to_string());
                        }

                        // Extract sampler name
                        if let Some(sampler_name) = node
                            .get("inputs")
                            .and_then(|i| i.get("sampler_name"))
                            .and_then(|v| v.as_str())
                        {
                            workflow.sampler = Some(sampler_name.to_string());
                        }

                        // Extract seed
                        if let Some(seed) = node
                            .get("inputs")
                            .and_then(|i| i.get("seed"))
                            .and_then(|v| v.as_u64())
                        {
                            workflow.seed = Some(seed.to_string());
                        }
                    }

                    // Extract from EmptyLatentImage
                    if class_type.contains("Latent") || class_type.contains("Empty") {
                        // Extract width
                        if let Some(width) = node
                            .get("inputs")
                            .and_then(|i| i.get("width"))
                            .and_then(|v| v.as_u64())
                        {
                            workflow.width = Some(width.to_string());
                        }

                        // Extract height
                        if let Some(height) = node
                            .get("inputs")
                            .and_then(|i| i.get("height"))
                            .and_then(|v| v.as_u64())
                        {
                            workflow.height = Some(height.to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(workflow)
}

pub fn extract_readable_prompt_from_workflow(json_str: &str) -> Option<String> {
    match parse_comfyui_workflow(json_str) {
        Ok(workflow) => workflow.readable_prompt,
        Err(_) => None,
    }
}

pub fn apply_comfyui_to_metadata(json_str: &str, metadata: &mut ExtractedMetadata) {
    match parse_comfyui_workflow(json_str) {
        Ok(workflow) => {
            // Set readable prompt - ALWAYS override with extracted readable prompt
            // The JSON workflow should not be stored as the prompt text
            if let Some(prompt) = workflow.readable_prompt {
                // Always use the readable prompt, not the JSON
                metadata.prompt = Some(prompt);
            } else {
                // If we couldn't extract readable prompt, try fallback search
                if let Ok(json) = serde_json::from_str::<Value>(json_str) {
                    if let Some(prompt) = find_populated_text_in_json(&json) {
                        metadata.prompt = Some(prompt);
                    }
                }
            }

            // Set negative prompt
            if let Some(neg_prompt) = workflow.negative_prompt {
                if metadata.negative_prompt.is_none() {
                    metadata.negative_prompt = Some(neg_prompt);
                }
            }

            // Set model
            if let Some(model) = workflow.model {
                if metadata.model.is_none() {
                    metadata.model = Some(model);
                }
            }

            // Set generation parameters
            if let Some(seed) = workflow.seed {
                if metadata.seed.is_none() {
                    metadata.seed = Some(seed);
                }
            }

            if let Some(steps) = workflow.steps {
                if metadata.steps.is_none() {
                    metadata.steps = Some(steps);
                }
            }

            if let Some(cfg_scale) = workflow.cfg_scale {
                if metadata.cfg_scale.is_none() {
                    metadata.cfg_scale = Some(cfg_scale);
                }
            }

            if let Some(sampler) = workflow.sampler {
                if metadata.sampler.is_none() {
                    metadata.sampler = Some(sampler);
                }
            }

            // Set size
            if let (Some(width), Some(height)) = (workflow.width, workflow.height) {
                if metadata.size.is_none() {
                    metadata.size = Some(format!("{}x{}", width, height));
                }
            }

            // Store LoRA in other metadata
            if let Some(lora) = workflow.lora {
                metadata.other.push(("lora".to_string(), lora));
            }
        }
        Err(_) => {
            // If parsing fails, try to extract prompt from JSON string directly
            // Look for "populated_text" in the raw JSON
            if let Ok(json) = serde_json::from_str::<Value>(json_str) {
                if let Some(prompt) = find_populated_text_in_json(&json) {
                    if metadata.prompt.is_none() {
                        metadata.prompt = Some(prompt);
                    }
                }
            }
        }
    }
}

fn find_populated_text_in_json(value: &Value) -> Option<String> {
    match value {
        Value::Object(map) => {
            // First check if this object has inputs.populated_text directly
            if let Some(inputs) = map.get("inputs") {
                if let Some(populated_text) = inputs.get("populated_text") {
                    if let Some(text) = populated_text.as_str() {
                        if !text.is_empty() {
                            return Some(text.to_string());
                        }
                    }
                }
            }
            
            // Then recurse into all values
            for (_, v) in map {
                if let Some(prompt) = find_populated_text_in_json(v) {
                    return Some(prompt);
                }
            }
            None
        }
        Value::Array(arr) => {
            for v in arr {
                if let Some(prompt) = find_populated_text_in_json(v) {
                    return Some(prompt);
                }
            }
            None
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_comfyui_workflow() {
        let json = r#"{
            "65": {
                "inputs": {
                    "populated_text": "beautiful landscape, mountains, sunset, highly detailed"
                },
                "class_type": "ImpactWildcardProcessor"
            },
            "35": {
                "inputs": {
                    "ckpt_name": "sdxl/sd_xl_base_1.0.safetensors",
                    "negative": "blurry, low quality"
                },
                "class_type": "Efficient Loader"
            },
            "21": {
                "inputs": {
                    "steps": 20,
                    "cfg": 7.0,
                    "sampler_name": "dpm_2",
                    "seed": 12345
                },
                "class_type": "KSampler (Efficient)"
            }
        }"#;

        let workflow = parse_comfyui_workflow(json).unwrap();
        assert_eq!(workflow.readable_prompt, Some("beautiful landscape, mountains, sunset, highly detailed".to_string()));
        assert_eq!(workflow.negative_prompt, Some("blurry, low quality".to_string()));
        assert_eq!(workflow.model, Some("sdxl/sd_xl_base_1.0.safetensors".to_string()));
        assert_eq!(workflow.steps, Some("20".to_string()));
        // CFG scale might be "7" or "7.0" depending on formatting
        assert!(workflow.cfg_scale.is_some());
        assert_eq!(workflow.sampler, Some("dpm_2".to_string()));
        assert_eq!(workflow.seed, Some("12345".to_string()));
    }
}

