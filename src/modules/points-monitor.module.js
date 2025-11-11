// ==========================================
// POINTS MONITOR MODULE
// ==========================================
// Displays current points in the top navigation bar
// Fetches data from Torn API and updates display

const PointsMonitorModule = {
    name: 'PointsMonitor',
    
    // Configuration
    isInitialized: false,
    currentPoints: 0,
    displayElement: null,
    updateInterval: null,
    refreshRate: 30000, // 30 seconds
    apiKey: null,

    // Module initialization
    async init() {
        console.log('💰 Loading Sidekick Points Monitor Module...');
        
        // Check for dependencies
        if (!window.SidekickModules?.Core?.ChromeStorage) {
            console.error('💰 Points Monitor requires Core module with ChromeStorage');
            return false;
        }

        try {
            // Load API key
            await this.loadApiKey();
            
            // Create display element
            this.createDisplay();
            
            // Start monitoring if API key available
            if (this.apiKey) {
                await this.fetchPoints();
                this.startPeriodicUpdate();
            }
            
            this.isInitialized = true;
            console.log('✅ Points Monitor Module loaded and ready');
            return true;
            
        } catch (error) {
            console.error('💰 Failed to initialize Points Monitor:', error);
            return false;
        }
    },

    // Load API key from storage
    async loadApiKey() {
        try {
            if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                this.apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                if (this.apiKey) {
                    console.log('💰 API Key loaded for Points Monitor');
                } else {
                    console.warn('💰 No API key found - Points Monitor will show placeholder');
                }
            }
        } catch (error) {
            console.warn('💰 Failed to load API key:', error);
        }
    },

    // Create display element in top navigation
    createDisplay() {
        try {
            // Find Torn's top navigation area
            const topNav = document.querySelector('#top-page-links-list') || 
                          document.querySelector('.header-wrapper-top') ||
                          document.querySelector('.header-wrapper');
            
            if (!topNav) {
                console.warn('💰 Could not find navigation area for points display');
                return;
            }

            // Create points display container
            this.displayElement = document.createElement('div');
            this.displayElement.id = 'sidekick-points-monitor';
            this.displayElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 20px;
                background: linear-gradient(135deg, #2c3e50, #3498db);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 9999;
                min-width: 120px;
                text-align: center;
                border: 2px solid rgba(255,255,255,0.2);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                cursor: pointer;
                user-select: none;
            `;

            this.displayElement.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                ">
                    <span style="font-size: 16px;">💰</span>
                    <span id="points-value">Loading...</span>
                </div>
            `;

            // Add hover effects
            this.displayElement.addEventListener('mouseenter', () => {
                this.displayElement.style.transform = 'scale(1.05)';
                this.displayElement.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            });

            this.displayElement.addEventListener('mouseleave', () => {
                this.displayElement.style.transform = 'scale(1)';
                this.displayElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });

            // Add click handler for manual refresh
            this.displayElement.addEventListener('click', () => {
                this.fetchPoints();
            });

            // Append to page
            document.body.appendChild(this.displayElement);
            
            console.log('💰 Points display created in top navigation');
            
        } catch (error) {
            console.error('💰 Failed to create points display:', error);
        }
    },

    // Fetch current points from Torn API
    async fetchPoints() {
        if (!this.apiKey) {
            this.updateDisplay('No API Key');
            return;
        }

        try {
            console.log('💰 Fetching points from Torn API...');
            
            const response = await fetch(`https://api.torn.com/user/?selections=profile&key=${this.apiKey}`);
            const data = await response.json();

            if (data.error) {
                console.error('💰 API Error:', data.error.error);
                this.updateDisplay('API Error');
                return;
            }

            // Extract points from profile data
            if (data.points !== undefined) {
                this.currentPoints = data.points;
                this.updateDisplay(this.formatPoints(this.currentPoints));
                console.log(`💰 Points updated: ${this.currentPoints}`);
            } else {
                console.warn('💰 Points not found in API response');
                this.updateDisplay('N/A');
            }

        } catch (error) {
            console.error('💰 Failed to fetch points:', error);
            this.updateDisplay('Error');
        }
    },

    // Format points number for display
    formatPoints(points) {
        if (points >= 1000000) {
            return (points / 1000000).toFixed(1) + 'M';
        } else if (points >= 1000) {
            return (points / 1000).toFixed(1) + 'K';
        } else {
            return points.toLocaleString();
        }
    },

    // Update display element
    updateDisplay(text) {
        if (this.displayElement) {
            const valueElement = this.displayElement.querySelector('#points-value');
            if (valueElement) {
                valueElement.textContent = text;
                
                // Add flash effect on update
                valueElement.style.color = '#f1c40f';
                setTimeout(() => {
                    valueElement.style.color = 'white';
                }, 300);
            }
        }
    },

    // Start periodic updates
    startPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.fetchPoints();
        }, this.refreshRate);

        console.log(`💰 Periodic points update started (every ${this.refreshRate/1000}s)`);
    },

    // Stop periodic updates
    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('💰 Periodic points update stopped');
        }
    },

    // Clean up and destroy
    destroy() {
        this.stopPeriodicUpdate();
        
        if (this.displayElement) {
            this.displayElement.remove();
            this.displayElement = null;
        }
        
        this.isInitialized = false;
        console.log('💰 Points Monitor destroyed');
    }
};

// Register module globally
if (typeof window !== 'undefined') {
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.PointsMonitor = PointsMonitorModule;
    console.log('✅ Points Monitor Module registered');
}