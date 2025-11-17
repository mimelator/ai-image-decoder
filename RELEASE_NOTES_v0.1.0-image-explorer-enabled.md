# Release Notes: v0.1.0-image-explorer-enabled

## Overview

This release enables full image exploration capabilities with proper image display, content filtering, and enhanced testing.

## Features

### ✅ Image Display
- **Image File Serving**: Images now served via `/api/v1/images/{id}/file` endpoint
- **Proper Content-Type**: Images served with correct MIME types (image/png, image/jpeg, image/webp)
- **Placeholder Fallbacks**: Graceful fallback to placeholders when image files aren't accessible
- **CSS Styling**: Improved image card and placeholder styling

### ✅ Content Filtering
- **Negative Prompts Hidden**: Negative prompts filtered out from prompt list display
- **Negative Tags Hidden**: Negative tags filtered out from tag cloud display
- **Clean UI**: Only positive, useful content shown to users

### ✅ Testing Enhancements
- **Image Validation**: Tests now validate image API endpoints and file access
- **UI Testing**: Playwright tests check for image display in browser
- **macOS Compatibility**: Fixed test script compatibility issues

## API Changes

### New Endpoints
- `GET /api/v1/images/{id}/file` - Serve image files directly

### Updated Endpoints
- All image endpoints now return proper file paths for display

## UI Changes

### Images Tab
- Images load via API endpoint with automatic fallback
- Improved image card display
- Better error handling for missing images

### Prompts Tab
- Negative prompts automatically filtered
- Cleaner prompt list

### Tags Tab
- Negative tags automatically filtered
- Only positive tags displayed

## Testing

### New Test Scripts
- `scripts/quick-test.sh` - Quick API validation with image checks
- `scripts/kill-server.sh` - Helper to kill server on port 8080

### Enhanced Tests
- Image file endpoint validation
- Image count verification
- Image display validation in UI tests

## Documentation

### New Files
- `USAGE_GUIDE.md` - Comprehensive usage and testing guide
- `scripts/kill-server.sh` - Server management helper

### Updated Files
- `README.md` - Updated with current status
- Test scripts - Enhanced with image validation

## Database Status

- **76 images** in database
- **76 prompts** extracted
- **836 tags** generated
- **0 collections** (folder-based collections ready to use)

## Breaking Changes

None - this is a feature addition release.

## Migration Notes

No migration needed. Existing databases continue to work.

## Next Steps

See [NEXT_STEPS.md](./NEXT_STEPS.md) for recommended next features:

1. **Thumbnail Generation** - Generate and cache thumbnails for faster browsing
2. **Complete API Endpoints** - Finish remaining CRUD operations
3. **Enhanced UI Features** - Image detail modals, tag filtering, collection management
4. **Performance Optimization** - Caching, pagination improvements
5. **Production Readiness** - Security hardening, monitoring, documentation

## Contributors

- Initial implementation and testing

---

**Release Date**: 2025-11-17  
**Tag**: `v0.1.0-image-explorer-enabled`  
**Previous Version**: `v0.1.0-alpha`

