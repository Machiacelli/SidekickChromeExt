/**
 * Sidekick Chrome Extension - Core Module
 * Handles storage, notifications, and core functionality
 * Converted from Tampermonkey userscript to Chrome extension
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    "use strict";

    // Ensure SidekickModules namespace exists
    if (!window.SidekickModules) {
        window.SidekickModules = {};
    }

    console.log("🔧 Loading Sidekick Core Module...");

    // === CORE STORAGE SYSTEM ===
    const STORAGE_KEYS = {
        NOTEPADS: 'sidekick_notepads',
        TODO_LISTS: 'sidekick_todo_lists',
        ATTACK_LISTS: 'sidekick_attack_lists',
        API_KEY: 'sidekick_api_key',
        SIDEBAR_STATE: 'sidekick_sidebar_state',
        SIDEBAR_WIDTH: 'sidekick_sidebar_width'
    };

    // === NOTIFICATION SYSTEM ===
    const NotificationSystem = {
        notifications: [], // Track active notifications
        baseTop: 20, // Fixed top position for new notifications
        minSpacing: 15, // Minimum spacing between notifications
        
        show(title, message, type = 'info', duration = 4000) {
            // Prevent duplicate notifications with same message
            const existingNotification = this.notifications.find(n => 
                n.element && n.element.textContent.includes(message)
            );
            if (existingNotification) {
                console.log('🔔 Duplicate notification prevented:', message);
                return;
            }
            
            const notification = document.createElement('div');
            notification.className = `sidekick-notification ${type}`;
            
            // Create unique ID for this notification
            const notificationId = Date.now() + Math.random();
            notification.dataset.notificationId = notificationId;
            
            notification.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 13px; opacity: 0.9;">${message}</div>
            `;
            
            // Enhanced notification styles with better positioning
            const baseStyle = `
                position: fixed;
                right: 20px;
                width: 320px;
                max-width: 90vw;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                cursor: pointer;
                transform: translateX(100%);
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            `;
            
            const typeStyles = {
                'info': baseStyle + 'background: rgba(33, 150, 243, 0.95); color: white; padding: 16px;',
                'success': baseStyle + 'background: rgba(76, 175, 80, 0.95); color: white; padding: 16px;',
                'warning': baseStyle + 'background: rgba(255, 152, 0, 0.95); color: white; padding: 16px;',
                'error': baseStyle + 'background: rgba(244, 67, 54, 0.95); color: white; padding: 16px;'
            };
            
            notification.style.cssText = typeStyles[type] || typeStyles['info'];
            
            // Calculate position for new notification
            const newPosition = this.calculateNewNotificationPosition();
            notification.style.top = newPosition + 'px';
            notification.style.zIndex = 999999 + this.notifications.length;
            
            // Add click to dismiss functionality
            notification.addEventListener('click', () => {
                this.removeNotification(notificationId);
            });
            
            // Add to DOM and trigger slide-in animation
            document.body.appendChild(notification);
            
            // Trigger slide-in animation
            requestAnimationFrame(() => {
                notification.style.transform = 'translateX(0)';
            });
            
            // Add new notification to array
            this.notifications.push({
                id: notificationId,
                element: notification,
                position: newPosition
            });
            
            // Auto remove with repositioning
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, duration);
        },
        
        calculateNewNotificationPosition() {
            if (this.notifications.length === 0) {
                return this.baseTop;
            }
            
            // Find the bottom-most notification and add spacing
            let maxBottom = this.baseTop;
            this.notifications.forEach(notification => {
                if (notification.element && notification.element.parentNode) {
                    const rect = notification.element.getBoundingClientRect();
                    const currentBottom = notification.position + rect.height;
                    maxBottom = Math.max(maxBottom, currentBottom);
                }
            });
            
            return maxBottom + this.minSpacing;
        },
        
        removeNotification(notificationId) {
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex === -1) return;
            
            const notification = this.notifications[notificationIndex];
            
            // Animate out
            if (notification.element && notification.element.parentNode) {
                notification.element.style.transform = 'translateX(100%)';
                notification.element.style.opacity = '0';
                
                setTimeout(() => {
                    if (notification.element && notification.element.parentNode) {
                        notification.element.parentNode.removeChild(notification.element);
                    }
                    
                    // Remove from array
                    this.notifications.splice(notificationIndex, 1);
                    
                    // Reposition remaining notifications to fill gaps
                    this.repositionNotifications();
                }, 300);
            } else {
                // Remove from array if element is already gone
                this.notifications.splice(notificationIndex, 1);
            }
        },
        
        repositionNotifications() {
            // Clean up dead notifications first
            this.notifications = this.notifications.filter(n => 
                n.element && n.element.parentNode
            );
            
            // Reposition all notifications from top to bottom with proper spacing
            let currentTop = this.baseTop;
            
            this.notifications.forEach((notification, index) => {
                if (notification.element && notification.element.parentNode) {
                    const targetTop = currentTop;
                    
                    // Only animate if position actually changed
                    if (notification.position !== targetTop) {
                        notification.position = targetTop;
                        notification.element.style.transition = 'top 0.3s ease';
                        notification.element.style.top = targetTop + 'px';
                    }
                    
                    // Calculate next position
                    const rect = notification.element.getBoundingClientRect();
                    currentTop += rect.height + this.minSpacing;
                }
            });
        },

        // Clear all existing notifications
        clearAll() {
            this.notifications.forEach(notification => {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            });
            this.notifications = [];
        }
    };
    // === CHROME STORAGE WRAPPER ===
    const ChromeStorage = {
        // Get data from Chrome storage
        async get(key) {
            return new Promise((resolve, reject) => {
                // Check if extension context is valid
                try {
                    if (chrome?.runtime?.id === undefined) {
                        // Silently fall back to localStorage when extension context is invalidated
                        resolve(JSON.parse(localStorage.getItem(key) || 'null'));
                        return;
                    }
                } catch (error) {
                    // Silently fall back to localStorage when Chrome runtime check fails
                    resolve(JSON.parse(localStorage.getItem(key) || 'null'));
                    return;
                }

                if (chrome?.storage?.local) {
                    try {
                        chrome.storage.local.get([key], (result) => {
                            if (chrome.runtime.lastError) {
                                const errorMsg = chrome.runtime.lastError.message || 'Chrome storage error';
                                if (errorMsg.includes('Extension context invalidated')) {
                                    console.debug("Extension context invalidated during get, using localStorage");
                                    resolve(JSON.parse(localStorage.getItem(key) || 'null'));
                                } else {
                                    reject(new Error(errorMsg));
                                }
                            } else {
                                resolve(result[key]);
                            }
                        });
                    } catch (error) {
                        if (error.message && error.message.includes('Extension context invalidated')) {
                            console.debug("Extension context invalidated, using localStorage fallback");
                            resolve(JSON.parse(localStorage.getItem(key) || 'null'));
                        } else {
                            reject(error);
                        }
                    }
                } else {
                    console.debug("Chrome storage not available, using localStorage");
                    resolve(JSON.parse(localStorage.getItem(key) || 'null'));
                }
            });
        },

        // Set data in Chrome storage
        async set(key, value) {
            return new Promise((resolve, reject) => {
                // Check if extension context is valid
                try {
                    if (chrome?.runtime?.id === undefined) {
                        // Silently fall back to localStorage when extension context is invalidated
                        console.debug("Extension context invalidated, using localStorage fallback");
                        localStorage.setItem(key, JSON.stringify(value));
                        resolve();
                        return;
                    }
                } catch (error) {
                    console.debug("Chrome runtime check failed, using localStorage fallback");
                    localStorage.setItem(key, JSON.stringify(value));
                    resolve();
                    return;
                }

                if (chrome?.storage?.local) {
                    try {
                        chrome.storage.local.set({ [key]: value }, () => {
                            if (chrome.runtime.lastError) {
                                const errorMsg = chrome.runtime.lastError.message || 'Chrome storage error';
                                if (errorMsg.includes('Extension context invalidated')) {
                                    console.debug("Extension context invalidated during set, using localStorage");
                                    localStorage.setItem(key, JSON.stringify(value));
                                    resolve();
                                } else {
                                    reject(new Error(errorMsg));
                                }
                            } else {
                                resolve();
                            }
                        });
                    } catch (error) {
                        if (error.message && error.message.includes('Extension context invalidated')) {
                            console.debug("Extension context invalidated, using localStorage fallback");
                            localStorage.setItem(key, JSON.stringify(value));
                            resolve();
                        } else {
                            reject(error);
                        }
                    }
                } else {
                    console.debug("Chrome storage not available, using localStorage");
                    localStorage.setItem(key, JSON.stringify(value));
                    resolve();
                }
            });
        },

        // Remove data from Chrome storage
        async remove(key) {
            return new Promise((resolve, reject) => {
                // Check if extension context is valid
                try {
                    if (chrome?.runtime?.id === undefined) {
                        console.debug("Extension context invalidated, using localStorage fallback");
                        localStorage.removeItem(key);
                        resolve();
                        return;
                    }
                } catch (error) {
                    console.debug("Chrome runtime check failed, using localStorage fallback");
                    localStorage.removeItem(key);
                    resolve();
                    return;
                }

                if (chrome?.storage?.local) {
                    try {
                        chrome.storage.local.remove([key], () => {
                            if (chrome.runtime.lastError) {
                                const errorMsg = chrome.runtime.lastError.message || 'Chrome storage error';
                                if (errorMsg.includes('Extension context invalidated')) {
                                    console.debug("Extension context invalidated during remove, using localStorage");
                                    localStorage.removeItem(key);
                                    resolve();
                                } else {
                                    reject(new Error(errorMsg));
                                }
                            } else {
                                resolve();
                            }
                        });
                    } catch (error) {
                        if (error.message && error.message.includes('Extension context invalidated')) {
                            console.debug("Extension context invalidated, using localStorage fallback");
                            localStorage.removeItem(key);
                            resolve();
                        } else {
                            reject(error);
                        }
                    }
                } else {
                    console.debug("Chrome storage not available, using localStorage");
                    localStorage.removeItem(key);
                    resolve();
                }
            });
        },

        // Clear all storage
        async clear() {
            return new Promise((resolve, reject) => {
                // Check if extension context is valid
                try {
                    if (chrome?.runtime?.id === undefined) {
                        console.debug("Extension context invalidated, using localStorage fallback");
                        localStorage.clear();
                        resolve();
                        return;
                    }
                } catch (error) {
                    console.debug("Chrome runtime check failed, using localStorage fallback");
                    localStorage.clear();
                    resolve();
                    return;
                }

                if (chrome?.storage?.local) {
                    try {
                        chrome.storage.local.clear(() => {
                            if (chrome.runtime.lastError) {
                                const errorMsg = chrome.runtime.lastError.message || 'Chrome storage error';
                                if (errorMsg.includes('Extension context invalidated')) {
                                    console.debug("Extension context invalidated during clear, using localStorage");
                                    localStorage.clear();
                                    resolve();
                                } else {
                                    reject(new Error(errorMsg));
                                }
                            } else {
                                resolve();
                            }
                        });
                    } catch (error) {
                        if (error.message && error.message.includes('Extension context invalidated')) {
                            console.debug("Extension context invalidated, using localStorage fallback");
                            localStorage.clear();
                            resolve();
                        } else {
                            reject(error);
                        }
                    }
                } else {
                    console.debug("Chrome storage not available, using localStorage");
                    localStorage.clear();
                    resolve();
                }
            });
        }
    };

    // === EXTENSION CONTEXT MONITOR ===
    const ExtensionContextMonitor = {
        isMonitoring: false,
        monitorInterval: null,
        lastKnownState: null,

        // Start monitoring extension context
        startMonitoring() {
            if (this.isMonitoring) return;
            
            console.log('🔍 Starting extension context monitoring...');
            this.isMonitoring = true;
            this.lastKnownState = SafeMessageSender.isExtensionContextValid();
            
            this.monitorInterval = setInterval(() => {
                this.checkContextState();
            }, 5000); // Check every 5 seconds
        },

        // Stop monitoring
        stopMonitoring() {
            if (this.monitorInterval) {
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
            this.isMonitoring = false;
        },

        // Check current context state
        async checkContextState() {
            const currentState = SafeMessageSender.isExtensionContextValid();
            
            if (this.lastKnownState === true && currentState === false) {
                console.warn('🚨 Extension context invalidation detected by monitor');
                console.warn('📍 Context:', window.location.href);
                console.warn('🔗 Stack trace:', new Error().stack);
                
                // Immediate notification to user
                SafeMessageSender.showContextLossNotification();
                
                // Try recovery once automatically
                const recovered = await SafeMessageSender.attemptContextRecovery();
                if (recovered) {
                    this.lastKnownState = true;
                    console.log('✅ Extension context auto-recovered');
                    // Re-expose global functions after recovery
                    SafeMessageSender.reExposeGlobalFunctions();
                } else {
                    this.lastKnownState = false;
                    
                    // Notify user about context loss
                    if (window.SidekickModules?.Core?.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Extension Connection Lost',
                            'Some features may not work. Click to refresh page.',
                            'warning',
                            0,
                            () => { window.location.reload(); }
                        );
                    }
                }
            } else if (this.lastKnownState === false && currentState === true) {
                console.log('✅ Extension context restored');
                this.lastKnownState = true;
                
                if (window.SidekickModules?.Core?.NotificationSystem) {
                    window.SidekickModules.Core.NotificationSystem.show(
                        'Extension Reconnected',
                        'Extension connection has been restored.',
                        'success',
                        3000
                    );
                }
            }
        }
    };

    // === SAFE MESSAGE SENDER ===
    const SafeMessageSender = {
        // Safely send message to background script with extension context handling
        async sendToBackground(message, timeout = 30000, retryCount = 2) {
            let lastError = null;
            
            for (let attempt = 0; attempt < retryCount; attempt++) {
                try {
                    return await new Promise((resolve, reject) => {
                        try {
                            // Check if extension context is valid
                            if (!chrome?.runtime?.id) {
                                const error = new Error('Extension context invalidated');
                                console.warn(`🔄 Extension context check failed (attempt ${attempt + 1}/${retryCount}):`, message.action);
                                reject(error);
                                return;
                            }

                            const timeoutId = setTimeout(() => {
                                reject(new Error(`Background script timeout after ${timeout}ms`));
                            }, timeout);

                            chrome.runtime.sendMessage(message, (response) => {
                                clearTimeout(timeoutId);
                                
                                if (chrome.runtime.lastError) {
                                    const error = chrome.runtime.lastError.message;
                                    console.warn(`🔄 Runtime error (attempt ${attempt + 1}/${retryCount}):`, error);
                                    
                                    if (error.includes('Extension context invalidated') || error.includes('receiving end does not exist')) {
                                        reject(new Error('Extension context invalidated'));
                                    } else {
                                        reject(new Error(error));
                                    }
                                } else if (!response) {
                                    reject(new Error('No response from background script'));
                                } else {
                                    resolve(response);
                                }
                            });
                        } catch (error) {
                            console.warn(`🔄 Message send failed (attempt ${attempt + 1}/${retryCount}):`, error);
                            reject(error);
                        }
                    });
                } catch (error) {
                    lastError = error;
                    
                    if (error.message.includes('Extension context invalidated')) {
                        console.warn(`🔄 Extension context lost on attempt ${attempt + 1}/${retryCount}`);
                        
                        // Wait a bit before retrying
                        if (attempt < retryCount - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            console.log(`🔄 Retrying message send (${attempt + 2}/${retryCount})...`);
                        }
                    } else {
                        // Non-context errors should not be retried
                        break;
                    }
                }
            }
            
            // All retries failed
            if (lastError?.message.includes('Extension context invalidated')) {
                this.showExtensionReloadNotification();
            }
            
            throw lastError;
        },

        // Check if extension context is valid
        isExtensionContextValid() {
            try {
                return !!(chrome?.runtime?.id);
            } catch (error) {
                return false;
            }
        },

        // Show user-friendly notification about extension reload
        showExtensionReloadNotification() {
            // Try to recover connection first
            this.attemptContextRecovery()
                .then((recovered) => {
                    if (!recovered) {
                        this.showReloadPrompt();
                    } else {
                        console.log('✅ Extension context recovered successfully');
                        if (window.SidekickModules?.Core?.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Connection Restored',
                                'Extension connection has been restored.',
                                'success',
                                3000
                            );
                        }
                    }
                })
                .catch(() => {
                    this.showReloadPrompt();
                });
        },

        // Attempt to recover extension context
        async attemptContextRecovery() {
            console.log('🔄 Attempting to recover extension context...');
            
            for (let attempt = 1; attempt <= 3; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                
                try {
                    // Test if extension context is working
                    const testResponse = await chrome.runtime.sendMessage({ action: 'ping' });
                    if (testResponse?.success) {
                        console.log(`✅ Extension context recovered on attempt ${attempt}`);
                        return true;
                    }
                } catch (error) {
                    console.log(`❌ Recovery attempt ${attempt} failed:`, error.message);
                }
            }
            
            return false;
        },

        // Show immediate context loss notification
        showContextLossNotification() {
            console.error('🚨 CRITICAL: Extension context invalidated');
            console.error('📋 This typically happens when:');
            console.error('   - Extension was updated/reloaded');
            console.error('   - Extension permissions changed');
            console.error('   - Chrome updated the extension');
            console.error('💡 Solution: Reload the page to restore functionality');
            
            // Show prominent notification
            if (document.body) {
                const notification = document.createElement('div');
                notification.id = 'sidekick-context-loss-alert';
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #ff4444;
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    z-index: 999999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    max-width: 300px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                `;
                notification.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 8px;">🚨 Extension Connection Lost</div>
                    <div style="margin-bottom: 10px;">Sidekick extension context has been invalidated. Some features may not work.</div>
                    <button onclick="window.location.reload()" style="background: white; color: #ff4444; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Reload Page</button>
                    <button onclick="this.parentElement.remove()" style="background: transparent; color: white; border: 1px solid white; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-left: 8px;">Dismiss</button>
                `;
                document.body.appendChild(notification);
                
                // Auto-remove after 30 seconds
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 30000);
            }
        },

        // Re-expose global functions after context recovery
        reExposeGlobalFunctions() {
            try {
                console.log('🔧 Re-exposing global functions after context recovery...');
                
                // Re-inject debug functions into page context
                const script = document.createElement('script');
                script.textContent = `
                    // Re-expose Sidekick debug functions after context recovery
                    window.testExtensionConnection = function() {
                        console.log('🔗 Extension Connection Test (Post-Recovery)');
                        console.log('✅ Extension context recovered');
                        console.log('📦 Available modules:', Object.keys(window.SidekickModules || {}));
                        return { status: 'recovered', modules: Object.keys(window.SidekickModules || {}) };
                    };
                    
                    window.checkExtensionContext = function() {
                        console.log('🔍 Extension Context Check (Post-Recovery)');
                        return {
                            status: 'recovered',
                            url: window.location.href,
                            modulesLoaded: !!window.SidekickModules,
                            moduleCount: Object.keys(window.SidekickModules || {}).length
                        };
                    };
                    
                    window.forceContextRecovery = function() {
                        console.log('🔄 Force Context Recovery (Manual)');
                        window.location.reload();
                        return 'Reloading page...';
                    };
                    
                    console.log('✅ Global functions re-exposed after context recovery');
                `;
                
                (document.head || document.documentElement).appendChild(script);
                setTimeout(() => script.remove(), 100);
                
            } catch (e) {
                console.error('❌ Failed to re-expose global functions:', e.message);
            }
        },

        // Show reload prompt
        showReloadPrompt() {
            if (window.SidekickModules?.Core?.NotificationSystem) {
                window.SidekickModules.Core.NotificationSystem.show(
                    'Extension Connection Lost',
                    'Extension needs to reconnect. Click here to refresh the page.',
                    'error',
                    0, // No auto-dismiss
                    () => { window.location.reload(); }
                );
            } else {
                // Fallback notification if NotificationSystem isn't available
                console.warn('🔄 Extension context lost - please refresh the page');
                if (confirm('Extension connection lost. Refresh the page to restore functionality?')) {
                    window.location.reload();
                }
            }
        },

        // Test extension connectivity (debug function)
        async testExtensionConnection() {
            console.log('🔍 Testing extension connection...');
            
            try {
                const isValid = this.isExtensionContextValid();
                console.log(`Context valid: ${isValid}`);
                
                if (!isValid) {
                    console.log('⚠️ Context invalid, attempting recovery...');
                    const recovered = await this.attemptContextRecovery();
                    console.log(`Recovery result: ${recovered}`);
                    return recovered;
                }
                
                // Test actual message sending
                const testResponse = await chrome.runtime.sendMessage({ action: 'ping' });
                console.log('✅ Extension connection test successful:', testResponse);
                return true;
                
            } catch (error) {
                console.error('❌ Extension connection test failed:', error);
                return false;
            }
        }
    };

    // === CORE MODULE EXPORT ===
    const CoreModule = {
        STORAGE_KEYS,
        NotificationSystem,
        ChromeStorage,
        SafeMessageSender,
        ExtensionContextMonitor,
        
        // Initialize core functionality
        async init() {
            console.log("🔧 Initializing Core Module...");
            
            // Start extension context monitoring
            ExtensionContextMonitor.startMonitoring();
            
            console.log("✅ Core Module initialized successfully");
            return true;
        }
    };

    // Export to global namespace
    window.SidekickModules.Core = CoreModule;
    
    // Ensure ChromeStorage is immediately accessible
    Object.defineProperty(window.SidekickModules.Core, 'ChromeStorage', {
        value: ChromeStorage,
        writable: false,
        enumerable: true,
        configurable: false
    });
    
    console.log("✅ Core Module loaded and ready");
    console.log("🔍 CoreModule contents:", Object.keys(CoreModule));
    console.log("🔍 ChromeStorage available:", !!CoreModule.ChromeStorage);
    console.log("🔍 Direct access test:", !!window.SidekickModules.Core.ChromeStorage);

})();