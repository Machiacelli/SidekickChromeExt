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
        showChain: true, // Alternates between chain and page timer
        lastAlternate: Date.now(), // Track last alternation time

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

            // Alternate every 3 seconds between chain timer and page-specific timer
            const now = Date.now();
            if (now - this.lastAlternate >= 3000) {
                this.showChain = !this.showChain;
                this.lastAlternate = now;
            }

            // Get page-specific timer (hospital, jail, racing, travel)
            const pageTimer = this.getPageSpecificTimer();

            // Get chain timer separately
            const chainTimer = this.getChainTimer();

            let timerInfo = null;

            // If both exist, alternate. Otherwise show whichever exists
            if (chainTimer && pageTimer) {
                timerInfo = this.showChain ? chainTimer : pageTimer;
            } else if (chainTimer) {
                timerInfo = chainTimer;
            } else if (pageTimer) {
                timerInfo = pageTimer;
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
            const chainTimer = document.querySelector('p.bar-timeleft___B9RGV');
            const chainValue = document.querySelector('.bar-value___uxnah');

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