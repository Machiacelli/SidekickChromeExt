/**
 * Mission Tracker Module
 * Polls the Torn API for active missions and shows an icon in the status tray.
 * Version: 1.0.0
 */

const MissionTrackerModule = {
    name: 'Mission Tracker',
    version: '1.0.0',

    STORAGE_KEY: 'mission-tracker',
    ICON_ID: 'sidekick-mission-tracker-icon',
    STYLES_ID: 'sidekick-mission-tracker-styles',

    // State
    isEnabled: false,
    openInNewTab: false,
    checkIntervalMinutes: 30,

    pollTimer: null,
    observer: null,

    // ─── Init ────────────────────────────────────────────────────────────────

    async init() {
        console.log('🎯 Mission Tracker: initializing...');
        await this.loadSettings();

        if (this.isEnabled) {
            this.startPolling();
        }

        this.startObserver();

        // React to settings changes made in the settings panel
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.sidekick_settings) {
                this.loadSettings().then(() => {
                    if (this.isEnabled) {
                        this.startPolling();
                    } else {
                        this.stopPolling();
                        this.removeIcon();
                    }
                });
            }
        });

        console.log('🎯 Mission Tracker: initialized');
    },

    // ─── Settings ────────────────────────────────────────────────────────────

    async loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            if (data && data[this.STORAGE_KEY]) {
                const s = data[this.STORAGE_KEY];
                this.isEnabled = s.isEnabled || false;
                this.openInNewTab = s.openInNewTab || false;
                this.checkIntervalMinutes = s.checkIntervalMinutes || 5;
            }
        } catch (e) {
            console.error('🎯 Mission Tracker: failed to load settings:', e);
        }
    },

    async saveSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings') || {};
            data[this.STORAGE_KEY] = {
                isEnabled: this.isEnabled,
                openInNewTab: this.openInNewTab,
                checkIntervalMinutes: this.checkIntervalMinutes,
            };
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_settings', data);
        } catch (e) {
            console.error('🎯 Mission Tracker: failed to save settings:', e);
        }
    },

    // ─── API ─────────────────────────────────────────────────────────────────

    async getApiKey() {
        try {
            return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key') || '';
        } catch {
            return '';
        }
    },

    async fetchData(url) {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'proxyFetch', url });
            if (response && response.success) return response.data;
            throw new Error(response?.error || 'Background fetch failed');
        } catch {
            const r = await fetch(url);
            return r.json();
        }
    },

    // ─── Polling ─────────────────────────────────────────────────────────────

    startPolling() {
        this.stopPolling();
        this.checkMissions();
        this.pollTimer = setInterval(() => this.checkMissions(), this.checkIntervalMinutes * 60 * 1000);
    },

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },

    async checkMissions() {
        const apiKey = await this.getApiKey();
        if (!apiKey) return;

        try {
            const data = await this.fetchData(`https://api.torn.com/user/?selections=missions&key=${apiKey}`);
            if (data.error) {
                console.warn('🎯 Mission Tracker: API error:', data.error.error);
                return;
            }

            const missions = data.missions || {};

            // Only show icon for missions the player has actively CLAIMED.
            // Dormant/available missions exist for every player always — ignore those.
            const active = Object.values(missions).filter(m => {
                const s = (m.status || '').toLowerCase();
                return s === 'accepted' || s === 'active' || s === 'started';
            });

            if (active.length > 0) {
                this.showIcon(active);
            } else {
                this.removeIcon();
            }
        } catch (e) {
            console.error('🎯 Mission Tracker: check failed:', e);
        }
    },

    // ─── Icon ─────────────────────────────────────────────────────────────────

    showIcon(missions) {
        const statusUl = document.querySelector('ul[class*="status-icons"]');
        if (!statusUl) return;

        this.ensureStyles();

        const count = missions.length;
        const firstName = missions[0]?.title || 'Unknown';
        const label = count === 1
            ? `Active Mission: ${firstName}`
            : `${count} Active Missions — ${firstName}`;

        const existing = document.getElementById(this.ICON_ID);
        if (existing) {
            const a = existing.querySelector('a');
            if (a) {
                a.href = 'https://www.torn.com/loader.php?sid=missions';
                a.setAttribute('aria-label', label);
                if (typeof a.__sidekickUpdateTipText === 'function') {
                    a.__sidekickUpdateTipText(label);
                }
            }
            return;
        }

        const li = document.createElement('li');
        li.id = this.ICON_ID;

        const a = document.createElement('a');
        a.href = 'https://www.torn.com/loader.php?sid=missions';
        if (this.openInNewTab) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
        a.setAttribute('aria-label', label);
        a.setAttribute('data-is-tooltip-opened', 'false');

        const span = document.createElement('span');
        span.className = 'sk-mission-icon-glyph';
        span.textContent = '🎯';

        a.appendChild(span);
        li.appendChild(a);
        statusUl.appendChild(li);

        this._attachTooltip(a);
    },

    removeIcon() {
        document.getElementById(this.ICON_ID)?.remove();
    },

    ensureStyles() {
        if (document.getElementById(this.STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = this.STYLES_ID;
        style.textContent = `
            #${this.ICON_ID} {
                background: none !important;
                background-image: none !important;
                -webkit-mask: none !important;
                mask: none !important;
            }
            #${this.ICON_ID}::before,
            #${this.ICON_ID}::after {
                content: none !important;
            }
            #${this.ICON_ID} a {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                text-decoration: none !important;
                width: 100% !important;
                height: 100% !important;
            }
            .sk-mission-icon-glyph {
                font-size: 15px;
                line-height: 1;
                display: block;
                animation: sk-mission-pulse 2.5s ease-in-out infinite;
            }
            @keyframes sk-mission-pulse {
                0%, 100% { filter: none; }
                50% { filter: drop-shadow(0 0 4px rgba(102,187,106,0.9)); }
            }
        `;
        document.head.appendChild(style);
    },

    // Reuses blood-bag-reminder tooltip pattern
    _attachTooltip(anchor) {
        const CLS = {
            tip: 'tooltip___aWICR tooltipCustomClass___gbI4V',
            arrowWrap: 'arrow___yUDKb top___klE_Y',
            arrowIcon: 'arrowIcon___KHyjw',
        };
        let tipEl = null, hideTimer = null;

        const build = (text) => {
            const el = document.createElement('div');
            el.className = CLS.tip;
            el.setAttribute('role', 'tooltip');
            el.setAttribute('tabindex', '-1');
            el.style.cssText = 'position:absolute;transition-property:opacity;transition-duration:200ms;opacity:0;';
            const b = document.createElement('b');
            b.textContent = text;
            el.appendChild(b);
            const aw = document.createElement('div');
            aw.className = CLS.arrowWrap;
            const ai = document.createElement('div');
            ai.className = CLS.arrowIcon;
            aw.appendChild(ai);
            el.appendChild(aw);
            return el;
        };

        const setText = (text) => {
            if (!tipEl) return;
            const b = tipEl.querySelector('b');
            if (b) b.textContent = text;
        };

        const position = () => {
            if (!tipEl) return;
            const r = anchor.getBoundingClientRect();
            const left = Math.max(8, Math.min(Math.round(r.left + (r.width - tipEl.offsetWidth) / 2), window.innerWidth - tipEl.offsetWidth - 8));
            const top = Math.round(r.top - tipEl.offsetHeight - 14);
            tipEl.style.left = left + 'px';
            tipEl.style.top = (top < 8 ? Math.round(r.bottom + 10) : top) + 'px';
        };

        const show = () => {
            clearTimeout(hideTimer);
            const text = anchor.getAttribute('aria-label');
            if (!text) return;
            if (!tipEl) { tipEl = build(text); document.body.appendChild(tipEl); }
            else { setText(text); }
            anchor.setAttribute('data-is-tooltip-opened', 'true');
            tipEl.style.opacity = '0'; tipEl.style.left = '-9999px'; tipEl.style.top = '-9999px';
            requestAnimationFrame(() => { position(); requestAnimationFrame(() => { if (tipEl) tipEl.style.opacity = '1'; }); });
        };

        const hide = (immediate = false) => {
            if (!tipEl) return;
            anchor.setAttribute('data-is-tooltip-opened', 'false');
            if (immediate) { tipEl.remove(); tipEl = null; return; }
            tipEl.style.opacity = '0';
            hideTimer = setTimeout(() => { tipEl?.remove(); tipEl = null; }, 210);
        };

        anchor.__sidekickUpdateTipText = setText;
        anchor.addEventListener('mouseenter', show);
        anchor.addEventListener('mouseleave', () => hide(false));
        anchor.addEventListener('focus', show);
        anchor.addEventListener('blur', () => hide(true));
    },

    // ─── Observer ────────────────────────────────────────────────────────────

    startObserver() {
        if (this.observer) return;
        let debounceTimer = null;
        this.observer = new MutationObserver(() => {
            if (!this.isEnabled) return;
            const statusUl = document.querySelector('ul[class*="status-icons"]');
            // Only trigger when status bar exists but our icon is absent.
            // Debounced 15 s to prevent looping when no missions are active.
            if (statusUl && !document.getElementById(this.ICON_ID)) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.checkMissions(), 15000);
            }
        });
        this.observer.observe(document.documentElement, { childList: true, subtree: true });
    },

    stopObserver() {
        if (this.observer) { this.observer.disconnect(); this.observer = null; }
    },

    // ─── Public API ──────────────────────────────────────────────────────────

    enable() {
        this.isEnabled = true;
        this.saveSettings();
        this.startPolling();
    },

    disable() {
        this.isEnabled = false;
        this.saveSettings();
        this.stopPolling();
        this.removeIcon();
    },
};

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.MissionTracker = MissionTrackerModule;
console.log('🎯 Mission Tracker module registered');
