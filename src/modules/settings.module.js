/**
 * Sidekick Chrome Extension - Settings Module
 * Handles API key management and extension settings
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("⚙️ Loading Sidekick Settings Module...");

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                if (window.SidekickModules?.Core) {
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // Settings Module Implementation
    const SettingsModule = {
        isInitialized: false,
        settingsPanel: null,

        // Initialize the settings module
        async init() {
            if (this.isInitialized) {
                console.log("⚙️ Settings Module already initialized");
                return;
            }

            console.log("⚙️ Initializing Settings Module...");

            try {
                await waitForCore();
                this.isInitialized = true;
                console.log("✅ Settings Module initialized successfully");
            } catch (error) {
                console.error("❌ Settings Module initialization failed:", error);
            }
        },

        // Create settings panel UI
        createSettingsPanel() {
            const panel = document.createElement('div');
            panel.className = 'sidekick-settings-panel';
            
            panel.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 20px 0; color: #fff; font-size: 18px;">⚙️ Settings</h3>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Torn API Key:</label>
                        <input type="text" id="sidekick-api-key" placeholder="Enter your API key..." 
                               style="width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                      color: #fff; padding: 10px; border-radius: 5px; box-sizing: border-box;">
                        <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                            Get your API key from: <a href="https://www.torn.com/preferences.php#tab=api" target="_blank" style="color: #4CAF50;">Torn Preferences</a>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <button id="sidekick-save-settings" style="flex: 1; padding: 10px; background: #4CAF50; 
                                                                  border: none; color: white; border-radius: 5px; 
                                                                  font-weight: bold; cursor: pointer;">
                            💾 Save Settings
                        </button>
                        <button id="sidekick-test-api" style="flex: 1; padding: 10px; background: #2196F3; 
                                                             border: none; color: white; border-radius: 5px; 
                                                             font-weight: bold; cursor: pointer;">
                            🧪 Test API
                        </button>
                    </div>
                    
                    <div id="sidekick-api-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                         background: rgba(255,255,255,0.1); color: #ccc;">
                        Enter your API key and click Save
                    </div>
                </div>
            `;

            this.attachEventListeners(panel);
            return panel;
        },

        // Attach event listeners to settings panel
        attachEventListeners(panel) {
            const saveBtn = panel.querySelector('#sidekick-save-settings');
            const testBtn = panel.querySelector('#sidekick-test-api');
            const apiInput = panel.querySelector('#sidekick-api-key');
            const statusDiv = panel.querySelector('#sidekick-api-status');

            // Load existing API key
            this.loadApiKey().then(apiKey => {
                if (apiKey) {
                    apiInput.value = apiKey;
                    statusDiv.textContent = 'API key loaded from storage';
                    statusDiv.style.background = 'rgba(76, 175, 80, 0.3)';
                }
            });

            // Save settings
            saveBtn.addEventListener('click', async () => {
                const apiKey = apiInput.value.trim();
                if (!apiKey) {
                    statusDiv.textContent = 'Please enter an API key';
                    statusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
                    return;
                }

                try {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_api_key', apiKey);
                    statusDiv.textContent = 'Settings saved successfully!';
                    statusDiv.style.background = 'rgba(76, 175, 80, 0.3)';
                    
                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Settings Saved',
                            'API key has been saved successfully',
                            'success',
                            3000
                        );
                    }
                } catch (error) {
                    console.error('Failed to save API key:', error);
                    statusDiv.textContent = 'Failed to save settings';
                    statusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
                }
            });

            // Test API
            testBtn.addEventListener('click', async () => {
                const apiKey = apiInput.value.trim();
                if (!apiKey) {
                    statusDiv.textContent = 'Please enter an API key first';
                    statusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
                    return;
                }

                statusDiv.textContent = 'Testing API connection...';
                statusDiv.style.background = 'rgba(255, 152, 0, 0.3)';

                try {
                    const response = await fetch(`https://api.torn.com/user/?selections=basic&key=${apiKey}`);
                    const data = await response.json();

                    if (data.error) {
                        statusDiv.textContent = `API Error: ${data.error.error}`;
                        statusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
                    } else {
                        statusDiv.textContent = `API Working! Welcome ${data.name} [${data.player_id}]`;
                        statusDiv.style.background = 'rgba(76, 175, 80, 0.3)';
                        
                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'API Test Success',
                                `Connected as ${data.name}`,
                                'success',
                                3000
                            );
                        }
                    }
                } catch (error) {
                    console.error('API test failed:', error);
                    statusDiv.textContent = 'API test failed - check your connection';
                    statusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
                }
            });
        },

        // Load API key from storage
        async loadApiKey() {
            try {
                return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
            } catch (error) {
                console.error('Failed to load API key:', error);
                return null;
            }
        },

        // Get API key for other modules
        async getApiKey() {
            return await this.loadApiKey();
        }
    };

    // Export Settings module to global namespace
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Settings = SettingsModule;
    console.log("✅ Settings Module loaded and ready");

})();