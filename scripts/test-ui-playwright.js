#!/usr/bin/env node

/**
 * UI Test Harness using Playwright (More Reliable Alternative)
 * 
 * Playwright is generally more reliable than Puppeteer for automated testing.
 * This is an alternative implementation using Playwright.
 */

const { chromium } = require('playwright');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const HEADLESS = !process.argv.includes('--headless=false');

// Test results
const testResults = {
    startTime: new Date(),
    errors: [],
    warnings: [],
    pages: {},
    interactions: {}
};

/**
 * Setup error listeners
 */
function setupErrorListeners(page) {
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
            testResults.errors.push({
                type: 'console.error',
                message: text,
                timestamp: new Date().toISOString()
            });
        } else if (type === 'warning') {
            testResults.warnings.push({
                type: 'console.warning',
                message: text,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    page.on('pageerror', error => {
        testResults.errors.push({
            type: 'page.error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    });
    
    page.on('requestfailed', request => {
        const url = request.url();
        if (!url.includes('/static/')) {
            testResults.errors.push({
                type: 'request.failed',
                url: url,
                failureText: request.failure()?.errorText,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    page.on('response', response => {
        const url = response.url();
        const status = response.status();
        if (status >= 400 && !url.includes('/static/')) {
            testResults.errors.push({
                type: 'response.error',
                url: url,
                status: status,
                statusText: response.statusText(),
                timestamp: new Date().toISOString()
            });
        }
    });
}

/**
 * Test page navigation
 */
async function testPageNavigation(page, tabName) {
    console.log(`\n📄 Testing ${tabName} tab...`);
    
    try {
        const tabSelector = `.nav-tab[data-tab="${tabName}"]`;
        await page.waitForSelector(tabSelector, { timeout: 10000 });
        await page.click(tabSelector);
        
        const contentSelector = `#${tabName}-tab`;
        await page.waitForSelector(contentSelector, { timeout: 10000 });
        await page.waitForTimeout(1000);
        
        // Wait a bit more for content to load
        await page.waitForTimeout(500);
        
        const isVisible = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return el && el.classList.contains('active');
        }, contentSelector);
        
        // Also check if element exists and is displayed
        const elementExists = await page.$(contentSelector);
        if (!elementExists) {
            throw new Error(`Tab ${tabName} content element not found`);
        }
        
        const isDisplayed = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && el.classList.contains('active');
        }, contentSelector);
        
        if (!isVisible && !isDisplayed) {
            // Try clicking again
            await page.click(tabSelector);
            await page.waitForTimeout(1000);
            const retryVisible = await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                return el && el.classList.contains('active');
            }, contentSelector);
            
            if (!retryVisible) {
                throw new Error(`Tab ${tabName} content not visible after retry`);
            }
        }
        
        testResults.pages[tabName] = {
            status: 'passed',
            timestamp: new Date().toISOString()
        };
        
        console.log(`  ✅ ${tabName} tab loaded successfully`);
        return true;
    } catch (error) {
        testResults.pages[tabName] = {
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        };
        console.log(`  ❌ ${tabName} tab failed: ${error.message}`);
        return false;
    }
}

/**
 * Test images tab interactions
 */
async function testImagesTab(page) {
    console.log('\n🖼️  Testing Images tab interactions...');
    
    try {
        const searchInput = await page.$('#image-search');
        if (searchInput) {
            await searchInput.fill('test');
            await page.click('#image-search-btn');
            await page.waitForTimeout(1000);
            console.log('  ✅ Image search tested');
        }
        
        testResults.interactions.images = 'passed';
    } catch (error) {
        testResults.interactions.images = `failed: ${error.message}`;
        console.log(`  ❌ Images interactions failed: ${error.message}`);
    }
}

/**
 * Test prompts tab interactions
 */
async function testPromptsTab(page) {
    console.log('\n📝 Testing Prompts tab interactions...');
    
    try {
        const searchInput = await page.$('#prompt-search');
        if (searchInput) {
            await searchInput.fill('Adorable');
            await page.click('#prompt-search-btn');
            await page.waitForTimeout(1000);
            console.log('  ✅ Prompt search tested');
        }
        
        testResults.interactions.prompts = 'passed';
    } catch (error) {
        testResults.interactions.prompts = `failed: ${error.message}`;
        console.log(`  ❌ Prompts interactions failed: ${error.message}`);
    }
}

/**
 * Test theme toggle
 */
async function testThemeToggle(page) {
    console.log('\n🎨 Testing Theme Toggle...');
    
    try {
        const themeBtn = await page.$('#theme-toggle');
        if (themeBtn) {
            const initialTheme = await page.evaluate(() => {
                return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            });
            
            await themeBtn.click();
            await page.waitForTimeout(500);
            
            const newTheme = await page.evaluate(() => {
                return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            });
            
            if (newTheme !== initialTheme) {
                console.log(`  ✅ Theme toggled from ${initialTheme} to ${newTheme}`);
                await themeBtn.click();
                await page.waitForTimeout(500);
                testResults.interactions.themeToggle = 'passed';
            }
        }
    } catch (error) {
        testResults.interactions.themeToggle = `failed: ${error.message}`;
        console.log(`  ❌ Theme toggle failed: ${error.message}`);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting UI Test Harness (Playwright)...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`👁️  Headless: ${HEADLESS}`);
    console.log('============================================================\n');
    
    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        setupErrorListeners(page);
        
        console.log('🌐 Navigating to application...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Check if JavaScript loaded
        const jsLoaded = await page.evaluate(() => {
            return typeof window.switchTab !== 'undefined' || 
                   document.querySelector('.nav-tab') !== null;
        });
        
        if (!jsLoaded) {
            console.log('⚠️  Warning: JavaScript may not have loaded (static files 404?)');
        }
        
        // Debug: Check what tabs are available
        const availableTabs = await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.nav-tab'));
            return tabs.map(t => ({
                text: t.textContent.trim(),
                dataset: t.dataset.tab,
                hasActive: t.classList.contains('active')
            }));
        });
        console.log(`📋 Available tabs: ${JSON.stringify(availableTabs)}`);
        
        // Test all tabs
        const tabs = ['images', 'prompts', 'collections', 'tags', 'stats'];
        for (const tab of tabs) {
            await testPageNavigation(page, tab);
        }
        
        // Test interactions
        await testPageNavigation(page, 'images');
        await testImagesTab(page);
        
        await testPageNavigation(page, 'prompts');
        await testPromptsTab(page);
        
        await testThemeToggle(page);
        
        await page.waitForTimeout(2000);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        testResults.errors.push({
            type: 'test.execution',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    } finally {
        await browser.close();
    }
    
    // Generate report
    generateReport();
}

/**
 * Generate test report
 */
function generateReport() {
    testResults.endTime = new Date();
    testResults.duration = testResults.endTime - testResults.startTime;
    
    const pagesTested = Object.keys(testResults.pages).length;
    const pagesPassed = Object.values(testResults.pages).filter(p => p.status === 'passed').length;
    const interactionsTested = Object.keys(testResults.interactions).length;
    
    console.log('\n============================================================');
    console.log('📊 UI TEST SUMMARY');
    console.log('============================================================');
    console.log(`\n✅ Pages Tested: ${pagesPassed}/${pagesTested}`);
    console.log(`✅ Interactions Tested: ${interactionsTested}`);
    console.log(`❌ JavaScript Errors: ${testResults.errors.length}`);
    console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
    console.log(`⏱️  Duration: ${Math.round(testResults.duration / 1000)}s`);
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ JavaScript errors detected:\n');
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. [${error.type}] ${error.message}`);
            if (error.url) {
                console.log(`   URL: ${error.url}`);
            }
        });
    } else {
        console.log('\n✅ No JavaScript errors found!');
    }
    
    console.log('\n============================================================\n');
    
    if (testResults.errors.length > 0 || pagesPassed < pagesTested) {
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

