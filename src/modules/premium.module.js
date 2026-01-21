/**
 * Sidekick Chrome Extension - Premium Subscription Module
 * Handles Xanax-based subscription tracking for premium features
 * Pattern: Identical to TDup's subscription system
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("💎 Loading Sidekick Premium Module...");

    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    const PremiumModule = {
        isInitialized: false,

        // Configuration
        CREATOR_ID: 2906949,  // Machiacelli's Torn ID
        ADMIN_ID: 2407280,    // Admin ID (has unlimited premium) - CORRECTED
        XANAX_ID: 208,        // Xanax item ID in Torn
        DAYS_PER_XANAX: 15,   // 1 Xanax = 15 days subscription

        // Admin whitelist (only these users get unlimited premium + admin panel)
        adminWhitelist: [2407280], // Machiacelli - CORRECTED ID

        subscriptionExpires: null,
        apiKey: null,

        async init() {
            if (this.isInitialized) {
                console.log('⚠️ Premium module already initialized');
                return;
            }

            console.log('💎 Initializing Premium Module...');

            // Check for Core module
            if (!window.SidekickModules?.Core?.ChromeStorage) {
                console.error('❌ Core module not available for Premium');
                return;
            }

            await this.loadSettings();
            await this.loadSubscription();

            // Update subscription on init (check for new payments)
            if (this.apiKey) {
                await this.updateSubscription();
            }

            this.isInitialized = true;
            console.log('✅ Premium Module initialized successfully');
        },

        async loadSettings() {
            try {
                this.apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key') || null;
                console.log('🔑 API Key loaded:', this.apiKey ? 'SET' : 'NOT SET');
            } catch (error) {
                console.error('❌ Failed to load Premium settings:', error);
            }
        },

        async loadSubscription() {
            try {
                const expires = await window.SidekickModules.Core.ChromeStorage.get('sidekick_premium_expires');
                this.subscriptionExpires = expires || null;
                console.log('💎 Subscription loaded:', this.subscriptionExpires ? new Date(this.subscriptionExpires).toLocaleDateString() : 'NOT ACTIVE');
            } catch (error) {
                console.error('❌ Failed to load subscription:', error);
            }
        },

        async saveSubscription() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set('sidekick_premium_expires', this.subscriptionExpires);
                console.log('💾 Subscription saved:', this.subscriptionExpires ? new Date(this.subscriptionExpires).toLocaleDateString() : 'NONE');
            } catch (error) {
                console.error('❌ Failed to save subscription:', error);
            }
        },

        // Cached verification status (5 minutes)
        cachedStatus: null,
        cacheExpiry: 0,

        // Worker URL
        WORKER_URL: 'https://sidekick-premium.akaffebtd.workers.dev',

        // Verify premium status with server (PAYWALL REMOVED - Always returns active)
        async verifyPremium(forceRefresh = false) {
            console.log('💎 Premium check bypassed - always active');
            return {
                success: true,
                premium: {
                    active: true,
                    daysRemaining: 999,
                    expiresAt: null
                },
                isAdmin: true
            };
        },

        // Check if user is admin (PAYWALL REMOVED - Always returns true)
        async isAdmin() {
            return true;
        },

        // Check if user has active subscription (PAYWALL REMOVED - Always returns true)
        async isSubscribed() {
            return true;
        },

        // Get remaining subscription time in days
        async getRemainingDays() {
            const status = await this.verifyPremium();
            return status.premium?.daysRemaining || 0;
        },

        // Read Xanax payments from Torn API logs
        async readXanaxPayments() {
            if (!this.apiKey) {
                console.warn('⚠️ No API key for premium subscription check');
                return 0;
            }

            try {
                console.log('💎 Checking for Xanax payments...');

                // Fetch user logs (items category)
                const url = `https://api.torn.com/user/?selections=log&key=${encodeURIComponent(this.apiKey)}`;
                const response = await fetch(url);

                if (!response.ok) {
                    console.error('❌ API request failed:', response.status);
                    return 0;
                }

                const data = await response.json();

                if (data.error) {
                    console.error('❌ API Error:', data.error.error);
                    return 0;
                }

                let totalXanax = 0;

                // Process logs
                if (data.log) {
                    for (const logId in data.log) {
                        const log = data.log[logId];

                        // Only process item logs
                        if (log.category !== 'items') continue;

                        // Only process "send" sublogs
                        if (!log.log || !log.log.includes('sent')) continue;

                        // Check if sent TO the creator
                        if (!log.data || log.data.to_id !== this.CREATOR_ID) continue;

                        // Check items array for Xanax
                        if (log.data.items && Array.isArray(log.data.items)) {
                            for (const item of log.data.items) {
                                if (item.ID === this.XANAX_ID) {
                                    totalXanax += item.amount || 0;
                                    console.log(`💎 Found Xanax payment: ${item.amount}x`);
                                }
                            }
                        }
                    }
                }

                console.log(`💎 Total Xanax sent to creator: ${totalXanax}`);
                return totalXanax;

            } catch (error) {
                console.error('❌ Failed to read Xanax payments:', error);
                return 0;
            }
        },

        // Update subscription based on Xanax payments (server-side)
        async updateSubscription() {
            console.log('🔄 Refreshing subscription status with server...');

            try {
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                if (!apiKey) {
                    console.warn('⚠️ No API key for subscription update');
                    return;
                }

                // Call server to process payment
                const response = await fetch(`${this.WORKER_URL}/process-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey })
                });

                if (!response.ok) {
                    console.error('❌ Payment processing failed:', response.status);
                    return;
                }

                const data = await response.json();

                if (!data.success) {
                    console.log('💎 No new payments found');
                    return;
                }

                if (data.xanaxCount === 0) {
                    console.log('💎 No Xanax payments found');
                    return;
                }

                console.log(`💎 Subscription updated! ${data.message}`);

                // Clear cache to force refresh
                this.cachedStatus = null;
                this.cacheExpiry = 0;

                // Refresh dialog if open
                const dialog = document.getElementById('premium-subscription-info');
                if (dialog) {
                    const status = await this.verifyPremium(true);
                    dialog.innerHTML = this.renderSubscriptionInfo(status);
                }

                // Show notification
                if (window.SidekickModules?.UI?.showNotification) {
                    window.SidekickModules.UI.showNotification(
                        'Premium Subscription',
                        data.message,
                        'success'
                    );
                }
            } catch (error) {
                console.error('❌ Failed to update subscription:', error);
            }
        },

        // Render locked UI for premium features
        renderLockedUI(featureName = 'this feature') {
            return `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1));
                    border: 2px solid rgba(255,215,0,0.3);
                    border-radius: 12px;
                    text-align: center;
                    color: #fff;
                ">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                    <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">Premium Feature</div>
                    <div style="font-size: 14px; color: #ccc; margin-bottom: 20px;">
                        ${featureName} requires an active premium subscription
                    </div>
                    <div style="
                        background: rgba(255,215,0,0.2);
                        border: 1px solid rgba(255,215,0,0.4);
                        padding: 16px;
                        border-radius: 8px;
                        max-width: 400px;
                    ">
                        <div style="font-size: 12px; margin-bottom: 12px; line-height: 1.6;">
                            <strong>How to Subscribe:</strong><br>
                            Send Xanax (ID: 208) to <strong>Machiacelli [${this.CREATOR_ID}]</strong><br>
                            <br>
                            <strong>1 Xanax = ${this.DAYS_PER_XANAX} days</strong><br>
                            <br>
                            ⚠️ <strong>Important:</strong> Use "Send Item" only!<br>
                            (Not trade, parcel, or faction delivery)
                        </div>
                        <button onclick="window.open('https://www.torn.com/messages.php#/p=compose&XID=${this.CREATOR_ID}', '_blank')" style="
                            background: linear-gradient(135deg, #FFD700, #FFA500);
                            border: none;
                            color: #000;
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: bold;
                            cursor: pointer;
                            font-size: 12px;
                            width: 100%;
                        ">Contact Creator</button>
                    </div>
                </div>
            `;
        },

        // Render subscription info panel
        async renderSubscriptionInfo() {
            const status = await this.verifyPremium();
            const isActive = status.premium?.active || false;
            const daysRemaining = status.premium?.daysRemaining || 0;

            return `
                <div id="premium-subscription-info" style="
                    background: ${isActive ? 'linear-gradient(135deg, rgba(76,175,80,0.2), rgba(56,142,60,0.2))' : 'linear-gradient(135deg, rgba(244,67,54,0.2), rgba(211,47,47,0.2))'};
                    border: 1px solid ${isActive ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)'};
                    padding: 16px;
                    border-radius: 8px;
                    margin: 12px 0;
                    color: #fff;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="font-size: 32px;">${isActive ? '💎' : '🔒'}</div>
                        <div>
                            <div style="font-weight: bold; font-size: 16px;">
                                ${isActive ? 'Premium Active' : 'Premium Inactive'}
                            </div>
                            <div style="font-size: 12px; color: #ccc;">
                                ${isActive
                    ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                    : 'Send Xanax to activate'
                }
                            </div>
                        </div>
                    </div>
                    ${isActive && status.premium?.expiresAt ? `
                        <div style="font-size: 11px; color: #aaa;">
                            Expires: ${new Date(status.premium.expiresAt).toLocaleString()}
                        </div>
                    ` : `
                        <div style="font-size: 11px; line-height: 1.6;">
                            Send Xanax (ID: 208) to <strong>Machiacelli [${this.CREATOR_ID}]</strong><br>
                            1 Xanax = ${this.DAYS_PER_XANAX} days | Use "Send Item" only
                        </div>
                    `}
                    <button onclick="window.SidekickModules.Premium.updateSubscription()" style="
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: #fff;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        margin-top: 8px;
                        width: 100%;
                    ">Refresh Subscription</button>
                </div>
            `;
        },

        // Grant premium to a user (admin only - server-side)
        async grantPremium(userTornId, days) {
            console.log('👑 Attempting to grant premium...');

            try {
                const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                if (!apiKey) {
                    console.error('❌ No API key for grant');
                    return false;
                }

                // Call server to grant premium
                const response = await fetch(`${this.WORKER_URL}/grant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        adminApiKey: apiKey,
                        targetUserId: parseInt(userTornId),
                        days: parseInt(days)
                    })
                });

                if (!response.ok) {
                    console.error('❌ Grant request failed:', response.status);
                    return false;
                }

                const data = await response.json();

                if (!data.success) {
                    console.error('❌ Grant failed:', data.error);
                    alert(`Failed: ${data.error}`);
                    return false;
                }

                console.log('✅ Premium granted successfully:', data.granted);

                if (window.SidekickModules?.UI?.showNotification) {
                    window.SidekickModules.UI.showNotification(
                        'Premium Granted',
                        `Granted ${days} days to user ${userTornId}`,
                        'success'
                    );
                }

                return true;
            } catch (error) {
                console.error('❌ Failed to grant premium:', error);
                alert(`Error: ${error.message}`);
                return false;
            }
        },

        // Show subscription dialog
        async showSubscriptionDialog() {
            console.log('💎 Opening premium subscription dialog...');

            // Clear cache to force fresh data
            this.cachedStatus = null;
            this.cacheExpiry = 0;

            // First refresh the subscription to get latest data
            await this.updateSubscription();

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                color: #fff;
            `;

            // Await the async renderSubscriptionInfo
            const subscriptionHTML = await this.renderSubscriptionInfo();

            dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">💎</div>
                    <div style="font-size: 24px; font-weight: bold;">Sidekick Premium</div>
                </div>
                
                ${subscriptionHTML}
                
                <button id="close-premium-dialog" style="
                    background: #444;
                    border: 1px solid #666;
                    color: #fff;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    width: 100%;
                    margin-top: 12px;
                ">Close</button>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Close handlers
            document.getElementById('close-premium-dialog').addEventListener('click', () => {
                overlay.remove();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        },

        // Show admin panel (FIXED ASYNC BUG)
        async showAdminPanel() {
            // Server-side verification with await
            if (!(await this.isAdmin())) {
                console.error('❌ Admin access denied by server');
                alert('Access Denied: Admin privileges required');
                return;
            }

            console.log('👑 Admin verified - showing panel');

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const panel = document.createElement('div');
            panel.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                color: #fff;
            `;

            panel.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">👑</div>
                    <div style="font-size: 24px; font-weight: bold; color: #FFD700;">Admin Panel</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Premium Management</div>
                </div>
                
                <div style="background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 12px;">Grant Premium Access</div>
                    <input type="number" id="grant-user-id" placeholder="User Torn ID" style="
                        width: 100%;
                        padding: 8px 12px;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 4px;
                        color: #fff;
                        margin-bottom: 8px;
                        box-sizing: border-box;
                    ">
                    <input type="number" id="grant-days" placeholder="Days" value="30" style="
                        width: 100%;
                        padding: 8px 12px;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 4px;
                        color: #fff;
                        margin-bottom: 12px;
                        box-sizing: border-box;
                    ">
                    <button id="grant-premium-btn" style="
                        background: linear-gradient(135deg, #FFD700, #FFA500);
                        border: none;
                        color: #000;
                        padding: 10px 20px;
                        border-radius: 6px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                    ">Grant Premium</button>
                </div>
                
                <div style="font-size: 11px; opacity: 0.6; margin-bottom: 12px;">
                    <strong>Console Commands:</strong><br>
                    <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">window.SidekickModules.Premium.grantPremium(userId, days)</code>
                </div>
                
                <button id="close-admin-panel" style="
                    background: #444;
                    border: 1px solid #666;
                    color: #fff;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                ">Close</button>
            `;

            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            // Grant button handler
            document.getElementById('grant-premium-btn').addEventListener('click', async () => {
                const userId = document.getElementById('grant-user-id').value.trim();
                const days = document.getElementById('grant-days').value.trim();

                console.log('🔍 Grant Premium clicked');
                console.log('📝 User ID input:', userId);
                console.log('📝 Days input:', days);

                if (!userId || !days || userId === '' || days === '') {
                    console.error('❌ Validation failed - missing inputs');
                    alert('Please enter both User ID and Days');
                    return;
                }

                console.log('✅ Validation passed, calling grantPremium...');
                const success = await this.grantPremium(parseInt(userId), parseInt(days));
                if (success) {
                    document.getElementById('grant-user-id').value = '';
                    alert(`✅ Granted ${days} days to user ${userId}`);
                }
            });

            // Close handlers
            document.getElementById('close-admin-panel').addEventListener('click', () => {
                overlay.remove();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        },

        // Show subscription info dialog
        showSubscriptionDialog() {
            // Create dialog overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;

            dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 12px;">💎</div>
                    <div style="font-size: 24px; font-weight: bold; color: #FFD700;">Sidekick Premium</div>
                </div>
                ${this.renderSubscriptionInfo()}
                <button id="close-premium-dialog" style="
                    background: #444;
                    border: 1px solid #666;
                    color: #fff;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    width: 100%;
                    margin-top: 12px;
                ">Close</button>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Close handlers
            document.getElementById('close-premium-dialog').addEventListener('click', () => {
                overlay.remove();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        }
    };

    // Export to global scope
    window.SidekickModules.Premium = PremiumModule;
    console.log('✅ Premium Module loaded and ready');

})();
