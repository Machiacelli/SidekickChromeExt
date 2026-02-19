/**
 * Sidekick Chrome Extension - Time on Tab Module
 * Display remaining time for various activities on browser tab title
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("⏰ Loading Sidekick Time on Tab Module...");

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                if (window.SidekickModules?.Core?.ChromeStorage) {
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // Time on Tab Module Implementation
    const TimeOnTabModule = {
        isInitialized: false,
        isEnabled: false,
        originalTitle: document.title,
        updateInterval: null,
        observer: null,

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("⏰ Time on Tab Module already initialized");
                return;
            }

            console.log("⏰ Initializing Time on Tab Module...");

            try {
                await waitForCore();
                await this.loadSettings();

                // Store original title, ensuring we don't capture a timer title
                if (!this.originalTitle || this.originalTitle.includes('Chain:') || this.originalTitle.includes('Hospital:') || this.originalTitle.includes('Jail:')) {
                    this.originalTitle = 'TORN'; // Default fallback
                    // Try to get clean title from page
                    const titleElement = document.querySelector('title');
                    if (titleElement && titleElement.textContent && !titleElement.textContent.includes(':') && !titleElement.textContent.includes('|')) {
                        this.originalTitle = titleElement.textContent.trim();
                    }
                } else {
                    this.originalTitle = document.title;
                }

                console.log('⏰ Original title stored:', this.originalTitle);

                this.isInitialized = true;

                if (this.isEnabled) {
                    console.log('✅ Time on Tab: Enabled - monitoring page for timers');
                    this.startMonitoring();
                } else {
                    console.log('⏸️ Time on Tab: Disabled via settings');
                }

                console.log("✅ Time on Tab Module initialized successfully");
            } catch (error) {
                console.error("❌ Time on Tab Module initialization failed:", error);
            }
        },

        // Load settings from storage
        async loadSettings() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_time_on_tab');
                if (saved) {
                    this.isEnabled = saved.isEnabled === true;
                } else {
                    this.isEnabled = false; // Default disabled
                }
                console.log('⏰ Time on Tab settings loaded:', { enabled: this.isEnabled });
            } catch (error) {
                console.error('Failed to load time on tab settings:', error);
                this.isEnabled = false; // Default disabled
            }
        },

        // Save settings to storage
        async saveSettings() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_time_on_tab', {
                    isEnabled: this.isEnabled
                });
                console.log('💾 Time on Tab settings saved');
            } catch (error) {
                console.error('Failed to save time on tab settings:', error);
            }
        },

        // Toggle enabled state
        async toggle() {
            this.isEnabled = !this.isEnabled;
            await this.saveSettings();

            if (this.isEnabled) {
                console.log('✅ Time on Tab: Enabled');
                this.startMonitoring();
                this.showNotification('Time on Tab enabled!', 'success');
            } else {
                console.log('⏸️ Time on Tab: Disabled');
                this.stopMonitoring();
                this.restoreTitle();
                this.showNotification('Time on Tab disabled!', 'info');
            }

            return this.isEnabled;
        },

        // Start monitoring for timers
        startMonitoring() {
            this.stopMonitoring(); // Clean up any existing monitoring

            // Start update interval
            this.updateInterval = setInterval(() => {
                this.updateTabTitle();
            }, 1000);

            // Set up observer for DOM changes
            this.setupObserver();

            // Initial update
            this.updateTabTitle();
        },

        // Stop monitoring
        stopMonitoring() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }

            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        },

        // Set up mutation observer
        setupObserver() {
            this.observer = new MutationObserver(() => {
                // Debounce updates
                setTimeout(() => this.updateTabTitle(), 100);
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        // Update the tab title with timer information - alternates chain with page timer
        updateTabTitle() {
            if (!this.isEnabled) {
                this.restoreTitle();
                return;
            }

            // Synchronized alternation: derive show/hide from wall-clock time
            // All tabs share the same phase because they all use Date.now() % 6000
            // First 3 seconds of every 6-second window = show chain, last 3 = show label
            const now = Date.now();
            const showChain = (now % 6000) < 3000;

            // Get page-specific timer (hospital, jail, racing, travel)
            const pageTimer = this.getPageSpecificTimer();

            // Get chain timer separately
            const chainTimer = this.getChainTimer();

            // Get profile name if on profile page
            const profileName = this.getProfileName();

            let timerInfo = null;

            // Priority logic:
            // 1. If chain active AND on profile page: alternate between chain and profile name
            // 2. If chain active AND page timer exists: alternate between chain and page timer
            // 3. If only chain: show chain
            // 4. If only page timer: show page timer
            // 5. If only profile: show profile name

            if (chainTimer && profileName) {
                // Chain active + on profile: alternate chain with profile name
                timerInfo = showChain ? chainTimer : `Profile: ${profileName}`;
            } else if (chainTimer && pageTimer) {
                // Chain active + page timer: alternate chain with page timer
                timerInfo = showChain ? chainTimer : pageTimer;
            } else if (chainTimer) {
                timerInfo = chainTimer;
            } else if (pageTimer) {
                timerInfo = pageTimer;
            } else if (profileName) {
                timerInfo = `Profile: ${profileName}`;
            }

            if (timerInfo) {
                const newTitle = `${timerInfo} | TORN`;
                if (document.title !== newTitle) {
                    document.title = newTitle;
                }
            } else {
                // No active timers - restore original title
                if (document.title !== this.originalTitle) {
                    document.title = this.originalTitle;
                }
            }
        },

        // Get page-specific timer (hospital, jail, racing, travel)
        getPageSpecificTimer() {
            // Hospital timer (highest priority) - only check on hospital page
            if (window.location.href.includes('hospitalview.php')) {
                const hospitalTimer = document.querySelector('#theCounter');
                if (hospitalTimer && hospitalTimer.textContent.trim()) {
                    const hospitalTime = hospitalTimer.textContent.trim();
                    if (hospitalTime.match(/\d+:\d+/) && hospitalTime !== '00:00' && hospitalTime !== '0:00') {
                        return `Hospital: ${hospitalTime}`;
                    }
                }
            }

            // Jail timer - only show if actually in jail
            const jailTimer = document.querySelector('[class*="jail"] [class*="timer"], #jailTimer');
            if (jailTimer && jailTimer.textContent.trim()) {
                const jailTime = jailTimer.textContent.trim();
                if (jailTime.match(/\d+:\d+/) && jailTime !== '00:00' && jailTime !== '0:00') {
                    return `Jail: ${jailTime}`;
                }
            }

            // Racing timer - only show if actually racing
            const racingTimer = document.querySelector('#infoSpot');
            if (racingTimer && racingTimer.textContent.trim()) {
                const racingTime = racingTimer.textContent.trim();
                if (racingTime.match(/\d+:\d+/) && racingTime !== '00:00' && racingTime !== '0:00') {
                    return `Racing: ${racingTime}`;
                }
            }

            // Travel timer - only on travel page
            if (window.location.href.includes('page.php?sid=travel')) {
                const travelTimer = document.querySelector("#travel-root > div.flightProgressSection___fhrD5 > div.progressText___qJFfY > span > span:nth-child(2) > time");
                if (travelTimer && travelTimer.textContent.trim()) {
                    const travelTime = travelTimer.textContent.trim();
                    if (travelTime.match(/\d+:\d+/) &&
                        travelTime !== '00:00' &&
                        travelTime !== '0:00') {
                        return `Travel: ${travelTime}`;
                    }
                }
            }

            return null;
        },

        // Get chain timer only (separated so we can alternate with page timer)
        getChainTimer() {
            const chainBar = document.querySelector('[class*="chainBar"], [class*="chain-bar"], [class*="chainBar___"]');
            const chainTimer = document.querySelector('p.bar-timeleft___B9RGV');
            const chainValue = document.querySelector('.bar-value___uxnah');

            // Exclude cooldown — if the chain bar has a cooldown class, skip
            if (chainBar) {
                const classList = [...chainBar.classList].join(' ');
                if (classList.toLowerCase().includes('cooldown') || classList.toLowerCase().includes('ended')) {
                    return null;
                }
            }

            // Also skip if the label says 'cooldown' near the timer
            const chainLabel = document.querySelector('[class*="bar-label"], [class*="chainLabel"]');
            if (chainLabel && chainLabel.textContent.toLowerCase().includes('cooldown')) {
                return null;
            }

            if (chainTimer && chainTimer.textContent.trim()) {
                const chainTime = chainTimer.textContent.trim();
                const chainLength = chainValue ? chainValue.textContent.trim() : '0';

                // Only show if there's an active chain (not 00:00 and chain length >= 25)
                if (chainTime.match(/\d+:\d+/) &&
                    chainTime !== '00:00' &&
                    chainTime !== '0:00' &&
                    parseInt(chainLength) >= 25) {
                    return `Chain ${chainLength}: ${chainTime}`;
                }
            }

        },

        // Get global alternation state (synchronized across all open tabs)
        getGlobalAlternationState() {
            if (!window.sidekickGlobalAlternation) {
                window.sidekickGlobalAlternation = {
                    showChain: true,
                    lastAlternate: Date.now()
                };
            }
            return window.sidekickGlobalAlternation;
        },

        // Toggle global alternation state
        toggleGlobalAlternation() {
            const state = this.getGlobalAlternationState();
            state.showChain = !state.showChain;
            state.lastAlternate = Date.now();
        },

        // Get profile name if on profile page
        getProfileName() {
            // Check if we're on a profile page or attack page
            const onProfilePage = window.location.href.includes('profiles.php');
            const onAttackPage = window.location.href.includes('loader.php?sid=attack');

            if (!onProfilePage && !onAttackPage) {
                return null;
            }

            // For attack pages, get the TARGET's name (not user's own profile)
            if (onAttackPage) {
                // Method 1: Torn attack page - right side is usually the target
                // Try selectors that specifically target the opponent/defender
                const selectors = [
                    '[class*="defender"] [class*="name"]',
                    '[class*="rightPlayer"] [class*="name"]',
                    '[class*="right-player"] [class*="name"]',
                    '[class*="target"] [class*="playerName"]',
                    '[class*="opponent"] [class*="name"]',
                    // Generic: second player name in the fight UI
                    '[class*="playerInfo"] [class*="name"]:last-child',
                ];

                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent) {
                        const name = el.textContent.trim();
                        if (name && name.length > 0 && name !== 'TORN') {
                            return name;
                        }
                    }
                }

                // Method 2: Read the page's *original* title from the <title> meta, not document.title
                // which may already be overwritten by this module
                const metaTitle = document.querySelector('title')?.textContent || '';
                // Torn attack titles often look like: "Attack PlayerName [xxx] | TORN"
                const attackTitleMatch = metaTitle.match(/Attack[\s:]+([^\[|]+)/i);
                if (attackTitleMatch && attackTitleMatch[1]) {
                    const name = attackTitleMatch[1].trim();
                    if (name && name !== 'TORN' && !name.includes('|')) {
                        return name;
                    }
                }

                // Method 3: Store the original title on first detection
                if (!this._attackTargetName) {
                    // Try to extract from ORIGINAL (unmodified) page title stored at init
                    const origMatch = this.originalTitle.match(/Attack[\s:]+([^\[|\-]+)/i);
                    if (origMatch && origMatch[1]) {
                        this._attackTargetName = origMatch[1].trim();
                    }
                }
                if (this._attackTargetName) return this._attackTargetName;

                return null; // Don't show own profile on attack page
            }

            // Reset attack target cache when not on attack page
            this._attackTargetName = null;

            // For regular profile pages
            // Method 1: Profile header name
            const profileHeader = document.querySelector('.profile-container .profile-name') ||
                document.querySelector('.basic-information .user-info-value .name') ||
                document.querySelector('[class*="userName"]') ||
                document.querySelector('[class*="profile"] [class*="name"]');

            if (profileHeader && profileHeader.textContent) {
                const name = profileHeader.textContent.trim();
                if (name && name.length > 0 && name !== 'TORN') {
                    return name;
                }
            }

            // Method 2: Page title (safe here since we're on a profile page not attack)
            const titleMatch = this.originalTitle.match(/^([^\[|]+)/);
            if (titleMatch && titleMatch[1]) {
                const name = titleMatch[1].trim();
                if (name && name !== 'TORN' && !name.includes(':') && !name.toLowerCase().includes('attack')) {
                    return name;
                }
            }

            return null;
        },

        // Get travel time
        getTravelTime() {
            const timeElement = document.querySelector('.time') ||
                document.querySelector('[class*="time"]') ||
                document.querySelector('#travel-time');

            if (timeElement) {
                const timeText = timeElement.textContent.trim();
                if (timeText && timeText !== 'None' && !timeText.includes('Torn')) {
                    return `✈️ ${timeText}`;
                }
            }
            return null;
        },

        // Get hospital time
        getHospitalTime() {
            const timeElement = document.querySelector('#theCounter') ||
                document.querySelector('.time-left') ||
                document.querySelector('[class*="hospital-time"]');

            if (timeElement) {
                const timeText = timeElement.textContent.trim();
                if (timeText && timeText !== '0' && !timeText.includes('ready')) {
                    return `🏥 ${timeText}`;
                }
            }
            return null;
        },

        // Get racing time
        getRacingTime() {
            const timeElement = document.querySelector('#infoSpot') ||
                document.querySelector('.race-time') ||
                document.querySelector('[class*="racing-time"]');

            if (timeElement) {
                const timeText = timeElement.textContent.trim();
                if (timeText && timeText.includes(':')) {
                    return `🏁 ${timeText}`;
                }
            }
            return null;
        },

        // Get chain time
        getChainTime() {
            const chainTimeElement = document.querySelector('.bar-timeleft___B9RGV') ||
                document.querySelector('[class*="chain-time"]') ||
                document.querySelector('.chain-time');

            if (chainTimeElement) {
                const timeText = chainTimeElement.textContent.trim();
                if (timeText && !timeText.includes('ended')) {
                    const chainLengthElement = document.querySelector('.bar-value___uxnah');
                    const chainLength = chainLengthElement ? chainLengthElement.textContent.trim() : '';
                    return `⛓️ ${chainLength} ${timeText}`;
                }
            }
            return null;
        },

        // Get gym time
        getGymTime() {
            const timeElements = document.querySelectorAll('.time, [class*="time"]');
            for (const element of timeElements) {
                const text = element.textContent.trim();
                if (text.includes(':') && (text.includes('min') || text.includes('sec'))) {
                    return `💪 ${text}`;
                }
            }
            return null;
        },

        // Get jail time
        getJailTime() {
            const timeElement = document.querySelector('.time-left') ||
                document.querySelector('#jail-time') ||
                document.querySelector('[class*="jail-time"]');

            if (timeElement) {
                const timeText = timeElement.textContent.trim();
                if (timeText && timeText !== '0' && !timeText.includes('free')) {
                    return `🔒 ${timeText}`;
                }
            }
            return null;
        },

        // Restore original title
        restoreTitle() {
            document.title = this.originalTitle;
        },

        // Show notification
        showNotification(message, type = 'info') {
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification('Time on Tab', message, type);
            }
        },

        // Get current status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                isInitialized: this.isInitialized,
                originalTitle: this.originalTitle,
                currentTitle: document.title
            };
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Time on Tab module to global namespace
    window.SidekickModules.TimeOnTab = TimeOnTabModule;
    console.log("✅ Time on Tab Module loaded and ready");

})();