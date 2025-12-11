/**
 * Sidekick Chrome Extension - NPC Attack Timer Module
 * Display upcoming NPC attacks in Torn's news ticker
 * Based on Loot Rangers API
 * Version: 2.0.0
 * Author: Machiacelli / Robin
 */

(function () {
    'use strict';

    console.log("⚔️ Loading Sidekick NPC Attack Timer Module...");

    // Configuration settings
    const CONFIG = {
        tickerColor: "#8abeef",  // Color for NPC message
        timeFormat24h: true      // true = 24h, false = 12h
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
        originalFetch: null,

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
                    this.isEnabled = false; // Default disabled
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

        // Toggle enabled state
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

            return this.isEnabled;
        },

        // Start monitoring for news ticker
        startMonitoring() {
            console.log('🎯 NPC Attack Timer: Starting monitoring...');
            this.stopMonitoring(); // Clean up any existing monitoring
            this.fetchNpcSchedule().then(() => {
                this.setupFetchInterceptor();
            });
        },

        // Stop monitoring
        stopMonitoring() {
            this.restoreFetch();
            console.log('⏹️ NPC Attack Timer: Monitoring stopped');
        },

        // Fetch NPC schedule from Loot Rangers
        async fetchNpcSchedule() {
            try {
                console.log('📡 Fetching NPC schedule from Loot Rangers...');

                const response = await fetch('https://api.lzpt.io/loot', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                this.npcData = await response.json();
                console.log('✅ NPC schedule loaded:', this.npcData);
                return this.npcData;
            } catch (error) {
                console.error('Failed to fetch NPC schedule:', error);
                this.npcData = null;
                return null;
            }
        },

        // Format UNIX timestamp into readable string
        formatTime(unixSeconds) {
            const d = new Date(unixSeconds * 1000);
            let hours = CONFIG.timeFormat24h ? d.getUTCHours() : (d.getUTCHours() % 12 || 12);
            let minutes = d.getUTCMinutes().toString().padStart(2, '0');
            let suffix = CONFIG.timeFormat24h ? ' TCT' : (d.getUTCHours() >= 12 ? ' PM' : ' AM');
            return `${hours}:${minutes}${suffix}`;
        },

        // Set up fetch interceptor to inject NPC data into news ticker
        setupFetchInterceptor() {
            const self = this;

            // Store original fetch if not already stored
            if (!this.originalFetch) {
                this.originalFetch = window.fetch;
            }

            console.log('🔧 Setting up fetch interceptor for news ticker...');

            // Override fetch to inject NPC data into news ticker
            window.fetch = async function (...args) {
                const response = await self.originalFetch.apply(this, args);

                // Log all Torn API requests to find news ticker
                if (response.url && response.url.includes('torn.com')) {
                    console.log('🌐 Fetch URL:', response.url);
                }

                // Only intercept news ticker requests
                if (!response.url || response.url.indexOf('?sid=newsTicker') === -1) {
                    return response;
                }

                console.log('🔄 Intercepted news ticker request');

                // Clone and modify the response
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();

                // Inject NPC data if available
                if (self.npcData) {
                    const npcItem = self.createNPCNewsItem(self.npcData);
                    if (npcItem) {
                        data.headlines.unshift(npcItem);
                        console.log('✅ NPC item injected into news ticker pool');
                    }
                }

                // Return modified response
                return new Response(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            };
        },

        // Create NPC news item for ticker
        createNPCNewsItem(npcData) {
            try {
                if (!npcData || !npcData.time || !npcData.order || !npcData.npcs) {
                    console.log('⚠️ Invalid NPC data structure');
                    return null;
                }

                let message = '';
                if (npcData.time.attack) {
                    // If attack is live
                    const targetId = npcData.order[0];
                    const targetName = npcData.npcs[targetId]?.name || 'Unknown';
                    message = `NPC attack is ongoing! Target: ${targetName}`;
                } else {
                    // Next attack
                    const nextTime = this.formatTime(npcData.time.clear);
                    const orderNames = npcData.order.map(id => npcData.npcs[id]?.name || 'Unknown').join(', ');
                    message = `Next NPC attack at ${nextTime}. Order: ${orderNames}.`;
                }

                // Create news ticker item
                return {
                    ID: 0,
                    headline: `<span style="color:${CONFIG.tickerColor}; font-weight: bold;">${message}</span>`,
                    countdown: !npcData.time.attack, // Only show countdown if not attacking
                    endTime: npcData.time.clear,
                    link: '',
                    isGlobal: true,
                    type: 'generalMessage'
                };
            } catch (error) {
                console.error('❌ Error creating NPC news item:', error);
                return null;
            }
        },

        // Restore original fetch
        restoreFetch() {
            if (this.originalFetch) {
                window.fetch = this.originalFetch;
                this.originalFetch = null;
                console.log('🔧 Fetch interceptor removed');
            }
        },

        // Get current status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                isInitialized: this.isInitialized,
                hasData: !!this.npcData,
                isIntercepting: !!this.originalFetch
            };
        }
    };

    // Initialize global namespace if it doesn't exist
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export NPC Attack Timer module to global namespace
    window.SidekickModules.NPCAttackTimer = NPCAttackTimerModule;
    console.log("✅ NPC Attack Timer Module loaded and ready");

})();