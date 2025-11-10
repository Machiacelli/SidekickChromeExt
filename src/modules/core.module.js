/**
 * Sidekick Chrome Extension - Core Module
 * Converted from Tampermonkey userscript to Chrome extension
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    'use strict';

    // === CORE STORAGE SYSTEM ===
    const STORAGE_KEYS = {
        NOTEPADS: 'sidekick_notepads',
        TODO_LISTS: 'sidekick_todo_lists',
        ATTACK_LISTS: 'sidekick_attack_lists',
        API_KEY: 'sidekick_api_key',
        SIDEBAR_STATE: 'sidekick_sidebar_state',
        SIDEBAR_WIDTH: 'sidekick_sidebar_width',
        SIDEBAR_PAGES: 'sidekick_sidebar_pages',
        CURRENT_PAGE: 'sidekick_current_page',
        PAGE_STATES: 'sidekick_page_states',
        TIMERS: 'sidekick_timers',
        TRAVEL_TRACKERS: 'sidekick_travel_trackers',
        ATTACK_BUTTON_ENABLED: 'sidekick_attack_button_enabled',
        ATTACK_BUTTON_LOCATION: 'sidekick_attack_button_location'
    };

    // Enhanced storage with Chrome extension storage API
    function getProfileKey() {
        // Use consistent storage across ALL pages for true global persistence
        return 'global';
    }

    function getProfileSpecificKey(baseKey) {
        const profileId = getProfileKey();
        return `${baseKey}_profile_${profileId}`;
    }

    // Chrome extension storage functions
    async function saveState(key, data) {
        const profileKey = getProfileSpecificKey(key);
        try {
            // Use Chrome storage API if available, fallback to localStorage
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ 
                    [profileKey]: data,
                    [key]: data // Backward compatibility
                });
            } else {
                // Fallback to localStorage for development/testing
                localStorage.setItem(profileKey, JSON.stringify(data));
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (error) {
            console.error('Failed to save state:', error);
            // Fallback to localStorage
            try {
                localStorage.setItem(profileKey, JSON.stringify(data));
            } catch (e) {
                console.error('Fallback localStorage save failed:', e);
            }
        }
    }

    async function loadState(key, defaultValue = null) {
        const profileKey = getProfileSpecificKey(key);
        try {
            // Use Chrome storage API if available
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get([profileKey, key]);
                if (result[profileKey] !== undefined) {
                    return result[profileKey];
                }
                if (result[key] !== undefined) {
                    // Migrate to profile-specific
                    await saveState(key, result[key]);
                    return result[key];
                }
            } else {
                // Fallback to localStorage
                const profileData = localStorage.getItem(profileKey);
                if (profileData) return JSON.parse(profileData);
                
                const baseData = localStorage.getItem(key);
                if (baseData) {
                    const parsed = JSON.parse(baseData);
                    await saveState(key, parsed);
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Failed to load state:', error);
            // Try localStorage fallback
            try {
                const profileData = localStorage.getItem(profileKey);
                if (profileData) return JSON.parse(profileData);
            } catch (e) {
                console.error('Fallback localStorage load failed:', e);
            }
        }
        return defaultValue;
    }

    // === NOTIFICATION SYSTEM ===
    const NotificationSystem = {
        show(title, message, type = 'info', duration = 4000) {
            const notification = document.createElement('div');
            notification.className = `sidekick-notification ${type}`;
            
            // Enhanced styling for Chrome extension
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#d32f2f' : type === 'success' ? '#2e7d32' : '#1976d2'};
                color: white;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: 'Segoe UI', sans-serif;
                font-size: 14px;
                max-width: 350px;
                cursor: pointer;
                animation: slideInRight 0.3s ease;
            `;
            
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
            
            // Click to dismiss
            notification.addEventListener('click', () => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            });
        }
    };

    // === DATA TEMPLATES ===
    const DataTemplates = {
        createNotepad(title = 'New Notepad') {
            return {
                id: Date.now() + Math.random(),
                title: title,
                content: '',
                type: 'notepad',
                created: new Date().toISOString()
            };
        },
        
        createTodoList(title = 'New Todo List') {
            return {
                id: Date.now() + Math.random(),
                title: title,
                items: [],
                type: 'todoList',
                created: new Date().toISOString()
            };
        },
        
        createAttackList(title = 'New Attack List') {
            return {
                id: Date.now() + Math.random(),
                title: title,
                targets: [],
                type: 'attackList',
                created: new Date().toISOString()
            };
        }
    };

    // === SIDEBAR STATE MANAGER ===
    const SidebarStateManager = {
        async getState() {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    const result = await chrome.storage.local.get(STORAGE_KEYS.SIDEBAR_STATE);
                    return result[STORAGE_KEYS.SIDEBAR_STATE] || { hidden: false };
                } else {
                    const state = localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE);
                    return state ? JSON.parse(state) : { hidden: false };
                }
            } catch (error) {
                return { hidden: false };
            }
        },
        
        async setState(state) {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    await chrome.storage.local.set({ [STORAGE_KEYS.SIDEBAR_STATE]: state });
                } else {
                    localStorage.setItem(STORAGE_KEYS.SIDEBAR_STATE, JSON.stringify(state));
                }
            } catch (error) {
                console.error('Failed to save sidebar state:', error);
            }
        },
        
        async isHidden() {
            const state = await this.getState();
            return state.hidden;
        },
        
        async toggle() {
            const currentState = await this.getState();
            const newState = { ...currentState, hidden: !currentState.hidden };
            await this.setState(newState);
            this.applyState();
            return newState;
        },
        
        async applyState() {
            const state = await this.getState();
            const sidebar = document.getElementById('sidekick-sidebar');
            const hamburger = document.getElementById('sidekick-hamburger');
            
            // Apply body class for CSS targeting
            if (state.hidden) {
                document.body.classList.add('sidekick-sidebar-hidden');
                document.body.classList.remove('sidekick-sidebar-visible');
            } else {
                document.body.classList.remove('sidekick-sidebar-hidden');
                document.body.classList.add('sidekick-sidebar-visible');
            }
            
            if (sidebar) {
                sidebar.classList.toggle('hidden', state.hidden);
            }
            
            if (hamburger) {
                hamburger.innerHTML = state.hidden ? '☰' : '✕';
                hamburger.title = state.hidden ? 'Show Sidebar' : 'Hide Sidebar';
            }
        },
        
        async clearAllData() {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    // Clear Chrome storage
                    await chrome.storage.local.clear();
                    await chrome.storage.sync.clear();
                }
                
                // Also clear localStorage for backward compatibility
                const knownKeys = [
                    'SIDEBAR_PAGES',
                    'CURRENT_PAGE',
                    'sidekick_attacklists',
                ];
                
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sidekick_')) {
                        localStorage.removeItem(key);
                    }
                }
                
                knownKeys.forEach(key => localStorage.removeItem(key));

                console.log('🗑️ Cleared all Sidekick data from storage');
                NotificationSystem.show('Data Cleared', 'All Sidekick data has been cleared', 'info', 3000);
                
                setTimeout(() => window.location.reload(), 500);
            } catch (error) {
                console.error('Failed to clear data:', error);
            }
        },

        async init() {
            console.log('🏗️ Initializing sidebar state manager...');
            await this.applyState();
            console.log('✅ Sidebar state manager initialized');
        }
    };

    // Navigation detection for better persistence
    const NavigationManager = {
        currentUrl: window.location.href,
        
        init() {
            this.setupNavigationDetection();
        },
        
        setupNavigationDetection() {
            // Monitor for URL changes (both popstate and pushstate)
            window.addEventListener('popstate', () => this.handleNavigation());
            
            // Override pushState and replaceState to catch programmatic navigation
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function(...args) {
                originalPushState.apply(history, args);
                NavigationManager.handleNavigation();
            };
            
            history.replaceState = function(...args) {
                originalReplaceState.apply(history, args);
                NavigationManager.handleNavigation();
            };
            
            // Also monitor for DOM changes that might indicate navigation
            const observer = new MutationObserver(() => {
                if (window.location.href !== this.currentUrl) {
                    this.handleNavigation();
                }
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true,
                attributes: false
            });
            
            console.log('🧭 Navigation detection system initialized');
        },
        
        handleNavigation() {
            const newUrl = window.location.href;
            if (newUrl !== this.currentUrl) {
                console.log('🧭 Page navigation detected:', this.currentUrl, '→', newUrl);
                this.currentUrl = newUrl;
                
                // Delay to allow page to load
                setTimeout(() => {
                    this.restorePanels();
                }, 1000);
            }
        },
        
        async restorePanels() {
            try {
                console.log('🔄 Restoring panels after navigation...');
                
                // Refresh notepads with page-specific layouts but global content
                if (window.SidekickModules?.Notepad) {
                    console.log('📝 Refreshing notepads for new page...');
                    window.SidekickModules.Notepad.refreshDisplay();
                } else {
                    console.log('⚠️ Notepad module not ready for panel restoration');
                }
                
                // Restore to-do list panel if it was open
                if (window.SidekickModules?.TodoList) {
                    console.log('📋 Checking to-do list panel state...');
                    const wasOpen = await loadState('todo_panel_open', false);
                    if (wasOpen) {
                        setTimeout(() => {
                            if (document.getElementById('sidekick-content')) {
                                window.SidekickModules.TodoList.showTodoPanel();
                                console.log('✅ To-Do List panel restored after navigation');
                            }
                        }, 1000);
                    }
                }
                
                // Restore training blocker if it was active
                if (window.SidekickModules?.BlockTraining) {
                    console.log('🚫 Checking training blocker state...');
                    const isBlocked = await loadState('blockTrainingActive', false);
                    if (isBlocked && (window.location.href.includes('/gym') || window.location.href.includes('/training'))) {
                        setTimeout(() => {
                            if (window.SidekickModules.BlockTraining.restoreTrainingBlocker) {
                                window.SidekickModules.BlockTraining.restoreTrainingBlocker();
                            }
                        }, 1500);
                    }
                }
                
            } catch (error) {
                console.error('❌ Error restoring panels:', error);
            }
        }
    };

    // Export to global scope for other modules to use
    if (typeof window.SidekickModules === 'undefined') {
        window.SidekickModules = {};
    }

    window.SidekickModules.Core = {
        STORAGE_KEYS,
        saveState,
        loadState,
        NotificationSystem,
        DataTemplates,
        SidebarStateManager,
        NavigationManager,
        getProfileKey,
        getProfileSpecificKey
    };

    // Initialize the sidebar state manager and navigation detection
    SidebarStateManager.init();
    NavigationManager.init();

    console.log('✅ Sidekick Core module loaded - Chrome Extension v1.0.0');

})();