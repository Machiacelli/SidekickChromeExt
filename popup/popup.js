/**
 * Sidekick Chrome Extension - Popup Script V2
 * Handles the extension popup interface (Notification Center)
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log('📬 Sidekick Notification Center loaded');

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


    // Load premium subscription status
    loadPremiumStatus();

    // Premium action button
    const premiumActionBtn = document.getElementById('premiumActionBtn');
    if (premiumActionBtn) {
        premiumActionBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true, url: ['https://www.torn.com/*', 'https://*.torn.com/*'] }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'showPremiumDialog'
                    });
                    window.close();
                }
            });
        });
    }

    async function loadPremiumStatus() {
        const premiumIcon = document.getElementById('premiumIcon');
        const premiumLabel = document.getElementById('premiumLabel');
        const premiumDays = document.getElementById('premiumDays');
        const premiumDetails = document.getElementById('premiumDetails');
        const premiumActionBtn = document.getElementById('premiumActionBtn');
        const premiumStatus = document.getElementById('premiumStatus');

        // Get stored data
        const result = await chrome.storage.local.get(['sidekick_premium_expires', 'sidekick_api_key']);
        let expiresAt = result.sidekick_premium_expires;

        // Check for admin-granted premium
        if (result.sidekick_api_key && !expiresAt) {
            try {
                const response = await fetch(`https://api.torn.com/user/?selections=basic&key=${result.sidekick_api_key}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.player_id) {
                        const grantKey = `sidekick_premium_grant_${data.player_id}`;
                        const grantResult = await chrome.storage.local.get([grantKey]);
                        if (grantResult[grantKey] && grantResult[grantKey].expiresAt) {
                            expiresAt = grantResult[grantKey].expiresAt;
                            console.log('💎 Found admin-granted premium:', new Date(expiresAt));
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Failed to check admin-granted premium in popup:', error);
            }
        }

        // Display premium status
        if (!expiresAt || Date.now() >= expiresAt) {
            // Not subscribed
            premiumIcon.textContent = '🔒';
            premiumLabel.textContent = 'Premium Inactive';
            premiumDays.textContent = 'Not active';
            premiumDetails.innerHTML = 'Send Xanax to Machiacelli to unlock premium features';
            premiumActionBtn.textContent = 'Learn More';
            premiumStatus.style.borderColor = 'rgba(244, 67, 54, 0.3)';
        } else {
            // Active subscription
            const remaining = expiresAt - Date.now();
            const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));

            premiumIcon.textContent = '💎';
            premiumLabel.textContent = 'Premium Active';
            premiumDays.textContent = `${days} day${days !== 1 ? 's' : ''} left`;
            premiumDetails.innerHTML = `Expires: ${new Date(expiresAt).toLocaleDateString()}`;
            premiumActionBtn.textContent = 'View Details';
            premiumStatus.style.borderColor = 'rgba(76, 175, 80, 0.5)';
            premiumStatus.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(56, 142, 60, 0.1))';
        }
    }

    function loadExtensionInfo() {
        chrome.storage.local.get(['sidekick_api_key'], function (result) {
            console.log('📦 API Key configured:', !!(result.sidekick_api_key));
        });
    }
});
