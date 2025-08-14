const HeadedCAScraper = require('./headed-scraper');

async function testHeadedScraper() {
    console.log('🧪 Testing headed CA scraper...');
    
    const scraper = new HeadedCAScraper();
    
    try {
        console.log('🚀 Initializing browser...');
        await scraper.init();
        
        console.log('🔍 Navigating to search page...');
        await scraper.navigateToSearchPage();
        
        console.log('📝 Testing form filling...');
        await scraper.fillSearchForm();
        
        console.log('⏸️  Pausing for manual verification...');
        console.log('👀 Check that postcode "3000" is entered in the form');
        console.log('⌨️  Press Enter to continue or Ctrl+C to abort');
        
        // Wait for user input
        await new Promise(resolve => {
            process.stdin.once('data', () => {
                resolve();
            });
        });
        
        console.log('🚀 Executing search...');
        await scraper.executeSearch();
        
        console.log('⏸️  Pausing to check results page...');
        console.log('👀 Verify that search results are displayed');
        console.log('⌨️  Press Enter to continue with Load More automation');
        
        await new Promise(resolve => {
            process.stdin.once('data', () => {
                resolve();
            });
        });
        
        console.log('🔄 Testing Load More automation (will click a few times)...');
        
        // Test just a few Load More clicks for testing
        let clickCount = 0;
        const maxTestClicks = 3;
        
        while (clickCount < maxTestClicks) {
            try {
                const loadMoreButton = scraper.page.locator('button.btn-result, .btn-result').first();
                const altLoadMoreButton = scraper.page.locator('button').filter({
                    hasText: /load more/i
                }).first();
                
                let buttonToClick = null;
                
                if (await loadMoreButton.isVisible() && await loadMoreButton.isEnabled()) {
                    buttonToClick = loadMoreButton;
                } else if (await altLoadMoreButton.isVisible() && await altLoadMoreButton.isEnabled()) {
                    buttonToClick = altLoadMoreButton;
                }
                
                if (buttonToClick) {
                    console.log(`📥 Test clicking Load More (${clickCount + 1}/${maxTestClicks})...`);
                    await buttonToClick.click();
                    clickCount++;
                    await scraper.page.waitForTimeout(3000);
                } else {
                    console.log('✅ No Load More button found');
                    break;
                }
            } catch (error) {
                console.log('❌ Error during Load More test:', error.message);
                break;
            }
        }
        
        console.log('📊 Testing data extraction...');
        const extractedData = await scraper.extractMemberData();
        
        console.log('✅ Test Results:');
        console.log(`📊 Total members found: ${extractedData.totalCount}`);
        console.log(`📧 Sample member emails:`, 
            extractedData.searchDetails.slice(0, 3).map(m => m.Email));
        
        if (extractedData.totalCount > 0) {
            console.log('📝 Sample member data:');
            console.log(JSON.stringify(extractedData.searchDetails[0], null, 2));
        }
        
        console.log('💾 Saving test results...');
        await scraper.saveToJSON('test_results.json');
        
        console.log('✅ Test completed successfully!');
        console.log('🌐 Browser will remain open for inspection');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    // Don't close browser automatically in test mode
    console.log('🔍 Browser left open for manual inspection');
    console.log('⌨️  Press Ctrl+C to exit and close browser');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down test...');
    process.exit(0);
});

testHeadedScraper();