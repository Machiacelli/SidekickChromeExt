/**
 * Sidekick Chrome Extension - NPC Attack Timer Module
 * Add NPC attack time to the news ticker using Loot Rangers for Torn
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    console.log("⚔️ Loading Sidekick NPC Attack Timer Module...");

    // Configuration settings
    const CONFIG = {
        color: "#8abeef", // Color for the news feed
        format: 24, // Time format: 12 = 12:00 AM format; 24 = 23:59 format
        local: false // Adjust timer to local time or not. true = local; false = UTC
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
        lzptData: null,
        newstickerObserver: null,
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
                    this.isEnabled = saved.isEnabled === true; // Explicitly check for true
                } else {
                    this.isEnabled = false; // Default disabled to match popup
                }
                console.log('⚔️ NPC Attack Timer settings loaded:', { enabled: this.isEnabled });
            } catch (error) {
                console.error('Failed to load NPC attack timer settings:', error);
                this.isEnabled = false; // Default disabled
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
            this.getAttackTimes().then(() => {
                this.setupFetchInterceptor();
                this.startNewstickerObserver();
            });
        },

        // Stop monitoring
        stopMonitoring() {
            this.restoreFetch();
            this.disconnectObserver();
            console.log('⏹️ NPC Attack Timer: Monitoring stopped');
        },

        // Get attack times from Loot Rangers API
        async getAttackTimes() {
            try {
                console.log('📡 Fetching NPC attack times from Loot Rangers...');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
                
                const response = await fetch('https://api.lzpt.io/loot', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    this.lzptData = await response.json();
                    console.log('✅ NPC attack times loaded successfully:', this.lzptData);
                    console.log('🔍 Data structure check - time object:', this.lzptData?.time);
                    console.log('🔍 Data structure check - order array:', this.lzptData?.order);
                    console.log('🔍 Data structure check - npcs object:', this.lzptData?.npcs);
                    return this.lzptData;
                } else {
                    console.debug('⚠️ Failed to fetch NPC attack times, status:', response.status);
                    this.lzptData = null;
                    return null;
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.debug('⏱️ NPC timer request timed out');
                } else {
                    console.debug('⚠️ Could not fetch NPC attack times:', error.message);
                }
                this.lzptData = null;
                return null;
            }
        },

        // Set up fetch interceptor to modify news ticker data
        setupFetchInterceptor() {
            const self = this;
            
            // Store original fetch if not already stored
            if (!this.originalFetch) {
                this.originalFetch = window.fetch;
            }
            
            console.log('🔧 Setting up fetch interceptor for news ticker...');
            
            // Override fetch to inject NPC data into news ticker
            window.fetch = async function(...args) {
                const [resource, config] = args;
                const response = await self.originalFetch.apply(this, args);
                
                // Only intercept news ticker requests
                if (!response.url || response.url.indexOf('?sid=newsTicker') === -1) {
                    return response;
                }
                
                console.log('🔄 Intercepted news ticker request:', response.url);
                console.log('🔍 Current LZPT data available:', !!self.lzptData);
                
                // Create modified JSON response
                const json = () => response.clone().json().then((data) => {
                    console.log('📰 Original news ticker data:', data);
                    data = { ...data };
                    
                    if (self.lzptData) {
                        const npcItem = self.createNPCNewsItem(self.lzptData);
                        console.log('🎯 Created NPC news item:', npcItem);
                        if (npcItem) {
                            data.headlines.unshift(npcItem);
                            console.log('✅ NPC item injected into headlines');
                        } else {
                            console.log('⚠️ NPC item creation failed');
                        }
                    } else {
                        console.log('⚠️ No LZPT data available for injection');
                    }
                    
                    return data;
                });

                response.json = json;
                response.text = async () => JSON.stringify(await json());
                
                return response;
            };
        },

        // Create NPC news item for ticker
        createNPCNewsItem(lzptData) {
            try {
                console.log('🔨 Creating NPC news item from data:', lzptData);
                
                let attackOrder = '';
                let attackString = '';
                let attackLink = '';
                let attackTarget = 0;

                // Check data structure
                if (!lzptData.time || !lzptData.order || !lzptData.npcs) {
                    console.error('❌ Invalid LZPT data structure:', {
                        hasTime: !!lzptData.time,
                        hasOrder: !!lzptData.order,
                        hasNpcs: !!lzptData.npcs
                    });
                    return null;
                }

                console.log('✅ Data structure valid, processing...');

                // If there's no clear time set
                if (lzptData.time.clear == 0 && lzptData.time.attack === false) {
                    attackString = lzptData.time.reason ? 
                        'NPC attacking will resume after ' + lzptData.time.reason : 
                        'No attack currently set.';
                    console.log('⏰ No attack set:', attackString);
                } else {
                    console.log('⚔️ Processing attack order...');
                    
                    // Build the string for the attack order
                    lzptData.order.forEach((value) => {
                        if (lzptData.npcs[value] && lzptData.npcs[value].next) {
                            // If there's an attack happening right now, cross out NPCs that are in the hospital
                            if (lzptData.time.attack === true) {
                                if (lzptData.npcs[value].hosp_out >= lzptData.time.current) {
                                    attackOrder += '<span style="text-decoration: line-through">' + 
                                                 lzptData.npcs[value].name + '</span>, ';
                                } else {
                                    attackOrder += lzptData.npcs[value].name + ', ';
                                }
                            } else {
                                attackOrder += lzptData.npcs[value].name + ', ';
                            }
                        }
                        
                        // Adjust the current target based on if an attack is going and who isn't in the hospital yet
                        if (lzptData.time.attack === true) {
                            if (lzptData.npcs[value] && lzptData.npcs[value].hosp_out <= lzptData.time.current) {
                                if (attackTarget == 0) {
                                    attackTarget = value;
                                }
                            }
                        }
                    });

                    // Check if target has been set, otherwise default to first in attack order
                    if (attackTarget == 0) {
                        attackTarget = lzptData.order[0];
                    }

                    // Clean up the attack order string
                    attackOrder = attackOrder.slice(0, -2) + '.';

                    // Check if an attack is currently happening and adjust the message accordingly
                    if (lzptData.time.attack === true) {
                        attackString = 'NPC attack is underway! Get in there and get some loot!';
                        attackLink = 'loader.php?sid=attack&user2ID=' + attackTarget;
                        console.log('⚡ Attack underway:', attackString);
                    } else {
                        attackString = 'NPC attack set for ' + this.utcformat(lzptData.time.clear) + 
                                     '. Order is: ' + attackOrder;
                        attackLink = 'loader.php?sid=attack&user2ID=' + attackTarget;
                        console.log('⏰ Attack scheduled:', attackString);
                    }
                }

                // Create the NPC news item
                const newsItem = {
                    ID: 0,
                    headline: '<span style="color:' + CONFIG.color + '; font-weight: bold;" id="icey-npctimer">' + 
                             attackString + '</span>',
                    countdown: true,
                    endTime: lzptData.time.clear,
                    link: attackLink,
                    isGlobal: true,
                    type: 'generalMessage'
                };

                console.log('✅ NPC news item created:', newsItem);
                return newsItem;
            } catch (error) {
                console.error('❌ Error creating NPC news item:', error);
                return null;
            }
        },

        // Start news ticker observer
        startNewstickerObserver() {
            const self = this;
            
            this.newstickerObserver = new MutationObserver((mutationsList, observer) => {
                const npcTimer = document.querySelector(".news-ticker-slide #icey-npctimer");
                if (npcTimer) {
                    // Once changes are observed, disconnect the observer to avoid infinite loop
                    self.newstickerObserver.disconnect();

                    // Modify the content
                    self.modifyContent().then(() => {
                        // Re-observe after modifications
                        self.startNewstickerObserver();
                    }).catch(error => {
                        console.error('Error updating content:', error);
                        self.startNewstickerObserver();
                    });
                }
            });

            this.waitForElement('.news-ticker-slider-wrapper').then((target) => {
                if (target && this.newstickerObserver) {
                    this.newstickerObserver.observe(target, {
                        childList: true,
                        attributes: false,
                        subtree: true,
                        characterData: false
                    });
                }
            });

            // Also start observing for initial injection
            this.waitForElement('#icey-npctimer').then(() => {
                this.startNewstickerObserver();
            });
        },

        // Modify news ticker content styling
        async modifyContent() {
            return new Promise((resolve) => {
                const ticker = document.querySelector('.news-ticker-countdown');
                if (ticker) {
                    ticker.style.color = CONFIG.color;
                    const wrap = ticker.parentNode.parentNode.parentNode;
                    const svg = wrap.children[0];
                    if (svg) {
                        svg.setAttribute('fill', CONFIG.color);
                        svg.setAttribute('viewBox', "0 0 24 24");
                        svg.setAttribute('height', '14');
                        svg.setAttribute('width', '14');
                        if (svg.children[0]) {
                            svg.children[0].setAttribute('d', 'M17.457 3L21 3.003l.002 3.523-5.467 5.466 2.828 2.829 1.415-1.414 1.414 1.414-2.474 2.475 2.828 2.829-1.414 1.414-2.829-2.829-2.475 2.475-1.414-1.414 1.414-1.415-2.829-2.828-2.828 2.828 1.415 1.415-1.414 1.414-2.475-2.475-2.829 2.829-1.414-1.414 2.829-2.83-2.475-2.474 1.414-1.414 1.414 1.413 2.827-2.828-5.46-5.46L3 3l3.546.003 5.453 5.454L17.457 3zm-7.58 10.406L7.05 16.234l.708.707 2.827-2.828-.707-.707zm9.124-8.405h-.717l-4.87 4.869.706.707 4.881-4.879v-.697zm-14 0v.7l11.241 11.241.707-.707L5.716 5.002l-.715-.001z');
                        }
                    }
                }
                resolve('Content updated');
            });
        },

        // Disconnect observer
        disconnectObserver() {
            if (this.newstickerObserver) {
                this.newstickerObserver.disconnect();
                this.newstickerObserver = null;
            }
        },

        // Restore original fetch
        restoreFetch() {
            if (this.originalFetch) {
                window.fetch = this.originalFetch;
                this.originalFetch = null;
            }
        },

        // Wait for element to exist
        waitForElement(selector) {
            return new Promise(resolve => {
                if (document.querySelector(selector)) {
                    return resolve(document.querySelector(selector));
                }

                const observer = new MutationObserver(() => {
                    if (document.querySelector(selector)) {
                        observer.disconnect();
                        resolve(document.querySelector(selector));
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        },

        // Format UTC time
        utcformat(d) {
            d = new Date(d * 1000);
            let tail, D, T;
            
            if (CONFIG.local) {
                tail = ' LT';
                D = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
                T = [d.getHours(), d.getMinutes(), d.getSeconds()];
            } else {
                tail = ' TCT';
                D = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
                T = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
            }
            
            if (CONFIG.format == 12) {
                /* 12 hour format */
                if (+T[0] > 12) {
                    T[0] -= 12;
                    tail = 'PM ' + tail;
                } else {
                    tail = 'AM ' + tail;
                }
            }
            
            let i = 3;
            while (i) {
                --i;
                if (D[i] < 10) D[i] = '0' + D[i];
                if (T[i] < 10) T[i] = '0' + T[i];
            }
            
            return T.join(':') + tail;
        },

        // Get current status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                isInitialized: this.isInitialized,
                hasData: !!this.lzptData,
                isMonitoring: !!this.newstickerObserver
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