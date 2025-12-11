/**
 * Sidekick Chrome Extension - NPC Attack Timer Module
 * Display upcoming NPC attacks in Torn's news ticker
 * Based on Loot Rangers API
 * Version: 3.0.0 - DOM-based approach
 * Author: Machiacelli / Robin
 */

(function () {
    'use strict';

    console.log("⚔️ Loading Sidekick NPC Attack Timer Module...");

    // Configuration settings
    const CONFIG = {
        tickerColor: "#8abeef",  // Color for NPC message
        timeFormat24h: true,      // true = 24h, false = 12h
        checkInterval: 5000       // Check every 5 seconds
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
                    this.isEnabled = true; // Default ENABLED now
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
            }
        },

        // Start monitoring for news ticker
        startMonitoring() {
            console.log('🎯 NPC Attack Timer: Starting monitoring...');
            this.stopMonitoring(); // Clean up any existing monitoring

            // Fetch NPC schedule
            this.fetchNpcSchedule().then(() => {
                // Wait for news ticker to exist, then inject
                this.waitForNewsTicker();

                // Update every 5 seconds
                this.updateInterval = setInterval(() => {
                    this.updateTickerIfNeeded();
                }, CONFIG.checkInterval);
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

        // Wait for news ticker element to exist
        waitForNewsTicker() {
            const checkTicker = () => {
                const ticker = document.querySelector('.news-ticker-slider-wrapper');
                if (ticker) {
                    console.log('✅ News ticker found, injecting NPC data...');
                    this.injectNPCIntoTicker();
                } else {
                    setTimeout(checkTicker, 500);
                }
            };
            checkTicker();
        },

        // Update ticker if needed (refetch data periodically)
        updateTickerIfNeeded() {
            // Refetch every 5 minutes
            if (!this.npcData || (Date.now() - this.npcData.lastFetch) > 300000) {
                this.fetchNpcSchedule().then(() => {
                    this.injectNPCIntoTicker();
                });
            }
        },

        //Inject NPC item directly into the news ticker DOM
        injectNPCIntoTicker() {
            if (!this.npcData) {
                console.log('⚠️ No NPC data to inject');
                return;
            }

            // Find the news ticker React component data
            const ticker = document.querySelector('.news-ticker');
            if (!ticker) {
                console.log('⚠️ News ticker not found');
                return;
            }

            // Try to find React internal instance
            const reactKey = Object.keys(ticker).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));

            if (reactKey) {
                console.log('✅ Found React instance, attempting to inject NPC data');

                //Get the React component
                let fiber = ticker[reactKey];

                // Try to find the component that has the headlines state
                while (fiber) {
                    if (fiber.memoizedState?.headlines || fiber.memoizedProps?.headlines) {
                        console.log('✅ Found headlines in React state/props');

                        // Create NPC news item
                        const npcItem = this.createNPCNewsItem(this.npcData);

                        if (fiber.memoizedState?.headlines) {
                            // Inject into state
                            const headlines = [...fiber.memoizedState.headlines];
                            if (!headlines.find(h => h.ID === 0)) {
                                headlines.unshift(npcItem);
                                fiber.memoizedState.headlines = headlines;
                                console.log('✅ NPC item injected into React state');
                            }
                        } else if (fiber.memoizedProps?.headlines) {
                            // Inject into props
                            const headlines = [...fiber.memoizedProps.headlines];
                            if (!headlines.find(h => h.ID === 0)) {
                                headlines.unshift(npcItem);
                                fiber.memoizedProps.headlines = headlines;
                                console.log('✅ NPC item injected into React props');
                            }
                        }

                        // Force update
                        if (fiber.stateNode && typeof fiber.stateNode.forceUpdate === 'function') {
                            fiber.stateNode.forceUpdate();
                        }
                        break;
                    }
                    fiber = fiber.return;
                }
            } else {
                console.log('⚠️ Could not find React instance on news ticker');
            }
        },

        // Create NPC news item object
        createNPCNewsItem(data) {
            const time = data.time || {};
            let attackString = '';
            let attackLink = '';
            let attackTarget = 0;

            // If there's no clear time set
            if (time.clear === 0 && time.attack === false) {
                attackString = time.reason ?
                    `NPC attacking will resume after ${time.reason}` :
                    'No attack currently set.';
            } else {
                // Build the attack order
                let attackOrder = '';
                const order = data.order || [];
                const npcs = data.npcs || {};

                order.forEach((npcId) => {
                    if (npcs[npcId]?.next) {
                        // If there's an attack happening right now
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

                    // Set attack target
                    if (time.attack === true) {
                        if (npcs[npcId].hosp_out <= time.current && attackTarget === 0) {
                            attackTarget = npcId;
                        }
                    }
                });

                // Default to first in order
                if (attackTarget === 0 && order.length > 0) {
                    attackTarget = order[0];
                }

                // Clean up attack order
                attackOrder = attackOrder.slice(0, -2) + '.';

                // Set message based on attack status
                if (time.attack === true) {
                    attackString = 'NPC attack is underway! Get in there and get some loot!';
                    attackLink = `loader.php?sid=attack&user2ID=${attackTarget}`;
                } else {
                    const timeStr = this.formatTime(time.clear);
                    attackString = `NPC attack set for ${timeStr}. Order is: ${attackOrder}`;
                    attackLink = `loader.php?sid=attack&user2ID=${attackTarget}`;
                }
            }

            // Return news item object
            return {
                ID: 0,
                headline: `<span style="color:${CONFIG.tickerColor}; font-weight: bold;" id="sidekick-npc-timer">${attackString}</span>`,
                countdown: time.clear > 0,
                endTime: time.clear,
                link: attackLink,
                isGlobal: true,
                type: 'generalMessage'
            };
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