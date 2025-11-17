# UI Test Harness Plan

## Overview

A comprehensive test harness to iterate through all pages and use cases, detecting JavaScript errors and bugs in the AI Image Decoder web UI.

## Test Strategy

Based on the `DEBUG_JAVASCRIPT.md` approach from wavelength-hub, we'll use Puppeteer/Playwright to:
1. Launch a headless browser
2. Navigate through all UI pages/tabs
3. Execute all user interactions
4. Capture JavaScript errors, warnings, and network failures
5. Validate UI functionality
6. Generate comprehensive test reports

## Test Coverage

### 1. Page Navigation Tests
- ✅ Navigate to each tab (Images, Prompts, Collections, Tags, Statistics)
- ✅ Verify tab content loads correctly
- ✅ Check for JavaScript errors on each tab
- ✅ Verify tab switching works

### 2. Images Tab Tests
- ✅ Load images list
- ✅ Test pagination (next, previous, specific page)
- ✅ Test image search
- ✅ Click image cards (detail modal)
- ✅ Verify image data displays correctly
- ✅ Test empty state

### 3. Prompts Tab Tests
- ✅ Load prompts list
- ✅ Test pagination
- ✅ Test prompt search
- ✅ Test search with various queries
- ✅ Click prompt cards
- ✅ Test export functionality
- ✅ Verify prompt text rendering

### 4. Collections Tab Tests
- ✅ Load collections list
- ✅ Test create collection button
- ✅ Test empty state message
- ✅ Verify collection cards render

### 5. Tags Tab Tests
- ✅ Load tags cloud
- ✅ Test tag filtering by type
- ✅ Test tag search/filter
- ✅ Click tags (filter functionality)
- ✅ Verify tag counts display

### 6. Statistics Tab Tests
- ✅ Load statistics
- ✅ Verify all stat cards display
- ✅ Check stat values are numbers
- ✅ Verify stat labels

### 7. Scan Modal Tests
- ✅ Open scan modal
- ✅ Test path input
- ✅ Test recursive checkbox
- ✅ Test scan start button
- ✅ Test scan progress display
- ✅ Test modal close
- ✅ Test scan completion flow

### 8. Theme Toggle Tests
- ✅ Test dark mode (default)
- ✅ Test light mode toggle
- ✅ Verify theme persists in localStorage
- ✅ Verify theme icon updates
- ✅ Test theme on all tabs

### 9. API Integration Tests
- ✅ Verify API calls succeed
- ✅ Test error handling (network failures)
- ✅ Test empty responses
- ✅ Test malformed responses
- ✅ Verify loading states

### 10. Error Handling Tests
- ✅ Test with API server down
- ✅ Test with invalid API responses
- ✅ Test with empty database
- ✅ Verify error messages display

### 11. Responsive Design Tests
- ✅ Test mobile viewport (375px)
- ✅ Test tablet viewport (768px)
- ✅ Test desktop viewport (1920px)
- ✅ Verify layout adapts correctly

### 12. Accessibility Tests
- ✅ Keyboard navigation
- ✅ Tab order
- ✅ Focus indicators
- ✅ ARIA labels (if applicable)

## Test Implementation

### Tools
- **Puppeteer** (primary) - Headless Chrome automation
- **Playwright** (alternative) - Cross-browser testing
- **Node.js** - Test runner

### Test Structure
```
scripts/
├── test-ui.js              # Main test harness
├── test-pages.js          # Page navigation tests
├── test-interactions.js   # User interaction tests
├── test-api.js            # API integration tests
└── test-helpers.js        # Utility functions
```

### Test Execution Flow

1. **Setup**
   - Launch browser
   - Set up error listeners
   - Navigate to base URL

2. **Page Tests**
   - For each tab:
     - Navigate to tab
     - Wait for content load
     - Capture errors
     - Verify content renders

3. **Interaction Tests**
   - For each interactive element:
     - Click/type/interact
     - Wait for response
     - Capture errors
     - Verify expected behavior

4. **API Tests**
   - Mock API responses
   - Test error scenarios
   - Verify error handling

5. **Report Generation**
   - Collect all errors
   - Generate summary report
   - Save detailed logs

## Error Categories

1. **JavaScript Errors**
   - Uncaught exceptions
   - Console errors
   - Promise rejections

2. **Network Errors**
   - Failed API requests
   - Timeout errors
   - 404/500 responses

3. **UI Errors**
   - Missing elements
   - Broken functionality
   - Layout issues

4. **Performance Issues**
   - Slow page loads
   - Memory leaks
   - Excessive API calls

## Test Scenarios

### Scenario 1: Happy Path
- All tabs load successfully
- All API calls succeed
- All interactions work
- No JavaScript errors

### Scenario 2: Empty State
- Database has no data
- Verify empty state messages
- Verify no errors

### Scenario 3: Error Handling
- API server returns errors
- Network failures
- Invalid responses
- Verify error messages display

### Scenario 4: Edge Cases
- Very long prompt text
- Special characters in search
- Large pagination numbers
- Rapid tab switching

## Success Criteria

✅ **No JavaScript Errors**: Zero uncaught exceptions
✅ **All Tabs Load**: Every tab displays content
✅ **All Interactions Work**: Buttons, search, pagination functional
✅ **API Integration**: All endpoints called correctly
✅ **Error Handling**: Graceful error messages
✅ **Responsive**: Works on all viewport sizes

## Reporting

### Console Output
```
============================================================
📊 UI TEST SUMMARY
============================================================

✅ Pages Tested: 5/5
✅ Interactions Tested: 25/25
❌ JavaScript Errors: 0
⚠️  Warnings: 2
🔴 Failed Tests: 0

✅ All tests passed!
```

### Detailed Report
- JSON report with all errors
- Screenshots of failures
- Network request logs
- Console logs

## Usage

```bash
# Run all tests
node scripts/test-ui.js

# Test specific tab
node scripts/test-ui.js --tab=prompts

# Test with browser visible
node scripts/test-ui.js --headless=false

# Generate detailed report
node scripts/test-ui.js --report=detailed

# Test specific scenario
node scripts/test-ui.js --scenario=empty-state
```

## Continuous Integration

- Run tests on every commit
- Fail build on JavaScript errors
- Generate test reports
- Track error trends

