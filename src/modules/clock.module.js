// Clock and Point Monitor Module for Sidekick Chrome Extension
// Displays current UTC time or points market pricing in top bar

(function() {
    'use strict';
    
    console.log('🕐 Loading Sidekick Clock Module...');

    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    const ClockModule = {
        clockInterval: null,
        pointsData: null,
        showPoints: false,
        apiKey: null,
        clockElement: null,
        isInitialized: false,
        toggleInProgress: false,

        async init() {
            if (this.isInitialized) {
                console.log('⚠️ Clock module already initialized');
                return;
            }

            console.log('🕐 Initializing Clock Module...');
            
            // Check for Core module
            if (!window.SidekickModules?.Core?.ChromeStorage) {
                console.error('❌ Core module not available for Clock');
                return;
            }

            await this.loadSettings();
            this.createClockElement();
            this.startClock();
            
            // Only fetch points if API key exists
            if (this.apiKey) {
                await this.fetchPointsPricing();
                // Refresh points pricing every 5 minutes
                setInterval(() => {
                    this.fetchPointsPricing();
                }, 5 * 60 * 1000);
            }
            
            this.isInitialized = true;
            console.log('✅ Clock Module initialized successfully');
        },

        async loadSettings() {
            try {
                // Load saved settings from Chrome storage
                const showPoints = await window.SidekickModules.Core.ChromeStorage.get('sidekick_show_points') || false;
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key') || '';
                
                this.showPoints = showPoints;
                this.apiKey = apiKey;
                console.log('🔧 Clock settings loaded - showPoints:', this.showPoints, 'apiKey:', this.apiKey ? 'SET' : 'NOT SET');
            } catch (error) {
                console.error('❌ Failed to load clock settings:', error);
            }
        },

        async saveSettings() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_show_points', this.showPoints);
                console.log('💾 Clock settings saved');
            } catch (error) {
                console.error('❌ Failed to save clock settings:', error);
            }
        },

        createClockElement() {
            // Remove any existing clock
            const existingClock = document.getElementById('sidekick-clock');
            if (existingClock) {
                existingClock.remove();
            }

            // Find Torn's top navigation bar - try multiple selectors
            let topNav = null;
            const navSelectors = [
                'header.header', // Main header
                '.header-wrapper', // Header wrapper
                '#top-page-links-list', // Top links area
                '.nav-container', // Navigation container
                'header', // Generic header
                '[class*="header"]' // Any element with "header" in class
            ];

            for (const selector of navSelectors) {
                topNav = document.querySelector(selector);
                if (topNav) {
                    console.log(`🔍 Found top navigation using selector: ${selector}`);
                    break;
                }
            }

            // Create clock element 
            this.clockElement = document.createElement('div');
            this.clockElement.id = 'sidekick-clock';
            
            if (topNav) {
                // Position within the top navigation bar with higher visibility
                this.clockElement.style.cssText = `
                    position: fixed;
                    top: 5px;
                    right: 15px;
                    background: rgba(0, 0, 0, 0.9);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    z-index: 9999;
                    cursor: pointer;
                    user-select: none;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                    transition: all 0.2s ease;
                    min-width: 120px;
                    text-align: center;
                    white-space: nowrap;
                    display: block;
                    visibility: visible;
                `;
            } else {
                // Fallback to fixed positioning if no nav found
                console.warn('⚠️ Could not find top navigation, using fixed positioning');
                this.clockElement.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 15px;
                    background: rgba(0, 0, 0, 0.8);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    z-index: 10000;
                    cursor: pointer;
                    user-select: none;
                    border: 1px solid #444;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    min-width: 120px;
                    text-align: center;
                `;
            }

            // Hover effects
            this.clockElement.addEventListener('mouseenter', () => {
                this.clockElement.style.background = 'rgba(0, 0, 0, 0.9)';
                this.clockElement.style.transform = 'scale(1.05)';
            });

            this.clockElement.addEventListener('mouseleave', () => {
                this.clockElement.style.background = 'rgba(0, 0, 0, 0.8)';
                this.clockElement.style.transform = 'scale(1)';
            });

            // Click to toggle between clock and points
            this.clockElement.addEventListener('click', () => {
                this.togglePointsDisplay();
            });

            // Right-click to set manual price
            this.clockElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.promptForManualPrice();
            });

            // Create time display
            const timeDisplay = document.createElement('div');
            timeDisplay.id = 'sidekick-clock-time';
            timeDisplay.style.cssText = `
                font-weight: bold;
                font-size: 16px;
                line-height: 1.2;
            `;

            // Create date/label display
            const dateDisplay = document.createElement('div');
            dateDisplay.id = 'sidekick-clock-date';
            dateDisplay.style.cssText = `
                font-size: 11px;
                opacity: 0.8;
                line-height: 1.2;
            `;

            this.clockElement.appendChild(timeDisplay);
            this.clockElement.appendChild(dateDisplay);

            // Always append to body for maximum visibility
            document.body.appendChild(this.clockElement);
            console.log('✅ Clock element created and added to body for maximum visibility');
        },

        startClock() {
            // Clear any existing interval
            if (this.clockInterval) {
                clearInterval(this.clockInterval);
            }

            // Update immediately, then every second
            this.updateClock();
            this.clockInterval = setInterval(() => {
                this.updateClock();
            }, 1000);

            console.log('⏰ Clock started');
        },

        updateClock() {
            const timeElement = document.getElementById('sidekick-clock-time');
            const dateElement = document.getElementById('sidekick-clock-date');
            
            if (!timeElement || !dateElement) return;

            if (this.showPoints && this.pointsData && this.pointsData.length > 0) {
                // Show points price - find cheapest offer
                const cheapestOffer = Math.min(...this.pointsData.map(offer => offer.cost));
                timeElement.textContent = `$${cheapestOffer.toLocaleString()}`;
                timeElement.style.color = '#4CAF50';
                dateElement.textContent = 'Points';
                dateElement.style.color = '#4CAF50';
            } else if (this.showPoints && (!this.pointsData || this.pointsData.length === 0)) {
                // Show "No Data" when points mode is enabled but no data available
                timeElement.textContent = 'No Data';
                timeElement.style.color = '#ff9800';
                dateElement.textContent = 'Points';
                dateElement.style.color = '#ff9800';
            } else {
                // Show current UTC time (Torn time)
                const now = new Date();
                
                // Format time as HH:MM:SS using UTC
                const hours = String(now.getUTCHours()).padStart(2, '0');
                const minutes = String(now.getUTCMinutes()).padStart(2, '0');
                const seconds = String(now.getUTCSeconds()).padStart(2, '0');
                const timeStr = `${hours}:${minutes}:${seconds}`;
                
                // Format date as "11 Aug"
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const day = now.getUTCDate();
                const month = months[now.getUTCMonth()];
                const dateStr = `${day} ${month}`;
                
                timeElement.textContent = timeStr;
                timeElement.style.color = '#fff';
                dateElement.textContent = dateStr;
                dateElement.style.color = '#aaa';
            }
        },

        async togglePointsDisplay() {
            // Prevent rapid successive toggles
            if (this.toggleInProgress) {
                console.log('⚠️ Toggle already in progress, ignoring...');
                return;
            }
            
            this.toggleInProgress = true;
            console.log('🔄 Toggling display - Current showPoints:', this.showPoints);
            
            // Toggle the state
            this.showPoints = !this.showPoints;
            
            // Save state
            await this.saveSettings();
            
            // Update display immediately
            this.updateClock();
            console.log('✅ Toggle complete, showing points:', this.showPoints);
            
            // Show notification
            if (window.SidekickModules?.UI?.showNotification) {
                const mode = this.showPoints ? 'Points Monitor' : 'Clock';
                window.SidekickModules.UI.showNotification('INFO', `Switched to ${mode}`);
            }
            
            // Release toggle lock
            setTimeout(() => {
                this.toggleInProgress = false;
            }, 100);
        },

        promptForManualPrice() {
            const currentPrice = this.pointsData && this.pointsData.length > 0 
                ? Math.min(...this.pointsData.map(offer => offer.cost)) 
                : '';
            
            const newPrice = prompt(`Enter current points price per dollar:\n(Current: $${currentPrice || 'Not set'})`, currentPrice);
            
            if (newPrice !== null && newPrice.trim() !== '') {
                const price = parseFloat(newPrice.trim().replace(/[^\d.]/g, ''));
                if (!isNaN(price) && price > 0) {
                    // Create manual price data
                    this.pointsData = [{ cost: price }];
                    
                    // Save manual price
                    window.SidekickModules.Core.ChromeStorage.set('sidekick_manual_points_price', price);
                    
                    if (this.showPoints) {
                        this.updateClock();
                    }
                    
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification('SUCCESS', `Points price set to $${price.toLocaleString()}`);
                    }
                } else {
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification('ERROR', 'Please enter a valid positive number');
                    }
                }
            }
        },

        async fetchPointsPricing() {
            if (!this.apiKey) {
                console.log('⚠️ No API key set for points pricing');
                return;
            }

            try {
                console.log('🔄 Fetching points market data...');
                const response = await fetch(`https://api.torn.com/market/?selections=pointsmarket&key=${this.apiKey}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                
                if (data.error) {
                    console.error('API Error:', data.error);
                    if (window.SidekickModules?.UI?.showNotification) {
                        window.SidekickModules.UI.showNotification('ERROR', `API Error: ${data.error.error}`);
                    }
                    return;
                }

                if (data.pointsmarket && Object.keys(data.pointsmarket).length > 0) {
                    // Convert object to array and extract costs
                    this.pointsData = Object.values(data.pointsmarket);
                    console.log('✅ Points pricing updated:', this.pointsData.length, 'offers');
                } else {
                    console.log('⚠️ No points market data available');
                }
                
            } catch (error) {
                console.error('Failed to fetch points pricing:', error);
            }
        },

        async updateApiKey(newApiKey) {
            this.apiKey = newApiKey;
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_api_key', newApiKey);
            
            if (newApiKey) {
                await this.fetchPointsPricing();
            }
            console.log('🔑 API key updated for clock module');
        },

        destroy() {
            console.log('🧹 Destroying clock module...');
            
            // Clear interval
            if (this.clockInterval) {
                clearInterval(this.clockInterval);
                this.clockInterval = null;
            }
            
            // Remove element
            if (this.clockElement) {
                this.clockElement.remove();
                this.clockElement = null;
            }
            
            // Reset state
            this.isInitialized = false;
            this.toggleInProgress = false;
            
            console.log('✅ Clock module destroyed');
        }
    };

    // Export to global scope
    window.SidekickModules.Clock = ClockModule;
    console.log('✅ Clock Module loaded and ready');

})();