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

                // Create hamburger button
                this.createHamburgerButton();
                
                // Create sidebar
                this.createSidebar();

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

            // Create hamburger button
            this.hamburgerButton = document.createElement('button');
            this.hamburgerButton.id = 'sidekick-hamburger';
            this.hamburgerButton.className = 'sidekick-hamburger';
            this.hamburgerButton.innerHTML = '☰';
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

            // Create sidebar content
            const sidebarContent = document.createElement('div');
            sidebarContent.className = 'sidekick-sidebar-content';

            // Create close button
            const closeButton = document.createElement('button');
            closeButton.className = 'sidekick-close-btn';
            closeButton.innerHTML = '×';
            closeButton.title = 'Close Sidebar';
            closeButton.addEventListener('click', () => {
                this.closeSidebar();
            });

            // Create header
            const header = document.createElement('h2');
            header.textContent = 'Sidekick v1.0.0';
            header.style.cssText = 'margin-top: 0; color: #333; font-size: 18px;';

            // Create navigation
            const nav = document.createElement('div');
            nav.innerHTML = `
                <div style="display: flex; background: rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 20px; overflow: hidden;">
                    <button class="nav-btn active" data-module="dashboard" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.2); 
                            border: none; color: white; font-size: 12px; cursor: pointer; font-weight: bold;">
                        🏠 Dashboard
                    </button>
                    <button class="nav-btn" data-module="notepad" style="flex: 1; padding: 10px; background: transparent; 
                            border: none; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; font-weight: bold;">
                        📝 Notes
                    </button>
                    <button class="nav-btn" data-module="settings" style="flex: 1; padding: 10px; background: transparent; 
                            border: none; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; font-weight: bold;">
                        ⚙️ Settings
                    </button>
                </div>
            `;

            // Create content area
            const contentArea = document.createElement('div');
            contentArea.id = 'sidekick-content';
            contentArea.style.cssText = 'flex: 1; overflow: hidden; display: flex; flex-direction: column;';

            // Create basic content
            const content = document.createElement('div');
            content.innerHTML = `
                <div style="text-align: center; color: #ddd; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🚀</div>
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Welcome to Sidekick!</div>
                    <div style="font-size: 14px; opacity: 0.8;">Chrome extension is active and ready</div>
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: left;">
                        <div style="font-weight: bold; margin-bottom: 10px;">Available Features:</div>
                        <div style="font-size: 13px; line-height: 1.6;">
                            📝 <strong>Notes:</strong> Create and manage notepads<br>
                            ⚙️ <strong>Settings:</strong> Configure API key and preferences<br>
                            🔄 <strong>More modules coming soon...</strong>
                        </div>
                    </div>
                </div>
            `;
            contentArea.appendChild(content);

            // Assemble sidebar
            sidebarContent.appendChild(closeButton);
            sidebarContent.appendChild(header);
            sidebarContent.appendChild(nav);
            sidebarContent.appendChild(contentArea);
            this.sidebar.appendChild(sidebarContent);

            // Append to body
            document.body.appendChild(this.sidebar);

            // Add navigation functionality
            this.initializeNavigation();

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
            }
        },

        // Close sidebar
        closeSidebar() {
            if (this.sidebar) {
                this.sidebar.classList.add('hidden');
                this.sidebarVisible = false;
                console.log("📕 Sidebar closed");
            }
        },

        // Initialize navigation system
        initializeNavigation() {
            const navButtons = this.sidebar.querySelectorAll('.nav-btn');
            const contentArea = this.sidebar.querySelector('#sidekick-content');

            navButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Update active button
                    navButtons.forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = 'rgba(255,255,255,0.7)';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'rgba(255,255,255,0.2)';
                    btn.style.color = 'white';

                    // Load module content
                    this.loadModuleContent(btn.dataset.module, contentArea);
                });
            });
        },

        // Load content for specific module
        async loadModuleContent(moduleName, contentArea) {
            console.log(`🔄 Loading ${moduleName} module content`);

            switch (moduleName) {
                case 'dashboard':
                    this.loadDashboard(contentArea);
                    break;
                case 'notepad':
                    await this.loadNotepadModule(contentArea);
                    break;
                case 'settings':
                    await this.loadSettingsModule(contentArea);
                    break;
                default:
                    contentArea.innerHTML = '<div style="padding: 20px; color: #ccc;">Module not found</div>';
            }
        },

        // Load dashboard content
        loadDashboard(contentArea) {
            contentArea.innerHTML = `
                <div style="text-align: center; color: #ddd; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🚀</div>
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Welcome to Sidekick!</div>
                    <div style="font-size: 14px; opacity: 0.8;">Chrome extension is active and ready</div>
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: left;">
                        <div style="font-weight: bold; margin-bottom: 10px;">Available Features:</div>
                        <div style="font-size: 13px; line-height: 1.6;">
                            📝 <strong>Notes:</strong> Create and manage notepads<br>
                            ⚙️ <strong>Settings:</strong> Configure API key and preferences<br>
                            🔄 <strong>More modules coming soon...</strong>
                        </div>
                    </div>
                </div>
            `;
        },

        // Load notepad module
        async loadNotepadModule(contentArea) {
            if (!window.SidekickModules.Notepad) {
                contentArea.innerHTML = '<div style="padding: 20px; color: #f44336;">Notepad module not loaded</div>';
                return;
            }

            try {
                await window.SidekickModules.Notepad.init();
                const notepadPanel = window.SidekickModules.Notepad.createNotepadPanel();
                contentArea.innerHTML = '';
                contentArea.appendChild(notepadPanel);
            } catch (error) {
                console.error('Failed to load notepad module:', error);
                contentArea.innerHTML = '<div style="padding: 20px; color: #f44336;">Failed to load notepad module</div>';
            }
        },

        // Load settings module
        async loadSettingsModule(contentArea) {
            if (!window.SidekickModules.Settings) {
                contentArea.innerHTML = '<div style="padding: 20px; color: #f44336;">Settings module not loaded</div>';
                return;
            }

            try {
                await window.SidekickModules.Settings.init();
                const settingsPanel = window.SidekickModules.Settings.createSettingsPanel();
                contentArea.innerHTML = '';
                contentArea.appendChild(settingsPanel);
            } catch (error) {
                console.error('Failed to load settings module:', error);
                contentArea.innerHTML = '<div style="padding: 20px; color: #f44336;">Failed to load settings module</div>';
            }
        },

        // Show notification (placeholder for now)
        showNotification(title, message, type = 'info') {
            console.log(`🔔 ${type.toUpperCase()}: ${title} - ${message}`);
            
            // Use Core notification system if available
            if (window.SidekickModules?.Core?.NotificationSystem) {
                window.SidekickModules.Core.NotificationSystem.show(title, message, type, 3000);
            }
        }
    };

    // Export UI module to global namespace
    window.SidekickModules.UI = UIModule;
    console.log("✅ UI Module loaded and ready");

})();