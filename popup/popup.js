/**
 * Sidekick Chrome Extension - Popup Script
 * Handles the extension popup interface
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎛️ Sidekick popup loaded');
    
    // Get DOM elements
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveSettings');
    const clearDataButton = document.getElementById('clearData');
    const statusDiv = document.getElementById('status');
    
    // Load saved settings
    loadSettings();
    
    // Event listeners
    saveButton.addEventListener('click', saveSettings);
    clearDataButton.addEventListener('click', clearData);
    
    function loadSettings() {
        chrome.storage.local.get([
            'sidekick_api_key'
        ], function(result) {
            if (result.sidekick_api_key) {
                apiKeyInput.value = result.sidekick_api_key;
            }
        });
    }
    
    function saveSettings() {
        const settings = {
            sidekick_api_key: apiKeyInput.value.trim()
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
    
    function clearData() {
        if (confirm('Are you sure you want to clear all Sidekick data? This cannot be undone.')) {
            chrome.storage.local.clear(function() {
                chrome.storage.sync.clear(function() {
                    showStatus('All data cleared successfully!', 'success');
                    
                    // Reset form
                    apiKeyInput.value = '';
                    
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
});