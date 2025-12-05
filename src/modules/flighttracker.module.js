/**
 * Flight Tracker Module - Premium Enhanced Version
 * Tracks when players will return to Torn from abroad
 * Shows: "Waiting for departure..." during outbound, then countdown until return
 */

(function () {
    'use strict';

    const FlightTrackerModule = {
        isEnabled: true,
        isInitialized: false,
        trackedPlayers: new Map(),
        checkInterval: null,

        // Initialize the module
        async init() {
            console.log('✈️ Initializing Flight Tracker Module (Premium)...');

            try {
                // Check premium subscription
                if (!(await this.checkPremiumStatus())) {
                    console.log('✈️ FlightTracker: Premium subscription required');
                    return;
                }

                await this.waitForCore();
                await this.loadSettings();
                await this.loadTrackedPlayers();

                if (this.isEnabled) {
                    this.startTracking();
                }

                // Add profile display if on a profile page
                this.addProfileDisplay();

                // Listen for page changes
                this.setupPageListener();

                this.isInitialized = true;
                console.log('✅ Flight Tracker Module initialized successfully (Premium)');
            } catch (error) {
                console.error('❌ Flight Tracker initialization failed:', error);
            }
        },

        // Check premium status
        async checkPremiumStatus() {
            try {
                if (window.SidekickModules?.Premium?.isSubscribed) {
                    return await window.SidekickModules.Premium.isSubscribed();
                }
                return false;
            } catch (error) {
                console.warn('⚠️ Could not check premium status:', error);
                return false;
            }
        },

        // Wait for core module
        async waitForCore() {
            let attempts = 0;
            while (!window.SidekickModules?.Core && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            if (!window.SidekickModules?.Core) {
                throw new Error('Core module not available');
            }
        },

        // Load settings
        async loadSettings() {
            try {
                const settings = await window.SidekickModules.Core.ChromeStorage.get('flighttracker_settings');
                if (settings) {
                    this.isEnabled = settings.enabled !== false;
                }
                console.log('⚙️ Flight Tracker settings loaded - enabled:', this.isEnabled);
            } catch (error) {
                console.warn('⚠️ Failed to load Flight Tracker settings:', error);
            }
        },

        // Save settings
        async saveSettings() {
            try {
                const settings = { enabled: this.isEnabled };
                await window.SidekickModules.Core.ChromeStorage.set('flighttracker_settings', settings);
            } catch (error) {
                console.warn('⚠️ Failed to save Flight Tracker settings:', error);
            }
        },

        // Load tracked players
        async loadTrackedPlayers() {
            try {
                const data = await window.SidekickModules.Core.ChromeStorage.get('flighttracker_players');
                if (data) {
                    this.trackedPlayers = new Map(Object.entries(data));
                    console.log('📊 Loaded tracked players:', this.trackedPlayers.size);
                }
            } catch (error) {
                console.warn('⚠️ Failed to load tracked players:', error);
            }
        },

        // Save tracked players
        async saveTrackedPlayers() {
            try {
                const data = Object.fromEntries(this.trackedPlayers);
                await window.SidekickModules.Core.ChromeStorage.set('flighttracker_players', data);
            } catch (error) {
                console.warn('⚠️ Failed to save tracked players:', error);
            }
        },

        // Add enhanced profile display
        addProfileDisplay() {
            if (!window.location.href.includes('XID=')) {
                return;
            }

            const userIdMatch = window.location.href.match(/XID=(\d+)/);
            if (!userIdMatch) {
                return;
            }

            const playerId = userIdMatch[1];

            if (document.querySelector('.sidekick-flight-tracker-container')) {
                return;
            }

            try {
                const profileImg = document.querySelector('img[src*="profileimages"]');
                if (!profileImg) {
                    return;
                }

                let profileContainer = profileImg.closest('.basic-information, .profile-container, [class*="basic"], [class*="profile"]');
                if (!profileContainer) {
                    profileContainer = profileImg.parentNode;
                }

                // Create container
                const container = document.createElement('div');
                container.className = 'sidekick-flight-tracker-container';
                container.style.cssText = `
                    display: flex;
                    gap: 10px;
                    margin: 10px 0 5px 0;
                    align-items: flex-start;
                `;

                // Create track button
                const button = document.createElement('button');
                button.className = 'sidekick-flight-tracker-btn';
                button.innerHTML = '✈️ Track';
                button.style.cssText = `
                    background: #4CAF50;
                    border: none;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    flex-shrink: 0;
                `;

                // Create info panel
                const panel = document.createElement('div');
                panel.className = 'sidekick-flight-info-panel';
                panel.style.cssText = `
                    background: rgba(0,0,0,0.3);
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #fff;
                    flex: 1;
                    min-width: 200px;
                `;
                panel.innerHTML = '<div style="opacity: 0.6;">Loading travel info...</div>';

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleButtonClick(playerId, button, panel);
                });

                container.appendChild(button);
                container.appendChild(panel);
                profileContainer.appendChild(container);

                // Initial update
                this.updateProfileDisplay(playerId, button, panel);

            } catch (error) {
                console.error('❌ Error creating flight tracker display:', error);
            }
        },

        // Handle button click
        handleButtonClick(playerId, button, panel) {
            const player = this.trackedPlayers.get(playerId.toString());

            if (player) {
                if (confirm('Stop tracking this player?')) {
                    this.removePlayer(playerId);
                    this.updateProfileDisplay(playerId, button, panel);
                }
            } else {
                this.addPlayer(playerId);
                this.updateProfileDisplay(playerId, button, panel);
            }
        },

        // Add player to tracking
        addPlayer(playerId) {
            const playerName = this.getPlayerName();

            const player = {
                id: playerId,
                name: playerName,
                lastStatus: 'Unknown',
                lastKnownCountry: 'unknown',
                lastChecked: null,
                addedAt: Date.now()
            };

            this.trackedPlayers.set(playerId.toString(), player);
            this.saveTrackedPlayers();

            if (!this.checkInterval) {
                this.startTracking();
            }
        },

        // Remove player from tracking
        removePlayer(playerId) {
            const player = this.trackedPlayers.get(playerId.toString());
            if (player) {
                this.trackedPlayers.delete(playerId.toString());
                this.saveTrackedPlayers();
            }
        },

        // Update profile display with travel info
        async updateProfileDisplay(playerId, button, panel) {
            const isTracking = this.trackedPlayers.has(playerId.toString());

            // Update button
            if (isTracking) {
                button.innerHTML = '✅ Tracking';
                button.style.background = '#2196F3';
            } else {
                button.innerHTML = '✈️ Track';
                button.style.background = '#4CAF50';
            }

            // Fetch and display travel info
            try {
                const apiKey = await this.getApiKey();
                if (!apiKey) {
                    panel.innerHTML = '<div style="opacity: 0.6;">API key required</div>';
                    return;
                }

                const travelInfo = await this.fetchTravelInfo(playerId, apiKey);

                if (!travelInfo) {
                    panel.innerHTML = '<div style="opacity: 0.6;">No travel data available</div>';
                    return;
                }

                // Render travel status
                this.renderTravelInfo(panel, travelInfo);

            } catch (error) {
                console.debug('⚠️ Error updating profile display:', error);
                panel.innerHTML = '<div style="opacity: 0.6;">Error loading travel info</div>';
            }
        },

        // Fetch travel info from API
        async fetchTravelInfo(playerId, apiKey) {
            try {
                const response = await fetch(`https://api.torn.com/user/${playerId}?selections=travel&key=${apiKey}`);

                if (!response.ok) return null;

                const data = await response.json();
                if (data.error) return null;

                return data.travel || null;

            } catch (error) {
                console.debug('⚠️ Error fetching travel info:', error);
                return null;
            }
        },

        // Render travel info panel
        renderTravelInfo(panel, travel) {
            // Not traveling
            if (!travel || !travel.destination || travel.destination === 'Torn') {
                panel.innerHTML = `<div style="opacity: 0.6;">🏠 Currently in Torn</div>`;
                return;
            }

            const destination = travel.destination;
            const timeLeft = Number(travel.time_left || 0);
            const now = Date.now() / 1000;

            // Traveling TO destination (outbound)
            if (timeLeft > 0 && travel.departed && now < travel.timestamp) {
                panel.innerHTML = `
                    <div style="margin-bottom: 4px; font-weight: bold; color: #FF9800;">
                        ✈️ Traveling to ${destination}
                    </div>
                    <div style="opacity: 0.7; font-size: 10px;">
                        Waiting for departure...
                    </div>
                `;
                return;
            }

            // In foreign country - show return countdown
            panel.innerHTML = `
                <div style="margin-bottom: 4px;">
                    <span style="font-weight: bold; color: #2196F3;">📍 ${destination}</span>
                </div>
                <div style="font-size: 10px; opacity: 0.8;">
                    ${this.formatTimeRemaining(timeLeft)} until return
                </div>
            `;

            // Update every second for active travelers
            if (timeLeft > 0) {
                setTimeout(() => {
                    const updatedPanel = document.querySelector('.sidekick-flight-info-panel');
                    if (updatedPanel) {
                        const pid = window.location.href.match(/XID=(\d+)/)?.[1];
                        if (pid) {
                            this.updateProfileDisplay(pid,
                                document.querySelector('.sidekick-flight-tracker-btn'),
                                updatedPanel
                            );
                        }
                    }
                }, 1000);
            }
        },

        // Format time remaining
        formatTimeRemaining(seconds) {
            if (seconds <= 0) return 'Returning soon';

            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
                return `⏱️ ${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                return `⏱️ ${minutes}m ${secs}s`;
            } else {
                return `⏱️ ${secs}s`;
            }
        },

        // Get player name from page
        getPlayerName() {
            const nameElement = document.querySelector('.basic-information h4, .profile-container h4, h4');
            return nameElement ? nameElement.textContent.trim() : 'Unknown Player';
        },

        // Start tracking
        startTracking() {
            if (this.checkInterval) return;

            this.checkInterval = setInterval(() => {
                this.checkAllPlayers();
            }, 30000);

            this.checkAllPlayers();
        },

        // Stop tracking
        stopTracking() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        },

        // Check all tracked players
        async checkAllPlayers() {
            if (this.trackedPlayers.size === 0) return;

            for (const [playerId, player] of this.trackedPlayers) {
                await this.checkPlayer(playerId, player);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        },

        // Check individual player
        async checkPlayer(playerId, player) {
            try {
                const apiKey = await this.getApiKey();
                if (!apiKey) return;

                const response = await fetch(`https://api.torn.com/user/${playerId}?selections=basic,travel&key=${apiKey}`);

                if (!response.ok) return;

                const data = await response.json();
                if (data.error) return;

                player.lastStatus = data.status.description;
                player.lastKnownCountry = data.travel?.destination || 'Torn';
                player.lastChecked = Date.now();

                this.trackedPlayers.set(playerId, player);
                this.saveTrackedPlayers();

                // Update display if on this player's profile
                if (window.location.href.includes('XID=' + playerId)) {
                    const button = document.querySelector('.sidekick-flight-tracker-btn');
                    const panel = document.querySelector('.sidekick-flight-info-panel');
                    if (button && panel) {
                        this.updateProfileDisplay(playerId, button, panel);
                    }
                }

            } catch (error) {
                console.debug('⚠️ Error checking player:', error);
            }
        },

        // Get API key
        async getApiKey() {
            try {
                if (window.SidekickModules?.Settings?.getApiKey) {
                    return await window.SidekickModules.Settings.getApiKey();
                }

                if (window.SidekickModules?.Core?.ChromeStorage) {
                    return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                }

                return null;
            } catch (error) {
                console.debug('🗝 Could not retrieve API key:', error);
                return null;
            }
        },

        // Setup page listener
        setupPageListener() {
            setInterval(() => {
                const display = document.querySelector('.sidekick-flight-tracker-container');
                if (!display && window.location.href.includes('XID=')) {
                    this.addProfileDisplay();
                }
            }, 2000);
        },

        // Get status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                isInitialized: this.isInit

ialized,
                trackedPlayersCount: this.trackedPlayers.size,
                isTracking: !!this.checkInterval
            };
        },

        // Enable tracking
        enable() {
            this.isEnabled = true;
            this.saveSettings();
            if (this.isInitialized) {
                this.startTracking();
            }
        },

        // Disable tracking
        disable() {
            this.isEnabled = false;
            this.stopTracking();
            this.saveSettings();
        }
    };

    // Initialize global namespace
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Flight Tracker module
    window.SidekickModules.FlightTracker = FlightTrackerModule;
    console.log('✅ Flight Tracker Module (Premium) loaded and ready');

})();