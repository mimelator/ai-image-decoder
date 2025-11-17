#!/usr/bin/env node

/**
 * Playwright Test for Collection Creation
 * Tests scanning a directory and verifying collections are created
 */

const { chromium } = require('playwright');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TEST_DIRECTORY = process.argv[2] || '/Volumes/5bits/StoryTime/Vol1Ep3DanceParty/Vol1Ep3DanceParty_BillieV2';
const HEADLESS = !process.argv.includes('--headless=false');

// Test results
const testResults = {
    startTime: new Date(),
    tests: [],
    errors: []
};

/**
 * Setup error listeners
 */
function setupErrorListeners(page) {
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error' && !text.includes('favicon')) {
            testResults.errors.push({
                type: 'console.error',
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
}

/**
 * Wait for element with timeout
 */
async function waitForElement(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { timeout, state: 'visible' });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Test collection creation via scan
 */
async function testCollectionCreation(page) {
    console.log('\n📁 Testing Collection Creation...');
    console.log(`   Directory: ${TEST_DIRECTORY}`);
    
    try {
        // Step 1: Get initial collection count
        const initialCollections = await page.evaluate(async () => {
            const response = await fetch('/api/v1/collections');
            const data = await response.json();
            return data.collections ? data.collections.length : 0;
        });
        
        console.log(`   Initial collections: ${initialCollections}`);
        
        // Step 2: Open scan modal
        const scanButton = await page.$('#scan-btn');
        if (!scanButton) {
            throw new Error('Scan button not found');
        }
        
        await scanButton.click();
        await page.waitForTimeout(500);
        
        // Step 3: Check if modal opened
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('scan-modal');
            return modal && modal.classList.contains('active');
        });
        
        if (!modalVisible) {
            throw new Error('Scan modal did not open');
        }
        
        console.log('   ✅ Scan modal opened');
        
        // Step 4: Enter directory path
        const pathInput = await page.$('#scan-path');
        if (!pathInput) {
            throw new Error('Scan path input not found');
        }
        
        await pathInput.fill(TEST_DIRECTORY);
        console.log(`   ✅ Entered directory path: ${TEST_DIRECTORY}`);
        
        // Step 5: Check recursive checkbox
        const recursiveCheckbox = await page.$('#scan-recursive');
        if (recursiveCheckbox) {
            await recursiveCheckbox.check();
            console.log('   ✅ Recursive scanning enabled');
        }
        
        // Step 6: Start scan
        const startButton = await page.$('#scan-start-btn');
        if (!startButton) {
            throw new Error('Start scan button not found');
        }
        
        // Listen for network requests to verify scan API call
        let scanApiCalled = false;
        let scanApiError = null;
        page.on('response', response => {
            if (response.url().includes('/api/v1/images/scan') && response.request().method() === 'POST') {
                scanApiCalled = true;
                if (!response.ok()) {
                    scanApiError = `API returned ${response.status()}: ${response.statusText()}`;
                }
            }
        });
        
        await startButton.click();
        console.log('   ✅ Scan button clicked');
        
        // Wait a moment for the API call to be made
        await page.waitForTimeout(1000);
        
        // Verify the API was called
        if (!scanApiCalled) {
            throw new Error('Scan API endpoint was not called - scan may not have started');
        }
        
        if (scanApiError) {
            throw new Error(`Scan API error: ${scanApiError}`);
        }
        
        console.log('   ✅ Scan API called successfully');
        
        // Step 7: Verify scan status shows "scanning"
        let scanStatusVerified = false;
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(500);
            const status = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/v1/images/scan/status');
                    const data = await response.json();
                    return data.status || 'unknown';
                } catch (e) {
                    return 'error';
                }
            });
            
            if (status === 'scanning') {
                scanStatusVerified = true;
                console.log('   ✅ Scan status confirmed: scanning');
                break;
            }
        }
        
        if (!scanStatusVerified) {
            // Check what status we got
            const currentStatus = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/v1/images/scan/status');
                    return await response.json();
                } catch (e) {
                    return { error: e.message };
                }
            });
            throw new Error(`Scan did not start - status: ${JSON.stringify(currentStatus)}`);
        }
        
        // Step 8: Wait for progress bar to appear
        const progressBarVisible = await waitForElement(page, '#scan-progress', 5000);
        if (!progressBarVisible) {
            throw new Error('Progress bar did not appear');
        }
        console.log('   ✅ Progress bar appeared');
        
        // Step 9: Monitor scan progress
        let scanComplete = false;
        let lastProcessed = 0;
        const maxWaitTime = 300000; // 5 minutes max
        const startTime = Date.now();
        
        while (!scanComplete && (Date.now() - startTime) < maxWaitTime) {
            await page.waitForTimeout(2000); // Check every 2 seconds
            
            const progress = await page.evaluate(() => {
                const currentEl = document.getElementById('progress-current');
                const totalEl = document.getElementById('progress-total');
                const statusEl = document.getElementById('scan-status');
                
                return {
                    current: currentEl ? parseInt(currentEl.textContent) || 0 : 0,
                    total: totalEl ? parseInt(totalEl.textContent) || 0 : 0,
                    status: statusEl ? statusEl.textContent : '',
                    progressVisible: document.getElementById('scan-progress') && 
                                    !document.getElementById('scan-progress').classList.contains('hidden')
                };
            });
            
            if (progress.current > lastProcessed) {
                console.log(`   📊 Progress: ${progress.current}/${progress.total} - ${progress.status}`);
                lastProcessed = progress.current;
            }
            
            // Check if scan is complete (modal closed or status idle)
            const scanStatus = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/v1/images/scan/status');
                    const data = await response.json();
                    return data.status || 'unknown';
                } catch (e) {
                    return 'error';
                }
            });
            
            const modalStillOpen = await page.evaluate(() => {
                const modal = document.getElementById('scan-modal');
                return modal && modal.classList.contains('active');
            });
            
            if (scanStatus === 'idle' && !modalStillOpen) {
                scanComplete = true;
                console.log('   ✅ Scan completed');
                break;
            }
            
            // Check for errors
            if (progress.status && progress.status.includes('Error')) {
                throw new Error(`Scan error: ${progress.status}`);
            }
        }
        
        if (!scanComplete) {
            throw new Error('Scan did not complete within timeout');
        }
        
        // Step 9: Wait a bit for collections to be created
        await page.waitForTimeout(2000);
        
        // Step 10: Check collections were created
        const finalCollections = await page.evaluate(async () => {
            const response = await fetch('/api/v1/collections');
            const data = await response.json();
            return data.collections || [];
        });
        
        console.log(`   Final collections: ${finalCollections.length}`);
        
        // Step 12: Verify collection for test directory exists
        const expectedFolderName = TEST_DIRECTORY.split('/').pop();
        const matchingCollection = finalCollections.find(col => 
            col.folder_path && col.folder_path.includes(expectedFolderName)
        );
        
        if (!matchingCollection) {
            console.log('   ⚠️  Collection for test directory not found');
            console.log('   Available collections:');
            finalCollections.forEach(col => {
                console.log(`      - ${col.name} (${col.folder_path || 'no path'})`);
            });
        } else {
            console.log(`   ✅ Collection found: ${matchingCollection.name}`);
            console.log(`      Path: ${matchingCollection.folder_path}`);
            console.log(`      ID: ${matchingCollection.id}`);
        }
        
        // Step 13: Check if images were assigned to collection
        if (matchingCollection) {
            const collectionImages = await page.evaluate(async (collectionId) => {
                const response = await fetch(`/api/v1/collections/${collectionId}`);
                const data = await response.json();
                // Note: This endpoint might not return images, so we'll check via images API
                return data;
            }, matchingCollection.id);
            
            // Check images API for images in that folder
            const imagesInFolder = await page.evaluate(async (folderPath) => {
                const response = await fetch('/api/v1/images?limit=1000');
                const data = await response.json();
                const images = data.images || [];
                return images.filter(img => img.file_path && img.file_path.includes(folderPath));
            }, expectedFolderName);
            
            console.log(`   📊 Images in folder: ${imagesInFolder.length}`);
        }
        
        testResults.tests.push({
            name: 'Collection Creation',
            status: matchingCollection ? 'passed' : 'failed',
            details: {
                initialCollections,
                finalCollections: finalCollections.length,
                collectionCreated: matchingCollection !== undefined,
                collectionName: matchingCollection?.name,
                collectionPath: matchingCollection?.folder_path
            }
        });
        
        return matchingCollection !== undefined;
        
    } catch (error) {
        testResults.tests.push({
            name: 'Collection Creation',
            status: 'failed',
            error: error.message
        });
        console.log(`   ❌ Test failed: ${error.message}`);
        return false;
    }
}

/**
 * Run tests
 */
async function runTests() {
    console.log('🚀 Starting Collection Creation Test...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`📁 Test Directory: ${TEST_DIRECTORY}`);
    console.log(`👁️  Headless: ${HEADLESS}`);
    console.log('============================================================\n');
    
    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        setupErrorListeners(page);
        page.setDefaultTimeout(300000); // 5 minutes
        
        console.log('🌐 Navigating to application...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Run test
        const passed = await testCollectionCreation(page);
        
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
    
    const totalTests = testResults.tests.length;
    const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
    const failedTests = testResults.tests.filter(t => t.status === 'failed').length;
    
    console.log('\n============================================================');
    console.log('📊 COLLECTION CREATION TEST SUMMARY');
    console.log('============================================================');
    console.log(`\n✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Tests Failed: ${failedTests}`);
    console.log(`❌ JavaScript Errors: ${testResults.errors.length}`);
    console.log(`⏱️  Duration: ${Math.round(testResults.duration / 1000)}s`);
    
    // Show test details
    console.log('\n📋 Test Details:');
    testResults.tests.forEach((test, index) => {
        const icon = test.status === 'passed' ? '✅' : '❌';
        console.log(`\n${index + 1}. ${icon} ${test.name}`);
        console.log(`   Status: ${test.status}`);
        if (test.details) {
            console.log(`   Details: ${JSON.stringify(test.details, null, 2)}`);
        }
        if (test.error) {
            console.log(`   Error: ${test.error}`);
        }
    });
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ JavaScript errors detected:\n');
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. [${error.type}] ${error.message}`);
        });
    } else {
        console.log('\n✅ No JavaScript errors found!');
    }
    
    console.log('\n============================================================\n');
    
    // Exit with error code if tests failed
    if (failedTests > 0 || testResults.errors.length > 0) {
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

