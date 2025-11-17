# Puppeteer/Playwright Launch Best Practices for Automated Testing

## Common Issues and Solutions

### 1. WebSocket Connection Errors (ECONNRESET)

**Problem**: `socket hang up` or `ECONNRESET` errors when launching Puppeteer.

**Solutions**:

#### Option A: Use Playwright Instead (Recommended)
Playwright is generally more reliable and has better error handling:

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

#### Option B: Improve Puppeteer Launch Options
```javascript
const browser = await puppeteer.launch({
    headless: 'new',  // Use new headless mode
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Overcome limited resource problems
        '--disable-gpu',            // Disable GPU hardware acceleration
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--single-process',         // Run in single process mode (less stable but more reliable)
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
    protocolTimeout: 120000,        // Increase protocol timeout
    timeout: 120000,                // Increase browser launch timeout
});
```

#### Option C: Retry Mechanism
```javascript
async function launchBrowserWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

### 2. Resource Limits

**Problem**: Browser crashes due to memory/resource limits.

**Solutions**:
- Use `--disable-dev-shm-usage` flag
- Increase shared memory: `--shm-size=2gb` (Docker)
- Use `--single-process` (less stable but uses less memory)
- Close pages/browsers promptly after use

### 3. Timeout Issues

**Problem**: Operations timing out.

**Solutions**:
```javascript
// Increase timeouts
const page = await browser.newPage();
page.setDefaultNavigationTimeout(60000);
page.setDefaultTimeout(60000);

// Use waitForSelector with longer timeout
await page.waitForSelector('.element', { timeout: 30000 });
```

### 4. Best Practices for AI Assistant Context

When running from automated/AI assistant contexts:

#### 1. Use Explicit Error Handling
```javascript
let browser;
try {
    browser = await puppeteer.launch({...});
    // ... test code
} catch (error) {
    console.error('Browser launch failed:', error.message);
    // Cleanup and exit gracefully
} finally {
    if (browser) {
        try {
            await browser.close();
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}
```

#### 2. Check Browser State Before Operations
```javascript
if (page.isClosed()) {
    throw new Error('Page has been closed');
}
```

#### 3. Use Wait Strategies
```javascript
// Wait for network to be idle
await page.goto(url, { waitUntil: 'networkidle0' });

// Wait for specific element
await page.waitForSelector('.content-loaded');

// Wait for function to return true
await page.waitForFunction(() => {
    return document.readyState === 'complete';
});
```

#### 4. Handle Static File 404s Gracefully
```javascript
page.on('response', response => {
    const url = response.url();
    const status = response.status();
    
    // Ignore expected 404s (like missing static files)
    if (status >= 400 && !url.includes('/static/')) {
        // Log or handle error
    }
});
```

#### 5. Use Connection Pooling/Reuse
```javascript
// Reuse browser instance across tests
let sharedBrowser;

async function getBrowser() {
    if (!sharedBrowser) {
        sharedBrowser = await puppeteer.launch({...});
    }
    return sharedBrowser;
}
```

### 5. Recommended Launch Configuration

```javascript
const DEFAULT_LAUNCH_OPTIONS = {
    headless: 'new',  // Use new headless mode
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
    ],
    ignoreHTTPSErrors: true,
    protocolTimeout: 120000,
    timeout: 120000,
};
```

### 6. Alternative: Use Playwright

Playwright is generally more reliable and has better error messages:

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
});

const page = await browser.newPage();
await page.goto('http://localhost:8080');
// ... rest of test
```

### 7. Environment-Specific Considerations

#### Docker/Container Environments
```javascript
args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',  // May help in containers
]
```

#### CI/CD Environments
- Use headless mode
- Set explicit timeouts
- Add retry logic
- Capture screenshots on failure
- Log browser console output

#### Local Development
- Can use `headless: false` for debugging
- Shorter timeouts acceptable
- More verbose logging

### 8. Debugging Tips

```javascript
// Enable verbose logging
const browser = await puppeteer.launch({
    headless: false,  // See what's happening
    devtools: true,   // Open DevTools
});

// Listen to console messages
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// Capture screenshots on error
try {
    await page.goto(url);
} catch (error) {
    await page.screenshot({ path: 'error.png' });
    throw error;
}
```

### 9. Recommended Test Structure

```javascript
describe('UI Tests', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch(DEFAULT_LAUNCH_OPTIONS);
    });

    beforeEach(async () => {
        page = await browser.newPage();
        setupErrorListeners(page);
    });

    afterEach(async () => {
        if (page && !page.isClosed()) {
            await page.close();
        }
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    it('should load page', async () => {
        await page.goto(BASE_URL);
        await page.waitForSelector('.content');
        // ... assertions
    });
});
```

### 10. Quick Reference

**Most Reliable Setup**:
```javascript
const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 120000,
});
```

**For Maximum Compatibility**:
- Use Playwright instead of Puppeteer
- Or use `headless: false` with visible browser
- Or use `--single-process` flag (less stable but more compatible)

**For Production/CI**:
- Always use headless mode
- Set explicit timeouts
- Implement retry logic
- Capture screenshots on failure
- Log all errors

