/**
 * Sidekick Chrome Extension - Background Service Worker
 * Handles extension lifecycle and background tasks
 * Version: 1.0.0
 */

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('🚀 Sidekick Extension installed/updated:', details.reason);

    if (details.reason === 'install') {
        // First installation
        console.log('🎉 Welcome to Sidekick! Extension installed successfully.');

        // Set default settings
        chrome.storage.local.set({
            'sidekick_first_install': true,
            'sidekick_version': '1.0.0',
            'sidekick_install_date': new Date().toISOString()
        });

    } else if (details.reason === 'update') {
        // Extension updated
        const previousVersion = details.previousVersion;
        console.log(`🔄 Sidekick updated from v${previousVersion} to v1.0.0`);

        chrome.storage.local.set({
            'sidekick_last_update': new Date().toISOString(),
            'sidekick_previous_version': previousVersion,
            'sidekick_version': '1.0.0'
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🌟 Sidekick Extension starting up...');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received message:', request);

    switch (request.action) {
        case 'ping':
            // Simple ping test for debugging
            sendResponse({ success: true, message: 'Background script is alive', timestamp: Date.now() });
            break;

        case 'fetchTornApi':
            // Handle Torn API calls from content scripts (avoids CORS)
            handleTornApiCall(request)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response

        case 'reportBug':
            // Handle Notion bug reporting
            handleBugReport(request.data)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response

        case 'getStorageData':
            // Helper for content scripts to access storage
            chrome.storage.local.get(request.keys, (result) => {
                sendResponse({ success: true, data: result });
            });
            return true; // Keep message channel open for async response

        case 'setStorageData':
            // Helper for content scripts to set storage
            chrome.storage.local.set(request.data, () => {
                sendResponse({ success: true });
            });
            return true;

        case 'clearStorageData':
            // Helper for content scripts to clear storage
            chrome.storage.local.clear(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'openOptionsPage':
            // Open the extension options/settings page
            chrome.runtime.openOptionsPage();
            sendResponse({ success: true });
            break;

        case 'notification':
            // Create native Chrome notifications
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: request.title || 'Sidekick',
                message: request.message || 'Notification from Sidekick'
            });
            sendResponse({ success: true });
            break;

        default:
            console.warn('Unknown action:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Bug reporting is handled securely through Cloudflare Worker
// No API keys stored in the extension code

// Handle Torn API calls from content scripts (avoids CORS issues)
async function handleTornApiCall(request) {
    try {
        console.log('🔍 Background: Making Torn API call:', request.selections);

        const { apiKey, selections, userId, endpoint: requestEndpoint } = request;

        if (!apiKey) {
            throw new Error('No API key provided');
        }

        // Determine the API endpoint based on request
        let endpoint = requestEndpoint || (userId ? `user/${userId}` : 'user');
        console.log(`🔍 Background: Using endpoint: ${endpoint}`);

        // Prepare results object
        const results = {
            success: true,
            personalstats: null,
            logs: null,
            bars: null,
            cooldowns: null,
            refills: null,
            items: null,
            profile: null,
            company: null,
            money: null
        };

        // Fetch personal stats if requested
        if (selections.includes('personalstats')) {
            console.log('📊 Background: Fetching personal stats...');
            try {
                const statsResponse = await fetch(`https://api.torn.com/${endpoint}?selections=personalstats&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!statsResponse.ok) {
                    throw new Error(`Personal stats fetch failed: ${statsResponse.status}`);
                }

                const statsData = await statsResponse.json();

                if (statsData.error) {
                    throw new Error(`API Error: ${statsData.error.error} (${statsData.error.code})`);
                }

                results.personalstats = statsData.personalstats;
                console.log('✅ Background: Personal stats retrieved successfully');

            } catch (error) {
                console.error('❌ Background: Personal stats fetch failed:', error);
                throw error;
            }
        }

        // Fetch cooldowns if requested
        if (selections.includes('cooldowns')) {
            console.log('⏰ Background: Fetching cooldowns...');
            try {
                const cooldownResponse = await fetch(`https://api.torn.com/${endpoint}?selections=cooldowns&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!cooldownResponse.ok) {
                    console.warn('⚠️ Background: Cooldown fetch failed:', cooldownResponse.status);
                    // Don't throw here, cooldowns are optional
                } else {
                    const cooldownData = await cooldownResponse.json();

                    if (cooldownData.error) {
                        console.warn('⚠️ Background: Cooldown API error:', cooldownData.error);
                        // Don't throw here, cooldowns are optional
                    } else {
                        results.cooldowns = cooldownData.cooldowns;
                        console.log('✅ Background: Cooldowns retrieved successfully');
                    }
                }

            } catch (error) {
                console.warn('⚠️ Background: Cooldown fetch failed (non-fatal):', error);
                // Continue without cooldowns
            }
        }

        // Fetch bank investment data if requested
        if (selections.includes('money')) {
            console.log('💰 Background: Fetching money data (includes bank investment)...');
            try {
                const moneyResponse = await fetch(`https://api.torn.com/${endpoint}?selections=money&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!moneyResponse.ok) {
                    console.warn('⚠️ Background: Money fetch failed:', moneyResponse.status);
                    // Don't throw here, money is optional
                } else {
                    const moneyData = await moneyResponse.json();

                    if (moneyData.error) {
                        console.warn('⚠️ Background: Money API error:', moneyData.error);
                        // Don't throw here, money is optional
                    } else {
                        results.money = moneyData;
                        console.log('✅ Background: Money data retrieved successfully:', moneyData);
                    }
                }

            } catch (error) {
                console.warn('⚠️ Background: Money fetch failed (non-fatal):', error);
                // Continue without money data
            }
        }

        // Fetch bars if requested
        if (selections.includes('bars')) {
            console.log('📊 Background: Fetching bars...');
            try {
                const barsResponse = await fetch(`https://api.torn.com/${endpoint}?selections=bars&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!barsResponse.ok) {
                    console.warn('⚠️ Background: Bars fetch failed:', barsResponse.status);
                    // Don't throw here, bars are optional
                } else {
                    const barsData = await barsResponse.json();

                    if (barsData.error) {
                        console.warn('⚠️ Background: Bars API error:', barsData.error);
                        // Don't throw here, bars are optional
                    } else {
                        results.bars = barsData.bars;
                        console.log('✅ Background: Bars retrieved successfully');
                    }
                }

            } catch (error) {
                console.warn('⚠️ Background: Bars fetch failed (non-fatal):', error);
                // Continue without bars
            }
        }

        // Fetch logs if requested
        if (selections.includes('logs')) {
            console.log('📋 Background: Fetching logs...');
            try {
                const logResponse = await fetch(`https://api.torn.com/${endpoint}?selections=log&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!logResponse.ok) {
                    console.warn('⚠️ Background: Log fetch failed:', logResponse.status);
                    // Don't throw here, logs are optional
                } else {
                    const logData = await logResponse.json();

                    if (logData.error) {
                        console.warn('⚠️ Background: Log API error:', logData.error);
                        // Don't throw here, logs are optional
                    } else {
                        results.logs = logData.log;
                        console.log('✅ Background: Logs retrieved successfully');
                    }
                }

            } catch (error) {
                console.warn('⚠️ Background: Log fetch failed (non-fatal):', error);
                // Continue without logs
            }
        }

        // 🆕 Fetch refills if requested (MOST IMPORTANT for daily task detection!)
        if (selections.includes('refills')) {
            console.log('💊 Background: Fetching refills...');
            try {
                const refillsResponse = await fetch(`https://api.torn.com/${endpoint}?selections=refills&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!refillsResponse.ok) {
                    console.warn('⚠️ Background: Refills fetch failed:', refillsResponse.status);
                    // Don't throw here, refills are optional
                } else {
                    const refillsData = await refillsResponse.json();

                    if (refillsData.error) {
                        console.warn('⚠️ Background: Refills API error:', refillsData.error);
                        // Don't throw here, refills are optional
                    } else {
                        results.refills = refillsData.refills;
                        console.log('✅ Background: Refills retrieved successfully:', refillsData.refills);
                    }
                }

            } catch (error) {
                console.warn('⚠️ Background: Refills fetch failed (non-fatal):', error);
                // Continue without refills
            }
        }

        // Fetch items from torn endpoint if requested
        if (selections.includes('items')) {
            console.log('📦 Background: Fetching items from torn endpoint...');
            try {
                const itemsResponse = await fetch(`https://api.torn.com/${endpoint}?selections=items&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!itemsResponse.ok) {
                    console.warn('⚠️ Background: Items fetch failed:', itemsResponse.status);
                } else {
                    const itemsData = await itemsResponse.json();

                    if (itemsData.error) {
                        console.warn('⚠️ Background: Items API error:', itemsData.error);
                    } else {
                        results.items = itemsData.items;
                        console.log('✅ Background: Items retrieved successfully');
                    }
                }

            } catch (error) {
                console.warn('⚠️ Background: Items fetch failed (non-fatal):', error);
            }
        }

        // Fetch profile if requested (for mug calculator)
        if (selections.includes('profile')) {
            console.log('👤 Background: Fetching profile...');
            try {
                const profileResponse = await fetch(`https://api.torn.com/${endpoint}?selections=profile&key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!profileResponse.ok) {
                    throw new Error(`Profile fetch failed: ${profileResponse.status}`);
                }

                const profileData = await profileResponse.json();

                if (profileData.error) {
                    throw new Error(`API Error: ${profileData.error.error} (${profileData.error.code})`);
                }

                // Store the complete profile data
                results.profile = profileData;
                console.log('✅ Background: Profile retrieved successfully');

            } catch (error) {
                console.error('❌ Background: Profile fetch failed:', error);
                throw error;
            }
        }

        // Fetch company data if endpoint is company/* (for mug calculator clothing store check)
        if (endpoint.startsWith('company/')) {
            console.log('🏢 Background: Fetching company data...');
            try {
                const companyResponse = await fetch(`https://api.torn.com/${endpoint}?key=${apiKey}`, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Sidekick Chrome Extension Background'
                    }
                });

                if (!companyResponse.ok) {
                    throw new Error(`Company fetch failed: ${companyResponse.status}`);
                }

                const companyData = await companyResponse.json();

                if (companyData.error) {
                    throw new Error(`API Error: ${companyData.error.error} (${companyData.error.code})`);
                }

                // Store company data
                results.company = companyData;
                console.log('✅ Background: Company data retrieved successfully');

            } catch (error) {
                console.error('❌ Background: Company fetch failed:', error);
                throw error;
            }
        }

        console.log('🎯 Background: API call completed successfully');
        return results;

    } catch (error) {
        console.error('❌ Background: Torn API call failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle bug reports via secure Cloudflare Worker (no API keys in extension)
async function handleBugReport(bugData) {
    try {
        console.log('🐛 Sending bug report via secure worker:', bugData);

        // Prepare payload for Cloudflare Worker
        const payload = {
            title: bugData.title || 'Bug Report',
            description: bugData.description || 'No description provided',
            priority: bugData.priority || 'Medium',
            screenshot: bugData.screenshot || null,
            metadata: bugData.metadata || {
                timestamp: new Date().toISOString(),
                extensionVersion: chrome.runtime.getManifest().version
            }
        };

        console.log('📦 Sending payload to worker:', JSON.stringify(payload, null, 2));

        // Send to Cloudflare Worker (handles Notion API securely)
        const response = await fetch('https://notionbugreport.akaffebtd.workers.dev/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 Worker response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Bug report failed:', errorText);

            // Try to parse error details if JSON
            let errorDetails = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorDetails = JSON.stringify(errorJson, null, 2);
                console.error('❌ Detailed error:', errorJson);
            } catch (e) {
                // Not JSON, use raw text
            }

            return {
                success: false,
                error: `Worker error: ${response.status}`,
                message: `Failed to submit bug report (${response.status}):\n\n${errorDetails}\n\nPlease check that your Cloudflare Worker has the correct Notion API credentials configured.`
            };
        }

        const result = await response.json();
        console.log('✅ Bug report sent successfully:', result);

        return {
            success: true,
            data: {
                pageId: result.id,
                url: result.url
            }
        };

    } catch (error) {
        console.error('❌ Failed to send bug report to Notion:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);

        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                success: false,
                error: 'Network error: Unable to connect to Notion API. Please check your internet connection and extension permissions.'
            };
        }

        return {
            success: false,
            error: error.message
        };
    }
}

// Handle storage changes for debugging
chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log('💾 Storage changed in', areaName, ':', changes);
});

// Handle tab updates to potentially refresh extension state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('torn.com')) {
        console.log('🔄 Torn.com tab updated:', tab.url);

        // Send message to content script that page is ready
        chrome.tabs.sendMessage(tabId, {
            action: 'pageReady',
            url: tab.url
        }).catch(() => {
            // Ignore errors if content script not ready yet
        });
    }
});

// Keep service worker alive
let keepAlive;

function startKeepAlive() {
    if (keepAlive) return;

    keepAlive = setInterval(() => {
        chrome.storage.local.get('sidekick_keepalive', () => {
            if (chrome.runtime.lastError) {
                console.log('Service worker keep-alive failed:', chrome.runtime.lastError);
            }
        });
    }, 20000); // Check every 20 seconds
}

function stopKeepAlive() {
    if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
    }
}

// Start keep-alive when service worker activates
startKeepAlive();

// Clean up when service worker is about to be terminated
self.addEventListener('beforeunload', () => {
    stopKeepAlive();
});

console.log('✅ Sidekick Background Service Worker loaded - v1.0.0');