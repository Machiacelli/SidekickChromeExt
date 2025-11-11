/**
 * Sidekick Chrome Extension - UI Module
 * Handles hamburger button, sidebar, and main UI components
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

    console.log("🎨 Loading Sidekick UI Module...");

    // Wait for Core module to be available
    function waitForCore() {
        return new Promise((resolve) => {
            const checkCore = () => {
                if (window.SidekickModules.Core) {
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };
            checkCore();
        });
    }

    // UI Module Implementation
    const UIModule = {
        isInitialized: false,
        sidebarVisible: false,
        hamburgerButton: null,
        sidebar: null,

        // Initialize the UI module
        async init() {
            if (this.isInitialized) {
                console.log("🎨 UI Module already initialized");
                return;
            }

            console.log("🎨 Initializing UI Module...");

            try {
                // Wait for Core module
                await waitForCore();
                console.log("✅ Core module ready for UI");

                // Load saved sidebar state
                await this.loadSidebarState();

                // Create hamburger button
                this.createHamburgerButton();
                
                // Create sidebar
                this.createSidebar();

                // Apply loaded state
                this.applySidebarState();
                
                // Set up cross-tab state synchronization
                this.setupStateSync();

                this.isInitialized = true;
                console.log("✅ UI Module initialized successfully");

            } catch (error) {
                console.error("❌ UI Module initialization failed:", error);
            }
        },

        // Create the hamburger menu button
        createHamburgerButton() {
            console.log("🍔 Creating hamburger button...");

            // Remove existing button if it exists
            const existingButton = document.getElementById('sidekick-hamburger');
            if (existingButton) {
                existingButton.remove();
            }

            // Create hamburger button with original tool icon
            this.hamburgerButton = document.createElement('button');
            this.hamburgerButton.id = 'sidekick-hamburger';
            this.hamburgerButton.className = 'sidekick-hamburger';
            this.hamburgerButton.innerHTML = '🔧';
            this.hamburgerButton.title = 'Toggle Sidekick Sidebar';

            // Add click event
            this.hamburgerButton.addEventListener('click', () => {
                this.toggleSidebar();
            });

            // Append to body
            document.body.appendChild(this.hamburgerButton);
            console.log("✅ Hamburger button created");
        },

        // Create the main sidebar
        createSidebar() {
            console.log("📋 Creating sidebar...");

            // Remove existing sidebar if it exists
            const existingSidebar = document.getElementById('sidekick-sidebar');
            if (existingSidebar) {
                existingSidebar.remove();
            }

            // Create sidebar container
            this.sidebar = document.createElement('div');
            this.sidebar.id = 'sidekick-sidebar';
            this.sidebar.className = 'sidekick-sidebar hidden'; // Start hidden

            // Create sidebar content with proper positioning
            const sidebarContent = document.createElement('div');
            sidebarContent.className = 'sidekick-sidebar-content';
            sidebarContent.style.cssText = `
                flex: 1;
                display: flex;
                flex-direction: column;
                position: relative;
                height: 100%;
                padding-top: 15px;
            `;

            // Create top bar with logo next to hamburger button (positioned outside sidebar)
            this.topBar = document.createElement('div');
            this.topBar.id = 'sidekick-top-bar';
            this.topBar.className = 'sidekick-top-bar hidden'; // Start hidden like sidebar
            this.topBar.style.cssText = `
                position: fixed;
                top: 4px;
                left: 45px;
                right: 10px;
                width: 480px;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;
            
            this.topBar.innerHTML = `
                <span style="
                    color: #fff;
                    font-size: 18px;
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                    background: linear-gradient(45deg, #8BC34A, #FFC107);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-left: 8px;
                ">Sidekick</span>
            `;

            // Add topBar to body instead of sidebar
            document.body.appendChild(this.topBar);

            // Create content area (no header needed since logo is in top bar)
            const contentArea = document.createElement('div');
            contentArea.id = 'sidekick-content';
            contentArea.style.cssText = 'flex: 1; overflow: hidden; position: relative; padding: 5px; margin-bottom: 50px;';

            // Create Add Module button - position it on the left
            const addModuleButton = document.createElement('button');
            addModuleButton.className = 'sidekick-add-module-btn';
            addModuleButton.innerHTML = '+';
            addModuleButton.title = 'Add new module';
            addModuleButton.style.cssText = `
                position: absolute;
                bottom: 15px;
                left: 15px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.7);
                padding: 0;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            addModuleButton.addEventListener('mouseenter', () => {
                addModuleButton.style.background = 'rgba(255,255,255,0.2)';
                addModuleButton.style.color = 'white';
                addModuleButton.style.transform = 'translateY(-2px)';
            });
            
            addModuleButton.addEventListener('mouseleave', () => {
                addModuleButton.style.background = 'rgba(255,255,255,0.1)';
                addModuleButton.style.color = 'rgba(255,255,255,0.7)';
                addModuleButton.style.transform = 'translateY(0)';
            });
            
            addModuleButton.addEventListener('click', () => {
                this.showAddModuleMenu();
            });

            // Assemble sidebar (without header and close button)
            sidebarContent.appendChild(contentArea);
            sidebarContent.appendChild(addModuleButton);
            this.sidebar.appendChild(sidebarContent);

            // Append to body
            document.body.appendChild(this.sidebar);

            // Initialize notepad functionality immediately
            this.initializeNotepadArea();

            console.log("✅ Sidebar created");
        },

        // Toggle sidebar visibility
        toggleSidebar() {
            if (this.sidebarVisible) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        },

        // Open sidebar
        openSidebar() {
            if (this.sidebar) {
                this.sidebar.classList.remove('hidden');
                this.sidebarVisible = true;
                console.log("📖 Sidebar opened");
                
                // Trigger lazy initialization for timer module when sidebar opens
                if (window.SidekickModules?.Timer?.lazyInit) {
                    console.log("🔄 Triggering Timer lazy initialization...");
                    window.SidekickModules.Timer.lazyInit();
                }
                
                // Save state
                this.saveSidebarState();
            }
            // Show logo when sidebar opens
            if (this.topBar) {
                this.topBar.classList.remove('hidden');
            }
        },

        // Close sidebar
        closeSidebar() {
            if (this.sidebar) {
                this.sidebar.classList.add('hidden');
                this.sidebarVisible = false;
                console.log("📕 Sidebar closed");
                
                // Save state
                this.saveSidebarState();
            }
            // Hide logo when sidebar closes
            if (this.topBar) {
                this.topBar.classList.add('hidden');
            }
        },

        // Initialize notepad area instead of navigation tabs
        async initializeNotepadArea() {
            const contentArea = this.sidebar.querySelector('#sidekick-content');
            if (!contentArea) return;

            // Don't clear existing content - preserve any existing timers or modules
            // Only initialize if notepad area is truly empty
            if (contentArea.children.length === 0) {
                console.log("🔍 Content area is empty, safe to initialize notepad");
            } else {
                console.log("🔍 Content area has existing content, preserving it");
            }

            // Wait for notepad module and initialize it
            try {
                if (window.SidekickModules?.Notepad) {
                    await window.SidekickModules.Notepad.init();
                    window.SidekickModules.Notepad.refreshDisplay();
                    console.log("✅ Notepad module initialized in sidebar");
                }
            } catch (error) {
                console.error("❌ Failed to initialize notepad module:", error);
            }
        },

        // Create a new notepad window in the sidebar
        async createNewNotepad() {
            try {
                if (!window.SidekickModules?.Notepad) {
                    this.showNotification('Notepad Error', 'Notepad module not loaded', 'error');
                    return;
                }

                await window.SidekickModules.Notepad.init();
                
                // Create notepad immediately without prompting for title
                const notepad = window.SidekickModules.Notepad.addNotepad('New Note');
            } catch (error) {
                console.error('Failed to create notepad:', error);
                this.showNotification('Notepad Error', 'Failed to create notepad', 'error');
            }
        },

        // Show add module menu as sleek inline dropdown
        showAddModuleMenu() {
            console.log("📋 Showing add module menu");

            // Remove existing menu if present
            const existingMenu = document.getElementById('sidekick-module-menu');
            if (existingMenu) {
                existingMenu.remove();
                return; // Toggle behavior - close if already open
            }

            // Create sleek inline menu - positioned on the left side
            const menu = document.createElement('div');
            menu.id = 'sidekick-module-menu';
            menu.style.cssText = `
                position: absolute;
                bottom: 55px;
                left: 15px;
                width: 140px;
                background: rgba(25, 25, 25, 0.98);
                border-radius: 8px;
                padding: 6px;
                box-shadow: 0 6px 24px rgba(0,0,0,0.7);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.12);
                z-index: 1000;
                transform: translateY(10px);
                opacity: 0;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            `;

            menu.innerHTML = `
                <div style="display: grid; gap: 3px;">
                    <button class="module-option" data-module="notepad" style="
                        background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
                        border: 1px solid rgba(255,255,255,0.06);
                        color: rgba(255,255,255,0.92);
                        padding: 10px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        font-size: 11px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 500;
                        letter-spacing: 0.3px;
                    ">
                        <span style="font-size: 13px; filter: grayscale(0.2);">📝</span> Notepad
                    </button>
                    <button class="module-option" data-module="timer" style="
                        background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
                        border: 1px solid rgba(255,255,255,0.06);
                        color: rgba(255,255,255,0.92);
                        padding: 10px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        font-size: 11px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 500;
                        letter-spacing: 0.3px;
                    ">
                        <span style="font-size: 13px; filter: grayscale(0.2);">⏰</span> Timer
                    </button>
                    <button class="module-option" data-module="todolist" style="
                        background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
                        border: 1px solid rgba(255,255,255,0.06);
                        color: rgba(255,255,255,0.92);
                        padding: 10px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        font-size: 11px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 500;
                        letter-spacing: 0.3px;
                    ">
                        <span style="font-size: 13px; filter: grayscale(0.2);">✅</span> Todo
                    </button>
                    <button class="module-option" data-module="stockticker" style="
                        background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
                        border: 1px solid rgba(255,255,255,0.06);
                        color: rgba(255,255,255,0.92);
                        padding: 10px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        font-size: 11px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 500;
                        letter-spacing: 0.3px;
                    ">
                        <span style="font-size: 13px; filter: grayscale(0.2);">📈</span> Stock
                    </button>
                </div>
            `;

            // Add to sidebar content area
            const contentArea = this.sidebar.querySelector('#sidekick-content');
            if (contentArea) {
                contentArea.appendChild(menu);
            }

            // Add event listeners
            setTimeout(() => {
                // Animate in
                menu.style.transform = 'translateY(0)';
                menu.style.opacity = '1';

                const moduleOptions = menu.querySelectorAll('.module-option');
                moduleOptions.forEach(option => {
                    option.addEventListener('mouseenter', () => {
                        option.style.background = 'linear-gradient(135deg, rgba(102, 187, 106, 0.2), rgba(102, 187, 106, 0.1))';
                        option.style.borderColor = 'rgba(102, 187, 106, 0.3)';
                        option.style.transform = 'translateY(-1px)';
                        option.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                    });
                    option.addEventListener('mouseleave', () => {
                        option.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                        option.style.borderColor = 'rgba(255,255,255,0.06)';
                        option.style.transform = 'translateY(0)';
                        option.style.boxShadow = 'none';
                    });
                    option.addEventListener('click', () => {
                        const moduleType = option.dataset.module;
                        this.addNewModule(moduleType);
                        menu.remove();
                    });
                });
            }, 0);

            // Auto-close after 8 seconds
            setTimeout(() => {
                if (document.getElementById('sidekick-module-menu') === menu) {
                    menu.style.transform = 'translateY(10px)';
                    menu.style.opacity = '0';
                    setTimeout(() => menu.remove(), 250);
                }
            }, 8000);
        },

        // Add new notepad module directly to sidebar
        addNewModule(moduleType) {
            console.log(`➕ Adding new ${moduleType} module`);
            
            switch (moduleType) {
                case 'notepad':
                    this.createNewNotepad();
                    break;
                case 'timer':
                    this.createNewTimer();
                    break;
                case 'todolist':
                    this.showNotification('Todo List Module', 'Todo list module coming soon!', 'info');
                    break;
                case 'stockticker':
                    this.showNotification('Stock Ticker Module', 'Stock ticker module coming soon!', 'info');
                    break;
                default:
                    this.showNotification('Unknown Module', 'Module type not recognized', 'error');
            }
        },

        // Create a new timer window in the sidebar
        async createNewTimer() {
            try {
                if (!window.SidekickModules?.Timer) {
                    this.showNotification('Timer Error', 'Timer module not loaded', 'error');
                    return;
                }

                // Don't re-init if already initialized - just add timer
                if (!window.SidekickModules.Timer.isInitialized) {
                    await window.SidekickModules.Timer.init();
                }
                
                // Create timer immediately with cooldown selection interface
                const timer = window.SidekickModules.Timer.addTimer('Cooldown Timer');
                this.showNotification('Timer Created', 'New cooldown timer created', 'success');
            } catch (error) {
                console.error('Failed to create timer:', error);
                this.showNotification('Timer Error', 'Failed to create timer', 'error');
            }
        },

        // Create a new notepad window in the sidebar
        async createNewNotepad() {
            try {
                if (!window.SidekickModules?.Notepad) {
                    this.showNotification('Notepad Error', 'Notepad module not loaded', 'error');
                    return;
                }

                await window.SidekickModules.Notepad.init();
                
                // Create notepad immediately without prompting for title
                const notepad = window.SidekickModules.Notepad.addNotepad('New Note');
            } catch (error) {
                console.error('Failed to create notepad:', error);
                this.showNotification('Notepad Error', 'Failed to create notepad', 'error');
            }
        },

        // Load sidebar state from storage
        async loadSidebarState() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const saved = await window.SidekickModules.Core.ChromeStorage.get('sidekick_sidebar_state');
                    this.savedState = saved || { visible: false };
                    console.log("📖 Sidebar state loaded:", this.savedState);
                }
            } catch (error) {
                console.warn("⚠️ Failed to load sidebar state:", error);
                this.savedState = { visible: false };
            }
        },

        // Save sidebar state to storage
        async saveSidebarState() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    const state = { visible: this.sidebarVisible };
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_sidebar_state', state);
                    
                    // Broadcast to other tabs
                    chrome.runtime.sendMessage({
                        type: 'SIDEBAR_STATE_CHANGED',
                        state: state
                    }).catch(() => {
                        // Silent fail if no other tabs
                    });
                }
            } catch (error) {
                console.warn("⚠️ Failed to save sidebar state:", error);
            }
        },

        // Apply loaded sidebar state
        applySidebarState() {
            if (this.savedState && this.savedState.visible) {
                this.openSidebar();
            } else {
                this.closeSidebar();
            }
        },

        // Set up cross-tab state synchronization
        setupStateSync() {
            // Listen for messages from other tabs
            if (chrome && chrome.runtime && chrome.runtime.onMessage) {
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.type === 'SIDEBAR_STATE_CHANGED') {
                        // Update local state to match
                        if (message.state.visible !== this.sidebarVisible) {
                            if (message.state.visible) {
                                this.openSidebar();
                            } else {
                                this.closeSidebar();
                            }
                        }
                    }
                });
            }
        },

        // Show notification (placeholder for now)
        showNotification(title, message, type = 'info') {
            console.log(`🔔 ${type.toUpperCase()}: ${title} - ${message}`);
            
            // Use Core notification system if available
            if (window.SidekickModules?.Core?.NotificationSystem) {
                window.SidekickModules.Core.NotificationSystem.show(title, message, type, 3000);
            }
        },

    };

    // Export UI module to global namespace
    window.SidekickModules.UI = UIModule;
    console.log("✅ UI Module loaded and ready");

})();