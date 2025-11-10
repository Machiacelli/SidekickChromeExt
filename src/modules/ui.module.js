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

            // Create basic content
            const content = document.createElement('div');
            content.innerHTML = `
                <p style="color: #666; font-size: 14px;">Chrome Extension Active</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
                <div style="color: #999; font-size: 12px;">
                    <p>🚀 Sidekick features will appear here</p>
                    <p>📊 Modules loading...</p>
                    <p>⚙️ Settings coming soon</p>
                </div>
            `;

            // Assemble sidebar
            sidebarContent.appendChild(closeButton);
            sidebarContent.appendChild(header);
            sidebarContent.appendChild(content);
            this.sidebar.appendChild(sidebarContent);

            // Append to body
            document.body.appendChild(this.sidebar);
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