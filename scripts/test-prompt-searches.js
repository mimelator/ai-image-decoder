/**
 * Test script to find which prompt searches return results
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';

async function waitForServer() {
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${SERVER_URL}/health`);
            if (response.ok) {
                console.log('✓ Server is ready\n');
                return true;
            }
        } catch (e) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server did not become ready in time');
}

async function searchPrompts(query) {
    try {
        // Try both endpoints
        let response = await fetch(`${SERVER_URL}/api/v1/search/prompts?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            // Try alternative endpoint
            response = await fetch(`${SERVER_URL}/api/v1/prompts/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}`, count: 0 };
            }
        }
        const data = await response.json();
        return { success: true, count: data.count || (data.prompts ? data.prompts.length : 0), prompts: data.prompts || [] };
    } catch (error) {
        return { success: false, error: error.message, count: 0 };
    }
}

async function getSamplePrompts() {
    try {
        const response = await fetch(`${SERVER_URL}/api/v1/prompts?limit=50`);
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data.prompts || [];
    } catch (error) {
        console.error('Failed to get sample prompts:', error);
        return [];
    }
}

function extractSearchTerms(prompts) {
    const terms = new Set();
    
    prompts.forEach(prompt => {
        const text = prompt.prompt_text.toLowerCase();
        
        // Extract common words (3+ characters)
        const words = text.split(/\s+/).filter(w => w.length >= 3);
        words.forEach(word => {
            // Remove common punctuation
            const clean = word.replace(/[^\w]/g, '');
            if (clean.length >= 3) {
                terms.add(clean);
            }
        });
        
        // Extract quoted phrases
        const quoted = text.match(/"([^"]+)"/g);
        if (quoted) {
            quoted.forEach(q => {
                const phrase = q.replace(/"/g, '').trim();
                if (phrase.length >= 3) {
                    terms.add(phrase);
                }
            });
        }
        
        // Extract parenthesized terms
        const parens = text.match(/\(([^)]+)\)/g);
        if (parens) {
            parens.forEach(p => {
                const term = p.replace(/[()]/g, '').trim();
                if (term.length >= 3 && !term.includes(':')) {
                    terms.add(term);
                }
            });
        }
    });
    
    return Array.from(terms).slice(0, 50); // Limit to 50 terms
}

async function runTests() {
    console.log('🔍 Testing Prompt Search API...');
    console.log(`Server URL: ${SERVER_URL}\n`);
    
    // Wait for server
    try {
        await waitForServer();
    } catch (error) {
        console.error('❌ Server is not ready:', error.message);
        process.exit(1);
    }
    
    // Get sample prompts to extract search terms
    console.log('📋 Getting sample prompts to extract search terms...');
    const samplePrompts = await getSamplePrompts();
    console.log(`   Found ${samplePrompts.length} sample prompts\n`);
    
    if (samplePrompts.length === 0) {
        console.log('⚠️  No prompts found. Cannot generate search terms.');
        process.exit(1);
    }
    
    // Extract search terms from prompts
    console.log('🔎 Extracting search terms from prompts...');
    const searchTerms = extractSearchTerms(samplePrompts);
    console.log(`   Extracted ${searchTerms.length} potential search terms\n`);
    
    // Test common search queries
    const commonQueries = [
        'detailed',
        'highly detailed',
        'portrait',
        'landscape',
        'cute',
        'beautiful',
        'artistic',
        'realistic',
        'fantasy',
        'anime',
        'digital art',
        'photography',
        '8k',
        '4k',
        'hd',
        'quality',
        'masterpiece',
        'best quality',
        'style',
        'lora'
    ];
    
    console.log('🧪 Testing common search queries...\n');
    const commonResults = [];
    
    for (const query of commonQueries) {
        const result = await searchPrompts(query);
        if (result.success && result.count > 0) {
            commonResults.push({ query, count: result.count });
            console.log(`  ✓ "${query}": ${result.count} results`);
        } else {
            console.log(`  ✗ "${query}": ${result.count} results`);
        }
    }
    
    console.log(`\n📊 Common queries summary: ${commonResults.length}/${commonQueries.length} returned results\n`);
    
    // Test extracted terms (sample)
    console.log('🧪 Testing extracted search terms (first 20)...\n');
    const extractedResults = [];
    const termsToTest = searchTerms.slice(0, 20);
    
    for (const term of termsToTest) {
        const result = await searchPrompts(term);
        if (result.success && result.count > 0) {
            extractedResults.push({ term, count: result.count });
            console.log(`  ✓ "${term}": ${result.count} results`);
        }
        // Don't log failures for extracted terms to reduce noise
    }
    
    console.log(`\n📊 Extracted terms summary: ${extractedResults.length}/${termsToTest.length} returned results\n`);
    
    // Test multi-word queries from actual prompts
    console.log('🧪 Testing multi-word phrases from prompts...\n');
    const phraseResults = [];
    const phrases = [];
    
    // Extract some phrases from prompts
    samplePrompts.slice(0, 10).forEach(prompt => {
        const text = prompt.prompt_text;
        // Extract phrases of 2-4 words
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = words.slice(i, Math.min(i + 3, words.length)).join(' ').toLowerCase();
            if (phrase.length >= 5 && phrase.length < 50) {
                phrases.push(phrase);
            }
        }
    });
    
    const uniquePhrases = [...new Set(phrases)].slice(0, 15);
    
    for (const phrase of uniquePhrases) {
        const result = await searchPrompts(phrase);
        if (result.success && result.count > 0) {
            phraseResults.push({ phrase, count: result.count });
            console.log(`  ✓ "${phrase}": ${result.count} results`);
        }
    }
    
    console.log(`\n📊 Phrase search summary: ${phraseResults.length}/${uniquePhrases.length} returned results\n`);
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 SEARCH RESULTS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Common queries with results:     ${commonResults.length}`);
    console.log(`Extracted terms with results:    ${extractedResults.length}`);
    console.log(`Phrase searches with results:    ${phraseResults.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (commonResults.length > 0) {
        console.log('✅ Top common queries that return results:');
        commonResults
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .forEach(({ query, count }) => {
                console.log(`   "${query}": ${count} results`);
            });
        console.log('');
    }
    
    if (extractedResults.length > 0) {
        console.log('✅ Top extracted terms that return results:');
        extractedResults
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .forEach(({ term, count }) => {
                console.log(`   "${term}": ${count} results`);
            });
        console.log('');
    }
    
    if (phraseResults.length > 0) {
        console.log('✅ Top phrase searches that return results:');
        phraseResults
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .forEach(({ phrase, count }) => {
                console.log(`   "${phrase}": ${count} results`);
            });
        console.log('');
    }
    
    const totalSuccessful = commonResults.length + extractedResults.length + phraseResults.length;
    console.log(`✅ Total successful searches: ${totalSuccessful}`);
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

