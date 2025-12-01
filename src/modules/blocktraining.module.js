/**
 * Sidekick Chrome Extension - Block Training Module
 * Blocks gym access to prevent accidental training
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("🚫 Loading Sidekick Block Training Module...");

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

    // Block Training Module Implementation
    const BlockTrainingModule = {
        isInitialized: false,
        isBlocked: false,
        blockingOverlay: null,
        observer: null,

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("🚫 Block Training Module already initialized");
                return;
            }

            console.log("🚫 Initializing Block Training Module...");

            try {
                await waitForCore();
                await this.loadSettings();
                this.isInitialized = true;
                
                if (this.isBlocked) {
                    console.log('✅ Block Training: Enabled - blocking gym access');
                    this.startBlocking();
                } else {
                    console.log('⏸️ Block Training: Disabled via settings');
                }
                
                console.log("✅ Block Training Module initialized successfully");
            } catch (error) {
                console.error("❌ Block Training Module initialization failed:", error);
            }
        },

        // Load settings from storage
        async loadSettings() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_block_training');
                if (saved) {
                    this.isBlocked = saved.isBlocked === true;
                } else {
                    this.isBlocked = false; // Default disabled
                }
                console.log('🚫 Block Training settings loaded:', { blocked: this.isBlocked });
            } catch (error) {
                console.error('Failed to load block training settings:', error);
                this.isBlocked = false; // Default disabled
            }
        },

        // Save settings to storage
        async saveSettings() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_block_training', {
                    isBlocked: this.isBlocked
                });
                console.log('💾 Block Training settings saved');
            } catch (error) {
                console.error('Failed to save block training settings:', error);
            }
        },

        // Toggle blocking state
        async toggle() {
            this.isBlocked = !this.isBlocked;
            await this.saveSettings();
            
            if (this.isBlocked) {
                console.log('✅ Block Training: Enabled');
                this.startBlocking();
                this.showNotification('Training blocked!', 'warning');
            } else {
                console.log('⏸️ Block Training: Disabled');
                this.stopBlocking();
                this.showNotification('Training unblocked!', 'success');
            }
            
            return this.isBlocked;
        },

        // Start blocking gym access
        startBlocking() {
            console.log('🚫 Starting training blocker...');
            // Try to create block immediately
            this.createTrainingBlock();
            // Set up observer to catch gym appearing
            this.setupObserver();
            // Also check periodically in case gym loads after page navigation
            this.checkInterval = setInterval(() => {
                if (this.isBlocked && !document.getElementById('sidekick-training-block')) {
                    const gymRoot = document.querySelector('#gymroot');
                    if (gymRoot) {
                        console.log('🔄 Gym detected in periodic check, applying block');
                        this.createTrainingBlock();
                    }
                }
            }, 1000);
        },

        // Stop blocking gym access
        stopBlocking() {
            console.log('✅ Stopping training blocker...');
            this.removeTrainingBlock();
            this.disconnectObserver();
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        },

        // Create gym blocking overlay
        createTrainingBlock() {
            console.log('🔨 Creating training block...');
            
            // Only work on gym.php page
            if (!window.location.href.includes('/gym.php')) {
                console.log('⚠️ Not on gym.php - skipping block creation');
                return;
            }
            
            // Remove existing block if any
            this.removeTrainingBlock();

            // Target the gym root or page wrapper
            const gymRoot = document.querySelector('#gymroot') || 
                           document.querySelector('.gym-wrapper') ||
                           document.querySelector('[class*="gym"]');
            
            if (!gymRoot) {
                console.log('⚠️ Gym element not found yet, will retry...');
                return;
            }

            console.log('✅ Gym found! Creating blocking overlay...');
            
            // Create blocking overlay positioned over the gym container
            this.blockingOverlay = document.createElement('div');
            this.blockingOverlay.id = 'sidekick-training-block';
            this.blockingOverlay.style.cssText = `
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-image: url('https://i.imgur.com/DExI6Og.png') !important;
                background-size: cover !important;
                background-position: center !important;
                background-repeat: no-repeat !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                pointer-events: all !important;
            `;
            
            // Ensure gym container has relative positioning
            gymRoot.style.position = 'relative';

            // Add click event to prevent any interaction
            this.blockingOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);
            
            // Add minimal overlay text
            this.blockingOverlay.innerHTML = `
                <div style="
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    color: white;
                    background: rgba(0,0,0,0.8);
                    padding: 12px 18px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                ">
                    🚫 Training Blocked - Toggle off in extension popup
                </div>
            `;

            // Append to gym container to only cover gym area
            gymRoot.appendChild(this.blockingOverlay);

            console.log('🚫 Training block overlay created and positioned over gym container');
        },

        // Remove gym blocking overlay
        removeTrainingBlock() {
            if (this.blockingOverlay) {
                this.blockingOverlay.remove();
                this.blockingOverlay = null;
                console.log('🔄 Training block overlay removed');
            }
        },

        // Set up mutation observer to detect gym page changes
        setupObserver() {
            if (this.observer) return;

            this.observer = new MutationObserver((mutations) => {
                // Only work on gym.php
                if (!window.location.href.includes('/gym.php')) {
                    return;
                }
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        // Check if gym content was added and we're still blocking
                        if (this.isBlocked && !document.getElementById('sidekick-training-block')) {
                            const gymRoot = document.querySelector('#gymroot');
                            if (gymRoot) {
                                console.log('🔄 Gym detected after page change, reapplying block');
                                setTimeout(() => this.createTrainingBlock(), 100);
                            }
                        }
                    }
                });
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        // Disconnect mutation observer
        disconnectObserver() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        },

        // Show notification
        showNotification(message, type = 'info') {
            if (window.SidekickModules?.UI?.showNotification) {
                window.SidekickModules.UI.showNotification('Block Training', message, type);
            }
        },

        // Get current status
        getStatus() {
            return {
                isBlocked: this.isBlocked,
                isInitialized: this.isInitialized,
                hasOverlay: !!this.blockingOverlay
            };
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Block Training module to global namespace
    window.SidekickModules.BlockTraining = BlockTrainingModule;
    console.log("✅ Block Training Module loaded and ready");

})();