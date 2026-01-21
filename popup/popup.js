/**
 * Sidekick Chrome Extension - Popup Script V2
 * Handles the extension popup interface (Notification Center)
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log('📬 Sidekick Popup loaded');

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // Feature toggles - using unified sidekick_settings storage
    const featureToggles = document.querySelectorAll('.module-toggle input');

    // Load all toggle states from unified storage
    chrome.storage.local.get(['sidekick_settings'], result => {
        const settings = result.sidekick_settings || {};

        featureToggles.forEach(toggle => {
            const moduleId = toggle.dataset.module;
            if (!moduleId) return; // Skip if no module ID

            // Load saved state (default to true if not set)
            const moduleSettings = settings[moduleId];
            const isEnabled = moduleSettings ? moduleSettings.isEnabled !== false : true;
            toggle.checked = isEnabled;
        });
    });

    // Handle toggle changes
    featureToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const moduleId = toggle.dataset.module;
            if (!moduleId) return;

            const isEnabled = toggle.checked;

            // Get current settings, update the specific module, and save
            chrome.storage.local.get(['sidekick_settings'], result => {
                const settings = result.sidekick_settings || {};

                // Update or create module settings
                if (!settings[moduleId]) {
                    settings[moduleId] = {};
                }
                settings[moduleId].isEnabled = isEnabled;

                // Save to unified storage
                chrome.storage.local.set({ sidekick_settings: settings }, () => {
                    console.log(`⚙️ Module ${moduleId}: ${isEnabled ? 'ON' : 'OFF'}`);
                    showMessage(`${moduleId.replace(/-/g, ' ')} ${isEnabled ? 'enabled' : 'disabled'}`, 'success');

                    // ALSO save to legacy format for backwards compatibility
                    const legacyKey = `sidekick_${moduleId.replace(/-/g, '_')}`;
                    chrome.storage.local.set({ [legacyKey]: { isEnabled } }, () => {
                        console.log(`💾 Also saved to legacy key: ${legacyKey}`);
                    });


                    // Emit notification for Block Training toggles
                    if (moduleId === 'blocktraining') {
                        console.log('🔍 Block training toggle detected, isEnabled:', isEnabled);
                        chrome.tabs.query({ active: true, url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function (tabs) {
                            console.log('🔍 Found tabs:', tabs.length, tabs);
                            if (tabs[0]) {
                                console.log('📬 Sending notification to tab:', tabs[0].id);
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    action: 'emitNotification',
                                    notification: {
                                        moduleId: 'blocktraining',
                                        type: isEnabled ? 'warning' : 'success',
                                        title: isEnabled ? 'Training Blocked' : 'Training Unblocked',
                                        message: isEnabled ? 'Gym access blocked to prevent accidental training' : 'Gym access restored'
                                    }
                                }).then(response => {
                                    console.log('✅ Notification message sent, response:', response);
                                }).catch(err => {
                                    console.error('❌ Failed to send notification:', err);
                                });
                            } else {
                                console.warn('⚠️ No active Torn tab found');
                            }
                        });
                    }


                    // Send message to content scripts to update module state
                    chrome.tabs.query({ url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function (tabs) {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'updateModuleSettings',
                                moduleId: moduleId,
                                settings: settings[moduleId]
                            }).catch(() => { }); // Ignore errors for tabs without content script
                        });
                    });
                });
            });
        });
    });

    // Listen for storage changes from settings page
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.sidekick_settings) {
            const newSettings = changes.sidekick_settings.newValue || {};

            // Update all toggle states
            featureToggles.forEach(toggle => {
                const moduleId = toggle.dataset.module;
                if (!moduleId) return;

                const moduleSettings = newSettings[moduleId];
                const isEnabled = moduleSettings ? moduleSettings.isEnabled !== false : true;

                // Only update if changed to avoid unnecessary reflows
                if (toggle.checked !== isEnabled) {
                    toggle.checked = isEnabled;
                    console.log(`🔄 Synced ${moduleId}: ${isEnabled ? 'ON' : 'OFF'}`);
                }
            });
        }
    });

    // ========================================
    // NOTIFICATION SYSTEM
    // ========================================

    // Load and display notifications
    async function loadNotifications() {
        try {
            // Get notifications directly from chrome.storage
            const result = await chrome.storage.local.get(['sidekick_notifications', 'sidekick_notification_preferences']);
            const allNotifications = result.sidekick_notifications || [];
            const preferences = result.sidekick_notification_preferences || {};

            console.log('📬 DEBUG: All notifications from storage:', allNotifications);
            console.log('📬 DEBUG: Preferences:', preferences);

            // Get recent 10
            const recent = allNotifications.slice(0, 10);

            // Filter based on preferences
            const filtered = recent.filter(n => {
                const pref = preferences[n.moduleId];
                if (!pref) return true; // Show if no preference set

                // Check if this notification type is enabled for this module
                const typeEnabled = pref[n.type.toLowerCase()];
                return typeEnabled !== false; // Show unless explicitly disabled
            });

            console.log('📬 Loaded notifications:', filtered.length, 'of', recent.length);
            console.log('📬 DEBUG: Filtered notifications:', filtered);
            renderNotifications(filtered);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // Render notifications
    function renderNotifications(notifications) {
        const container = document.getElementById('notifications-container');
        const emptyState = document.getElementById('emptyState');

        if (notifications.length === 0) {
            emptyState.style.display = 'block';
            // Remove any existing notification cards
            container.querySelectorAll('.notification-card').forEach(card => card.remove());
            return;
        }

        emptyState.style.display = 'none';

        // Clear existing notifications
        container.querySelectorAll('.notification-card').forEach(card => card.remove());

        // Render each notification
        notifications.forEach(notification => {
            const card = createNotificationCard(notification);
            container.insertBefore(card, emptyState);
        });
    }

    // Create a notification card element
    function createNotificationCard(notification) {
        const card = document.createElement('div');
        card.className = `notification-card ${notification.type} ${!notification.read ? 'unread' : ''}`;
        card.dataset.id = notification.id;

        const timeAgo = getTimeAgo(notification.timestamp);

        card.innerHTML = `
            <div class="notification-card-header">
                <div class="notification-card-title">${notification.title}</div>
                <div class="notification-card-time">${timeAgo}</div>
            </div>
            ${notification.message ? `<div class="notification-card-message">${notification.message}</div>` : ''}
        `;

        // Handle click
        card.addEventListener('click', async () => {
            // Mark as read
            await NotificationCenter.markAsRead(notification.id);
            card.classList.remove('unread');

            // Handle action if present
            if (notification.action?.type === 'openModule') {
                // Send message to content script to open module
                chrome.tabs.query({ active: true, currentWindow: true, url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function (tabs) {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'openModule',
                            moduleId: notification.action.moduleId
                        });
                        window.close();
                    }
                });
            }
        });

        return card;
    }

    // Helper: Get time ago string
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    // Clear All button
    document.getElementById('clearAllNotifications')?.addEventListener('click', async () => {
        await NotificationCenter.clearAll();
        loadNotifications();
        showMessage('All notifications cleared', 'info');
    });

    // Preferences toggle
    const togglePreferencesBtn = document.getElementById('togglePreferences');
    const preferencesContent = document.getElementById('preferencesContent');
    const preferencesChevron = document.getElementById('preferencesChevron');

    togglePreferencesBtn?.addEventListener('click', () => {
        const isHidden = preferencesContent.style.display === 'none';
        preferencesContent.style.display = isHidden ? 'block' : 'none';
        preferencesChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Load preferences and set checkboxes
    async function loadPreferences() {
        const result = await chrome.storage.local.get('sidekick_notification_preferences');
        const preferences = result.sidekick_notification_preferences || {};

        // Set type checkboxes
        document.querySelectorAll('.pref-type').forEach(checkbox => {
            const type = checkbox.dataset.type;
            checkbox.checked = preferences.types?.[type] !== false;
        });

        // Set module checkboxes
        document.querySelectorAll('.pref-module').forEach(checkbox => {
            const module = checkbox.dataset.module;
            checkbox.checked = preferences.modules?.[module] !== false;
        });
    }

    // Handle preference changes
    document.querySelectorAll('.pref-type').forEach(checkbox => {
        checkbox.addEventListener('change', async () => {
            await NotificationPreferences.toggleType(checkbox.dataset.type);
            loadNotifications(); // Refresh displayed notifications
        });
    });

    document.querySelectorAll('.pref-module').forEach(checkbox => {
        checkbox.addEventListener('change', async () => {
            await NotificationPreferences.toggleModule(checkbox.dataset.module);
            loadNotifications(); // Refresh displayed notifications
        });
    });

    // Initialize notifications when Notifications tab is clicked
    document.querySelector('[data-tab="notifications"]')?.addEventListener('click', () => {
        loadNotifications();
        loadPreferences();
    });

    // Load notifications immediately if on notifications tab
    if (document.getElementById('notifications-tab')?.classList.contains('active')) {
        loadNotifications();
        loadPreferences();
    }

    // ========================================
    // END NOTIFICATION SYSTEM
    // ========================================

    // Remove module settings buttons logic since features don't have settings buttons

    // Get DOM elements
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const reportIssuesBtn = document.getElementById('reportIssuesBtn');
    const trainingBlockerToggle = document.getElementById('trainingBlockerToggle');

    // Load training blocker status
    loadTrainingBlockerStatus();

    // Open Settings (cogwheel panel)
    openSettingsBtn.addEventListener('click', () => {
        // Send message to active Torn.com tab to open settings panel
        chrome.tabs.query({ active: true, currentWindow: true, url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'openSettings'
                }).then(response => {
                    if (response && response.success) {
                        showMessage('Settings panel opened!', 'success');
                        setTimeout(() => window.close(), 500);
                    } else {
                        showMessage('Please navigate to Torn.com to access settings', 'warning');
                    }
                }).catch(() => {
                    showMessage('Please navigate to Torn.com to access settings', 'warning');
                });
            } else {
                showMessage('Please navigate to Torn.com to access settings', 'warning');
            }
        });
    });

    // Report Issues (Bug Reporter)
    reportIssuesBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true, url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'openBugReporter'
                }).then(response => {
                    if (response && response.success) {
                        showMessage('Bug reporter opened!', 'success');
                        setTimeout(() => window.close(), 500);
                    } else {
                        showMessage('Please navigate to Torn.com to report bugs', 'warning');
                    }
                }).catch(() => {
                    showMessage('Please navigate to Torn.com to report bugs', 'warning');
                });
            } else {
                showMessage('Please navigate to Torn.com to report bugs', 'warning');
            }
        });
    });

    // Training Blocker Toggle
    if (trainingBlockerToggle) {
        trainingBlockerToggle.addEventListener('change', () => {
            const isEnabled = trainingBlockerToggle.checked;

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('torn.com')) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleTrainingBlocker',
                        enabled: isEnabled
                    }).then(response => {
                        if (response && response.success) {
                            showMessage(isEnabled ? 'Training blocker enabled!' : 'Training blocker disabled!', 'success');
                        } else {
                            showMessage('Failed to toggle. Try refreshing the page.', 'warning');
                            trainingBlockerToggle.checked = !isEnabled;
                        }
                    }).catch(err => {
                        console.error('Failed to toggle training blocker:', err);
                        showMessage('Error toggling blocker. Try refreshing the page.', 'warning');
                        trainingBlockerToggle.checked = !isEnabled;
                    });
                } else {
                    showMessage('Please navigate to Torn.com', 'warning');
                    trainingBlockerToggle.checked = false;
                }
            });
        });
    }

    loadExtensionInfo();

    function loadTrainingBlockerStatus() {
        chrome.storage.local.get(['sidekick_block_training'], function (result) {
            if (trainingBlockerToggle && result.sidekick_block_training) {
                trainingBlockerToggle.checked = result.sidekick_block_training.isBlocked === true;
            }
        });
    }

    function showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        const bgColor = type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'warning' ? 'rgba(255, 152, 0, 0.9)' : 'rgba(33, 150, 243, 0.9)';
        messageEl.style.cssText = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 12px 20px; background: ${bgColor}; color: white; border-radius: 6px; font-size: 13px; font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);`;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
    }






    function loadExtensionInfo() {
        chrome.storage.local.get(['sidekick_api_key'], function (result) {
            console.log('📦 API Key configured:', !!(result.sidekick_api_key));
        });
    }
});
