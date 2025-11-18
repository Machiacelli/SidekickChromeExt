/**
 * Sidekick Chrome Extension - Time on Tab Module
 * Display remaining time for various activities on browser tab title
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
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
                this.originalTitle = document.title;
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

        // Update the tab title with timer information (simplified - no clock/emojis)
        updateTabTitle() {
            if (!this.isEnabled) return;

            const timerInfo = this.getActiveTimerInfo();
            
            if (timerInfo) {
                document.title = `${timerInfo} | TORN`;
            } else {
                document.title = this.originalTitle;
            }
        },

        // Get active timer information (only specific important timers)
        getActiveTimerInfo() {
            // Hospital timer (highest priority)
            const hospitalTimer = document.querySelector('#theCounter');
            if (hospitalTimer && hospitalTimer.textContent.trim() && hospitalTimer.textContent.match(/\d+:\d+/)) {
                return hospitalTimer.textContent.trim();
            }
            
            // Chain timer
            const chainTimer = document.querySelector('p.bar-timeleft___B9RGV');
            if (chainTimer && chainTimer.textContent.trim() && chainTimer.textContent.match(/\d+:\d+/)) {
                return `Chain: ${chainTimer.textContent.trim()}`;
            }
            
            // Racing timer  
            const racingTimer = document.querySelector('#infoSpot');
            if (racingTimer && racingTimer.textContent.trim() && racingTimer.textContent.match(/\d+:\d+/)) {
                return `Racing: ${racingTimer.textContent.trim()}`;
            }
            
            // Jail timer
            const jailTimer = document.querySelector('[class*="jail"] [class*="timer"], #jailTimer');
            if (jailTimer && jailTimer.textContent.trim() && jailTimer.textContent.match(/\d+:\d+/)) {
                return `Jail: ${jailTimer.textContent.trim()}`;
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