# AI Image Metadata Extraction Guide

## Overview

This guide explains how AI-generated images store prompts and generation parameters in their metadata. Understanding these formats is crucial for building an effective extraction tool.

---

## Common AI Image Generation Tools & Their Metadata Formats

### 1. Stable Diffusion (Automatic1111, ComfyUI, InvokeAI)

**Format**: PNG with custom tEXt chunks

**Location**: Embedded directly in PNG file structure

**Key Fields**:
- `parameters`: Complete generation string (prompt + negative prompt + all settings)
- `prompt`: Positive prompt (sometimes)
- `negative_prompt`: Negative prompt (sometimes)
- `model`: Model name/checkpoint
- `seed`: Random seed value
- `steps`: Number of inference steps
- `cfg_scale`: Guidance scale (CFG)
- `sampler`: Sampling method (Euler, DPM++, etc.)
- `size`: Image dimensions (width x height)

**Example `parameters` field**:
```
beautiful landscape, mountains, sunset, 8k, highly detailed
Negative prompt: blurry, low quality
Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512, Model hash: abc123, Model: stable-diffusion-v1-5
```

**How to Extract**:
- PNG files contain "chunks" of data
- tEXt chunks store text metadata
- Parse PNG file structure to find tEXt chunks
- Extract and parse the `parameters` field

**Rust Libraries**:
- `png` crate: Can read PNG chunks
- Custom parser: Parse tEXt chunks and extract parameters

---

### 2. Midjourney

**Format**: JPEG with EXIF/XMP metadata

**Location**: Standard EXIF and XMP metadata fields

**Key Fields**:
- `Description`: May contain prompt
- `UserComment`: May contain generation info
- `XMP:Description`: XMP description field
- `XMP:Title`: Image title
- Custom XMP namespaces may contain prompts

**Note**: Midjourney metadata format can vary. Some images may have prompts in EXIF Description, others in XMP fields.

**How to Extract**:
- Use EXIF library to read EXIF data
- Use XMP parser to read XMP data
- Check Description, UserComment, and XMP fields

**Rust Libraries**:
- `exif` crate: EXIF data extraction
- `gufo-exif` or `little_exif`: Alternative EXIF libraries
- XMP parsing may require custom implementation or specialized crate

---

### 3. DALL-E (OpenAI)

**Format**: PNG or JPEG with metadata

**Location**: Varies by version

**Key Fields**:
- May store prompts in EXIF Description
- May use custom metadata fields
- Some versions may not include prompts (depends on export method)

**Note**: DALL-E images downloaded directly may not always include prompts, depending on how they were exported.

**How to Extract**:
- Check EXIF Description field
- Check XMP metadata
- May require format-specific parsing

---

### 4. Stable Diffusion XL (SDXL)

**Format**: PNG with tEXt chunks (similar to Stable Diffusion)

**Location**: Same as Stable Diffusion

**Key Differences**:
- May include additional fields for SDXL-specific parameters
- May have different parameter format

**How to Extract**:
- Same approach as Stable Diffusion
- Parse tEXt chunks
- Handle SDXL-specific fields

---

### 5. Other Tools

**ComfyUI**: Uses PNG tEXt chunks, similar format to Automatic1111

**InvokeAI**: Uses PNG tEXt chunks, similar format

**NovelAI**: May use PNG tEXt chunks or custom format

**Leonardo.ai**: May use EXIF or custom metadata

**Ideogram**: May use EXIF/XMP

---

## Metadata Standards

### PNG tEXt Chunks

PNG files are structured as a series of chunks. The tEXt chunk stores text metadata:

```
Chunk Structure:
- Length (4 bytes)
- Chunk Type: "tEXt" (4 bytes)
- Data (variable length)
- CRC (4 bytes)
```

**tEXt Chunk Format**:
- Keyword (null-terminated)
- Text data (null-terminated)

**Example**:
```
Keyword: "parameters"
Text: "beautiful landscape... Steps: 20, Seed: 12345"
```

**Parsing Steps**:
1. Read PNG file
2. Parse PNG structure (IHDR, IDAT, etc.)
3. Find tEXt chunks
4. Extract keyword-value pairs
5. Parse `parameters` field for prompts and settings

---

### EXIF (Exchangeable Image File Format)

EXIF is a standard for storing metadata in JPEG and TIFF images.

**Common Fields**:
- `ImageDescription`: Image description (may contain prompt)
- `UserComment`: User comments
- `Artist`: Creator/artist name
- `Software`: Software used to create image
- `DateTime`: Creation date/time

**How to Read**:
- EXIF data is stored in JPEG APP1 segment
- Use EXIF library to parse
- Extract relevant fields

**Rust Libraries**:
- `exif`: Popular EXIF library
- `gufo-exif`: Native Rust EXIF library
- `little_exif`: Lightweight EXIF library

---

### XMP (Extensible Metadata Platform)

XMP is Adobe's standard for embedding metadata.

**Common Fields**:
- `dc:description`: Description (may contain prompt)
- `dc:title`: Title
- `xmp:CreatorTool`: Tool used to create image
- Custom namespaces may contain prompts

**How to Read**:
- XMP data is often embedded in JPEG APP1 segment or PNG iTXt chunk
- Parse XML structure
- Extract relevant fields

**Note**: XMP parsing in Rust may require custom implementation or specialized crate.

---

### IPTC (International Press Telecommunications Council)

IPTC metadata is commonly used in photography.

**Common Fields**:
- `Caption/Abstract`: May contain description
- `Keywords`: Keywords/tags
- `Copyright Notice`: Copyright info

**How to Read**:
- IPTC data is embedded in JPEG APP13 segment
- Parse IPTC structure
- Extract relevant fields

---

## Extraction Strategy

### 1. Format Detection

First, identify the image format:
- Check file extension
- Read file header (magic bytes)
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- JPEG: `FF D8 FF`
- WebP: `RIFF ... WEBP`

### 2. Format-Specific Parsing

**PNG**:
1. Parse PNG chunks
2. Find tEXt chunks
3. Extract `parameters` field
4. Parse parameters string for prompt and settings

**JPEG**:
1. Parse JPEG segments
2. Find APP1 segment (EXIF/XMP)
3. Extract EXIF data
4. Extract XMP data (if present)
5. Check Description, UserComment fields

**WebP**:
1. Parse WebP chunks (similar to PNG)
2. Find text chunks
3. Extract metadata

### 3. Prompt Extraction

**From `parameters` field (Stable Diffusion)**:
```
Format: "prompt text
Negative prompt: negative prompt text
Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, ..."
```

**Parsing Steps**:
1. Split by newlines
2. First line = positive prompt
3. Find "Negative prompt:" line = negative prompt
4. Parse remaining parameters (Steps, Seed, etc.)

**From EXIF Description**:
- May contain prompt directly
- May contain full generation string
- Parse based on format

### 4. Normalization

**Prompt Cleaning**:
- Remove extra whitespace
- Normalize line breaks
- Handle special characters
- Remove control characters

**Parameter Extraction**:
- Parse key-value pairs
- Convert types (string to int for steps, seed, etc.)
- Validate values
- Store in structured format

---

## Common Challenges

### 1. Format Variations

**Problem**: Different tools may store metadata differently.

**Solution**:
- Support multiple formats
- Try multiple extraction methods
- Fallback to generic extraction if specific format fails

### 2. Missing Metadata

**Problem**: Some images may not have prompts embedded.

**Solution**:
- Gracefully handle missing metadata
- Still store image info (path, size, format)
- Mark as "no prompt available"

### 3. Malformed Data

**Problem**: Metadata may be corrupted or malformed.

**Solution**:
- Robust error handling
- Try to extract partial data
- Log errors for debugging

### 4. Encoding Issues

**Problem**: Metadata may use different encodings.

**Solution**:
- Handle UTF-8, UTF-16, Latin-1
- Normalize encoding
- Handle invalid sequences gracefully

---

## Testing Strategy

### Test Images

Create test images with known metadata:

1. **Stable Diffusion PNG**: Generate image with known prompt
2. **Midjourney JPEG**: Download image with known prompt
3. **Edge Cases**: 
   - Missing metadata
   - Malformed metadata
   - Very long prompts
   - Special characters in prompts

### Validation

- Extract metadata from test images
- Compare extracted prompts with known prompts
- Verify parameter extraction
- Test error handling

---

## Tools for Inspection

### Command-Line Tools

**ExifTool** (external dependency, but useful for testing):
```bash
exiftool image.png
exiftool -parameters image.png
```

**pnginfo** (for PNG):
```bash
# Can inspect PNG chunks
```

### Online Tools

- **Exif Viewer**: Online EXIF viewer
- **PNG Chunk Inspector**: Online PNG chunk viewer

### Rust Libraries for Testing

- Use libraries to read metadata
- Compare with expected values
- Validate extraction logic

---

## Implementation Notes

### PNG Parsing

```rust
// Pseudocode for PNG tEXt extraction
fn extract_png_text_chunks(data: &[u8]) -> Vec<(String, String)> {
    // Parse PNG structure
    // Find tEXt chunks
    // Extract keyword-value pairs
    // Return vector of (keyword, value) tuples
}
```

### EXIF Parsing

```rust
// Pseudocode for EXIF extraction
fn extract_exif_data(data: &[u8]) -> HashMap<String, String> {
    // Parse EXIF structure
    // Extract fields
    // Return map of field names to values
}
```

### Parameter Parsing

```rust
// Pseudocode for parameter parsing
fn parse_parameters(params: &str) -> GenerationParams {
    // Split by newlines
    // Extract prompt
    // Extract negative prompt
    // Parse key-value pairs
    // Return structured data
}
```

---

## Resources

- **PNG Specification**: https://www.w3.org/TR/PNG/
- **EXIF Specification**: https://www.exif.org/
- **XMP Specification**: https://www.adobe.com/devnet/xmp.html
- **Stable Diffusion**: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **ComfyUI**: https://github.com/comfyanonymous/ComfyUI

---

## Next Steps

1. **Research**: Test with actual images from your library
2. **Prototype**: Build basic PNG extraction first
3. **Extend**: Add JPEG/WebP support
4. **Test**: Validate with real-world images
5. **Iterate**: Refine based on findings

---

*This guide will be updated as we learn more about specific formats and tools.*

