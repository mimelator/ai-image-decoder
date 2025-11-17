# UI Test Harness

Automated testing for the AI Image Decoder web UI, detecting JavaScript errors and validating functionality across all pages and use cases.

## Quick Start

```bash
# Install dependencies
cd scripts
npm install

# Run all tests
npm test

# Test specific tab
npm run test:images
npm run test:prompts

# Generate detailed report
npm run test:detailed

# Run with visible browser (for debugging)
npm run test:visible
```

## Usage

### Basic Testing

```bash
# Test all pages and interactions
node test-ui.js

# Test specific tab only
node test-ui.js --tab=prompts

# Generate detailed JSON report
node test-ui.js --report=detailed

# Run with browser visible (for debugging)
node test-ui.js --headless=false
```

### Environment Variables

```bash
# Override base URL (default: http://localhost:8080)
BASE_URL=http://localhost:8080 node test-ui.js
```

## What Gets Tested

### ✅ Page Navigation
- All tabs (Images, Prompts, Collections, Tags, Statistics)
- Tab switching
- Content loading

### ✅ User Interactions
- Search functionality
- Pagination
- Button clicks
- Modal interactions
- Theme toggle

### ✅ API Integration
- All API endpoints
- Response handling
- Error handling

### ✅ Error Detection
- JavaScript errors
- Console errors
- Network failures
- Page errors

## Test Output

### Success Example
```
============================================================
📊 UI TEST SUMMARY
============================================================

✅ Pages Tested: 5/5
✅ Interactions Tested: 8
❌ JavaScript Errors: 0
⚠️  Warnings: 0
⏱️  Duration: 12s

✅ No JavaScript errors found!
```

### Errors Found Example
```
============================================================
📊 UI TEST SUMMARY
============================================================

✅ Pages Tested: 5/5
✅ Interactions Tested: 8
❌ JavaScript Errors: 3
⚠️  Warnings: 1
⏱️  Duration: 15s

❌ JavaScript errors detected:

1. [console.error] Uncaught TypeError: Cannot read property 'x' of undefined
2. [request.failed] /api/v1/images - net::ERR_CONNECTION_REFUSED
3. [page.error] ReferenceError: apiCall is not defined
```

## Test Reports

Detailed reports are saved to `test-reports/` directory when using `--report=detailed`:

```json
{
  "startTime": "2025-11-17T...",
  "endTime": "2025-11-17T...",
  "duration": 12345,
  "errors": [...],
  "warnings": [...],
  "pages": {...},
  "interactions": {...}
}
```

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run UI Tests
  run: |
    cd scripts
    npm install
    npm test
```

## Troubleshooting

### "Browser failed to launch"
- Ensure Chrome/Chromium is installed
- Try `--headless=false` to see what's happening
- Check system dependencies

### "Connection refused"
- Ensure server is running: `cargo run`
- Check BASE_URL is correct
- Verify port 8080 is accessible

### "Tests timeout"
- Increase timeout in test-ui.js
- Check server performance
- Verify network connectivity

## Test Coverage

- ✅ All tabs/pages
- ✅ All major interactions
- ✅ API endpoints
- ✅ Error scenarios
- ✅ Theme switching
- ✅ Modal interactions
- ✅ Search functionality
- ✅ Pagination

## Future Enhancements

- [ ] Screenshot on failure
- [ ] Performance metrics
- [ ] Accessibility testing
- [ ] Cross-browser testing
- [ ] Visual regression testing

