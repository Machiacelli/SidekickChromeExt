/**
 * Notification Bridge - Page Context Side
 * This runs in the page's main world and provides NotificationCenter API
 */

(function () {
    'use strict';

    // Create NotificationCenter API for page context
    window.NotificationCenter = {
        emit: function (notification) {
            // Send to content script via custom event
            window.dispatchEvent(new CustomEvent('sidekick:emitNotification', {
                detail: notification
            }));
            console.log('📬 Page context: Notification request sent', notification);
            return Promise.resolve();
        }
    };

    console.log('📬 NotificationCenter bridge injected into page context');
})();
