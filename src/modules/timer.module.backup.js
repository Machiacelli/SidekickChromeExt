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
        intervals: new Map(), // Store active intervals
        apiKey: null,
        apiCheckInterval: null,

        // Initialize the timer module
        async init() {
            if (this.isInitialized) {
                console.log("⏰ Timer Module already initialized");
                return;
            }

            console.log("⏰ Initializing Timer Module...");

            try {
                await waitForCore();
                await this.loadTimers();
                await this.loadApiKey();
                this.startApiChecking();
                this.isInitialized = true;
                console.log("✅ Timer Module initialized successfully");
            } catch (error) {
                console.error("❌ Timer Module initialization failed:", error);
            }
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

        // Start checking API for cooldowns
        startApiChecking() {
            // Check every 30 seconds for API cooldowns
            if (this.apiCheckInterval) {
                clearInterval(this.apiCheckInterval);
            }

            this.apiCheckInterval = setInterval(() => {
                this.checkApiCooldowns();
            }, 30000);

            // Initial check
            this.checkApiCooldowns();
        },

        // Check Torn API for cooldowns
        async checkApiCooldowns() {
            if (!this.apiKey) {
                console.log("⏰ No API key available for cooldown checking");
                return;
            }

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

        // Update or create timers based on API cooldowns
        updateCooldownTimers(cooldowns) {
            const currentTime = Math.floor(Date.now() / 1000);

            // Common cooldowns to track
            const cooldownTypes = {
                'drug': 'Drug Cooldown',
                'medical': 'Medical Cooldown', 
                'booster': 'Booster Cooldown',
                'crime': 'Crime Cooldown',
                'oc': 'Organized Crime',
                'travel': 'Travel'
            };

            Object.entries(cooldowns).forEach(([type, timestamp]) => {
                if (timestamp > currentTime && cooldownTypes[type]) {
                    const remainingTime = timestamp - currentTime;
                    
                    // Find or create timer for this cooldown
                    let timer = this.timers.find(t => t.cooldownType === type);
                    
                    if (!timer) {
                        // Create new cooldown timer
                        timer = {
                            id: Date.now() + Math.random(),
                            name: cooldownTypes[type],
                            duration: remainingTime,
                            remainingTime: remainingTime,
                            isRunning: true,
                            type: 'countdown',
                            cooldownType: type,
                            color: this.getCooldownColor(type),
                            x: 10 + (this.timers.length * 20),
                            y: 10 + (this.timers.length * 20),
                            width: 280,
                            height: 160,
                            pinned: false,
                            created: new Date().toISOString(),
                            modified: new Date().toISOString(),
                            isApiTimer: true
                        };

                        this.timers.push(timer);
                        this.renderTimer(timer);
                        this.startTimer(timer.id);
                        console.log(`⏰ Created cooldown timer for ${cooldownTypes[type]}`);
                    } else if (Math.abs(timer.remainingTime - remainingTime) > 5) {
                        // Update existing timer if time difference is significant
                        timer.remainingTime = remainingTime;
                        timer.duration = Math.max(remainingTime, timer.duration);
                        this.updateTimerDisplay(timer.id);
                        console.log(`⏰ Updated cooldown timer for ${cooldownTypes[type]}`);
                    }
                }
            });

            // Remove expired API timers
            this.timers = this.timers.filter(timer => {
                if (timer.isApiTimer && timer.remainingTime <= 0) {
                    const element = document.querySelector(`[data-timer-id="${timer.id}"]`);
                    if (element) {
                        element.remove();
                    }
                    if (this.intervals.has(timer.id)) {
                        clearInterval(this.intervals.get(timer.id));
                        this.intervals.delete(timer.id);
                    }
                    console.log(`⏰ Removed expired cooldown timer: ${timer.name}`);
                    return false;
                }
                return true;
            });

            this.saveTimers();
        },

        // Get color based on cooldown type
        getCooldownColor(type) {
            const colors = {
                'drug': '#9C27B0',      // Purple
                'medical': '#4CAF50',    // Green  
                'booster': '#FF9800',    // Orange
                'crime': '#f44336',      // Red
                'oc': '#607D8B',        // Blue Grey
                'travel': '#2196F3'      // Blue
            };
            return colors[type] || '#2196F3';
        },

        // Load timers from storage
        async loadTimers() {
            try {
                console.log("🔍 loadTimers - Starting with robust storage access...");
                
                let stored = null;
                
                // Method 1: Try Chrome storage wrapper (now handles extension context internally)
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                        console.log("⏰ Method 1: Using ChromeStorage wrapper");
                        stored = await window.SidekickModules.Core.ChromeStorage.get('sidekick_timers');
                        console.log("✅ ChromeStorage wrapper succeeded");
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper failed:", error.message);
                }
                
                // Method 2: Fallback to localStorage if wrapper failed
                if (stored === null) {
                    try {
                        console.log("⏰ Method 2: Using localStorage fallback");
                        stored = JSON.parse(localStorage.getItem('sidekick_timers') || 'null');
                        console.log("✅ localStorage fallback succeeded");
                    } catch (error) {
                        console.warn("⚠️ localStorage fallback failed:", error);
                    }
                }
                
                this.timers = stored || [];
                console.log(`⏰ Loaded ${this.timers.length} timers`);

                // Refresh display and restart active timers
                this.refreshDisplay();
                this.restartActiveTimers();
                
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

        // Save timers to storage
        async saveTimers() {
            try {
                console.log("💾 saveTimers - Starting save...");
                
                let saved = false;
                
                // Method 1: Try Chrome storage wrapper (now handles extension context internally)
                try {
                    if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                        console.log("⏰ Method 1: Saving via ChromeStorage wrapper");
                        await window.SidekickModules.Core.ChromeStorage.set('sidekick_timers', this.timers);
                        saved = true;
                        console.log("✅ ChromeStorage wrapper save succeeded");
                    }
                } catch (error) {
                    console.warn("⚠️ ChromeStorage wrapper save failed:", error.message);
                }
                
                // Method 2: Fallback to localStorage if wrapper failed
                if (!saved) {
                    try {
                        console.log("⏰ Method 2: Saving via localStorage fallback");
                        localStorage.setItem('sidekick_timers', JSON.stringify(this.timers));
                        saved = true;
                        console.log("✅ localStorage fallback save succeeded");
                    } catch (error) {
                        console.warn("⚠️ localStorage fallback save failed:", error);
                        throw error;
                    }
                }
                
                console.log('⏰ Timers saved successfully');
            } catch (error) {
                console.error('Failed to save timers:', error);
                
                // Show user-friendly error
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Save Error', 
                        'Failed to save timer changes: ' + error.message, 
                        'error'
                    );
                }
            }
        },

        // Create a new timer window in the sidebar
        addTimer(name = 'New Timer') {
            console.log('⏰ Adding new timer:', name);
            
            const contentArea = document.getElementById('sidekick-content');
            const contentWidth = contentArea ? contentArea.clientWidth : 480;
            const contentHeight = contentArea ? contentArea.clientHeight : 500;
            
            const timer = {
                id: Date.now() + Math.random(),
                name: name,
                duration: 60, // Default 60 seconds
                remainingTime: 60,
                isRunning: false,
                type: 'countdown', // 'countdown' or 'stopwatch'
                color: '#2196F3', // Default blue color
                x: 10 + (this.timers.length * 20),
                y: 10 + (this.timers.length * 20),
                width: Math.min(280, contentWidth - 40),
                height: Math.min(180, contentHeight - 60),
                pinned: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                isApiTimer: false
            };

            this.timers.push(timer);
            this.saveTimers();
            
            // Render the new timer window
            this.renderTimer(timer);
            
            if (window.SidekickModules?.Core?.NotificationSystem) {
                window.SidekickModules.Core.NotificationSystem.show(
                    'Timer', 
                    'New timer created', 
                    'info', 
                    2000
                );
            }
            
            console.log('⏰ Timer added successfully, total timers:', this.timers.length);
            return timer;
        },

        // Delete a timer
        deleteTimer(id) {
            const timer = this.timers.find(t => t.id === id);
            if (timer && confirm(`Delete timer "${timer.name}"?`)) {
                console.log('⏰ Deleting timer:', id, timer.name);
                
                // Stop timer if running
                this.stopTimer(id);
                
                // Remove from local array
                this.timers = this.timers.filter(t => t.id !== id);
                
                // Remove from DOM
                const element = document.querySelector(`[data-timer-id="${id}"]`);
                if (element) {
                    element.remove();
                    console.log('⏰ Removed timer element from DOM');
                }
                
                // Save updated array
                this.saveTimers();
                
                // Show placeholder if no timers left
                if (this.timers.length === 0) {
                    this.showPlaceholder();
                }
                
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Timer', 
                        'Timer deleted', 
                        'success', 
                        2000
                    );
                }
                
                console.log('⏰ Timer deleted successfully, remaining timers:', this.timers.length);
            }
        },

        // Update timer properties
        updateTimer(id, updates) {
            const timer = this.timers.find(t => t.id === id);
            if (timer) {
                Object.assign(timer, updates, { modified: new Date().toISOString() });
                this.saveTimers();
                console.log('⏰ Updated timer:', id);
                return timer;
            }
            return null;
        },

        // Start timer
        startTimer(id) {
            const timer = this.timers.find(t => t.id === id);
            if (!timer || timer.isRunning) return;

            timer.isRunning = true;
            this.saveTimers();

            const interval = setInterval(() => {
                if (timer.type === 'countdown') {
                    timer.remainingTime--;
                    if (timer.remainingTime <= 0) {
                        timer.remainingTime = 0;
                        timer.isRunning = false;
                        this.stopTimer(id);
                        this.onTimerComplete(timer);
                        return;
                    }
                } else {
                    timer.remainingTime++;
                }
                
                this.updateTimerDisplay(id);
                this.saveTimers();
            }, 1000);

            this.intervals.set(id, interval);
            this.updateTimerDisplay(id);
            console.log('⏰ Timer started:', timer.name);
        },

        // Stop timer
        stopTimer(id) {
            const timer = this.timers.find(t => t.id === id);
            if (!timer) return;

            timer.isRunning = false;
            if (this.intervals.has(id)) {
                clearInterval(this.intervals.get(id));
                this.intervals.delete(id);
            }
            
            this.updateTimerDisplay(id);
            this.saveTimers();
            console.log('⏰ Timer stopped:', timer.name);
        },

        // Reset timer
        resetTimer(id) {
            const timer = this.timers.find(t => t.id === id);
            if (!timer) return;

            this.stopTimer(id);
            timer.remainingTime = timer.type === 'countdown' ? timer.duration : 0;
            this.updateTimerDisplay(id);
            this.saveTimers();
            console.log('⏰ Timer reset:', timer.name);
        },

        // Timer completion handler
        onTimerComplete(timer) {
            console.log('⏰ Timer completed:', timer.name);
            
            if (window.SidekickModules?.Core?.NotificationSystem) {
                window.SidekickModules.Core.NotificationSystem.show(
                    'Timer Complete', 
                    `"${timer.name}" has finished!`, 
                    'success', 
                    5000
                );
            }
            
            // Flash the timer window
            const element = document.querySelector(`[data-timer-id="${timer.id}"]`);
            if (element) {
                element.style.animation = 'flash 0.5s ease-in-out 3';
            }
        },

        // Restart active timers on load
        restartActiveTimers() {
            this.timers.forEach(timer => {
                if (timer.isRunning) {
                    // Don't restart automatically, just mark as stopped
                    timer.isRunning = false;
                }
            });
            this.saveTimers();
        },

        // Refresh display - render all timers in sidebar
        refreshDisplay() {
            console.log('⏰ Refreshing timer display...');
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) return;

            // Clear existing timers but keep other content
            const existingTimers = contentArea.querySelectorAll('.movable-timer');
            existingTimers.forEach(timer => timer.remove());

            // Show placeholder if no timers
            if (this.timers.length === 0) {
                this.showPlaceholder();
                return;
            }

            // Remove placeholder if it exists
            const placeholder = contentArea.querySelector('.sidekick-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Render all timers
            this.timers.forEach(timer => {
                this.renderTimer(timer);
            });
        },

        // Show placeholder when no timers exist
        showPlaceholder() {
            // No placeholder needed anymore - user requested removal
            return;
        },

        // Format time as MM:SS
        formatTime(seconds) {
            const mins = Math.floor(Math.abs(seconds) / 60);
            const secs = Math.abs(seconds) % 60;
            const sign = seconds < 0 ? '-' : '';
            return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },

        // Update timer display
        updateTimerDisplay(id) {
            const timer = this.timers.find(t => t.id === id);
            const element = document.querySelector(`[data-timer-id="${id}"]`);
            if (!timer || !element) return;

            const timeDisplay = element.querySelector('.timer-display');
            const playBtn = element.querySelector('.play-btn');
            
            if (timeDisplay) {
                timeDisplay.textContent = this.formatTime(timer.remainingTime);
                timeDisplay.style.color = timer.remainingTime <= 10 && timer.type === 'countdown' ? '#ff4444' : '#fff';
            }
            
            if (playBtn) {
                playBtn.textContent = timer.isRunning ? '⏸️' : '▶️';
            }
        },

        // Render a timer window in the sidebar
        renderTimer(timer) {
            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) return;

            // Remove placeholder if it exists
            const placeholder = contentArea.querySelector('.sidekick-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // For new timers that aren't API timers, show cooldown selection
            if (!timer.isApiTimer && timer.name === 'Cooldown Timer' && timer.duration === 60) {
                this.renderCooldownSelector(timer);
                return;
            }

            // Create movable timer window
            const timerElement = document.createElement('div');
            timerElement.className = 'movable-timer';
            timerElement.dataset.timerId = timer.id;
            
            const contentWidth = contentArea.clientWidth || 480;
            const contentHeight = contentArea.clientHeight || 500;
            
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
                resize: ${timer.pinned ? 'none' : 'both'};
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
                    cursor: ${timer.pinned ? 'default' : 'move'};
                    height: 24px;
                    flex-shrink: 0;
                    border-radius: 5px 5px 0 0;
                    user-select: none;
                ">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
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
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 3px; min-width: 32px; flex-shrink: 0;">
                        <div class="timer-dropdown" style="position: relative;">
                            <button class="dropdown-btn" style="
                                background: none;
                                border: none;
                                color: rgba(255,255,255,0.8);
                                cursor: pointer;
                                font-size: 10px;
                                padding: 1px 3px;
                                border-radius: 2px;
                                transition: background 0.2s;
                                min-width: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="Options">⚙️</button>
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
                            flex-shrink: 0;
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
                ">
                    <div class="timer-display" style="
                        text-align: center;
                        font-size: 24px;
                        font-weight: 700;
                        color: ${timer.color || '#2196F3'};
                        margin-bottom: 8px;
                        font-family: 'Courier New', monospace;
                    ">${this.formatTime(timer.remainingTime)}</div>
                    
                    <div class="timer-controls" style="
                        display: flex;
                        gap: 6px;
                        justify-content: center;
                        flex-wrap: wrap;
                    ">
                        <button class="timer-btn play-pause" style="
                            background: ${timer.isRunning ? '#f44336' : '#4CAF50'};
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                            min-width: 60px;
                        ">${timer.isRunning ? '⏸️ Pause' : '▶️ Play'}</button>
                        
                        <button class="timer-btn reset" style="
                            background: #FF9800;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                            min-width: 60px;
                        ">🔄 Reset</button>
                    </div>
                    
                    <div class="timer-settings" style="
                        display: flex;
                        gap: 6px;
                        align-items: center;
                        justify-content: center;
                        font-size: 11px;
                        color: #ccc;
                    ">
                        <input type="number" class="duration-input" value="${Math.floor(timer.duration / 60)}" min="0" max="999" style="
                            width: 50px;
                            background: #333;
                            border: 1px solid #555;
                            border-radius: 3px;
                            color: #fff;
                            padding: 2px 4px;
                            text-align: center;
                        "> min
                    </div>
                </div>
            `;
                                right: 0;
                            ">
                                <button class="pin-btn" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                                   onmouseout="this.style.background='none'">
                                    ${timer.pinned ? '📌 Unpin' : '📌 Pin'}
                                </button>
                                <button class="type-btn" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                                   onmouseout="this.style.background='none'">
                                    ${timer.type === 'countdown' ? '⏱️ Switch to Stopwatch' : '⏰ Switch to Countdown'}
                                </button>
                                <button class="color-btn" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                                   onmouseout="this.style.background='none'">
                                    🎨 Change Color
                                </button>
                            </div>
                        </div>
                        <button class="close-btn" style="
                            background: #dc3545;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 10px;
                            padding: 0;
                            width: 14px;
                            height: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            transition: all 0.2s;
                            font-weight: bold;
                            flex-shrink: 0;
                            min-width: 14px;
                        " onmouseover="this.style.background='#c82333'; this.style.transform='scale(1.1)'" 
                           onmouseout="this.style.background='#dc3545'; this.style.transform='scale(1)'" 
                           title="Delete timer">×</button>
                    </div>
                </div>
                <div class="timer-content" style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    gap: 8px;
                ">
                    <div class="timer-display" style="
                        font-size: 24px;
                        font-weight: bold;
                        color: #fff;
                        font-family: monospace;
                        text-align: center;
                    ">${this.formatTime(timer.remainingTime)}</div>
                    
                    ${timer.type === 'countdown' ? `
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
                        <input type="number" class="duration-input" value="${timer.duration}" min="1" max="7200"
                               style="
                                   background: rgba(255,255,255,0.1);
                                   border: 1px solid rgba(255,255,255,0.2);
                                   color: #fff;
                                   padding: 2px 4px;
                                   border-radius: 3px;
                                   width: 50px;
                                   font-size: 11px;
                                   text-align: center;
                               "> seconds
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="play-btn" style="
                            background: rgba(76, 175, 80, 0.8);
                            border: none;
                            color: white;
                            padding: 6px 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='rgba(76, 175, 80, 1)'" 
                           onmouseout="this.style.background='rgba(76, 175, 80, 0.8)'">${timer.isRunning ? '⏸️' : '▶️'}</button>
                        
                        <button class="reset-btn" style="
                            background: rgba(255, 152, 0, 0.8);
                            border: none;
                            color: white;
                            padding: 6px 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='rgba(255, 152, 0, 1)'" 
                           onmouseout="this.style.background='rgba(255, 152, 0, 0.8)'">🔄</button>
                    </div>
                </div>
            `;

            // Add flash animation CSS if not exists
            if (!document.getElementById('timer-flash-style')) {
                const style = document.createElement('style');
                style.id = 'timer-flash-style';
                style.textContent = `
                    @keyframes flash {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.3; }
                    }
                `;
                document.head.appendChild(style);
            }

            // Setup event handlers for the timer
            this.setupTimerHandlers(timerElement, timer);

            contentArea.appendChild(timerElement);
            console.log('⏰ Rendered timer window:', timer.name);
        },

        // Setup event handlers for timer window
        setupTimerHandlers(timerElement, timer) {
            const nameInput = timerElement.querySelector('.timer-name');
            const durationInput = timerElement.querySelector('.duration-input');
            const playBtn = timerElement.querySelector('.play-btn');
            const resetBtn = timerElement.querySelector('.reset-btn');
            const header = timerElement.querySelector('.timer-header');
            const closeBtn = timerElement.querySelector('.close-btn');
            const dropdownBtn = timerElement.querySelector('.dropdown-btn');
            const dropdownContent = timerElement.querySelector('.dropdown-content');
            const pinBtn = timerElement.querySelector('.pin-btn');
            const typeBtn = timerElement.querySelector('.type-btn');
            const colorBtn = timerElement.querySelector('.color-btn');

            // Name editing
            if (nameInput) {
                nameInput.addEventListener('input', () => {
                    timer.name = nameInput.value;
                    this.saveTimers();
                });
                
                nameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        nameInput.blur();
                    }
                });

                nameInput.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
            }

            // Duration editing
            if (durationInput) {
                durationInput.addEventListener('change', () => {
                    const newDuration = parseInt(durationInput.value) || 60;
                    timer.duration = Math.max(1, Math.min(7200, newDuration));
                    if (!timer.isRunning) {
                        timer.remainingTime = timer.duration;
                        this.updateTimerDisplay(timer.id);
                    }
                    this.saveTimers();
                });

                durationInput.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
            }

            // Play/Pause button
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (timer.isRunning) {
                        this.stopTimer(timer.id);
                    } else {
                        this.startTimer(timer.id);
                    }
                });
            }

            // Reset button
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.resetTimer(timer.id);
                });
            }

            // Close button
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteTimer(timer.id);
                });
            }

            // Dropdown functionality
            if (dropdownBtn && dropdownContent) {
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = dropdownContent.style.display === 'block';
                    
                    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                        dropdown.style.display = 'none';
                    });
                    
                    dropdownContent.style.display = isVisible ? 'none' : 'block';
                });
                
                document.addEventListener('click', () => {
                    dropdownContent.style.display = 'none';
                });
            }

            // Pin functionality
            if (pinBtn) {
                pinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    timer.pinned = !timer.pinned;
                    pinBtn.textContent = timer.pinned ? '📌 Unpin' : '📌 Pin';
                    
                    timerElement.style.resize = timer.pinned ? 'none' : 'both';
                    header.style.cursor = timer.pinned ? 'default' : 'move';
                    
                    this.saveTimers();
                    dropdownContent.style.display = 'none';
                });
            }

            // Type switch functionality
            if (typeBtn) {
                typeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.stopTimer(timer.id);
                    
                    timer.type = timer.type === 'countdown' ? 'stopwatch' : 'countdown';
                    timer.remainingTime = timer.type === 'countdown' ? timer.duration : 0;
                    
                    // Re-render the timer to show/hide duration input
                    this.renderTimer(timer);
                    this.saveTimers();
                    dropdownContent.style.display = 'none';
                });
            }

            // Color functionality
            if (colorBtn) {
                colorBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownContent.style.display = 'none';
                    this.showColorPicker(timerElement, timer);
                });
            }

            // Dragging functionality (only if not pinned)
            if (header) {
                let isDragging = false;
                let dragOffset = { x: 0, y: 0 };

                header.addEventListener('mousedown', (e) => {
                    if (timer.pinned) return;
                    if (e.target.closest('button') || e.target.closest('input')) return;
                    
                    isDragging = true;
                    const rect = timerElement.getBoundingClientRect();
                    const sidebarRect = document.getElementById('sidekick-content').getBoundingClientRect();
                    
                    dragOffset.x = e.clientX - rect.left;
                    dragOffset.y = e.clientY - rect.top;
                    
                    timerElement.style.zIndex = '1100';
                    e.preventDefault();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging || timer.pinned) return;
                    
                    const sidebarContent = document.getElementById('sidekick-content');
                    const sidebarRect = sidebarContent.getBoundingClientRect();
                    
                    let newX = e.clientX - sidebarRect.left - dragOffset.x;
                    let newY = e.clientY - sidebarRect.top - dragOffset.y;
                    
                    const timerRect = timerElement.getBoundingClientRect();
                    newX = Math.max(0, Math.min(newX, sidebarContent.offsetWidth - timerRect.width));
                    newY = Math.max(0, Math.min(newY, sidebarContent.offsetHeight - timerRect.height));
                    
                    timerElement.style.left = newX + 'px';
                    timerElement.style.top = newY + 'px';
                    
                    timer.x = newX;
                    timer.y = newY;
                });

                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        timerElement.style.zIndex = '1000';
                        this.saveTimers();
                    }
                });
            }

            // Resizing functionality (only if not pinned)
            const resizeObserver = new ResizeObserver(entries => {
                if (timer.pinned) return;
                
                for (let entry of entries) {
                    if (entry.target === timerElement) {
                        timer.width = entry.contentRect.width;
                        timer.height = entry.contentRect.height;
                        this.saveTimers();
                    }
                }
            });
            resizeObserver.observe(timerElement);
        },

        // Show color picker for timer
        showColorPicker(timerElement, timer) {
            // Remove any existing color picker
            const existingPicker = document.querySelector('.color-picker');
            if (existingPicker) existingPicker.remove();
            
            const colorPicker = document.createElement('div');
            colorPicker.className = 'color-picker';
            colorPicker.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #333;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 16px;
                z-index: 999999;
                display: grid;
                grid-template-columns: repeat(4, 30px);
                gap: 8px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;
            
            const colors = [
                '#2196F3', '#4CAF50', '#FF9800', '#f44336', 
                '#9C27B0', '#607D8B', '#795548', '#E91E63', 
                '#00BCD4', '#8BC34A', '#FFC107', '#FFEB3B', 
                '#BDBDBD', '#333', '#FFFFFF', '#000000'
            ];
            
            colors.forEach(color => {
                const colorBtn = document.createElement('div');
                colorBtn.style.cssText = `
                    width: 30px;
                    height: 30px;
                    background: ${color};
                    border: 2px solid ${timer.color === color ? '#fff' : '#666'};
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                
                colorBtn.addEventListener('click', () => {
                    timer.color = color;
                    const header = timerElement.querySelector('.timer-header');
                    header.style.background = `linear-gradient(135deg, ${color}, ${this.darkenColor(color, 15)})`;
                    
                    this.saveTimers();
                    colorPicker.remove();
                    
                    console.log(`🎨 Timer color changed to ${color}`);
                });
                
                colorBtn.addEventListener('mouseenter', () => {
                    colorBtn.style.transform = 'scale(1.1)';
                });
                
                colorBtn.addEventListener('mouseleave', () => {
                    colorBtn.style.transform = 'scale(1)';
                });
                
                colorPicker.appendChild(colorBtn);
            });
            
            document.body.appendChild(colorPicker);
            
            // Close when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeColorPicker(e) {
                    if (!colorPicker.contains(e.target)) {
                        colorPicker.remove();
                        document.removeEventListener('click', closeColorPicker);
                    }
                });
            }, 100);
        },

        // Utility functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        darkenColor(color, percent) {
            const num = parseInt(color.replace("#", ""), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        }
    };

    // Export Timer module to global namespace
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Timer = TimerModule;
    console.log("✅ Timer Module loaded and ready");

})();