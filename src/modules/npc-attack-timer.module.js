/**
 * Sidekick Chrome Extension - NPC Attack Timer Module
 * Display upcoming NPC attacks as a standalone banner
 * Based on Loot Rangers API
 * Version: 5.0.0 - Standalone banner approach
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
        bannerElement: null,

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
                this.removeBanner();
            }
        },

        // Start monitoring
        startMonitoring() {
            console.log('🎯 NPC Attack Timer: Starting monitoring...');
            this.stopMonitoring(); // Clean up any existing monitoring

            // Fetch NPC schedule
            this.fetchNpcSchedule().then(() => {
                // Create banner
                this.createBanner();
                this.updateBanner();

                // Periodic updates
                this.updateInterval = setInterval(() => {
                    this.fetchNpcSchedule().then(() => {
                        this.updateBanner();
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

        // Create standalone banner
        createBanner() {
            if (this.bannerElement) return; // Already exists

            const newsTicker = document.querySelector('.news-ticker');
            if (!newsTicker) {
                console.log('⚠️ News ticker not found');
                setTimeout(() => this.createBanner(), 1000);
                return;
            }

            // Create banner
            this.bannerElement = document.createElement('div');
            this.bannerElement.id = 'sidekick-npc-banner';
            this.bannerElement.style.cssText = `
                background: linear-gradient(90deg, rgba(30, 30, 30, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%);
                border: 1px solid ${CONFIG.tickerColor};
                border-radius: 4px;
                padding: 8px 12px;
                margin-bottom: 10px;
                font-size: 12px;
                color: ${CONFIG.tickerColor};
                font-weight: bold;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            // Hover effect
            this.bannerElement.addEventListener('mouseenter', () => {
                this.bannerElement.style.transform = 'translateY(-1px)';
                this.bannerElement.style.boxShadow = '0 4px 12px rgba(138, 190, 239, 0.3)';
            });

            this.bannerElement.addEventListener('mouseleave', () => {
                this.bannerElement.style.transform = 'translateY(0)';
                this.bannerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            });

            // Insert before news ticker
            newsTicker.parentElement.insertBefore(this.bannerElement, newsTicker);
            console.log('✅ NPC banner created');
        },

        // Update banner content
        updateBanner() {
            if (!this.bannerElement || !this.npcData) return;

            const time = this.npcData.time || {};
            let message = '';
            let linkHref = '';

            // Build message
            if (time.clear === 0 && time.attack === false) {
                message = time.reason ?
                    `⚔️ NPC attacking will resume after ${time.reason}` :
                    '⚔️ No attack currently set.';
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
                    message = '⚔️ NPC attack is underway! Get in there and get some loot!';
                    linkHref = `https://www.torn.com/loader.php?sid=attack&user2ID=${attackTarget}`;
                } else {
                    const timeStr = this.formatTime(time.clear);
                    message = `⚔️ NPC attack set for ${timeStr}. Order is: ${attackOrder}`;
                    linkHref = `https://www.torn.com/loader.php?sid=attack&user2ID=${attackTarget}`;
                }
            }

            this.bannerElement.innerHTML = message;

            // Make clickable if there's a link
            if (linkHref) {
                this.bannerElement.onclick = () => window.location.href = linkHref;
                this.bannerElement.style.cursor = 'pointer';
            } else {
                this.bannerElement.onclick = null;
                this.bannerElement.style.cursor = 'default';
            }
        },

        // Remove banner
        removeBanner() {
            if (this.bannerElement) {
                this.bannerElement.remove();
                this.bannerElement = null;
                console.log('🗑️ NPC banner removed');
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
                bannerVisible: !!this.bannerElement,
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