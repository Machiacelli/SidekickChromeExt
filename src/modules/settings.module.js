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
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
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
                <div style="padding: 20px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #fff; font-size: 18px;">⚙️ Settings</h3>
                        <button id="sidekick-close-settings" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                                                    color: #fff; width: 30px; height: 30px; border-radius: 50%; 
                                                                    cursor: pointer; font-size: 16px; display: flex; align-items: center; 
                                                                    justify-content: center; transition: all 0.2s ease;" 
                                title="Close Settings">×</button>
                    </div>
                    
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
                    
                    <!-- Chain Timer Settings -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0; padding-top: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px;">⏱️ Chain Timer Settings</h4>
                        
                        <div style="margin-bottom: 15px; display: flex; align-items: center;">
                            <div class="toggle-switch" id="sidekick-chain-timer-toggle" style="
                                position: relative;
                                display: inline-block;
                                width: 50px;
                                height: 24px;
                                margin-right: 10px;
                                cursor: pointer;
                            ">
                                <div class="toggle-track" style="
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background-color: #555;
                                    border-radius: 24px;
                                    transition: background-color 0.3s ease;
                                "></div>
                                <div class="toggle-thumb" style="
                                    position: absolute;
                                    top: 2px;
                                    left: 2px;
                                    width: 20px;
                                    height: 20px;
                                    background-color: white;
                                    border-radius: 50%;
                                    transition: transform 0.3s ease;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                "></div>
                            </div>
                            <label style="color: #ccc; font-weight: bold; cursor: pointer;" onclick="document.getElementById('sidekick-chain-timer-toggle').click()">Enable Chain Timer</label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Alert Threshold (seconds):</label>
                            <input type="number" id="sidekick-chain-timer-threshold" min="60" max="3600" step="10" 
                                   style="width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                          color: #fff; padding: 10px; border-radius: 5px; box-sizing: border-box;"
                                   placeholder="240">
                            <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                                Alert when chain timer drops below this value (default: 240 seconds / 4 minutes)
                            </div>
                        </div>
                        
                        <button id="sidekick-save-chain-timer" style="width: 100%; padding: 10px; background: #FF9800; 
                                                                     border: none; color: white; border-radius: 5px; 
                                                                     font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                            ⏱️ Save Chain Timer Settings
                        </button>
                        
                        <div id="sidekick-chain-timer-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                                   background: rgba(255,255,255,0.1); color: #ccc;">
                            Chain Timer settings loaded
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
            const closeBtn = panel.querySelector('#sidekick-close-settings');

            // Xanax Viewer elements
            const xanaxAutoLimitSlider = panel.querySelector('#sidekick-xanax-autolimit');
            const xanaxAutoLimitDisplay = panel.querySelector('#sidekick-xanax-autolimit-display');
            const xanaxRelativeCheckbox = panel.querySelector('#sidekick-xanax-relative');
            const saveXanaxBtn = panel.querySelector('#sidekick-save-xanax-settings');
            const clearCacheBtn = panel.querySelector('#sidekick-clear-xanax-cache');
            const xanaxStatusDiv = panel.querySelector('#sidekick-xanax-status');

            // Chain Timer elements
            const chainTimerToggle = panel.querySelector('#sidekick-chain-timer-toggle');
            const chainTimerThresholdInput = panel.querySelector('#sidekick-chain-timer-threshold');
            const saveChainTimerBtn = panel.querySelector('#sidekick-save-chain-timer');
            const chainTimerStatusDiv = panel.querySelector('#sidekick-chain-timer-status');

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

            // Chain Timer toggle functionality
            let chainTimerActive = false;
            
            function updateChainTimerToggle(isActive) {
                chainTimerActive = isActive;
                const track = chainTimerToggle.querySelector('.toggle-track');
                const thumb = chainTimerToggle.querySelector('.toggle-thumb');
                
                if (isActive) {
                    track.style.backgroundColor = '#4CAF50';
                    thumb.style.transform = 'translateX(26px)';
                } else {
                    track.style.backgroundColor = '#555';
                    thumb.style.transform = 'translateX(0px)';
                }
            }
            
            chainTimerToggle.addEventListener('click', () => {
                updateChainTimerToggle(!chainTimerActive);
            });

            // Load existing Chain Timer settings
            this.loadChainTimerSettings().then(settings => {
                updateChainTimerToggle(settings.isActive || false);
                chainTimerThresholdInput.value = settings.alertThresholdInSeconds || 240;
                
                // Also update the Chain Timer module with loaded settings
                if (window.SidekickModules?.ChainTimer) {
                    window.SidekickModules.ChainTimer.isActive = settings.isActive || false;
                    window.SidekickModules.ChainTimer.alertThresholdInSeconds = settings.alertThresholdInSeconds || 240;
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

            // Close settings panel
            closeBtn.addEventListener('click', () => {
                panel.remove();
                this.currentPanel = null;
            });

            // Hover effect for close button
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = 'rgba(255,255,255,0.2)';
                closeBtn.style.transform = 'scale(1.1)';
            });

            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = 'rgba(255,255,255,0.1)';
                closeBtn.style.transform = 'scale(1)';
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

            // Save Chain Timer settings
            saveChainTimerBtn.addEventListener('click', async () => {
                const settings = {
                    isActive: chainTimerActive,
                    alertThresholdInSeconds: parseInt(chainTimerThresholdInput.value) || 240
                };

                try {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_chain_timer', settings);
                    
                    // Update the Chain Timer module
                    if (window.SidekickModules?.ChainTimer) {
                        window.SidekickModules.ChainTimer.isActive = settings.isActive;
                        window.SidekickModules.ChainTimer.alertThresholdInSeconds = settings.alertThresholdInSeconds;
                        window.SidekickModules.ChainTimer.saveConfig();
                    }
                    
                    chainTimerStatusDiv.textContent = 'Chain Timer settings saved successfully!';
                    chainTimerStatusDiv.style.background = 'rgba(76, 175, 80, 0.3)';
                    
                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Chain Timer Settings',
                            'Settings saved successfully',
                            'success',
                            3000
                        );
                    }
                } catch (error) {
                    console.error('Failed to save Chain Timer settings:', error);
                    chainTimerStatusDiv.textContent = 'Failed to save Chain Timer settings';
                    chainTimerStatusDiv.style.background = 'rgba(244, 67, 54, 0.3)';
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

        // Load Chain Timer settings from storage
        async loadChainTimerSettings() {
            try {
                const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_chain_timer');
                return settings || {
                    isActive: false,
                    alertThresholdInSeconds: 240
                };
            } catch (error) {
                console.error('Failed to load Chain Timer settings:', error);
                return {
                    isActive: false,
                    alertThresholdInSeconds: 240
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