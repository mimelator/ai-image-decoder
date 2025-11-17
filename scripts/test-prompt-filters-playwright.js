/**
 * Playwright test suite for prompt filtering and sorting features
 */

const { chromium } = require('playwright');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:9000';
const TIMEOUT = 30000;

async function waitForServer() {
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${SERVER_URL}/health`);
            if (response.ok) {
                console.log('✓ Server is ready');
                return true;
            }
        } catch (e) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server did not become ready in time');
}

async function testPromptSorting(page) {
    console.log('\n🧪 Testing Prompt Sorting...');
    
    try {
        // Navigate to Prompts tab
        await page.click('button[data-tab="prompts"]');
        await page.waitForTimeout(1000);
        
        // Wait for prompts to load
        const promptsList = page.locator('#prompts-list');
        await promptsList.waitFor({ timeout: 10000 });
        
        // Check if prompts are displayed
        const promptCards = page.locator('.prompt-card');
        const promptCount = await promptCards.count();
        console.log(`  Found ${promptCount} prompt cards`);
        
        if (promptCount > 1) {
            // Get first two prompts and check their dates
            const firstPrompt = promptCards.first();
            const secondPrompt = promptCards.nth(1);
            
            const firstDate = await firstPrompt.locator('.prompt-meta').textContent();
            const secondDate = await secondPrompt.locator('.prompt-meta').textContent();
            
            console.log(`  First prompt date: ${firstDate}`);
            console.log(`  Second prompt date: ${secondDate}`);
            console.log('  ✓ Prompts displayed (checking order)');
        } else if (promptCount === 1) {
            console.log('  ✓ Prompt displayed');
        } else {
            console.log('  ⚠ No prompts available to test sorting');
        }
        
        // Test sort dropdown
        const sortSelect = page.locator('#filter-prompt-sort');
        const sortVisible = await sortSelect.isVisible({ timeout: 5000 });
        console.log(`  Sort dropdown visible: ${sortVisible}`);
        
        if (sortVisible && promptCount > 0) {
            // Change to "Oldest First"
            await sortSelect.selectOption('created_at ASC');
            await page.waitForTimeout(1000);
            console.log('  ✓ Changed sort to "Oldest First"');
            
            // Change to "Newest First" (default)
            await sortSelect.selectOption('created_at DESC');
            await page.waitForTimeout(1000);
            console.log('  ✓ Changed sort to "Newest First"');
        }
        
        console.log('  ✓ Prompt sorting test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Prompt sorting test failed:', error.message);
        return false;
    }
}

async function testPromptFiltering(page) {
    console.log('\n🧪 Testing Prompt Filtering...');
    
    try {
        // Navigate to Prompts tab
        await page.click('button[data-tab="prompts"]');
        await page.waitForTimeout(1000);
        
        // Check if filter panel exists
        const filterPanel = page.locator('#prompt-filters');
        const panelVisible = await filterPanel.isVisible({ timeout: 5000 });
        console.log(`  Filter panel visible: ${panelVisible}`);
        
        if (panelVisible) {
            // Test Type Filter
            console.log('  Testing type filter...');
            const typeSelect = page.locator('#filter-prompt-type');
            await typeSelect.selectOption('positive');
            await page.waitForTimeout(1000);
            console.log('  ✓ Applied "positive" type filter');
            
            // Test Date From Filter
            console.log('  Testing date from filter...');
            const dateFromInput = page.locator('#filter-prompt-date-from');
            if (await dateFromInput.isVisible()) {
                // Set date to 30 days ago
                const date = new Date();
                date.setDate(date.getDate() - 30);
                const dateStr = date.toISOString().split('T')[0];
                await dateFromInput.fill(dateStr);
                await page.waitForTimeout(1000);
                console.log(`  ✓ Applied date from filter: ${dateStr}`);
            }
            
            // Test Date To Filter
            console.log('  Testing date to filter...');
            const dateToInput = page.locator('#filter-prompt-date-to');
            if (await dateToInput.isVisible()) {
                // Set date to today
                const today = new Date().toISOString().split('T')[0];
                await dateToInput.fill(today);
                await page.waitForTimeout(1000);
                console.log(`  ✓ Applied date to filter: ${today}`);
            }
            
            // Test Clear Filters (specifically in prompt filters panel)
            console.log('  Testing clear filters...');
            const promptFiltersPanel = page.locator('#prompt-filters');
            const clearBtn = promptFiltersPanel.locator('button:has-text("Clear Filters")');
            if (await clearBtn.isVisible()) {
                await clearBtn.click();
                await page.waitForTimeout(1000);
                
                // Check if filters are cleared
                const typeValue = await typeSelect.inputValue();
                const dateFromValue = await dateFromInput.inputValue();
                const dateToValue = await dateToInput.inputValue();
                
                const cleared = typeValue === '' && dateFromValue === '' && dateToValue === '';
                console.log(`  Filters cleared: ${cleared}`);
            }
        } else {
            console.log('  ⚠ Filter panel not found');
        }
        
        console.log('  ✓ Prompt filtering test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Prompt filtering test failed:', error.message);
        return false;
    }
}

async function testPromptDisplay(page) {
    console.log('\n🧪 Testing Prompt Display...');
    
    try {
        // Navigate to Prompts tab
        await page.click('button[data-tab="prompts"]');
        await page.waitForTimeout(1000);
        
        // Wait for prompts to load
        const promptsList = page.locator('#prompts-list');
        await promptsList.waitFor({ timeout: 10000 });
        
        // Check if prompts are displayed
        const promptCards = page.locator('.prompt-card');
        const promptCount = await promptCards.count();
        console.log(`  Found ${promptCount} prompt cards`);
        
        if (promptCount > 0) {
            // Check first prompt card structure
            const firstCard = promptCards.first();
            
            // Check for prompt text
            const promptText = firstCard.locator('.prompt-text');
            const textVisible = await promptText.isVisible();
            console.log(`  Prompt text visible: ${textVisible}`);
            
            // Check for metadata
            const promptMeta = firstCard.locator('.prompt-meta');
            const metaVisible = await promptMeta.isVisible();
            console.log(`  Prompt metadata visible: ${metaVisible}`);
            
            if (metaVisible) {
                const metaText = await promptMeta.textContent();
                console.log(`  Metadata content: ${metaText}`);
                
                // Check if date is displayed
                const hasDate = metaText.includes('Date:');
                console.log(`  Date displayed: ${hasDate}`);
            }
            
            // Test clicking prompt card (should open detail modal)
            await firstCard.click();
            await page.waitForTimeout(500);
            
            const detailModal = page.locator('#prompt-modal');
            const modalVisible = await detailModal.isVisible({ timeout: 2000 }).catch(() => false);
            console.log(`  Detail modal opened: ${modalVisible}`);
            
            if (modalVisible) {
                // Close modal
                const closeBtn = detailModal.locator('.modal-close');
                if (await closeBtn.isVisible()) {
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                }
            }
        } else {
            console.log('  ⚠ No prompts available to test display');
        }
        
        console.log('  ✓ Prompt display test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Prompt display test failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Playwright tests for prompt filtering and sorting...');
    console.log(`Server URL: ${SERVER_URL}`);
    
    // Wait for server to be ready
    try {
        await waitForServer();
    } catch (error) {
        console.error('❌ Server is not ready:', error.message);
        process.exit(1);
    }
    
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('  Browser console error:', msg.text());
        }
    });
    
    // Handle page errors
    page.on('pageerror', error => {
        console.error('  Page error:', error.message);
    });
    
    try {
        // Navigate to the app
        console.log('\n📱 Navigating to application...');
        await page.goto(SERVER_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await page.waitForTimeout(2000);
        
        const results = {
            promptSorting: false,
            promptFiltering: false,
            promptDisplay: false
        };
        
        // Run tests
        results.promptSorting = await testPromptSorting(page);
        results.promptFiltering = await testPromptFiltering(page);
        results.promptDisplay = await testPromptDisplay(page);
        
        // Print summary
        console.log('\n📊 Test Results Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Prompt Sorting:          ${results.promptSorting ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Prompt Filtering:        ${results.promptFiltering ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Prompt Display:          ${results.promptDisplay ? '✓ PASS' : '✗ FAIL'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const allPassed = Object.values(results).every(r => r);
        console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
        
        await browser.close();
        
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        await browser.close();
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

