# AI Image Decoder - Project Plan

## Overview

A self-contained Rust application for extracting and managing prompts from AI-generated images. Similar architecture to `wavelength-arch-decoder`, this tool scans local image directories, extracts embedded metadata (especially prompts), and builds an explorable database.

## Project Goals

1. **Self-Contained**: No external dependencies - runs entirely locally
2. **Metadata Extraction**: Extract prompts and generation parameters from AI-generated images
3. **Database Management**: Build and maintain a searchable database of images and prompts
4. **Explorable Interface**: Web UI for browsing, searching, and exploring the prompt database
5. **Similar Architecture**: Follow patterns from `wavelength-arch-decoder` project

---

## Understanding AI Image Metadata

### Common Formats & Standards

**1. PNG Images (Stable Diffusion, ComfyUI, Automatic1111)**
- **tEXt chunks**: Custom text chunks embedded in PNG files
- **Common fields**:
  - `parameters`: Full generation parameters (prompt + negative prompt + settings)
  - `prompt`: Positive prompt
  - `negative_prompt`: Negative prompt
  - `model`: Model name/version
  - `seed`: Random seed
  - `steps`: Number of inference steps
  - `cfg_scale`: Guidance scale
  - `sampler`: Sampling method
  - `size`: Image dimensions

**2. JPEG Images (Midjourney, DALL-E)**
- **EXIF data**: Standard EXIF metadata
- **XMP data**: Adobe's Extensible Metadata Platform
- **IPTC data**: International Press Telecommunications Council metadata
- **Custom fields**: May include prompts in Description, Comment, or custom tags

**3. WebP Images**
- Similar to PNG/JPEG, supports both lossy and lossless
- Can contain EXIF, XMP, and custom chunks

### Metadata Extraction Approach

1. **Format Detection**: Identify image format (PNG, JPEG, WebP, etc.)
2. **Format-Specific Parsing**:
   - PNG: Parse tEXt chunks directly
   - JPEG: Extract EXIF/XMP/IPTC data
   - WebP: Parse chunks similar to PNG
3. **Prompt Extraction**: Parse and normalize prompts from various fields
4. **Parameter Extraction**: Extract generation parameters (model, seed, steps, etc.)

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                    Web UI (Static)                       │
│         Dashboard | Image Browser | Prompt Search        │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                    REST & GraphQL APIs                    │
│     /images | /prompts | /search | /collections          │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Ingestion    │ │  Metadata   │ │   Search   │
│  Service      │ │  Extractor   │ │   Engine   │
└───────┬───────┘ └─────┬───────┘ └─────┬──────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │      SQLite Database          │
        │  (Images | Prompts | Metadata) │
        └───────────────────────────────┘
```

### Core Components

**1. Ingestion Service**
- Scan directories recursively for image files
- Track file changes (new, modified, deleted)
- Queue images for processing
- Easy-to-understand ingestion UI with clear instructions

**2. Metadata Extractor**
- Format detection (PNG, JPEG, WebP, etc.)
- Format-specific parsers:
  - PNG: Parse tEXt chunks
  - JPEG: Extract EXIF/XMP/IPTC
  - WebP: Parse chunks
- Prompt normalization and cleaning
- Parameter extraction and validation
- **Intelligent Tag Extraction**: Extract tags from prompts and metadata

**3. Database Layer**
- SQLite database (embedded, no external deps)
- Schema for images, prompts, metadata
- Indexes for fast searching
- Full-text search support

**4. API Layer**
- REST API endpoints
- GraphQL API (optional, like arch-decoder)
- Search and filtering endpoints
- Image preview/thumbnail support

**5. Web UI**
- Static HTML/CSS/JavaScript (like arch-decoder)
- Dashboard with statistics
- Image browser with thumbnails
- Prompt search and filtering
- Detail views for images and prompts

---

## Technology Stack

### Core Dependencies

**Web Framework**
- `actix-web`: Web server and REST API
- `actix-files`: Static file serving
- `actix-cors`: CORS support

**Async Runtime**
- `tokio`: Async runtime

**Image Processing**
- `image`: Image format detection and basic operations
- `png`: PNG chunk parsing (for tEXt chunks)
- `jpeg-decoder`: JPEG decoding (if needed)
- `exif`: EXIF data extraction (or `gufo-exif` / `little_exif`)
- `xmp`: XMP metadata parsing (if available)

**Database**
- `rusqlite`: SQLite bindings with bundled SQLite
- `r2d2`: Connection pooling (optional)

**Serialization**
- `serde`: Serialization framework
- `serde_json`: JSON handling

**Utilities**
- `walkdir`: Directory traversal
- `regex`: Pattern matching for prompt parsing
- `chrono`: Date/time handling
- `uuid`: UUID generation
- `anyhow`: Error handling
- `thiserror`: Error types

**Logging**
- `log`: Logging facade
- `env_logger`: Logging implementation

---

## Database Schema

### Tables

**1. `images`**
```sql
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    format TEXT NOT NULL,  -- 'png', 'jpeg', 'webp', etc.
    width INTEGER,
    height INTEGER,
    hash TEXT,  -- SHA256 hash for deduplication
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_scanned_at TEXT NOT NULL
);
```

**2. `prompts`**
```sql
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    negative_prompt TEXT,
    prompt_type TEXT NOT NULL,  -- 'positive', 'negative', 'full'
    created_at TEXT NOT NULL,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);
```

**3. `metadata`**
```sql
CREATE TABLE metadata (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    key TEXT NOT NULL,  -- 'model', 'seed', 'steps', 'cfg_scale', etc.
    value TEXT NOT NULL,
    metadata_type TEXT NOT NULL,  -- 'generation', 'exif', 'xmp', 'custom'
    created_at TEXT NOT NULL,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    UNIQUE(image_id, key, metadata_type)
);
```

**4. `collections`** (for organizing images)
```sql
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_path TEXT,  -- Optional: folder path for folder-based collections
    is_folder_based INTEGER NOT NULL DEFAULT 0,  -- 1 if based on folder location
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

**5. `collection_images`** (many-to-many)
```sql
CREATE TABLE collection_images (
    collection_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY (collection_id, image_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);
```

**6. `tags`** (intelligently extracted tags)
```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tag_type TEXT NOT NULL,  -- 'style', 'subject', 'technique', 'model', 'quality', etc.
    created_at TEXT NOT NULL
);
```

**7. `image_tags`** (many-to-many relationship)
```sql
CREATE TABLE image_tags (
    image_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,  -- Confidence score for extracted tags
    source TEXT NOT NULL,  -- 'prompt', 'metadata', 'manual'
    created_at TEXT NOT NULL,
    PRIMARY KEY (image_id, tag_id),
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

**8. `scan_directories`** (track scanned directories)
```sql
CREATE TABLE scan_directories (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    recursive INTEGER NOT NULL DEFAULT 1,
    last_scanned_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_images_path ON images(file_path);
CREATE INDEX idx_images_format ON images(format);
CREATE INDEX idx_images_hash ON images(hash);
CREATE INDEX idx_prompts_image ON prompts(image_id);
CREATE INDEX idx_prompts_text ON prompts(prompt_text);  -- For full-text search
CREATE INDEX idx_metadata_image ON metadata(image_id);
CREATE INDEX idx_metadata_key ON metadata(key);
CREATE INDEX idx_collection_images_collection ON collection_images(collection_id);
CREATE INDEX idx_collection_images_image ON collection_images(image_id);
CREATE INDEX idx_collections_folder_path ON collections(folder_path);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_type ON tags(tag_type);
CREATE INDEX idx_image_tags_image ON image_tags(image_id);
CREATE INDEX idx_image_tags_tag ON image_tags(tag_id);
```

### Full-Text Search

SQLite FTS5 virtual table for prompt search:
```sql
CREATE VIRTUAL TABLE prompts_fts USING fts5(
    prompt_text,
    negative_prompt,
    content='prompts',
    content_rowid='rowid'
);
```

---

## Project Structure

```
ai-image-decoder/
├── Cargo.toml
├── README.md
├── PROJECT_PLAN.md
├── src/
│   ├── main.rs                 # Entry point
│   ├── lib.rs                  # Library root
│   ├── config/                 # Configuration
│   │   └── mod.rs
│   ├── ingestion/              # Directory scanning
│   │   ├── mod.rs
│   │   └── scanner.rs          # Directory scanner
│   ├── extraction/             # Metadata extraction
│   │   ├── mod.rs
│   │   ├── png.rs              # PNG tEXt chunk parser
│   │   ├── jpeg.rs             # JPEG EXIF/XMP parser
│   │   ├── webp.rs             # WebP chunk parser
│   │   ├── parser.rs           # Unified parser interface
│   │   └── tag_extractor.rs    # Intelligent tag extraction
│   ├── storage/                # Database layer
│   │   ├── mod.rs
│   │   ├── image_repo.rs       # Image repository
│   │   ├── prompt_repo.rs      # Prompt repository
│   │   ├── metadata_repo.rs    # Metadata repository
│   │   ├── collection_repo.rs  # Collection repository
│   │   └── tag_repo.rs         # Tag repository
│   ├── api/                    # REST API
│   │   ├── mod.rs
│   │   ├── server.rs           # Server setup
│   │   ├── images.rs           # Image endpoints
│   │   ├── prompts.rs          # Prompt endpoints
│   │   ├── search.rs           # Search endpoints
│   │   ├── collections.rs      # Collection endpoints
│   │   └── export.rs           # Export endpoints (Markdown, JSON)
│   ├── graphql/                # GraphQL API (optional)
│   │   ├── mod.rs
│   │   ├── schema.rs
│   │   └── types.rs
│   └── utils/                  # Utilities
│       ├── mod.rs
│       ├── hash.rs             # File hashing
│       └── thumbnail.rs        # Thumbnail generation
├── static/                     # Web UI
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── search.js
├── data/                       # SQLite database (created at runtime)
└── config/                     # Configuration files
    └── .env.example
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals**: Basic project structure, database, and simple extraction

**Tasks**:
1. ✅ Set up Rust project structure
2. ✅ Create Cargo.toml with dependencies
3. ✅ Implement database schema and migrations
4. ✅ Create basic storage repositories
5. ✅ Implement PNG tEXt chunk extraction (most common)
6. ✅ Basic CLI to test extraction
7. ✅ Simple directory scanner

**Deliverables**:
- Working Rust project
- SQLite database with schema
- PNG metadata extraction working
- CLI tool to scan directory and extract prompts

### Phase 2: Core Extraction (Week 3-4)

**Goals**: Complete metadata extraction for all formats

**Tasks**:
1. Implement JPEG EXIF/XMP extraction
2. Implement WebP chunk parsing
3. Prompt normalization and cleaning
4. Parameter extraction (model, seed, steps, etc.)
5. Error handling and validation
6. Unit tests for extractors

**Deliverables**:
- Support for PNG, JPEG, WebP
- Clean, normalized prompts
- Extracted generation parameters
- Test suite

### Phase 3: Ingestion & Database (Week 5-6)

**Goals**: Robust ingestion pipeline and database operations

**Tasks**:
1. Recursive directory scanning
2. File change detection (new, modified, deleted)
3. Deduplication (hash-based)
4. Batch processing
5. Progress tracking
6. Database indexes and optimization
7. Full-text search setup

**Deliverables**:
- Complete ingestion pipeline
- Efficient database operations
- Full-text search working
- Progress tracking

### Phase 4: API Layer (Week 7-8)

**Goals**: REST API for accessing data

**Tasks**:
1. Actix-web server setup
2. Image endpoints (list, get, search)
3. Prompt endpoints (list, search, filter)
4. Search endpoints (full-text, filters)
5. Collection endpoints
6. Error handling
7. API documentation

**Deliverables**:
- Complete REST API
- API documentation
- Error handling

### Phase 5: Web UI (Week 9-10)

**Goals**: User-friendly web interface

**Tasks**:
1. Dashboard with statistics
2. Image browser with thumbnails
3. Prompt search interface
4. Image detail view
5. Collection management UI
6. Responsive design
7. Dark/light theme

**Deliverables**:
- Complete web UI
- Search and filtering
- Image browsing

### Phase 6: Polish & Features (Week 11-12)

**Goals**: Additional features and polish

**Tasks**:
1. Thumbnail generation and caching
2. Image preview
3. Export functionality (Markdown, JSON)
4. Advanced search filters (keyword, metadata)
5. Intelligent tag extraction from prompts
6. Folder-based collection CRUD operations
7. Dark mode UI (default) with light mode option
8. Performance optimization
9. Documentation
10. Error handling improvements

**Deliverables**:
- Polished application
- Complete documentation
- Export features (Markdown & JSON)
- Tag extraction system
- Folder-based collections

---

## API Endpoints (Planned)

### Images
```
GET    /api/v1/images                    # List images (paginated)
GET    /api/v1/images/{id}               # Get image details
GET    /api/v1/images/{id}/thumbnail     # Get thumbnail
GET    /api/v1/images/{id}/preview       # Get preview image
DELETE /api/v1/images/{id}               # Delete image from database
POST   /api/v1/images/scan               # Trigger directory scan
GET    /api/v1/images/scan/status        # Get scan status
```

### Prompts
```
GET    /api/v1/prompts                   # List prompts (paginated)
GET    /api/v1/prompts/{id}              # Get prompt details
GET    /api/v1/prompts/search?q={query}   # Search prompts (full-text)
GET    /api/v1/prompts/image/{image_id}  # Get prompts for image
```

### Search
```
GET    /api/v1/search?q={query}          # Global search
GET    /api/v1/search/images?q={query}    # Search images
GET    /api/v1/search/prompts?q={query}  # Search prompts (full-text)
GET    /api/v1/search/prompts?q={query}&model={model}&tag={tag}  # Search with filters
```

### Collections
```
GET    /api/v1/collections                # List collections
POST   /api/v1/collections                # Create collection
GET    /api/v1/collections/{id}           # Get collection
PUT    /api/v1/collections/{id}           # Update collection
DELETE /api/v1/collections/{id}           # Delete collection
POST   /api/v1/collections/{id}/images    # Add image to collection
DELETE /api/v1/collections/{id}/images/{image_id}  # Remove image
POST   /api/v1/collections/from-folder    # Create collection from folder path
GET    /api/v1/collections/folder/{path}  # Get collection by folder path
```

### Tags
```
GET    /api/v1/tags                      # List all tags
GET    /api/v1/tags/{id}                 # Get tag details
GET    /api/v1/tags/image/{image_id}      # Get tags for image
GET    /api/v1/tags/type/{type}          # Get tags by type
POST   /api/v1/tags/image/{image_id}      # Add tag to image (manual)
DELETE /api/v1/tags/image/{image_id}/{tag_id}  # Remove tag from image
```

### Export
```
GET    /api/v1/export/prompts?format=json|markdown  # Export prompts
GET    /api/v1/export/images?format=json|markdown    # Export images
GET    /api/v1/export/collection/{id}?format=json|markdown  # Export collection
```

### Statistics
```
GET    /api/v1/stats                     # Overall statistics
GET    /api/v1/stats/images              # Image statistics
GET    /api/v1/stats/prompts             # Prompt statistics
```

---

## Key Features

### Core Features
- ✅ **Directory Scanning**: Recursively scan directories for images
- ✅ **Metadata Extraction**: Extract prompts and parameters from PNG, JPEG, WebP
- ✅ **Database Storage**: SQLite database for images and prompts
- ✅ **Full-Text Search**: Search prompts with keyword and metadata filters
- ✅ **Web UI**: Browse and explore images and prompts (Dark mode default, light mode option)
- ✅ **Collections**: Organize images into collections (folder-based support)
- ✅ **Deduplication**: Hash-based duplicate detection
- ✅ **Thumbnail Generation**: Automatic thumbnail generation and caching
- ✅ **Intelligent Tag Extraction**: Extract tags from prompts and metadata
- ✅ **Export**: Export prompts to Markdown and JSON formats
- ✅ **Easy Ingestion**: Clear UI with instructions for ingesting images
- ✅ **Folder-Based Collections**: CRUD operations for collections based on folder locations

### Advanced Features (Future)
- 🔄 **Import**: Import from other tools
- 🔄 **Manual Tagging**: Add custom tags manually
- 🔄 **GraphQL API**: GraphQL endpoint for flexible queries
- 🔄 **Batch Operations**: Bulk operations on images
- 🔄 **Prompt Templates**: Save and reuse prompt templates
- 🔄 **Similarity Search**: Find similar prompts or images

---

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8080                    # Port for web server
HOST=0.0.0.0                 # Host to bind to

# Database Configuration
DATABASE_PATH=./data/images.db  # SQLite database path

# Storage Configuration
THUMBNAIL_PATH=./data/thumbnails  # Thumbnail cache directory
MAX_THUMBNAIL_SIZE=512            # Max thumbnail dimension

# Scanning Configuration
SCAN_RECURSIVE=true          # Recursive directory scanning
SCAN_INTERVAL=3600           # Rescan interval (seconds)

# Thumbnail Configuration
THUMBNAIL_ENABLED=true       # Enable thumbnail generation
THUMBNAIL_SIZE=256           # Thumbnail size (square, in pixels)
THUMBNAIL_QUALITY=85         # JPEG quality (1-100)

# Logging Configuration
LOG_LEVEL=info               # Log level: trace, debug, info, warn, error
```

---

## Dependencies (Cargo.toml)

```toml
[package]
name = "ai-image-decoder"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
actix-web = "4.5"
actix-files = "0.6"
actix-cors = "0.7"
actix-rt = "2.9"

# Async runtime
tokio = { version = "1.35", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Database
rusqlite = { version = "0.30", features = ["bundled", "r2d2"] }
r2d2 = "0.8"

# Image processing
image = "0.24"
png = "0.17"
jpeg-decoder = "0.3"
exif = "0.6"  # or gufo-exif, little_exif

# File system
walkdir = "2.4"

# Utilities
regex = "1.10"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.6", features = ["v4", "serde"] }
sha2 = "0.10"
hex = "0.4"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Logging
log = "0.4"
env_logger = "0.11"

# Configuration
dotenv = "0.15"
config = "0.14"

# Lazy static
once_cell = "1.19"
```

---

## Testing Strategy

### Unit Tests
- Metadata extraction for each format
- Prompt parsing and normalization
- Database operations
- Utility functions

### Integration Tests
- End-to-end extraction pipeline
- API endpoints
- Database queries
- Search functionality

### Test Data
- Sample PNG images with tEXt chunks
- Sample JPEG images with EXIF/XMP
- Sample WebP images
- Edge cases (missing metadata, malformed data)

---

## Documentation

### User Documentation
- README.md with quick start guide
- Installation instructions
- Usage examples
- Configuration guide
- Troubleshooting

### Developer Documentation
- Architecture overview
- API documentation
- Contributing guidelines
- Code structure

---

## Future Considerations

### Potential Enhancements
1. **AI Model Detection**: Automatically detect which AI model generated the image
2. **Prompt Analysis**: Analyze prompt patterns, common words, etc.
3. **Similarity Search**: Find similar prompts or images
4. **Prompt Templates**: Save and reuse prompt templates
5. **Batch Operations**: Bulk edit, delete, organize
6. **Cloud Storage**: Support for cloud storage backends
7. **Multi-user**: User accounts and permissions
8. **API Keys**: Secure API access
9. **Plugins**: Extensible plugin system (like arch-decoder)

### Performance Optimizations
- Parallel processing for large directories
- Caching for frequently accessed data
- Lazy loading for thumbnails
- Database query optimization
- Index optimization

---

## Success Criteria

### MVP (Minimum Viable Product)
- ✅ Scan directory and extract prompts from PNG images
- ✅ Store in SQLite database
- ✅ Basic REST API
- ✅ Simple web UI to browse prompts
- ✅ Full-text search

### Full Product
- ✅ Support PNG, JPEG, WebP
- ✅ Complete metadata extraction
- ✅ Full web UI with search and filtering
- ✅ Collections support
- ✅ Export functionality
- ✅ Documentation

---

## Risks & Mitigations

### Risks
1. **Metadata Format Variations**: Different tools may store metadata differently
   - *Mitigation*: Start with most common formats, add parsers incrementally
2. **Performance with Large Libraries**: May be slow with thousands of images
   - *Mitigation*: Batch processing, indexing, caching
3. **Missing Metadata**: Some images may not have prompts
   - *Mitigation*: Graceful handling, still store image info
4. **File System Changes**: Images may be moved/deleted
   - *Mitigation*: Periodic rescanning, handle missing files gracefully

---

## Next Steps

1. ✅ **Plan Approved**: All preferences confirmed
2. **Set Up Project**: Initialize Rust project with dependencies
3. **Start Phase 1**: Begin with foundation and basic PNG extraction
4. **Iterate**: Build incrementally, test frequently

**Ready to begin implementation!**

---

## User Preferences (Confirmed)

1. **File Watching**: ❌ NO - No real-time file watching needed
2. **Thumbnails**: ✅ YES - Automatic thumbnail generation
3. **Collections**: ✅ Folder-based collections with CRUD operations
4. **Tags**: ✅ Intelligent tag extraction from prompts and metadata
5. **Export Format**: ✅ Markdown and JSON formats
6. **Search Features**: ✅ Full-text search on prompts + keyword and metadata filters
7. **UI Preferences**: ✅ Dark mode default, light mode option
8. **Ingestion**: ✅ Easy-to-understand UI with clear instructions

## Intelligent Tag Extraction Strategy

### Proposed Approach

**1. Tag Categories** (to be confirmed):
- **Style Tags**: "photorealistic", "anime", "oil painting", "watercolor", "digital art", "sketch"
- **Subject Tags**: "portrait", "landscape", "architecture", "animal", "nature", "cityscape"
- **Technique Tags**: "high detail", "8k", "cinematic lighting", "depth of field", "bokeh"
- **Quality Tags**: "masterpiece", "best quality", "ultra detailed", "professional"
- **Model Tags**: Extracted from metadata (model name, checkpoint)
- **Negative Tags**: From negative prompts (e.g., "blurry", "low quality", "deformed")

**2. Extraction Methods**:
- **Pattern Matching**: Common prompt patterns and keywords
- **Comma-Separated Phrases**: Extract meaningful phrases from prompts
- **Metadata Extraction**: Model names, styles from metadata
- **Quality Markers**: Common quality indicators in prompts
- **Negative Prompt Analysis**: Extract what to avoid

**3. Implementation**:
- Parse prompts into meaningful segments
- Match against known tag patterns
- Extract model information from metadata
- Score confidence for each tag
- Store with source (prompt vs metadata vs manual)

**4. Examples**:
```
Prompt: "beautiful landscape, mountains, sunset, 8k, highly detailed, masterpiece"
Tags:
  - Subject: "landscape", "mountains", "sunset"
  - Quality: "8k", "highly detailed", "masterpiece"
  
Metadata: model="stable-diffusion-v1-5"
Tags:
  - Model: "stable-diffusion-v1-5"
```

## Confirmed Preferences

### Tag Extraction
- ✅ **Tag Categories**: Style, Subject, Technique, Quality, Model, Negative - **CONFIRMED**
- ✅ **Extract from both prompts**: Extract from both positive and negative prompts
- ✅ **No specific patterns**: No prioritized patterns/keywords needed
- ✅ **Normalized tags**: Tags will be case-insensitive and normalized (e.g., "8k" = "8K")

### Folder-Based Collections
- ✅ **Auto-create from folder structure**: User selects one root folder, all subfolders automatically become collections
- ✅ **Auto-add images**: Images automatically added to collections based on folder location
- ✅ **Example**: Image in `/images/landscapes/` → auto-joins "landscapes" collection

### Tag Management
- ✅ **Manual editing**: Users can manually add/edit/remove tags (requires bulk editing UI)
- ✅ **Auto-merge**: Similar tags automatically merged (e.g., "8k" and "8K")
- ✅ **Tag suggestions**: Show tag suggestions based on existing tags

### Implementation Notes

**Folder Collection Logic**:
1. User selects root folder (e.g., `/images/`)
2. Scan recursively finds all subfolders
3. Each subfolder becomes a collection (e.g., `/images/landscapes/` → "landscapes" collection)
4. Images are automatically assigned to collections based on their folder path
5. Root folder itself can be a collection (optional)

**Tag Normalization**:
- Convert to lowercase for storage/comparison
- Display with original casing preference (first occurrence or user preference)
- Merge duplicates during extraction

**Bulk Tag Editing**:
- UI will need multi-select for images
- Bulk add/remove tags across selected images
- Tag suggestions shown during editing

---

## References

- **Architecture Decoder**: `/Volumes/5bits/current/wavelength-dev/arch/wavelength-arch-decoder`
- **PNG Specification**: https://www.w3.org/TR/PNG/
- **EXIF Specification**: https://www.exif.org/
- **XMP Specification**: https://www.adobe.com/devnet/xmp.html
- **Rust Crates**: https://crates.io/

---

*Last Updated: [Current Date]*

