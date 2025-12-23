/**
 * Test Notification Helper
 * Creates sample notifications for testing the notification system
 * 
 * Open browser console on Torn.com and run:
 * TestNotifications.createSample()
 */

const TestNotifications = {
    /**
     * Create a sample notification of each type
     */
    async createSample() {
        // Info notification
        await NotificationCenter.emit({
            moduleId: 'extension',
            type: 'info',
            title: 'System Info',
            message: 'Extension loaded successfully'
        });

        // Success notification
        await NotificationCenter.emit({
            moduleId: 'stock-advisor',
            type: 'success',
            title: 'Price Target Hit',
            message: 'TCB stock reached $850 - Good time to sell!'
        });

        // Warning notification
        await NotificationCenter.emit({
            moduleId: 'debt-tracker',
            type: 'warning',
            title: 'Payment Overdue',
            message: 'PlayerX payment is 3 days overdue'
        });

        // Error notification
        await NotificationCenter.emit({
            moduleId: 'extension',
            type: 'error',
            title: 'API Key Invalid',
            message: 'Please update your Torn API key in settings'
        });

        console.log('✅ Created 4 sample notifications. Open popup to view!');
    },

    /**
     * Create just one notification for quick testing
     */
    async createOne() {
        await NotificationCenter.emit({
            moduleId: 'extension',
            type: 'success',
            title: 'Test Notification',
            message: 'The notification system is working!'
        });

        console.log('✅ Test notification created. Open popup Notifications tab to see it!');
    },

    /**
     * Clear all notifications
     */
    async clearAll() {
        await NotificationCenter.clearAll();
        console.log('🧹 All notifications cleared');
    }
};

// Export to window
window.TestNotifications = TestNotifications;
console.log('📬 Test Notifications loaded. Run TestNotifications.createSample() to test!');
