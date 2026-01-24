/**
 * Sidekick Chrome Extension - OC Weights Module
 * Displays weight percentages under each role in Organized Crimes
 * Version: 1.0.0
 * Author: Machiacelli
 */

(function () {
    'use strict';

    console.log("📊 Loading Sidekick OC Weights Module...");

    const OCWeightsModule = {
        isInitialized: false,
        isEnabled: false,
        weightData: {},
        observer: null,
        API_URL: "https://tornprobability.com:3000/api/GetRoleWeights",
        STYLE_ID: "oc-weights-style",

        // Initialize the module
        async init() {
            if (this.isInitialized) {
                console.log("📊 OC Weights Module already initialized");
                return;
            }

            console.log("📊 Initializing OC Weights Module...");

            try {
                // Check if module is enabled
                this.isEnabled = await this.loadSettings();

                if (this.isEnabled) {
                    await this.enable();
                }

                this.isInitialized = true;
                console.log("✅ OC Weights Module initialized successfully");
            } catch (error) {
                console.error("❌ OC Weights Module initialization failed:", error);
            }
        },

        // Load settings from storage
        async loadSettings() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const enabled = await window.SidekickModules.Core.ChromeStorage.get('oc_weights_enabled');
                    return enabled !== false; // Default to true if not set
                }
                return true; // Default enabled
            } catch (error) {
                console.warn("⚠️ Failed to load OC Weights settings:", error);
                return true;
            }
        },

        // Save settings to storage
        async saveSettings(enabled) {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.set) {
                    await window.SidekickModules.Core.ChromeStorage.set('oc_weights_enabled', enabled);
                }
                this.isEnabled = enabled;
            } catch (error) {
                console.error("❌ Failed to save OC Weights settings:", error);
            }
        },

        // Enable the module
        async enable() {
            console.log("📊 Enabling OC Weights...");
            this.isEnabled = true;
            await this.saveSettings(true);

            // Inject styles
            this.injectStyles();

            // Fetch weight data
            await this.fetchWeights();

            // Start observing page
            this.startObserver();

            // Initial scan
            this.scanPage();
        },

        // Disable the module
        async disable() {
            console.log("📊 Disabling OC Weights...");
            this.isEnabled = false;
            await this.saveSettings(false);

            // Stop observer
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }

            // Remove all weight boxes
            this.removeAllWeightBoxes();

            // Remove styles
            this.removeStyles();
        },

        // Inject CSS styles
        injectStyles() {
            if (document.getElementById(this.STYLE_ID)) return;

            const css = `
                .oc-weight-box {
                    margin-top: 6px;
                    padding: 6px;
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 6px;
                    background: rgba(255,255,255,0.03);
                }
                .oc-weight-box .label {
                    display: block;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: .05em;
                    opacity: .8;
                    padding-bottom: 3px;
                    margin-bottom: 4px;
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                }
                .oc-weight-box .value {
                    display: block;
                    font-size: 16px;
                    font-weight: 700;
                    margin-top: 2px;
                }
            `;

            const style = document.createElement("style");
            style.id = this.STYLE_ID;
            style.textContent = css;
            document.head.appendChild(style);
        },

        // Remove styles
        removeStyles() {
            const style = document.getElementById(this.STYLE_ID);
            if (style) {
                style.remove();
            }
        },

        // Fetch weight data from API
        async fetchWeights() {
            try {
                console.log("📊 Fetching OC weights from API...");

                const response = await fetch(this.API_URL, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status: ${response.status}`);
                }

                const data = await response.json();

                // Normalize the data
                this.weightData = {};
                for (const [ocName, roles] of Object.entries(data)) {
                    const ocKey = this.normalize(ocName);
                    this.weightData[ocKey] = {};
                    for (const [roleName, value] of Object.entries(roles)) {
                        this.weightData[ocKey][this.normalize(roleName)] = value;
                    }
                }

                console.log("✅ OC weights loaded successfully");
                console.log(`📊 Loaded weights for ${Object.keys(this.weightData).length} OCs`);
            } catch (error) {
                console.error("❌ Failed to fetch OC weights:", error);
                console.error("API URL:", this.API_URL);

                // Don't disable the module, just log the error
                // The module will try again on next page load
            }
        },

        // Normalize names: lowercase + remove non-alphanumerics
        normalize(str) {
            return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        },

        // Get OC name from root element
        getOCName(ocRoot) {
            const el = ocRoot.querySelector(".panelTitle___aoGuV");
            return el ? el.textContent.trim() : null;
        },

        // Add weight boxes to an OC
        addWeightBoxes(ocRoot) {
            const ocNameRaw = this.getOCName(ocRoot);
            if (!ocNameRaw) return;

            const ocKey = this.normalize(ocNameRaw);
            const ocWeights = this.weightData[ocKey];
            if (!ocWeights) return;

            const roles = ocRoot.querySelectorAll(".wrapper___Lpz_D");
            roles.forEach((role) => {
                // Skip if already has weight box
                if (role.querySelector(".oc-weight-box")) return;

                const roleNameRaw = (role.querySelector(".title___UqFNy")?.textContent || "").trim();
                const roleKey = this.normalize(roleNameRaw);

                const weight = ocWeights[roleKey];
                if (weight == null) return;

                const box = document.createElement("div");
                box.className = "oc-weight-box";
                box.innerHTML = `
                    <span class="label">Weight</span>
                    <span class="value">${weight.toFixed(1)}%</span>
                `;
                role.appendChild(box);
            });
        },

        // Scan page for OCs
        scanPage() {
            if (!this.isEnabled) return;

            const ocs = document.querySelectorAll('div.wrapper___U2Ap7[data-oc-id]');
            ocs.forEach(oc => this.addWeightBoxes(oc));
        },

        // Start mutation observer
        startObserver() {
            if (this.observer) return;

            this.observer = new MutationObserver(() => this.scanPage());
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        // Remove all weight boxes
        removeAllWeightBoxes() {
            const boxes = document.querySelectorAll('.oc-weight-box');
            boxes.forEach(box => box.remove());
        },

        // Toggle module on/off
        async toggle() {
            if (this.isEnabled) {
                await this.disable();
            } else {
                await this.enable();
            }
        }
    };

    // Export module to global namespace
    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.OCWeights = OCWeightsModule;
    console.log("✅ OC Weights Module loaded and ready");

})();
