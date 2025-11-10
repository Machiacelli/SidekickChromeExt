/**
 * Sidekick Chrome Extension - Popup Script
 * Handles the extension popup interface
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎛️ Sidekick popup loaded');
    
    // Get DOM elements
    const apiKeyInput = document.getElementById('apiKey');
    const autoStartCheckbox = document.getElementById('autoStart');
    const notificationsCheckbox = document.getElementById('notifications');
    const saveButton = document.getElementById('saveSettings');
    const openTornButton = document.getElementById('openTorn');
    const clearDataButton = document.getElementById('clearData');
    const statusDiv = document.getElementById('status');
    
    // Load saved settings
    loadSettings();
    
    // Event listeners
    saveButton.addEventListener('click', saveSettings);
    openTornButton.addEventListener('click', openTorn);
    clearDataButton.addEventListener('click', clearData);
    
    // Link handlers
    document.getElementById('reportBug').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://github.com/YOUR_USERNAME/Sidekick/issues' });
    });
    
    document.getElementById('viewSource').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://github.com/YOUR_USERNAME/Sidekick' });
    });
    
    document.getElementById('rateExtension').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID' });
    });
    
    function loadSettings() {
        chrome.storage.local.get([
            'sidekick_api_key',
            'sidekick_auto_start',
            'sidekick_notifications'
        ], function(result) {
            if (result.sidekick_api_key) {
                apiKeyInput.value = result.sidekick_api_key;
            }
            
            autoStartCheckbox.checked = result.sidekick_auto_start !== false; // Default true
            notificationsCheckbox.checked = result.sidekick_notifications !== false; // Default true
        });
    }
    
    function saveSettings() {
        const settings = {
            sidekick_api_key: apiKeyInput.value.trim(),
            sidekick_auto_start: autoStartCheckbox.checked,
            sidekick_notifications: notificationsCheckbox.checked
        };
        
        chrome.storage.local.set(settings, function() {
            showStatus('Settings saved successfully!', 'success');
            
            // Send message to all Torn.com tabs to update settings
            chrome.tabs.query({ url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: settings
                    }).catch(() => {
                        // Ignore errors for tabs without content script
                    });
                });
            });
        });
    }
    
    function openTorn() {
        chrome.tabs.query({ url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function(tabs) {
            if (tabs.length > 0) {
                // Switch to existing Torn tab
                chrome.tabs.update(tabs[0].id, { active: true });
                chrome.windows.update(tabs[0].windowId, { focused: true });
            } else {
                // Create new Torn tab
                chrome.tabs.create({ url: 'https://www.torn.com/' });
            }
            window.close();
        });
    }
    
    function clearData() {
        if (confirm('Are you sure you want to clear all Sidekick data? This cannot be undone.')) {
            chrome.storage.local.clear(function() {
                chrome.storage.sync.clear(function() {
                    showStatus('All data cleared successfully!', 'success');
                    
                    // Reset form
                    apiKeyInput.value = '';
                    autoStartCheckbox.checked = true;
                    notificationsCheckbox.checked = true;
                    
                    // Send message to all Torn.com tabs to refresh
                    chrome.tabs.query({ url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function(tabs) {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'dataCleared'
                            }).catch(() => {
                                // Ignore errors for tabs without content script
                            });
                        });
                    });
                });
            });
        }
    }
    
    function showStatus(message, type = 'success') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type === 'error' ? 'error' : ''}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
    
    // Check if we're on a Torn.com page
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab && (currentTab.url.includes('torn.com'))) {
            openTornButton.textContent = 'Switch to Torn.com';
        }
    });
});