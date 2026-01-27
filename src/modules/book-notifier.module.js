// Mission Rewards Book Notifier Module
// Checks for books in mission rewards every 12 hours and displays a notification
const BookNotifierModule = {
    isEnabled: false,
    checkInterval: null,
    notificationElement: null,
    CHECK_INTERVAL_MS: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
    STORAGE_KEY: 'book-notifier',

    // Initialize module
    async init() {
        console.log('📚 Book Notifier module initializing...');

        await this.loadSettings();

        if (this.isEnabled) {
            this.enable();
        }

        console.log('📚 Book Notifier module initialized');
    },

    // Load settings from Chrome storage
    async loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            if (data && data[this.STORAGE_KEY]) {
                const moduleSettings = data[this.STORAGE_KEY];
                this.isEnabled = moduleSettings.isEnabled || false;
                console.log('📚 Loaded settings:', { isEnabled: this.isEnabled });
            } else {
                console.log('📚 No existing settings, module disabled by default');
            }
        } catch (error) {
            console.error('📚 Failed to load Book Notifier settings:', error);
        }
    },

    // Save settings to Chrome storage
    async saveSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings') || {};
            data[this.STORAGE_KEY] = {
                isEnabled: this.isEnabled
            };
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_settings', data);
        } catch (error) {
            console.error('📚 Failed to save Book Notifier settings:', error);
        }
    },

    // Enable module
    enable() {
        console.log('📚 Enable called, current state:', { isEnabled: this.isEnabled });

        if (this.isEnabled) {
            console.log('📚 Already enabled, re-initializing...');
        }

        console.log('📚 Enabling Book Notifier');
        this.isEnabled = true;
        this.saveSettings();

        // Do immediate check
        this.checkForBook();

        // Start 12-hour interval
        this.checkInterval = setInterval(() => {
            this.checkForBook();
        }, this.CHECK_INTERVAL_MS);

        console.log('📚 Book Notifier enabled successfully (12-hour interval)');
    },

    // Disable module
    disable() {
        console.log('📚 Disable called, current state:', { isEnabled: this.isEnabled });

        if (!this.isEnabled) {
            console.log('📚 Already disabled');
            return;
        }

        console.log('📚 Disabling Book Notifier');
        this.isEnabled = false;
        this.saveSettings();

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.clearNotification();

        console.log('📚 Book Notifier disabled successfully');
    },

    // Check for books in mission rewards via background script
    async checkForBook() {
        try {
            console.log('📚 Checking for books in mission rewards...');

            // Get API key from storage
            const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
            if (!apiKey) {
                console.warn('📚 No API key configured - skipping book check');
                return;
            }

            // Use background script for API call
            const response = await chrome.runtime.sendMessage({
                action: 'fetchTornApi',
                apiKey: apiKey,
                selections: ['missions'],
                comment: 'BookNotifierModule'
            });

            if (!response.success || response.error) {
                console.error('📚 API call failed:', response.error || 'Unknown error');
                return;
            }

            const data = response.data;

            // Check if there's at least one book in rewards
            const hasBook = data.missions?.rewards?.some(reward =>
                reward.details?.type === 'Book'
            );

            console.log('📚 Check complete. Book found:', hasBook);

            if (hasBook) {
                this.showNotification();
            } else {
                this.clearNotification();
            }

        } catch (error) {
            console.error('📚 Error checking for book:', error);
        }
    },

    // Show notification in sidebar
    showNotification() {
        try {
            // Don't create duplicate notification
            if (this.notificationElement) {
                console.log('📚 Notification already visible');
                return;
            }

            // Find sidebar or content area
            let parent = document.querySelector('div.sidebar');
            if (!parent) {
                parent = document.querySelector('div.content-wrapper');
            }
            if (!parent) {
                console.warn('📚 Could not find parent element for notification');
                return;
            }

            // Create notification element matching Torn's style
            const section = document.createElement('div');
            section.id = 'sidekick-book-notif';
            section.className = 'cont-gray bottom-round';
            section.style.cssText = `
                padding: 10px;
                margin: 5px 0;
                background: rgba(56, 142, 60, 0.15);
                border: 1px solid rgba(76, 175, 80, 0.5);
                border-radius: 5px;
            `;

            const link = document.createElement('a');
            link.style.cssText = `
                color: #4CAF50;
                font-weight: bold;
                text-decoration: none;
                font-size: 13px;
                display: block;
            `;
            link.href = 'https://www.torn.com/loader.php?sid=missions';
            link.innerHTML = '📚 Book available in mission rewards!';
            link.onmouseover = () => link.style.color = '#66BB6A';
            link.onmouseout = () => link.style.color = '#4CAF50';

            section.appendChild(link);
            parent.insertBefore(section, parent.firstChild);

            this.notificationElement = section;
            console.log('📚 Notification displayed');

        } catch (error) {
            console.error('📚 Error showing notification:', error);
        }
    },

    // Clear notification
    clearNotification() {
        try {
            const elem = document.getElementById('sidekick-book-notif');
            if (elem) {
                elem.remove();
                this.notificationElement = null;
                console.log('📚 Notification cleared');
            }
        } catch (error) {
            console.error('📚 Error clearing notification:', error);
        }
    }
};

// Register module
if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.BookNotifier = BookNotifierModule;

console.log('📚 Book Notifier module registered on window.SidekickModules');
