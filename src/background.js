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

// Notion API Configuration
const NOTION_API_KEY = 'YOUR_NOTION_API_KEY_HERE'; // Replace with your Notion API key
const NOTION_DATABASE_ID = 'YOUR_NOTION_DATABASE_ID_HERE'; // Replace with your Notion database ID

// Handle bug reports to Notion
async function handleBugReport(bugData) {
    try {
        console.log('🐛 Sending bug report to Notion:', bugData);
        console.log('🔑 Using API key:', NOTION_API_KEY ? 'API key present' : 'API key missing');
        console.log('🗂️ Using database ID:', NOTION_DATABASE_ID);
        
        // Prepare Notion API payload
        const notionPayload = {
            parent: {
                database_id: NOTION_DATABASE_ID
            },
            properties: {
                Name: {
                    title: [
                        {
                            text: {
                                content: bugData.title
                            }
                        }
                    ]
                }
            }
        };
        
        // Only add optional properties if they might exist
        // Try common property names for description
        const description = bugData.description;
        if (description) {
            // Try multiple possible property names for description
            notionPayload.properties.Description = {
                rich_text: [{ text: { content: description } }]
            };
        }
        
        console.log('📦 Notion payload prepared:', JSON.stringify(notionPayload, null, 2));
        
        // Send request to Notion API
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify(notionPayload)
        });
        
        console.log('📡 Notion API response status:', response.status);
        console.log('📡 Notion API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Notion API error response:', errorText);
            throw new Error(`Notion API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Bug report sent to Notion successfully:', result.id);
        
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