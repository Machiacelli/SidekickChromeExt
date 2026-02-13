// Crime Notifier Module
// Monitors shoplifting security and search-for-cash percentages
console.log('🚨 ===== CRIME NOTIFIER SCRIPT LOADING =====');
const CrimeNotifierModule = {
    isEnabled: false,
    checkInterval: 30000, // 30 seconds default
    notifySecurityDown: true,
    notifySearchCash: true,
    searchCashThreshold: 50,
    pollTimer: null,
    previousShopsData: {},
    previousSearchData: {},
    STORAGE_KEY: 'crime-notifier',

    // Selection arrays for filtering
    selectedShopSecurity: [], // Array of 'shopKey_securityTitle' combinations (empty = all)
    selectedSearchLocations: [], // Will be populated from API data

    // Tab title flashing
    flashInterval: null,
    originalTitle: null, // Will be set during init

    // Shop definitions
    SHOPS: {
        'sallys_sweet_shop': "Sally's Sweet Shop",
        'Bits_n_bobs': "Bits 'n' Bobs",
        'tc_clothing': "TC Clothing",
        'super_store': "Super Store",
        'pharmacy': "Pharmacy",
        'cyber_force': "Cyber Force",
        'jewelry_store': "Jewelry Store",
        'big_als': "Big Al's Gun Shop"
    },

    // Initialize module
    async init() {
        console.log('🚨 Crime Notifier initializing...');

        // Capture original title now that DOM is ready
        this.originalTitle = document.title;

        await this.loadSettings();

        if (this.isEnabled) {
            this.enable();
        }

        // Listen for storage changes from popup/settings
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.sidekick_settings) {
                this.loadSettings();
            }
        });

        console.log('🚨 Crime Notifier initialized');
    },

    // Load settings from Chrome storage
    async loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            if (data && data[this.STORAGE_KEY]) {
                const moduleSettings = data[this.STORAGE_KEY];
                this.isEnabled = moduleSettings.isEnabled || false;
                this.checkInterval = moduleSettings.checkInterval || 30000;
                this.notifySecurityDown = moduleSettings.notifySecurityDown !== false;
                this.notifySearchCash = moduleSettings.notifySearchCash !== false;
                this.searchCashThreshold = moduleSettings.searchCashThreshold || 80;

                // Load selection arrays
                this.selectedShopSecurity = moduleSettings.selectedShopSecurity || [];
                this.selectedSearchLocations = moduleSettings.selectedSearchLocations || [];

                console.log('🚨 Settings loaded:', {
                    isEnabled: this.isEnabled,
                    checkInterval: this.checkInterval,
                    selectedShopSecurity: this.selectedShopSecurity.length,
                    selectedSearchLocations: this.selectedSearchLocations.length
                });

                // Restart polling if settings changed while enabled
                if (this.isEnabled && this.pollTimer) {
                    this.disable();
                    this.enable();
                }
            }
        } catch (error) {
            console.error('🚨 Failed to load settings:', error);
        }
    },

    // Save settings to Chrome storage
    async saveSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings') || {};
            data[this.STORAGE_KEY] = {
                isEnabled: this.isEnabled,
                checkInterval: this.checkInterval,
                notifySecurityDown: this.notifySecurityDown,
                notifySearchCash: this.notifySearchCash,
                searchCashThreshold: this.searchCashThreshold,
                selectedShopSecurity: this.selectedShopSecurity,
                selectedSearchLocations: this.selectedSearchLocations
            };
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_settings', data);
        } catch (error) {
            console.error('🚨 Failed to save settings:', error);
        }
    },

    // Load previous state from storage
    async loadPreviousState() {
        try {
            const shopsData = await window.SidekickModules.Core.ChromeStorage.get('crime_notifier_shops') || {};
            const searchData = await window.SidekickModules.Core.ChromeStorage.get('crime_notifier_search') || {};
            this.previousShopsData = shopsData;
            this.previousSearchData = searchData;
        } catch (error) {
            console.error('🚨 Failed to load previous state:', error);
        }
    },

    // Save current state
    async savePreviousState() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set('crime_notifier_shops', this.previousShopsData);
            await window.SidekickModules.Core.ChromeStorage.set('crime_notifier_search', this.previousSearchData);
        } catch (error) {
            console.error('🚨 Failed to save state:', error);
        }
    },

    // Enable module
    enable() {
        console.log('🚨 Enabling Crime Notifier');
        this.isEnabled = true;
        this.saveSettings();
        this.startPolling();
        console.log('🚨 Crime Notifier enabled');
    },

    // Disable module
    disable() {
        console.log('🚨 Disabling Crime Notifier');
        this.isEnabled = false;
        this.saveSettings();
        this.stopPolling();
        console.log('🚨 Crime Notifier disabled');
    },

    // Start polling API
    async startPolling() {
        // Load previous state
        await this.loadPreviousState();

        // Do initial check immediately
        await this.checkCrimeStatus();

        // Set up interval
        this.pollTimer = setInterval(() => {
            this.checkCrimeStatus();
        }, this.checkInterval);

        console.log(`🚨 Polling started (interval: ${this.checkInterval}ms)`);
    },

    // Stop polling
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
            console.log('🚨 Polling stopped');
        }
    },

    // Main check function
    async checkCrimeStatus() {
        console.log('🚨 Crime Notifier: checkCrimeStatus() called', {
            isEnabled: this.isEnabled,
            notifySecurityDown: this.notifySecurityDown,
            notifySearchCash: this.notifySearchCash
        });

        if (!this.isEnabled) {
            console.log('🚨 Crime Notifier: Module disabled, skipping');
            return;
        }

        const apiKey = await this.getApiKey();
        if (!apiKey) {
            console.warn('🚨 No API key configured - Crime Notifier requires API key');
            return;
        }

        console.log('🚨 Crime Notifier: API key found, proceeding with checks');

        // Check shoplifting security
        if (this.notifySecurityDown) {
            console.log('🚨 Checking shoplifting security...');
            await this.checkShopliftingSecurity(apiKey);
        }

        // Check search for cash
        if (this.notifySearchCash) {
            console.log('🚨 Checking search for cash...');
            await this.checkSearchForCash(apiKey);
        }
    },

    // Get API key from settings
    async getApiKey() {
        try {
            return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key') || '';
        } catch (error) {
            console.error('🚨 Failed to get API key:', error);
            return '';
        }
    },

    // Check shoplifting security status
    async checkShopliftingSecurity(apiKey) {
        try {
            const response = await fetch(`https://api.torn.com/torn/?selections=shoplifting&key=${apiKey}`);
            const data = await response.json();

            if (data.error) {
                console.error('🚨 API error (shoplifting):', data.error);
                return;
            }

            const currentShopsData = data.shoplifting;
            const alerts = [];

            console.log('🚨 Shoplifting data received. Selected combos:', this.selectedShopSecurity);
            console.log('🚨 Has previous data:', Object.keys(this.previousShopsData).length > 0);

            // Process each shop independently
            for (const [shopKey, shopData] of Object.entries(currentShopsData)) {
                if (!this.SHOPS[shopKey]) continue;

                const shopName = this.SHOPS[shopKey];
                const previousShop = this.previousShopsData[shopKey] || [];

                // Find which countermeasures are selected for THIS shop
                const selectedForThisShop = [];
                for (let i = 0; i < shopData.length; i++) {
                    const currentSecurity = shopData[i];
                    const comboKey = `${shopKey}_${currentSecurity.title}`;

                    if (this.selectedShopSecurity.length === 0 || this.selectedShopSecurity.includes(comboKey)) {
                        selectedForThisShop.push(i);
                    }
                }

                // Skip if no countermeasures selected for this shop
                if (selectedForThisShop.length === 0) continue;

                // Check if ALL selected countermeasures for this shop are down
                let allSelectedAreDown = true;
                let anyWasPreviouslyUp = false;

                for (const index of selectedForThisShop) {
                    const currentSecurity = shopData[index];
                    const previousSecurity = previousShop[index] || {};

                    if (!currentSecurity.disabled) {
                        allSelectedAreDown = false;
                        break;
                    }

                    // Check if this one transitioned from up to down
                    if (previousShop.length > 0 && !previousSecurity.disabled) {
                        anyWasPreviouslyUp = true;
                    }
                }

                // Only alert if:
                // 1. ALL selected countermeasures are currently down
                // 2. At least one of them transitioned (wasn't already down)
                if (allSelectedAreDown && anyWasPreviouslyUp) {
                    const downList = selectedForThisShop.map(i => shopData[i].title).join(' + ');
                    alerts.push(`${shopName}: ${downList} ALL DOWN!`);
                    console.log(`🚨 ** ALERT: ${shopName} - All selected countermeasures down! **`);
                }
            }

            // Show notification if any shops have all selected countermeasures down
            if (alerts.length > 0) {
                const message = alerts.join('\n');

                // Send all notification types
                await this.sendNotification({
                    title: '🚨 Security Down!',
                    message: message,
                    type: 'warning'
                });

                console.log('🚨 ** TRIGGERING SECURITY ALERT **:', alerts);
            }

            // Save current state for next check
            this.previousShopsData = currentShopsData;
            await this.savePreviousState();
            console.log('🚨 Shoplifting check complete, state saved');

        } catch (error) {
            console.error('🚨 Failed to check shoplifting security:', error);
        }
    },

    // Check search for cash percentages
    async checkSearchForCash(apiKey) {
        try {
            const response = await fetch(`https://api.torn.com/torn/?selections=searchforcash&key=${apiKey}`);
            const data = await response.json();

            if (data.error) {
                console.error('🚨 API error (search for cash):', data.error);
                return;
            }

            const currentSearchData = data.searchforcash;
            const alerts = [];

            // Check each search location
            for (const [searchKey, searchInfo] of Object.entries(currentSearchData)) {
                // Skip if this location is not selected (if any are selected)
                if (this.selectedSearchLocations.length > 0 && !this.selectedSearchLocations.includes(searchKey)) {
                    continue;
                }

                const currentPercentage = searchInfo.percentage;
                const previousPercentage = this.previousSearchData[searchKey]?.percentage || 0;

                // Detect crossing threshold
                if (previousPercentage < this.searchCashThreshold && currentPercentage >= this.searchCashThreshold) {
                    alerts.push(`${searchInfo.title}: ${currentPercentage}% (≥${this.searchCashThreshold}%)`);
                }
            }

            // Show notification if any location crossed threshold
            if (alerts.length > 0) {
                const message = alerts.join('\n');

                // Send all notification types
                await this.sendNotification({
                    title: '💰 Search For Cash Alert',
                    message: message,
                    type: 'success'
                });

                console.log('🚨 Search for cash alerts:', alerts);
            }

            // Save current state for next check
            this.previousSearchData = currentSearchData;
            await this.savePreviousState();

        } catch (error) {
            console.error('🚨 Failed to check search for cash:', error);
        }
    },

    // ========================================
    // Enhanced Notification System
    // ========================================

    // Send notification through all channels
    async sendNotification(data) {
        const { title, message, type } = data;

        // 1. Show in-page notification (existing)
        window.SidekickModules?.UI?.showNotification(title, message, type);

        // 2. Send to background worker for browser notification + badge
        try {
            await chrome.runtime.sendMessage({
                action: 'crimeNotifierAlert',
                data: {
                    title: title,
                    message: message,
                    type: type,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('❌ Failed to send to background:', error);
        }

        // 3. Start tab title flashing
        this.startTitleFlash(title);
    },

    // Start flashing tab title
    startTitleFlash(alertTitle) {
        // Stop any existing flash
        this.stopTitleFlash();

        let isAlert = true;
        this.flashInterval = setInterval(() => {
            document.title = isAlert ? alertTitle : this.originalTitle;
            isAlert = !isAlert;
        }, 1500);

        console.log('🔦 Tab title flashing started');
    },

    // Stop flashing tab title
    stopTitleFlash() {
        if (this.flashInterval) {
            clearInterval(this.flashInterval);
            this.flashInterval = null;
            document.title = this.originalTitle;
            console.log('🔦 Tab title flashing stopped');
        }
    },

    // ========================================
    // TEST/DEBUG FUNCTIONS
    // ========================================

    // Test the notification system
    async testNotifications() {
        console.log('🧪 Testing Crime Notifier notification system...');
        await this.sendNotification({
            title: '🧪 TEST: Security Down!',
            message: 'This is a test notification.\nIf you see this, all notification channels are working!',
            type: 'warning'
        });
        console.log('✅ Test notification sent!');
        console.log('Check for:');
        console.log('  1. In-page Sidekick notification');
        console.log('  2. Browser OS notification');
        console.log('  3. Badge on extension icon');
        console.log('  4. Tab title flashing');
        console.log('  5. Entry in popup notifications tab');
    },

    // Get current security state
    async getCurrentState() {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            console.error('❌ No API key configured');
            return;
        }

        const response = await fetch(`https://api.torn.com/torn/?selections=shoplifting&key=${apiKey}`);
        const data = await response.json();

        console.log('🔍 Current Shoplifting Security State:');
        console.log('=====================================');

        for (const [shopKey, shopData] of Object.entries(data.shoplifting)) {
            if (!this.SHOPS[shopKey]) continue;
            const shopName = this.SHOPS[shopKey];

            console.log(`\n${shopName}:`);
            shopData.forEach(security => {
                const status = security.disabled ? '🔴 DISABLED' : '🟢 ENABLED';
                console.log(`  ${security.title}: ${status}`);
            });
        }

        console.log('\n📊 Previous State:', this.previousShopsData);
    },

    // Clear previous state to force detection on next check
    async clearPreviousData() {
        this.previousShopsData = {};
        this.previousSearchData = {};
        await this.savePreviousState();
        console.log('🗑️ Previous data cleared! Next check will establish new baseline.');
        console.log('⚠️ WARNING: This means NO alerts will trigger on the immediate next check.');
        console.log('Alerts will only trigger on subsequent checks when security actually changes.');
    }
};

// Stop title flashing when window gains focus
window.addEventListener('focus', () => {
    if (window.SidekickModules?.CrimeNotifier) {
        window.SidekickModules.CrimeNotifier.stopTitleFlash();
    }
});

// Register module
if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.CrimeNotifier = CrimeNotifierModule;

// Inject test functions into page context (so console can access them)
const crimeNotifierScript = document.createElement('script');
crimeNotifierScript.textContent = `
    window.testCrimeNotifier = function() {
        const event = new CustomEvent('sidekick-test-crime-notifier');
        document.dispatchEvent(event);
        console.log('🚨 Test notification triggered!');
    };
    window.getCrimeState = function() {
        const event = new CustomEvent('sidekick-get-crime-state');
        document.dispatchEvent(event);
    };
    window.clearCrimeData = function() {
        const event = new CustomEvent('sidekick-clear-crime-data');
        document.dispatchEvent(event);
        console.log('🚨 Crime data cleared!');
    };
    console.log('🚨 Crime Notifier console functions ready!');
`;
document.documentElement.appendChild(crimeNotifierScript);
crimeNotifierScript.remove();

// Listen for events from page context
document.addEventListener('sidekick-test-crime-notifier', () => {
    CrimeNotifierModule.testNotifications();
});
document.addEventListener('sidekick-get-crime-state', () => {
    CrimeNotifierModule.getCurrentState();
});
document.addEventListener('sidekick-clear-crime-data', () => {
    CrimeNotifierModule.clearPreviousData();
});

console.log('🚨 Crime Notifier module registered');


