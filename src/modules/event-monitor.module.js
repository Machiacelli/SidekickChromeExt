/**
 * Event Monitor Module
 * Monitors Torn API events and emits notifications for important events
 */

const EventMonitorModule = (() => {
    let isEnabled = false;
    let apiKey = null;
    let lastEventId = null;
    let checkInterval = null;

    // Notification preferences (can be configured by user)
    const preferences = {
        largeMoneyThreshold: 10000000, // $10M default
        highValueAttackRespect: 10, // 10+ respect
        enableLargeMoneyTransfers: true,
        enableBazaarSales: true,
        enableAttackResults: true,
        enableHospitalization: true
    };

    return {
        name: 'EventMonitor',

        async initialize() {
            console.log('[EventMonitor] Initializing...');

            // Check if module is enabled
            const settings = await window.SidekickModules?.Core?.ChromeStorage?.get('sidekick_event_monitor');
            isEnabled = settings?.isEnabled !== false; // Default to enabled

            if (!isEnabled) {
                console.log('[EventMonitor] Module is disabled');
                return;
            }

            // Get API key
            apiKey = await window.SidekickModules?.Core?.ChromeStorage?.get('sidekick_api_key');
            if (!apiKey) {
                console.warn('[EventMonitor] No API key found');
                return;
            }

            // Load preferences
            await this.loadPreferences();

            // Start monitoring
            this.startMonitoring();

            console.log('[EventMonitor] Initialized successfully');
        },

        async loadPreferences() {
            const saved = await window.SidekickModules?.Core?.ChromeStorage?.get('sidekick_event_monitor_preferences');
            if (saved) {
                Object.assign(preferences, saved);
            }
        },

        async savePreferences() {
            await window.SidekickModules?.Core?.ChromeStorage?.set('sidekick_event_monitor_preferences', preferences);
        },

        startMonitoring() {
            // Check events every 60 seconds
            checkInterval = setInterval(() => this.checkEvents(), 60000);

            // Initial check
            this.checkEvents();

            console.log('[EventMonitor] Started monitoring events');
        },

        stopMonitoring() {
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
            console.log('[EventMonitor] Stopped monitoring events');
        },

        async checkEvents() {
            if (!apiKey) return;

            try {
                // Fetch events from Torn API
                const response = await fetch(`https://api.torn.com/user/?selections=events&key=${apiKey}`);
                const data = await response.json();

                if (data.error) {
                    console.error('[EventMonitor] API Error:', data.error);
                    return;
                }

                const events = Object.values(data.events || {});

                // Process events
                for (const event of events) {
                    // Skip if we've already processed this event
                    if (lastEventId && event.timestamp <= lastEventId) {
                        continue;
                    }

                    await this.processEvent(event);
                }

                // Update last processed event ID
                if (events.length > 0) {
                    lastEventId = Math.max(...events.map(e => e.timestamp));
                }

            } catch (error) {
                console.error('[EventMonitor] Error checking events:', error);
            }
        },

        async processEvent(event) {
            const eventText = event.event || '';

            // Check for different event types
            await this.checkLargeMoneyTransfer(event, eventText);
            await this.checkBazaarSale(event, eventText);
            await this.checkAttackResult(event, eventText);
            await this.checkHospitalization(event, eventText);
        },

        async checkLargeMoneyTransfer(event, eventText) {
            if (!preferences.enableLargeMoneyTransfers) return;

            // Pattern: "You received $X from PlayerName"
            const receiveMatch = eventText.match(/You received \$([0-9,]+) from (.+)/);
            if (receiveMatch) {
                const amount = parseInt(receiveMatch[1].replace(/,/g, ''));
                const sender = receiveMatch[2];

                if (amount >= preferences.largeMoneyThreshold) {
                    await this.emitNotification({
                        moduleId: 'event-monitor',
                        type: 'success',
                        title: '💰 Large Money Received',
                        message: `Received $${amount.toLocaleString()} from ${sender}`,
                        action: {
                            type: 'openUrl',
                            url: 'https://www.torn.com/profiles.php'
                        }
                    });
                }
            }

            // Pattern: "You sent $X to PlayerName"
            const sentMatch = eventText.match(/You sent \$([0-9,]+) to (.+)/);
            if (sentMatch) {
                const amount = parseInt(sentMatch[1].replace(/,/g, ''));
                const recipient = sentMatch[2];

                if (amount >= preferences.largeMoneyThreshold) {
                    await this.emitNotification({
                        moduleId: 'event-monitor',
                        type: 'info',
                        title: '💸 Large Money Sent',
                        message: `Sent $${amount.toLocaleString()} to ${recipient}`,
                        action: {
                            type: 'openUrl',
                            url: 'https://www.torn.com/profiles.php'
                        }
                    });
                }
            }
        },

        async checkBazaarSale(event, eventText) {
            if (!preferences.enableBazaarSales) return;

            // Pattern: "Your item X was bought by PlayerName for $Y"
            const match = eventText.match(/Your (.+?) was bought by (.+?) for \$([0-9,]+)/);
            if (match) {
                const item = match[1];
                const buyer = match[2];
                const price = parseInt(match[3].replace(/,/g, ''));

                await this.emitNotification({
                    moduleId: 'event-monitor',
                    type: 'success',
                    title: '🛒 Bazaar Sale',
                    message: `${item} sold to ${buyer} for $${price.toLocaleString()}`,
                    action: {
                        type: 'openUrl',
                        url: 'https://www.torn.com/bazaar.php'
                    }
                });
            }
        },

        async checkAttackResult(event, eventText) {
            if (!preferences.enableAttackResults) return;

            // Pattern: "You attacked PlayerName and won, gaining X respect"
            const match = eventText.match(/You attacked (.+?) and won.*?gaining ([0-9.]+) respect/);
            if (match) {
                const target = match[1];
                const respect = parseFloat(match[2]);

                if (respect >= preferences.highValueAttackRespect) {
                    await this.emitNotification({
                        moduleId: 'event-monitor',
                        type: 'success',
                        title: '🎯 High-Value Attack',
                        message: `Defeated ${target} for ${respect} respect`,
                        action: {
                            type: 'openUrl',
                            url: 'https://www.torn.com/loader.php?sid=attackLog'
                        }
                    });
                }
            }
        },

        async checkHospitalization(event, eventText) {
            if (!preferences.enableHospitalization) return;

            // Pattern: "You were hospitalized by PlayerName"
            const match = eventText.match(/You were hospitalized by (.+)/);
            if (match) {
                const attacker = match[1];

                await this.emitNotification({
                    moduleId: 'event-monitor',
                    type: 'error',
                    title: '⚠️ Hospitalized',
                    message: `You were hospitalized by ${attacker}`,
                    action: {
                        type: 'openUrl',
                        url: 'https://www.torn.com/profiles.php'
                    }
                });
            }
        },

        async emitNotification(notification) {
            if (window.NotificationCenter) {
                await window.NotificationCenter.emit(notification);
                console.log('[EventMonitor] Notification emitted:', notification.title);
            } else {
                console.warn('[EventMonitor] NotificationCenter not available');
            }
        },

        async destroy() {
            this.stopMonitoring();
            console.log('[EventMonitor] Destroyed');
        }
    };
})();

// Register module
if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.EventMonitor = EventMonitorModule;

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventMonitorModule;
}
