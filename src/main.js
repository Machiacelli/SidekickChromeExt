/**
 * Sidekick Chrome Extension - Main Entry Point
 * Converted from Tampermonkey userscript to Chrome extension
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function() {
    "use strict";

    // Immediate test - this should show up right away
    console.log("🚀 Sidekick Chrome Extension v1.0.0 Loading...");
    console.log("🌍 Current URL:", window.location.href);
    console.log("📍 Script running on domain:", window.location.hostname);

    // Main initialization function
    async function initializeSidekick() {
        try {
            console.log("⏳ Sidekick: Waiting for modules to load...");

            console.log("🔍 Sidekick: Checking for Core and UI modules...");

            // Wait for critical modules with timeout
            const timeout = 15000; // 15 seconds
            const startTime = Date.now();

            while (!window.SidekickModules?.Core?.STORAGE_KEYS || !window.SidekickModules?.UI?.createSidebar) {
                console.log("🔄 Sidekick: Still waiting for modules...", {
                    core: !!window.SidekickModules?.Core?.STORAGE_KEYS,
                    ui: !!window.SidekickModules?.UI?.createSidebar
                });

                if (Date.now() - startTime > timeout) {
                    console.error("❌ Module loading timeout after 15 seconds");
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log("✅ Sidekick: Core and UI modules loaded successfully");

            console.log("📦 Sidekick: Available modules:", Object.keys(window.SidekickModules || {}));

            // Initialize UI
            console.log("🎨 Sidekick: Initializing UI...");
            if (window.SidekickModules.UI.init) {
                window.SidekickModules.UI.init();
                console.log("✅ Sidekick: UI initialized");
            }

            // UI and modules initialized successfully
            console.log("🎉 Sidekick Chrome Extension initialization complete!");

        } catch (error) {
            console.error("❌ Sidekick initialization failed:", error);
            // Fallback: create simple hamburger button
            createFallbackButton();
        }
    }

    // Fallback function to create hamburger button if modules fail
    function createFallbackButton() {
        console.log("🔧 Creating fallback hamburger button...");
        
        const button = document.createElement('button');
        button.id = 'sidekick-hamburger-fallback';
        button.style.cssText = `
            position: fixed !important;
            top: 10px !important;
            right: 10px !important;
            z-index: 10000 !important;
            width: 40px !important;
            height: 40px !important;
            background: #FF6B6B !important;
            color: white !important;
            border: none !important;
            border-radius: 5px !important;
            cursor: pointer !important;
            font-size: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
        `;
        button.textContent = '☰';
        button.title = 'Sidekick (Fallback Mode)';
        
        button.addEventListener('click', () => {
            alert('Sidekick is running in fallback mode. Check console for errors.');
        });
        
        document.body.appendChild(button);
        console.log("✅ Fallback button created");
    }

    // Enhanced startup sequence
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeSidekick);
    } else {
        // DOM already ready, start immediately
        setTimeout(initializeSidekick, 100);
    }

})();
