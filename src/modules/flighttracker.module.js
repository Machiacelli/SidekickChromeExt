/**
 * Flight Tracker Module - Complete Rebuild
 * Monitors player travel status via area selection
 * Shows countdown timers for when players return to Torn
 */

(function () {
    'use strict';

    const FlightTrackerModule = {
        isEnabled: true,
        isInitialized: false,
        trackedPlayers: new Map(),
        updateInterval: null,
        travelTimesLoaded: false,

        // Initialize the module
        async init() {
            console.log('✈️ Initializing Flight Tracker Module...');

            try {
                await this.waitForCore();
                await this.loadTravelTimes();
                await this.loadSettings();
                await this.loadTrackedPlayers();

                if (this.isEnabled) {
                    this.startMonitoring();
                }

                // Add track button if on profile page
                this.addTrackButton();

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

        // Load travel times data
        async loadTravelTimes() {
            // The travel-times.js file should be loaded before this module
            if (window.TravelTimesData) {
                this.travelTimesLoaded = true;
                console.log('✅ Travel times data loaded');
            } else {
                console.warn('⚠️ Travel times data not available');
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
                await window.Sidekick

                Modules.Core.ChromeStorage.set('flighttracker_settings', settings);
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

        // Add track button to profile page
        addTrackButton() {
            if (!window.location.href.includes('XID=')) {
                return;
            }

            const userIdMatch = window.location.href.match(/XID=(\d+)/);
            if (!userIdMatch) {
                return;
            }

            const playerId = userIdMatch[1];

            // Don't add if already exists
            if (document.querySelector('.sidekick-flight-tracker-btn')) {
                return;
            }

            try {
                // Find the status container (the area with the travel image)
                const statusContainer = this.findStatusContainer();
                if (!statusContainer) {
                    console.debug('Could not find status container');
                    return;
                }

                // Find a good container to insert our button
                let targetContainer = statusContainer?.parentElement;

                // Create button container with absolute positioning
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'sidekick-flight-tracker-container';
                buttonContainer.id = `flight-tracker-btn-${playerId}`;
                buttonContainer.style.cssText = `
                    position: absolute;
                    left: 984px;
                    top: 462px;
                    width: 373px;
                    height: 40px;
                    z-index: 9999;
                `;

                // Create track button
                const button = document.createElement('button');
                button.className = 'sidekick-flight-tracker-btn';
                button.innerHTML = '✈️ Track Player';
                button.style.cssText = `
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border: none;
                    color: white;
                    padding: 10px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    display: block;
                    width: 100%;
                `;

                button.addEventListener('mouseenter', () => {
                    button.style.transform = 'scale(1.05)';
                    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                });

                button.addEventListener('mouseleave', () => {
                    button.style.transform = 'scale(1)';
                    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                });

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleTrackButtonClick(playerId, statusContainer);
                });

                buttonContainer.appendChild(button);

                // Append to body for fixed positioning
                document.body.appendChild(buttonContainer);

                // Create info panel
                this.createInfoPanel(playerId);

            } catch (error) {
                console.error('❌ Error creating flight tracker button:', error);
            }
        },

        // Find the status container with travel image
        findStatusContainer() {
            // Look for elements containing travel-related images or text
            const selectors = [
                'div[class*="travel"]',
                'div[class*="status"]',
                'img[src*="travel"]',
                'div:has(img[src*="airplane"])',
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element;
                }
            }

            // Fallback: look for any div with travel text
            const allDivs = document.querySelectorAll('div');
            for (const div of allDivs) {
                const text = div.textContent;
                if (text && (text.includes('Traveling to') || text.includes('Returning to Torn') || text.includes('In '))) {
                    return div;
                }
            }

            return null;
        },

        // Handle track button click
        handleTrackButtonClick(playerId, statusContainer) {
            const player = this.trackedPlayers.get(playerId.toString());

            if (player) {
                // Already tracking - ask to remove
                if (confirm('Stop tracking this player?')) {
                    this.removePlayer(playerId);
                    // Update UI immediately
                    const button = document.querySelector('.sidekick-flight-tracker-btn');
                    if (button) {
                        button.innerHTML = '✈️ Track Player';
                        button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                    }
                }
            } else {
                // Start tracking with area selection
                this.startAreaSelection(playerId, statusContainer);
            }
        },

        // Start area selection mode
        startAreaSelection(playerId, statusContainer) {
            console.log('Starting area selection for player:', playerId);

            // Create overlay for area selection
            const overlay = document.createElement('div');
            overlay.id = 'flight-tracker-selection-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 99999;
                cursor: crosshair;
            `;

            const instructions = document.createElement('div');
            instructions.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px 30px;
                border-radius: 8px;
                color: #333;
                font-size: 14px;
                text-align: center;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            `;
            instructions.innerHTML = `
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">Select Area to Monitor</div>
                <div>Drag to select the status box area</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">Press ESC to cancel</div>
            `;

            overlay.appendChild(instructions);
            document.body.appendChild(overlay);

            let selectionRect = null;
            let startX, startY;
            let isSelecting = false;

            overlay.addEventListener('mousedown', (e) => {
                if (e.target === overlay || e.target.parentElement === overlay) {
                    isSelecting = true;
                    startX = e.clientX;
                    startY = e.clientY;

                    instructions.style.display = 'none';

                    selectionRect = document.createElement('div');
                    selectionRect.style.cssText = `
                        position: fixed;
                        border: 2px dashed #4CAF50;
                        background: rgba(76, 175, 80, 0.2);
                        pointer-events: none;
                        z-index: 100000;
                    `;
                    overlay.appendChild(selectionRect);
                }
            });

            overlay.addEventListener('mousemove', (e) => {
                if (!isSelecting || !selectionRect) return;

                const currentX = e.clientX;
                const currentY = e.clientY;

                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);

                selectionRect.style.left = left + 'px';
                selectionRect.style.top = top + 'px';
                selectionRect.style.width = width + 'px';
                selectionRect.style.height = height + 'px';
            });

            overlay.addEventListener('mouseup', (e) => {
                if (!isSelecting) return;

                const endX = e.clientX;
                const endY = e.clientY;

                const selectedArea = {
                    x: Math.min(startX, endX),
                    y: Math.min(startY, endY),
                    width: Math.abs(endX - startX),
                    height: Math.abs(endY - startY)
                };

                overlay.remove();
                this.completeAreaSelection(playerId, selectedArea);
            });

            // ESC to cancel
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        },

        // Complete area selection and start tracking
        async completeAreaSelection(playerId, selectedArea) {
            const playerName = this.getPlayerName();

            const player = {
                id: playerId,
                name: playerName,
                selectedArea: selectedArea,
                currentStatus: 'Monitoring...',
                currentCountry: null,
                ticketType: null,
                departureTime: null,
                landingTime: null,
                detectedPlaneType: null,
                addedAt: Date.now()
            };

            this.trackedPlayers.set(playerId.toString(), player);
            await this.saveTrackedPlayers();

            console.log('✅ Started tracking player:', player);

            // Start monitoring immediately
            this.updatePlayerStatus(playerId);

            // Update UI
            this.updateInfoPanel(playerId);
        },

        // Create info panel
        createInfoPanel(playerId) {
            // Remove existing panel
            const existing = document.querySelector('.sidekick-flight-info-panel');
            if (existing) {
                existing.remove();
            }

            const panel = document.createElement('div');
            panel.className = 'sidekick-flight-info-panel';
            panel.dataset.playerId = playerId; // Store which player this panel is for
            panel.style.cssText = `
                position: absolute;
                left: 981px;
                top: 507px;
                width: 373px;
                height: 40px;
                background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(30,30,30,0.9));
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 11px;
                color: #fff;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                z-index: 9999;
                overflow: hidden;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            // Append to body for absolute positioning
            document.body.appendChild(panel);

            this.updateInfoPanel(playerId);
        },

        // Update info panel with current status
        updateInfoPanel(playerId) {
            const panel = document.querySelector('.sidekick-flight-info-panel');
            if (!panel) return;

            // Only update if this panel belongs to the current player
            if (panel.dataset.playerId !== playerId.toString()) {
                return;
            }

            const player = this.trackedPlayers.get(playerId.toString());

            if (!player) {
                panel.innerHTML = `<span style="opacity: 0.6; font-size: 10px;">Not tracking</span>`;
                return;
            }

            // Build compact single-line status
            let statusHTML = '';

            if (player.currentCountry) {
                const statusText = player.currentStatus === 'returning' ? '←' : '→';

                // Country and direction
                statusHTML += `<span style="font-size: 11px;">${statusText} <b>${player.currentCountry}</b></span>`;

                // Plane type
                if (player.detectedPlaneType) {
                    const planeIcon = player.detectedPlaneType === 'airstrip' ? '🛩️' : '✈️';
                    statusHTML += `<span style="font-size: 10px;">${planeIcon}</span>`;
                }

                // WLT if applicable
                if (player.hasWLTBenefit && player.currentStatus === 'returning') {
                    statusHTML += `<span style="color: #FFD700; font-size: 10px;">⚡WLT</span>`;
                }

                // Countdown timer
                if (player.landingTime && player.currentStatus === 'returning') {
                    const timeLeft = Math.max(0, Math.floor((player.landingTime - Date.now()) / 1000));
                    const timeStr = window.TravelTimesData?.formatTravelTime(timeLeft) || `${timeLeft}s`;

                    let timerColor = '#4CAF50';
                    let timerIcon = '⏱️';
                    if (timeLeft <= 60) {
                        timerColor = '#f44336';
                        timerIcon = '🚨';
                    } else if (timeLeft <= 300) {
                        timerColor = '#FF9800';
                        timerIcon = '⚠️';
                    }

                    statusHTML += `<span style="font-size: 12px; font-weight: bold; color: ${timerColor}; margin-left: auto;">${timerIcon} ${timeStr}</span>`;

                    // Flash animation for imminent landing
                    if (timeLeft <= 60 && timeLeft > 0) {
                        panel.style.animation = 'pulse 1s ease-in-out infinite';
                        panel.style.borderColor = '#f44336';
                    } else {
                        panel.style.animation = 'none';
                        panel.style.borderColor = 'rgba(255,255,255,0.1)';
                    }
                }
            } else {
                statusHTML += `<span style="opacity: 0.7; font-size: 10px;">${player.currentStatus}</span>`;
            }

            panel.innerHTML = statusHTML;
        },

        // Update player status by monitoring selected area
        async updatePlayerStatus(playerId) {
            const player = this.trackedPlayers.get(playerId.toString());
            if (!player) return;
        },

        // Get text from selected area
        getTextFromArea(area) {
            const elements = document.elementsFromPoint(
                area.x + area.width / 2,
                area.y + area.height / 2
            );

            for (const element of elements) {
                const text = element.textContent?.trim();
                if (text && (text.includes('Traveling') || text.includes('Returning') || text.includes('In '))) {
                    return text;
                }
            }

            return '';
        },

        // Parse status text to extract country and status
        parseStatusText(text) {
            const result = {
                country: null,
                status: 'unknown'
            };

            if (!text) return result;

            // "Traveling to [country]"
            const travelingMatch = text.match(/Traveling to (.+)/i);
            if (travelingMatch) {
                result.country = travelingMatch[1].trim();
                result.status = 'traveling';
                return result;
            }

            // "Returning to Torn from [country]"
            const returningMatch = text.match(/Returning to Torn from (.+)/i);
            if (returningMatch) {
                result.country = returningMatch[1].trim();
                result.status = 'returning';
                return result;
            }

            // "In [country]"
            const inMatch = text.match(/In (.+)/i);
            if (inMatch) {
                result.country = inMatch[1].trim();
                result.status = 'abroad';
                return result;
            }

            return result;
        },

        // Detect plane type from image in selected area
        async detectPlaneType(area) {
            console.log('🔍 Detecting plane type from selected area:', area);

            // Search for elements with travel-related classes
            const allTravelElements = document.querySelectorAll('[class*="travel"], [class*="flying"], [class*="abroad"]');
            console.log(`📍 Found ${allTravelElements.length} travel-related elements on page`);

            // Check each travel element to see if it's in our selected area
            for (const element of allTravelElements) {
                const rect = element.getBoundingClientRect();

                // Check if this element overlaps with our selected area
                const overlaps = !(
                    rect.right < area.x ||
                    rect.left > area.x + area.width ||
                    rect.bottom < area.y ||
                    rect.top > area.y + area.height
                );

                if (overlaps) {
                    const className = element.className?.toString().toLowerCase() || '';
                    const baseVal = element.className?.baseVal?.toLowerCase() || '';
                    const fullClass = className || baseVal;

                    console.log('✅ Found travel element in selected area!');
                    console.log('   Class:', fullClass);
                    console.log('   Tag:', element.tagName);

                    // Check for airstrip
                    if (fullClass.includes('airstrip')) {
                        console.log('🛩️ Detected: Airstrip plane (found "airstrip" in class)');
                        return 'airstrip';
                    }

                    // Found travel element without airstrip = commercial
                    if (fullClass.includes('travel') || fullClass.includes('flying')) {
                        console.log('✈️ Detected: Commercial plane (travel element without airstrip)');
                        return 'commercial';
                    }
                }
            }

            console.log('❌ No travel element detected in selected area');
            console.log('💡 Tip: Make sure to select the box that contains "Traveling to..." text');
            return null;
        },

        // Start countdown for player return
        async startCountdown(player) {
            if (!this.travelTimesLoaded || !window.TravelTimesData) {
                console.warn('Travel times data not loaded');
                return;
            }

            // Check for company perks (10-star Lingerie Store = WLT benefit)
            const hasWLTBenefit = await this.checkCompanyPerks(player.id);

            let ticketType = player.detectedPlaneType === 'airstrip' ? 'airstrip' : 'standard';

            // Apply WLT benefit if player works at 10-star Lingerie Store
            if (hasWLTBenefit) {
                ticketType = 'wltBenefit';
                player.hasWLTBenefit = true;
            }

            const travelTime = window.TravelTimesData.getTravelTime(player.currentCountry, ticketType);

            if (!travelTime) {
                console.warn('Could not get travel time for country:', player.currentCountry);
                return;
            }

            player.departureTime = Date.now();
            player.landingTime = Date.now() + (travelTime * 1000);
            player.ticketType = ticketType;

            console.log(`Started countdown for ${player.name} - Landing in ${travelTime}s (WLT: ${hasWLTBenefit})`);
        },

        // Check if player works at 10-star Lingerie Store (grants WLT benefit)
        async checkCompanyPerks(playerId) {
            try {
                const apiKey = await this.getApiKey();
                if (!apiKey) {
                    console.debug('No API key available for company check');
                    return false;
                }

                // Fetch player's job information from basic selections
                const response = await fetch(`https://api.torn.com/user/${playerId}?selections=profile&key=${apiKey}`);

                if (!response.ok) {
                    console.debug('Failed to fetch player profile');
                    return false;
                }

                const data = await response.json();

                if (data.error) {
                    console.debug('API error:', data.error);
                    return false;
                }

                // Check if player has a job
                if (!data.job || !data.job.company_id) {
                    return false;
                }

                const companyId = data.job.company_id;

                // Fetch company information
                const companyResponse = await fetch(`https://api.torn.com/company/${companyId}?selections=profile&key=${apiKey}`);

                if (!companyResponse.ok) {
                    console.debug('Failed to fetch company info');
                    return false;
                }

                const companyData = await companyResponse.json();

                if (companyData.error) {
                    console.debug('Company API error:', companyData.error);
                    return false;
                }

                // Check if it's a 10-star Lingerie Store
                const isLingerieStore = companyData.company?.company_type === 32; // Type 32 = Lingerie Store
                const is10Star = companyData.company?.rating === 10;

                if (isLingerieStore && is10Star) {
                    console.log('✅ Player works at 10-star Lingerie Store - WLT benefit applied!');
                    return true;
                }

                return false;

            } catch (error) {
                console.debug('Error checking company perks:', error);
                return false;
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
                console.debug('Could not retrieve API key:', error);
                return null;
            }
        },

        // Get player name from page
        getPlayerName() {
            const nameSelectors = [
                '.basic-information h4',
                '.profile-container h4',
                'h4[class*="name"]',
                'div[class*="userName"]'
            ];

            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element.textContent.trim().replace(/\[.*?\]/g, '').trim();
                }
            }

            return 'Unknown Player';
        },

        // Remove player from tracking
        removePlayer(playerId) {
            this.trackedPlayers.delete(playerId.toString());
            this.saveTrackedPlayers();

            const panel = document.querySelector('.sidekick-flight-info-panel');
            if (panel) {
                panel.remove();
            }
        },

        // Start monitoring all tracked players
        startMonitoring() {
            if (this.updateInterval) return;

            this.updateInterval = setInterval(() => {
                this.updateAllPlayers();
            }, 1000); // Update every second

            console.log('✅ Flight tracker monitoring started');
        },

        // Stop monitoring
        stopMonitoring() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        },

        // Update all tracked players
        async updateAllPlayers() {
            // Get current player ID from URL
            const currentPlayerMatch = window.location.href.match(/XID=(\d+)/);
            const currentPlayerId = currentPlayerMatch ? currentPlayerMatch[1] : null;

            for (const [playerId, player] of this.trackedPlayers) {
                // Only update the player we're currently viewing
                if (currentPlayerId && playerId === currentPlayerId) {
                    await this.updatePlayerStatus(playerId);
                    this.updateInfoPanel(playerId);
                }
            }
        },

        // Setup page listener
        setupPageListener() {
            setInterval(() => {
                if (window.location.href.includes('XID=')) {
                    if (!document.querySelector('.sidekick-flight-tracker-btn')) {
                        this.addTrackButton();
                    }
                }
            }, 2000);
        },

        // Get status
        getStatus() {
            return {
                isEnabled: this.isEnabled,
                isInitialized: this.isInitialized,
                trackedPlayersCount: this.trackedPlayers.size,
                isMonitoring: !!this.updateInterval
            };
        },

        // Enable
        enable() {
            this.isEnabled = true;
            this.saveSettings();
            if (this.isInitialized) {
                this.startMonitoring();
            }
        },

        // Disable
        disable() {
            this.isEnabled = false;
            this.stopMonitoring();
            this.saveSettings();
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