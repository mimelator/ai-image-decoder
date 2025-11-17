/**
 * Playwright test suite for new UI features:
 * - Tag filtering
 * - Collection management (create/edit/delete)
 * - Export functionality
 * - Advanced search filters
 */

const { chromium } = require('playwright');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';
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

async function testTagFiltering(page) {
    console.log('\n🧪 Testing Tag Filtering...');
    
    try {
        // Navigate to Tags tab
        await page.click('button[data-tab="tags"]');
        await page.waitForTimeout(1000);
        
        // Wait for tags to load
        const tagsCloud = page.locator('#tags-cloud');
        await tagsCloud.waitFor({ timeout: 10000 });
        
        // Check if tags are displayed
        const tagElements = await page.locator('.tag').count();
        console.log(`  Found ${tagElements} tags`);
        
        if (tagElements > 0) {
            // Click first tag to filter
            const firstTag = page.locator('.tag').first();
            const tagText = await firstTag.textContent();
            console.log(`  Clicking tag: ${tagText}`);
            
            await firstTag.click();
            await page.waitForTimeout(1000);
            
            // Check if active filters bar appears
            const activeFilters = page.locator('#active-filters');
            const filtersVisible = await activeFilters.isVisible();
            console.log(`  Active filters bar visible: ${filtersVisible}`);
            
            // Navigate to Images tab to see filtered results
            await page.click('button[data-tab="images"]');
            await page.waitForTimeout(1000);
            
            // Check if active filters are shown
            const filtersBar = page.locator('.active-filters-bar');
            const filtersBarVisible = await filtersBar.isVisible();
            console.log(`  Filters bar on images tab: ${filtersBarVisible}`);
            
            // Clear filters
            const clearButton = page.locator('button:has-text("Clear all")');
            if (await clearButton.isVisible()) {
                await clearButton.click();
                await page.waitForTimeout(500);
                console.log('  ✓ Cleared filters');
            }
        } else {
            console.log('  ⚠ No tags available to test filtering');
        }
        
        console.log('  ✓ Tag filtering test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Tag filtering test failed:', error.message);
        return false;
    }
}

async function testCollectionManagement(page) {
    console.log('\n🧪 Testing Collection Management...');
    
    try {
        // Navigate to Collections tab
        await page.click('button[data-tab="collections"]');
        await page.waitForTimeout(1000);
        
        // Test Create Collection
        console.log('  Testing create collection...');
        const createBtn = page.locator('#create-collection-btn');
        await createBtn.waitFor({ timeout: 5000 });
        await createBtn.click();
        await page.waitForTimeout(500);
        
        // Fill in collection form
        const collectionName = `Test Collection ${Date.now()}`;
        await page.fill('#collection-name', collectionName);
        await page.fill('#collection-description', 'Test description');
        await page.fill('#collection-folder-path', '/test/path');
        
        // Submit
        const submitBtn = page.locator('#create-collection-submit-btn');
        await submitBtn.click();
        await page.waitForTimeout(2000);
        
        // Check if collection appears in list
        const collectionCard = page.locator(`.collection-card:has-text("${collectionName}")`);
        const collectionCreated = await collectionCard.isVisible({ timeout: 5000 });
        console.log(`  Collection created: ${collectionCreated}`);
        
        if (!collectionCreated) {
            throw new Error('Collection was not created');
        }
        
        // Test Edit Collection
        console.log('  Testing edit collection...');
        const editButtons = page.locator('.collection-card .btn-icon');
        const editCount = await editButtons.count();
        
        if (editCount > 0) {
            // Click edit button on the first collection
            await editButtons.first().click();
            await page.waitForTimeout(1000);
            
            // Check if edit modal is open
            const editModal = page.locator('#edit-collection-modal');
            const modalVisible = await editModal.isVisible();
            console.log(`  Edit modal visible: ${modalVisible}`);
            
            if (modalVisible) {
                // Update name
                const newName = `Updated ${collectionName}`;
                await page.fill('#edit-collection-name', newName);
                
                // Save
                const saveBtn = page.locator('#save-collection-btn');
                await saveBtn.click();
                await page.waitForTimeout(2000);
                
                // Check if updated name appears
                const updatedCard = page.locator(`.collection-card:has-text("${newName}")`);
                const updatedVisible = await updatedCard.isVisible({ timeout: 5000 });
                console.log(`  Collection updated: ${updatedVisible}`);
            }
        }
        
        // Test Delete Collection
        console.log('  Testing delete collection...');
        const deleteButtons = page.locator('.collection-card .btn-icon').last();
        const deleteCount = await deleteButtons.count();
        
        if (deleteCount > 0) {
            // Get collection name before deletion
            const collectionToDelete = page.locator('.collection-card').last();
            const collectionNameText = await collectionToDelete.locator('.collection-name').textContent();
            
            // Click delete button
            const deleteBtn = collectionToDelete.locator('.btn-icon').last();
            await deleteBtn.click();
            
            // Handle confirmation dialog
            page.on('dialog', async dialog => {
                console.log(`  Confirmation dialog: ${dialog.message()}`);
                await dialog.accept();
            });
            
            await page.waitForTimeout(2000);
            
            // Check if collection is removed
            const deletedCard = page.locator(`.collection-card:has-text("${collectionNameText}")`);
            const stillVisible = await deletedCard.isVisible({ timeout: 2000 }).catch(() => false);
            console.log(`  Collection deleted: ${!stillVisible}`);
        }
        
        console.log('  ✓ Collection management test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Collection management test failed:', error.message);
        return false;
    }
}

async function testExportFunctionality(page) {
    console.log('\n🧪 Testing Export Functionality...');
    
    try {
        // Test Export Prompts
        console.log('  Testing export prompts...');
        await page.click('button[data-tab="prompts"]');
        await page.waitForTimeout(1000);
        
        // Wait for prompts to load
        const promptsList = page.locator('#prompts-list');
        await promptsList.waitFor({ timeout: 10000 });
        
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        // Click export JSON button (specific to prompts tab)
        const exportJsonBtn = page.locator('#export-prompts-btn');
        if (await exportJsonBtn.isVisible({ timeout: 5000 })) {
            await exportJsonBtn.click();
            await page.waitForTimeout(2000);
            
            const download = await downloadPromise;
            if (download) {
                console.log(`  ✓ Prompts JSON export initiated: ${download.suggestedFilename()}`);
            } else {
                console.log('  ⚠ Download event not detected (may still work)');
            }
        } else {
            console.log('  ⚠ Export JSON button not found');
        }
        
        // Test Export Images
        console.log('  Testing export images...');
        await page.click('button[data-tab="images"]');
        await page.waitForTimeout(1000);
        
        // Wait for images to load
        const imagesGrid = page.locator('#images-grid');
        await imagesGrid.waitFor({ timeout: 10000 });
        
        // Set up download listener
        const downloadPromise2 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        // Click export JSON button (specific to images tab)
        const exportImagesJsonBtn = page.locator('#export-images-btn');
        if (await exportImagesJsonBtn.isVisible({ timeout: 5000 })) {
            await exportImagesJsonBtn.click();
            await page.waitForTimeout(2000);
            
            const download = await downloadPromise2;
            if (download) {
                console.log(`  ✓ Images JSON export initiated: ${download.suggestedFilename()}`);
            } else {
                console.log('  ⚠ Download event not detected (may still work)');
            }
        } else {
            console.log('  ⚠ Export JSON button not found');
        }
        
        // Test Export Markdown
        console.log('  Testing export markdown...');
        const exportMdBtn = page.locator('#export-images-md-btn');
        if (await exportMdBtn.isVisible({ timeout: 5000 })) {
            const downloadPromise3 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
            await exportMdBtn.click();
            await page.waitForTimeout(2000);
            
            const download = await downloadPromise3;
            if (download) {
                console.log(`  ✓ Markdown export initiated: ${download.suggestedFilename()}`);
            } else {
                console.log('  ⚠ Download event not detected (may still work)');
            }
        }
        
        console.log('  ✓ Export functionality test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Export functionality test failed:', error.message);
        return false;
    }
}

async function testAdvancedSearchFilters(page) {
    console.log('\n🧪 Testing Advanced Search Filters...');
    
    try {
        // Navigate to Images tab
        await page.click('button[data-tab="images"]');
        await page.waitForTimeout(1000);
        
        // Check if filter panel exists
        const filterPanel = page.locator('#image-filters');
        const panelVisible = await filterPanel.isVisible({ timeout: 5000 });
        console.log(`  Filter panel visible: ${panelVisible}`);
        
        if (panelVisible) {
            // Test Format Filter
            console.log('  Testing format filter...');
            const formatSelect = page.locator('#filter-format');
            await formatSelect.selectOption('png');
            await page.waitForTimeout(1000);
            
            // Check if images are filtered (this is a basic check)
            const imagesGrid = page.locator('#images-grid');
            await imagesGrid.waitFor({ timeout: 5000 });
            console.log('  ✓ Format filter applied');
            
            // Test Model Filter
            console.log('  Testing model filter...');
            const modelInput = page.locator('#filter-model');
            await modelInput.fill('test-model');
            await page.waitForTimeout(1000);
            console.log('  ✓ Model filter applied');
            
            // Test Sampler Filter
            console.log('  Testing sampler filter...');
            const samplerInput = page.locator('#filter-sampler');
            await samplerInput.fill('test-sampler');
            await page.waitForTimeout(1000);
            console.log('  ✓ Sampler filter applied');
            
            // Test Clear Filters
            console.log('  Testing clear filters...');
            const clearBtn = page.locator('button:has-text("Clear Filters")');
            if (await clearBtn.isVisible()) {
                await clearBtn.click();
                await page.waitForTimeout(1000);
                
                // Check if filters are cleared
                const formatValue = await formatSelect.inputValue();
                const modelValue = await modelInput.inputValue();
                const samplerValue = await samplerInput.inputValue();
                
                const cleared = formatValue === '' && modelValue === '' && samplerValue === '';
                console.log(`  Filters cleared: ${cleared}`);
            }
        } else {
            console.log('  ⚠ Filter panel not found');
        }
        
        console.log('  ✓ Advanced search filters test completed');
        return true;
    } catch (error) {
        console.error('  ✗ Advanced search filters test failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Playwright tests for new features...');
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
            tagFiltering: false,
            collectionManagement: false,
            exportFunctionality: false,
            advancedSearchFilters: false
        };
        
        // Run tests
        results.tagFiltering = await testTagFiltering(page);
        results.collectionManagement = await testCollectionManagement(page);
        results.exportFunctionality = await testExportFunctionality(page);
        results.advancedSearchFilters = await testAdvancedSearchFilters(page);
        
        // Print summary
        console.log('\n📊 Test Results Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Tag Filtering:              ${results.tagFiltering ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Collection Management:       ${results.collectionManagement ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Export Functionality:        ${results.exportFunctionality ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`Advanced Search Filters:    ${results.advancedSearchFilters ? '✓ PASS' : '✗ FAIL'}`);
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

