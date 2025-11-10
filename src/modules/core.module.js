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
        show(title, message, type = 'info', duration = 4000) {
            const notification = document.createElement('div');
            notification.className = `sidekick-notification ${type}`;
            
            notification.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 13px; opacity: 0.9;">${message}</div>
            `;
            
            document.body.appendChild(notification);
            
            // Auto remove
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        }
    };
    // === CHROME STORAGE WRAPPER ===
    const ChromeStorage = {
        // Get data from Chrome storage
        async get(key) {
            return new Promise((resolve) => {
                if (chrome?.storage?.local) {
                    chrome.storage.local.get([key], (result) => {
                        resolve(result[key]);
                    });
                } else {
                    console.warn("Chrome storage not available, using localStorage");
                    resolve(JSON.parse(localStorage.getItem(key) || 'null'));
                }
            });
        },

        // Set data in Chrome storage
        async set(key, value) {
            return new Promise((resolve) => {
                if (chrome?.storage?.local) {
                    chrome.storage.local.set({ [key]: value }, () => {
                        resolve();
                    });
                } else {
                    console.warn("Chrome storage not available, using localStorage");
                    localStorage.setItem(key, JSON.stringify(value));
                    resolve();
                }
            });
        },

        // Remove data from Chrome storage
        async remove(key) {
            return new Promise((resolve) => {
                if (chrome?.storage?.local) {
                    chrome.storage.local.remove([key], () => {
                        resolve();
                    });
                } else {
                    console.warn("Chrome storage not available, using localStorage");
                    localStorage.removeItem(key);
                    resolve();
                }
            });
        },

        // Clear all storage
        async clear() {
            return new Promise((resolve) => {
                if (chrome?.storage?.local) {
                    chrome.storage.local.clear(() => {
                        resolve();
                    });
                } else {
                    console.warn("Chrome storage not available, using localStorage");
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