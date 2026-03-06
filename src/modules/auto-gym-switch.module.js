// Auto Gym Switch Module - Automatically switches to best gym before training
const AutoGymSwitchModule = {
    isEnabled: false,
    STORAGE_KEY: 'auto-gym-switch',

    currentGym: null,
    originalFetch: null,

    gymInfo: {
        1: { str: 2, spe: 2, def: 2, dex: 2 },
        2: { str: 2.4, spe: 2.4, def: 2.7, dex: 2.4 },
        3: { str: 2.7, spe: 3.2, def: 3.0, dex: 2.7 },
        4: { str: 3.2, spe: 3.2, def: 3.2, dex: 0 },
        5: { str: 3.4, spe: 3.6, def: 3.4, dex: 3.2 },
        6: { str: 3.4, spe: 3.6, def: 3.6, dex: 3.8 },
        7: { str: 3.7, spe: 0, def: 3.7, dex: 3.7 },
        8: { str: 4, spe: 4, def: 4, dex: 4 },
        9: { str: 4.8, spe: 4.4, def: 4, dex: 4.2 },
        10: { str: 4.4, spe: 4.6, def: 4.8, dex: 4.4 },
        11: { str: 5, spe: 4.6, def: 5.2, dex: 4.6 },
        12: { str: 5, spe: 5.2, def: 5, dex: 5 },
        13: { str: 5, spe: 5.4, def: 4.8, dex: 5.2 },
        14: { str: 5.5, spe: 5.7, def: 5.5, dex: 5.2 },
        15: { str: 0, spe: 5.5, def: 5.5, dex: 5.7 },
        16: { str: 6, spe: 6, def: 6, dex: 6 },
        17: { str: 6, spe: 6.2, def: 6.4, dex: 6.2 },
        18: { str: 6.5, spe: 6.4, def: 6.2, dex: 6.2 },
        19: { str: 6.4, spe: 6.5, def: 6.4, dex: 6.8 },
        20: { str: 6.4, spe: 6.4, def: 6.8, dex: 7 },
        21: { str: 7, spe: 6.4, def: 6.4, dex: 6.5 },
        22: { str: 6.8, spe: 6.5, def: 7, dex: 6.5 },
        23: { str: 6.8, spe: 7, def: 7, dex: 6.8 },
        24: { str: 7.3, spe: 7.3, def: 7.3, dex: 7.3 },
        25: { str: 0, spe: 0, def: 7.5, dex: 7.5 },
        26: { str: 7.5, spe: 7.5, def: 0, dex: 0 },
        27: { str: 8, spe: 0, def: 0, dex: 0 },
        28: { str: 0, spe: 0, def: 8, dex: 0 },
        29: { str: 0, spe: 8, def: 0, dex: 0 },
        30: { str: 0, spe: 0, def: 0, dex: 8 },
        31: { str: 9, spe: 9, def: 9, dex: 9 },
        32: { str: 10, spe: 10, def: 10, dex: 10 },
        33: { str: 3.4, spe: 3.4, def: 4.6, dex: 0 }
    },

    picks: { str: [], def: [], spe: [], dex: [] },

    async init() {
        console.log('💪 Auto Gym Switch initializing...');

        await this.loadSettings();

        if (this.isEnabled) {
            this.enable();
        }

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[this.STORAGE_KEY]) {
                this.loadSettings();
            }
        });

        console.log('💪 Auto Gym Switch initialized');
    },

    async loadSettings() {
        try {
            const settings = await window.SidekickModules.Core.ChromeStorage.get(this.STORAGE_KEY) || {};
            this.isEnabled = settings.enabled || false;
        } catch (error) {
            console.error('💪 Failed to load settings:', error);
        }
    },

    async saveSettings() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, {
                enabled: this.isEnabled
            });
        } catch (error) {
            console.error('💪 Failed to save settings:', error);
        }
    },

    enable() {
        this.isEnabled = true;
        this.saveSettings();
        this.startMonitoring();
        console.log('💪 Auto Gym Switch enabled');
    },

    disable() {
        this.isEnabled = false;
        this.saveSettings();
        console.log('💪 Auto Gym Switch disabled');
    },

    startMonitoring() {
        if (!this.isEnabled) return;
        if (!/gym\.php/.test(location.href)) return;

        this.setupFetchInterception();
    },

    setupFetchInterception() {
        if (this.originalFetch) return; // Already set up

        this.originalFetch = window.fetch;
        const self = this;

        window.fetch = async function (...args) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

            // ── Intercept initial gym info load ──────────────────────────────
            if (url.includes('/gym.php?step=getInitialGymInfo')) {
                const result = await self.originalFetch(...args);
                try {
                    const data = await result.clone().json();
                    if (data.gyms) self.processGymData(data.gyms);
                } catch (e) { /* ignore */ }
                return result;
            }

            // ── Intercept manual gym changes / membership purchases ──────────
            if (url.includes('/gym.php?step=changeGym') || url.includes('/gym.php?step=purchaseMembership')) {
                const result = await self.originalFetch(...args);
                try {
                    const data = await result.clone().json();
                    if (data.success && args[1]?.body) {
                        const body = typeof args[1].body === 'string' ? JSON.parse(args[1].body) : {};
                        if (body.gymID) self.currentGym = Number(body.gymID);
                        if (!self.gymInfo[self.currentGym]?.checked) {
                            self.addGymToPicks(self.currentGym);
                            for (const s in self.picks) self.picks[s].sort((a, b) => b.gain - a.gain || b.id - a.id);
                        }
                    }
                } catch (e) { /* ignore */ }
                return result;
            }

            // ── Intercept training — switch gym BEFORE the train fires ───────
            if (url.includes('/gym.php?step=train') && self.isEnabled) {
                try {
                    const bodyStr = args[1]?.body;
                    const body = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : {};
                    const stat = (body.stat || '').substring(0, 3); // str/def/spe/dex
                    const bestGym = self.getBestGym(stat);

                    if (bestGym && bestGym !== self.currentGym) {
                        console.log(`💪 Switching from gym ${self.currentGym} to ${bestGym} for stat: ${stat}`);
                        // Switch the gym; return a synthetic response so Torn's UI
                        // shows the swap message (matching original script behaviour)
                        const switchMsg = await self.switchGym(bestGym);
                        return new Response(JSON.stringify({ message: switchMsg }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } catch (error) {
                    console.error('💪 Failed to process training request:', error);
                }
            }

            return await self.originalFetch(...args);
        };
    },

    processGymData(gymsData) {
        const classList = ['specialist', 'heavyweight', 'middleweight', 'lightweight', 'jail'];

        for (const gymClass of classList) {
            if (!gymsData[gymClass]) continue;

            for (const gym of gymsData[gymClass]) {
                this.gymInfo[gym.id].name = gym.name;
                this.gymInfo[gym.id].cost = gym.energyCost;

                if (gym.status === 'active') {
                    this.currentGym = gym.id;
                }

                if (gym.status === 'available' || gym.status === 'active') {
                    this.addGymToPicks(gym.id);
                }
            }
        }

        // Sort picks by gain
        for (const stat in this.picks) {
            this.picks[stat].sort((a, b) => {
                if (a.gain === b.gain) return b.id - a.id;
                return b.gain - a.gain;
            });
        }
    },

    addGymToPicks(gymId) {
        const gymStats = this.gymInfo[gymId];
        if (!gymStats) return;

        for (const stat of ['str', 'def', 'spe', 'dex']) {
            if (gymStats[stat]) {
                this.picks[stat].push({
                    id: gymId,
                    gain: gymStats[stat]
                });
            }
        }
    },

    getBestGym(stat) {
        const gymList = this.picks[stat];
        if (!gymList || gymList.length === 0) return null;

        for (const gym of gymList) {
            // Check if gym is locked (27-32 are special gyms)
            if (gym.id >= 27 && gym.id <= 32) {
                const gymElement = document.querySelector(`[class*='gym-${gym.id}']`);
                if (gymElement && gymElement.parentElement) {
                    const isLocked = Array.from(gymElement.parentElement.classList).some(c => c.includes('locked'));
                    if (!isLocked) return gym.id;
                }
            } else {
                return gym.id;
            }
        }

        return null;
    },

    async switchGym(gymId) {
        try {
            const response = await this.originalFetch('/gym.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: 'changeGym', gymID: gymId })
            });

            const data = await response.json();

            if (data.success) {
                this.currentGym = gymId;
                if (this.gymInfo[gymId]) this.gymInfo[gymId].checked = true;
                console.log(`💪 Successfully switched to gym ${gymId}`);
                this.updateGymUI(gymId);
                return data.message || `Switched to gym ${gymId}`;
            } else {
                console.error('💪 Failed to switch gym:', data.message);
                return data.message || 'Gym switch failed';
            }
        } catch (error) {
            console.error('💪 Gym switch error:', error);
            return 'Gym switch error';
        }
    },

    updateGymUI(gymId) {
        try {
            const gymInfo = this.gymInfo[gymId];
            if (!gymInfo) return;

            // Update gym name
            const nameLabel = document.querySelector('[class^=\'notificationText\'] b');
            if (nameLabel) nameLabel.innerHTML = gymInfo.name;

            // Update energy cost
            const energyLabels = document.querySelectorAll('[class^=\'description\'] p');
            if (energyLabels.length > 1) {
                energyLabels[1].innerHTML = gymInfo.cost + ' energy per train';
            }

            // Update active button
            const activeButton = document.querySelector('[class*=\'active\'][class^=\'gymButton\']');
            if (activeButton) {
                const activeClass = Array.from(activeButton.classList).find(c => c.includes('active'));
                if (activeClass) {
                    activeButton.classList.remove(activeClass);
                    const newActive = document.querySelector(`[class*='gym-${gymId}']`);
                    if (newActive && newActive.parentElement) {
                        newActive.parentElement.classList.add(activeClass);
                    }
                }
            }

            // Update logo
            const logo = document.querySelector('[class^=\'logo\'] img');
            if (logo) {
                const srcParts = logo.src.split('/');
                srcParts[srcParts.length - 1] = gymId + '.png';
                logo.src = srcParts.join('/');
            }
        } catch (error) {
            console.error('💪 Failed to update UI:', error);
        }
    }
};

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.AutoGymSwitch = AutoGymSwitchModule;

console.log('💪 Auto Gym Switch module registered');
