#!/usr/bin/env node

/**
 * Comprehensive Australian Postcode Scraper
 * 
 * This script runs the enhanced CA scraper to process all valid Australian postcodes.
 * It supports various modes: full scrape, state-specific scrape, sample testing, and resume functionality.
 */

const HeadedCAScraper = require('./headed-scraper.js');
const AustralianPostcodes = require('./australian-postcodes.js');

class PostcodeScrapeManager {
    constructor() {
        this.scraper = new HeadedCAScraper();
        this.postcodeManager = new AustralianPostcodes();
    }

    async runFullScrape(options = {}) {
        console.log('🌏 Starting FULL Australian postcode scrape...');
        console.log(`📊 Total postcodes to process: ${this.postcodeManager.getTotalCount()}`);
        
        const defaultOptions = {
            batchSize: 10,
            delayBetweenPostcodes: 5000,
            saveProgress: true,
            outputFile: 'ca_members_all_australia.json'
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        return await this.scraper.scrapeAllPostcodes(null, mergedOptions);
    }

    async runStateScrape(state, options = {}) {
        console.log(`🏛️ Starting ${state} state postcode scrape...`);
        
        const statePostcodes = this.postcodeManager.getPostcodesByState(state);
        console.log(`📊 ${state} postcodes to process: ${statePostcodes.length}`);
        
        if (statePostcodes.length === 0) {
            throw new Error(`No postcodes found for state: ${state}`);
        }
        
        const defaultOptions = {
            batchSize: 5,
            delayBetweenPostcodes: 3000,
            saveProgress: true,
            outputFile: `ca_members_${state.toLowerCase()}.json`
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        return await this.scraper.scrapeAllPostcodes(statePostcodes, mergedOptions);
    }

    async runSampleScrape(options = {}) {
        console.log('🧪 Starting sample postcode scrape for testing...');
        
        const samplePostcodes = this.postcodeManager.getSamplePostcodes(5);
        console.log(`📊 Sample postcodes: ${samplePostcodes.join(', ')}`);
        
        const defaultOptions = {
            batchSize: 2,
            delayBetweenPostcodes: 2000,
            saveProgress: true,
            outputFile: 'ca_members_sample.json'
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        return await this.scraper.scrapeAllPostcodes(samplePostcodes, mergedOptions);
    }

    async runMajorCitiesScrape(options = {}) {
        console.log('🏙️ Starting major cities postcode scrape...');
        
        const cityPostcodes = this.postcodeManager.getMajorCityPostcodes();
        console.log(`📊 Major city postcodes: ${cityPostcodes.join(', ')}`);
        
        const defaultOptions = {
            batchSize: 3,
            delayBetweenPostcodes: 4000,
            saveProgress: true,
            outputFile: 'ca_members_major_cities.json'
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        return await this.scraper.scrapeAllPostcodes(cityPostcodes, mergedOptions);
    }

    async resumeScrape(resumePostcode, options = {}) {
        console.log(`🔄 Resuming scrape from postcode: ${resumePostcode}`);
        
        const defaultOptions = {
            batchSize: 10,
            delayBetweenPostcodes: 5000,
            saveProgress: true,
            resumeFrom: resumePostcode,
            outputFile: 'ca_members_resumed.json'
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        return await this.scraper.scrapeAllPostcodes(null, mergedOptions);
    }

    printStatistics() {
        console.log('\n📊 Australian Postcode Statistics:');
        const stats = this.postcodeManager.getStatistics();
        
        for (const [state, count] of Object.entries(stats)) {
            console.log(`   ${state}: ${count} postcodes`);
        }
        
        console.log(`\n🎯 Estimated scrape time: ${Math.ceil(stats.TOTAL * 10 / 60)} - ${Math.ceil(stats.TOTAL * 20 / 60)} minutes`);
        console.log(`💾 Estimated storage: ${Math.ceil(stats.TOTAL * 0.5)} - ${Math.ceil(stats.TOTAL * 2)} MB`);
    }

    async cleanup() {
        if (this.scraper && this.scraper.browser) {
            await this.scraper.close();
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    const manager = new PostcodeScrapeManager();
    
    try {
        switch (command.toLowerCase()) {
            case 'full':
                console.log('🌏 Running FULL Australian scrape (all postcodes)');
                console.log('⚠️  This will take several hours and process thousands of postcodes');
                await manager.runFullScrape();
                break;
                
            case 'state':
                const state = args[1];
                if (!state) {
                    throw new Error('State parameter required. Usage: node scrape-all-postcodes.js state NSW');
                }
                console.log(`🏛️ Running ${state.toUpperCase()} state scrape`);
                await manager.runStateScrape(state.toUpperCase());
                break;
                
            case 'sample':
                console.log('🧪 Running sample scrape (5 postcodes from each state)');
                await manager.runSampleScrape();
                break;
                
            case 'cities':
                console.log('🏙️ Running major cities scrape');
                await manager.runMajorCitiesScrape();
                break;
                
            case 'resume':
                const resumePostcode = args[1];
                if (!resumePostcode) {
                    throw new Error('Resume postcode required. Usage: node scrape-all-postcodes.js resume 3000');
                }
                console.log(`🔄 Resuming scrape from postcode ${resumePostcode}`);
                await manager.resumeScrape(resumePostcode);
                break;
                
            case 'stats':
                manager.printStatistics();
                break;
                
            case 'help':
            default:
                console.log('🚀 Australian CA Postcode Scraper');
                console.log('');
                console.log('Commands:');
                console.log('  full              - Scrape all Australian postcodes (thousands of postcodes, takes hours)');
                console.log('  state <STATE>     - Scrape specific state (NSW, VIC, QLD, SA, WA, TAS, NT, ACT)');
                console.log('  sample            - Scrape sample postcodes for testing (5 from each state)');
                console.log('  cities            - Scrape major city postcodes only');
                console.log('  resume <POSTCODE> - Resume scraping from specific postcode');
                console.log('  stats             - Show postcode statistics');
                console.log('  help              - Show this help message');
                console.log('');
                console.log('Examples:');
                console.log('  node scrape-all-postcodes.js sample           # Test with sample postcodes');
                console.log('  node scrape-all-postcodes.js cities           # Scrape major cities');
                console.log('  node scrape-all-postcodes.js state VIC        # Scrape Victoria only');
                console.log('  node scrape-all-postcodes.js resume 3500      # Resume from postcode 3500');
                console.log('  node scrape-all-postcodes.js full             # Full Australia scrape');
                console.log('');
                manager.printStatistics();
                break;
        }
        
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup is handled by the scraper itself (browser left open for inspection)
        console.log('🏁 Script execution completed');
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
    console.log('\n🛑 Received interrupt signal, cleaning up...');
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = PostcodeScrapeManager;