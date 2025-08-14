# Headed Playwright Scraper for Chartered Accountants ANZ

A comprehensive headed browser automation solution for extracting member data from the Chartered Accountants ANZ directory across all Australian postcodes. Supports single postcode testing and full-scale multi-postcode batch processing.


## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers (if not already done):
   ```bash
   npx playwright install chromium
   ```

## Usage

### Test the headed scraper (recommended first):
```bash
npm run test-headed
```

This will:
- Open a visible browser window
- Navigate to the search page
- Fill the form with postcode 3000
- Pause for manual verification at key steps
- Test Load More automation (limited clicks)
- Extract and display sample data

### Run full headed scrape:
```bash
npm run scrape-headed
```

This will:
- Complete full automation without pauses but only for postcode 3000
- Click Load More until all data is loaded
- Extract all member data from DOM
- Save results to `ca_members_headed.json`
- Keep browser open for inspection

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

### 4. Output Format
```json
{
    "totalCount": 210,
    "searchDetails": [
        {
            "strSelectedMemberType": "",
            "Name": "John Smith",
            "PreferredName": "John",
            "FirstName": "John",
            "MiddleName": "",
            "LastName": "Smith",
            "Company": "Smith & Associates Pty Ltd",
            "BusinessAddress": "123 Collins Street, Melbourne, VIC, 3000",
            "Phone": "+61396123456",
            "Email": "john.smith@example.com.au",
            "CompanyWebsite": "http://www.smithassociates.com.au",
            "Designation": "CA",
            "Specialties": null,
            "SpecialConditions": "",
            "Specialisation": "",
            "Longitude": null,
            "Latitude": null
        }
    ]
}
```


## Timing and Performance

- **Page Load**: 3-5 seconds for Vue.js initialization
- **Form Interactions**: 1-2 seconds between actions
- **Load More Cycles**: 3-4 seconds between clicks
- **Total Time**: 5-15 minutes depending on data volume
- **Expected Results**: 200+ members for Melbourne 3000

## Troubleshooting

1. **Form Not Found**: Check if site structure changed
2. **Load More Not Working**: Verify button selectors
3. **No Data Extracted**: Check email regex patterns
4. **Browser Crashes**: Increase timeout values

## Files Generated

### Single Postcode Mode
- `ca_members_headed.json` - Single postcode results (legacy mode)
- `test_results.json` - Test results (test run)

### Multi-Postcode Mode
- `ca_members_sample.json` - Sample postcodes results
- `ca_members_major_cities.json` - Major cities results  
- `ca_members_[state].json` - State-specific results (e.g., `ca_members_vic.json`)
- `ca_members_all_australia.json` - Complete Australia results
- `progress_[filename].json` - Progress tracking files for resuming interrupted scrapes
