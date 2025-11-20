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
        
        show(title, message, type = 'info', duration = 4000) {
            const notification = document.createElement('div');
            notification.className = `sidekick-notification ${type}`;
            
            // Create unique ID for this notification
            const notificationId = Date.now() + Math.random();
            notification.dataset.notificationId = notificationId;
            
            notification.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 13px; opacity: 0.9;">${message}</div>
            `;
            
            // Add notification styles based on type
            const typeStyles = {
                'info': 'background: #2196F3; color: white; padding: 16px; animation: slideInRight 0.3s ease;',
                'success': 'background: #4CAF50; color: white; padding: 16px; animation: slideInRight 0.3s ease;',
                'warning': 'background: #FF9800; color: white; padding: 16px; animation: slideInRight 0.3s ease;',
                'error': 'background: #F44336; color: white; padding: 16px; animation: slideInRight 0.3s ease;'
            };
            
            notification.style.cssText += typeStyles[type] || typeStyles['info'];
            
            // New notifications always appear at the top position
            notification.style.top = this.baseTop + 'px';
            
            // Set z-index to be higher than existing notifications (newest on top)
            notification.style.zIndex = 999999 + this.notifications.length;
            
            // Add click to dismiss functionality
            notification.addEventListener('click', () => {
                this.removeNotification(notificationId);
            });
            
            // Add to DOM first to get proper dimensions
            document.body.appendChild(notification);
            
            // Push down existing notifications BEFORE adding new one to array
            this.pushDownExistingNotifications(notification.offsetHeight + 10);
            
            // Add new notification to the beginning of array (top position)
            this.notifications.unshift({
                id: notificationId,
                element: notification,
                position: this.baseTop
            });
            
            // Auto remove with repositioning
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, duration);
        },
        
        pushDownExistingNotifications(newNotificationSpace) {
            // Move all existing notifications down by the new notification's space
            this.notifications.forEach(notification => {
                if (notification.element && notification.element.parentNode) {
                    const currentTop = parseInt(notification.element.style.top) || notification.position;
                    const newTop = currentTop + newNotificationSpace;
                    
                    notification.position = newTop;
                    notification.element.style.transition = 'top 0.3s ease';
                    notification.element.style.top = newTop + 'px';
                }
            });
        },
        
        removeNotification(notificationId) {
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex === -1) return;
            
            const notification = this.notifications[notificationIndex];
            
            // Animate out
            if (notification.element && notification.element.parentNode) {
                notification.element.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.element && notification.element.parentNode) {
                        notification.element.parentNode.removeChild(notification.element);
                    }
                    
                    // Remove from array
                    this.notifications.splice(notificationIndex, 1);
                    
                    // Reposition remaining notifications to fill the gap
                    this.repositionNotifications();
                }, 300);
            } else {
                // Remove from array if element is already gone
                this.notifications.splice(notificationIndex, 1);
            }
        },
        
        repositionNotifications() {
            // Reposition all notifications from top to bottom with proper spacing
            let currentTop = this.baseTop;
            
            this.notifications.forEach((notification, index) => {
                if (notification.element && notification.element.parentNode) {
                    notification.position = currentTop;
                    notification.element.style.transition = 'top 0.3s ease';
                    notification.element.style.top = currentTop + 'px';
                    currentTop += notification.element.offsetHeight + 10;
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

    // === CORE MODULE EXPORT ===
    const CoreModule = {
        STORAGE_KEYS,
        NotificationSystem,
        ChromeStorage,
        
        // Initialize core functionality
        async init() {
            console.log("🔧 Initializing Core Module...");
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