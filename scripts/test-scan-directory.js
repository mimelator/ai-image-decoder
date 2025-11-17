/**
 * Test script to scan a specific directory
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';

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

async function scanDirectory(directoryPath) {
    console.log(`\n📁 Scanning directory: ${directoryPath}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        // Start scan
        const scanResponse = await fetch(`${SERVER_URL}/api/v1/images/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: directoryPath,
                recursive: true
            })
        });
        
        if (!scanResponse.ok) {
            const errorText = await scanResponse.text();
            throw new Error(`Scan failed: ${scanResponse.status} - ${errorText}`);
        }
        
        console.log('✓ Scan started successfully');
        
        // Poll for scan status
        let isScanning = true;
        let lastProgress = null;
        
        while (isScanning) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
            
            const statusResponse = await fetch(`${SERVER_URL}/api/v1/images/scan/status`);
            if (!statusResponse.ok) {
                throw new Error('Failed to get scan status');
            }
            
            const status = await statusResponse.json();
            
            if (status.status === 'idle') {
                isScanning = false;
                console.log('\n✓ Scan completed!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('Final Results:');
                console.log(`  Total files:     ${status.progress?.total_files || 0}`);
                console.log(`  Processed:       ${status.progress?.processed || 0}`);
                console.log(`  Skipped:         ${status.progress?.skipped || 0}`);
                console.log(`  Errors:          ${status.progress?.errors || 0}`);
                
                if (status.progress?.total_files > 0) {
                    const percent = ((status.progress.processed / status.progress.total_files) * 100).toFixed(1);
                    console.log(`  Success rate:    ${percent}%`);
                }
                break;
            } else if (status.status === 'scanning') {
                const progress = status.progress;
                if (progress && progress !== lastProgress) {
                    const percent = progress.total_files > 0 
                        ? ((progress.processed / progress.total_files) * 100).toFixed(1)
                        : '0.0';
                    
                    const current = progress.current_file 
                        ? progress.current_file.split('/').pop() 
                        : '...';
                    
                    console.log(`  Progress: ${progress.processed}/${progress.total_files} (${percent}%) - ${current}`);
                    lastProgress = progress;
                }
            }
        }
        
        // Get collection info
        console.log('\n📚 Checking collections...');
        const collectionsResponse = await fetch(`${SERVER_URL}/api/v1/collections`);
        if (collectionsResponse.ok) {
            const collectionsData = await collectionsResponse.json();
            const collections = collectionsData.collections || [];
            
            // Find collections related to this scan
            const relatedCollections = collections.filter(c => 
                c.folder_path && c.folder_path.includes(directoryPath.split('/').pop())
            );
            
            if (relatedCollections.length > 0) {
                console.log(`\n✓ Found ${relatedCollections.length} collection(s) created from this scan:`);
                relatedCollections.forEach(c => {
                    console.log(`  - ${c.name}`);
                    console.log(`    Folder: ${c.folder_path}`);
                });
            } else {
                console.log('  No collections found (may need to check all collections)');
            }
        }
        
        // Get stats
        console.log('\n📊 Current Statistics:');
        const statsResponse = await fetch(`${SERVER_URL}/api/v1/stats`);
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log(`  Total images:     ${stats.images?.total || 0}`);
            console.log(`  Total prompts:     ${stats.prompts?.total || 0}`);
            console.log(`  Total collections: ${stats.collections?.total || 0}`);
        }
        
        console.log('\n✅ Test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return false;
    }
}

async function main() {
    const directoryPath = process.argv[2];
    
    if (!directoryPath) {
        console.error('Usage: node test-scan-directory.js <directory-path>');
        process.exit(1);
    }
    
    console.log('🚀 Starting directory scan test...');
    console.log(`Server URL: ${SERVER_URL}`);
    
    // Wait for server
    try {
        await waitForServer();
    } catch (error) {
        console.error('❌ Server is not ready:', error.message);
        process.exit(1);
    }
    
    // Run scan
    const success = await scanDirectory(directoryPath);
    process.exit(success ? 0 : 1);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

