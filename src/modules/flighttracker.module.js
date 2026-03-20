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
        async addTrackButton() {
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
                // Wait for #top-page-links-list (confirmed present by diagnostic tool)
                const linksList = await this._waitForElement('#top-page-links-list', 5000);
                const h4 = document.querySelector('#skip-to-content');

                if (!linksList && !h4) {
                    console.debug('Could not find insertion point for track button');
                    return;
                }

                // Double-check we haven't added it while waiting
                if (document.querySelector('.sidekick-flight-tracker-btn')) return;

                const button = document.createElement('button');
                button.className = 'sidekick-flight-tracker-btn';
                button.id = `sidekick-track-btn-${playerId}`;
                button.style.cssText = `
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border: none;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    margin: 0 4px;
                    vertical-align: middle;
                    outline: none;
                    display: inline-flex;
                    align-items: center;
                    float: right;
                `;

                this._setButtonState(button, this.trackedPlayers.has(playerId.toString()));

                if (linksList) {
                    // Append to end of list. Torn uses float:right so
                    // last-in-HTML = left-most visually → appears left of BSP
                    linksList.appendChild(button);
                } else {
                    // Last-resort fallback: absolute inside content-title
                    const contentTitle = h4.closest('.content-title') || h4.parentElement;
                    if (window.getComputedStyle(contentTitle).position === 'static') {
                        contentTitle.style.position = 'relative';
                    }
                    button.style.position = 'absolute';
                    button.style.top = '50%';
                    button.style.transform = 'translateY(-50%)';
                    button.style.right = '10px';
                    contentTitle.appendChild(button);
                }

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._handleButtonClick(playerId, button);
                });

            } catch (error) {
                console.error('❌ Error creating flight tracker button:', error);
            }
        },

        // Wait for a CSS selector to appear in the DOM (MutationObserver + timeout)
        _waitForElement(selector, timeout = 3000) {
            const el = document.querySelector(selector);
            if (el) return Promise.resolve(el);
            return new Promise(resolve => {
                const observer = new MutationObserver(() => {
                    const found = document.querySelector(selector);
                    if (found) {
                        observer.disconnect();
                        resolve(found);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => {
                    observer.disconnect();
                    resolve(null); // timed out — use fallback
                }, timeout);
            });
        },

        // Set the button label/color based on tracking state
        _setButtonState(button, isTracking) {
            if (isTracking) {
                button.innerHTML = '✈️ Tracking ▸';
                button.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';
                button.title = 'Click to view tracking info';
            } else {
                button.innerHTML = '✈️ Track';
                button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                button.title = 'Click to start tracking this player';
            }
        },

        // Handle button click: show popup if tracking, else start area selection
        _handleButtonClick(playerId, anchorBtn) {
            if (this.trackedPlayers.has(playerId.toString())) {
                this.showTrackingPopup(playerId, anchorBtn);
            } else {
                this.startAreaSelection(playerId, this.findStatusContainer());
            }
        },

        // Floating popup showing current tracking status (replaces the old text bar)
        showTrackingPopup(playerId, anchorEl) {
            const POPUP_ID = `sidekick-ft-popup-${playerId}`;
            const existing = document.getElementById(POPUP_ID);
            if (existing) { existing.remove(); return; }

            const rect = anchorEl.getBoundingClientRect();
            const panel = document.createElement('div');
            panel.id = POPUP_ID;
            panel.style.cssText = `
                position: fixed;
                top: ${rect.bottom + 8}px;
                left: ${rect.left}px;
                background: #1a1a1a;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 12px 16px;
                color: #fff;
                font-size: 13px;
                min-width: 210px;
                max-width: 300px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.6);
                z-index: 999999;
            `;

            const player = this.trackedPlayers.get(playerId.toString());
            if (!player) {
                panel.innerHTML = `<div style="color:#aaa">Not currently tracking this player.</div>
                    <div style="margin-top:8px;text-align:right;"><button class="ft-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button></div>`;
            } else {
                let statusLine = '';
                if (player.currentCountry) {
                    const dir = player.currentStatus === 'returning' ? '← Returning from' : '→ Traveling to';
                    statusLine = `${dir} <strong>${player.currentCountry}</strong>`;
                    if (player.detectedPlaneType) {
                        statusLine += ` ${player.detectedPlaneType === 'airstrip' ? '🛩️' : '✈️'}`;
                    }
                    if (player.landingTime && player.currentStatus === 'returning') {
                        const secs = Math.max(0, Math.floor((player.landingTime - Date.now()) / 1000));
                        const color = secs <= 60 ? '#f44336' : secs <= 300 ? '#FF9800' : '#4CAF50';
                        statusLine += `<br><span style="color:${color};">⏱ ${this._formatSeconds(secs)} left</span>`;
                    }
                    if (player.hasWLTBenefit && player.currentStatus === 'returning') {
                        statusLine += ` <span style="color:#FFD700;">⚡WLT</span>`;
                    }
                } else {
                    statusLine = `<span style="opacity:0.7;">${player.currentStatus || 'Monitoring…'}</span>`;
                }

                panel.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-weight:bold;font-size:14px;">✈️ Flight Tracker</div>
                    </div>
                    <div style="font-size:12px;color:#ddd;line-height:1.8;">${statusLine}</div>
                    <div style="font-size:11px;color:#666;margin-top:4px;">Player: ${player.name}</div>
                    <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">
                        <button class="ft-stop" style="background:rgba(244,67,54,0.2);border:1px solid rgba(244,67,54,0.4);color:#F44336;border-radius:4px;cursor:pointer;font-size:11px;padding:4px 10px;">Stop Tracking</button>
                        <button class="ft-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button>
                    </div>
                `;
                panel.querySelector('.ft-stop').addEventListener('click', () => {
                    if (confirm(`Stop tracking ${player.name}?`)) {
                        this.removePlayer(playerId);
                        panel.remove();
                        const btn = document.querySelector('.sidekick-flight-tracker-btn');
                        if (btn) this._setButtonState(btn, false);
                    }
                });
            }

            panel.querySelector('.ft-close')?.addEventListener('click', () => panel.remove());
            document.body.appendChild(panel);

            setTimeout(() => {
                document.addEventListener('click', function close(e) {
                    if (!panel.contains(e.target) && e.target !== anchorEl) {
                        panel.remove();
                        document.removeEventListener('click', close);
                    }
                });
            }, 0);
        },

        // Format seconds into h/m/s string
        _formatSeconds(secs) {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
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

            // Update button state
            const btn = document.querySelector('.sidekick-flight-tracker-btn');
            if (btn) this._setButtonState(btn, true);
        },

        // updateInfoPanel is replaced by showTrackingPopup — see above

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

            // Remove the entire flex container
            const container = document.querySelector(`#flight-tracker-container-${playerId}`);
            if (container) {
                container.remove();
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
                    // Update button state (updateInfoPanel removed — tracking info is in the popup now)
                    const btn = document.querySelector('.sidekick-flight-tracker-btn');
                    if (btn) this._setButtonState(btn, true);
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