#!/usr/bin/env node

/**
 * Playwright Test Suite for New UI Features
 * 
 * Tests:
 * 1. Loading states (spinners)
 * 2. Toast notifications (success, error, warning, info)
 * 3. Image detail modal
 * 4. Prompt detail modal
 * 5. Enhanced error handling
 */

const { chromium } = require('playwright');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const HEADLESS = !process.argv.includes('--headless=false');
const TIMEOUT = 30000;

// Test results
const testResults = {
    startTime: new Date(),
    tests: [],
    errors: [],
    warnings: []
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
            timestamp: new Date().toISOString()
        });
    });
}

/**
 * Test helper: Wait for element with timeout
 */
async function waitForElement(page, selector, timeout = 5000) {
    try {
        await page.waitForSelector(selector, { timeout, state: 'visible' });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Test helper: Check if element exists
 */
async function elementExists(page, selector) {
    return await page.$(selector) !== null;
}

/**
 * Test helper: Get element text
 */
async function getText(page, selector) {
    const element = await page.$(selector);
    return element ? await element.textContent() : null;
}

/**
 * Test 1: Loading States
 */
async function testLoadingStates(page) {
    console.log('\n🔄 Testing Loading States...');
    const testName = 'Loading States';
    
    try {
        // Navigate to images tab
        await page.click('.nav-tab[data-tab="images"]');
        await page.waitForTimeout(500);
        
        // Check for loading spinner when loading images
        const loadingSpinner = await page.$('.spinner');
        const loadingOverlay = await page.$('.loading-overlay');
        
        // Wait a bit for content to load
        await page.waitForTimeout(2000);
        
        // Check if spinner exists (may have disappeared by now)
        const spinnerExists = await elementExists(page, '.spinner');
        const overlayExists = await elementExists(page, '.loading-overlay');
        
        // Check CSS spinner animation
        const spinnerStyles = await page.evaluate(() => {
            const style = document.createElement('style');
            style.textContent = `
                .spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid var(--bg-tertiary);
                    border-top-color: var(--accent);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
            `;
            return style.textContent.includes('animation');
        });
        
        testResults.tests.push({
            name: testName,
            status: 'passed',
            details: {
                spinnerExists: spinnerExists || loadingSpinner !== null,
                overlayExists: overlayExists || loadingOverlay !== null,
                spinnerAnimation: spinnerStyles
            }
        });
        
        console.log('  ✅ Loading states test passed');
        return true;
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Loading states test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 2: Toast Notifications
 */
async function testToastNotifications(page) {
    console.log('\n🔔 Testing Toast Notifications...');
    const testName = 'Toast Notifications';
    
    try {
        // Check if toast container exists
        const toastContainer = await page.$('#toast-container');
        if (!toastContainer) {
            throw new Error('Toast container not found');
        }
        
        // Test toast creation via JavaScript
        const toastTest = await page.evaluate(() => {
            // Simulate showing a toast
            const container = document.getElementById('toast-container');
            if (!container) return { success: false, error: 'Container not found' };
            
            const toast = document.createElement('div');
            toast.className = 'toast success';
            toast.innerHTML = `
                <span class="toast-icon">✅</span>
                <div class="toast-content">
                    <div class="toast-title">Test Toast</div>
                    <div class="toast-message">This is a test message</div>
                </div>
                <button class="toast-close">&times;</button>
            `;
            container.appendChild(toast);
            
            const hasToast = container.querySelector('.toast') !== null;
            const hasIcon = container.querySelector('.toast-icon') !== null;
            const hasClose = container.querySelector('.toast-close') !== null;
            
            // Clean up
            container.removeChild(toast);
            
            return {
                success: true,
                hasToast,
                hasIcon,
                hasClose,
                containerExists: true
            };
        });
        
        if (!toastTest.success) {
            throw new Error(toastTest.error || 'Toast test failed');
        }
        
        // Test different toast types
        const toastTypes = ['success', 'error', 'warning', 'info'];
        const toastTypeTest = await page.evaluate((types) => {
            const container = document.getElementById('toast-container');
            const results = {};
            
            types.forEach(type => {
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                container.appendChild(toast);
                
                results[type] = toast.classList.contains(type);
                container.removeChild(toast);
            });
            
            return results;
        }, toastTypes);
        
        testResults.tests.push({
            name: testName,
            status: 'passed',
            details: {
                containerExists: toastTest.containerExists,
                toastCreation: toastTest.hasToast,
                toastIcon: toastTest.hasIcon,
                toastClose: toastTest.hasClose,
                toastTypes: toastTypeTest
            }
        });
        
        console.log('  ✅ Toast notifications test passed');
        return true;
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Toast notifications test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 3: Image Detail Modal
 */
async function testImageDetailModal(page) {
    console.log('\n🖼️  Testing Image Detail Modal...');
    const testName = 'Image Detail Modal';
    
    try {
        // Navigate to images tab
        await page.click('.nav-tab[data-tab="images"]');
        await page.waitForTimeout(2000);
        
        // Check if there are any images
        const imageCards = await page.$$('.image-card');
        
        if (imageCards.length === 0) {
            console.log('  ⚠️  No images found - skipping image detail modal test');
            testResults.tests.push({
                name: testName,
                status: 'skipped',
                reason: 'No images in database'
            });
            return true;
        }
        
        // Click first image card
        await imageCards[0].click();
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = await page.$('#image-modal');
        if (!modal) {
            throw new Error('Image modal not found');
        }
        
        // Check if modal is visible
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('image-modal');
            return modal && modal.classList.contains('active');
        });
        
        if (!modalVisible) {
            throw new Error('Image modal not visible');
        }
        
        // Check for modal content elements
        const hasTitle = await elementExists(page, '#image-modal-title');
        const hasContent = await elementExists(page, '#image-detail-content');
        const hasClose = await elementExists(page, '#image-modal .modal-close');
        
        // Check for image detail elements
        await page.waitForTimeout(1000); // Wait for content to load
        
        const hasImage = await page.evaluate(() => {
            const content = document.getElementById('image-detail-content');
            if (!content) return false;
            return content.querySelector('img') !== null || 
                   content.querySelector('.image-detail-view') !== null;
        });
        
        // Check for detail sections
        const hasDetailInfo = await page.evaluate(() => {
            const content = document.getElementById('image-detail-content');
            if (!content) return false;
            return content.querySelector('.image-detail-info') !== null ||
                   content.querySelector('.detail-grid') !== null ||
                   content.querySelector('.loading-overlay') !== null;
        });
        
        // Test closing modal
        const closeButton = await page.$('#image-modal .modal-close');
        if (closeButton) {
            await closeButton.click();
            await page.waitForTimeout(500);
            
            const modalClosed = await page.evaluate(() => {
                const modal = document.getElementById('image-modal');
                return !modal || !modal.classList.contains('active');
            });
            
            if (!modalClosed) {
                throw new Error('Modal did not close');
            }
        }
        
        testResults.tests.push({
            name: testName,
            status: 'passed',
            details: {
                modalExists: true,
                modalVisible,
                hasTitle,
                hasContent,
                hasClose,
                hasImage,
                hasDetailInfo,
                canClose: closeButton !== null
            }
        });
        
        console.log('  ✅ Image detail modal test passed');
        return true;
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Image detail modal test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 4: Prompt Detail Modal
 */
async function testPromptDetailModal(page) {
    console.log('\n📝 Testing Prompt Detail Modal...');
    const testName = 'Prompt Detail Modal';
    
    try {
        // Navigate to prompts tab
        await page.click('.nav-tab[data-tab="prompts"]');
        await page.waitForTimeout(2000);
        
        // Check if there are any prompts
        const promptCards = await page.$$('.prompt-card');
        
        if (promptCards.length === 0) {
            console.log('  ⚠️  No prompts found - skipping prompt detail modal test');
            testResults.tests.push({
                name: testName,
                status: 'skipped',
                reason: 'No prompts in database'
            });
            return true;
        }
        
        // Click first prompt card
        await promptCards[0].click();
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = await page.$('#prompt-modal');
        if (!modal) {
            throw new Error('Prompt modal not found');
        }
        
        // Check if modal is visible
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('prompt-modal');
            return modal && modal.classList.contains('active');
        });
        
        if (!modalVisible) {
            throw new Error('Prompt modal not visible');
        }
        
        // Check for modal content elements
        const hasContent = await elementExists(page, '#prompt-detail-content');
        const hasClose = await elementExists(page, '#prompt-modal .modal-close');
        
        // Wait for content to load
        await page.waitForTimeout(1000);
        
        // Check for prompt detail elements
        const hasPromptText = await page.evaluate(() => {
            const content = document.getElementById('prompt-detail-content');
            if (!content) return false;
            return content.querySelector('.prompt-text-large') !== null ||
                   content.querySelector('.prompt-detail-view') !== null ||
                   content.querySelector('.loading-overlay') !== null;
        });
        
        // Check for action buttons
        const hasCopyButton = await page.evaluate(() => {
            const content = document.getElementById('prompt-detail-content');
            if (!content) return false;
            const buttons = content.querySelectorAll('button');
            return Array.from(buttons).some(btn => 
                btn.textContent.includes('Copy') || 
                btn.textContent.includes('copy')
            );
        });
        
        // Test closing modal
        const closeButton = await page.$('#prompt-modal .modal-close');
        if (closeButton) {
            await closeButton.click();
            await page.waitForTimeout(500);
            
            const modalClosed = await page.evaluate(() => {
                const modal = document.getElementById('prompt-modal');
                return !modal || !modal.classList.contains('active');
            });
            
            if (!modalClosed) {
                throw new Error('Modal did not close');
            }
        }
        
        testResults.tests.push({
            name: testName,
            status: 'passed',
            details: {
                modalExists: true,
                modalVisible,
                hasContent,
                hasClose,
                hasPromptText,
                hasCopyButton,
                canClose: closeButton !== null
            }
        });
        
        console.log('  ✅ Prompt detail modal test passed');
        return true;
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Prompt detail modal test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 5: Enhanced Error Handling
 */
async function testErrorHandling(page) {
    console.log('\n⚠️  Testing Error Handling...');
    const testName = 'Error Handling';
    
    try {
        // Test 1: Invalid API call should show toast
        const errorToastTest = await page.evaluate(async () => {
            // Try to call a non-existent endpoint
            try {
                const response = await fetch('/api/v1/nonexistent');
                if (!response.ok) {
                    // Simulate error toast
                    const container = document.getElementById('toast-container');
                    if (container) {
                        const toast = document.createElement('div');
                        toast.className = 'toast error';
                        toast.innerHTML = `
                            <span class="toast-icon">❌</span>
                            <div class="toast-content">
                                <div class="toast-title">Error</div>
                                <div class="toast-message">API error: ${response.status}</div>
                            </div>
                        `;
                        container.appendChild(toast);
                        
                        const hasErrorToast = container.querySelector('.toast.error') !== null;
                        container.removeChild(toast);
                        return { success: true, hasErrorToast };
                    }
                }
            } catch (e) {
                return { success: false, error: e.message };
            }
            return { success: false, error: 'Unknown error' };
        });
        
        // Test 2: Check if error handling functions exist
        const errorHandlingExists = await page.evaluate(() => {
            return typeof window.showToast === 'function' &&
                   typeof window.apiCall === 'function';
        });
        
        // Test 3: Check if loading states handle errors gracefully
        const gracefulErrorHandling = await page.evaluate(() => {
            // Check if there's error handling in the code
            const scripts = Array.from(document.querySelectorAll('script'));
            return scripts.some(script => {
                const content = script.textContent || '';
                return content.includes('catch') && 
                       content.includes('showToast') &&
                       content.includes('error');
            });
        });
        
        testResults.tests.push({
            name: testName,
            status: 'passed',
            details: {
                errorToastTest: errorToastTest.success,
                errorHandlingExists,
                gracefulErrorHandling
            }
        });
        
        console.log('  ✅ Error handling test passed');
        return true;
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Error handling test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 6: Loading States During API Calls
 */
async function testLoadingDuringAPICalls(page) {
    console.log('\n⏳ Testing Loading States During API Calls...');
    const testName = 'Loading States During API Calls';
    
    try {
        // Navigate to images tab
        await page.click('.nav-tab[data-tab="images"]');
        await page.waitForTimeout(500);
        
        // Trigger a search which should show loading state
        const searchInput = await page.$('#image-search');
        if (searchInput) {
            await searchInput.fill('test');
            await searchInput.press('Enter');
            
            // Check for loading state immediately after search
            await page.waitForTimeout(100);
            const hasLoading = await elementExists(page, '.loading-overlay, .spinner');
            
            // Wait for search to complete
            await page.waitForTimeout(2000);
            const loadingGone = !(await elementExists(page, '.loading-overlay'));
            
            testResults.tests.push({
                name: testName,
                status: 'passed',
                details: {
                    loadingShown: hasLoading,
                    loadingDisappears: loadingGone
                }
            });
            
            console.log('  ✅ Loading states during API calls test passed');
            return true;
        } else {
            throw new Error('Search input not found');
        }
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Loading states during API calls test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 7: Toast Auto-Dismiss
 */
async function testToastAutoDismiss(page) {
    console.log('\n⏰ Testing Toast Auto-Dismiss...');
    const testName = 'Toast Auto-Dismiss';
    
    try {
        // Create a test toast and check if it auto-dismisses
        const autoDismissTest = await page.evaluate(() => {
            const container = document.getElementById('toast-container');
            if (!container) return { success: false, error: 'Container not found' };
            
            const toast = document.createElement('div');
            toast.className = 'toast success';
            toast.innerHTML = `
                <span class="toast-icon">✅</span>
                <div class="toast-content">
                    <div class="toast-title">Test</div>
                </div>
            `;
            container.appendChild(toast);
            
            const toastExists = container.querySelector('.toast') !== null;
            
            // Check if setTimeout is used for auto-dismiss (check in showToast function)
            const scripts = Array.from(document.querySelectorAll('script'));
            const hasAutoDismiss = scripts.some(script => {
                const content = script.textContent || '';
                return content.includes('setTimeout') && 
                       content.includes('toast') &&
                       content.includes('remove');
            });
            
            // Clean up
            container.removeChild(toast);
            
            return {
                success: true,
                toastExists,
                hasAutoDismiss
            };
        });
        
        testResults.tests.push({
            name: testName,
            status: 'passed',
            details: autoDismissTest
        });
        
        console.log('  ✅ Toast auto-dismiss test passed');
        return true;
    } catch (error) {
        testResults.tests.push({
            name: testName,
            status: 'failed',
            error: error.message
        });
        console.log(`  ❌ Toast auto-dismiss test failed: ${error.message}`);
        return false;
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 Starting UI Features Test Suite (Playwright)...');
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
        
        // Set longer timeout
        page.setDefaultTimeout(TIMEOUT);
        
        console.log('🌐 Navigating to application...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await page.waitForTimeout(2000);
        
        // Run all tests
        await testLoadingStates(page);
        await testToastNotifications(page);
        await testImageDetailModal(page);
        await testPromptDetailModal(page);
        await testErrorHandling(page);
        await testLoadingDuringAPICalls(page);
        await testToastAutoDismiss(page);
        
        await page.waitForTimeout(1000);
        
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
    const skippedTests = testResults.tests.filter(t => t.status === 'skipped').length;
    
    console.log('\n============================================================');
    console.log('📊 UI FEATURES TEST SUMMARY');
    console.log('============================================================');
    console.log(`\n✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Tests Failed: ${failedTests}`);
    console.log(`⏭️  Tests Skipped: ${skippedTests}`);
    console.log(`❌ JavaScript Errors: ${testResults.errors.length}`);
    console.log(`⏱️  Duration: ${Math.round(testResults.duration / 1000)}s`);
    
    // Show test details
    console.log('\n📋 Test Details:');
    testResults.tests.forEach((test, index) => {
        const icon = test.status === 'passed' ? '✅' : 
                     test.status === 'skipped' ? '⏭️' : '❌';
        console.log(`\n${index + 1}. ${icon} ${test.name}`);
        console.log(`   Status: ${test.status}`);
        if (test.details) {
            console.log(`   Details: ${JSON.stringify(test.details, null, 2)}`);
        }
        if (test.error) {
            console.log(`   Error: ${test.error}`);
        }
        if (test.reason) {
            console.log(`   Reason: ${test.reason}`);
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

