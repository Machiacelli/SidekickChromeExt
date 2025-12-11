/**
 * Sidekick Chrome Extension - NPC Attack Timer Module
 * Display upcoming NPC attacks in Torn's news ticker
 * Based on Loot Rangers API
 * Version: 4.0.0 - Direct DOM slide injection
 * Author: Machiacelli / Robin
 */

(function () {
    'use strict';

    console.log("⚔️ Loading Sidekick NPC Attack Timer Module...");

    // Configuration settings
    const CONFIG = {
        tickerColor: "#8abeef",  // Color for NPC message
        timeFormat24h: true,      // true = 24h, false = 12h
        updateInterval: 30000     // Update every 30 seconds
    };

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

    // NPC Attack Timer Module Implementation
    const NPCAttackTimerModule = {
        isInitialized: false,
        isEnabled: false,
        npcData: null,
        updateInterval: null,
        observer: null,
        npcSlideInjected: false,

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("⚔️ NPC Attack Timer Module already initialized");
                return;
            }

            console.log("⚔️ Initializing NPC Attack Timer Module...");

            try {
                await waitForCore();
                await this.loadSettings();
                this.isInitialized = true;

                if (this.isEnabled) {
                    console.log('✅ NPC Attack Timer: Enabled - monitoring news ticker');
                    this.startMonitoring();
                } else {
                    console.log('⏸️ NPC Attack Timer: Disabled via settings');
                }

                console.log("✅ NPC Attack Timer Module initialized successfully");
            } catch (error) {
                console.error("❌ NPC Attack Timer Module initialization failed:", error);
            }
        },

        // Load settings from storage
        async loadSettings() {
            try {
                const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_npc_attack_timer');
                if (saved) {
                    this.isEnabled = saved.isEnabled === true;
                } else {
                    this.isEnabled = true; // Default ENABLED
                }
                console.log('⚔️ NPC Attack Timer settings loaded:', { enabled: this.isEnabled });
            } catch (error) {
                console.error('Failed to load NPC attack timer settings:', error);
                this.isEnabled = false;
            }
        },

        // Save settings to storage
        async saveSettings() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_npc_attack_timer', {
                    isEnabled: this.isEnabled
                });
                console.log('💾 NPC Attack Timer settings saved');
            } catch (error) {
                console.error('Failed to save NPC attack timer settings:', error);
            }
        },

        // Toggle the timer on/off
        async toggle() {
            this.isEnabled = !this.isEnabled;
            await this.saveSettings();

            if (this.isEnabled) {
                console.log('✅ NPC Attack Timer: Enabled');
                this.startMonitoring();
            } else {
                console.log('⏸️ NPC Attack Timer: Disabled');
                this.stopMonitoring();
                this.removeNPCSlide();
            }
        },

        // Start monitoring for news ticker
        startMonitoring() {
            console.log('🎯 NPC Attack Timer: Starting monitoring...');
            this.stopMonitoring(); // Clean up any existing monitoring

            // Fetch NPC schedule
            this.fetchNpcSchedule().then(() => {
                // Wait for news ticker and inject
                this.waitForNewsTickerAndInject();

                // Periodic updates
                this.updateInterval = setInterval(() => {
                    this.fetchNpcSchedule().then(() => {
                        this.updateNPCSlide();
                    });
                }, CONFIG.updateInterval);
            });
        },

        // Stop monitoring
        stopMonitoring() {
            console.log('⏹️ NPC Attack Timer: Monitoring stopped');
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        },

        // Fetch NPC schedule from Loot Rangers
        async fetchNpcSchedule() {
            console.log('📡 Fetching NPC schedule from Loot Rangers...');
            try {
                const response = await fetch('https://api.lzpt.io/loot');
                this.npcData = await response.json();
                console.log('✅ NPC schedule loaded:', this.npcData);
            } catch (error) {
                console.error('❌ Failed to fetch NPC schedule:', error);
            }
        },

        // Wait for news ticker and inject our slide
        waitForNewsTickerAndInject() {
            const checkTicker = () => {
                const sliderWrapper = document.querySelector('.news-ticker-slider-wrapper');
                if (sliderWrapper) {
                    console.log('✅ News ticker found, injecting NPC slide...');
                    this.injectNPCSlide();
                    this.setupMutationObserver();
                } else {
                    setTimeout(checkTicker, 500);
                }
            };
            checkTicker();
        },

        // Setup mutation observer to watch for ticker changes
        setupMutationObserver() {
            const sliderWrapper = document.querySelector('.news-ticker-slider-wrapper');
            if (!sliderWrapper) return;

            this.observer = new MutationObserver((mutations) => {
                // Only re-inject if our slide was actually removed by Torn (not by us)
                if (!this.hasNPCSlide() && !this.isInjectingSlide) {
                    console.log('🔄 NPC slide removed by Torn, re-injecting...');
                    this.injectNPCSlide();
                }
            });

            this.observer.observe(sliderWrapper, {
                childList: true,
                subtree: false  // Only watch direct children, not subtree
            });

            console.log('👀 MutationObserver set up for news ticker');
        },

        // Check if our NPC slide exists
        hasNPCSlide() {
            return !!document.querySelector('.news-ticker-slide[data-sidekick-npc="true"]');
        },

        // Inject NPC slide into the carousel
        injectNPCSlide() {
            if (!this.npcData) {
                console.log('⚠️ No NPC data available');
                return;
            }

            const sliderWrapper = document.querySelector('.news-ticker-slider-wrapper');
            if (!sliderWrapper) {
                console.log('⚠️ News ticker slider wrapper not found');
                return;
            }

            // Set flag to prevent observer from re-injecting during our injection
            this.isInjectingSlide = true;

            // Temporarily disconnect observer to avoid loops
            if (this.observer) {
                this.observer.disconnect();
            }

            // Remove existing NPC slide if present
            this.removeNPCSlide();

            // Create NPC slide
            const npcSlide = this.createNPCSlide();

            // Insert as first slide
            sliderWrapper.insertBefore(npcSlide, sliderWrapper.firstChild);

            this.npcSlideInjected = true;
            console.log('✅ NPC slide injected into news ticker');

            // Reconnect observer after a short delay
            setTimeout(() => {
                if (this.observer) {
                    const wrapper = document.querySelector('.news-ticker-slider-wrapper');
                    if (wrapper) {
                        this.observer.observe(wrapper, {
                            childList: true,
                            subtree: false
                        });
                    }
                }
                this.isInjectingSlide = false;
            }, 100);
        },

        // Create the NPC slide element
        createNPCSlide() {
            const slide = document.createElement('div');
            slide.className = 'news-ticker-slide';
            slide.setAttribute('data-sidekick-npc', 'true');

            const time = this.npcData.time || {};
            let message = '';
            let linkHref = '';

            // Build message
            if (time.clear === 0 && time.attack === false) {
                message = time.reason ?
                    `NPC attacking will resume after ${time.reason}` :
                    'No attack currently set.';
            } else {
                const order = this.npcData.order || [];
                const npcs = this.npcData.npcs || {};
                let attackOrder = '';
                let attackTarget = 0;

                order.forEach((npcId) => {
                    if (npcs[npcId]?.next) {
                        if (time.attack === true) {
                            if (npcs[npcId].hosp_out >= time.current) {
                                attackOrder += `<span style="text-decoration: line-through">${npcs[npcId].name}</span>, `;
                            } else {
                                attackOrder += `${npcs[npcId].name}, `;
                            }
                        } else {
                            attackOrder += `${npcs[npcId].name}, `;
                        }
                    }

                    if (time.attack === true && npcs[npcId].hosp_out <= time.current && attackTarget === 0) {
                        attackTarget = npcId;
                    }
                });

                if (attackTarget === 0 && order.length > 0) {
                    attackTarget = order[0];
                }

                attackOrder = attackOrder.slice(0, -2) + '.';

                if (time.attack === true) {
                    message = 'NPC attack is underway! Get in there and get some loot!';
                    linkHref = `loader.php?sid=attack&user2ID=${attackTarget}`;
                } else {
                    const timeStr = this.formatTime(time.clear);
                    message = `NPC attack set for ${timeStr}. Order is: ${attackOrder}`;
                    linkHref = `loader.php?sid=attack&user2ID=${attackTarget}`;
                }
            }

            // Create link
            const link = document.createElement('a');
            link.href = linkHref || '#';
            link.innerHTML = `<span style="color:${CONFIG.tickerColor}; font-weight: bold;">${message}</span>`;

            slide.appendChild(link);

            return slide;
        },

        // Update existing NPC slide
        updateNPCSlide() {
            if (!this.hasNPCSlide()) {
                this.injectNPCSlide();
            } else {
                this.removeNPCSlide();
                this.injectNPCSlide();
            }
        },

        // Remove NPC slide
        removeNPCSlide() {
            const existingSlide = document.querySelector('.news-ticker-slide[data-sidekick-npc="true"]');
            if (existingSlide) {
                existingSlide.remove();
                this.npcSlideInjected = false;
                console.log('🗑️ NPC slide removed');
            }
        },

        // Format timestamp to readable time
        formatTime(timestamp) {
            const date = new Date(timestamp * 1000);
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes().toString().padStart(2, '0');

            if (CONFIG.timeFormat24h) {
                return `${hours.toString().padStart(2, '0')}:${minutes} TCT`;
            } else {
                const period = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                return `${displayHours}:${minutes} ${period} TCT`;
            }
        },

        // Get current status (for debugging)
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                hasData: !!this.npcData,
                slideInjected: this.npcSlideInjected,
                npcData: this.npcData
            };
        }
    };

    // Initialize module when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NPCAttackTimerModule.init());
    } else {
        NPCAttackTimerModule.init();
    }

    // Expose module
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.NPCAttackTimer = NPCAttackTimerModule;

    console.log("✅ NPC Attack Timer Module loaded and ready");

})();