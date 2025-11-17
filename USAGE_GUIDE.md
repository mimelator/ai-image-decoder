# AI Image Decoder - Usage Guide

## Quick Start

### 1. Build the Project

```bash
# Development build
cargo build

# Release build (recommended)
cargo build --release
```

### 2. Start the Server

```bash
# Development mode
cargo run

# Release mode
cargo run --release

# Or run the binary directly
./target/release/ai-image-decoder
```

The server will start on `http://localhost:9000` by default.

### 3. Access the Web UI

Open your browser and navigate to:
```
http://localhost:9000
```

## Usage Modes

### Mode 1: Command-Line Scanning

Scan a directory from the command line (no server needed):

```bash
cargo run -- scan /path/to/images
```

**Example:**
```bash
cargo run -- scan "/Volumes/5bits/current/BackyardBalladAssets/brave new baby crow world"
```

**Output:**
```
Scan complete!
  Total files: 76
  Processed: 76
  Skipped: 0
  Errors: 0
```

### Mode 2: Web Server + UI

Start the server and use the web interface:

```bash
cargo run
```

Then:
1. Open `http://localhost:9000` in your browser
2. Click "Scan Directory" button
3. Enter directory path
4. Click "Start Scan"
5. Watch progress in real-time

### Mode 3: API Only

Use the REST API directly:

```bash
# Start server
cargo run

# Scan directory via API
curl -X POST http://localhost:9000/api/v1/images/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/images", "recursive": true}'

# Check scan status
curl http://localhost:9000/api/v1/images/scan/status

# List images
curl http://localhost:9000/api/v1/images?page=1&limit=20

# Search prompts
curl "http://localhost:9000/api/v1/prompts/search?q=blue%20heron"
```

## Configuration

### Environment Variables

Create a `.env` file (optional):

```bash
# Server configuration
PORT=9000
HOST=0.0.0.0

# Database configuration
DATABASE_PATH=./data/images.db

# Logging
RUST_LOG=info
LOG_LEVEL=info

# Scanning
SCAN_RECURSIVE=true

# Version checking
CHECK_VERSION_UPDATES=true
```

### Default Values

- **Port**: 9000
- **Host**: 0.0.0.0
- **Database**: `./data/images.db`
- **Log Level**: info

## Web UI Features

### Tabs

1. **Images** - Browse all scanned images
   - View thumbnails (when implemented)
   - See metadata (dimensions, size, format)
   - Filter by collection
   - Search by filename

2. **Prompts** - Browse extracted prompts
   - View positive and negative prompts
   - See generation parameters (model, seed, steps, etc.)
   - Full-text search
   - Export prompts (JSON/Markdown)

3. **Collections** - Manage folder-based collections
   - View auto-created collections
   - Create manual collections
   - Add/remove images

4. **Tags** - Browse extracted tags
   - Filter by tag type (Style, Subject, Quality, etc.)
   - View tag counts
   - See images with specific tags

5. **Statistics** - View database statistics
   - Total images, prompts, tags
   - Format distribution
   - Collection counts

### UI Controls

- **Theme Toggle** - Switch between dark/light mode (top right)
- **Search Bar** - Search prompts and images
- **Pagination** - Navigate through results
- **Scan Button** - Open scan directory modal
- **Export** - Export prompts in JSON or Markdown

## API Endpoints

### Health & Version

```bash
# Health check
GET /health

# Version info
GET /version
GET /version?force=true  # Force check for updates
```

### Images

```bash
# List images (paginated)
GET /api/v1/images?page=1&limit=20

# Get image details
GET /api/v1/images/{id}

# Scan directory
POST /api/v1/images/scan
Body: {"path": "/path/to/images", "recursive": true}

# Scan status
GET /api/v1/images/scan/status
```

### Prompts

```bash
# List prompts (paginated)
GET /api/v1/prompts?page=1&limit=20

# Get prompts for image
GET /api/v1/prompts/image/{image_id}

# Search prompts
GET /api/v1/prompts/search?q=query
```

### Search

```bash
# Global search
GET /api/v1/search?q=query

# Search images
GET /api/v1/search/images?q=query

# Search prompts
GET /api/v1/search/prompts?q=query
```

### Collections

```bash
# List collections
GET /api/v1/collections

# Create collection
POST /api/v1/collections
Body: {"name": "My Collection", "description": "..."}

# Get collection
GET /api/v1/collections/{id}

# Add image to collection
POST /api/v1/collections/{id}/images
Body: {"image_id": "..."}
```

### Tags

```bash
# Get tags for image
GET /api/v1/tags/image/{image_id}

# List all tags
GET /api/v1/tags

# Get tags by type
GET /api/v1/tags?type=Style
```

### Export

```bash
# Export prompts
GET /api/v1/export/prompts?format=json
GET /api/v1/export/prompts?format=markdown

# Export images
GET /api/v1/export/images?format=json
```

### Statistics

```bash
# Overall stats
GET /api/v1/stats

# Image stats
GET /api/v1/stats/images

# Prompt stats
GET /api/v1/stats/prompts
```

## Testing Checklist

### Basic Functionality

- [ ] **Build and Run**
  ```bash
  cargo build --release
  cargo run --release
  ```

- [ ] **CLI Scanning**
  ```bash
  cargo run -- scan /path/to/test/images
  ```
  Verify: Check output for processed/skipped/errors

- [ ] **Web UI Access**
  - Open `http://localhost:9000`
  - Verify: UI loads without errors

- [ ] **Health Check**
  ```bash
  curl http://localhost:9000/health
  ```
  Verify: Returns `{"status": "ok", "service": "ai-image-decoder"}`

- [ ] **Version Check**
  ```bash
  curl http://localhost:9000/version
  ```
  Verify: Returns version info

### Image Scanning

- [ ] **Scan via CLI**
  ```bash
  cargo run -- scan /path/to/images
  ```
  Verify: Images are processed and stored

- [ ] **Scan via Web UI**
  - Click "Scan Directory"
  - Enter path
  - Click "Start Scan"
  - Verify: Progress bar updates, images appear

- [ ] **Scan via API**
  ```bash
  curl -X POST http://localhost:9000/api/v1/images/scan \
    -H "Content-Type: application/json" \
    -d '{"path": "/path/to/images", "recursive": true}'
  ```
  Verify: Returns scan progress

### Metadata Extraction

- [ ] **PNG Images**
  - Scan directory with PNG images (Stable Diffusion, ComfyUI)
  - Verify: Prompts extracted correctly
  - Check: Tags are generated

- [ ] **JPEG Images**
  - Scan directory with JPEG images
  - Verify: Metadata extracted (if present)

- [ ] **WebP Images**
  - Scan directory with WebP images
  - Verify: Metadata extracted

- [ ] **ComfyUI Workflows**
  - Scan PNG with ComfyUI workflow JSON
  - Verify: Readable prompts extracted from workflow

### Database & Search

- [ ] **List Images**
  ```bash
  curl http://localhost:9000/api/v1/images?page=1&limit=10
  ```
  Verify: Returns paginated image list

- [ ] **Search Prompts**
  ```bash
  curl "http://localhost:9000/api/v1/prompts/search?q=test"
  ```
  Verify: Returns matching prompts

- [ ] **Global Search**
  ```bash
  curl "http://localhost:9000/api/v1/search?q=test"
  ```
  Verify: Returns combined results

### Collections

- [ ] **Folder Collections**
  - Scan directory with subfolders
  - Verify: Collections auto-created from folders

- [ ] **List Collections**
  ```bash
  curl http://localhost:9000/api/v1/collections
  ```
  Verify: Returns collections

- [ ] **Collection Images**
  - Verify: Images assigned to correct collections

### Tags

- [ ] **Tag Extraction**
  - Scan images with prompts
  - Verify: Tags extracted (Style, Subject, Quality, etc.)

- [ ] **Tag Display**
  - View images in UI
  - Verify: Tags displayed correctly

- [ ] **Tag Filtering**
  - Filter by tag type
  - Verify: Results filtered correctly

### Export

- [ ] **Export Prompts (JSON)**
  ```bash
  curl "http://localhost:9000/api/v1/export/prompts?format=json"
  ```
  Verify: Returns valid JSON

- [ ] **Export Prompts (Markdown)**
  ```bash
  curl "http://localhost:9000/api/v1/export/prompts?format=markdown"
  ```
  Verify: Returns Markdown format

### Statistics

- [ ] **Overall Stats**
  ```bash
  curl http://localhost:9000/api/v1/stats
  ```
  Verify: Returns correct counts

- [ ] **Image Stats**
  ```bash
  curl http://localhost:9000/api/v1/stats/images
  ```
  Verify: Returns format distribution

- [ ] **Prompt Stats**
  ```bash
  curl http://localhost:9000/api/v1/stats/prompts
  ```
  Verify: Returns unique prompt count

### UI Testing

- [ ] **Theme Toggle**
  - Click theme toggle
  - Verify: Dark/light mode switches

- [ ] **Tab Navigation**
  - Click each tab (Images, Prompts, Collections, Tags, Stats)
  - Verify: Content loads without errors

- [ ] **Search**
  - Enter search query
  - Verify: Results update

- [ ] **Pagination**
  - Navigate pages
  - Verify: Content updates

- [ ] **Scan Modal**
  - Open scan modal
  - Enter path
  - Start scan
  - Verify: Progress updates, modal closes on completion

## Common Issues

### Port Already in Use

**Quick fix:**
```bash
# Kill any process on port 8080
./scripts/kill-server.sh

# Or manually
lsof -ti :8080 | xargs kill -9

# Or change port in .env
PORT=8081
```

**Or use the helper script:**
```bash
# Kill server on default port (8080)
./scripts/kill-server.sh

# Kill server on custom port
./scripts/kill-server.sh 8081
```

### Database Locked

```bash
# Database might be locked if server crashed
# Restart the server
# Or delete database and rescan
rm data/images.db
```

### No Images Found

- Verify directory path is correct
- Check file permissions
- Ensure images are PNG, JPEG, or WebP format
- Check logs for errors: `RUST_LOG=debug cargo run`

### Metadata Not Extracted

- Verify images contain metadata (not all images do)
- Check logs for extraction errors
- Test with known-good images (Stable Diffusion PNGs)

## Next Steps for Testing

1. **Thumbnail Generation** (Not yet implemented)
   - Currently images display without thumbnails
   - Next priority: Implement thumbnail generation

2. **Error Handling**
   - Test with invalid paths
   - Test with corrupted images
   - Test with very large directories

3. **Performance**
   - Test with large image libraries (1000+ images)
   - Monitor memory usage
   - Test concurrent API requests

4. **Edge Cases**
   - Images without metadata
   - Very long prompts
   - Special characters in paths/prompts
   - Unicode handling

## Example Test Session

```bash
# 1. Build
cargo build --release

# 2. Start server
cargo run --release

# 3. In another terminal, scan directory
curl -X POST http://localhost:9000/api/v1/images/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/images", "recursive": true}'

# 4. Check stats
curl http://localhost:9000/api/v1/stats

# 5. List images
curl http://localhost:9000/api/v1/images?page=1&limit=5

# 6. Search prompts
curl "http://localhost:9000/api/v1/prompts/search?q=test"

# 7. Open UI
open http://localhost:9000
```

## Getting Help

- Check logs: `RUST_LOG=debug cargo run`
- Review API responses for error messages
- Check database: `sqlite3 data/images.db "SELECT * FROM images LIMIT 5;"`
- See [API_TEST_RESULTS.md](./API_TEST_RESULTS.md) for tested endpoints
- See [NEXT_STEPS.md](./NEXT_STEPS.md) for planned features

