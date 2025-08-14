# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js web scraping project that automates data extraction from the Chartered Accountants ANZ website using Playwright. The project targets the "Find a CA" directory to extract member information across all Australian postcodes, with comprehensive coverage of the entire CA directory.

## Key Commands

### Development Commands
```bash
# Install dependencies
npm install

# Install Playwright browsers (if needed)
npx playwright install chromium

# Test the headed scraper (recommended first)
npm run test-headed

# Run single postcode scraper (3000 only - legacy)
npm run scrape-headed
```

### Multi-Postcode Commands
```bash
# Show postcode statistics (9000+ postcodes across Australia)
npm run scrape-stats

# Test with sample postcodes (5 from each state - recommended first)
npm run scrape-sample

# Scrape major cities only (8 postcodes: Sydney, Melbourne, Brisbane, etc.)
npm run scrape-cities

# Scrape specific state (e.g., Victoria)
node scrape-all-postcodes.js state VIC

# Resume from specific postcode (if scrape was interrupted)
node scrape-all-postcodes.js resume 3500

# Full Australia scrape (9000+ postcodes, takes 25-50 hours)
npm run scrape-all
```

### Test Commands
```bash
# Run basic test
npm test

# Run headed browser test with manual verification pauses
npm run test-headed
```

## Architecture Overview

### Core Components

1. **HeadedCAScraper Class** (`headed-scraper.js`)
   - Main scraper implementation using headed Playwright browser
   - Handles Cloudflare bypass through visual browser sessions
   - Implements complete automation from form filling to data extraction
   - Uses network interception to capture API responses
   - Automatically handles "Load More" pagination
   - **NEW**: Multi-postcode support with `scrapeAllPostcodes()` method

2. **Australian Postcodes Manager** (`australian-postcodes.js`)
   - Comprehensive reference of all 9000+ valid Australian postcodes
   - Organized by state/territory with proper ranges
   - Includes major cities, sampling, and validation functions
   - Supports statistical analysis and postcode lookup

3. **Postcode Scrape Manager** (`scrape-all-postcodes.js`)
   - Command-line interface for multi-postcode operations
   - Supports full Australia, state-specific, sample, and city scraping
   - Includes progress tracking, resume functionality, and error handling
   - Batch processing with configurable delays and output management

4. **Test Runner** (`test-headed.js`)
   - Test harness for the headed scraper
   - Includes manual verification pauses for debugging
   - Limited load-more cycles for testing

### Key Technical Details

- **Browser Configuration**: Uses headed Chromium with slow motion (1000ms) for visibility
- **Target Site**: `https://www.charteredaccountantsanz.com/find-a-ca`
- **Framework Detection**: Site uses Vue.js, requires proper timing for form interactions
- **Anti-Bot Measures**: Bypasses Cloudflare protection using headed browser approach
- **Data Format**: Extracts comprehensive member data including contact info, addresses, and professional designations

### Search Automation Process

1. Navigate to Find a CA page
2. Click "City, Suburb, or Postcode" tab
3. Enter postcode "3000" (Melbourne)
4. Trigger Vue.js reactivity events
5. Execute search
6. Automatically click "Load More" until all data is loaded
7. Extract member data from DOM using email regex patterns
8. Save results to JSON files

### Output Files

**Single Postcode Mode:**
- `ca_members_headed.json` - Single postcode scraper results (legacy)
- `test_results.json` - Test scraper results

**Multi-Postcode Mode:**
- `ca_members_sample.json` - Sample postcodes results
- `ca_members_major_cities.json` - Major cities results  
- `ca_members_[state].json` - State-specific results (e.g., `ca_members_vic.json`)
- `ca_members_all_australia.json` - Complete Australia results
- `progress_[filename].json` - Progress tracking files for resuming interrupted scrapes

### Performance Characteristics

**Single Postcode Mode:**
- **Expected Results**: 200+ members for Melbourne postcode 3000
- **Total Runtime**: 5-15 minutes depending on data volume
- **Safety Limits**: Maximum 50 "Load More" clicks to prevent infinite loops
- **Timing**: 3-4 seconds between Load More cycles, 1-2 seconds between form actions

**Multi-Postcode Mode:**
- **Sample Scrape**: ~40 postcodes, 2-4 hours, 5,000-20,000 members expected
- **Major Cities**: 8 postcodes, 1-2 hours, 2,000-5,000 members expected  
- **State Scrape**: 140-2000 postcodes per state, 3-35 hours depending on state
- **Full Australia**: 9000+ postcodes, 25-50 hours, 50,000-200,000 members expected
- **Rate Limiting**: 5 second delays between postcodes to avoid blocking
- **Progress Tracking**: Auto-saves progress every 10 postcodes
- **Resume Support**: Can restart from any postcode if interrupted

## Important Implementation Notes

- The scraper uses DOM-based extraction rather than API interception as primary method
- Network interception is implemented for monitoring and debugging purposes
- Browser stays open after completion for result inspection
- Uses Australian address parsing and professional designation detection
- Implements robust error handling for missing UI elements

## Development Guidelines

**For Single Postcode Testing:**
- Always test with `npm run test-headed` before running full scraper
- Monitor browser window during automation for debugging
- Check console output for API response capture confirmations
- Verify form filling and search execution at manual pause points
- Expected total count should be around 210 members for postcode 3000

**For Multi-Postcode Operations:**
- **Always start with sample**: `npm run scrape-sample` to test the full workflow
- **Then try major cities**: `npm run scrape-cities` for broader testing
- **Use state scraping**: `node scrape-all-postcodes.js state VIC` for production-scale testing
- **Full Australia only when confident**: `npm run scrape-all` - this takes days to complete
- **Monitor progress files**: Check `progress_*.json` files to track completion
- **Use resume functionality**: If interrupted, resume with `node scrape-all-postcodes.js resume [POSTCODE]`

## Troubleshooting Common Issues

### Navigation Timeout Errors

**Problem**: `page.goto: Timeout 30000ms exceeded` or `Target page, context or browser has been closed`

**Solutions**:
- The scraper now includes automatic retry logic (3 attempts)
- Uses `domcontentloaded` instead of `networkidle` for faster loading
- Increased timeout to 60 seconds to handle Cloudflare challenges
- If still failing, check internet connection and site availability

### Form Filling Failures

**Problem**: Cannot find location tab or postcode input field

**Solutions**:
- The scraper automatically takes screenshots on form errors (`error-form-fill.png`)
- Check if site structure has changed by examining the screenshot
- Verify the page loaded correctly before form automation begins
- Look for Cloudflare challenge pages or other blocking mechanisms

### Browser Lifecycle Issues

**Problem**: Browser closes unexpectedly during automation

**Solutions**:
- Browser now stays open after both success and failure for debugging
- Use Ctrl+C to manually exit when done inspecting
- Check console for step-by-step progress logging
- Each major step now reports completion status

### Expected Behavior

- **Normal run time**: 5-15 minutes depending on data volume
- **Step progression**: 7 clearly logged steps from browser init to file save
- **Output files**: Results saved to `ca_members_headed.json`
- **Browser state**: Left open for manual inspection after completion

### Debugging Commands

```bash
# Test with manual verification pauses
npm run test-headed

# Check for error screenshots
ls -la *.png

# Verify output file was created
ls -la ca_members_*.json
```