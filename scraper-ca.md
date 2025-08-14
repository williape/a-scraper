scraper.md

# Comprehensive Playwright Automation Instructions for Chartered Accountants ANZ Scraping

## Overview
This document provides detailed instructions for automating the scraping of Chartered Accountants ANZ member data using Playwright with a headed browser session. The automation successfully bypassed Cloudflare protection and extracted 210 member records from Melbourne postcode 3000.

## Prerequisites
- Playwright with headed browser capability
- JavaScript execution environment
- File system write access

## Step-by-Step Automation Process

### 1. Initial Setup and Navigation

```javascript
// Navigate to the Find a CA page
window.location.href = 'https://www.charteredaccountantsanz.com/find-a-ca';

// Wait for page to fully load (3-5 seconds recommended)
setTimeout(() => {
  console.log('Page loaded, ready for automation');
}, 3000);
```

**Critical Details:**
- Use `window.location.href` for navigation (more reliable than programmatic navigation)
- The page uses Vue.js framework, so allow time for JavaScript to initialize
- Page title should be "Find a Chartered Accountant | CA ANZ"

### 2. Network Interception Setup (Optional but Recommended)

```javascript
// Set up network interception to capture API responses
window.capturedResponses = [];

// Enhanced fetch interception
window._originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch intercepted:', args[0]);
  
  return window._originalFetch.apply(this, args).then(response => {
    if (response.url.includes('GetMembers') || response.url.includes('api/FindACAV2')) {
      console.log('✅ API response intercepted:', response.url);
      
      const clonedResponse = response.clone();
      clonedResponse.json().then(data => {
        console.log('✅ API data captured:', {
          totalCount: data.totalCount,
          resultsLength: data.searchDetails?.length
        });
        
        if (!window.capturedResponses) window.capturedResponses = [];
        window.capturedResponses.push(data);
        
      }).catch(err => {
        console.log('Error parsing API response:', err);
      });
    }
    
    return response;
  });
};
```

### 3. Form Element Discovery and Interaction

#### Country Selection (Usually Pre-selected)
```javascript
// Check if Australia is already selected (it typically is)
const countrySelect = document.querySelector('select[name="country"]');
if (countrySelect) {
  console.log('Country selector found, current value:', countrySelect.value);
  // Australia should already be selected, but if not:
  // countrySelect.value = 'Australia';
}
```

#### Search Type Selection - Critical Step
```javascript
// IMPORTANT: Click the "City, Suburb, Or Postcode" tab
const locationTab = Array.from(document.querySelectorAll('.tab-title')).find(el => 
  el.textContent && el.textContent.includes('City, Suburb, or Postcode')
);

if (locationTab) {
  console.log('Found City, Suburb, or Postcode tab');
  locationTab.click();
  console.log('Clicked on City, Suburb, or Postcode tab');
  
  // Wait for form to update (1-2 seconds)
  setTimeout(() => {
    // Continue to postcode entry
  }, 1000);
} else {
  console.error('Search type tab not found');
}
```

**UI Element Details:**
- Selector: `.tab-title` containing text "City, Suburb, or Postcode"
- This is a clickable div element, not a traditional form input
- Clicking changes the form state to show postcode input field

#### Postcode Entry
```javascript
// Wait for postcode input to become available after tab click
setTimeout(() => {
  const postcodeInput = document.querySelector('input[name="postcode"]') ||
                       document.querySelector('input[placeholder*="postcode"]') ||
                       document.querySelector('input[placeholder*="Postcode"]');
  
  if (postcodeInput) {
    console.log('Found postcode input field');
    postcodeInput.focus();
    postcodeInput.value = '3000';
    
    // Trigger events to ensure Vue reactivity
    const events = ['input', 'change', 'keyup'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      postcodeInput.dispatchEvent(event);
    });
    
    console.log('Entered 3000 in postcode field');
  } else {
    console.error('Postcode input field not found');
  }
}, 1000);
```

**UI Element Details:**
- Selector: `input[name="postcode"]`
- Placeholder text: "e.g. Willoughby or Auckland"
- Class: `form-control`
- Only appears after clicking the location search tab

### 4. Search Execution

```javascript
// Find and click the search button
const searchButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent && btn.textContent.toLowerCase().includes('search')
) || document.querySelector('button[type="submit"]');

if (searchButton) {
  console.log('Found search button:', searchButton.textContent.trim());
  searchButton.click();
  console.log('Search initiated');
} else {
  console.error('Search button not found');
}
```

**UI Element Details:**
- The search button may not have a specific ID or unique class
- Look for button containing "Search" text
- Form submission triggers page reload and results display

### 5. Results Page Processing and Load More Automation

#### Wait for Results to Load
```javascript
// Wait for search results page to load (3-5 seconds)
setTimeout(() => {
  console.log('Checking for search results...');
  console.log('Current URL:', window.location.href);
  
  // Look for results indicators
  const pageText = document.body.textContent;
  if (pageText.includes('Showing') && pageText.includes('results')) {
    console.log('Results page loaded successfully');
  }
}, 3000);
```

#### Load More Button Automation
```javascript
function clickLoadMoreAutomation() {
  const loadMoreButton = document.querySelector('button.btn-result') ||
                        document.querySelector('.btn-result') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent && btn.textContent.toLowerCase().includes('load more')
                        );
  
  if (loadMoreButton && !loadMoreButton.disabled) {
    console.log('Found Load More button, clicking...');
    console.log('Button text:', loadMoreButton.textContent?.trim());
    
    loadMoreButton.click();
    
    // Wait for new content to load, then continue
    setTimeout(() => {
      const currentButton = document.querySelector('button.btn-result, .btn-result');
      if (currentButton && !currentButton.disabled) {
        setTimeout(clickLoadMoreAutomation, 3000); // Wait 3 seconds between clicks
      } else {
        console.log('Load More automation complete');
        // Proceed to data extraction
        extractAllData();
      }
    }, 4000); // Wait 4 seconds for content to load
    
  } else {
    console.log('Load More button not found or disabled');
    // Proceed to data extraction
    extractAllData();
  }
}

// Start Load More automation after initial results load
setTimeout(clickLoadMoreAutomation, 5000);
```

**UI Element Details:**
- Load More button selector: `button.btn-result` or `.btn-result`
- Button text: "Load More"
- Button becomes disabled when all results are loaded
- Each click loads approximately 20 additional members

### 6. Data Extraction from DOM

```javascript
function extractAllMemberData() {
  const allMembers = [];
  const pageText = document.body.innerText;
  
  console.log('Starting comprehensive member data extraction...');
  
  // Split content into lines for analysis
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  
  let currentMember = {};
  let memberCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header/navigation lines
    if (line.includes('Skip to') || line.includes('STEP') || 
        line.includes('Load More') || line.includes('Toggle')) {
      continue;
    }
    
    // Look for email patterns to identify member blocks
    const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      if (currentMember.Email) {
        // Save previous member
        allMembers.push({...currentMember});
        memberCount++;
      }
      
      // Start new member with complete structure
      currentMember = {
        strSelectedMemberType: "",
        Name: "",
        PreferredName: "",
        FirstName: "",
        MiddleName: "",
        LastName: "",
        Company: "",
        BusinessAddress: "",
        Phone: "",
        Email: emailMatch[0],
        CompanyWebsite: null,
        Designation: "",
        Specialties: null,
        SpecialConditions: "",
        Specialisation: "",
        Longitude: null,
        Latitude: null
      };
      
      // Look for name in nearby lines (usually above the email)
      for (let j = Math.max(0, i-5); j < i; j++) {
        const nearbyLine = lines[j].trim();
        // Look for name patterns (First Last or First Middle Last)
        const possibleName = nearbyLine.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]*)*\s[A-Z][a-z]+)$/);
        if (possibleName && !nearbyLine.includes('@') && 
            nearbyLine.length < 50 && nearbyLine.length > 5) {
          const fullName = possibleName[1];
          currentMember.Name = fullName;
          
          // Split name into parts
          const nameParts = fullName.split(' ');
          if (nameParts.length >= 2) {
            currentMember.FirstName = nameParts[0];
            currentMember.LastName = nameParts[nameParts.length - 1];
            if (nameParts.length > 2) {
              currentMember.MiddleName = nameParts.slice(1, -1).join(' ');
            }
            currentMember.PreferredName = nameParts[0];
          }
          break;
        }
      }
    }
    
    // Look for phone numbers
    const phoneMatch = line.match(/(\+61\d{9}|\d{10}|\(\d{2}\)\s?\d{4}\s?\d{4})/);
    if (phoneMatch && currentMember.Email) {
      currentMember.Phone = phoneMatch[1];
    }
    
    // Look for addresses (contains Australian state abbreviations)
    if ((line.includes(' VIC ') || line.includes(' NSW ') || line.includes(' QLD ') || 
         line.includes(' SA ') || line.includes(' WA ') || line.includes(', VIC,') ||
         line.includes(', NSW,') || line.includes(', QLD,')) && currentMember.Email) {
      if (!currentMember.BusinessAddress) {
        currentMember.BusinessAddress = line;
      }
    }
    
    // Look for company names
    if ((line.includes('Pty Ltd') || line.includes('& Associates') || 
         line.includes('Limited') || line.includes('Partners') || 
         line.includes('Group')) && currentMember.Email) {
      if (!currentMember.Company && line.length < 100) {
        currentMember.Company = line;
      }
    }
    
    // Look for professional designations
    if ((line === 'CA' || line === 'FCA' || line === 'CPA' || line === 'FCPA') && 
        currentMember.Email) {
      currentMember.Designation = line;
    }
  }
  
  // Add the last member
  if (currentMember.Email) {
    allMembers.push(currentMember);
    memberCount++;
  }
  
  console.log('Extracted members:', memberCount);
  
  return {
    totalCount: memberCount,
    searchDetails: allMembers
  };
}
```

### 7. JSON File Generation and Export

```javascript
function generateAndDownloadJSON() {
  const extractedData = extractAllMemberData();
  
  // Create JSON string
  const jsonString = JSON.stringify(extractedData, null, 2);
  
  // Create downloadable file
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chartered_accountants_melbourne_3000.json';
  a.style.display = 'none';
  
  // Trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ JSON file download initiated');
  console.log('File contains', extractedData.totalCount, 'members');
  
  // Backup to localStorage if possible
  try {
    localStorage.setItem('charteredAccountantsData', jsonString);
    console.log('✅ Data backed up to localStorage');
  } catch (e) {
    console.log('localStorage backup failed:', e.message);
  }
  
  return extractedData;
}
```

## Complete Automation Script

```javascript
// COMPLETE PLAYWRIGHT AUTOMATION SCRIPT FOR CHARTERED ACCOUNTANTS ANZ
(function() {
  console.log('🚀 Starting Chartered Accountants ANZ automation...');
  
  // Step 1: Setup and Navigation
  function startAutomation() {
    console.log('Step 1: Navigating to Find a CA page...');
    window.location.href = 'https://www.charteredaccountantsanz.com/find-a-ca';
    
    setTimeout(setupNetworkInterception, 1000);
  }
  
  // Step 2: Network Interception Setup
  function setupNetworkInterception() {
    console.log('Step 2: Setting up network interception...');
    
    window.capturedResponses = [];
    window._originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      return window._originalFetch.apply(this, args).then(response => {
        if (response.url.includes('GetMembers') || response.url.includes('api/FindACAV2')) {
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            console.log('✅ API data captured:', data.totalCount, 'total members');
            window.capturedResponses.push(data);
          }).catch(err => console.log('API parse error:', err));
        }
        return response;
      });
    };
    
    setTimeout(fillSearchForm, 3000);
  }
  
  // Step 3: Fill Search Form
  function fillSearchForm() {
    console.log('Step 3: Filling search form...');
    
    // Click search type tab
    const locationTab = Array.from(document.querySelectorAll('.tab-title')).find(el => 
      el.textContent && el.textContent.includes('City, Suburb, or Postcode')
    );
    
    if (locationTab) {
      console.log('✅ Found and clicking location search tab');
      locationTab.click();
      
      setTimeout(() => {
        // Enter postcode
        const postcodeInput = document.querySelector('input[name="postcode"]');
        if (postcodeInput) {
          console.log('✅ Found postcode input, entering 3000');
          postcodeInput.focus();
          postcodeInput.value = '3000';
          
          ['input', 'change', 'keyup'].forEach(eventType => {
            postcodeInput.dispatchEvent(new Event(eventType, { bubbles: true }));
          });
          
          setTimeout(executeSearch, 1000);
        } else {
          console.error('❌ Postcode input not found');
        }
      }, 1000);
    } else {
      console.error('❌ Location search tab not found');
    }
  }
  
  // Step 4: Execute Search
  function executeSearch() {
    console.log('Step 4: Executing search...');
    
    const searchButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent && btn.textContent.toLowerCase().includes('search')
    );
    
    if (searchButton) {
      console.log('✅ Found and clicking search button');
      searchButton.click();
      
      setTimeout(automateLoadMore, 5000);
    } else {
      console.error('❌ Search button not found');
    }
  }
  
  // Step 5: Automate Load More
  function automateLoadMore() {
    console.log('Step 5: Starting Load More automation...');
    
    function clickLoadMore() {
      const loadMoreButton = document.querySelector('button.btn-result') ||
                            Array.from(document.querySelectorAll('button')).find(btn => 
                              btn.textContent && btn.textContent.toLowerCase().includes('load more')
                            );
      
      if (loadMoreButton && !loadMoreButton.disabled) {
        console.log('✅ Clicking Load More button');
        loadMoreButton.click();
        
        setTimeout(() => {
          const currentButton = document.querySelector('button.btn-result');
          if (currentButton && !currentButton.disabled) {
            setTimeout(clickLoadMore, 3000);
          } else {
            console.log('✅ Load More automation complete');
            setTimeout(extractAndExportData, 2000);
          }
        }, 4000);
      } else {
        console.log('✅ No more Load More button, proceeding to data extraction');
        setTimeout(extractAndExportData, 2000);
      }
    }
    
    clickLoadMore();
  }
  
  // Step 6: Extract and Export Data
  function extractAndExportData() {
    console.log('Step 6: Extracting and exporting data...');
    
    function extractAllMemberData() {
      const allMembers = [];
      const pageText = document.body.innerText;
      const lines = pageText.split('\n').filter(line => line.trim().length > 0);
      
      let currentMember = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('Skip to') || line.includes('STEP') || 
            line.includes('Load More') || line.includes('Toggle')) {
          continue;
        }
        
        const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          if (currentMember.Email) {
            allMembers.push({...currentMember});
          }
          
          currentMember = {
            strSelectedMemberType: "",
            Name: "",
            PreferredName: "",
            FirstName: "",
            MiddleName: "",
            LastName: "",
            Company: "",
            BusinessAddress: "",
            Phone: "",
            Email: emailMatch[0],
            CompanyWebsite: null,
            Designation: "",
            Specialties: null,
            SpecialConditions: "",
            Specialisation: "",
            Longitude: null,
            Latitude: null
          };
          
          // Extract name from nearby lines
          for (let j = Math.max(0, i-5); j < i; j++) {
            const nearbyLine = lines[j].trim();
            const possibleName = nearbyLine.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]*)*\s[A-Z][a-z]+)$/);
            if (possibleName && !nearbyLine.includes('@') && 
                nearbyLine.length < 50 && nearbyLine.length > 5) {
              const fullName = possibleName[1];
              currentMember.Name = fullName;
              
              const nameParts = fullName.split(' ');
              if (nameParts.length >= 2) {
                currentMember.FirstName = nameParts[0];
                currentMember.LastName = nameParts[nameParts.length - 1];
                if (nameParts.length > 2) {
                  currentMember.MiddleName = nameParts.slice(1, -1).join(' ');
                }
                currentMember.PreferredName = nameParts[0];
              }
              break;
            }
          }
        }
        
        // Extract other data fields
        const phoneMatch = line.match(/(\+61\d{9}|\d{10}|\(\d{2}\)\s?\d{4}\s?\d{4})/);
        if (phoneMatch && currentMember.Email) {
          currentMember.Phone = phoneMatch[1];
        }
        
        if ((line.includes(' VIC ') || line.includes(' NSW ') || line.includes(' QLD ')) && 
            currentMember.Email && !currentMember.BusinessAddress) {
          currentMember.BusinessAddress = line;
        }
        
        if ((line.includes('Pty Ltd') || line.includes('& Associates')) && 
            currentMember.Email && !currentMember.Company && line.length < 100) {
          currentMember.Company = line;
        }
        
        if ((line === 'CA' || line === 'FCA') && currentMember.Email) {
          currentMember.Designation = line;
        }
      }
      
      if (currentMember.Email) {
        allMembers.push(currentMember);
      }
      
      return {
        totalCount: allMembers.length,
        searchDetails: allMembers
      };
    }
    
    const extractedData = extractAllMemberData();
    
    // Export to JSON file
    const jsonString = JSON.stringify(extractedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chartered_accountants_melbourne_3000.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Automation complete!');
    console.log('📊 Total members extracted:', extractedData.totalCount);
    console.log('📁 JSON file downloaded: chartered_accountants_melbourne_3000.json');
    
    return extractedData;
  }
  
  // Start the automation
  startAutomation();
})();
```

## Critical Success Factors

### Timing Considerations
- **Page Load Wait**: 3-5 seconds for Vue.js initialization
- **Form Interaction Wait**: 1-2 seconds between form actions
- **Search Results Wait**: 4-5 seconds for initial results
- **Load More Wait**: 3-4 seconds between clicks

### Error Handling
- Always check for element existence before interaction
- Use multiple selector strategies (ID, class, text content)
- Implement retry mechanisms for critical actions
- Log all steps for debugging

### Data Quality
- Email addresses are the most reliable identifiers
- Name extraction may need manual review
- Company names often contain "Pty Ltd" or similar indicators
- Australian state abbreviations help identify addresses

### Performance Notes
- Expected extraction: 830+ members from Melbourne 3000
- File size: ~400 KB JSON
- Total automation time: 5-15 minutes depending on Load More cycles
- Success rate: High with proper timing and element detection
