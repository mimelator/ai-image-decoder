# New Features Test Suite

This Playwright test suite validates the newly implemented UI features:

1. **Tag Filtering** - Filter images by clicking tags, visual indicators, active filters bar
2. **Collection Management** - Create, edit, and delete collections from the UI
3. **Export Functionality** - Export prompts and images in JSON or Markdown format
4. **Advanced Search Filters** - Format, model, and sampler filters on Images tab

## Prerequisites

- Node.js and npm installed
- Playwright installed (`npm install` in the `scripts` directory)
- Server running on `http://localhost:8080` (or set `SERVER_URL` environment variable)

## Running the Tests

### Headless Mode (Default)
```bash
cd scripts
npm run test:new-features
```

### Visible Browser Mode (for debugging)
```bash
cd scripts
npm run test:new-features:visible
```

### Custom Server URL
```bash
SERVER_URL=http://localhost:8080 node test-new-features-playwright.js
```

## Test Coverage

### Tag Filtering Tests
- ✅ Navigate to Tags tab
- ✅ Verify tags are displayed
- ✅ Click tag to filter images
- ✅ Verify active filters bar appears
- ✅ Verify filters persist when navigating to Images tab
- ✅ Clear filters functionality

### Collection Management Tests
- ✅ Create new collection via modal
- ✅ Verify collection appears in list
- ✅ Edit collection name and description
- ✅ Verify collection updates
- ✅ Delete collection with confirmation
- ✅ Verify collection is removed

### Export Functionality Tests
- ✅ Export prompts as JSON
- ✅ Export prompts as Markdown
- ✅ Export images as JSON
- ✅ Export images as Markdown
- ✅ Verify download events are triggered

### Advanced Search Filters Tests
- ✅ Verify filter panel is visible
- ✅ Test format filter (PNG, JPG, etc.)
- ✅ Test model filter input
- ✅ Test sampler filter input
- ✅ Test clear filters button
- ✅ Verify filters are cleared

## Expected Behavior

The test suite will:
1. Wait for the server to be ready (checks `/health` endpoint)
2. Navigate to the application
3. Run each test suite sequentially
4. Print detailed results for each test
5. Provide a summary at the end
6. Exit with code 0 if all tests pass, 1 if any fail

## Troubleshooting

### Server Not Ready
If you see "Server is not ready", ensure:
- The server is running on the expected port
- The `/health` endpoint is accessible
- Check server logs for errors

### Tests Failing
- Ensure the server has some test data (images, prompts, collections)
- Check browser console for JavaScript errors
- Run in visible mode (`test:new-features:visible`) to see what's happening
- Verify the UI elements exist in the HTML

### Timeout Issues
- Increase timeout values in the test file if your server is slow
- Ensure network connectivity is stable
- Check server performance

## Notes

- The tests require some data to be present (images, prompts, collections)
- Some tests may skip gracefully if required data is not available
- Download tests verify that download events are triggered (actual file download may vary by browser)
- Filter tests verify UI interactions but don't validate actual filtering logic (that's tested separately)

