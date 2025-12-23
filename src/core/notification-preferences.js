/**
 * Notification Preferences Manager
 * Manages user preferences for which notifications to display
 */

const NotificationPreferences = {
    STORAGE_KEY: 'sidekick_notification_preferences',

    // Default preferences - all enabled
    DEFAULT_PREFERENCES: {
        modules: {
            'stats-tracker': true,
            'stock-advisor': true,
            'debt-tracker': true,
            'todo-list': true,
            'attack-list': true,
            'timer': true,
            'notepad': true,
            'link-groups': true,
            'extension': true
        },
        types: {
            'info': true,
            'success': true,
            'warning': true,
            'error': true
        }
    },

    /**
     * Get current preferences
     */
    async get() {
        const result = await chrome.storage.local.get([this.STORAGE_KEY]);
        return result[this.STORAGE_KEY] || this.DEFAULT_PREFERENCES;
    },

    /**
     * Save preferences
     */
    async save(preferences) {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: preferences });
        console.log('💾 Notification preferences saved');
    },

    /**
     * Check if a notification should be displayed based on preferences
     * @param {Object} notification
     * @param {Object} preferences
     */
    shouldDisplay(notification, preferences) {
        // Check module preference
        const moduleEnabled = preferences.modules[notification.moduleId] !== false;

        // Check type preference
        const typeEnabled = preferences.types[notification.type] !== false;

        return moduleEnabled && typeEnabled;
    },

    /**
     * Filter notifications based on preferences
     * @param {Array} notifications
     */
    async filter(notifications) {
        const preferences = await this.get();
        return notifications.filter(n => this.shouldDisplay(n, preferences));
    },

    /**
     * Toggle module preference
     */
    async toggleModule(moduleId) {
        const preferences = await this.get();
        preferences.modules[moduleId] = !preferences.modules[moduleId];
        await this.save(preferences);
    },

    /**
     * Toggle type preference
     */
    async toggleType(type) {
        const preferences = await this.get();
        preferences.types[type] = !preferences.types[type];
        await this.save(preferences);
    },

    /**
     * Reset to defaults
     */
    async reset() {
        await this.save(this.DEFAULT_PREFERENCES);
        console.log('🔄 Notification preferences reset to defaults');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationPreferences;
}
