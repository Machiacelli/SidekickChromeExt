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

            // Create Add Module button
            const addModuleButton = document.createElement('button');
            addModuleButton.className = 'sidekick-add-module-btn';
            addModuleButton.innerHTML = '+ Add Module';
            addModuleButton.title = 'Add new module';
            addModuleButton.style.cssText = `
                position: absolute;
                bottom: 15px;
                left: 15px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.7);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
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

            // Assemble sidebar
            sidebarContent.appendChild(closeButton);
            sidebarContent.appendChild(header);
            sidebarContent.appendChild(nav);
            sidebarContent.appendChild(contentArea);
            sidebarContent.appendChild(addModuleButton);
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
                            ⚙️ <strong>Settings:</strong> Available in extension popup menu<br>
                            ➕ <strong>Add Modules:</strong> Click the "+ Add Module" button below<br>
                            🔄 <strong>More features coming soon...</strong>
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

        // Show add module menu
        showAddModuleMenu() {
            console.log("📋 Showing add module menu");

            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Create menu
            const menu = document.createElement('div');
            menu.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                padding: 20px;
                color: white;
                min-width: 300px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                transform: scale(0.9);
                transition: transform 0.2s ease;
            `;

            menu.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 500;">Add New Module</h3>
                    <button class="close-menu" style="background: rgba(255,255,255,0.2); border: none; color: white; 
                            border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px;">×</button>
                </div>
                <div style="display: grid; gap: 10px;">
                    <button class="module-option" data-module="notepad" style="background: rgba(255,255,255,0.1); 
                            border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px; border-radius: 8px; 
                            cursor: pointer; text-align: left; transition: all 0.2s ease;">
                        📝 Add new notepad
                    </button>
                    <button class="module-option" data-module="timer" style="background: rgba(255,255,255,0.1); 
                            border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px; border-radius: 8px; 
                            cursor: pointer; text-align: left; transition: all 0.2s ease;">
                        ⏰ Add new timer
                    </button>
                    <button class="module-option" data-module="todolist" style="background: rgba(255,255,255,0.1); 
                            border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px; border-radius: 8px; 
                            cursor: pointer; text-align: left; transition: all 0.2s ease;">
                        ✅ Add new todo list
                    </button>
                    <button class="module-option" data-module="stockticker" style="background: rgba(255,255,255,0.1); 
                            border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px; border-radius: 8px; 
                            cursor: pointer; text-align: left; transition: all 0.2s ease;">
                        📈 Add stock ticker
                    </button>
                </div>
            `;

            // Add hover effects
            setTimeout(() => {
                const moduleOptions = menu.querySelectorAll('.module-option');
                moduleOptions.forEach(option => {
                    option.addEventListener('mouseenter', () => {
                        option.style.background = 'rgba(255,255,255,0.2)';
                        option.style.transform = 'translateX(5px)';
                    });
                    option.addEventListener('mouseleave', () => {
                        option.style.background = 'rgba(255,255,255,0.1)';
                        option.style.transform = 'translateX(0)';
                    });
                    option.addEventListener('click', () => {
                        const moduleType = option.dataset.module;
                        this.addNewModule(moduleType);
                        overlay.remove();
                    });
                });

                const closeBtn = menu.querySelector('.close-menu');
                closeBtn.addEventListener('click', () => {
                    overlay.remove();
                });
            }, 0);

            // Add to overlay and show
            overlay.appendChild(menu);
            document.body.appendChild(overlay);

            // Animate in
            setTimeout(() => {
                menu.style.transform = 'scale(1)';
            }, 0);

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        },

        // Add new module
        addNewModule(moduleType) {
            console.log(`➕ Adding new ${moduleType} module`);
            
            switch (moduleType) {
                case 'notepad':
                    this.showNotification('New Notepad', 'Use the Notes tab to create new notepads', 'info');
                    // Switch to notes tab
                    const notesBtn = document.querySelector('[data-module="notepad"]');
                    if (notesBtn) notesBtn.click();
                    break;
                case 'timer':
                    this.showNotification('Timer Module', 'Timer module coming soon!', 'info');
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