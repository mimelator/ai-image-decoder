# UI Features Test Suite

## Overview

This Playwright test suite specifically tests the new UI features added to the application:

1. **Loading States** - Spinner animations and loading overlays
2. **Toast Notifications** - Success, error, warning, and info toasts
3. **Image Detail Modal** - Full image detail view with metadata
4. **Prompt Detail Modal** - Full prompt detail view with actions
5. **Enhanced Error Handling** - User-friendly error messages

## Running Tests

### Prerequisites

1. Make sure the server is running:
   ```bash
   cargo run
   ```

2. Install dependencies (if not already installed):
   ```bash
   cd scripts
   npm install
   ```

### Run Tests

**Headless mode (default):**
```bash
npm run test:features
```

**Visible mode (see browser):**
```bash
npm run test:features:visible
```

**Direct execution:**
```bash
node test-ui-features-playwright.js
node test-ui-features-playwright.js --headless=false
```

**Custom base URL:**
```bash
BASE_URL=http://localhost:8080 node test-ui-features-playwright.js
```

## Test Coverage

### 1. Loading States Test
- ✅ Checks for spinner element existence
- ✅ Checks for loading overlay element
- ✅ Validates CSS spinner animation
- ✅ Tests loading states during API calls

### 2. Toast Notifications Test
- ✅ Validates toast container exists
- ✅ Tests toast creation and structure
- ✅ Tests all toast types (success, error, warning, info)
- ✅ Validates toast icon and close button
- ✅ Tests toast auto-dismiss functionality

### 3. Image Detail Modal Test
- ✅ Opens image detail modal by clicking image card
- ✅ Validates modal visibility and structure
- ✅ Checks for modal title, content, and close button
- ✅ Validates image display in modal
- ✅ Tests modal closing functionality
- ⚠️ Skips if no images in database

### 4. Prompt Detail Modal Test
- ✅ Opens prompt detail modal by clicking prompt card
- ✅ Validates modal visibility and structure
- ✅ Checks for prompt text display
- ✅ Validates copy button existence
- ✅ Tests modal closing functionality
- ⚠️ Skips if no prompts in database

### 5. Error Handling Test
- ✅ Tests error toast creation
- ✅ Validates error handling functions exist
- ✅ Checks for graceful error handling in code

### 6. Loading States During API Calls
- ✅ Tests loading state during search operations
- ✅ Validates loading state appears and disappears

### 7. Toast Auto-Dismiss Test
- ✅ Validates toast auto-dismiss mechanism
- ✅ Checks for setTimeout usage in toast removal

## Test Results

The test suite generates a detailed report showing:
- Total tests run
- Tests passed/failed/skipped
- JavaScript errors detected
- Test duration
- Detailed test results with status and details

## Example Output

```
🚀 Starting UI Features Test Suite (Playwright)...
📍 Base URL: http://localhost:8080
👁️  Headless: true
============================================================

🌐 Navigating to application...

🔄 Testing Loading States...
  ✅ Loading states test passed

🔔 Testing Toast Notifications...
  ✅ Toast notifications test passed

🖼️  Testing Image Detail Modal...
  ✅ Image detail modal test passed

📝 Testing Prompt Detail Modal...
  ✅ Prompt detail modal test passed

⚠️  Testing Error Handling...
  ✅ Error handling test passed

⏳ Testing Loading States During API Calls...
  ✅ Loading states during API calls test passed

⏰ Testing Toast Auto-Dismiss...
  ✅ Toast auto-dismiss test passed

============================================================
📊 UI FEATURES TEST SUMMARY
============================================================

✅ Tests Passed: 7/7
❌ Tests Failed: 0
⏭️  Tests Skipped: 0
❌ JavaScript Errors: 0
⏱️  Duration: 15s

✅ No JavaScript errors found!
```

## Troubleshooting

### Tests Fail Because No Data

If tests are skipped because there's no data in the database:
1. Run a scan to import images:
   ```bash
   cargo run -- scan /path/to/images
   ```

2. Or use the UI to scan a directory

### Server Not Running

Make sure the server is running on port 8080:
```bash
cargo run
```

### Browser Issues

If you encounter browser launch issues:
- Make sure Playwright browsers are installed: `npx playwright install`
- Try running with `--headless=false` to see what's happening
- Check that you have necessary system dependencies

## Integration with CI/CD

The test suite exits with code 1 if any tests fail, making it suitable for CI/CD pipelines:

```bash
npm run test:features || exit 1
```

## Related Files

- `test-ui-playwright.js` - General UI test suite
- `test-ui.js` - Puppeteer-based test suite
- `package.json` - NPM scripts and dependencies

