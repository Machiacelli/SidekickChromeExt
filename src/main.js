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
                    ui: !!window.SidekickModules?.UI?.createSidebar,
                    clock: !!window.SidekickModules?.Clock
                });

                if (Date.now() - startTime > timeout) {
                    console.error("❌ Module loading timeout after 15 seconds");
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log("✅ Sidekick: Core and UI modules loaded successfully");

            console.log("📦 Sidekick: Available modules:", Object.keys(window.SidekickModules || {}));

            // Initialize Core Module (for extension context monitoring)
            console.log("🔧 Sidekick: Initializing Core Module...");
            if (window.SidekickModules.Core?.init) {
                await window.SidekickModules.Core.init();
                console.log("✅ Sidekick: Core Module initialized");
            } else {
                console.warn("⚠️ Core module init not available");
            }

            // Initialize Settings Module
            console.log("⚙️ Sidekick: Initializing Settings...");
            if (window.SidekickModules.Settings?.init) {
                await window.SidekickModules.Settings.init();
                console.log("✅ Sidekick: Settings initialized");
            } else {
                console.warn("⚠️ Settings module not available");
            }

            // Initialize UI
            console.log("🎨 Sidekick: Initializing UI...");
            if (window.SidekickModules.UI.init) {
                window.SidekickModules.UI.init();
                console.log("✅ Sidekick: UI initialized");
            }

            // Initialize Clock Module
            console.log("🕐 Sidekick: Initializing Clock...");
            if (window.SidekickModules.Clock?.init) {
                await window.SidekickModules.Clock.init();
                console.log("✅ Sidekick: Clock initialized");
            } else {
                console.warn("⚠️ Clock module not available");
            }

            // Initialize Event Ticker Module
            console.log("🎪 Sidekick: Initializing Event Ticker...");
            if (window.SidekickModules.EventTicker?.init) {
                await window.SidekickModules.EventTicker.init();
                console.log("✅ Sidekick: Event Ticker initialized");
            } else {
                console.warn("⚠️ Event Ticker module not available");
            }

            // Initialize Link Group Module
            console.log("🔗 Sidekick: Initializing Link Group...");
            if (window.SidekickModules.LinkGroup?.init) {
                await window.SidekickModules.LinkGroup.init();
                console.log("✅ Sidekick: Link Group initialized");
            } else {
                console.warn("⚠️ Link Group module not available");
            }

            // Initialize Attack List Module
            console.log("⚔️ Sidekick: Initializing Attack List...");
            if (window.SidekickModules.AttackList?.init) {
                await window.SidekickModules.AttackList.init();
                console.log("✅ Sidekick: Attack List initialized");
            } else {
                console.warn("⚠️ Attack List module not available");
            }

            // Initialize Attack Button Mover Module
            console.log("⚔️ Sidekick: Initializing Attack Button Mover...");
            if (window.SidekickModules.AttackButtonMover?.init) {
                await window.SidekickModules.AttackButtonMover.init();
                console.log("✅ Sidekick: Attack Button Mover initialized");
            } else {
                console.warn("⚠️ Attack Button Mover module not available");
            }

            // Initialize Xanax Viewer Module
            console.log("💊 Sidekick: Initializing Xanax Viewer...");
            if (window.SidekickModules.XanaxViewer?.init) {
                await window.SidekickModules.XanaxViewer.init();
                console.log("✅ Sidekick: Xanax Viewer initialized");
            } else {
                console.warn("⚠️ Xanax Viewer module not available");
            }

            // Initialize Block Training Module
            console.log("🚫 Sidekick: Initializing Block Training...");
            if (window.SidekickModules.BlockTraining?.init) {
                await window.SidekickModules.BlockTraining.init();
                console.log("✅ Sidekick: Block Training initialized");
            } else {
                console.warn("⚠️ Block Training module not available");
            }

            // Initialize Time on Tab Module
            console.log("⏰ Sidekick: Initializing Time on Tab...");
            if (window.SidekickModules.TimeOnTab?.init) {
                await window.SidekickModules.TimeOnTab.init();
                console.log("✅ Sidekick: Time on Tab initialized");
            } else {
                console.warn("⚠️ Time on Tab module not available");
            }

            // Initialize Chain Timer Module
            console.log("⏱️ Sidekick: Initializing Chain Timer...");
            if (window.SidekickModules.ChainTimer?.init) {
                await window.SidekickModules.ChainTimer.init();
                console.log("✅ Sidekick: Chain Timer initialized");
            } else {
                console.warn("⚠️ Chain Timer module not available");
            }

            // Initialize NPC Attack Timer Module
            console.log("⚔️ Sidekick: Initializing NPC Attack Timer...");
            if (window.SidekickModules.NPCAttackTimer?.init) {
                await window.SidekickModules.NPCAttackTimer.init();
                console.log("✅ Sidekick: NPC Attack Timer initialized");
            } else {
                console.warn("⚠️ NPC Attack Timer module not available");
            }

            // Initialize Random Target Module
            console.log("🎯 Sidekick: Initializing Random Target...");
            if (window.SidekickModules.RandomTarget?.init) {
                await window.SidekickModules.RandomTarget.init();
                console.log("✅ Sidekick: Random Target initialized");
            } else {
                console.warn("⚠️ Random Target module not available");
            }

            // Initialize Timer Module
            console.log("⏰ Sidekick: Initializing Timer...");
            if (window.SidekickModules.Timer?.init) {
                await window.SidekickModules.Timer.init();
                console.log("✅ Sidekick: Timer initialized");
            } else {
                console.warn("⚠️ Timer module not available");
            }

            // Initialize Flight Tracker Module
            console.log("✈️ Sidekick: Initializing Flight Tracker...");
            if (window.SidekickModules.FlightTracker?.init) {
                await window.SidekickModules.FlightTracker.init();
                console.log("✅ Sidekick: Flight Tracker initialized");
            } else {
                console.warn("⚠️ Flight Tracker module not available");
            }

            // Initialize Todo List
            console.log("📋 Sidekick: Initializing Todo List...");
            if (window.SidekickModules.TodoList?.init) {
                await window.SidekickModules.TodoList.init();
                console.log("✅ Sidekick: Todo List initialized");
            } else {
                console.warn("⚠️ Todo List module not available");
            }

            // Initialize Debt Module
            console.log("💰 Sidekick: Initializing Debt Module...");
            if (window.SidekickModules.Debt?.init) {
                await window.SidekickModules.Debt.init();
                console.log("✅ Sidekick: Debt Module initialized");
            } else {
                console.warn("⚠️ Debt Module not available");
            }

            // Initialize Notion Bug Reporter Module
            console.log("🐛 Sidekick: Initializing Notion Bug Reporter...");
            if (window.SidekickModules.NotionBugReporter?.init) {
                await window.SidekickModules.NotionBugReporter.init();
                console.log("✅ Sidekick: Notion Bug Reporter initialized");
            } else {
                console.warn("⚠️ Notion Bug Reporter module not available");
            }

            // UI and modules initialized successfully
            console.log("🎉 Sidekick Chrome Extension initialization complete!");

            // Expose global helper functions for testing
            exposeGlobalHelpers();
            
            // Test multiple exposure methods for Chrome extension content script environment
            console.log('🧪 Testing multiple global function exposure methods:');
            
            // Method 1: Standard window assignment (already done above)
            console.log('🔧 Method 1: Standard window assignment complete');
            
            // Method 2: Direct global scope injection
            try {
                const funcs = {
                    testExtensionConnection: window.testExtensionConnection,
                    checkExtensionContext: window.checkExtensionContext,
                    forceContextRecovery: window.forceContextRecovery,
                    testDailyTasks: window.testDailyTasks
                };
                
                // Inject into page context via script tag
                const script = document.createElement('script');
                script.textContent = `
                    // Debug functions for Sidekick Chrome Extension
                    window.testExtensionConnection = function() {
                        console.log('🔗 Extension Connection Test');
                        console.log('✅ Extension is loaded and running');
                        console.log('📦 Available modules:', Object.keys(window.SidekickModules || {}));
                        console.log('🔍 Extension context:', !!window.SidekickModules);
                        return { status: 'connected', modules: Object.keys(window.SidekickModules || {}) };
                    };
                    
                    window.checkExtensionContext = function() {
                        console.log('🔍 Extension Context Check');
                        console.log('📍 Current URL:', window.location.href);
                        console.log('🌐 Domain:', window.location.hostname);
                        console.log('📦 Modules loaded:', !!window.SidekickModules);
                        console.log('🔧 Core available:', !!window.SidekickModules?.Core);
                        console.log('📋 TodoList available:', !!window.SidekickModules?.TodoList);
                        return {
                            url: window.location.href,
                            domain: window.location.hostname,
                            modulesLoaded: !!window.SidekickModules,
                            moduleCount: Object.keys(window.SidekickModules || {}).length,
                            modules: window.SidekickModules || null
                        };
                    };
                    
                    window.forceContextRecovery = function() {
                        console.log('🔄 Force Context Recovery');
                        console.log('⚠️ This will reload the page to recover extension context');
                        console.log('💡 Use this if extension seems unresponsive');
                        setTimeout(() => window.location.reload(), 1000);
                        return 'Reloading in 1 second...';
                    };
                    
                    window.testDailyTasks = function() {
                        console.log('📋 Daily Tasks Test');
                        console.log('🔍 Testing daily task detection system');
                        if (window.SidekickModules?.TodoList) {
                            console.log('✅ TodoList module found');
                            console.log('🔧 Available debug functions:', {
                                debugTodoList: typeof window.debugTodoList,
                                debugXanaxLogs: typeof window.debugXanaxLogs,
                                debugNerveRefillLogs: typeof window.debugNerveRefillLogs,
                                debugEnergyRefillLogs: typeof window.debugEnergyRefillLogs
                            });
                            return window.SidekickModules.TodoList;
                        } else {
                            console.log('❌ TodoList module not found');
                            console.log('📦 Available modules:', Object.keys(window.SidekickModules || {}));
                            return null;
                        }
                    };
                    
                    console.log('✅ Sidekick debug functions injected into page context');
                    console.log('🔧 Available functions: testExtensionConnection(), checkExtensionContext(), forceContextRecovery(), testDailyTasks()');
                `;
                
                (document.head || document.documentElement).appendChild(script);
                setTimeout(() => script.remove(), 100);
                console.log('✅ Functions injected via script tag into page context');
            } catch (e) {
                console.warn('⚠️ Script injection failed:', e.message);
            }
            
            // Method 3: Verify accessibility
            setTimeout(() => {
                console.log('🧪 Testing function accessibility after injection:');
                try {
                    if (typeof window.testExtensionConnection === 'function') {
                        console.log('✅ testExtensionConnection is accessible');
                        // Test the function
                        try {
                            const result = window.testExtensionConnection();
                            console.log('✅ Function call successful:', result);
                        } catch (e) {
                            console.warn('⚠️ Function call failed:', e.message);
                        }
                    } else {
                        console.error('❌ testExtensionConnection still not accessible');
                    }
                } catch (e) {
                    console.error('❌ Error during accessibility test:', e.message);
                }
            }, 200);

            // Set up message listener for popup communications
            setupMessageListener();

        } catch (error) {
            console.error("❌ Sidekick initialization failed:", error);
            // Fallback: create simple hamburger button
            createFallbackButton();
        }
    }

    // Expose global helper functions for debugging and testing
    function exposeGlobalHelpers() {
        // Extension connectivity tests
        window.testExtensionConnection = function() {
            if (window.SidekickModules?.Core?.SafeMessageSender?.testExtensionConnection) {
                return window.SidekickModules.Core.SafeMessageSender.testExtensionConnection();
            } else {
                console.error('❌ SafeMessageSender not available');
                return false;
            }
        };

        window.checkExtensionContext = function() {
            if (window.SidekickModules?.Core?.SafeMessageSender?.isExtensionContextValid) {
                const isValid = window.SidekickModules.Core.SafeMessageSender.isExtensionContextValid();
                console.log(`🔍 Extension context valid: ${isValid}`);
                return isValid;
            } else {
                console.error('❌ SafeMessageSender not available');
                return false;
            }
        };

        window.forceContextRecovery = function() {
            if (window.SidekickModules?.Core?.SafeMessageSender?.attemptContextRecovery) {
                return window.SidekickModules.Core.SafeMessageSender.attemptContextRecovery();
            } else {
                console.error('❌ SafeMessageSender not available');
                return false;
            }
        };

        // Debug shortcut for daily tasks
        window.testDailyTasks = function() {
            if (window.SidekickModules?.TodoList) {
                console.log('📋 Available TodoList debug functions:', {
                    debugTodoList: typeof window.debugTodoList,
                    debugNerveRefillLogs: typeof window.debugNerveRefillLogs,
                    debugEnergyRefillLogs: typeof window.debugEnergyRefillLogs,
                    debugXanaxLogs: typeof window.debugXanaxLogs
                });
                
                if (typeof window.debugTodoList === 'function') {
                    return window.debugTodoList();
                }
            }
            console.error('❌ TodoList module or debug functions not available');
            return false;
        };

        // Also expose functions globally without window prefix for easier access
        try {
            globalThis.testExtensionConnection = window.testExtensionConnection;
            globalThis.checkExtensionContext = window.checkExtensionContext;
            globalThis.forceContextRecovery = window.forceContextRecovery;
            globalThis.testDailyTasks = window.testDailyTasks;
            
            console.log('✅ Functions exposed to global scope');
        } catch (e) {
            console.warn('⚠️ Could not expose to global scope:', e.message);
        }

        // Verify functions are properly attached
        console.log('🔧 Global helper functions exposed:');
        console.log('  - testExtensionConnection():', typeof window.testExtensionConnection);
        console.log('  - checkExtensionContext():', typeof window.checkExtensionContext);
        console.log('  - forceContextRecovery():', typeof window.forceContextRecovery);
        console.log('  - testDailyTasks():', typeof window.testDailyTasks);
        
        // Also expose them as properties of window explicitly
        try {
            Object.defineProperty(window, 'testExtensionConnection', {
                value: window.testExtensionConnection,
                writable: false,
                configurable: false
            });
            Object.defineProperty(window, 'checkExtensionContext', {
                value: window.checkExtensionContext,
                writable: false,
                configurable: false
            });
            Object.defineProperty(window, 'forceContextRecovery', {
                value: window.forceContextRecovery,
                writable: false,
                configurable: false
            });
            Object.defineProperty(window, 'testDailyTasks', {
                value: window.testDailyTasks,
                writable: false,
                configurable: false
            });
            console.log('✅ Global functions secured with defineProperty');
        } catch (e) {
            console.warn('⚠️ Could not secure global functions:', e.message);
        }
    }

    // Set up message listener for popup communications
    function setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 Received message:', request);
            
            if (request.action === 'toggleModule') {
                handleModuleToggle(request.moduleType, request.enabled, sendResponse);
                return true; // Keep message channel open for async response
            }
            
            // Legacy support for old action name
            if (request.action === 'toggleAttackButtonMover') {
                handleModuleToggle('attackButtonMover', request.enabled, sendResponse);
                return true;
            }
            
            if (request.action === 'settingsUpdated') {
                handleSettingsUpdate(request.settings);
                sendResponse({ success: true });
            }
            
            if (request.action === 'dataCleared') {
                handleDataCleared();
                sendResponse({ success: true });
            }
            
            if (request.action === 'openBugReporter') {
                handleOpenBugReporter(sendResponse);
                return true; // Keep message channel open for async response
            }
        });
    }

    // Handle module toggle from popup
    async function handleModuleToggle(moduleType, enabled, sendResponse) {
        try {
            let module;
            let displayName;
            
            switch (moduleType) {
                case 'attackButtonMover':
                    module = window.SidekickModules?.AttackButtonMover;
                    displayName = 'Attack Button Mover';
                    break;
                case 'blockTraining':
                    module = window.SidekickModules?.BlockTraining;
                    displayName = 'Block Training';
                    break;
                case 'timeOnTab':
                    module = window.SidekickModules?.TimeOnTab;
                    displayName = 'Time on Tab';
                    break;
                case 'npcAttackTimer':
                    module = window.SidekickModules?.NPCAttackTimer;
                    displayName = 'NPC Attack Timer';
                    break;
                case 'randomTarget':
                    module = window.SidekickModules?.RandomTarget;
                    displayName = 'Random Target';
                    break;
                default:
                    console.warn('⚠️ Unknown module type:', moduleType);
                    sendResponse({ success: false, error: 'Unknown module type' });
                    return;
            }
            
            if (module) {
                const newState = await module.toggle();
                console.log(`⚙️ ${displayName} toggled:`, newState);
                sendResponse({ success: true, enabled: newState });
            } else {
                console.warn(`⚠️ ${displayName} module not available`);
                sendResponse({ success: false, error: 'Module not available' });
            }
        } catch (error) {
            console.error(`❌ Failed to toggle ${moduleType}:`, error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Handle settings update from popup
    function handleSettingsUpdate(settings) {
        console.log('⚙️ Settings updated:', settings);
        // Modules will automatically pick up new settings on next operation
    }

    // Handle data cleared from popup
    function handleDataCleared() {
        console.log('🗑️ Data cleared, reloading page...');
        // Reload page to reset everything
        window.location.reload();
    }

    // Handle opening bug reporter from popup
    function handleOpenBugReporter(sendResponse) {
        try {
            if (window.SidekickModules?.NotionBugReporter?.openReporter) {
                window.SidekickModules.NotionBugReporter.openReporter();
                sendResponse({ success: true });
            } else {
                console.warn('⚠️ Bug reporter not available');
                sendResponse({ success: false, error: 'Bug reporter not available' });
            }
        } catch (error) {
            console.error('❌ Failed to open bug reporter:', error);
            sendResponse({ success: false, error: error.message });
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
