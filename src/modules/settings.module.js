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
                if (window.SidekickModules?.Core?.ChromeStorage) {
                    console.log("⚙️ Core module with ChromeStorage ready for Settings");
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
            console.log("⚙️ Settings: Creating settings panel");
            
            // Remove existing panel if present
            const existingPanel = document.querySelector('.sidekick-settings-panel');
            if (existingPanel) {
                existingPanel.remove();
                console.log("⚙️ Settings: Removed existing panel");
                return; // Toggle behavior
            }
            
            const panel = document.createElement('div');
            panel.className = 'sidekick-settings-panel';
            panel.style.cssText = `
                position: fixed;
                top: 50px;
                right: 15px;
                width: 300px;
                background: linear-gradient(135deg, #2a2a2a, #1f1f1f);
                border: 1px solid #444;
                border-radius: 8px;
                z-index: 10001;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                backdrop-filter: blur(20px);
                color: #fff;
                font-family: Arial, sans-serif;
            `;
            
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
                    
                    <!-- Xanax Viewer Settings -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0; padding-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px;">💊 Xanax Viewer Settings</h4>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Auto Refresh Limit:</label>
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <input type="range" id="sidekick-xanax-autolimit" min="0" max="100" value="0" 
                                       style="flex: 1; accent-color: #4CAF50;">
                                <span id="sidekick-xanax-autolimit-display" style="color: #fff; min-width: 30px;">0</span>
                            </div>
                            <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                                Number of faction members to auto-refresh (closest level to you)
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                                <input type="checkbox" id="sidekick-xanax-relative" style="accent-color: #4CAF50;">
                                <span>Show Relative Values</span>
                            </label>
                            <div style="font-size: 12px; color: #aaa; margin-top: 5px; margin-left: 25px;">
                                Display Xanax usage relative to your own usage
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button id="sidekick-save-xanax-settings" style="flex: 1; padding: 10px; background: #9C27B0; 
                                                                             border: none; color: white; border-radius: 5px; 
                                                                             font-weight: bold; cursor: pointer;">
                                💾 Save Xanax Settings
                            </button>
                            <button id="sidekick-clear-xanax-cache" style="flex: 1; padding: 10px; background: #FF5722; 
                                                                           border: none; color: white; border-radius: 5px; 
                                                                           font-weight: bold; cursor: pointer;">
                                🗑️ Clear Cache
                            </button>
                        </div>
                        
                        <div id="sidekick-xanax-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                             background: rgba(255,255,255,0.1); color: #ccc; margin-top: 10px;">
                            Xanax Viewer settings loaded
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);
            this.attachEventListeners(panel);
        },

        // Attach event listeners to settings panel
        attachEventListeners(panel) {
            const saveBtn = panel.querySelector('#sidekick-save-settings');
            const testBtn = panel.querySelector('#sidekick-test-api');
            const apiInput = panel.querySelector('#sidekick-api-key');
            const statusDiv = panel.querySelector('#sidekick-api-status');

            // Xanax Viewer elements
            const xanaxAutoLimitSlider = panel.querySelector('#sidekick-xanax-autolimit');
            const xanaxAutoLimitDisplay = panel.querySelector('#sidekick-xanax-autolimit-display');
            const xanaxRelativeCheckbox = panel.querySelector('#sidekick-xanax-relative');
            const saveXanaxBtn = panel.querySelector('#sidekick-save-xanax-settings');
            const clearCacheBtn = panel.querySelector('#sidekick-clear-xanax-cache');
            const xanaxStatusDiv = panel.querySelector('#sidekick-xanax-status');

            // Load existing API key
            this.loadApiKey().then(apiKey => {
                if (apiKey) {
                    apiInput.value = apiKey;
                    statusDiv.textContent = 'API key loaded from storage';
                    statusDiv.style.background = 'rgba(76, 175, 80, 0.3)';
                }
            });

            // Load existing Xanax Viewer settings
            this.loadXanaxViewerSettings().then(settings => {
                xanaxAutoLimitSlider.value = settings.autoLimit || 0;
                xanaxAutoLimitDisplay.textContent = settings.autoLimit || 0;
                xanaxRelativeCheckbox.checked = settings.showRelative || false;
                
                // Also update the Xanax Viewer module with loaded settings
                if (window.SidekickModules?.XanaxViewer) {
                    window.SidekickModules.XanaxViewer.apiKey = settings.apiKey || '';
                    window.SidekickModules.XanaxViewer.autoLimit = settings.autoLimit || 0;
                    window.SidekickModules.XanaxViewer.showRelative = settings.showRelative || false;
                }
            });

            // Auto-limit slider update
            xanaxAutoLimitSlider.addEventListener('input', () => {
                xanaxAutoLimitDisplay.textContent = xanaxAutoLimitSlider.value;
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
                    
                    // Notify Clock module of API key update
                    if (window.SidekickModules?.Clock?.updateApiKey) {
                        await window.SidekickModules.Clock.updateApiKey(apiKey);
                    }
                    
                    // Notify Xanax Viewer module of API key update
                    if (window.SidekickModules?.XanaxViewer?.setApiKey) {
                        await window.SidekickModules.XanaxViewer.setApiKey(apiKey);
                    }
                    
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

            // Save Xanax Viewer settings
            saveXanaxBtn.addEventListener('click', async () => {
                const settings = {
                    apiKey: apiInput.value.trim(),
                    autoLimit: parseInt(xanaxAutoLimitSlider.value),
                    showRelative: xanaxRelativeCheckbox.checked
                };

                try {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_xanax_viewer', settings);
                    
                    // Update the Xanax Viewer module
                    if (window.SidekickModules?.XanaxViewer) {
                        window.SidekickModules.XanaxViewer.apiKey = settings.apiKey;
                        window.SidekickModules.XanaxViewer.autoLimit = settings.autoLimit;
                        window.SidekickModules.XanaxViewer.showRelative = settings.showRelative;
                        await window.SidekickModules.XanaxViewer.saveSettings();
                    }
                    
                    xanaxStatusDiv.textContent = 'Xanax Viewer settings saved successfully!';
                    xanaxStatusDiv.style.background = 'rgba(156, 39, 176, 0.3)';
                    
                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Xanax Viewer Settings',
                            'Settings saved successfully',
                            'success',
                            3000
                        );
                    }
                } catch (error) {
                    console.error('Failed to save Xanax Viewer settings:', error);
                    xanaxStatusDiv.textContent = 'Failed to save Xanax Viewer settings';
                    xanaxStatusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
                }
            });

            // Clear Xanax cache
            clearCacheBtn.addEventListener('click', async () => {
                try {
                    await window.SidekickModules.Core.ChromeStorage.set('xanaxviewer_cache', {});
                    
                    xanaxStatusDiv.textContent = 'Xanax Viewer cache cleared successfully!';
                    xanaxStatusDiv.style.background = 'rgba(255, 87, 34, 0.3)';
                    
                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Cache Cleared',
                            'Xanax Viewer cache has been cleared',
                            'info',
                            3000
                        );
                    }
                } catch (error) {
                    console.error('Failed to clear Xanax Viewer cache:', error);
                    xanaxStatusDiv.textContent = 'Failed to clear cache';
                    xanaxStatusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
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

        // Load Xanax Viewer settings from storage
        async loadXanaxViewerSettings() {
            try {
                const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_xanax_viewer');
                return settings || {
                    apiKey: '',
                    autoLimit: 0,
                    showRelative: false
                };
            } catch (error) {
                console.error('Failed to load Xanax Viewer settings:', error);
                return {
                    apiKey: '',
                    autoLimit: 0,
                    showRelative: false
                };
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