/**
 * Sidekick Chrome Extension - Popup Script
 * Handles the extension popup interface
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎛️ Sidekick popup loaded');
    
    // Get DOM elements - General Tab
    const apiKeyInput = document.getElementById('apiKey');
    const xanaxViewerCheckbox = document.getElementById('xanaxViewer');
    const attackButtonMoverCheckbox = document.getElementById('attackButtonMover');
    const blockTrainingCheckbox = document.getElementById('blockTraining');
    const timeOnTabCheckbox = document.getElementById('timeOnTab');
    const npcAttackTimerCheckbox = document.getElementById('npcAttackTimer');
    const randomTargetCheckbox = document.getElementById('randomTarget');
    const saveButton = document.getElementById('saveSettings');
    const reportIssuesButton = document.getElementById('reportIssues');
    const clearDataButton = document.getElementById('clearData');
    const statusDiv = document.getElementById('status');
    
    // Get DOM elements - Xanax Tab
    const xanaxApiKeyInput = document.getElementById('xanaxApiKey');
    const autoLimitSlider = document.getElementById('autoLimitSlider');
    const autoLimitValue = document.getElementById('autoLimitValue');
    const showRelativeCheckbox = document.getElementById('showRelativeCheckbox');
    const cacheCounter = document.getElementById('cacheCounter');
    const saveXanaxButton = document.getElementById('saveXanaxSettings');
    const clearCacheButton = document.getElementById('clearCache');
    const xanaxStatusDiv = document.getElementById('xanaxStatus');
    
    // Get tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Reload cache counter if switching to xanax tab
            if (targetTab === 'xanax') {
                loadCacheCounter();
            }
        });
    });
    
    // Load saved settings
    loadSettings();
    
    // Event listeners - General Tab
    saveButton.addEventListener('click', saveSettings);
    reportIssuesButton.addEventListener('click', reportIssues);
    clearDataButton.addEventListener('click', clearData);
    xanaxViewerCheckbox.addEventListener('change', handleXanaxViewerToggle);
    attackButtonMoverCheckbox.addEventListener('change', handleAttackButtonMoverToggle);
    blockTrainingCheckbox.addEventListener('change', handleBlockTrainingToggle);
    timeOnTabCheckbox.addEventListener('change', handleTimeOnTabToggle);
    npcAttackTimerCheckbox.addEventListener('change', handleNpcAttackTimerToggle);
    randomTargetCheckbox.addEventListener('change', handleRandomTargetToggle);
    
    // Event listeners - Xanax Tab
    autoLimitSlider.addEventListener('input', updateAutoLimitValue);
    saveXanaxButton.addEventListener('click', saveXanaxSettings);
    clearCacheButton.addEventListener('click', clearXanaxCache);
    
    function updateAutoLimitValue() {
        autoLimitValue.textContent = autoLimitSlider.value;
    }
    
    function loadSettings() {
        chrome.storage.local.get([
            'sidekick_api_key',
            'sidekick_xanax_viewer',
            'sidekick_attack_button_mover',
            'sidekick_block_training',
            'sidekick_time_on_tab',
            'sidekick_npc_attack_timer',
            'sidekick_random_target'
        ], function(result) {
            // Load global API key
            if (result.sidekick_api_key) {
                apiKeyInput.value = result.sidekick_api_key;
            }
            
            // Load xanax viewer settings
            if (result.sidekick_xanax_viewer) {
                xanaxViewerCheckbox.checked = result.sidekick_xanax_viewer.isEnabled !== false;
                
                // Load Xanax-specific settings
                xanaxApiKeyInput.value = result.sidekick_xanax_viewer.apiKey || '';
                autoLimitSlider.value = result.sidekick_xanax_viewer.autoLimit || 0;
                autoLimitValue.textContent = autoLimitSlider.value;
                showRelativeCheckbox.checked = result.sidekick_xanax_viewer.showRelative || false;
            } else {
                xanaxViewerCheckbox.checked = true; // Default enabled
                autoLimitSlider.value = 0;
                autoLimitValue.textContent = '0';
                showRelativeCheckbox.checked = false;
            }
            
            // Load attack button mover setting
            if (result.sidekick_attack_button_mover) {
                attackButtonMoverCheckbox.checked = result.sidekick_attack_button_mover.isEnabled !== false;
            } else {
                attackButtonMoverCheckbox.checked = true; // Default enabled
            }
            
            // Load block training setting
            if (result.sidekick_block_training) {
                blockTrainingCheckbox.checked = result.sidekick_block_training.isBlocked === true;
            } else {
                blockTrainingCheckbox.checked = false; // Default disabled
            }
            
            // Load time on tab setting
            if (result.sidekick_time_on_tab) {
                timeOnTabCheckbox.checked = result.sidekick_time_on_tab.isEnabled === true;
            } else {
                timeOnTabCheckbox.checked = false; // Default disabled
            }
            
            // Load NPC attack timer setting
            if (result.sidekick_npc_attack_timer) {
                npcAttackTimerCheckbox.checked = result.sidekick_npc_attack_timer.isEnabled === true;
            } else {
                npcAttackTimerCheckbox.checked = false; // Default disabled
            }
            
            // Load random target setting
            if (result.sidekick_random_target) {
                randomTargetCheckbox.checked = result.sidekick_random_target.isEnabled === true;
            } else {
                randomTargetCheckbox.checked = false; // Default disabled
            }
            
            // Load cache counter
            loadCacheCounter();
        });
    }
    
    function loadCacheCounter() {
        chrome.storage.local.get(['xanaxviewer_cache'], function(result) {
            const cache = result.xanaxviewer_cache || {};
            cacheCounter.textContent = Object.keys(cache).length;
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
    
    function saveXanaxSettings() {
        // Get current xanax viewer settings
        chrome.storage.local.get(['sidekick_xanax_viewer'], function(result) {
            const currentSettings = result.sidekick_xanax_viewer || {};
            
            // Update with new values
            const updatedSettings = {
                ...currentSettings,
                apiKey: xanaxApiKeyInput.value.trim(),
                autoLimit: parseInt(autoLimitSlider.value),
                showRelative: showRelativeCheckbox.checked
            };
            
            chrome.storage.local.set({ sidekick_xanax_viewer: updatedSettings }, function() {
                showXanaxStatus('Xanax Viewer settings saved successfully!', 'success');
                
                // Send message to all Torn.com tabs to reload xanax viewer
                chrome.tabs.query({ url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function(tabs) {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'reloadXanaxViewer'
                        }).catch(() => {
                            // Ignore errors for tabs without content script
                        });
                    });
                });
            });
        });
    }
    
    function clearXanaxCache() {
        if (confirm('Are you sure you want to clear the Xanax Viewer cache?')) {
            chrome.storage.local.set({ xanaxviewer_cache: {} }, function() {
                showXanaxStatus('Cache cleared successfully!', 'success');
                loadCacheCounter();
            });
        }
    }
    
    function handleXanaxViewerToggle() {
        toggleModule('xanaxViewer', xanaxViewerCheckbox.checked, 'Xanax Viewer');
    }
    
    function handleAttackButtonMoverToggle() {
        toggleModule('attackButtonMover', attackButtonMoverCheckbox.checked, 'Fast Attack');
    }
    
    function handleBlockTrainingToggle() {
        toggleModule('blockTraining', blockTrainingCheckbox.checked, 'Block Training');
    }
    
    function handleTimeOnTabToggle() {
        toggleModule('timeOnTab', timeOnTabCheckbox.checked, 'Time on Tab');
    }
    
    function handleNpcAttackTimerToggle() {
        toggleModule('npcAttackTimer', npcAttackTimerCheckbox.checked, 'NPC Attack Timer');
    }
    
    function handleRandomTargetToggle() {
        toggleModule('randomTarget', randomTargetCheckbox.checked, 'Random Target');
    }
    
    function toggleModule(moduleType, enabled, displayName) {
        // Send message to all Torn.com tabs to toggle the module
        chrome.tabs.query({ url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleModule',
                    moduleType: moduleType,
                    enabled: enabled
                }).then(response => {
                    if (response && response.success) {
                        showStatus(
                            `${displayName} ${enabled ? 'enabled' : 'disabled'}!`,
                            'success'
                        );
                    }
                }).catch(() => {
                    // Ignore errors for tabs without content script
                });
            });
        });
    }
    
    function reportIssues() {
        // Send message to the active tab to open the bug reporter
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('torn.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'openBugReporter'
                }).then(response => {
                    if (response && response.success) {
                        showStatus('Bug reporter opened!', 'success');
                        window.close(); // Close the popup
                    } else {
                        showStatus('Please navigate to Torn.com to report issues', 'error');
                    }
                }).catch(() => {
                    showStatus('Please navigate to Torn.com to report issues', 'error');
                });
            } else {
                showStatus('Please navigate to Torn.com to report issues', 'error');
            }
        });
    }
    
    function clearData() {
        if (confirm('Are you sure you want to clear all Sidekick data? This cannot be undone.')) {
            chrome.storage.local.clear(function() {
                chrome.storage.sync.clear(function() {
                    showStatus('All data cleared successfully!', 'success');
                    
                    // Reset form
                    apiKeyInput.value = '';
                    xanaxViewerCheckbox.checked = true; // Reset to default enabled
                    attackButtonMoverCheckbox.checked = true; // Reset to default enabled
                    blockTrainingCheckbox.checked = false; // Reset to default disabled
                    timeOnTabCheckbox.checked = false; // Reset to default disabled
                    npcAttackTimerCheckbox.checked = false; // Reset to default disabled
                    randomTargetCheckbox.checked = false; // Reset to default disabled
                    
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
    
    function showXanaxStatus(message, type = 'success') {
        xanaxStatusDiv.textContent = message;
        xanaxStatusDiv.className = `status ${type === 'error' ? 'error' : ''}`;
        xanaxStatusDiv.style.display = 'block';
        
        setTimeout(() => {
            xanaxStatusDiv.style.display = 'none';
        }, 3000);
    }
});