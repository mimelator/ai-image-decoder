/**
 * Playwright test suite for prompt search functionality
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

async function testPromptSearch(page) {
    console.log('\n🧪 Testing Prompt Search...');
    
    try {
        // Navigate to Prompts tab
        await page.click('button[data-tab="prompts"]');
        await page.waitForTimeout(1000);
        
        // Wait for prompts to load
        const promptsList = page.locator('#prompts-list');
        await promptsList.waitFor({ timeout: 10000 });
        
        // Get initial prompt count
        const initialCards = page.locator('.prompt-card');
        const initialCount = await initialCards.count();
        console.log(`  Initial prompts displayed: ${initialCount}`);
        
        // Test search input
        const searchInput = page.locator('#prompt-search');
        const searchVisible = await searchInput.isVisible({ timeout: 5000 });
        console.log(`  Search input visible: ${searchVisible}`);
        
        if (searchVisible) {
            // Test search with a term that should return results
            console.log('  Testing search with "detailed"...');
            await searchInput.fill('detailed');
            await page.waitForTimeout(500);
            
            // Click search button or press Enter
            const searchBtn = page.locator('#prompt-search-btn');
            if (await searchBtn.isVisible()) {
                await searchBtn.click();
            } else {
                await searchInput.press('Enter');
            }
            
            await page.waitForTimeout(2000);
            
            // Check if results are displayed
            const searchResults = page.locator('.prompt-card');
            const resultCount = await searchResults.count();
            console.log(`  Search results: ${resultCount} prompts`);
            
            if (resultCount > 0) {
                // Check if results contain search term
                const firstResult = searchResults.first();
                const resultText = await firstResult.locator('.prompt-text').textContent();
                const containsTerm = resultText.toLowerCase().includes('detailed');
                console.log(`  Results contain search term: ${containsTerm}`);
            }
            
            // Clear search
            await searchInput.fill('');
            await searchInput.press('Enter');
            await page.waitForTimeout(1000);
            
            const clearedResults = page.locator('.prompt-card');
            const clearedCount = await clearedResults.count();
            console.log(`  After clearing search: ${clearedCount} prompts`);
        }
        
        console.log('  ✓ Prompt search test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Prompt search test failed:', error.message);
        return false;
    }
}

async function testSearchWithKnownTerms(page) {
    console.log('\n🧪 Testing Search with Known Terms...');
    
    try {
        // Navigate to Prompts tab
        await page.click('button[data-tab="prompts"]');
        await page.waitForTimeout(1000);
        
        const searchInput = page.locator('#prompt-search');
        await searchInput.waitFor({ timeout: 5000 });
        
        // Test multiple search terms that should return results
        const testTerms = ['detailed', 'cute', 'lora', 'adorably', 'alien'];
        const results = [];
        
        for (const term of testTerms) {
            console.log(`  Testing search: "${term}"`);
            await searchInput.fill(term);
            await searchInput.press('Enter');
            await page.waitForTimeout(2000);
            
            const resultCards = page.locator('.prompt-card');
            const count = await resultCards.count();
            const hasResults = count > 0;
            
            results.push({ term, count, hasResults });
            console.log(`    Results: ${count} prompts`);
            
            // Clear for next search
            await searchInput.fill('');
            await searchInput.press('Enter');
            await page.waitForTimeout(1000);
        }
        
        const successfulSearches = results.filter(r => r.hasResults).length;
        console.log(`\n  ✓ Successful searches: ${successfulSearches}/${testTerms.length}`);
        
        if (successfulSearches > 0) {
            console.log('  Top searches with results:');
            results
                .filter(r => r.hasResults)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .forEach(({ term, count }) => {
                    console.log(`    "${term}": ${count} results`);
                });
        }
        
        console.log('  ✓ Known terms search test completed');
        return successfulSearches > 0;
    } catch (error) {
        console.error('  ✗ Known terms search test failed:', error.message);
        return false;
    }
}

async function testSearchAPI(page) {
    console.log('\n🧪 Testing Search API Directly...');
    
    try {
        // Test search API endpoint via page.evaluate
        const searchResults = await page.evaluate(async (serverUrl) => {
            const testTerms = ['detailed', 'cute', 'lora', 'nonexistentterm12345'];
            const results = [];
            
            for (const term of testTerms) {
                try {
                    const response = await fetch(`${serverUrl}/api/v1/search/prompts?q=${encodeURIComponent(term)}`);
                    if (response.ok) {
                        const data = await response.json();
                        results.push({
                            term,
                            success: true,
                            count: data.count || (data.prompts ? data.prompts.length : 0)
                        });
                    } else {
                        results.push({ term, success: false, count: 0 });
                    }
                } catch (error) {
                    results.push({ term, success: false, error: error.message, count: 0 });
                }
            }
            
            return results;
        }, SERVER_URL);
        
        console.log('  API Search Results:');
        searchResults.forEach(({ term, success, count, error }) => {
            if (success) {
                console.log(`    ✓ "${term}": ${count} results`);
            } else {
                console.log(`    ✗ "${term}": ${error || 'Failed'}`);
            }
        });
        
        const successful = searchResults.filter(r => r.success && r.count > 0).length;
        console.log(`\n  ✓ Successful API searches: ${successful}/${searchResults.length}`);
        
        console.log('  ✓ Search API test completed');
        return successful > 0;
    } catch (error) {
        console.error('  ✗ Search API test failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Playwright tests for prompt search...');
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
            promptSearch: false,
            knownTerms: false,
            searchAPI: false
        };
        
        // Run tests
        results.promptSearch = await testPromptSearch(page);
        results.knownTerms = await testSearchWithKnownTerms(page);
        results.searchAPI = await testSearchAPI(page);
        
        // Print summary
        console.log('\n📊 Test Results Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Prompt Search UI:          ${results.promptSearch ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Known Terms Search:        ${results.knownTerms ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Search API:                ${results.searchAPI ? '✓ PASS' : '✗ FAIL'}`);
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

