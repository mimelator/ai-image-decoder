# CLIP Service Integration

## Overview

This document describes the CLIP (Contrastive Language-Image Pre-training) service integration that allows you to generate prompts from images using a local Stable Diffusion API.

## What is CLIP Interrogation?

CLIP interrogation is a technique that uses the CLIP model to analyze an image and generate a text prompt that describes it. This is useful for:
- Reverse-engineering prompts from images that don't have metadata
- Understanding what an AI-generated image contains
- Generating prompts for similar images

## Setup

### Prerequisites

1. **Stable Diffusion API running locally**
   - Automatic1111 WebUI (recommended)
   - ComfyUI with API enabled
   - Or any compatible Stable Diffusion API server

2. **Environment Variables** (optional, defaults shown):
   ```bash
   STABLE_DIFFUSION_BASE_URL=http://127.0.0.1:7860  # Your server URL
   # Also accepts STABLE_DIFFUSION_API_URL for backward compatibility
   CLIP_TIMEOUT_SECS=30                             # Default
   CLIP_ENABLED=true                                 # Default
   ```

### Configuration

The CLIP service automatically detects common API endpoints:
- `/sdapi/v1/interrogate` (Automatic1111)
- `/api/v1/interrogate` (ComfyUI)
- `/interrogate` (Generic)

## API Endpoints

### 1. Interrogate an Image

**POST** `/api/v1/images/{image_id}/interrogate`

Generate a prompt from an image using CLIP.

**Request Body** (optional):
```json
{
  "model": "clip"  // Optional, defaults to "clip"
}
```

**Response**:
```json
{
  "image_id": "uuid-here",
  "prompt": "a beautiful landscape with mountains and sunset, highly detailed, 8k",
  "source": "clip_interrogation",
  "model": "clip"
}
```

**Example**:
```bash
curl -X POST http://localhost:9000/api/v1/images/{image_id}/interrogate \
  -H "Content-Type: application/json" \
  -d '{"model": "clip"}'
```

### 2. Check CLIP Service Health

**GET** `/api/v1/clip/health`

Check if the CLIP service is available and reachable.

**Response**:
```json
{
  "status": "ok",
  "service": "clip",
  "available": true
}
```

**Example**:
```bash
curl http://localhost:9000/api/v1/clip/health
```

## How It Works

1. **Image Retrieval**: The service looks up the image in the database by ID
2. **Base64 Encoding**: The image file is read and encoded as base64
3. **API Request**: The encoded image is sent to the Stable Diffusion API's interrogate endpoint
4. **Prompt Generation**: CLIP analyzes the image and returns a descriptive prompt
5. **Storage**: The generated prompt is optionally saved to the database (as `clip_generated` type)

## Integration with Existing Features

- **Automatic Storage**: Generated prompts are automatically saved to the database
- **Prompt Type**: CLIP-generated prompts are marked with type `"clip_generated"`
- **Search**: Generated prompts are searchable like any other prompt
- **Image Association**: Prompts are linked to their source images

## Troubleshooting

### Service Unavailable

If `/api/v1/clip/health` returns `available: false`:

1. **Check Stable Diffusion API is running**:
   ```bash
   curl http://localhost:7860/sdapi/v1/options
   ```

2. **Verify URL**: Check `STABLE_DIFFUSION_BASE_URL` (or `STABLE_DIFFUSION_API_URL`) environment variable

3. **Check API endpoint**: Different Stable Diffusion implementations use different endpoints

### Timeout Errors

If requests timeout:

1. Increase timeout: Set `CLIP_TIMEOUT_SECS=60` (or higher)
2. Check network connectivity
3. Verify the Stable Diffusion API is responding

### Model Not Found

If you get model errors:

1. Check available models in your Stable Diffusion API
2. Specify a different model in the request: `{"model": "clip_vit_l_14"}`
3. Common model names:
   - `clip` (default)
   - `clip_vit_l_14`
   - `deepdanbooru` (for tag-based interrogation)

## Example Workflow

1. **Scan images** (if not already scanned):
   ```bash
   curl -X POST http://localhost:9000/api/v1/images/scan \
     -H "Content-Type: application/json" \
     -d '{"path": "/path/to/images", "recursive": true}'
   ```

2. **Get image ID** from the list:
   ```bash
   curl http://localhost:9000/api/v1/images?limit=1
   ```

3. **Interrogate the image**:
   ```bash
   curl -X POST http://localhost:9000/api/v1/images/{image_id}/interrogate
   ```

4. **View generated prompt**:
   ```bash
   curl http://localhost:9000/api/v1/prompts/image/{image_id}
   ```

## Future Enhancements

Potential improvements:
- Batch interrogation endpoint
- Different CLIP models (CLIP-ViT-L/14, CLIP-ViT-B/32, etc.)
- Confidence scores for generated prompts
- Comparison between CLIP-generated and embedded prompts
- Caching of CLIP results

