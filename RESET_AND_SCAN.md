# Reset Database and Import Images

## Quick Start

### 1. Reset Database

**Option A: Delete database file**
```bash
# Stop the server first (Ctrl+C or ./scripts/kill-server.sh)
rm data/images.db
```

**Option B: Delete entire data directory**
```bash
# This removes database AND thumbnails
rm -rf data/
```

### 2. Import Images from Folders

**Method 1: Command Line (Recommended)**
```bash
# Start fresh scan
cargo run -- scan /path/to/your/images

# Example:
cargo run -- scan "/Volumes/5bits/StoryTime/Vol1Ep4BillieAtTheRiverside"
```

**Method 2: Web UI**
1. Start the server: `cargo run --release`
2. Open `http://localhost:8080`
3. Click "Scan Directory" button
4. Enter folder path
5. Click "Start Scan"

## How Collections Work

### Folder-Based Collections (Automatic)

When you scan a directory, **collections are automatically created** from the folder structure:

**Example:**
```
/path/to/images/
  ├── landscapes/          → Collection: "landscapes"
  │   ├── image1.png
  │   └── image2.png
  ├── portraits/           → Collection: "portraits"
  │   └── image3.png
  └── abstract/            → Collection: "abstract"
      └── image4.png
```

**What happens:**
1. You scan `/path/to/images/`
2. System finds subfolders: `landscapes`, `portraits`, `abstract`
3. Each subfolder becomes a collection automatically
4. Images are automatically assigned to collections based on their folder location

**Collection Properties:**
- **Name**: Folder name (e.g., "landscapes")
- **Type**: `is_folder_based: true`
- **Folder Path**: Stored for reference
- **Auto-assignment**: Images automatically join collections based on folder

### Manual Collections

You can also create collections manually via the API:
```bash
curl -X POST http://localhost:8080/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Collection",
    "description": "Manually created collection"
  }'
```

## Complete Workflow

### Step-by-Step: Fresh Start

1. **Reset Database**
   ```bash
   rm data/images.db
   # Or remove everything: rm -rf data/
   ```

2. **Start Server** (if using UI)
   ```bash
   cargo run --release
   ```

3. **Scan Directory**
   ```bash
   # CLI method
   cargo run -- scan "/path/to/images"
   
   # Or use UI: http://localhost:8080 → Scan Directory
   ```

4. **Verify Results**
   ```bash
   # Check stats
   curl http://localhost:8080/api/v1/stats
   
   # List collections
   curl http://localhost:8080/api/v1/collections
   
   # List images
   curl http://localhost:8080/api/v1/images?limit=5
   ```

## What Gets Created

When you scan a folder:

1. **Images**: All PNG, JPEG, WebP files are indexed
2. **Prompts**: Extracted from image metadata
3. **Tags**: Automatically extracted from prompts
4. **Collections**: Created from folder structure
5. **Thumbnails**: Generated (if enabled) in `data/thumbnails/`

## Example Session

```bash
# 1. Reset database
rm data/images.db

# 2. Scan directory
cargo run -- scan "/Volumes/5bits/StoryTime/Vol1Ep4BillieAtTheRiverside"

# Output:
# Starting scan of directory: /Volumes/5bits/StoryTime/...
# Found 76 image files
# Creating 3 folder-based collections
# Processed 76/76 images
# Scan complete: 76 processed, 0 skipped, 0 errors

# 3. Check collections
curl http://localhost:8080/api/v1/collections

# 4. View in browser
open http://localhost:8080
```

## Troubleshooting

### Database Locked
```bash
# Make sure server is stopped
./scripts/kill-server.sh

# Then delete database
rm data/images.db
```

### Thumbnails Not Generating
```bash
# Check thumbnail directory exists
mkdir -p data/thumbnails

# Check config
# THUMBNAIL_ENABLED=true in .env or defaults
```

### Images Not Showing
```bash
# Verify images were scanned
curl http://localhost:8080/api/v1/stats

# Check if images exist in database
sqlite3 data/images.db "SELECT COUNT(*) FROM images;"
```

## Tips

- **Incremental Scans**: Scanning the same folder again will skip existing images (by path)
- **Multiple Folders**: Scan each folder separately, or scan a parent folder containing subfolders
- **Collection Names**: Collection names match folder names exactly
- **Thumbnails**: Generated automatically during scan (if enabled)

