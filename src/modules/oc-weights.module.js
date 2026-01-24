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
                    const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
                    if (settings && settings['oc-weights']) {
                        return settings['oc-weights'].isEnabled !== false;
                    }
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
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings') || {};
                    if (!settings['oc-weights']) {
                        settings['oc-weights'] = {};
                    }
                    settings['oc-weights'].isEnabled = enabled;
                    await window.SidekickModules.Core.ChromeStorage.set('sidekick_settings', settings);
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

        // Fetch weight data from API (disabled - using fallback data to avoid API errors)
        async fetchWeights() {
            // Skip API call and use hardcoded fallback data directly
            // This prevents "Failed to fetch OC weights" error spam
            console.log("📊 Using hardcoded OC weights data (API fetch disabled)");
            this.loadFallbackData();
        },

        // Load hardcoded fallback data
        loadFallbackData() {
            const fallbackData = { "MobMentality": { "Looter1": 33.96650646, "Looter2": 26.48850715, "Looter3": 18.36444021, "Looter4": 21.18054618 }, "PetProject": { "Kidnapper": 30.92676727, "Muscle": 32.62884615, "Picklock": 36.44438658 }, "CashMeIfYouCan": { "Thief1": 54.18134868, "Thief2": 28.04221236, "Lookout": 17.77643896 }, "BestOfTheLot": { "Picklock": 20.73368395, "CarThief": 19.5328795, "Muscle": 43.67657367, "Imitator": 16.05686289 }, "MarketForces": { "Enforcer": 29.4020952, "Negotiator": 27.22899702, "Lookout": 16.36647471, "Arsonist": 4.456390991, "Muscle": 22.54604208 }, "SmokeAndWingMirrors": { "CarThief": 50.89511253, "Imitator": 27.10752487, "Hustler1": 9.000400474, "Hustler2": 12.99696212 }, "GaslightTheWay": { "Imitator1": 9.394999578, "Imitator2": 27.46467248, "Imitator3": 41.32194207, "Looter1": 9.394999578, "Looter2": -0.0003562738035, "Looter3": 12.42374256 }, "StageFright": { "Enforcer": 15.67090339, "Muscle1": 20.01365691, "Muscle2": 2.659259022, "Muscle3": 9.165081208, "Lookout": 6.188888612, "Sniper": 46.30221086 }, "SnowBlind": { "Hustler": 48.40533937, "Imitator": 34.56895649, "Muscle1": 8.512932288, "Muscle2": 8.512771845 }, "LeaveNoTrace": { "Techie": 29.01099583, "Negotiator": 34.1307307, "Imitator": 36.85827347 }, "NoReserve": { "CarThief": 30.50667524, "Techie": 38.37053402, "Engineer": 31.12279075 }, "CounterOffer": { "Robber": 35.94505104, "Looter": 6.998750427, "Hacker": 12.1275068, "Picklock": 16.5353262, "Engineer": 28.39336554 }, "GuardianÁngels": { "Enforcer": 27.404376861170505, "Hustler": 42.10252351813381, "Engineer": 30.49309962016114 }, "HoneyTrap": { "Enforcer": 26.98428598, "Muscle1": 30.86556191, "Muscle2": 42.15015211 }, "BiddingWar": { "Robber1": 7.100963041, "Driver": 12.5356157, "Robber2": 22.87302433, "Robber3": 31.67051915, "Bomber1": 7.846987259, "Bomber2": 17.97289051 }, "SneakyGitGrab": { "Imitator": 17.539756110007634, "Pickpocket": 50.831934101247086, "Hacker": 14.481791981545502, "Techie": 17.146517807199775 }, "BlastFromThePast": { "Picklock1": 10.84876785, "Hacker": 12.05662038, "Engineer": 24.0155975, "Bomber": 15.61710346, "Muscle": 34.58815764, "Picklock2": 2.873753178 }, "BreakTheBank": { "Robber": 12.69693448, "Muscle1": 13.51973049, "Muscle2": 10.10353513, "Thief1": 2.930695727, "Muscle3": 31.65263066, "Thief2": 29.09647352 }, "StackingTheDeck": { "CatBurglar": 23.43294188, "Driver": 2.956670602, "Hacker": 25.43825688, "Imitator": 48.17213064 }, "ClinicalPrecision": { "Imitator": 43.31533431, "CatBurglar": 18.93905648, "Assassin": 16.0581518, "Cleaner": 21.68745741 }, "ManifestCruelty": { "Hacker": 16.32001273063874, "Interrogator": 23.492099324887565, "Reviver": 46.27406770738405, "CatBurglar": 13.913820237089643 }, "AceInTheHole": { "Imitator": 21.07540412, "Muscle1": 18.29831955, "Muscle2": 24.65084339, "Hacker": 28.3434151, "Driver": 7.632017841 }, "GoneFission": { "Hijacker": 24.93974876222353, "Engineer": 15.565232594311826, "Pickpocket": 16.53377808965346, "Imitator": 24.93974876222354, "Bomber": 18.021491791587643 }, "CraneReaction": { "Sniper": 40.73886856841122, "Lookout": 16.623960934255475, "Engineer": 8.286087919744741, "Bomber": 15.8901690506963, "Muscle1": 10.683294142974866, "Muscle2": 7.777619383917385 } };

            // Normalize the fallback data
            this.weightData = {};
            for (const [ocName, roles] of Object.entries(fallbackData)) {
                const ocKey = this.normalize(ocName);
                this.weightData[ocKey] = {};
                for (const [roleName, value] of Object.entries(roles)) {
                    this.weightData[ocKey][this.normalize(roleName)] = value;
                }
            }

            console.log("✅ OC weights loaded from fallback data");
            console.log(`📊 Loaded weights for ${Object.keys(this.weightData).length} OCs`);
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
