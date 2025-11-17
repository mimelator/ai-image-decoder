# AI Image Decoder

A self-contained Rust tool for extracting and managing prompts from AI-generated images.

## Overview

This tool scans your local image directories, extracts embedded prompts and generation parameters from AI-generated images, and builds an explorable database. Perfect for managing large libraries of AI-generated images and discovering valuable prompts.

## Features

- 🔍 **Metadata Extraction**: Extract prompts from PNG, JPEG, and WebP images
- 📦 **Self-Contained**: No external dependencies - runs entirely locally
- 🗄️ **SQLite Database**: Embedded database for fast searching
- 🔎 **Full-Text Search**: Search prompts and metadata
- 🌐 **Web UI**: Browse and explore images and prompts
- 📁 **Collections**: Organize images into collections
- 🔄 **Deduplication**: Hash-based duplicate detection

## Project Status

**Planning Phase** - Project plan and architecture documentation complete.

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed implementation plan.

## Architecture

Similar to `wavelength-arch-decoder`, this tool follows a self-contained architecture:

- **Rust Backend**: Actix-web server with SQLite database
- **Static Web UI**: HTML/CSS/JavaScript frontend
- **REST API**: RESTful endpoints for accessing data
- **Metadata Extractors**: Format-specific parsers for PNG, JPEG, WebP

## Supported Formats

### PNG Images
- **Stable Diffusion** (Automatic1111, ComfyUI, InvokeAI)
- **SDXL** images
- Extracts prompts from `tEXt` chunks

### JPEG Images
- **Midjourney** images
- **DALL-E** images (when metadata is present)
- Extracts from EXIF/XMP metadata

### WebP Images
- Similar to PNG chunk parsing
- Supports both lossy and lossless formats

## Documentation

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)**: Complete project plan with architecture, phases, and implementation details
- **[METADATA_GUIDE.md](./METADATA_GUIDE.md)**: Guide to understanding AI image metadata formats and extraction

## Quick Start (Planned)

```bash
# Build the project
cargo build --release

# Run the server
cargo run --release

# Open browser
open http://localhost:8080
```

## Configuration (Planned)

Create a `.env` file:

```bash
PORT=8080
DATABASE_PATH=./data/images.db
SCAN_RECURSIVE=true
LOG_LEVEL=info
```

## Project Structure (Planned)

```
ai-image-decoder/
├── src/              # Rust source code
├── static/           # Web UI
├── data/             # SQLite database
└── config/           # Configuration files
```

## Next Steps

1. Review the [PROJECT_PLAN.md](./PROJECT_PLAN.md)
2. Review the [METADATA_GUIDE.md](./METADATA_GUIDE.md)
3. Provide feedback on architecture and features
4. Begin Phase 1 implementation

## References

- **Architecture Decoder**: `/Volumes/5bits/current/wavelength-dev/arch/wavelength-arch-decoder`
- **PNG Specification**: https://www.w3.org/TR/PNG/
- **EXIF Specification**: https://www.exif.org/

## License

TBD

---

*Project in planning phase. Implementation to begin after plan approval.*

