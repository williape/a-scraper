const { chromium } = require('playwright');
const fs = require('fs').promises;

class HeadedCAScraper {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.allMembers = [];
        this.totalCount = 0;
    }

    async init() {
        console.log('🚀 Initializing headed browser for CA scraping...');
        
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 1000,
            devtools: false
        });
        
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
            viewport: { width: 1280, height: 720 }
        });
        
        this.page = await this.context.newPage();
        
        // Set up network interception for API monitoring
        await this.setupNetworkInterception();
        
        console.log('✅ Browser initialized successfully');
    }

    async setupNetworkInterception() {
        console.log('📡 Setting up network interception...');
        
        await this.page.route('**/api/FindACAV2/GetMembers', async (route, request) => {
            console.log('🌐 API request intercepted:', request.method());
            route.continue();
        });

        this.page.on('response', async (response) => {
            if (response.url().includes('GetMembers') || response.url().includes('api/FindACAV2')) {
                try {
                    const data = await response.json();
                    console.log('✅ API response captured:', {
                        totalCount: data.totalCount,
                        resultsLength: data.searchDetails?.length
                    });
                } catch (error) {
                    console.log('❌ Error parsing API response:', error.message);
                }
            }
        });
    }

    async navigateToSearchPage() {
        console.log('🔍 Navigating to Find a CA page...');
        
        const maxRetries = 3;
        let attempt = 1;
        
        while (attempt <= maxRetries) {
            try {
                console.log(`📡 Navigation attempt ${attempt}/${maxRetries}...`);
                
                await this.page.goto('https://www.charteredaccountantsanz.com/find-a-ca', {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                
                console.log('📄 DOM loaded, waiting for Vue.js initialization...');
                
                // Wait for Vue.js to initialize
                await this.page.waitForTimeout(5000);
                
                // Check if page loaded properly
                const title = await this.page.title();
                console.log('✅ Page loaded successfully:', title);
                
                // Verify we're on the correct page
                if (title.includes('Find a Chartered Accountant') || title.includes('CA ANZ')) {
                    console.log('✅ Confirmed on correct page');
                    return;
                } else {
                    console.log('⚠️ Unexpected page title, but continuing...');
                    return;
                }
                
            } catch (error) {
                console.error(`❌ Navigation attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    console.error('❌ All navigation attempts failed');
                    throw new Error(`Navigation failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                console.log(`⏳ Waiting before retry attempt ${attempt + 1}...`);
                await this.page.waitForTimeout(5000);
                attempt++;
            }
        }
    }

    async fillSearchForm(postcode = '3000') {
        console.log(`📝 Filling search form with postcode: ${postcode}...`);
        
        try {
            // Step 1: Click the "City, Suburb, or Postcode" tab
            console.log('🔍 Looking for location search tab...');
            
            const locationTab = await this.page.locator('.tab-title').filter({
                hasText: 'City, Suburb, or Postcode'
            }).first();
            
            if (await locationTab.isVisible()) {
                console.log('✅ Found location search tab, clicking...');
                await locationTab.click();
                await this.page.waitForTimeout(1500);
            } else {
                throw new Error('Location search tab not found');
            }
            
            // Step 2: Enter postcode
            console.log(`📮 Entering postcode ${postcode}...`);
            
            const postcodeInput = this.page.locator('input[name="postcode"]');
            await postcodeInput.waitFor({ state: 'visible', timeout: 5000 });
            
            await postcodeInput.focus();
            await postcodeInput.clear();
            await postcodeInput.fill(postcode);
            
            // Trigger Vue reactivity events
            await postcodeInput.dispatchEvent('input');
            await postcodeInput.dispatchEvent('change');
            await postcodeInput.dispatchEvent('keyup');
            
            console.log('✅ Postcode entered successfully');
            
            // Wait for Vue to process the input and enable the search button
            await this.page.waitForTimeout(2000);
            
            // Verify the search button should now be enabled
            console.log('🔍 Checking if search button is enabled...');
            const submitButton = this.page.locator('button[type="submit"].cta:has-text("Search")');
            const isEnabled = await submitButton.isEnabled().catch(() => false);
            console.log(`🔘 Search button enabled: ${isEnabled}`);
            
            if (!isEnabled) {
                console.log('⚠️ Search button appears disabled, checking tab selection...');
                // The button might be disabled due to tabSelectedDefault condition
                // Let's wait a bit more for Vue state to update
                await this.page.waitForTimeout(3000);
            }
            
        } catch (error) {
            console.error('❌ Error filling search form:', error.message);
            
            // Take a screenshot for debugging
            try {
                await this.page.screenshot({ path: 'error-form-fill.png', fullPage: true });
                console.log('📷 Screenshot saved as error-form-fill.png for debugging');
            } catch (screenshotError) {
                console.log('⚠️ Could not take screenshot:', screenshotError.message);
            }
            
            // Log current page state
            console.log('🔍 Current page URL:', await this.page.url());
            console.log('🔍 Current page title:', await this.page.title());
            
            throw error;
        }
    }

    async executeSearch() {
        console.log('🚀 Executing search...');
        
        try {
            // Find and click the correct search button (red CTA button)
            console.log('🔍 Looking for search submit button...');
            
            // Try multiple selectors for the search button - target the specific submit button
            const searchSelectors = [
                'button[type="submit"].cta:has-text("Search"):has(img[alt*="arrow"])',
                'button.cta:has-text("Search"):has(img[src*="arrow-right"])',
                'button[type="submit"].cta:has(img[alt="arrow right icon"])',
                '.form-group button[type="submit"].cta:has-text("Search")',
                'div.col-12 button[type="submit"].cta',
                'button[type="submit"].cta:not([disabled])'
            ];
            
            let searchButton = null;
            let foundSelector = null;
            
            for (const selector of searchSelectors) {
                try {
                    const button = this.page.locator(selector).first();
                    if (await button.isVisible({ timeout: 2000 })) {
                        searchButton = button;
                        foundSelector = selector;
                        console.log(`✅ Found search button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            if (searchButton) {
                // Double-check the button is enabled before clicking
                const isButtonEnabled = await searchButton.isEnabled();
                const buttonText = await searchButton.textContent();
                console.log(`🔘 Button enabled: ${isButtonEnabled}, text: "${buttonText}"`);
                
                if (!isButtonEnabled) {
                    console.log('⚠️ Search button is disabled, taking screenshot for debugging...');
                    await this.page.screenshot({ path: 'disabled-search-button.png', fullPage: true });
                    console.log('📷 Screenshot saved as disabled-search-button.png');
                    
                    // Try to force enable the button or find an alternative
                    console.log('🔧 Attempting to enable button via JavaScript...');
                    await this.page.evaluate(() => {
                        const buttons = document.querySelectorAll('button[type="submit"].cta');
                        buttons.forEach(btn => {
                            if (btn.textContent.includes('Search')) {
                                btn.disabled = false;
                                btn.style.backgroundColor = '';
                                btn.style.cursor = '';
                            }
                        });
                    });
                    
                    await this.page.waitForTimeout(1000);
                }
                
                console.log('✅ Clicking search submit button...');
                await searchButton.click();
                
                // Wait for search results to load and check for navigation
                console.log('⏳ Waiting for search results to load...');
                await this.page.waitForTimeout(8000);
                
                // Check if we're on results page or if content has changed
                const currentUrl = this.page.url();
                console.log('📍 Current URL:', currentUrl);
                
                // Look for results content or member cards
                const hasResults = await this.page.locator('.member-card, .search-result, .member-listing, [data-member]').count();
                
                if (currentUrl.includes('search-results') || currentUrl.includes('results') || hasResults > 0) {
                    console.log('✅ Successfully executed search and found results');
                } else {
                    console.log('⚠️ Search executed but results unclear, continuing with extraction...');
                }
                
            } else {
                // Take screenshot for debugging
                await this.page.screenshot({ path: 'search-button-not-found.png', fullPage: true });
                console.log('📷 Screenshot saved as search-button-not-found.png');
                throw new Error('Search submit button not found with any selector');
            }
            
        } catch (error) {
            console.error('❌ Error executing search:', error.message);
            throw error;
        }
    }

    async automateLoadMore() {
        console.log('⏳ Starting Load More automation...');
        
        let clickCount = 0;
        const maxClicks = 50; // Safety limit
        
        while (clickCount < maxClicks) {
            try {
                // Look for Load More button
                const loadMoreButton = this.page.locator('button.btn-result, .btn-result').first();
                
                // Alternative selector if main one doesn't work
                const altLoadMoreButton = this.page.locator('button').filter({
                    hasText: /load more/i
                }).first();
                
                let buttonToClick = null;
                
                if (await loadMoreButton.isVisible() && await loadMoreButton.isEnabled()) {
                    buttonToClick = loadMoreButton;
                } else if (await altLoadMoreButton.isVisible() && await altLoadMoreButton.isEnabled()) {
                    buttonToClick = altLoadMoreButton;
                }
                
                if (buttonToClick) {
                    console.log(`📥 Clicking Load More button (click ${clickCount + 1})...`);
                    await buttonToClick.click();
                    
                    clickCount++;
                    
                    // Wait for new content to load
                    await this.page.waitForTimeout(4000);
                    
                    // Check if button still exists and is enabled
                    const stillExists = await buttonToClick.isVisible().catch(() => false);
                    const stillEnabled = await buttonToClick.isEnabled().catch(() => false);
                    
                    if (!stillExists || !stillEnabled) {
                        console.log('✅ Load More button disappeared or disabled, all content loaded');
                        break;
                    }
                    
                } else {
                    console.log('✅ No Load More button found, all content loaded');
                    break;
                }
                
            } catch (error) {
                console.log('❌ Error during Load More automation:', error.message);
                break;
            }
        }
        
        console.log(`✅ Load More automation complete. Clicked ${clickCount} times`);
        
        // Wait a bit more for final content to settle
        await this.page.waitForTimeout(2000);
    }

    async extractMemberData() {
        console.log('📊 Extracting member data from DOM...');
        
        // First try to find structured member elements
        console.log('🔍 Looking for structured member containers...');
        const memberContainers = await this.page.locator('.member-card, .search-result, .member-listing, [data-member], .member, .listing-item').count();
        console.log(`📋 Found ${memberContainers} potential member containers`);
        
        if (memberContainers > 0) {
            console.log('🚀 Extracting from structured containers...');
            const structuredData = await this.extractFromContainers();
            if (structuredData.length > 0) {
                this.allMembers = structuredData;
                this.totalCount = structuredData.length;
                console.log(`✅ Extracted ${this.totalCount} members from structured data`);
                return;
            }
        }
        
        // Fall back to text-based extraction
        console.log('📏 Falling back to text-based extraction...');
        const extractedData = await this.page.evaluate(() => {
            const allMembers = [];
            const pageText = document.body.innerText;
            const lines = pageText.split('\n').filter(line => line.trim().length > 0);
            
            let currentMember = {};
            let memberCount = 0;
            
            console.log('Processing', lines.length, 'lines of text...');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Skip navigation and UI elements
                if (line.includes('Skip to') || line.includes('STEP') || 
                    line.includes('Load More') || line.includes('Toggle') ||
                    line.includes('Filter') || line.includes('Sort by')) {
                    continue;
                }
                
                // Look for email patterns to identify member blocks
                const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                    // Save previous member if exists
                    if (currentMember.Email) {
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
                    for (let j = Math.max(0, i-8); j < i; j++) {
                        const nearbyLine = lines[j].trim();
                        
                        // Look for name patterns (First Last or First Middle Last)
                        const possibleName = nearbyLine.match(/^([A-Z][a-z]+(?:\s[A-Z]\.?\s?[a-z]*)*\s[A-Z][a-z]+)$/);
                        if (possibleName && !nearbyLine.includes('@') && 
                            !nearbyLine.includes('http') && !nearbyLine.includes('www') &&
                            nearbyLine.length < 60 && nearbyLine.length > 5) {
                            
                            const fullName = possibleName[1];
                            currentMember.Name = fullName;
                            
                            // Split name into parts
                            const nameParts = fullName.split(' ').filter(part => part.length > 0);
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
                
                // Extract other data only if we have a current member
                if (currentMember.Email) {
                    // Look for phone numbers
                    const phoneMatch = line.match(/(\+61\d{9}|\d{10}|\(\d{2}\)\s?\d{4}\s?\d{4})/);
                    if (phoneMatch && !currentMember.Phone) {
                        currentMember.Phone = phoneMatch[1];
                    }
                    
                    // Look for addresses (contains Australian state abbreviations)
                    if ((line.includes(' VIC ') || line.includes(' NSW ') || line.includes(' QLD ') || 
                         line.includes(' SA ') || line.includes(' WA ') || line.includes(', VIC,') ||
                         line.includes(', NSW,') || line.includes(', QLD,') || line.includes(', SA,') ||
                         line.includes(', WA,')) && !currentMember.BusinessAddress) {
                        currentMember.BusinessAddress = line;
                    }
                    
                    // Look for company names
                    if ((line.includes('Pty Ltd') || line.includes('& Associates') || 
                         line.includes('Limited') || line.includes('Partners') || 
                         line.includes('Group') || line.includes('Accounting') ||
                         line.includes('Advisory') || line.includes('Chartered')) && 
                        !currentMember.Company && line.length < 100 && 
                        !line.includes('@') && !line.includes('http')) {
                        currentMember.Company = line;
                    }
                    
                    // Look for professional designations
                    if ((line === 'CA' || line === 'FCA' || line === 'CPA' || line === 'FCPA') && 
                        !currentMember.Designation) {
                        currentMember.Designation = line;
                    }
                    
                    // Look for website URLs
                    const websiteMatch = line.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
                    if (websiteMatch && !currentMember.CompanyWebsite) {
                        currentMember.CompanyWebsite = websiteMatch[1];
                    }
                }
            }
            
            // Add the last member
            if (currentMember.Email) {
                allMembers.push(currentMember);
                memberCount++;
            }
            
            console.log('Extraction complete. Found', memberCount, 'members');
            
            return {
                totalCount: memberCount,
                searchDetails: allMembers
            };
        });
        
        this.allMembers = extractedData.searchDetails;
        this.totalCount = extractedData.totalCount;
        
        console.log(`✅ Extracted ${this.totalCount} members from DOM`);
        
        return extractedData;
    }

    async extractFromContainers() {
        console.log('🗓️ Extracting member data from structured containers...');
        
        const containerSelectors = [
            '.member-card',
            '.search-result', 
            '.member-listing',
            '[data-member]',
            '.member',
            '.listing-item',
            '.result-item',
            '.card'
        ];
        
        for (const selector of containerSelectors) {
            const containers = await this.page.locator(selector);
            const count = await containers.count();
            
            if (count > 0) {
                console.log(`📋 Found ${count} containers with selector: ${selector}`);
                
                const members = await containers.evaluateAll(elements => {
                    return elements.map(el => {
                        const getText = (sel) => {
                            const elem = el.querySelector(sel);
                            return elem ? elem.textContent.trim() : '';
                        };
                        
                        const getLink = (sel) => {
                            const elem = el.querySelector(sel);
                            return elem ? elem.href : null;
                        };
                        
                        // Extract email
                        const emailMatch = el.textContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                        if (!emailMatch) return null; // Skip if no email found
                        
                        // Extract name (try different selectors)
                        let name = getText('.name') || getText('.member-name') || getText('h3') || getText('h2') || getText('h4') || getText('.title');
                        
                        // Extract company
                        let company = getText('.company') || getText('.business') || getText('.organization');
                        
                        // Extract phone
                        const phoneMatch = el.textContent.match(/(\+61\d{9}|\d{10}|\(\d{2}\)\s?\d{4}\s?\d{4})/);
                        const phone = phoneMatch ? phoneMatch[1] : '';
                        
                        // Extract address
                        let address = getText('.address') || getText('.location');
                        if (!address) {
                            // Look for Australian address patterns in text
                            const addressMatch = el.textContent.match(/[^\n]*(?:VIC|NSW|QLD|SA|WA|NT|ACT|TAS)[^\n]*/i);
                            address = addressMatch ? addressMatch[0].trim() : '';
                        }
                        
                        // Extract designation (CA, CPA, etc.)
                        const designationMatch = el.textContent.match(/\b(CA|CPA|FCCA|ACCA|CTA)\b/);
                        const designation = designationMatch ? designationMatch[1] : '';
                        
                        // Parse name parts
                        const nameParts = name.split(' ').filter(p => p.length > 0);
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts[nameParts.length - 1] || '';
                        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
                        
                        return {
                            strSelectedMemberType: '',
                            Name: name,
                            PreferredName: firstName,
                            FirstName: firstName,
                            MiddleName: middleName,
                            LastName: lastName,
                            Company: company,
                            BusinessAddress: address,
                            Phone: phone,
                            Email: emailMatch[0],
                            CompanyWebsite: getLink('a[href*="http"]'),
                            Designation: designation,
                            Specialties: null,
                            SpecialConditions: '',
                            Specialisation: '',
                            Longitude: null,
                            Latitude: null
                        };
                    }).filter(member => member !== null);
                });
                
                if (members.length > 0) {
                    console.log(`✅ Successfully extracted ${members.length} members from ${selector} containers`);
                    return members;
                }
            }
        }
        
        console.log('⚠️ No structured member data found in any containers');
        return [];
    }

    async saveToJSON(filename = 'ca_members_headed.json') {
        console.log('💾 Saving results to JSON file...');
        
        const output = {
            totalCount: this.totalCount,
            searchDetails: this.allMembers
        };
        
        try {
            await fs.writeFile(filename, JSON.stringify(output, null, 2));
            console.log(`✅ Results saved to ${filename}`);
            console.log(`📊 File contains ${this.totalCount} members`);
        } catch (error) {
            console.error('❌ Error saving results:', error);
        }
    }

    async close() {
        if (this.browser) {
            console.log('🔚 Closing browser...');
            await this.browser.close();
        }
    }

    async scrapeAll() {
        try {
            console.log('🚀 Starting comprehensive CA scraping automation...');
            
            // Step 1: Initialize browser
            console.log('📋 Step 1/7: Initializing browser...');
            await this.init();
            console.log('✅ Step 1 completed: Browser initialized');
            
            // Step 2: Navigate to search page
            console.log('📋 Step 2/7: Navigating to search page...');
            await this.navigateToSearchPage();
            console.log('✅ Step 2 completed: Successfully navigated to search page');
            
            // Step 3: Fill search form
            console.log('📋 Step 3/7: Filling search form...');
            await this.fillSearchForm();
            console.log('✅ Step 3 completed: Search form filled');
            
            // Step 4: Execute search
            console.log('📋 Step 4/7: Executing search...');
            await this.executeSearch();
            console.log('✅ Step 4 completed: Search executed');
            
            // Step 5: Automate Load More
            console.log('📋 Step 5/7: Automating Load More clicks...');
            await this.automateLoadMore();
            console.log('✅ Step 5 completed: Load More automation finished');
            
            // Step 6: Extract data
            console.log('📋 Step 6/7: Extracting member data...');
            await this.extractMemberData();
            console.log('✅ Step 6 completed: Member data extracted');
            
            // Step 7: Save to JSON
            console.log('📋 Step 7/7: Saving results to JSON...');
            await this.saveToJSON();
            console.log('✅ Step 7 completed: Results saved to file');
            
            console.log('🎉 Scraping automation completed successfully!');
            console.log(`📊 Total members extracted: ${this.totalCount}`);
            
            return {
                totalCount: this.totalCount,
                searchDetails: this.allMembers
            };
            
        } catch (error) {
            console.error('❌ Scraping failed:', error);
            console.log('🔍 Browser left open for inspection. Close manually when done.');
            throw error;
        } finally {
            // Keep browser open for manual inspection in all cases
            console.log('🔍 Automation process finished. Browser left open for inspection.');
        }
    }

    async resetSearchForm() {
        console.log('🔄 Resetting search form for new postcode...');
        
        try {
            // Navigate back to the search page to reset the form
            await this.page.goto('https://www.charteredaccountantsanz.com/find-a-ca', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            // Wait for Vue.js to initialize
            await this.page.waitForTimeout(3000);
            
            console.log('✅ Search form reset successfully');
        } catch (error) {
            console.error('❌ Error resetting search form:', error.message);
            throw error;
        }
    }

    async searchPostcode(postcode) {
        console.log(`🎯 Starting search for postcode: ${postcode}`);
        
        try {
            // Fill search form with the specific postcode
            await this.fillSearchForm(postcode);
            
            // Execute search
            await this.executeSearch();
            
            // Automate Load More to get all results
            await this.automateLoadMore();
            
            // Extract member data
            const data = await this.extractMemberData();
            
            console.log(`✅ Completed search for postcode ${postcode}: ${data.totalCount} members found`);
            
            return {
                postcode: postcode,
                totalCount: data.totalCount,
                members: this.allMembers
            };
            
        } catch (error) {
            console.error(`❌ Error searching postcode ${postcode}:`, error.message);
            return {
                postcode: postcode,
                totalCount: 0,
                members: [],
                error: error.message
            };
        }
    }

    async scrapeAllPostcodes(postcodes = null, options = {}) {
        const {
            batchSize = 10,
            delayBetweenPostcodes = 5000,
            saveProgress = true,
            resumeFrom = null,
            outputFile = 'ca_members_all_postcodes.json'
        } = options;
        
        console.log('🚀 Starting comprehensive Australian postcode scraping...');
        
        // Load postcode list
        const AustralianPostcodes = require('./australian-postcodes.js');
        const postcodeManager = new AustralianPostcodes();
        
        let postcodeList;
        if (postcodes) {
            postcodeList = postcodes;
        } else {
            postcodeList = postcodeManager.getAllPostcodes();
            console.log(`📋 Loaded ${postcodeList.length} total postcodes to process`);
        }
        
        // Handle resume functionality
        let startIndex = 0;
        if (resumeFrom) {
            startIndex = postcodeList.indexOf(resumeFrom);
            if (startIndex === -1) {
                console.log(`⚠️ Resume postcode ${resumeFrom} not found, starting from beginning`);
                startIndex = 0;
            } else {
                console.log(`🔄 Resuming from postcode ${resumeFrom} (index ${startIndex})`);
            }
        }
        
        const allResults = [];
        let processedCount = 0;
        let totalMembers = 0;
        
        try {
            // Initialize browser
            console.log('📋 Step 1: Initializing browser...');
            await this.init();
            console.log('✅ Browser initialized successfully');
            
            // Navigate to search page initially
            console.log('📋 Step 2: Navigating to search page...');
            await this.navigateToSearchPage();
            console.log('✅ Initial navigation completed');
            
            // Process postcodes
            for (let i = startIndex; i < postcodeList.length; i++) {
                const postcode = postcodeList[i];
                const progressPercent = ((i + 1) / postcodeList.length * 100).toFixed(1);
                
                console.log(`\n🎯 Processing postcode ${postcode} (${i + 1}/${postcodeList.length} - ${progressPercent}%)`);
                
                try {
                    // Reset form for new search (except for first iteration)
                    if (i > startIndex) {
                        await this.resetSearchForm();
                    }
                    
                    // Search the postcode
                    const result = await this.searchPostcode(postcode);
                    allResults.push(result);
                    
                    processedCount++;
                    totalMembers += result.totalCount;
                    
                    console.log(`✅ Postcode ${postcode} completed: ${result.totalCount} members (Total so far: ${totalMembers})`);
                    
                    // Save progress periodically
                    if (saveProgress && processedCount % batchSize === 0) {
                        await this.saveProgressResults(allResults, outputFile, processedCount, postcodeList.length);
                    }
                    
                    // Delay between postcodes to avoid being blocked
                    if (i < postcodeList.length - 1) {
                        console.log(`⏳ Waiting ${delayBetweenPostcodes}ms before next postcode...`);
                        await this.page.waitForTimeout(delayBetweenPostcodes);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error processing postcode ${postcode}:`, error.message);
                    allResults.push({
                        postcode: postcode,
                        totalCount: 0,
                        members: [],
                        error: error.message
                    });
                }
            }
            
            // Save final results
            console.log('\n💾 Saving final comprehensive results...');
            await this.saveFinalResults(allResults, outputFile);
            
            console.log('🎉 All postcodes processing completed successfully!');
            console.log(`📊 Total postcodes processed: ${processedCount}`);
            console.log(`📊 Total members found: ${totalMembers}`);
            
            return {
                totalPostcodes: processedCount,
                totalMembers: totalMembers,
                results: allResults
            };
            
        } catch (error) {
            console.error('❌ Comprehensive scraping failed:', error);
            
            // Save partial results
            if (allResults.length > 0) {
                console.log('💾 Saving partial results due to error...');
                await this.saveFinalResults(allResults, `partial_${outputFile}`);
            }
            
            throw error;
        } finally {
            console.log('🔍 Scraping process finished. Browser left open for inspection.');
        }
    }

    async saveProgressResults(results, filename, processed, total) {
        const progressData = {
            status: 'in_progress',
            processed: processed,
            total: total,
            progress_percent: (processed / total * 100).toFixed(1),
            last_updated: new Date().toISOString(),
            results: results
        };
        
        const progressFile = `progress_${filename}`;
        
        try {
            await fs.writeFile(progressFile, JSON.stringify(progressData, null, 2));
            console.log(`💾 Progress saved to ${progressFile} (${processed}/${total} postcodes)`);
        } catch (error) {
            console.error('❌ Error saving progress:', error.message);
        }
    }

    async saveFinalResults(results, filename) {
        // Aggregate all members from all postcodes
        const allMembers = [];
        const summaryByPostcode = [];
        let totalMembers = 0;
        let successfulPostcodes = 0;
        let failedPostcodes = 0;
        
        for (const result of results) {
            if (result.error) {
                failedPostcodes++;
            } else {
                successfulPostcodes++;
                allMembers.push(...result.members);
                totalMembers += result.totalCount;
            }
            
            summaryByPostcode.push({
                postcode: result.postcode,
                memberCount: result.totalCount,
                state: this.getStateForPostcode(result.postcode),
                status: result.error ? 'failed' : 'success',
                error: result.error || null
            });
        }
        
        const finalOutput = {
            summary: {
                total_postcodes_processed: results.length,
                successful_postcodes: successfulPostcodes,
                failed_postcodes: failedPostcodes,
                total_members_found: totalMembers,
                scrape_completed: new Date().toISOString(),
                status: 'completed'
            },
            postcode_summary: summaryByPostcode,
            all_members: allMembers
        };
        
        try {
            await fs.writeFile(filename, JSON.stringify(finalOutput, null, 2));
            console.log(`✅ Final results saved to ${filename}`);
            console.log(`📊 Total members: ${totalMembers} across ${successfulPostcodes} postcodes`);
        } catch (error) {
            console.error('❌ Error saving final results:', error.message);
        }
    }

    getStateForPostcode(postcode) {
        const AustralianPostcodes = require('./australian-postcodes.js');
        const postcodeManager = new AustralianPostcodes();
        return postcodeManager.getState(postcode);
    }
}

async function main() {
    const scraper = new HeadedCAScraper();
    
    try {
        const result = await scraper.scrapeAll();
        console.log('✅ Scraping completed successfully');
        console.log('📖 Keep the browser open to inspect results. Press Ctrl+C to exit.');
        return result;
    } catch (error) {
        console.error('❌ Main process failed:', error);
        console.log('📖 Browser left open for debugging. Press Ctrl+C to exit.');
        
        // Don't automatically close browser on error - leave it for debugging
        // await scraper.close();
        throw error;
    }
}

if (require.main === module) {
    main();
}

module.exports = HeadedCAScraper;