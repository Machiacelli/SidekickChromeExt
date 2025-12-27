/**
 * Sidekick Chrome Extension - Settings Module V2
 * Comprehensive settings panel with all module toggles and configurations
 * Version: 2.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("⚙️ Loading Sidekick Settings Module V2...");

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
        currentTab: 'general',

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

        // Create comprehensive settings panel UI
        createSettingsPanel() {
            console.log("⚙️ Settings: Creating comprehensive settings panel");

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
                width: 850px;
                height: 750px;
                background: #1a1a1a;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 12px;
                z-index: 999999;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                font-family: Arial, sans-serif;
                overflow: hidden;
            `;

            // Resolve icon paths before building HTML
            const iconGeneral = chrome.runtime.getURL('icons/settings-general.png');
            const iconFeatures = chrome.runtime.getURL('icons/settings-features.png');
            const iconXanax = chrome.runtime.getURL('icons/settings-xanax.png');
            const iconChain = chrome.runtime.getURL('icons/settings-chain.png');
            const iconNotifications = chrome.runtime.getURL('icons/settings-notifications.png');
            const iconMugcalc = chrome.runtime.getURL('icons/settings-mugcalc.png');

            panel.innerHTML = `
                <style>
                    .settings-content-scroll::-webkit-scrollbar {
                        display: none;
                    }
                    .settings-content-scroll {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                </style>
                <div style="display: flex; height: 750px; position: relative;">
                    <!-- SIDEBAR NAVIGATION -->
                    <div class="settings-sidebar" style="width: 200px; background: #242424; border-right: 1px solid rgba(255,255,255,0.1); 
                                                         display: flex; flex-direction: column; padding: 20px 0;">
                        <!-- Header in Sidebar -->
                        <div style="padding: 0 20px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <h3 style="margin: 0; background: linear-gradient(135deg, #66BB6A, #ffad5a); 
                                       -webkit-background-clip: text; -webkit-text-fill-color: transparent; 
                                       background-clip: text; font-size: 18px; font-weight: bold;">
                                ⚙️ Settings
                            </h3>
                        </div>
                        
                        <!-- Sidebar Tabs -->
                        <div style="flex: 1; padding-top: 10px;">
                            <button class="settings-sidebar-tab active" data-tab="general" 
                                    style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px 10px; background: transparent; 
                                           border: none; color: white; cursor: pointer; font-size: 12px; font-weight: 500; 
                                           transition: all 0.3s ease; margin-bottom: 8px; border-radius: 8px;">
                                <img src="${iconGeneral}" style="width: 48px; height: 48px; margin-bottom: 8px; filter: drop-shadow(0 0 12px rgba(102, 187, 106, 0.8)) drop-shadow(0 0 24px rgba(255, 173, 90, 0.6)); transition: all 0.3s ease;">
                                <span>General</span>
                            </button>
                            <button class="settings-sidebar-tab" data-tab="modules" 
                                    style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px 10px; background: transparent; 
                                           border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 12px; font-weight: 500; 
                                           transition: all 0.3s ease; margin-bottom: 8px; border-radius: 8px;">
                                <img src="${iconFeatures}" style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.7; transition: all 0.3s ease;">
                                <span>Features</span>
                            </button>
                            <button class="settings-sidebar-tab" data-tab="xanax" 
                                    style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px 10px; background: transparent; 
                                           border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 12px; font-weight: 500; 
                                           transition: all 0.3s ease; margin-bottom: 8px; border-radius: 8px;">
                                <img src="${iconXanax}" style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.7; transition: all 0.3s ease;">
                                <span>Xanax</span>
                            </button>
                            <button class="settings-sidebar-tab" data-tab="chain" 
                                    style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px 10px; background: transparent; 
                                           border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 12px; font-weight: 500; 
                                           transition: all 0.3s ease; margin-bottom: 8px; border-radius: 8px;">
                                <img src="${iconChain}" style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.7; transition: all 0.3s ease;">
                                <span>Chain Timer</span>
                            </button>
                            <button class="settings-sidebar-tab" data-tab="notifications" 
                                    style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px 10px; background: transparent; 
                                           border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 12px; font-weight: 500; 
                                           transition: all 0.3s ease; margin-bottom: 8px; border-radius: 8px;">
                                <img src="${iconNotifications}" style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.7; transition: all 0.3s ease;">
                                <span>Notifications</span>
                            </button>
                            <button class="settings-sidebar-tab" data-tab="mugcalc" 
                                    style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px 10px; background: transparent; 
                                           border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 12px; font-weight: 500; 
                                           transition: all 0.3s ease; margin-bottom: 8px; border-radius: 8px;">
                                <img src="${iconMugcalc}" style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.7; transition: all 0.3s ease;">
                                <span>Mug Calculator</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- MAIN CONTENT AREA -->
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <!-- Top Bar with Admin and Close -->
                        <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; gap: 10px;">
                            <button id="sidekick-admin-btn" style="background: linear-gradient(135deg, #FFD700, #FFA500); border: 1px solid rgba(255,215,0,0.5); 
                                                            color: #000; padding: 8px 16px; border-radius: 6px; 
                                                            cursor: pointer; font-size: 12px; font-weight: bold; 
                                                            transition: all 0.2s ease;" 
                                    title="Admin Panel">👑 Admin</button>
                            <button id="sidekick-close-settings" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                                            color: #fff; width: 32px; height: 32px; border-radius: 50%; 
                                                            cursor: pointer; font-size: 18px; display: flex; align-items: center; 
                                                            justify-content: center; transition: all 0.2s ease;" 
                                    title="Close Settings">×</button>
                        </div>
                        
                        <!-- Content Container -->
                        <div class="settings-content-scroll" style="flex: 1; overflow-y: auto; padding: 30px;">
                            
                            <!-- GENERAL TAB -->
                            <div class="settings-tab-content" id="settings-tab-general" style="display: block;">
                                <div style="margin-bottom: 20px;">
                                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Torn API Key:</label>
                                    <input type="text" id="sidekick-api-key" placeholder="Enter your API key..." 
                                           style="width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                                  color: #fff; padding: 10px; border-radius: 5px; box-sizing: border-box;">
                                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                                        Get your API key from: <a href="https://www.torn.com/preferences.php#tab=api" target="_blank" style="background: linear-gradient(135deg, #66BB6A, #ffad5a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: bold;">Torn Preferences</a>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                                    <button id="sidekick-save-settings" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #66BB6A, #ffad5a); 
                                                                              border: none; color: white; border-radius: 5px; 
                                                                              font-weight: bold; cursor: pointer;">
                                        💾 Save
                                    </button>
                                    <button id="sidekick-test-api" style="flex: 1; padding: 10px; background: #2196F3; 
                                                                     border: none; color: white; border-radius: 5px; 
                                                                     font-weight: bold; cursor: pointer;">
                                        🧪 Test
                                    </button>
                                </div>
                                
                                <div id="sidekick-api-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                                 background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                                    Enter your API key and click Save
                                </div>
                                
                                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 25px 0;">
                                
                                <!-- Calendar Refresh Section -->
                                <div style="background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; padding: 12px; border-radius: 5px; margin-bottom: 15px;">
                                    <div style="font-size: 13px; color: #ccc; line-height: 1.5;">
                                        📅 <strong>Event Calendar:</strong> Automatically updates yearly. Use refresh to force update event dates (e.g., Christmas Town).
                                    </div>
                                </div>
                                
                                <button id="sidekick-refresh-calendar" style="width: 100%; padding: 10px; background: #2196F3; 
                                                                               border: none; color: white; border-radius: 5px; 
                                                                               font-weight: bold; cursor: pointer; margin-bottom: 15px;">
                                    🔄 Refresh Event Calendar
                                </button>
                                
                                <div id="sidekick-calendar-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                                         background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                                    Last updated: <span id="calendar-last-year">Never</span>
                                </div>
                                
                                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 25px 0;">
                                
                                <!-- Data Export/Import Section -->
                                <div style="background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; padding: 12px; border-radius: 5px; margin-bottom: 15px;">
                                    <div style="font-size: 13px; color: #ccc; line-height: 1.5;">
                                        💾 <strong>Backup & Restore:</strong> Export all your data before uninstalling. Import to restore everything after reinstalling.
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                                    <button id="sidekick-export-data" style="flex: 1; padding: 10px; background: #4CAF50; 
                                                                               border: none; color: white; border-radius: 5px; 
                                                                               font-weight: bold; cursor: pointer;">
                                        📤 Export Data
                                    </button>
                                    <button id="sidekick-import-data" style="flex: 1; padding: 10px; background: #2196F3; 
                                                                               border: none; color: white; border-radius: 5px; 
                                                                               font-weight: bold; cursor: pointer;">
                                        📥 Import Data
                                    </button>
                                </div>
                                
                                <div id="sidekick-backup-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                                        background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                                    No backup loaded
                                </div>
                                
                                <!-- Hidden file input -->
                                <input type="file" id="sidekick-import-file" accept=".json" style="display: none;">
                            </div>
                            
                            <!-- MODULES TAB -->
                            <div class="settings-tab-content" id="settings-tab-modules" style="display: none;">
                                ${this.createModuleTogglesHTML()}
                            </div>
                            
                            <!-- XANAX VIEWER TAB -->
                            <div class="settings-tab-content" id="settings-tab-xanax" style="display: none;">
                                ${this.createXanaxSettingsHTML()}
                            </div>
                            
                            <!-- CHAIN TIMER TAB -->
                            <div class="settings-tab-content" id="settings-tab-chain" style="display: none;">
                                ${this.createChainTimerSettingsHTML()}
                            </div>
                            
                            <!-- NOTIFICATIONS TAB -->
                            <div class="settings-tab-content" id="settings-tab-notifications" style="display: none;">
                                ${this.createNotificationsSettingsHTML()}
                            </div>
                            
                            <!-- MUG CALCULATOR TAB -->
                            <div class="settings-tab-content" id="settings-tab-mugcalc" style="display: none;">
                                ${this.createMugCalculatorSettingsHTML()}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);
            this.attachEventListeners(panel);
            this.loadAllSettings();
        },

        // Create HTML for module toggles
        createModuleTogglesHTML() {
            return `
                <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">⚡ Feature Toggles</h4>
                
                ${this.createToggle('attack-button-mover', '⚔️ Fast Attack', 'Moves Start Fight button over weapon for faster attacks')}
                ${this.createToggle('time-on-tab', '⏰ Time on Tab', 'Shows remaining time for activities in browser tab')}
                ${''}
                ${this.createToggle('random-target', '🎲 Random Target', 'Adds random target button to attack pages')}
                ${''}
                ${this.createToggle('racing-alert', '🏎️ Racing Alert', 'Shows flashing red icon when not in a race')}
                ${this.createToggle('refill-blocker', '🛡️ Refill Blocker', 'Prevents accidental refills when bars aren\'t empty')}
                ${this.createToggle('extended-chain-view', '⛓️ Extended Chain View', 'Shows more than 10 chain attacks on faction page')}
                ${this.createToggle('mug-calculator', '🥊 Mug Calculator', 'Shows mug value calculations on Item Market and Bazaars')}
                ${this.createWeaponXpToggle()}
                <button id="sidekick-save-module-toggles" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #66BB6A, #ffad5a); 
                                                                  border: none; color: white; border-radius: 6px; 
                                                                  font-weight: bold; cursor: pointer; margin-top: 20px;">
                    💾 Save Module Settings
                </button>
                <div id="sidekick-module-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                       background: rgba(255,255,255,0.1); color: #ccc; margin-top: 10px; font-size: 13px;">
                    Module settings loaded
                </div>
            `;
        },

        // Create special weapon XP toggle with link
        createWeaponXpToggle() {
            return `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">🎯 Weapon XP Tracker</div>
                            <div style="font-size: 12px; color: #aaa;">
                                Shows weapon experience percentage on Items page
                                <br>
                                <a href="#" id="weapon-overview-link" style="color: #66BB6A; text-decoration: underline; cursor: pointer; font-weight: 500;">
                                    View All Weapons & Finishing Hits
                                </a>
                            </div>
                        </div>
                        <div class="toggle-switch" data-module="weapon-xp-tracker" style="
                            position: relative;
                            display: inline-block;
                            width: 50px;
                            height: 24px;
                            margin-left: 15px;
                            cursor: pointer;
                            flex-shrink: 0;
                        ">
                            <div class="toggle-track" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background-color: rgba(255, 255, 255, 0.2);
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
                    </div>
                </div>
            `;
        },

        // Create toggle switch HTML
        createToggle(id, label, description) {
            return `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${label}</div>
                            <div style="font-size: 12px; color: #aaa;">${description}</div>
                        </div>
                        <div class="toggle-switch" data-module="${id}" style="
                            position: relative;
                            display: inline-block;
                            width: 50px;
                            height: 24px;
                            margin-left: 15px;
                            cursor: pointer;
                            flex-shrink: 0;
                        ">
                            <div class="toggle-track" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background-color: rgba(255, 255, 255, 0.2);
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
                    </div>
                </div>
            `;
        },

        // Create Xanax Viewer settings HTML
        createXanaxSettingsHTML() {
            return `
                <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">💊 Xanax Viewer Settings</h4>
                
                ${this.createToggle('xanax-viewer', '💊 Enable Xanax Viewer', 'Shows individual Xanax usage on Faction and Profile pages')}
                
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0;">
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Auto Refresh Limit:</label>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <input type="range" id="sidekick-xanax-autolimit" min="0" max="100" value="0" 
                               style="flex: 1; accent-color: #4CAF50;">
                        <span id="sidekick-xanax-autolimit-display" style="color: #fff; min-width: 40px; text-align: right; font-weight: bold;">0</span>
                    </div>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        Number of faction members to auto-refresh (closest level to you)
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="sidekick-xanax-relative" style="accent-color: #4CAF50;">
                        <span>Show Relative Values</span>
                    </label>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px; margin-left: 25px;">
                        Display Xanax usage relative to your own usage
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="sidekick-save-xanax-settings" style="flex: 1; padding: 10px; background: #9C27B0; 
                                                                     border: none; color: white; border-radius: 5px; 
                                                                     font-weight: bold; cursor: pointer;">
                        💾 Save
                    </button>
                    <button id="sidekick-clear-xanax-cache" style="flex: 1; padding: 10px; background: #FF5722; 
                                                                   border: none; color: white; border-radius: 5px; 
                                                                   font-weight: bold; cursor: pointer;">
                        🗑️ Clear Cache
                    </button>
                </div>
                
                <div id="sidekick-xanax-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                     background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                    Xanax Viewer settings loaded
                </div>
            `;
        },

        // Create Chain Timer settings HTML
        createChainTimerSettingsHTML() {
            return `
                <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">⏱️ Chain Timer Settings</h4>
                
                ${this.createToggle('chain-timer', '⏱️ Enable Chain Timer', 'Shows floating chain countdown timer')}
                
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0;">
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Alert Threshold:</label>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <input type="range" id="sidekick-chain-threshold" min="1" max="5" step="0.5" value="4" 
                               style="flex: 1; accent-color: #FF9800;">
                        <span id="sidekick-chain-threshold-display" style="color: #fff; min-width: 60px; text-align: right; font-weight: bold;">4 min</span>
                    </div>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        Alert when chain timer drops below this threshold
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="sidekick-chain-alerts" style="accent-color: #FF9800;">
                        <span>Enable Alerts</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="sidekick-chain-popup" style="accent-color: #FF9800;">
                        <span>Show Popup Alerts</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="sidekick-chain-flash" style="accent-color: #FF9800;">
                        <span>Screen Flash Effect</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="sidekick-chain-floating-display" style="accent-color: #FF9800;">
                        <span>Show Floating Timer Display</span>
                    </label>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px; margin-left: 25px;">
                        Display floating timer on screen (alerts still work when disabled)
                    </div>
                </div>
                
                <button id="sidekick-save-chain-settings" style="width: 100%; padding: 10px; background: #FF9800; 
                                                                 border: none; color: white; border-radius: 5px; 
                                                                 font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                    ⏱️ Save Chain Timer Settings
                </button>
                
                <div id="sidekick-chain-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                     background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                    Chain Timer settings loaded
                </div>
            `;
        },

        // Create Notifications settings HTML
        createNotificationsSettingsHTML() {
            return `
                <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">🔔 Notification Settings</h4>
                
                ${this.createToggle('notif-sound', '🔊 Notification Sounds', 'Play a sound when notifications appear')}
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #ccc; cursor: pointer;">
                        <input type="checkbox" id="sidekick-notif-auto-dismiss" style="accent-color: #2196F3;" checked>
                        <span>Auto-dismiss Notifications</span>
                    </label>
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px; margin-left: 25px;">
                        Automatically hide notifications after 5 seconds
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Notification Duration (seconds):</label>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <input type="range" id="sidekick-notif-duration" min="2" max="10" value="5" 
                               style="flex: 1; accent-color: #2196F3;">
                        <span id="sidekick-notif-duration-display" style="color: #fff; min-width: 40px; text-align: right; font-weight: bold;">5s</span>
                    </div>
                </div>
                
                <button id="sidekick-save-notif-settings" style="width: 100%; padding: 10px; background: #2196F3; 
                                                                 border: none; color: white; border-radius: 5px; 
                                                                 font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                    🔔 Save Notification Settings
                </button>
                
                <div id="sidekick-notif-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                     background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                    Notification settings loaded
                </div>
            `;
        },

        // Create Mug Calculator settings HTML
        createMugCalculatorSettingsHTML() {
            return `
                <h4 style="margin: 0 0 15px 0; color: #fff; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px;">💰 Mug Calculator Settings</h4>
                
                <div style="background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; padding: 12px; border-radius: 5px; margin-bottom: 20px;">
                    <div style="font-size: 13px; color: #ccc; line-height: 1.5;">
                        ℹ️ Configure the mug calculator to show potential mug values when browsing the Item Market and Bazaars.
                        The calculator uses your API key to fetch target information and calculate potential earnings.
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Mug Merits (0-10):</label>
                    <input type="number" id="mugMeritsInput" min="0" max="10" placeholder="0 to 10"
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                  border-radius: 5px; color: white; font-size: 14px; box-sizing: border-box;">
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        Enter your total mug merits from 0 to 10
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Plunder % (20% to 49%):</label>
                    <input type="number" id="plunderInput" min="20" max="49" step="0.01" placeholder="Plunder %"
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                  border-radius: 5px; color: white; font-size: 14px; box-sizing: border-box;">
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        Enter your plunder percentage (based on your stats and bonuses)
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #ccc; font-weight: bold;">Minimum Threshold ($):</label>
                    <input type="number" id="thresholdInput" min="0" placeholder="Minimum Threshold"
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); 
                                  border-radius: 5px; color: white; font-size: 14px; box-sizing: border-box;">
                    <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
                        Only show info icon when total listing value exceeds this amount
                    </div>
                </div>
                
                <button id="sidekick-save-mugcalc-settings" style="width: 100%; padding: 12px; background: #4CAF50; 
                                                                   border: none; color: white; border-radius: 6px; 
                                                                   font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                    💾 Save Mug Calculator Settings
                </button>
                
                <div id="sidekick-mugcalc-status" style="text-align: center; padding: 10px; border-radius: 5px; 
                                                        background: rgba(255,255,255,0.1); color: #ccc; font-size: 13px;">
                    Mug calculator settings loaded
                </div>
            `;
        },

        // Attach all event listeners
        attachEventListeners(panel) {
            // Tab switching for sidebar
            const tabButtons = panel.querySelectorAll('.settings-sidebar-tab');
            tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;
                    this.switchTab(targetTab, panel);
                });
            });

            // Close button
            const closeBtn = panel.querySelector('#sidekick-close-settings');
            closeBtn.addEventListener('click', () => {
                panel.remove();
                this.settingsPanel = null;
            });

            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = 'rgba(255,255,255,0.2)';
                closeBtn.style.transform = 'scale(1.1)';
            });

            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = 'rgba(255,255,255,0.1)';
                closeBtn.style.transform = 'scale(1)';
            });

            // Admin button
            const adminBtn = panel.querySelector('#sidekick-admin-btn');
            if (adminBtn) {
                adminBtn.addEventListener('click', () => {
                    console.log('👑 Admin button clicked!');
                    console.log('Premium module check:', window.SidekickModules?.Premium);
                    if (window.SidekickModules?.Premium?.showAdminPanel) {
                        console.log('Calling showAdminPanel...');
                        window.SidekickModules.Premium.showAdminPanel();
                    } else {
                        console.error('❌ Premium module not available');
                        alert('Premium module not available. Please refresh the page.');
                    }
                });
                console.log('✅ Admin button listener attached');
            } else {
                console.error('❌ Admin button not found in panel');
            }

            // General Tab listeners
            this.attachGeneralTabListeners(panel);

            // Modules Tab listeners
            this.attachModulesTabListeners(panel);

            // Xanax Viewer Tab listeners
            this.attachXanaxTabListeners(panel);

            // Chain Timer Tab listeners
            this.attachChainTimerTabListeners(panel);

            // Notifications Tab listeners
            this.attachNotificationsTabListeners(panel);

            // Mug Calculator Tab listeners
            this.attachMugCalculatorTabListeners(panel);
        },

        // Switch between tabs
        switchTab(tabName, panel) {
            // Update button states for sidebar tabs
            const tabButtons = panel.querySelectorAll('.settings-sidebar-tab');
            tabButtons.forEach(btn => {
                const icon = btn.querySelector('img');
                if (btn.dataset.tab === tabName) {
                    btn.style.background = 'transparent';
                    btn.style.boxShadow = 'none';
                    btn.style.color = 'white';
                    btn.classList.add('active');
                    if (icon) {
                        icon.style.opacity = '1';
                        icon.style.filter = 'drop-shadow(0 0 12px rgba(102, 187, 106, 0.8)) drop-shadow(0 0 24px rgba(255, 173, 90, 0.6))';
                    }
                } else {
                    btn.style.background = 'transparent';
                    btn.style.boxShadow = 'none';
                    btn.style.color = 'rgba(255,255,255,0.7)';
                    btn.classList.remove('active');
                    if (icon) {
                        icon.style.opacity = '0.7';
                        icon.style.filter = 'none';
                    }
                }
            });

            // Update content visibility
            const tabContents = panel.querySelectorAll('.settings-tab-content');
            tabContents.forEach(content => {
                content.style.display = content.id === `settings-tab-${tabName}` ? 'block' : 'none';
            });

            this.currentTab = tabName;
        },

        // General Tab listeners
        attachGeneralTabListeners(panel) {
            const saveBtn = panel.querySelector('#sidekick-save-settings');
            const testBtn = panel.querySelector('#sidekick-test-api');
            const apiInput = panel.querySelector('#sidekick-api-key');
            const statusDiv = panel.querySelector('#sidekick-api-status');

            saveBtn.addEventListener('click', async () => {
                const apiKey = apiInput.value.trim();
                if (!apiKey) {
                    this.showStatus(statusDiv, 'Please enter an API key', 'error');
                    return;
                }

                try {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_api_key', apiKey);
                    this.showStatus(statusDiv, 'API key saved successfully!', 'success');

                    // Toast notification
                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Settings Saved',
                            'API key has been saved successfully',
                            'success',
                            3000
                        );
                    }

                    // Persistent notification
                    if (window.NotificationCenter) {
                        await NotificationCenter.emit({
                            moduleId: 'extension',
                            type: 'success',
                            title: 'Settings Saved',
                            message: 'API key configured successfully'
                        });
                    }
                } catch (error) {
                    console.error('Failed to save API key:', error);
                    this.showStatus(statusDiv, 'Failed to save settings', 'error');
                }
            });

            testBtn.addEventListener('click', async () => {
                const apiKey = apiInput.value.trim();
                if (!apiKey) {
                    this.showStatus(statusDiv, 'Please enter an API key first', 'error');
                    return;
                }

                this.showStatus(statusDiv, 'Testing API connection...', 'info');

                try {
                    const response = await fetch(`https://api.torn.com/user/?selections=basic&key=${apiKey}`);
                    const data = await response.json();

                    if (data.error) {
                        this.showStatus(statusDiv, `API Error: ${data.error.error}`, 'error');
                    } else {
                        this.showStatus(statusDiv, `API Working! Welcome ${data.name} [${data.player_id}]`, 'success');

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
                    this.showStatus(statusDiv, 'API test failed - check your connection', 'error');
                }
            });

            // Calendar Refresh Button
            const refreshCalendarBtn = panel.querySelector('#sidekick-refresh-calendar');
            const calendarStatusDiv = panel.querySelector('#sidekick-calendar-status');
            const calendarLastYearSpan = panel.querySelector('#calendar-last-year');

            if (refreshCalendarBtn && window.SidekickModules?.EventTicker) {
                // Load last scraped year
                (async () => {
                    try {
                        const storage = await window.SidekickModules.Core.ChromeStorage.get('calendar_last_scraped_year');
                        const lastYear = storage?.calendar_last_scraped_year;
                        if (lastYear && calendarLastYearSpan) {
                            calendarLastYearSpan.textContent = lastYear;
                        }
                    } catch (error) {
                        console.error('Failed to load last scraped year:', error);
                    }
                })();

                refreshCalendarBtn.addEventListener('click', async () => {
                    refreshCalendarBtn.disabled = true;
                    refreshCalendarBtn.textContent = '🔄 Refreshing...';

                    try {
                        console.log('📅 Manual calendar refresh triggered from settings');
                        await window.SidekickModules.EventTicker.scrapeCalendarPage(true); // Force refresh

                        // Update last year display
                        const currentYear = new Date().getFullYear();
                        if (calendarLastYearSpan) {
                            calendarLastYearSpan.textContent = currentYear;
                        }

                        this.showStatus(calendarStatusDiv, 'Calendar refreshed successfully!', 'success');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Calendar Updated',
                                'Event calendar has been refreshed',
                                'success',
                                3000
                            );
                        }
                    } catch (error) {
                        console.error('❌ Calendar refresh failed:', error);
                        this.showStatus(calendarStatusDiv, 'Failed to refresh calendar', 'error');
                    } finally {
                        refreshCalendarBtn.disabled = false;
                        refreshCalendarBtn.textContent = '🔄 Refresh Event Calendar';
                    }
                });
            }

            // Export/Import functionality
            const exportBtn = panel.querySelector('#sidekick-export-data');
            const importBtn = panel.querySelector('#sidekick-import-data');
            const importFile = panel.querySelector('#sidekick-import-file');
            const backupStatus = panel.querySelector('#sidekick-backup-status');

            if (exportBtn) {
                exportBtn.addEventListener('click', async () => {
                    try {
                        exportBtn.disabled = true;
                        exportBtn.textContent = '📤 Exporting...';
                        this.showStatus(backupStatus, 'Collecting data...', 'info');

                        // Get all data from Chrome storage
                        const allData = await new Promise((resolve) => {
                            chrome.storage.local.get(null, (items) => {
                                resolve(items);
                            });
                        });

                        // Create backup object with metadata
                        const backup = {
                            version: '1.0',
                            timestamp: new Date().toISOString(),
                            extensionVersion: chrome.runtime.getManifest().version,
                            data: allData
                        };

                        // Create downloadable file
                        const dataStr = JSON.stringify(backup, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);

                        // Trigger download
                        const date = new Date().toISOString().split('T')[0];
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `sidekick-backup-${date}.json`;
                        link.click();

                        URL.revokeObjectURL(url);

                        this.showStatus(backupStatus, `Exported ${Object.keys(allData).length} items successfully!`, 'success');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Backup Created',
                                `Downloaded sidekick-backup-${date}.json`,
                                'success',
                                3000
                            );
                        }
                    } catch (error) {
                        console.error('Export failed:', error);
                        this.showStatus(backupStatus, 'Export failed: ' + error.message, 'error');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Export Failed',
                                error.message,
                                'error',
                                5000
                            );
                        }
                    } finally {
                        exportBtn.disabled = false;
                        exportBtn.textContent = '📤 Export Data';
                    }
                });
            }

            if (importBtn && importFile) {
                importBtn.addEventListener('click', () => {
                    importFile.click();
                });

                importFile.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    try {
                        importBtn.disabled = true;
                        importBtn.textContent = '📥 Importing...';
                        this.showStatus(backupStatus, 'Reading backup file...', 'info');

                        // Read file
                        const text = await file.text();
                        const backup = JSON.parse(text);

                        // Validate backup structure
                        if (!backup.data || !backup.version) {
                            throw new Error('Invalid backup file format');
                        }

                        // Show confirmation
                        const itemCount = Object.keys(backup.data).length;
                        const backupDate = new Date(backup.timestamp).toLocaleString();

                        if (!confirm(
                            `Import backup from ${backupDate}?\n\n` +
                            `This will restore ${itemCount} items and may overwrite current data.\n\n` +
                            `Extension Version: ${backup.extensionVersion}`
                        )) {
                            this.showStatus(backupStatus, 'Import cancelled', 'warning');
                            importBtn.textContent = '📥 Import Data';
                            importBtn.disabled = false;
                            importFile.value = '';
                            return;
                        }

                        this.showStatus(backupStatus, 'Importing data...', 'info');

                        // Import data to Chrome storage
                        await new Promise((resolve, reject) => {
                            chrome.storage.local.set(backup.data, () => {
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message));
                                } else {
                                    resolve();
                                }
                            });
                        });

                        this.showStatus(backupStatus, 'Data imported! Reloading page...', 'success');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Backup Restored',
                                'Data imported successfully. Reloading...',
                                'success',
                                2000
                            );
                        }

                        // Reload page after 2 seconds
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);

                    } catch (error) {
                        console.error('Import failed:', error);
                        this.showStatus(backupStatus, 'Import failed: ' + error.message, 'error');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Import Failed',
                                error.message,
                                'error',
                                5000
                            );
                        }
                    } finally {
                        importBtn.disabled = false;
                        importBtn.textContent = '📥 Import Data';
                        importFile.value = ''; // Reset file input
                    }
                });
            }
        },

        // Modules Tab listeners
        attachModulesTabListeners(panel) {
            const saveBtn = panel.querySelector('#sidekick-save-module-toggles');
            const statusDiv = panel.querySelector('#sidekick-module-status');
            const toggleSwitches = panel.querySelectorAll('.toggle-switch[data-module]');

            // Setup toggle interactions (EXCLUDE notif-sound which has its own handler!)
            toggleSwitches.forEach(toggle => {
                // Skip notif-sound toggle - it has specialized handling in attachNotificationsTabListeners
                if (toggle.dataset.module === 'notif-sound') return;

                toggle.addEventListener('click', () => {
                    const track = toggle.querySelector('.toggle-track');
                    const thumb = toggle.querySelector('.toggle-thumb');
                    const isActive = toggle.dataset.active === 'true';

                    toggle.dataset.active = (!isActive).toString(); // Convert to STRING!
                    this.updateToggleVisual(track, thumb, !isActive);
                });
            });

            // Load initial toggle states from storage (with slight delay to ensure DOM is ready)
            setTimeout(() => {
                chrome.storage.local.get(['sidekick_settings'], (result) => {
                    const settings = result.sidekick_settings || {};
                    console.log('⚙️ Loading initial toggle states:', settings);

                    toggleSwitches.forEach(toggle => {
                        const moduleId = toggle.dataset.module;
                        const moduleSettings = settings[moduleId];
                        const isEnabled = moduleSettings ? moduleSettings.isEnabled !== false : true;

                        // Set data attribute and update visual
                        toggle.dataset.active = isEnabled.toString();
                        const track = toggle.querySelector('.toggle-track');
                        const thumb = toggle.querySelector('.toggle-thumb');

                        if (track && thumb) {
                            this.updateToggleVisual(track, thumb, isEnabled);
                            console.log(`🔄 Loaded ${moduleId}: ${isEnabled ? 'ON' : 'OFF'}, colors applied`);
                        } else {
                            console.warn(`⚠️ Could not find track/thumb for ${moduleId}`);
                        }
                    });
                });
            }, 100);

            // Listen for storage changes from popup
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && changes.sidekick_settings) {
                    const newSettings = changes.sidekick_settings.newValue || {};
                    console.log('🔄 Settings changed, updating toggles:', newSettings);

                    toggleSwitches.forEach(toggle => {
                        const moduleId = toggle.dataset.module;
                        const moduleSettings = newSettings[moduleId];
                        const isEnabled = moduleSettings ? moduleSettings.isEnabled !== false : true;

                        // Update data attribute and visual if changed
                        if (toggle.dataset.active !== isEnabled.toString()) {
                            toggle.dataset.active = isEnabled.toString();
                            const track = toggle.querySelector('.toggle-track');
                            const thumb = toggle.querySelector('.toggle-thumb');
                            this.updateToggleVisual(track, thumb, isEnabled);
                            console.log(`✅ Synced ${moduleId}: ${isEnabled ? 'ON' : 'OFF'}`);
                        }
                    });
                }
            });

            // Weapon overview link - enhanced with better debugging
            const weaponOverviewLink = panel.querySelector('#weapon-overview-link');
            console.log('[Sidekick] Weapon overview link element:', weaponOverviewLink);

            if (weaponOverviewLink) {
                console.log('[Sidekick] Attaching click listener to weapon overview link');

                weaponOverviewLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Sidekick] Weapon overview link clicked!');
                    console.log('[Sidekick] WeaponExpTracker module:', window.SidekickModules?.WeaponExpTracker);

                    // Access the WeaponExpTracker module
                    if (window.SidekickModules?.WeaponExpTracker?.openWeaponsOverview) {
                        console.log('[Sidekick] Calling openWeaponsOverview...');
                        try {
                            await window.SidekickModules.WeaponExpTracker.openWeaponsOverview();
                        } catch (error) {
                            console.error('[Sidekick] Error opening weapons overview:', error);
                            alert('Error opening weapons overview: ' + error.message);
                        }
                    } else {
                        console.error('[Sidekick] WeaponExpTracker module not available');
                        alert('Weapon XP Tracker module not available. Please enable it in settings and reload the page.');
                    }
                });

                console.log('[Sidekick] Click listener attached successfully');
            } else {
                console.error('[Sidekick] Weapon overview link element not found!');
            }

            // Save button
            saveBtn.addEventListener('click', async () => {
                // Get current settings from storage to preserve other modules
                chrome.storage.local.get(['sidekick_settings'], (result) => {
                    const settings = result.sidekick_settings || {};

                    // Update settings with current toggle states
                    toggleSwitches.forEach(toggle => {
                        const moduleId = toggle.dataset.module;
                        const isEnabled = toggle.dataset.active === 'true';

                        // Update or create module settings
                        if (!settings[moduleId]) {
                            settings[moduleId] = {};
                        }
                        settings[moduleId].isEnabled = isEnabled;
                    });

                    // Save unified settings object
                    chrome.storage.local.set({ sidekick_settings: settings }, () => {
                        // ALSO save to legacy format for backwards compatibility
                        toggleSwitches.forEach(toggle => {
                            const moduleId = toggle.dataset.module;
                            const isEnabled = toggle.dataset.active === 'true';
                            const legacyKey = `sidekick_${moduleId.replace(/-/g, '_')}`;
                            chrome.storage.local.set({ [legacyKey]: { isEnabled } });
                        });

                        this.showStatus(statusDiv, 'Module settings saved successfully!', 'success');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Modules Updated',
                                'Reloading page to apply changes...',
                                'info',
                                2000
                            );
                        }

                        console.log('✅ Saved settings (unified + legacy):', settings);

                        // Reload page to apply changes
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    });
                });
            });
        },

        // Xanax Viewer Tab listeners
        attachXanaxTabListeners(panel) {
            const xanaxAutoLimitSlider = panel.querySelector('#sidekick-xanax-autolimit');
            const xanaxAutoLimitDisplay = panel.querySelector('#sidekick-xanax-autolimit-display');
            const xanaxRelativeCheckbox = panel.querySelector('#sidekick-xanax-relative');
            const saveXanaxBtn = panel.querySelector('#sidekick-save-xanax-settings');
            const clearCacheBtn = panel.querySelector('#sidekick-clear-xanax-cache');
            const xanaxStatusDiv = panel.querySelector('#sidekick-xanax-status');

            xanaxAutoLimitSlider.addEventListener('input', () => {
                xanaxAutoLimitDisplay.textContent = xanaxAutoLimitSlider.value;
            });

            saveXanaxBtn.addEventListener('click', async () => {
                const settings = {
                    autoLimit: parseInt(xanaxAutoLimitSlider.value),
                    showRelative: xanaxRelativeCheckbox.checked,
                    isEnabled: true
                };

                try {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_xanax_viewer', settings);
                    this.showStatus(xanaxStatusDiv, 'Xanax Viewer settings saved!', 'success');

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
                    this.showStatus(xanaxStatusDiv, 'Failed to save settings', 'error');
                }
            });

            clearCacheBtn.addEventListener('click', async () => {
                try {
                    await window.SidekickModules.Core.ChromeStorage.set('xanaxviewer_cache', {});
                    this.showStatus(xanaxStatusDiv, 'Cache cleared successfully!', 'success');

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
                    this.showStatus(xanaxStatusDiv, 'Failed to clear cache', 'error');
                }
            });
        },

        // Chain Timer Tab listeners
        attachChainTimerTabListeners(panel) {
            const chainTimerToggle = panel.querySelector('.toggle-switch[data-module="chain-timer"]');
            const chainThresholdSlider = panel.querySelector('#sidekick-chain-threshold');
            const chainThresholdDisplay = panel.querySelector('#sidekick-chain-threshold-display');
            const chainAlertsCheckbox = panel.querySelector('#sidekick-chain-alerts');
            const chainPopupCheckbox = panel.querySelector('#sidekick-chain-popup');
            const chainFlashCheckbox = panel.querySelector('#sidekick-chain-flash');
            const saveChainBtn = panel.querySelector('#sidekick-save-chain-settings');
            const chainStatusDiv = panel.querySelector('#sidekick-chain-status');

            chainThresholdSlider.addEventListener('input', () => {
                chainThresholdDisplay.textContent = `${chainThresholdSlider.value} min`;
            });

            saveChainBtn.addEventListener('click', async () => {
                // Get actual toggle state (not hardcoded!)
                const isEnabled = chainTimerToggle ? chainTimerToggle.dataset.active === 'true' : false;

                const settings = {
                    isEnabled: isEnabled,  // Use actual toggle state
                    alertThresholdSeconds: parseFloat(chainThresholdSlider.value) * 60,
                    alertsEnabled: chainAlertsCheckbox.checked,
                    popupEnabled: chainPopupCheckbox.checked,
                    screenFlashEnabled: chainFlashCheckbox.checked,
                    floatingDisplayEnabled: panel.querySelector('#sidekick-chain-floating-display').checked
                };

                try {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_chain_timer', settings);
                    this.showStatus(chainStatusDiv, 'Chain Timer settings saved!', 'success');

                    // Immediately apply the settings to the chain timer module
                    if (window.SidekickModules?.ChainTimer) {
                        window.SidekickModules.ChainTimer.isEnabled = isEnabled;
                        window.SidekickModules.ChainTimer.alertThresholdSeconds = settings.alertThresholdSeconds;
                        window.SidekickModules.ChainTimer.alertsEnabled = settings.alertsEnabled;
                        window.SidekickModules.ChainTimer.popupEnabled = settings.popupEnabled;
                        window.SidekickModules.ChainTimer.screenFlashEnabled = settings.screenFlashEnabled;
                        window.SidekickModules.ChainTimer.floatingDisplayEnabled = settings.floatingDisplayEnabled;

                        // Start or stop monitoring based on enabled state
                        if (isEnabled) {
                            console.log('✅ Chain Timer enabled via settings');
                            window.SidekickModules.ChainTimer.startMonitoring();
                        } else {
                            console.log('⏸️ Chain Timer disabled via settings');
                            window.SidekickModules.ChainTimer.stopMonitoring();
                        }
                    }

                    if (window.SidekickModules.Core.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Chain Timer Settings',
                            isEnabled ? 'Chain Timer enabled' : 'Chain Timer disabled',
                            'success',
                            3000
                        );
                    }
                } catch (error) {
                    console.error('Failed to save Chain Timer settings:', error);
                    this.showStatus(chainStatusDiv, 'Failed to save settings', 'error');
                }
            });
        },

        // Notifications Tab listeners
        async attachNotificationsTabListeners(panel) {
            const notifSoundToggle = panel.querySelector('.toggle-switch[data-module="notif-sound"]');
            const notifAutoDismissCheckbox = panel.querySelector('#sidekick-notif-auto-dismiss');
            const notifDurationSlider = panel.querySelector('#sidekick-notif-duration');
            const notifDurationDisplay = panel.querySelector('#sidekick-notif-duration-display');
            const saveNotifBtn = panel.querySelector('#sidekick-save-notif-settings');
            const notifStatusDiv = panel.querySelector('#sidekick-notif-status');

            // CRITICAL: Load settings FIRST to initialize dataset.active BEFORE attaching click handler!
            const notifSettings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_notifications') || {};

            // Setup notification sound toggle interaction
            if (notifSoundToggle) {
                // Initialize state from loaded settings
                const initialState = notifSettings.soundEnabled || false;
                notifSoundToggle.dataset.active = initialState ? 'true' : 'false';
                const track = notifSoundToggle.querySelector('.toggle-track');
                const thumb = notifSoundToggle.querySelector('.toggle-thumb');
                this.updateToggleVisual(track, thumb, initialState);

                console.log('🔊 Toggle initialized with state:', notifSoundToggle.dataset.active);

                // NOW attach click handler with properly initialized state
                notifSoundToggle.addEventListener('click', () => {
                    console.log('🔊 Toggle clicked!');
                    const isActive = notifSoundToggle.dataset.active === 'true';
                    console.log('🔊 Current state:', isActive, '→ New state:', !isActive);

                    // CRITICAL: dataset values are STRINGS, not booleans!
                    notifSoundToggle.dataset.active = !isActive ? 'true' : 'false';
                    this.updateToggleVisual(track, thumb, !isActive);
                });
            } else {
                console.error('🔊 Notification sound toggle not found!');
            }

            // Load other notification settings
            if (notifAutoDismissCheckbox) {
                notifAutoDismissCheckbox.checked = notifSettings.autoDismiss !== false;
            }
            if (notifDurationSlider) {
                const duration = (notifSettings.duration || 5000) / 1000;
                notifDurationSlider.value = duration;
                notifDurationDisplay.textContent = `${duration}s`;
            }

            if (notifDurationSlider) {
                notifDurationSlider.addEventListener('input', () => {
                    notifDurationDisplay.textContent = `${notifDurationSlider.value}s`;
                });
            }

            if (saveNotifBtn) {
                saveNotifBtn.addEventListener('click', async () => {
                    const settings = {
                        soundEnabled: notifSoundToggle?.dataset.active === 'true',
                        autoDismiss: notifAutoDismissCheckbox.checked,
                        duration: parseInt(notifDurationSlider.value) * 1000
                    };

                    try {
                        await window.SidekickModules.Core.ChromeStorage.set('sidekick_notifications', settings);
                        this.showStatus(notifStatusDiv, 'Notification settings saved!', 'success');

                        console.log('🔊 Notification settings saved:', settings);
                        console.log('🔊 Test notification will display for:', settings.duration, 'ms (', settings.duration / 1000, 'seconds)');

                        // Show notification (which will play sound if enabled and use saved duration)
                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Settings Saved',
                                'Notification settings updated successfully!',
                                'success',
                                settings.duration // Use the actual saved duration!
                            );
                        }
                    } catch (error) {
                        console.error('Failed to save Notification settings:', error);
                        this.showStatus(notifStatusDiv, 'Failed to save settings', 'error');
                    }
                });
            }
        },

        // Mug Calculator Tab listeners
        attachMugCalculatorTabListeners(panel) {
            const mugMeritsInput = panel.querySelector('#mugMeritsInput');
            const plunderInput = panel.querySelector('#plunderInput');
            const thresholdInput = panel.querySelector('#thresholdInput');
            const saveMugCalcBtn = panel.querySelector('#sidekick-save-mugcalc-settings');
            const mugCalcStatusDiv = panel.querySelector('#sidekick-mugcalc-status');

            if (saveMugCalcBtn) {
                saveMugCalcBtn.addEventListener('click', async () => {
                    try {
                        // Save mug merits
                        if (mugMeritsInput) {
                            const mugMeritsVal = parseInt(mugMeritsInput.value.trim(), 10);
                            await window.SidekickModules.Core.ChromeStorage.set('mugMerits', isNaN(mugMeritsVal) ? 0 : Math.min(Math.max(mugMeritsVal, 0), 10));
                        }

                        // Save plunder percentage
                        if (plunderInput) {
                            let plunderInputVal = parseFloat(plunderInput.value.trim());
                            if (plunderInputVal === '' || parseFloat(plunderInputVal) === 0) {
                                plunderInputVal = 0;
                            } else {
                                plunderInputVal = parseFloat(plunderInputVal);
                                if (plunderInputVal < 20 || plunderInputVal > 50) {
                                    this.showStatus(mugCalcStatusDiv, 'Plunder percentage must be between 20% and 49%', 'error');
                                    return;
                                }
                            }
                            await window.SidekickModules.Core.ChromeStorage.set('mugPlunder', plunderInputVal);
                        }

                        // Save threshold
                        if (thresholdInput) {
                            const thresholdVal = parseInt(thresholdInput.value.trim(), 10);
                            await window.SidekickModules.Core.ChromeStorage.set('mugThreshold', isNaN(thresholdVal) ? 0 : thresholdVal);
                        }

                        this.showStatus(mugCalcStatusDiv, 'Mug calculator settings saved!', 'success');

                        if (window.SidekickModules.Core.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Mug Calculator',
                                'Settings saved successfully',
                                'success',
                                3000
                            );
                        }
                    } catch (error) {
                        console.error('Failed to save mug calculator settings:', error);
                        this.showStatus(mugCalcStatusDiv, 'Failed to save settings', 'error');
                    }
                });
            }
        },

        // Load all settings from storage
        async loadAllSettings() {
            try {
                // Load API key
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                const apiInput = document.querySelector('#sidekick-api-key');
                if (apiInput && apiKey) {
                    apiInput.value = apiKey;
                }

                // Load module toggles
                await this.loadModuleToggles();

                // Load Xanax Viewer settings
                const xanaxSettings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_xanax_viewer') || {};
                const xanaxAutoLimitSlider = document.querySelector('#sidekick-xanax-autolimit');
                const xanaxAutoLimitDisplay = document.querySelector('#sidekick-xanax-autolimit-display');
                const xanaxRelativeCheckbox = document.querySelector('#sidekick-xanax-relative');

                if (xanaxAutoLimitSlider) {
                    xanaxAutoLimitSlider.value = xanaxSettings.autoLimit || 0;
                    xanaxAutoLimitDisplay.textContent = xanaxSettings.autoLimit || 0;
                }
                if (xanaxRelativeCheckbox) {
                    xanaxRelativeCheckbox.checked = xanaxSettings.showRelative || false;
                }

                // Load Chain Timer settings
                const chainSettings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_chain_timer') || {};
                const chainThresholdSlider = document.querySelector('#sidekick-chain-threshold');
                const chainThresholdDisplay = document.querySelector('#sidekick-chain-threshold-display');
                const chainAlertsCheckbox = document.querySelector('#sidekick-chain-alerts');
                const chainPopupCheckbox = document.querySelector('#sidekick-chain-popup');
                const chainFlashCheckbox = document.querySelector('#sidekick-chain-flash');

                if (chainThresholdSlider) {
                    const thresholdMinutes = (chainSettings.alertThresholdSeconds || 240) / 60;
                    chainThresholdSlider.value = thresholdMinutes;
                    chainThresholdDisplay.textContent = `${thresholdMinutes} min`;
                }
                if (chainAlertsCheckbox) {
                    chainAlertsCheckbox.checked = chainSettings.alertsEnabled !== false;
                }
                if (chainPopupCheckbox) {
                    chainPopupCheckbox.checked = chainSettings.popupEnabled !== false;
                }
                if (chainFlashCheckbox) {
                    chainFlashCheckbox.checked = chainSettings.screenFlashEnabled !== false;
                }

                const chainFloatingDisplayCheckbox = document.querySelector('#sidekick-chain-floating-display');
                if (chainFloatingDisplayCheckbox) {
                    chainFloatingDisplayCheckbox.checked = chainSettings.floatingDisplayEnabled !== false;
                }

                // NOTE: Notification settings are now loaded in attachNotificationsTabListeners()
                // to ensure proper initialization before click handler is attached

            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        },

        // Load module toggle states
        async loadModuleToggles() {
            const modules = [
                'attack-button-mover',
                'time-on-tab',
                'npc-attack-timer',
                'random-target',
                'stats-tracker',
                'xanax-viewer',
                'chain-timer',
                'racing-alert',
                'refill-blocker',
                'extended-chain-view',
                'weapon-xp-tracker',
                'mug-calculator'
            ];

            for (const moduleId of modules) {
                const storageKey = `sidekick_${moduleId.replace(/-/g, '_')}`;
                const settings = await window.SidekickModules.Core.ChromeStorage.get(storageKey) || {};
                const isEnabled = settings.isEnabled !== false; // Default to true

                const toggle = document.querySelector(`.toggle-switch[data-module="${moduleId}"]`);
                if (toggle) {
                    toggle.dataset.active = isEnabled;
                    const track = toggle.querySelector('.toggle-track');
                    const thumb = toggle.querySelector('.toggle-thumb');
                    this.updateToggleVisual(track, thumb, isEnabled);
                }
            }

            // Load mug calculator settings
            const mugMerits = await window.SidekickModules.Core.ChromeStorage.get('mugMerits') || 0;
            const mugPlunder = await window.SidekickModules.Core.ChromeStorage.get('mugPlunder') || 0;
            const mugThreshold = await window.SidekickModules.Core.ChromeStorage.get('mugThreshold') || 0;

            const mugMeritsInput = document.querySelector('#mugMeritsInput');
            const plunderInput = document.querySelector('#plunderInput');
            const thresholdInput = document.querySelector('#thresholdInput');

            if (mugMeritsInput) mugMeritsInput.value = mugMerits;
            if (plunderInput) plunderInput.value = parseFloat(mugPlunder).toFixed(2);
            if (thresholdInput) thresholdInput.value = mugThreshold;
        },

        // Update toggle visual state
        updateToggleVisual(track, thumb, isActive) {
            if (isActive) {
                // Use setAttribute to set style with !important
                track.setAttribute('style', track.getAttribute('style').replace(/background-color:[^;]+;?/g, '') + 'background-color: #4CAF50 !important;');
                thumb.style.transform = 'translateX(26px)';
            } else {
                // Use setAttribute to set style with !important
                track.setAttribute('style', track.getAttribute('style').replace(/background-color:[^;]+;?/g, '') + 'background-color: rgba(255, 255, 255, 0.2) !important;');
                thumb.style.transform = 'translateX(0px)';
            }
        },

        // Show status message
        showStatus(element, message, type) {
            element.textContent = message;

            if (type === 'success') {
                element.style.background = 'rgba(76, 175, 80, 0.3)';
            } else if (type === 'error') {
                element.style.background = 'rgba(244, 67, 54, 0.3)';
            } else if (type === 'info') {
                element.style.background = 'rgba(33, 150, 243, 0.3)';
            }

            setTimeout(() => {
                element.style.background = 'rgba(255,255,255,0.1)';
                element.textContent = type === 'success' ? 'Settings saved' : 'Ready';
            }, 3000);
        },

        // Get API key for other modules
        async getApiKey() {
            return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
        },

        // Check if user is admin and show admin button
        async checkAndShowAdminButton(adminBtn) {
            if (!adminBtn) return;

            try {
                const apiKey = await this.getApiKey();
                if (!apiKey) return;

                // Fetch user ID from API
                const response = await fetch(`https://api.torn.com/user/?selections=basic&key=${apiKey}`);
                if (!response.ok) return;

                const data = await response.json();
                if (data.error) return;

                // Check if user is Machiacelli (ID: 2906949)
                if (data.player_id === 2906949) {
                    adminBtn.style.display = 'block';
                    console.log('👑 Admin access granted');
                }
            } catch (error) {
                console.debug('Admin check failed:', error);
            }
        }
    };

    // Export Settings module to global namespace
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Settings = SettingsModule;
    console.log("✅ Settings Module V2 loaded and ready");

})();
