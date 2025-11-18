/**
 * Flight Tracker Module - Simple Version
 * Tracks player travel times and status
 */

(function() {
    'use strict';

    const FlightTrackerModule = {
        isEnabled: true,
        isInitialized: false,
        trackedPlayers: new Map(),
        checkInterval: null,

        // Initialize the module
        async init() {
            console.log('✈️ Initializing Flight Tracker Module...');

            try {
                await this.waitForCore();
                await this.loadSettings();
                await this.loadTrackedPlayers();
                
                if (this.isEnabled) {
                    this.startTracking();
                }
                
                // Add profile button if on a profile page
                this.addProfileButton();
                
                // Listen for page changes
                this.setupPageListener();
                
                this.isInitialized = true;
                console.log('✅ Flight Tracker Module initialized successfully');
            } catch (error) {
                console.error('❌ Flight Tracker initialization failed:', error);
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
                console.log('💾 Flight Tracker settings saved');
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
                console.log('💾 Saved tracked players:', this.trackedPlayers.size);
            } catch (error) {
                console.warn('⚠️ Failed to save tracked players:', error);
            }
        },

        // Add profile button
        addProfileButton() {
            console.log('🔍 Flight Tracker: Checking for profile page...');
            
            // Check if we're on a profile page
            if (!window.location.href.includes('XID=')) {
                console.log('❌ Not a profile page');
                return;
            }
            
            // Get player ID
            const userIdMatch = window.location.href.match(/XID=(\d+)/);
            if (!userIdMatch) {
                console.log('❌ No player ID found');
                return;
            }
            
            const playerId = userIdMatch[1];
            console.log('👤 Found profile ID:', playerId);
            
            // Check if button already exists
            if (document.querySelector('.sidekick-flight-tracker-btn')) {
                console.log('✅ Button already exists');
                return;
            }
            
            try {
                // Find the profile image first
                const profileImg = document.querySelector('img[src*="profileimages"]');
                if (!profileImg) {
                    console.log('❌ No profile image found');
                    return;
                }
                
                // Find the container that holds the profile image - this is where we want to add the button
                let profileContainer = profileImg.closest('.basic-information, .profile-container, [class*="basic"], [class*="profile"]');
                
                // If no specific container found, use the direct parent of the image
                if (!profileContainer) {
                    profileContainer = profileImg.parentNode;
                }
                
                console.log('✅ Found profile container');
                
                // Create button
                const button = document.createElement('button');
                button.className = 'sidekick-flight-tracker-btn';
                button.innerHTML = '✈️ Track Flights';
                
                // Style button to appear naturally below profile info
                button.style.background = '#4CAF50';
                button.style.border = 'none';
                button.style.outline = 'none';
                button.style.boxShadow = 'none';
                button.style.color = 'white';
                button.style.padding = '6px 10px';
                button.style.margin = '10px 0 5px 0';
                button.style.borderRadius = '4px';
                button.style.cursor = 'pointer';
                button.style.fontSize = '11px';
                button.style.display = 'block';
                button.style.fontWeight = '600';
                button.style.width = 'fit-content';
                button.style.maxWidth = '120px';
                button.style.textAlign = 'center';
                button.style.boxSizing = 'border-box';
                button.style.clear = 'both';
                
                // Force remove any inherited borders or outlines
                button.style.setProperty('border', 'none', 'important');
                button.style.setProperty('outline', 'none', 'important');
                button.style.setProperty('box-shadow', 'none', 'important');
                
                // Handle focus states without borders
                button.addEventListener('focus', () => {
                    button.style.setProperty('outline', 'none', 'important');
                    button.style.setProperty('border', 'none', 'important');
                });
                
                button.addEventListener('blur', () => {
                    button.style.setProperty('outline', 'none', 'important');
                    button.style.setProperty('border', 'none', 'important');
                });
                
                // Add click handler
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleButtonClick(playerId, button);
                });
                
                // Simply append to the profile container so it appears at the bottom
                profileContainer.appendChild(button);
                
                console.log('✅ Flight tracker button created');
                
                // Update button status
                this.updateButtonStatus(playerId, button);
                
            } catch (error) {
                console.error('❌ Error creating button:', error);
            }
        },

        // Handle button click
        handleButtonClick(playerId, button) {
            console.log('🖱️ Flight tracker button clicked for player:', playerId);
            
            const player = this.trackedPlayers.get(playerId.toString());
            
            if (player) {
                // Stop tracking
                if (confirm('Stop tracking this player?')) {
                    this.removePlayer(playerId);
                    this.updateButtonStatus(playerId, button);
                }
            } else {
                // Start tracking
                this.addPlayer(playerId);
                this.updateButtonStatus(playerId, button);
            }
        },

        // Add player to tracking
        addPlayer(playerId) {
            const playerName = this.getPlayerName();
            
            const player = {
                id: playerId,
                name: playerName,
                planeType: 'commercial',
                lastStatus: 'Unknown',
                lastKnownCountry: 'unknown',
                lastChecked: null,
                addedAt: Date.now()
            };
            
            this.trackedPlayers.set(playerId.toString(), player);
            this.saveTrackedPlayers();
            
            console.log('✈️ Added player to tracking:', playerName);
            
            // Start tracking if not already started
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
                console.log('❌ Removed player from tracking:', player.name);
            }
        },

        // Update button status
        updateButtonStatus(playerId, button) {
            const player = this.trackedPlayers.get(playerId.toString());
            
            if (player) {
                // Currently tracking
                let status = 'Unknown';
                let color = '#9E9E9E';
                
                if (player.lastStatus === 'Traveling') {
                    status = '✈️ Traveling';
                    color = '#FF9800';
                } else if (player.lastKnownCountry === 'torn') {
                    status = '🏠 In Torn';
                    color = '#4CAF50';
                } else if (player.lastKnownCountry && player.lastKnownCountry !== 'unknown') {
                    status = '🌍 In ' + player.lastKnownCountry;
                    color = '#2196F3';
                }
                
                button.innerHTML = status;
                button.style.background = color;
                
            } else {
                // Not tracking
                button.innerHTML = '✈️ Track Flights';
                button.style.background = '#4CAF50';
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
            
            console.log('✈️ Starting flight tracking...');
            
            // Check every 30 seconds
            this.checkInterval = setInterval(() => {
                this.checkAllPlayers();
            }, 30000);
            
            // Initial check
            this.checkAllPlayers();
        },

        // Stop tracking
        stopTracking() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
                console.log('⏹️ Flight tracking stopped');
            }
        },

        // Check all tracked players
        async checkAllPlayers() {
            if (this.trackedPlayers.size === 0) return;
            
            console.log('🔍 Checking tracked players...');
            
            for (const [playerId, player] of this.trackedPlayers) {
                await this.checkPlayer(playerId, player);
                // Small delay between checks
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
                
                // Update player data
                const oldStatus = player.lastStatus;
                const oldCountry = player.lastKnownCountry;
                
                player.lastStatus = data.status.description;
                player.lastKnownCountry = data.travel?.destination || 'torn';
                player.lastChecked = Date.now();
                
                this.trackedPlayers.set(playerId, player);
                this.saveTrackedPlayers();
                
                // Update button if on this player's profile
                if (window.location.href.includes('XID=' + playerId)) {
                    const button = document.querySelector('.sidekick-flight-tracker-btn');
                    if (button) {
                        this.updateButtonStatus(playerId, button);
                    }
                }
                
                console.log('📊 Updated player data:', player.name, player.lastStatus, player.lastKnownCountry);
                
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
            // Check for new pages every 2 seconds
            setInterval(() => {
                const button = document.querySelector('.sidekick-flight-tracker-btn');
                if (!button && window.location.href.includes('XID=')) {
                    this.addProfileButton();
                }
            }, 2000);
        },

        // Get status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                isInitialized: this.isInitialized,
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
            console.log('✅ Flight Tracker enabled');
        },

        // Disable tracking
        disable() {
            this.isEnabled = false;
            this.stopTracking();
            this.saveSettings();
            console.log('⏸️ Flight Tracker disabled');
        }
    };

    // Initialize global namespace
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    // Export Flight Tracker module
    window.SidekickModules.FlightTracker = FlightTrackerModule;
    console.log('✅ Flight Tracker Module loaded and ready');

})();