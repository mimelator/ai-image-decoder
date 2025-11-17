# Testing Guide - AI Image Decoder

## Overview

This guide will walk you through testing all the features of the AI Image Decoder application, including both manual testing and automated test execution.

## Prerequisites

1. **Server Running**: Make sure the server is running
   ```bash
   cargo run
   ```
   Server should start on `http://localhost:8080`

2. **Database**: You can start fresh or use existing data
   - Fresh start: Delete `data/database.db` if you want to test from scratch
   - Existing data: Use your current database

3. **Test Images**: Have some AI-generated images ready for scanning
   - PNG files with metadata (Stable Diffusion, ComfyUI, etc.)
   - JPEG files with EXIF data
   - WebP files with metadata

---

## Part 1: Initial Setup & Basic Functionality

### Step 1: Verify Server is Running

1. Open browser: `http://localhost:8080`
2. **Expected**: You should see the application homepage with:
   - Header: "🎨 AI Image Decoder"
   - Navigation tabs: Images, Prompts, Collections, Tags, Statistics
   - Theme toggle button (🌙/☀️)

### Step 2: Test Theme Toggle

1. Click the theme toggle button (🌙)
2. **Expected**: 
   - Theme switches between dark and light mode
   - Icon changes (🌙 ↔️ ☀️)
   - Theme persists after page refresh

### Step 3: Check Statistics Tab

1. Click "Statistics" tab
2. **Expected**:
   - Shows counts for Images, Prompts, Tags, Collections
   - Shows total size
   - If database is empty, shows zeros

---

## Part 2: Image Ingestion & Scanning

### Step 4: Scan a Directory

1. Click "Scan Directory" button
2. **Expected**: Modal opens with:
   - Input field for directory path
   - Checkbox for recursive scanning
   - Progress bar (initially hidden)

3. Enter a directory path with images:
   ```
   /path/to/your/images
   ```

4. Check "Scan subdirectories" if you want recursive scanning

5. Click "Start Scan"
6. **Expected**:
   - Progress bar appears
   - Shows: `X / Y files processed`
   - Shows: `Processed: N | Remaining: M | Errors: E | Skipped: S`
   - Progress bar fills up
   - **Toast notification** appears: "✅ Scan complete - Processed X images"
   - Modal closes automatically after completion

### Step 5: Verify Images Were Imported

1. Click "Images" tab
2. **Expected**:
   - **Loading spinner** appears briefly
   - Images appear in grid layout
   - Each image shows:
     - Thumbnail (or placeholder)
     - File name
     - File size and format
   - Pagination controls if more than 24 images

### Step 6: Check Collections Were Created

1. Click "Collections" tab
2. **Expected**:
   - Collections automatically created from folder structure
   - Each collection shows:
     - Collection name (folder name)
     - Folder path
     - Description (if any)

---

## Part 3: UI Features Testing

### Step 7: Test Loading States

**What to look for:**
- When switching tabs, you should see a **loading spinner** briefly
- When searching, loading overlay appears
- Loading states disappear when content loads

**Test steps:**
1. Click "Images" tab
2. **Expected**: Brief loading spinner, then images appear
3. Click "Prompts" tab
4. **Expected**: Brief loading spinner, then prompts appear
5. Click "Tags" tab
6. **Expected**: Brief loading spinner, then tags appear

### Step 8: Test Toast Notifications

**What to look for:**
- Toast notifications appear in top-right corner
- Different colors for different types (success=green, error=red, warning=orange, info=blue)
- Toasts auto-dismiss after 5 seconds
- Can manually close with × button

**Test steps:**
1. Start a scan (Step 4)
2. **Expected**: Success toast when scan completes
3. Try scanning an invalid path
4. **Expected**: Error toast appears
5. Click × on a toast
6. **Expected**: Toast closes immediately

### Step 9: Test Image Detail Modal

1. Click on any image card in the Images tab
2. **Expected**:
   - **Modal opens** smoothly
   - Shows **loading spinner** while loading details
   - Modal displays:
     - Full-size image
     - Image metadata (format, size, dimensions, path, dates)
     - **Tags** (if any)
     - **Prompts** associated with image (clickable)
     - **Metadata** section (if available)
   - Close button (×) works
   - Clicking outside modal closes it

3. Click on a prompt in the modal
4. **Expected**: Prompt detail modal opens

### Step 10: Test Prompt Detail Modal

1. Click "Prompts" tab
2. Click on any prompt card
3. **Expected**:
   - **Modal opens** smoothly
   - Shows **loading spinner** while loading
   - Modal displays:
     - **Full prompt text** (large, readable)
     - **Negative prompt** (if available, in warning-colored section)
     - **Generation parameters** (model, seed, steps, CFG scale, sampler)
     - **Link to associated image** (thumbnail + clickable)
     - **Copy Prompt** button
     - **Export** button
   - Close button (×) works

4. Click "Copy Prompt" button
5. **Expected**: 
   - **Success toast**: "✅ Copied! - Prompt text copied to clipboard"
   - Prompt text is in clipboard

6. Click on image thumbnail in prompt modal
7. **Expected**: Image detail modal opens

---

## Part 4: Search & Filtering

### Step 11: Test Image Search

1. Go to Images tab
2. Type in search box: `test`
3. Press Enter or click Search button
4. **Expected**:
   - **Loading spinner** appears
   - Results filtered by search term
   - If no results: **Info toast**: "ℹ️ No results - No images found matching your search"
   - Search works on file names

### Step 12: Test Prompt Search

1. Go to Prompts tab
2. Type in search box: `adorable`
3. Press Enter or click Search button
4. **Expected**:
   - **Loading spinner** appears
   - Results filtered by search term
   - Full-text search on prompt text
   - Negative prompts are hidden

### Step 13: Test Tag Filtering

1. Go to Tags tab
2. **Expected**:
   - Tags displayed as cloud
   - Each tag shows count
   - Tags grouped by type (style, subject, technique, quality, model)
   - Negative tags are hidden

3. Select tag type from dropdown
4. **Expected**: Tags filtered by type

---

## Part 5: Error Handling

### Step 14: Test Error Scenarios

**Test 1: Invalid Scan Path**
1. Click "Scan Directory"
2. Enter invalid path: `/nonexistent/path`
3. Click "Start Scan"
4. **Expected**: 
   - **Error toast**: "❌ Scan failed - [error message]"
   - Progress bar hidden

**Test 2: Network Error Simulation**
1. Stop the server (`Ctrl+C`)
2. Try to load images
3. **Expected**: 
   - **Error toast**: "❌ Failed to load images - [error]"
   - Error message displayed

4. Restart server: `cargo run`

**Test 3: Invalid Image ID**
1. Try to open image detail with invalid ID
2. **Expected**: 
   - **Error toast**: "❌ Failed to load image details - Image not found"
   - Modal shows error message

---

## Part 6: Export Functionality

### Step 15: Test Export Prompts

1. Go to Prompts tab
2. Click "Export" button
3. **Expected**:
   - **Info toast**: "ℹ️ Exporting - Preparing export..."
   - File downloads: `prompts-export-YYYY-MM-DD.md`
   - **Success toast**: "✅ Export complete - Prompts exported successfully"
   - File contains prompts in Markdown format

---

## Part 7: Automated Testing

### Step 16: Run Automated Test Suite

1. **Install dependencies** (if not already done):
   ```bash
   cd scripts
   npm install
   ```

2. **Run general UI tests**:
   ```bash
   npm run test:playwright
   ```
   **Expected**: All tabs load correctly, no JavaScript errors

3. **Run feature-specific tests**:
   ```bash
   npm run test:features
   ```
   **Expected**: 
   - 6-7 tests pass
   - Loading states validated
   - Toast notifications validated
   - Modals validated
   - Error handling validated

4. **Run tests with visible browser** (to see what's happening):
   ```bash
   npm run test:features:visible
   ```

### Step 17: Review Test Results

Check the console output for:
- ✅ Tests passed
- ❌ Tests failed (with error messages)
- ⏭️ Tests skipped (with reasons)
- JavaScript errors detected

---

## Part 8: Performance & Edge Cases

### Step 18: Test with Large Dataset

1. Scan a directory with 100+ images
2. **Expected**:
   - Progress logging shows: `[X/Y] (Z%) Processed: N | Remaining: M`
   - Progress updates every 10% milestone
   - Final summary shows totals
   - UI remains responsive
   - Pagination works correctly

### Step 19: Test Image Display

1. Check different image formats:
   - PNG files
   - JPEG files
   - WebP files
2. **Expected**:
   - Thumbnails load (or fallback to full image)
   - Placeholders shown if image can't load
   - Images display correctly in detail modal

### Step 20: Test Metadata Extraction

1. Open image detail modal for different image types
2. **Expected**:
   - ComfyUI images: Workflow JSON parsed, readable prompt extracted
   - Stable Diffusion images: Parameters extracted
   - Images with EXIF: Metadata displayed
   - Images without metadata: Graceful handling

---

## Part 9: Collection Management

### Step 21: Test Collections

1. Go to Collections tab
2. **Expected**:
   - Folder-based collections automatically created
   - Collections show folder paths
   - Images automatically assigned to collections

3. Click "Create Collection" button
4. **Expected**: (If implemented)
   - Modal opens for manual collection creation
   - Can add name, description
   - Can add images to collection

---

## Part 10: Tag Management

### Step 22: Test Tags

1. Go to Tags tab
2. **Expected**:
   - Tags extracted from prompts automatically
   - Tags categorized (style, subject, technique, quality, model)
   - Tag counts shown
   - Negative tags hidden

3. Open image detail modal
4. **Expected**:
   - Tags displayed for that image
   - Tags are clickable (if filtering implemented)

---

## Common Issues & Solutions

### Issue: Images not displaying

**Check:**
1. Are images in the database? (Check Statistics tab)
2. Are image files still at the original paths?
3. Check browser console for errors
4. Try refreshing the page

**Solution:**
- Re-scan the directory
- Check file permissions
- Verify image paths are accessible

### Issue: Prompts not showing

**Check:**
1. Do images have embedded metadata?
2. Check Statistics tab for prompt count
3. Are prompts filtered out? (negative prompts are hidden)

**Solution:**
- Scan images that have metadata
- Check image detail modal for prompts
- Verify metadata extraction is working

### Issue: Toast notifications not appearing

**Check:**
1. Is toast container in DOM? (Check browser dev tools)
2. Are there JavaScript errors?
3. Is CSS loading correctly?

**Solution:**
- Check browser console
- Verify static files are being served
- Check network tab for 404 errors

### Issue: Modals not opening

**Check:**
1. Are there JavaScript errors?
2. Is the modal HTML in the page?
3. Are event listeners attached?

**Solution:**
- Check browser console
- Verify JavaScript is loading
- Try clicking different items

---

## Testing Checklist

Use this checklist to ensure you've tested everything:

### Basic Functionality
- [ ] Server starts and serves application
- [ ] Theme toggle works
- [ ] All tabs load correctly
- [ ] Statistics display correctly

### Image Ingestion
- [ ] Scan directory works
- [ ] Progress logging shows correctly
- [ ] Images imported successfully
- [ ] Collections created automatically
- [ ] Thumbnails generated

### UI Features
- [ ] Loading states appear/disappear
- [ ] Toast notifications work (all types)
- [ ] Image detail modal opens/closes
- [ ] Prompt detail modal opens/closes
- [ ] Copy to clipboard works

### Search & Filter
- [ ] Image search works
- [ ] Prompt search works
- [ ] Tag filtering works
- [ ] Empty results handled gracefully

### Error Handling
- [ ] Invalid paths show error toasts
- [ ] Network errors handled gracefully
- [ ] Missing data handled gracefully
- [ ] Error messages are user-friendly

### Export
- [ ] Export prompts works
- [ ] File downloads correctly
- [ ] Export format is correct

### Performance
- [ ] Large datasets handled
- [ ] UI remains responsive
- [ ] Pagination works
- [ ] Images load efficiently

### Automated Tests
- [ ] General UI tests pass
- [ ] Feature tests pass
- [ ] No critical JavaScript errors

---

## Quick Test Commands

```bash
# Start server
cargo run

# Run automated tests
cd scripts
npm run test:features

# Run tests with visible browser
npm run test:features:visible

# Check server health
curl http://localhost:8080/health

# Check API endpoints
curl http://localhost:8080/api/v1/stats
```

---

## Next Steps After Testing

1. **Report Issues**: Note any bugs or unexpected behavior
2. **Performance**: If slow, note which operations
3. **UI/UX**: Note any confusing or unclear interactions
4. **Feature Requests**: Note any missing functionality

---

## Need Help?

- Check `USAGE_GUIDE.md` for usage instructions
- Check `API_TEST_RESULTS.md` for API endpoint status
- Check `FEATURES_TEST_README.md` for test documentation
- Review browser console for errors
- Check server logs for backend issues

