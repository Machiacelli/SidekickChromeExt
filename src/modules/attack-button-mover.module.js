/**
 * Sidekick Chrome Extension - Attack Button Mover Module
 * Moves the "Start Fight" button on top of weapon for faster attack speed
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("⚔️ Loading Sidekick Attack Button Mover Module...");

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

    // Attack Button Mover Module Implementation
    const AttackButtonMoverModule = {
        isInitialized: false,
        isEnabled: false,
        buttonLocation: 'Primary', // Default: Primary weapon
        loopIntervalId: null,

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("⚔️ Attack Button Mover Module already initialized");
                return;
            }

            console.log("⚔️ Initializing Attack Button Mover Module...");

            try {
                await waitForCore();
                await this.loadSettings();
                this.isInitialized = true;

                if (this.isEnabled) {
                    console.log('✅ Attack Button Mover: Enabled - will activate on attack pages');
                    this.startMonitoring();
                } else {
                    console.log('⏸️ Attack Button Mover: Disabled via settings');
                }

                console.log("✅ Attack Button Mover Module initialized successfully");
            } catch (error) {
                console.error("❌ Attack Button Mover Module initialization failed:", error);
            }
        },

        // Load settings from storage
        async loadSettings() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_attack_button_mover');
                if (saved) {
                    this.isEnabled = saved.isEnabled === true; // Default to false
                    this.buttonLocation = saved.buttonLocation || 'Primary';
                } else {
                    this.isEnabled = false; // Default disabled
                    this.buttonLocation = 'Primary';
                }
                console.log('⚔️ Attack Button Mover settings loaded:', { enabled: this.isEnabled, location: this.buttonLocation });
            } catch (error) {
                console.error('Failed to load attack button mover settings:', error);
                this.isEnabled = false; // Default disabled
                this.buttonLocation = 'Primary';
            }
        },

        // Save settings to storage
        async saveSettings() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_attack_button_mover', {
                    isEnabled: this.isEnabled,
                    buttonLocation: this.buttonLocation
                });
                console.log('💾 Attack Button Mover settings saved');
            } catch (error) {
                console.error('Failed to save attack button mover settings:', error);
            }
        },

        // Toggle enabled state
        async toggle() {
            this.isEnabled = !this.isEnabled;
            await this.saveSettings();

            if (this.isEnabled) {
                console.log('✅ Attack Button Mover: Enabled');
                this.startMonitoring();
            } else {
                console.log('⏸️ Attack Button Mover: Disabled');
                this.stopMonitoring();
                this.restoreButton();
            }

            return this.isEnabled;
        },

        // Start monitoring for attack pages
        startMonitoring() {
            // Only run on loader.php pages (attack/gym pages)
            if (!window.location.href.includes('loader.php')) {
                return;
            }

            console.log('🎯 Attack Button Mover: On attack page, starting button detection...');

            // Clear any existing interval
            if (this.loopIntervalId) {
                clearInterval(this.loopIntervalId);
            }

            // Start detection loop
            let loopCount = 0;
            this.loopIntervalId = setInterval(() => {
                loopCount++;
                if (loopCount > 20) { // Stop after 5 seconds (20 * 250ms)
                    clearInterval(this.loopIntervalId);
                    this.loopIntervalId = null;
                    console.log('⏹️ Attack Button Mover: Detection timeout after 5 seconds');
                    return;
                }

                if (this.moveStartFightButton()) {
                    // If button successfully moved, stop loop
                    clearInterval(this.loopIntervalId);
                    this.loopIntervalId = null;
                    console.log('✅ Attack Button Mover: Start fight button successfully moved');
                }
            }, 250);
        },

        // Stop monitoring
        stopMonitoring() {
            if (this.loopIntervalId) {
                clearInterval(this.loopIntervalId);
                this.loopIntervalId = null;
                console.log('⏹️ Attack Button Mover: Monitoring stopped');
            }
        },

        // Move the start fight button
        moveStartFightButton() {
            let startFightButton, weaponImage, weaponWrapper;

            // Find elements based on button location setting
            if (this.buttonLocation === 'Primary') {
                startFightButton = document.querySelector('.torn-btn.btn___RxE8_.silver');
                weaponImage = document.querySelector('.weaponImage___tUzwP img');
                weaponWrapper = document.querySelector('.weaponWrapper___h3buK');
            } else if (this.buttonLocation === 'Secondary') {
                startFightButton = document.querySelector('.torn-btn.btn___RxE8_.silver');
                weaponImage = document.querySelector('#weapon_second .weaponImage___tUzwP img');
                weaponWrapper = document.querySelector('#weapon_second');
            } else if (this.buttonLocation === 'Melee') {
                startFightButton = document.querySelector('.torn-btn.btn___RxE8_.silver');
                weaponImage = document.querySelector('#weapon_melee .weaponImage___tUzwP img');
                weaponWrapper = document.querySelector('#weapon_melee');
            } else if (this.buttonLocation === 'Temp') {
                startFightButton = document.querySelector('.torn-btn.btn___RxE8_.silver');
                weaponImage = document.querySelector('#weapon_temp .weaponImage___tUzwP img');
                weaponWrapper = document.querySelector('#weapon_temp');
            }

            // Only proceed if all elements found
            if (!startFightButton || !weaponImage || !weaponWrapper) {
                return false;
            }

            // Check if already moved
            if (document.querySelector('.sidekick-attack-button-wrapper')) {
                return true;
            }

            console.log('🎯 Attack Button Mover: Moving button to', this.buttonLocation);

            // Store original parent and position for restoration
            if (!startFightButton.dataset.originalParent) {
                startFightButton.dataset.originalParent = startFightButton.parentNode.className;
                startFightButton.dataset.originalPosition = startFightButton.style.cssText || '';
            }

            // Create wrapper for button (matching original script approach)
            const buttonWrapper = document.createElement('div');
            buttonWrapper.classList.add('sidekick-attack-button-wrapper');
            buttonWrapper.appendChild(startFightButton);

            // Insert wrapper after weapon image (matching original script)
            weaponWrapper.insertBefore(buttonWrapper, weaponImage.nextSibling);

            // Position button over weapon image (matching original script positioning)
            buttonWrapper.style.position = 'absolute';
            buttonWrapper.style.top = weaponImage.offsetTop + 'px';
            buttonWrapper.style.left = '15px';
            buttonWrapper.style.zIndex = '10';

            // Remove wrapper when button clicked (matching original script)
            const clickHandler = () => {
                console.log('🎯 Attack Button Mover: Fight started, removing button wrapper');
                buttonWrapper.remove();
                startFightButton.removeEventListener('click', clickHandler);
            };
            startFightButton.addEventListener('click', clickHandler);

            console.log('✅ Attack Button Mover: Button positioned over weapon');
            return true;
        },

        // Restore button to original position
        restoreButton() {
            const wrapper = document.querySelector('.sidekick-attack-button-wrapper');
            const originalButton = document.querySelector('.torn-btn.btn___RxE8_.silver');

            if (wrapper && originalButton) {
                // Move button back to its original position
                const originalParent = document.querySelector('.' + originalButton.dataset.originalParent) ||
                    document.querySelector('[class*="attackWrapper"]') ||
                    wrapper.parentNode;

                if (originalParent && originalParent !== wrapper.parentNode) {
                    originalParent.appendChild(originalButton);
                }

                // Restore original styling
                if (originalButton.dataset.originalPosition) {
                    originalButton.style.cssText = originalButton.dataset.originalPosition;
                }

                // Remove the wrapper
                wrapper.remove();

                console.log('🔄 Attack button restored to original position');
            }
        },

        // Set button location
        async setButtonLocation(location) {
            this.buttonLocation = location;
            await this.saveSettings();

            // If currently active, restart with new location
            if (this.isEnabled && window.location.href.includes('loader.php')) {
                this.restoreButton();
                this.startMonitoring();
            }
        },

        // Get current status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                buttonLocation: this.buttonLocation,
                isInitialized: this.isInitialized,
                isActive: !!this.loopIntervalId
            };
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Attack Button Mover module to global namespace
    window.SidekickModules.AttackButtonMover = AttackButtonMoverModule;
    console.log("✅ Attack Button Mover Module loaded and ready");

})();