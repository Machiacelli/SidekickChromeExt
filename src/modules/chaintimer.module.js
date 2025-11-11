/**
 * Sidekick Chrome Extension - Chain Timer Module
 * Floating timer display for faction chain countdown
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("⏱️ Loading Sidekick Chain Timer Module...");

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

    // Chain Timer Module Implementation
    const ChainTimerModule = {
        isInitialized: false,
        isActive: false,
        floatingDisplay: null,
        monitorInterval: null,
        alertThresholdSeconds: 240, // 4 minutes
        hasAlerted: false,

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("⏱️ Chain Timer Module already initialized");
                return;
            }

            console.log("⏱️ Initializing Chain Timer Module...");

            try {
                await waitForCore();
                await this.loadSettings();
                this.isInitialized = true;
                
                if (this.isActive) {
                    console.log('✅ Chain Timer: Active - starting monitoring');
                    this.startMonitoring();
                } else {
                    console.log('⏸️ Chain Timer: Inactive');
                }
                
                console.log("✅ Chain Timer Module initialized successfully");
            } catch (error) {
                console.error("❌ Chain Timer Module initialization failed:", error);
            }
        },

        // Load settings from storage
        async loadSettings() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_chain_timer');
                if (saved) {
                    this.isActive = saved.isActive === true;
                    this.alertThresholdSeconds = saved.alertThresholdSeconds || 240;
                } else {
                    this.isActive = false;
                    this.alertThresholdSeconds = 240;
                }
                console.log('⏱️ Chain Timer settings loaded:', { active: this.isActive, threshold: this.alertThresholdSeconds });
            } catch (error) {
                console.error('Failed to load chain timer settings:', error);
                this.isActive = false;
            }
        },

        // Save settings to storage
        async saveSettings() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_chain_timer', {
                    isActive: this.isActive,
                    alertThresholdSeconds: this.alertThresholdSeconds
                });
                console.log('💾 Chain Timer settings saved');
            } catch (error) {
                console.error('Failed to save chain timer settings:', error);
            }
        },

        // Toggle active state
        async toggle() {
            this.isActive = !this.isActive;
            await this.saveSettings();
            
            if (this.isActive) {
                console.log('✅ Chain Timer: Activated');
                this.startMonitoring();
                this.showNotification('Chain Timer activated!', 'success');
            } else {
                console.log('⏸️ Chain Timer: Deactivated');
                this.stopMonitoring();
                this.showNotification('Chain Timer deactivated!', 'info');
            }
            
            return this.isActive;
        },

        // Start monitoring chain status
        startMonitoring() {
            this.stopMonitoring(); // Clean up any existing monitoring
            
            this.createFloatingDisplay();
            this.monitorInterval = setInterval(() => {
                this.updateChainTimer();
            }, 1000);
            
            // Initial update
            this.updateChainTimer();
        },

        // Stop monitoring
        stopMonitoring() {
            if (this.monitorInterval) {
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
            
            this.removeFloatingDisplay();
            this.hasAlerted = false;
        },

        // Create floating timer display
        createFloatingDisplay() {
            this.removeFloatingDisplay();
            
            this.floatingDisplay = document.createElement('div');
            this.floatingDisplay.id = 'sidekick-chain-timer';
            this.floatingDisplay.style.cssText = `
                position: fixed;
                top: 80px;
                right: 15px;
                background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 12px 16px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                z-index: 9999;
                min-width: 160px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                cursor: pointer;
                transition: all 0.3s ease;
                user-select: none;
            `;
            
            this.floatingDisplay.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 4px; color: #FFC107;">⏱️ Chain Timer</div>
                <div id="chain-time-display" style="font-size: 16px; color: #4CAF50;">--:--:--</div>
                <div id="chain-status" style="font-size: 12px; color: #aaa; margin-top: 4px;">Monitoring...</div>
            `;
            
            // Add hover effects
            this.floatingDisplay.addEventListener('mouseenter', () => {
                this.floatingDisplay.style.transform = 'scale(1.05)';
                this.floatingDisplay.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
            });
            
            this.floatingDisplay.addEventListener('mouseleave', () => {
                this.floatingDisplay.style.transform = 'scale(1)';
                this.floatingDisplay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });
            
            // Click to toggle
            this.floatingDisplay.addEventListener('click', () => {
                this.toggle();
            });
            
            document.body.appendChild(this.floatingDisplay);
        },

        // Remove floating display
        removeFloatingDisplay() {
            if (this.floatingDisplay) {
                this.floatingDisplay.remove();
                this.floatingDisplay = null;
            }
        },

        // Update chain timer display
        updateChainTimer() {
            if (!this.floatingDisplay) return;
            
            const chainData = this.getChainData();
            const timeDisplay = document.getElementById('chain-time-display');
            const statusDisplay = document.getElementById('chain-status');
            
            if (!timeDisplay || !statusDisplay) return;
            
            if (chainData.timeLeft) {
                const seconds = this.parseTimeToSeconds(chainData.timeLeft);
                timeDisplay.textContent = chainData.timeLeft;
                
                // Update colors based on time remaining
                if (seconds <= 60) {
                    timeDisplay.style.color = '#f44336'; // Red - critical
                    this.floatingDisplay.style.borderColor = '#f44336';
                } else if (seconds <= 300) {
                    timeDisplay.style.color = '#ff9800'; // Orange - warning
                    this.floatingDisplay.style.borderColor = '#ff9800';
                } else {
                    timeDisplay.style.color = '#4CAF50'; // Green - safe
                    this.floatingDisplay.style.borderColor = '#444';
                }
                
                // Alert if threshold reached
                if (seconds <= this.alertThresholdSeconds && !this.hasAlerted) {
                    this.triggerAlert(seconds);
                    this.hasAlerted = true;
                }
                
                // Reset alert flag if time goes back up
                if (seconds > this.alertThresholdSeconds) {
                    this.hasAlerted = false;
                }
                
                statusDisplay.textContent = `Chain: ${chainData.length || '?'}`;
            } else {
                timeDisplay.textContent = '--:--:--';
                timeDisplay.style.color = '#aaa';
                this.floatingDisplay.style.borderColor = '#444';
                statusDisplay.textContent = chainData.status || 'No active chain';
                this.hasAlerted = false;
            }
        },

        // Get chain data from page
        getChainData() {
            // Try multiple selectors for chain time
            const timeSelectors = [
                '.bar-timeleft___B9RGV',
                '[class*="chain-time"]',
                '.chain-time',
                '.timeleft'
            ];
            
            const lengthSelectors = [
                '.bar-value___uxnah',
                '[class*="chain-length"]',
                '.chain-length',
                '.chain-count'
            ];
            
            let timeLeft = null;
            let length = null;
            let status = 'Monitoring...';
            
            // Find time element
            for (const selector of timeSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const text = element.textContent.trim();
                    if (text.includes(':') && !text.includes('ended')) {
                        timeLeft = text;
                        break;
                    }
                }
            }
            
            // Find length element
            for (const selector of lengthSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    length = element.textContent.trim();
                    break;
                }
            }
            
            // Determine status
            if (!timeLeft) {
                // Check if we're on faction page
                if (window.location.href.includes('/factions.php')) {
                    status = 'No active chain';
                } else {
                    status = 'Not on faction page';
                }
            }
            
            return { timeLeft, length, status };
        },

        // Parse time string to seconds
        parseTimeToSeconds(timeString) {
            const parts = timeString.split(':').map(n => parseInt(n) || 0);
            if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
            } else if (parts.length === 2) {
                return parts[0] * 60 + parts[1]; // MM:SS
            }
            return 0;
        },

        // Trigger alert when threshold reached
        triggerAlert(secondsLeft) {
            const minutes = Math.floor(secondsLeft / 60);
            const seconds = secondsLeft % 60;
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Visual alert - flash the display
            this.flashDisplay();
            
            // Show notification
            this.showNotification(`Chain expires in ${timeStr}!`, 'warning');
            
            // Browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Chain Timer Alert', {
                    body: `Chain expires in ${timeStr}!`,
                    icon: '/favicon.ico'
                });
            }
        },

        // Flash the display for visual alert
        flashDisplay() {
            if (!this.floatingDisplay) return;
            
            let flashCount = 0;
            const flashInterval = setInterval(() => {
                this.floatingDisplay.style.background = flashCount % 2 === 0 
                    ? 'linear-gradient(135deg, #f44336, #d32f2f)' 
                    : 'linear-gradient(135deg, #2a2a2a, #1a1a1a)';
                
                flashCount++;
                if (flashCount >= 6) {
                    clearInterval(flashInterval);
                    this.floatingDisplay.style.background = 'linear-gradient(135deg, #2a2a2a, #1a1a1a)';
                }
            }, 200);
        },

        // Show notification
        showNotification(message, type = 'info') {
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification('Chain Timer', message, type);
            }
        },

        // Get current status
        getStatus() {
            const chainData = this.getChainData();
            return {
                isActive: this.isActive,
                isInitialized: this.isInitialized,
                timeLeft: chainData.timeLeft,
                chainLength: chainData.length,
                alertThreshold: this.alertThresholdSeconds,
                hasAlerted: this.hasAlerted
            };
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Chain Timer module to global namespace
    window.SidekickModules.ChainTimer = ChainTimerModule;
    console.log("✅ Chain Timer Module loaded and ready");

})();