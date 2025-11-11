/**
 * Sidekick Chrome Extension - Timer Module
 * Handles timer functionality for countdown and stopwatch timers
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("⏰ Loading Sidekick Timer Module...");

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                console.log("🔍 Checking for Core module...");
                console.log("🔍 SidekickModules exists:", !!window.SidekickModules);
                console.log("🔍 Core exists:", !!window.SidekickModules?.Core);
                console.log("🔍 ChromeStorage exists:", !!window.SidekickModules?.Core?.ChromeStorage);
                
                if (window.SidekickModules?.Core?.ChromeStorage) {
                    console.log("⏰ Core module with ChromeStorage ready for Timer");
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // Timer Module Implementation
    const TimerModule = {
        isInitialized: false,
        timers: [],
        intervals: new Map(),
        apiKey: null,
        apiCheckInterval: null,

        // Add timer persistence safeguard during navigation
        setupNavigationHandler() {
            // Save timers before page unload
            window.addEventListener('beforeunload', () => {
                console.log("🔄 Page unloading - saving timers");
                this.saveTimers();
            });
            
            // Also save on visibility change (tab switching)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    console.log("🔄 Tab hidden - saving timers");
                    this.saveTimers();
                }
            });
            
            // Save timers every 30 seconds as a backup
            setInterval(() => {
                if (this.timers.length > 0) {
                    console.log("🔄 Auto-save - saving timers");
                    this.saveTimers();
                }
            }, 30000);
        },

        // Initialize the timer module
        async init() {
            if (this.isInitialized) {
                console.log("⏰ Timer Module already initialized");
                return;
            }

            console.log("⏰ Initializing Timer Module...");

            try {
                await waitForCore();
                
                // Load saved state first (lightweight operation)
                await this.loadTimers();
                await this.loadApiKey();
                this.setupNavigationHandler();
                
                // DON'T render timers here - only render when user opens sidebar
                // This prevents duplication on page load
                console.log("⏰ Timer Module initialized with", this.timers.length, "saved timers (not rendered yet)");
                
                this.isInitialized = true;
                console.log("✅ Timer Module initialized successfully");
            } catch (error) {
                console.error("❌ Timer Module initialization failed:", error);
            }
        },

        // Lazy initialization - called when sidebar is opened
        lazyInit() {
            if (this.isLazyInitialized) {
                console.log("⏰ Lazy initialization already completed");
                return;
            }
            
            console.log('⏰ Performing lazy initialization...');
            
            // Clear any existing timer elements first to prevent duplication
            this.clearExistingTimerElements();
            
            // Render timers immediately with current data (no delay!)
            this.renderAllTimers();
            
            this.isLazyInitialized = true;
            console.log('✅ Lazy initialization completed');
        },

        // Clear all existing timer elements from DOM
        clearExistingTimerElements() {
            const existingTimers = document.querySelectorAll('[id^="sidekick-timer-"]');
            console.log(`🔄 Clearing ${existingTimers.length} existing timer elements`);
            existingTimers.forEach(element => element.remove());
        },

        // Render all timers 
        renderAllTimers() {
            console.log('🔄 Rendering all timers:', this.timers.length, 'timers');
            
            if (this.timers.length === 0) {
                console.log('📭 No timers to render');
                return;
            }
            
            // Render each timer
            this.timers.forEach(timer => {
                console.log(`🔄 Rendering timer: ${timer.name} (ID: ${timer.id})`);
                this.renderTimer(timer);
            });
            
            console.log('✅ All timers rendered successfully');
        },

        // Load API key from storage
        async loadApiKey() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    this.apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                    console.log("⏰ API Key loaded:", this.apiKey ? "✓" : "✗");
                }
            } catch (error) {
                console.warn("⚠️ Failed to load API key:", error);
            }
        },

        // Save API key to storage
        async saveApiKey(key) {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_api_key', key);
                    this.apiKey = key;
                    console.log("⏰ API Key saved successfully");
                }
            } catch (error) {
                console.warn("⚠️ Failed to save API key:", error);
            }
        },

        // Start checking API for cooldowns (disabled automatic checking)
        startApiChecking() {
            // Automatic API checking has been disabled per user request
            // Cooldowns will only be checked when manually requested via dropdown
        },

        // Fetch cooldown data from API (for restoring displays)
        async fetchCooldownData() {
            if (!this.apiKey) {
                console.log('⚠️ No API key available for cooldown data fetch');
                return;
            }

            try {
                console.log('🔄 Fetching cooldown data for restore...');
                const response = await fetch(`https://api.torn.com/user/?selections=cooldowns&key=${this.apiKey}`);
                const data = await response.json();

                if (data.error) {
                    console.warn("⚠️ API Error during fetch:", data.error.error);
                    return;
                }

                if (data.cooldowns) {
                    this.cooldownData = data.cooldowns;
                    console.log('✅ Cooldown data refreshed:', Object.keys(this.cooldownData).length, 'cooldowns');
                } else {
                    this.cooldownData = {};
                    console.log('📭 No active cooldowns found');
                }
            } catch (error) {
                console.warn("⚠️ Failed to fetch cooldown data:", error);
                this.cooldownData = {};
            }
        },

        // Check Torn API for cooldowns
        async checkApiCooldowns() {
            if (!this.apiKey) return;

            try {
                const response = await fetch(`https://api.torn.com/user/?selections=cooldowns&key=${this.apiKey}`);
                const data = await response.json();

                if (data.error) {
                    console.warn("⚠️ API Error:", data.error.error);
                    return;
                }

                if (data.cooldowns) {
                    this.updateCooldownTimers(data.cooldowns);
                }
            } catch (error) {
                console.warn("⚠️ Failed to fetch cooldowns from API:", error);
            }
        },

        // Update or create timers based on API cooldowns (removed automatic creation)
        updateCooldownTimers(cooldowns) {
            // This method is now used for on-demand cooldown checking
            // Automatic timer creation has been removed per user request
        },

        // Get color based on cooldown type
        getCooldownColor(type) {
            const colors = {
                'drug': '#9C27B0',      // Purple
                'medical': '#4CAF50',    // Green  
                'booster': '#FF9800'     // Orange
            };
            return colors[type] || '#2196F3';
        },

        // Check specific cooldown type and update timer
        async checkSpecificCooldown(timer, cooldownType) {
            // Check for API key, prompt if not available
            if (!this.apiKey) {
                const apiKey = prompt('Please enter your Torn API key to check cooldowns:');
                if (!apiKey) {
                    console.log('⏰ Cooldown check cancelled - no API key provided');
                    return;
                }
                this.apiKey = apiKey;
                // Save the API key for future use
                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_api_key', apiKey);
                    console.log('🔑 API Key saved');
                }
            }

            try {
                console.log(`🔍 Checking ${cooldownType} cooldown with API key...`);
                const response = await fetch(`https://api.torn.com/user/?selections=cooldowns&key=${this.apiKey}`);
                const data = await response.json();

                console.log('🔍 Full API Response:', data);

                if (data.error) {
                    console.warn("⚠️ API Error:", data.error.error);
                    if (window.SidekickModules?.Core?.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'API Error', 
                            data.error.error, 
                            'error'
                        );
                    }
                    return;
                }

                console.log(`🔍 Available cooldowns:`, data.cooldowns);
                console.log(`🔍 Looking for cooldown type: ${cooldownType}`);
                console.log(`🔍 Specific cooldown value:`, data.cooldowns ? data.cooldowns[cooldownType] : 'No cooldowns object');

                if (data.cooldowns && typeof data.cooldowns[cooldownType] !== 'undefined') {
                    // API returns seconds remaining, not timestamp
                    const remainingTimeSeconds = data.cooldowns[cooldownType];
                    
                    console.log(`🔍 Cooldown found: ${remainingTimeSeconds} seconds remaining`);
                    
                    if (remainingTimeSeconds > 0) {
                        // Cooldown names mapping
                        const cooldownNames = {
                            'drug': 'Drug Cooldown',
                            'medical': 'Medical Cooldown', 
                            'booster': 'Booster Cooldown'
                        };
                        
                        // Find existing cooldown timer or use current timer
                        let existingTimer = this.findOrCreateCooldownTimer(timer, cooldownType);
                        
                        console.log(`🔍 Original timer clicked:`, timer.id);
                        console.log(`🔍 Timer selected for cooldown:`, existingTimer.id);
                        console.log(`🔍 Adding ${cooldownType} to timer:`, existingTimer.id);
                        console.log(`🔍 Existing cooldowns before:`, existingTimer.cooldowns);
                        
                        // Add this cooldown to the timer's cooldown collection
                        if (!existingTimer.cooldowns) {
                            existingTimer.cooldowns = {};
                        }
                        existingTimer.cooldowns[cooldownType] = remainingTimeSeconds;
                        
                        console.log(`🔍 Cooldowns after adding ${cooldownType}:`, existingTimer.cooldowns);
                        
                        // Update timer properties based on number of cooldowns
                        const cooldownCount = Object.keys(existingTimer.cooldowns).length;
                        console.log(`🔍 Total cooldown count: ${cooldownCount}`);
                        
                        if (cooldownCount === 1) {
                            // Single cooldown - show specific name
                            existingTimer.name = cooldownNames[cooldownType] || 'Cooldown';
                            existingTimer.color = this.getCooldownColor(cooldownType);
                        } else {
                            // Multiple cooldowns - show generic name
                            existingTimer.name = 'Cooldowns';
                            existingTimer.color = '#9b59b6'; // Purple for multi-cooldown
                        }
                        
                        existingTimer.duration = Math.max(...Object.values(existingTimer.cooldowns));
                        existingTimer.remainingTime = Math.max(...Object.values(existingTimer.cooldowns));
                        existingTimer.isApiTimer = true;
                        existingTimer.isRunning = true;

                        this.saveTimers();
                        
                        // Start the timer
                        this.startTimer(existingTimer.id);
                        
                        // Force a complete display update without removing the element
                        console.log('🔍 Updating timer display after cooldown selection');
                        this.updateTimerDisplay(existingTimer.id);

                        // Show success notification
                        if (window.SidekickModules?.UI?.showNotification) {
                            window.SidekickModules.UI.showNotification(
                                'SUCCESS', 
                                `${cooldownNames[cooldownType]} Timer Started - ${this.formatTime(remainingTimeSeconds)} remaining`
                            );
                        }
                    } else {
                        console.log(`🔍 ${cooldownType} cooldown has expired (remaining time: ${remainingTimeSeconds} seconds)`);
                        if (window.SidekickModules?.Core?.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Cooldown Expired', 
                                `Your ${cooldownType} cooldown has already finished`, 
                                'info'
                            );
                        }
                    }
                } else {
                    console.log(`🔍 No ${cooldownType} cooldown found in response or cooldown is 0`);
                    console.log(`🔍 Cooldown value was:`, data.cooldowns ? data.cooldowns[cooldownType] : 'undefined');
                    if (window.SidekickModules?.Core?.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'No Active Cooldown', 
                            `You don't currently have a ${cooldownType} cooldown`, 
                            'info'
                        );
                    }
                }
            } catch (error) {
                console.warn("⚠️ Failed to fetch cooldown from API:", error);
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Connection Error', 
                        'Failed to connect to Torn API', 
                        'error'
                    );
                }
            }
        },

        findOrCreateCooldownTimer(currentTimer, cooldownType) {
            console.log(`🔍 findOrCreateCooldownTimer for ${cooldownType}, currentTimer:`, currentTimer.id);
            
            // ALWAYS use the current timer that was clicked - no searching for old timers
            console.log(`🔍 Using clicked timer:`, currentTimer.id);
            return currentTimer;
        },

        // Load timers from storage
        async loadTimers() {
            try {
                console.log("� loadTimers - Starting load...");
                
                let state = null;
                let loaded = false;
                
                // Method 1: Try Chrome storage wrapper (now handles extension context internally)
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                        console.log("⏰ Method 1: Loading via ChromeStorage wrapper");
                        state = await window.SidekickModules.Core.ChromeStorage.get('sidekick_timer_state');
                        if (state && state.timers) {
                            this.timers = state.timers;
                            loaded = true;
                            console.log("✅ ChromeStorage wrapper load succeeded, loaded:", this.timers.length, "timers");
                        }
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper load failed:", error.message);
                }
                
                // Method 2: Try localStorage if wrapper failed
                if (!loaded) {
                    try {
                        console.log("⏰ Method 2: Loading via localStorage fallback");
                        const savedState = JSON.parse(localStorage.getItem('sidekick_timer_state') || '{}');
                        if (savedState && savedState.timers) {
                            this.timers = savedState.timers;
                            loaded = true;
                            console.log("✅ localStorage fallback load succeeded, loaded:", this.timers.length, "timers");
                        }
                    } catch (error) {
                        console.warn("⚠️ localStorage fallback load failed:", error);
                    }
                }
                
                // Method 3: Try old format for backward compatibility
                if (!loaded) {
                    try {
                        console.log("⏰ Method 3: Loading old format via ChromeStorage wrapper");
                        if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                            const oldTimers = await window.SidekickModules.Core.ChromeStorage.get('sidekick_timers');
                            if (Array.isArray(oldTimers)) {
                                this.timers = oldTimers;
                                loaded = true;
                                console.log("✅ Old format load succeeded, loaded:", this.timers.length, "timers");
                                // Migrate to new format
                                this.saveTimers();
                            }
                        }
                    } catch (error) {
                        console.warn("⚠️ Old format load failed:", error);
                    }
                }
                
                // Method 4: Try old format via localStorage
                if (!loaded) {
                    try {
                        console.log("⏰ Method 4: Loading old format via localStorage");
                        const oldTimers = JSON.parse(localStorage.getItem('sidekick_timers') || '[]');
                        if (Array.isArray(oldTimers)) {
                            this.timers = oldTimers;
                            loaded = true;
                            console.log("✅ Old format localStorage load succeeded, loaded:", this.timers.length, "timers");
                            // Migrate to new format
                            this.saveTimers();
                        }
                    } catch (error) {
                        console.warn("⚠️ Old format localStorage load failed:", error);
                    }
                }
                
                if (!loaded) {
                    this.timers = [];
                    console.log("⚠️ No storage method succeeded, initialized empty timers array");
                }
                
                // Log each timer for debugging (like original script)
                this.timers.forEach((timer, index) => {
                    console.log(`📂 Timer ${index + 1}:`, timer.name, 'type:', timer.cooldownType, 'isApiTimer:', timer.isApiTimer);
                });
                
            } catch (error) {
                console.error('Failed to load timers:', error);
                this.timers = [];
                
                // Show user-friendly error
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Timer Error', 
                        'Failed to load saved timers: ' + error.message, 
                        'error'
                    );
                }
            }
        },

        // Restore timer displays after page load
        async restoreTimerDisplays() {
            try {
                console.log("🔄 Restoring timer displays...");
                
                // Clear any existing timer elements first to prevent duplication
                const existingTimers = document.querySelectorAll('[id^="sidekick-timer-"]');
                console.log(`🔄 Clearing ${existingTimers.length} existing timer elements`);
                existingTimers.forEach(element => element.remove());
                
                // Wait a bit for the UI to be ready
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Refresh cooldown data from API before restoring (only if API key exists)
                if (this.apiKey) {
                    try {
                        console.log("🔄 Refreshing cooldown data from API...");
                        await this.fetchCooldownData();
                    } catch (error) {
                        console.warn("⚠️ Failed to refresh cooldown data, using saved data:", error);
                    }
                } else {
                    console.log("⚠️ No API key available, skipping cooldown refresh");
                }
                
                // Restore each timer
                for (const timer of this.timers) {
                    if (timer.isRunning) {
                        // Update cooldown times with fresh API data if available
                        if (timer.cooldowns && this.cooldownData) {
                            for (const [type, _] of Object.entries(timer.cooldowns)) {
                                if (this.cooldownData[type]) {
                                    timer.cooldowns[type] = this.cooldownData[type];
                                    console.log(`🔄 Updated ${type} cooldown from API: ${this.cooldownData[type]}s`);
                                }
                            }
                        }
                        
                        // Render the timer display
                        this.renderTimer(timer);
                        
                        // Start the countdown if it's running
                        this.startTimer(timer.id);
                    }
                }
                
                console.log("✅ Timer displays restored:", this.timers.length, "timers");
            } catch (error) {
                console.error("❌ Failed to restore timer displays:", error);
            }
        },

        // Save timers to storage - SIMPLIFIED APPROACH
        async saveTimers() {
            try {
                console.log("💾 saveTimers - Starting save with", this.timers.length, "timers");
                
                // Use the same approach as original script - save all in one state object
                const state = {
                    timers: this.timers.map(timer => ({
                        ...timer,
                        // Don't save DOM references or functions
                        element: null
                    })),
                    lastSaved: Date.now()
                };
                
                // CRITICAL: Use synchronous localStorage as primary storage (like original script)
                try {
                    localStorage.setItem('sidekick_timer_state', JSON.stringify(state));
                    console.log("✅ localStorage save succeeded with", state.timers.length, "timers");
                } catch (localError) {
                    console.error("❌ localStorage save failed:", localError);
                }
                
                // Also save to Chrome storage as backup
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                        await window.SidekickModules.Core.ChromeStorage.set('sidekick_timer_state', state);
                        console.log("✅ Chrome storage backup succeeded");
                    }
                } catch (chromeError) {
                    console.warn("⚠️ Chrome storage backup failed:", chromeError);
                }
                
                console.log('⏰ Timer state saved successfully');
                
            } catch (error) {
                console.error('❌ Critical save failure:', error);
            }
        },

        // Create a new timer window in the sidebar
        addTimer(name = 'Timer') {
            console.log('⏰ Adding new timer:', name, '- Current timer count:', this.timers.length);
            
            // Safeguard: Don't interfere with existing timers
            const currentTimerCount = this.timers.length;
            if (currentTimerCount > 0) {
                console.log('🔍 Existing timers found, ensuring no conflicts...');
            }
            
            // Get content area for positioning within sidepanel
            const contentArea = document.getElementById('sidekick-content');
            const contentWidth = contentArea ? contentArea.clientWidth : 480;
            const contentHeight = contentArea ? contentArea.clientHeight : 500;
            
            // Better stacking algorithm
            const timerWidth = Math.min(280, contentWidth - 40);
            const timerHeight = Math.min(140, contentHeight - 60); // Smaller height since no buttons
            const padding = 10;
            const stackOffset = 25;
            
            // Calculate position for better stacking
            const timerCount = this.timers.length;
            const maxColumns = Math.floor((contentWidth - padding * 2) / (timerWidth + stackOffset));
            const column = timerCount % maxColumns;
            const row = Math.floor(timerCount / maxColumns);
            
            const x = padding + (column * (timerWidth + stackOffset));
            const y = padding + (row * (timerHeight + stackOffset));
            
            const timer = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                duration: 0, // Start with 0 - will be set when cooldown is selected
                remainingTime: 0,
                isRunning: false,
                type: 'countdown',
                color: '#666', // Neutral color for blank timer
                x: x,
                y: y,
                width: timerWidth,
                height: timerHeight,
                pinned: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                isApiTimer: false,
                cooldownType: null
            };

            this.timers.push(timer);
            
            // Save timers immediately after adding
            console.log('💾 Saving timers after adding new timer');
            this.saveTimers();
            
            // Render the blank timer window
            this.renderTimer(timer);
            
            console.log('⏰ Timer added successfully, total timers:', this.timers.length);
            return timer;
        },

        // Create cooldown selection interface
        renderCooldownSelector(timer) {
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) {
                console.error('⏰ Sidekick content area not found for selector');
                return;
            }

            const cooldownTypes = {
                'drug': { name: 'Drug Cooldown', color: '#9C27B0', duration: 75 },
                'medical': { name: 'Medical Cooldown', color: '#4CAF50', duration: 15 },
                'booster': { name: 'Booster Cooldown', color: '#FF9800', duration: 60 },
                'crime': { name: 'Crime Cooldown', color: '#f44336', duration: 300 },
                'oc': { name: 'Organized Crime', color: '#607D8B', duration: 480 },
                'travel': { name: 'Travel', color: '#2196F3', duration: 30 }
            };

            // Create cooldown selector window
            const selectorElement = document.createElement('div');
            selectorElement.className = 'cooldown-selector';
            selectorElement.dataset.timerId = timer.id;
            
            // Use content area dimensions for positioning within sidepanel
            const contentWidth = contentArea.clientWidth || 480;
            const contentHeight = contentArea.clientHeight || 500;
            
            const width = Math.min(300, contentWidth - 40);
            const height = Math.min(400, contentHeight - 60);
            const x = Math.min(Math.max(timer.x || 10, 0), contentWidth - width);
            const y = Math.min(Math.max(timer.y || 10, 0), contentHeight - height);

            selectorElement.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;
            
            selectorElement.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #2196F3, #1976D2);
                    border-bottom: 1px solid #555;
                    padding: 4px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 24px;
                    border-radius: 5px 5px 0 0;
                    user-select: none;
                ">
                    <span style="color: #fff; font-weight: 600; font-size: 11px;">Select Cooldown Type</span>
                    <button class="cooldown-close" style="
                        background: #f44336;
                        border: none;
                        color: white;
                        cursor: pointer;
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        font-size: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                    " title="Close">×</button>
                </div>
                
                <div style="
                    flex: 1;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    overflow-y: auto;
                ">
                    ${Object.entries(cooldownTypes).map(([type, info]) => `
                        <button class="cooldown-option" data-type="${type}" style="
                            background: linear-gradient(135deg, ${info.color}, ${this.darkenColor(info.color, 15)});
                            border: 1px solid ${this.darkenColor(info.color, 10)};
                            color: white;
                            padding: 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            text-align: left;
                            font-size: 12px;
                            font-weight: 600;
                            transition: all 0.2s;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            <span>${info.name}</span>
                            <span style="font-size: 10px; opacity: 0.8;">${Math.floor(info.duration/60)}m ${info.duration%60}s</span>
                        </button>
                    `).join('')}
                    
                    <button class="cooldown-option manual" style="
                        background: linear-gradient(135deg, #666, #555);
                        border: 1px solid #777;
                        color: white;
                        padding: 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        text-align: center;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.2s;
                        margin-top: 5px;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        📝 Custom Timer
                    </button>
                </div>
            `;

            // Append selector to content area within sidepanel
            contentArea.appendChild(selectorElement);

            // Add event listeners for cooldown selection
            selectorElement.querySelector('.cooldown-close').addEventListener('click', () => {
                // Remove the timer and selector
                this.timers = this.timers.filter(t => t.id !== timer.id);
                this.saveTimers();
                selectorElement.remove();
            });

            selectorElement.querySelectorAll('.cooldown-option').forEach(option => {
                option.addEventListener('click', () => {
                    const type = option.dataset.type;
                    
                    if (type) {
                        // Set up cooldown timer
                        const cooldownInfo = cooldownTypes[type];
                        timer.name = cooldownInfo.name;
                        timer.color = cooldownInfo.color;
                        timer.duration = cooldownInfo.duration;
                        timer.remainingTime = cooldownInfo.duration;
                        timer.cooldownType = type;
                    } else {
                        // Custom timer
                        timer.name = 'Custom Timer';
                        timer.color = '#2196F3';
                        timer.duration = 300; // 5 minutes default
                        timer.remainingTime = 300;
                    }
                    
                    this.saveTimers();
                    selectorElement.remove();
                    this.renderTimer(timer);
                });
            });
        },

        // Render a timer window as a standalone draggable window
        renderTimer(timer) {
            console.log('🔍 renderTimer - Creating standalone timer window for timer:', timer.id);
            
            // ALWAYS remove any existing element first to prevent duplication
            const existingElement = document.getElementById(`sidekick-timer-${timer.id}`);
            if (existingElement) {
                console.log('🔍 Removing existing timer element before re-rendering:', timer.id);
                existingElement.remove();
            }

            // For new timers that aren't API timers, show cooldown selection
            // DISABLED: Old cooldown selector - now using API dropdown in timer window
            // if (!timer.isApiTimer && timer.name === 'Cooldown Timer' && timer.duration === 60 && !timer.isConfigured) {
            //     this.renderCooldownSelector(timer);
            //     return;
            // }

            // Create movable timer window
            const timerElement = document.createElement('div');
            timerElement.className = 'movable-timer';
            timerElement.id = `sidekick-timer-${timer.id}`;  // Add the missing ID!
            timerElement.dataset.timerId = timer.id;
            
            // Get content area for positioning within sidepanel
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) {
                console.error('⏰ Sidekick content area not found');
                return;
            }
            
            console.log(`🔍 Content area found:`, contentArea);
            console.log(`🔍 Content area parent:`, contentArea.parentNode);
            console.log(`🔍 Content area children count:`, contentArea.children.length);
            console.log(`🔍 Content area innerHTML length:`, contentArea.innerHTML.length);
            
            const contentWidth = contentArea.clientWidth || 480;
            const contentHeight = contentArea.clientHeight || 500;
            
            console.log(`🔍 Content dimensions: ${contentWidth}x${contentHeight}`);
            
            const width = Math.min(Math.max(timer.width || 280, 140), contentWidth - 20);
            const height = Math.min(Math.max(timer.height || 180, 80), contentHeight - 40);
            const x = Math.min(Math.max(timer.x || 10, 0), contentWidth - width);
            const y = Math.min(Math.max(timer.y || 10, 0), contentHeight - height);

            timerElement.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                min-width: 140px;
                min-height: 80px;
                z-index: 1000;
                resize: both;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;
            
            timerElement.innerHTML = `
                <div class="timer-header" style="
                    background: linear-gradient(135deg, ${timer.color || '#2196F3'}, ${this.darkenColor(timer.color || '#2196F3', 15)});
                    border-bottom: 1px solid #555;
                    padding: 4px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    height: 24px;
                    flex-shrink: 0;
                    border-radius: 5px 5px 0 0;
                    user-select: none;
                ">
                    <span style="
                        color: #fff;
                        font-weight: 600;
                        font-size: 11px;
                        flex: 1;
                        min-width: 0;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${this.escapeHtml(timer.name)}</span>
                    
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <div class="timer-dropdown" style="position: relative;">
                            <button class="dropdown-btn" style="
                                background: none;
                                border: none;
                                color: rgba(255,255,255,0.8);
                                cursor: pointer;
                                font-size: 10px;
                                padding: 1px 3px;
                                border-radius: 2px;
                                min-width: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="Cooldowns">⚙️</button>
                            <div class="dropdown-content" style="
                                display: none;
                                position: absolute;
                                background: #333;
                                min-width: 120px;
                                box-shadow: 0px 8px 16px rgba(0,0,0,0.3);
                                z-index: 1001;
                                border-radius: 4px;
                                border: 1px solid #555;
                                top: 100%;
                                right: 0;
                                padding: 4px 0;
                            ">
                                <button class="cooldown-option" data-type="drug" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 6px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 11px;
                                    transition: background 0.2s;
                                ">Drug</button>
                                <button class="cooldown-option" data-type="medical" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 6px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 11px;
                                    transition: background 0.2s;
                                ">Medical</button>
                                <button class="cooldown-option" data-type="booster" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 6px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 11px;
                                    transition: background 0.2s;
                                ">Booster</button>
                            </div>
                        </div>
                        
                        <button class="timer-close" style="
                            background: #f44336;
                            border: none;
                            color: white;
                            cursor: pointer;
                            width: 14px;
                            height: 14px;
                            border-radius: 50%;
                            font-size: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            line-height: 1;
                        " title="Close">×</button>
                    </div>
                </div>
                
                <div class="timer-content" style="
                    flex: 1;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    overflow-y: auto;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    font-size: 14px;
                    text-align: center;
                ">
                    ${(function() {
                        console.log(`🔍 renderTimer - timer.remainingTime: ${timer.remainingTime}, name: ${timer.name}`);
                        
                        if (timer.cooldowns && Object.keys(timer.cooldowns).length > 1) {
                            // Multi-cooldown display
                            const cooldownNames = {
                                'drug': 'Drug',
                                'medical': 'Medical', 
                                'booster': 'Booster'
                            };
                            
                            return Object.entries(timer.cooldowns).map(([type, time]) => `
                                <div style="
                                    background: rgba(255,255,255,0.1);
                                    border-radius: 6px;
                                    padding: 8px;
                                    margin: 4px 0;
                                    width: 90%;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    position: relative;
                                ">
                                    <span style="
                                        color: #ccc;
                                        font-size: 14px;
                                        font-weight: 600;
                                    ">${cooldownNames[type] || type}</span>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="
                                            color: ${this.getCooldownColor(type)};
                                            font-family: 'Courier New', monospace;
                                            font-weight: 700;
                                            font-size: 16px;
                                        ">${this.formatTime(time)}</span>
                                        <button class="remove-cooldown-btn" data-cooldown-type="${type}" style="
                                            background: #e74c3c;
                                            border: none;
                                            color: white;
                                            cursor: pointer;
                                            width: 16px;
                                            height: 16px;
                                            border-radius: 50%;
                                            font-size: 10px;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            line-height: 1;
                                            opacity: 0.7;
                                            transition: opacity 0.2s;
                                        " title="Remove ${cooldownNames[type] || type} cooldown">×</button>
                                    </div>
                                </div>
                            `).join('');
                        } else if (timer.remainingTime > 0) {
                            // Single cooldown display
                            return `
                                <div class="timer-display" style="
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: 700;
                                    color: ${timer.color || '#666'};
                                    font-family: 'Courier New', monospace;
                                ">${this.formatTime(timer.remainingTime)}</div>
                            `;
                        } else {
                            // Empty timer
                            return `
                                <div class="timer-display" style="
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: 700;
                                    color: ${timer.color || '#666'};
                                    font-family: 'Courier New', monospace;
                                "></div>
                            `;
                        }
                    }).call(this)}
                </div>
            `;

            // Append to content area within sidepanel
            console.log(`🔍 About to append timer element:`, timerElement);
            console.log(`🔍 Timer element ID:`, timerElement.id);
            console.log(`🔍 Timer element className:`, timerElement.className);
            
            try {
                contentArea.appendChild(timerElement);
                console.log(`🔍 appendChild() completed without error`);
            } catch (error) {
                console.error(`🚨 appendChild() failed with error:`, error);
                return;
            }
            
            console.log(`🔍 Timer element appended to sidepanel content area with ID: sidekick-timer-${timer.id}`);
            
            // Simple verification that the element was properly added
            const verifyElement = document.getElementById(`sidekick-timer-${timer.id}`);
            if (verifyElement) {
                console.log(`✅ Timer ${timer.id} successfully rendered and verified`);
            } else {
                console.error(`� Timer ${timer.id} failed to render properly`);
                return;
            }
            
            this.setupTimerEventListeners(timer, timerElement);
            
            console.log('⏰ Timer rendered:', timer.name);
        },

        // Set up timer event listeners
        setupTimerEventListeners(timer, element) {
            const self = this; // Preserve context
            
            // Dropdown toggle
            const dropdownBtn = element.querySelector('.dropdown-btn');
            const dropdownContent = element.querySelector('.dropdown-content');
            
            if (dropdownBtn && dropdownContent) {
                console.log('🔍 Setting up dropdown for timer:', timer.id);
                
                dropdownBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    console.log('🔍 Dropdown button clicked');
                    
                    // Close all other dropdowns first
                    document.querySelectorAll('.timer-dropdown .dropdown-content').forEach(dropdown => {
                        if (dropdown !== dropdownContent) {
                            dropdown.style.display = 'none';
                        }
                    });
                    
                    // Toggle this dropdown
                    const isVisible = dropdownContent.style.display === 'block';
                    dropdownContent.style.display = isVisible ? 'none' : 'block';
                    console.log('🔍 Dropdown visibility:', dropdownContent.style.display);
                });

                // Close dropdown when clicking outside (use a more specific approach)
                document.addEventListener('click', function(e) {
                    if (!element.contains(e.target)) {
                        dropdownContent.style.display = 'none';
                    }
                });

                // Handle cooldown option clicks
                const cooldownOptions = element.querySelectorAll('.cooldown-option');
                console.log(`🔍 Found ${cooldownOptions.length} cooldown options`);
                
                cooldownOptions.forEach((option, index) => {
                    const cooldownType = option.dataset.type;
                    console.log(`🔍 Setting up option ${index}:`, option.textContent, 'data-type:', cooldownType);
                    
                    option.addEventListener('mouseenter', function() {
                        option.style.background = 'rgba(255,255,255,0.1)';
                    });
                    option.addEventListener('mouseleave', function() {
                        option.style.background = 'none';
                    });
                    option.addEventListener('click', async function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log(`🔍 Cooldown option clicked: ${cooldownType}`);
                        
                        if (cooldownType) {
                            // Close dropdown immediately
                            dropdownContent.style.display = 'none';
                            
                            try {
                                // Call the cooldown check with proper context
                                await self.checkSpecificCooldown(timer, cooldownType);
                                
                                // Show visual feedback that timer was started
                                const timerWindow = document.getElementById(`sidekick-timer-${timer.id}`);
                                if (timerWindow) {
                                    const timerDisplay = timerWindow.querySelector('.timer-display');
                                    if (timerDisplay) {
                                        timerDisplay.style.backgroundColor = '#2ecc71';
                                        setTimeout(() => {
                                            timerDisplay.style.backgroundColor = '#34495e';
                                        }, 1000);
                                    }
                                }
                            } catch (error) {
                                console.error('❌ Error in checkSpecificCooldown:', error);
                            }
                        }
                    });
                });
            } else {
                console.warn('❌ Dropdown elements not found:', {
                    dropdownBtn: !!dropdownBtn,
                    dropdownContent: !!dropdownContent
                });
            }

            // Close button (with stronger confirmation for safety)
            const closeBtn = element.querySelector('.timer-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Simple confirmation for timer deletion
                    const timerName = timer.name || 'Timer';
                    if (confirm(`Delete "${timerName}" timer?`)) {
                        this.deleteTimer(timer.id);
                    }
                });
            }

            // Individual cooldown removal buttons
            const removeCooldownBtns = element.querySelectorAll('.remove-cooldown-btn');
            removeCooldownBtns.forEach(btn => {
                const cooldownType = btn.dataset.cooldownType;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Prevent rapid clicking/spam
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.style.opacity = '0.3';
                    
                    this.removeCooldown(timer.id, cooldownType);
                    
                    // Re-enable after delay
                    setTimeout(() => {
                        if (btn && btn.parentNode) {
                            btn.disabled = false;
                            btn.style.opacity = '0.7';
                        }
                    }, 1000);
                });
                
                // Hover effects
                btn.addEventListener('mouseenter', () => {
                    if (!btn.disabled) {
                        btn.style.opacity = '1';
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    if (!btn.disabled) {
                        btn.style.opacity = '0.7';
                    }
                });
            });

            // Duration input
            const durationInput = element.querySelector('.duration-input');
            if (durationInput) {
                durationInput.addEventListener('change', (e) => {
                    const minutes = parseInt(e.target.value) || 0;
                    timer.duration = minutes * 60;
                    if (!timer.isRunning) {
                        timer.remainingTime = timer.duration;
                        this.updateTimerDisplay(timer.id);
                    }
                    this.saveTimers();
                });
            }

            // Make draggable
            this.makeDraggable(element, timer);
        },

        // Start/Resume timer
        startTimer(id) {
            const timer = this.timers.find(t => t.id === id);
            if (!timer) return;

            timer.isRunning = true;
            timer.modified = new Date().toISOString();

            // Clear existing interval
            if (this.intervals.has(id)) {
                clearInterval(this.intervals.get(id));
            }

            // Start new interval
            const interval = setInterval(() => {
                if (timer.type === 'countdown') {
                    if (timer.cooldowns) {
                        // Update multiple cooldowns
                        let allExpired = true;
                        for (let cooldownType in timer.cooldowns) {
                            timer.cooldowns[cooldownType] = Math.max(0, timer.cooldowns[cooldownType] - 1);
                            if (timer.cooldowns[cooldownType] > 0) {
                                allExpired = false;
                            }
                        }
                        
                        // Update main timer remaining time to the longest cooldown
                        timer.remainingTime = Math.max(...Object.values(timer.cooldowns));
                        
                        if (allExpired) {
                            timer.isRunning = false;
                            clearInterval(interval);
                            this.intervals.delete(id);
                            // All cooldowns finished notification
                            if (window.SidekickModules?.Core?.NotificationSystem) {
                                window.SidekickModules.Core.NotificationSystem.show(
                                    'Cooldowns Finished', 
                                    'All cooldowns have finished!', 
                                    'success', 
                                    5000
                                );
                            }
                        }
                    } else {
                        // Single timer countdown
                        timer.remainingTime = Math.max(0, timer.remainingTime - 1);
                        if (timer.remainingTime === 0) {
                            timer.isRunning = false;
                            clearInterval(interval);
                            this.intervals.delete(id);
                            // Timer finished notification
                            if (window.SidekickModules?.Core?.NotificationSystem) {
                                window.SidekickModules.Core.NotificationSystem.show(
                                    'Timer Finished', 
                                    `${timer.name} has finished!`, 
                                    'success', 
                                    5000
                                );
                            }
                        }
                    }
                } else {
                    timer.remainingTime++;
                }
                this.updateTimerDisplay(id);
            }, 1000);

            this.intervals.set(id, interval);
            this.updateTimerDisplay(id);
            this.saveTimers();
        },

        // Pause timer
        // Update timer display
        updateTimerDisplay(id) {
            const timer = this.timers.find(t => t.id === id);
            const element = document.getElementById(`sidekick-timer-${timer.id}`);
            
            console.log(`🔍 updateTimerDisplay - Timer:`, timer?.name, 'remainingTime:', timer?.remainingTime);
            console.log(`🔍 updateTimerDisplay - Looking for ID: sidekick-timer-${timer.id}`);
            console.log(`🔍 updateTimerDisplay - Element found:`, !!element);
            
            // Debug: Log all existing timer elements
            const allTimerElements = document.querySelectorAll('[id^="sidekick-timer-"]');
            console.log(`🔍 All timer elements in DOM:`, Array.from(allTimerElements).map(el => el.id));
            
            if (!timer || !element) {
                console.error(`🔍 Cannot update - timer exists: ${!!timer}, element exists: ${!!element}`);
                return;
            }

            // Update header color and name
            const header = element.querySelector('.timer-header');
            if (header) {
                header.style.background = `linear-gradient(135deg, ${timer.color}, ${this.darkenColor(timer.color, 15)})`;
                const nameSpan = header.querySelector('span');
                if (nameSpan) {
                    nameSpan.textContent = timer.name;
                    console.log(`🔍 Updated timer name to: ${timer.name}`);
                }
            }

            // Update display content based on timer type
            const contentArea = element.querySelector('div[style*="flex-direction: column"]');
            if (contentArea) {
                // ALWAYS rebuild for now to prevent duplication issues
                const needsRebuild = true; // this.checkIfRebuildNeeded(contentArea, timer);
                
                if (!needsRebuild) {
                    // Just update time displays without recreating elements
                    this.updateTimeDisplaysOnly(contentArea, timer);
                    return;
                }
                
                // Clear and rebuild content - CLEAR ALL CHILDREN TO PREVENT DUPLICATES
                contentArea.innerHTML = '';
                
                // Add new content based on timer type
                if (timer.cooldowns && Object.keys(timer.cooldowns).length > 1) {
                    // Multi-cooldown display
                    const cooldownNames = {
                        'drug': 'Drug',
                        'medical': 'Medical', 
                        'booster': 'Booster'
                    };
                    
                    Object.entries(timer.cooldowns).forEach(([type, time]) => {
                        const cooldownDiv = document.createElement('div');
                        cooldownDiv.style.cssText = `
                            background: rgba(255,255,255,0.1);
                            border-radius: 6px;
                            padding: 8px;
                            margin: 4px 0;
                            width: 90%;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            position: relative;
                        `;
                        cooldownDiv.innerHTML = `
                            <span style="
                                color: #ccc;
                                font-size: 14px;
                                font-weight: 600;
                            ">${cooldownNames[type] || type}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="
                                    color: ${this.getCooldownColor(type)};
                                    font-family: 'Courier New', monospace;
                                    font-weight: 700;
                                    font-size: 16px;
                                ">${this.formatTime(time)}</span>
                                <button class="remove-cooldown-btn" data-cooldown-type="${type}" style="
                                    background: #e74c3c;
                                    border: none;
                                    color: white;
                                    cursor: pointer;
                                    width: 16px;
                                    height: 16px;
                                    border-radius: 50%;
                                    font-size: 10px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    line-height: 1;
                                    opacity: 0.7;
                                    transition: opacity 0.2s;
                                " title="Remove ${cooldownNames[type] || type} cooldown">×</button>
                            </div>
                        `;
                        
                        // Add event listeners for the remove button
                        const removeBtn = cooldownDiv.querySelector('.remove-cooldown-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                
                                // Prevent rapid clicking/spam
                                if (removeBtn.disabled) return;
                                removeBtn.disabled = true;
                                removeBtn.style.opacity = '0.3';
                                
                                this.removeCooldown(timer.id, type);
                                
                                // Re-enable after a delay
                                setTimeout(() => {
                                    if (removeBtn && removeBtn.parentNode) {
                                        removeBtn.disabled = false;
                                        removeBtn.style.opacity = '0.7';
                                    }
                                }, 1000);
                            });
                            
                            // Hover effects
                            removeBtn.addEventListener('mouseenter', () => {
                                if (!removeBtn.disabled) {
                                    removeBtn.style.opacity = '1';
                                }
                            });
                            removeBtn.addEventListener('mouseleave', () => {
                                if (!removeBtn.disabled) {
                                    removeBtn.style.opacity = '0.7';
                                }
                            });
                        }
                        
                        contentArea.appendChild(cooldownDiv);
                    });
                } else {
                    // Single cooldown display
                    const display = document.createElement('div');
                    display.className = 'timer-display';
                    display.style.cssText = `
                        text-align: center;
                        font-size: 24px;
                        font-weight: 700;
                        color: ${timer.color || '#666'};
                        font-family: 'Courier New', monospace;
                    `;
                    const timeText = timer.remainingTime > 0 ? this.formatTime(timer.remainingTime) : '00:00:00';
                    display.textContent = timeText;
                    contentArea.appendChild(display);
                    console.log(`🔍 Updated timer display to: ${timeText}`);
                }
            } else {
                console.error(`🔍 Could not find content area for timer ${id}`);
            }
        },

        // Helper method to check if timer display needs rebuilding
        checkIfRebuildNeeded(contentArea, timer) {
            if (timer.cooldowns && Object.keys(timer.cooldowns).length > 1) {
                // Check if we have the right cooldown elements for multi-cooldown display
                const existingCooldowns = contentArea.querySelectorAll('[data-cooldown-type]');
                const existingTypes = Array.from(existingCooldowns).map(el => el.dataset.cooldownType);
                const currentTypes = Object.keys(timer.cooldowns);
                
                // Need rebuild if different structure (different types or count)
                if (existingTypes.length !== currentTypes.length) return true;
                if (!existingTypes.every(type => currentTypes.includes(type))) return true;
                
                // Structure matches, no rebuild needed
                return false;
            } else {
                // Single timer - check if we have the right display type
                const hasMultiDisplay = contentArea.querySelector('[data-cooldown-type]');
                const hasSingleDisplay = contentArea.querySelector('.timer-display');
                
                // Need rebuild if we have multi-display but need single, or no single display
                return hasMultiDisplay || !hasSingleDisplay;
            }
        },

        // Helper method to update only time displays without rebuilding DOM
        updateTimeDisplaysOnly(contentArea, timer) {
            if (timer.cooldowns && Object.keys(timer.cooldowns).length > 1) {
                // Update multi-cooldown times
                Object.entries(timer.cooldowns).forEach(([type, time]) => {
                    const cooldownEl = contentArea.querySelector(`[data-cooldown-type="${type}"]`);
                    if (cooldownEl) {
                        const timeSpan = cooldownEl.querySelector('[style*="Courier New"]');
                        if (timeSpan) {
                            timeSpan.textContent = this.formatTime(time);
                        }
                    }
                });
            } else {
                // Update single timer display
                const display = contentArea.querySelector('.timer-display');
                if (display) {
                    const timeText = timer.remainingTime > 0 ? this.formatTime(timer.remainingTime) : '00:00:00';
                    display.textContent = timeText;
                }
            }
        },

        // Remove individual cooldown from timer
        removeCooldown(timerId, cooldownType) {
            // Debounce to prevent rapid successive calls
            const debounceKey = `${timerId}-${cooldownType}`;
            if (this.removeDebounce && this.removeDebounce[debounceKey]) {
                console.log(`🚫 Debouncing remove request for ${cooldownType} on timer ${timerId}`);
                return;
            }
            
            if (!this.removeDebounce) this.removeDebounce = {};
            this.removeDebounce[debounceKey] = true;
            
            // Clear debounce after short delay
            setTimeout(() => {
                if (this.removeDebounce) {
                    delete this.removeDebounce[debounceKey];
                }
            }, 500);
            
            console.log(`🗑️ Removing ${cooldownType} cooldown from timer ${timerId}`);
            
            const timer = this.timers.find(t => t.id === timerId);
            if (!timer || !timer.cooldowns) {
                console.warn(`⚠️ Timer ${timerId} not found or has no cooldowns`);
                return;
            }

            // Remove the specific cooldown
            if (timer.cooldowns[cooldownType]) {
                delete timer.cooldowns[cooldownType];
                console.log(`✅ Removed ${cooldownType} cooldown`);
                
                const remainingCooldowns = Object.keys(timer.cooldowns);
                console.log(`🔍 Remaining cooldowns: ${remainingCooldowns.join(', ')}`);
                
                if (remainingCooldowns.length === 0) {
                    // No cooldowns left - reset timer to blank state
                    timer.name = 'Cooldown Timer';
                    timer.color = '#666';
                    timer.duration = 0;
                    timer.remainingTime = 0;
                    timer.isRunning = false;
                    timer.isApiTimer = false;
                    delete timer.cooldowns;
                    
                    // Stop the timer if it's running
                    if (this.intervals.has(timerId)) {
                        clearInterval(this.intervals.get(timerId));
                        this.intervals.delete(timerId);
                    }
                    
                    console.log(`🔄 Timer reset to blank state - all cooldowns removed`);
                } else if (remainingCooldowns.length === 1) {
                    // Only one cooldown left - show specific name
                    const remainingType = remainingCooldowns[0];
                    const cooldownNames = {
                        'drug': 'Drug Cooldown',
                        'medical': 'Medical Cooldown', 
                        'booster': 'Booster Cooldown'
                    };
                    timer.name = cooldownNames[remainingType] || 'Cooldown';
                    timer.color = this.getCooldownColor(remainingType);
                    timer.remainingTime = timer.cooldowns[remainingType];
                    timer.duration = timer.cooldowns[remainingType];
                    console.log(`🔄 Timer updated to single cooldown: ${timer.name}`);
                } else {
                    // Multiple cooldowns remain - keep generic name
                    timer.name = 'Cooldowns';
                    timer.color = '#9b59b6';
                    timer.remainingTime = Math.max(...Object.values(timer.cooldowns));
                    timer.duration = Math.max(...Object.values(timer.cooldowns));
                    console.log(`🔄 Timer kept as multi-cooldown: ${remainingCooldowns.length} remaining`);
                }
                
                // Save and update display
                this.saveTimers();
                this.updateTimerDisplay(timerId);
                
                // Show notification
                if (window.SidekickModules?.UI?.showNotification) {
                    const cooldownNames = {
                        'drug': 'Drug',
                        'medical': 'Medical', 
                        'booster': 'Booster'
                    };
                    window.SidekickModules.UI.showNotification(
                        'INFO', 
                        `${cooldownNames[cooldownType] || cooldownType} cooldown removed`
                    );
                }
            } else {
                console.warn(`⚠️ Cooldown ${cooldownType} not found in timer ${timerId}`);
            }
        },

        // Delete timer
        deleteTimer(id) {
            console.log('🚨 TIMER DELETION - ID:', id);
            console.trace('🚨 DELETION CALL STACK:');
            
            const timer = this.timers.find(t => t.id === id);
            if (!timer) return;

            // Clear interval
            if (this.intervals.has(id)) {
                clearInterval(this.intervals.get(id));
                this.intervals.delete(id);
            }

            // Remove from array
            this.timers = this.timers.filter(t => t.id !== id);

            // Save timers immediately after deletion
            console.log('💾 Saving timers after deletion');
            this.saveTimers();

            // Remove element
            const element = document.querySelector(`[data-timer-id="${id}"]`);
            if (element) {
                element.remove();
            }

            console.log('⏰ Timer deleted:', timer.name, '- Remaining timers:', this.timers.length);
        },

        // Make element draggable
        makeDraggable(element, timer) {
            const header = element.querySelector('.timer-header');
            if (!header) return;

            let isDragging = false;
            let currentX = timer.x || 0;
            let currentY = timer.y || 0;
            let initialX;
            let initialY;
            let xOffset = currentX;
            let yOffset = currentY;

            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            function dragStart(e) {
                if (e.target.closest('button')) return;
                
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;

                if (e.target === header || header.contains(e.target)) {
                    isDragging = true;
                    element.style.cursor = 'grabbing';
                }
            }

            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;

                    xOffset = currentX;
                    yOffset = currentY;

                    const contentArea = document.getElementById('sidekick-content');
                    if (contentArea) {
                        const bounds = contentArea.getBoundingClientRect();
                        const elementBounds = element.getBoundingClientRect();
                        
                        currentX = Math.max(0, Math.min(currentX, bounds.width - elementBounds.width));
                        currentY = Math.max(0, Math.min(currentY, bounds.height - elementBounds.height));
                        
                        xOffset = currentX;
                        yOffset = currentY;
                    }

                    element.style.left = currentX + 'px';
                    element.style.top = currentY + 'px';
                }
            }

            function dragEnd(e) {
                if (isDragging) {
                    isDragging = false;
                    element.style.cursor = 'default';

                    // Save position to timer object
                    timer.x = currentX;
                    timer.y = currentY;
                    timer.modified = new Date().toISOString();
                    
                    // Save to storage
                    if (window.SidekickModules?.Timer?.saveTimers) {
                        window.SidekickModules.Timer.saveTimers();
                    }
                    
                    console.log(`⏰ Timer position saved: x=${currentX}, y=${currentY}`);
                }
            }
        },

        // Clear all intervals and reset
        destroy() {
            this.intervals.forEach(interval => clearInterval(interval));
            this.intervals.clear();
            
            if (this.apiCheckInterval) {
                clearInterval(this.apiCheckInterval);
                this.apiCheckInterval = null;
            }
            
            this.timers = [];
            this.isInitialized = false;
            console.log('⏰ Timer Module destroyed');
        },
        
        // Helper methods
        darkenColor(color, percent) {
            const num = parseInt(color.replace("#", ""), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        },

        escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        },

        formatTime(seconds) {
            if (seconds < 0) return '00:00:00';
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Timer module to global namespace
    window.SidekickModules.Timer = TimerModule;
    console.log("✅ Timer Module loaded and ready");

})();