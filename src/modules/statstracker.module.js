/**
 * Sidekick Chrome Extension - Stats Tracker Module
 * Tracks daily battle stat gains with 90-day history
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("📊 Loading Sidekick Stats Tracker Module...");

    // Ensure SidekickModules namespace exists
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    const STORAGE_KEY = 'sidekick_stats_tracker';
    const WINDOW_STORAGE_KEY = 'sidekick_stats_tracker_window';

    const StatsTrackerModule = {
        isInitialized: false,
        isEnabled: false,
        window: null,
        windowState: { x: 100, y: 100, width: 280, height: 320 },
        history: {},
        lastUpdated: 0,

        // Initialize module
        async init() {
            if (this.isInitialized) {
                console.log("📊 Stats Tracker already initialized");
                return;
            }

            console.log("📊 Initializing Stats Tracker Module...");

            try {
                await this.loadSettings();
                await this.loadHistory();

                // Check if we need to update stats
                await this.checkAndUpdate();

                // Schedule periodic updates (every 90 minutes)
                setInterval(() => this.updateStats(), 90 * 60 * 1000);

                if (this.isEnabled) {
                    this.enable();
                }

                this.isInitialized = true;
                console.log("✅ Stats Tracker Module initialized successfully");
            } catch (error) {
                console.error("❌ Stats Tracker initialization failed:", error);
            }
        },

        // Load settings
        async loadSettings() {
            try {
                const windowState = await window.SidekickModules.Core.ChromeStorage.get(WINDOW_STORAGE_KEY);
                if (windowState) {
                    this.windowState = windowState;
                    this.isEnabled = windowState.isEnabled || false;
                }
            } catch (error) {
                console.error("❌ Failed to load Stats Tracker settings:", error);
            }
        },

        // Save settings
        async saveSettings() {
            try {
                const settings = {
                    ...this.windowState,
                    isEnabled: this.isEnabled
                };
                await window.SidekickModules.Core.ChromeStorage.set(WINDOW_STORAGE_KEY, settings);
            } catch (error) {
                console.error("❌ Failed to save Stats Tracker settings:", error);
            }
        },

        // Load stat history
        async loadHistory() {
            try {
                const data = await window.SidekickModules.Core.ChromeStorage.get(STORAGE_KEY);
                if (data) {
                    this.history = data.history || {};
                    this.lastUpdated = data.lastUpdated || 0;
                    console.log("📊 Loaded stat history:", Object.keys(this.history).length, "days");
                }
            } catch (error) {
                console.error("❌ Failed to load stat history:", error);
            }
        },

        // Save stat history
        async saveHistory() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set(STORAGE_KEY, {
                    history: this.history,
                    lastUpdated: this.lastUpdated
                });
            } catch (error) {
                console.error("❌ Failed to save stat history:", error);
            }
        },

        // Format date as YYYY-MM-DD
        formatDate(date = new Date()) {
            return date.toISOString().slice(0, 10);
        },

        // Calculate difference between two stat snapshots
        diff(current, previous) {
            return {
                strength: current.strength - previous.strength,
                speed: current.speed - previous.speed,
                defense: current.defense - previous.defense,
                dexterity: current.dexterity - previous.dexterity,
                total: current.total - previous.total
            };
        },

        // Fetch current battle stats from API
        async fetchCurrentStats() {
            try {
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                if (!apiKey) {
                    console.warn("📊 No API key available");
                    return null;
                }

                // Direct fetch to Torn API
                const response = await fetch(`https://api.torn.com/user/?selections=battlestats&key=${apiKey}`);
                const data = await response.json();

                if (data.error) {
                    console.error("📊 API error:", data.error);
                    return null;
                }

                return {
                    strength: data.strength || 0,
                    speed: data.speed || 0,
                    defense: data.defense || 0,
                    dexterity: data.dexterity || 0,
                    total: data.total || 0
                };
            } catch (error) {
                console.error("📊 Error fetching stats:", error);
                return null;
            }
        },

        // Check if update needed and perform it
        async checkAndUpdate() {
            const today = this.formatDate();
            const lastDate = new Date(this.lastUpdated).toISOString().slice(0, 10);

            if (today !== lastDate || !this.history[today]) {
                await this.updateStats();
            }
        },

        // Update stats for today
        async updateStats() {
            const today = this.formatDate();
            const current = await this.fetchCurrentStats();

            if (!current) return;

            // Store today's snapshot
            this.history[today] = current;
            this.lastUpdated = Date.now();

            // Cleanup: keep only 90 days
            const dates = Object.keys(this.history).sort();
            while (dates.length > 90) {
                delete this.history[dates.shift()];
            }

            await this.saveHistory();

            // Refresh UI if window is open
            if (this.window) {
                this.refreshDisplay();
            }

            console.log("📊 Stats updated for", today);
        },

        // Get today's gains
        getTodayGains() {
            const today = this.formatDate();
            const yesterday = this.formatDate(new Date(Date.now() - 86400000));

            const todayStats = this.history[today];
            const yesterdayStats = this.history[yesterday];

            if (!todayStats || !yesterdayStats) {
                return null;
            }

            return this.diff(todayStats, yesterdayStats);
        },

        // Enable module
        enable() {
            console.log("📊 Enabling Stats Tracker...");
            this.isEnabled = true;
            this.saveSettings();
            this.createWindow();
        },

        // Disable module
        disable() {
            console.log("📊 Disabling Stats Tracker...");
            this.isEnabled = false;
            this.saveSettings();
            this.removeWindow();
        },

        // Toggle module
        async toggle() {
            if (this.isEnabled) {
                this.disable();
            } else {
                this.enable();
            }
            return { success: true, enabled: this.isEnabled };
        },

        // Create draggable window
        createWindow() {
            if (this.window) {
                this.removeWindow();
            }

            const contentArea = document.getElementById('sidekick-content');
            if (!contentArea) {
                console.error("📊 Content area not found");
                return;
            }

            this.window = document.createElement('div');
            this.window.className = 'sidekick-stats-tracker-window';
            this.window.style.cssText = `
                position: absolute;
                left: ${this.windowState.x}px;
                top: ${this.windowState.y}px;
                width: ${this.windowState.width}px;
                height: ${this.windowState.height}px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                min-width: 200px;
                min-height: 200px;
                z-index: 1000;
                resize: both;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            `;

            // Header
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 10px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                font-weight: bold;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
            `;
            header.innerHTML = `
                <span>📊 Stats Tracker</span>
                <div style="display: flex; gap: 5px;">
                    <button class="cog-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 3px; position: relative;">⚙️</button>
                    <button class="close-btn" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px;">×</button>
                </div>
            `;

            // Content area
            const content = document.createElement('div');
            content.className = 'stats-content';
            content.style.cssText = `
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                color: #fff;
                font-size: 13px;
            `;

            this.window.appendChild(header);
            this.window.appendChild(content);
            contentArea.appendChild(this.window);

            // Make draggable
            this.makeDraggable(header);

            // Close button
            header.querySelector('.close-btn').addEventListener('click', () => {
                this.disable();
            });

            // Cogwheel dropdown menu
            const cogBtn = header.querySelector('.cog-btn');
            cogBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Remove existing dropdown if present
                const existingDropdown = this.window.querySelector('.stats-dropdown');
                if (existingDropdown) {
                    existingDropdown.remove();
                    return;
                }

                // Create dropdown menu
                const dropdown = document.createElement('div');
                dropdown.className = 'stats-dropdown';
                dropdown.style.cssText = `
                    position: absolute;
                    top: 40px;
                    right: 35px;
                    background: #1a1a1a;
                    border: 1px solid #444;
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    z-index: 10000;
                    min-width: 120px;
                `;

                dropdown.innerHTML = `
                    <button class="dropdown-option" data-action="refresh" style="
                        width: 100%;
                        padding: 8px 12px;
                        background: none;
                        border: none;
                        color: #fff;
                        text-align: left;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <span>🔄</span> Refresh Stats
                    </button>
                `;

                this.window.appendChild(dropdown);

                // Add hover effect
                const options = dropdown.querySelectorAll('.dropdown-option');
                options.forEach(option => {
                    option.addEventListener('mouseenter', () => {
                        option.style.background = 'rgba(76, 175, 80, 0.2)';
                    });
                    option.addEventListener('mouseleave', () => {
                        option.style.background = 'none';
                    });
                    option.addEventListener('click', async (e) => {
                        const action = option.dataset.action;
                        dropdown.remove();

                        if (action === 'refresh') {
                            console.log('📊 Manually refreshing stats...');
                            await this.updateStats();
                            if (window.SidekickModules?.Core?.NotificationSystem) {
                                window.SidekickModules.Core.NotificationSystem.show(
                                    'Stats Refreshed',
                                    'Battle stats updated successfully',
                                    'success',
                                    2000
                                );
                            }
                        }
                    });
                });

                // Close dropdown when clicking outside
                setTimeout(() => {
                    const closeDropdown = (e) => {
                        if (!dropdown.contains(e.target) && e.target !== cogBtn) {
                            dropdown.remove();
                            document.removeEventListener('click', closeDropdown);
                        }
                    };
                    document.addEventListener('click', closeDropdown);
                }, 0);
            });

            // Track resize
            const resizeObserver = new ResizeObserver(() => {
                this.windowState.width = this.window.offsetWidth;
                this.windowState.height = this.window.offsetHeight;
                this.saveSettings();
            });
            resizeObserver.observe(this.window);

            this.refreshDisplay();
            console.log("📊 Stats Tracker window created");
        },

        // Make window draggable
        makeDraggable(handle) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;

            handle.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = this.window.offsetLeft;
                startTop = this.window.offsetTop;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                this.window.style.left = (startLeft + dx) + 'px';
                this.window.style.top = (startTop + dy) + 'px';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    this.windowState.x = this.window.offsetLeft;
                    this.windowState.y = this.window.offsetTop;
                    this.saveSettings();
                }
            });
        },

        // Refresh display
        refreshDisplay() {
            if (!this.window) return;

            const content = this.window.querySelector('.stats-content');
            const gains = this.getTodayGains();

            if (!gains) {
                content.innerHTML = `
                    <div style="text-align: center; color: #888; padding: 20px;">
                        <p>⏳ Waiting for data...</p>
                        <p style="font-size: 11px; margin-top: 10px;">
                            Stats are tracked daily. Come back tomorrow to see your gains!
                        </p>
                    </div>
                `;
                return;
            }

            const formatStat = (value) => {
                const sign = value >= 0 ? '+' : '';
                const color = value >= 0 ? '#4CAF50' : '#f44336';
                return `<span style="color: ${color}; font-weight: bold;">${sign}${value.toLocaleString()}</span>`;
            };

            content.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #4CAF50;">
                        Today's Gains
                    </div>
                    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; font-size: 12px;">
                        <div>💪 Strength:</div><div>${formatStat(gains.strength)}</div>
                        <div>⚡ Speed:</div><div>${formatStat(gains.speed)}</div>
                        <div>🛡️ Defense:</div><div>${formatStat(gains.defense)}</div>
                        <div>🎯 Dexterity:</div><div>${formatStat(gains.dexterity)}</div>
                    </div>
                </div>
                <div style="border-top: 1px solid #444; padding-top: 10px; margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px;">
                        <div style="font-weight: bold;">Total:</div>
                        <div style="font-size: 14px;">${formatStat(gains.total)}</div>
                    </div>
                </div>
                <div style="margin-top: 15px; font-size: 10px; color: #888; text-align: center;">
                    Last updated: ${new Date(this.lastUpdated).toLocaleTimeString()}
                </div>
            `;
        },

        // Remove window
        removeWindow() {
            if (this.window) {
                this.window.remove();
                this.window = null;
                console.log("📊 Stats Tracker window removed");
            }
        }
    };

    // Export to global namespace
    window.SidekickModules.StatsTracker = StatsTrackerModule;
    console.log("✅ Stats Tracker Module loaded and ready");

})();
