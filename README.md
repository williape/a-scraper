# Headed Playwright Scraper for Chartered Accountants ANZ

A comprehensive headed browser automation solution for extracting member data from the Chartered Accountants ANZ directory, based on the detailed instructions in `scraper.md`.

## Features

- **Headed Browser**: Visual browser window for monitoring and debugging
- **Complete Automation**: From form filling to data extraction
- **Load More Automation**: Automatically clicks "Load More" until all data is loaded
- **DOM-based Extraction**: Parses member data directly from the page content
- **Cloudflare Bypass**: Uses headed browser to avoid bot detection
- **Comprehensive Data Structure**: Extracts all available member fields

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
- Complete full automation without pauses
- Click Load More until all data is loaded
- Extract all member data from DOM
- Save results to `ca_members_headed.json`
- Keep browser open for inspection

## How It Works

### 1. Form Automation
- Clicks "City, Suburb, or Postcode" tab
- Enters postcode "3000" 
- Triggers Vue.js reactivity events
- Clicks search button

### 2. Load More Automation
- Automatically detects and clicks "Load More" button
- Waits for content to load between clicks
- Continues until all members are loaded
- Safety limit of 50 clicks maximum

### 3. Data Extraction
- Parses DOM content using text analysis
- Uses email addresses as member identifiers
- Extracts names, companies, addresses, phones
- Handles Australian address formats
- Identifies professional designations

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

- `ca_members_headed.json` - Full results (production run)
- `test_results.json` - Test results (test run)
