/**
 * Flight Tracker Module
 * Automatically reads player travel status from profile page DOM.
 * Opens a persistent live window showing status + countdown on "Returning" state.
 */

(function () {
    'use strict';

    // ── Travel times per country (seconds) ────────────────────────────────────
    // Keyed by the normalized country name as it appears in Torn status text
    const TRAVEL_TIMES = {
        'Mexico':                { standard: 26*60, airstrip: 18*60, business: 8*60  },
        'Cayman Islands':        { standard: 35*60, airstrip: 25*60, business: 11*60 },
        'Canada':                { standard: 41*60, airstrip: 29*60, business: 12*60 },
        'Hawaii':                { standard: 134*60, airstrip: 94*60, business: 40*60},
        'United Kingdom':        { standard: 159*60, airstrip: 111*60, business: 48*60},
        'Argentina':             { standard: 167*60, airstrip: 117*60, business: 50*60},
        'Switzerland':           { standard: 175*60, airstrip: 123*60, business: 53*60},
        'Japan':                 { standard: 225*60, airstrip: 158*60, business: 68*60},
        'China':                 { standard: 242*60, airstrip: 169*60, business: 72*60},
        'United Arab Emirates':  { standard: 271*60, airstrip: 190*60, business: 81*60},
        'South Africa':          { standard: 297*60, airstrip: 208*60, business: 89*60},
    };

    // Country name aliases from Torn status text
    const COUNTRY_ALIASES = {
        'ciudad juárez': 'Mexico', 'ciudad juarez': 'Mexico',
        'george town': 'Cayman Islands',
        'toronto': 'Canada',
        'honolulu': 'Hawaii',
        'london': 'United Kingdom', 'uk': 'United Kingdom',
        'buenos aires': 'Argentina',
        'zurich': 'Switzerland',
        'tokyo': 'Japan',
        'beijing': 'China',
        'dubai': 'United Arab Emirates', 'uae': 'United Arab Emirates',
        'johannesburg': 'South Africa',
    };

    function normalizeCountry(raw) {
        if (!raw) return null;
        const lower = raw.trim().toLowerCase();
        return COUNTRY_ALIASES[lower] || Object.keys(TRAVEL_TIMES).find(k => k.toLowerCase() === lower) || raw.trim();
    }

    function getTravelTime(country, planeType) {
        const c = TRAVEL_TIMES[country];
        if (!c) return null;
        if (planeType === 'airstrip') return c.airstrip;
        if (planeType === 'business') return c.business;
        return c.standard;
    }

    // ── Module ────────────────────────────────────────────────────────────────
    const FlightTrackerModule = {
        isInitialized: false,

        // Per-player tracking state stored in memory (not persisted — tracking
        // only makes sense while the profile page is open)
        // { playerId: { name, status, country, planeType, landingTime, countdownInterval, observer, windowEl } }
        tracking: new Map(),

        async init() {
            console.log('✈️ Flight Tracker: initializing…');
            try {
                await this._waitForCore();
                this._setupPageObserver();
                this.isInitialized = true;
                console.log('✅ Flight Tracker ready');
            } catch (e) {
                console.error('❌ Flight Tracker init failed:', e);
            }
        },

        // Wait for SidekickModules.Core
        _waitForCore() {
            return new Promise(resolve => {
                const check = () => window.SidekickModules?.Core ? resolve() : setTimeout(check, 100);
                check();
            });
        },

        // Watch for Torn's SPA navigation (URL changes without full reload)
        _setupPageObserver() {
            this._onPageChange();
            // Torn re-renders content; watch for URL changes via MutationObserver
            let lastHref = location.href;
            new MutationObserver(() => {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    this._onPageChange();
                }
            }).observe(document.body, { childList: true, subtree: true });
        },

        _onPageChange() {
            const match = location.href.match(/profiles\.php.*XID=(\d+)/);
            if (match) {
                const playerId = match[1];
                // Inject button once the link list is ready
                this._injectButton(playerId);
            }
        },

        // ── Button injection ──────────────────────────────────────────────────
        async _injectButton(playerId) {
            if (document.querySelector('.sidekick-flight-tracker-btn')) return;

            const linksList = await this._waitForElement('#top-page-links-list', 5000);
            if (!linksList) return;
            if (document.querySelector('.sidekick-flight-tracker-btn')) return;

            const btn = document.createElement('a');
            btn.className = 'sidekick-flight-tracker-btn t-clear h c-pointer line-h24 right';
            btn.id = `sidekick-track-btn-${playerId}`;
            btn.style.cssText = 'outline:none;text-decoration:none;';
            const isTracking = this.tracking.has(playerId);
            this._setButtonState(btn, isTracking);

            // Insert after BSP button (to its left in float:right layout)
            const bspBtn = linksList.querySelector('.TDup_divBtnBsp');
            if (bspBtn) {
                bspBtn.insertAdjacentElement('afterend', btn);
            } else {
                linksList.appendChild(btn);
                // Watch for BSP appearing later
                new MutationObserver((_, obs) => {
                    const bsp = linksList.querySelector('.TDup_divBtnBsp');
                    const ours = linksList.querySelector('.sidekick-flight-tracker-btn');
                    if (bsp && ours) { bsp.insertAdjacentElement('afterend', ours); obs.disconnect(); }
                }).observe(linksList, { childList: true });
            }

            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this._handleButtonClick(playerId, btn);
            });
        },

        _setButtonState(btn, isTracking) {
            const bg = isTracking
                ? 'linear-gradient(135deg,#2196F3,#1976D2)'
                : 'linear-gradient(135deg,#4CAF50,#45a049)';
            const text = isTracking ? '✈️ Tracking ▸' : '✈️ Track';
            btn.title = isTracking ? 'Click to view tracker' : 'Click to track this player';
            btn.innerHTML = `<div style="background:${bg};color:white;padding:3px 8px;border-radius:4px;
                font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.3);
                white-space:nowrap;line-height:18px;display:inline-block;">${text}</div>`;
        },

        // ── Button click ──────────────────────────────────────────────────────
        _handleButtonClick(playerId, btn) {
            if (this.tracking.has(playerId)) {
                // Toggle window visibility if already tracking
                const state = this.tracking.get(playerId);
                if (state.windowEl && document.body.contains(state.windowEl)) {
                    if (state.windowEl.style.display === 'none') {
                        state.windowEl.style.display = 'block';
                    } else {
                        state.windowEl.style.display = 'none';
                    }
                } else {
                    this._openWindow(playerId, btn);
                }
            } else {
                this._startTracking(playerId, btn);
            }
        },

        // ── Start tracking ────────────────────────────────────────────────────
        _startTracking(playerId, btn) {
            const name = this._getPlayerName();
            const state = {
                name,
                status: 'unknown',
                country: null,
                planeType: null,
                landingTime: null,
                countdownInterval: null,
                observer: null,
                windowEl: null,
            };
            this.tracking.set(playerId, state);
            this._setButtonState(btn, true);

            // Read status immediately, then open window
            this._readStatus(playerId);
            this._openWindow(playerId, btn);

            // Watch DOM for status changes (Torn updates status text dynamically)
            const observer = new MutationObserver(this._debounce(() => {
                this._readStatus(playerId);
            }, 400));
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            state.observer = observer;

            // Cleanup if user navigates away
            window.addEventListener('beforeunload', () => this._stopTracking(playerId), { once: true });
        },

        // ── Read status from DOM ──────────────────────────────────────────────
        _readStatus(playerId) {
            const state = this.tracking.get(playerId);
            if (!state) return;

            const { text, planeType } = this._scanStatusDOM();
            if (!text) return;

            const parsed = this._parseStatus(text);
            if (!parsed) return;

            const country = normalizeCountry(parsed.country);
            const prevStatus = state.status;

            state.status = parsed.status;
            state.country = country;
            if (planeType) state.planeType = planeType;

            // Start countdown the moment we detect "returning"
            if (parsed.status === 'returning' && prevStatus !== 'returning' && country) {
                this._startCountdown(playerId, country, state.planeType || 'standard');
            }

            // If status changed back from returning (landed), stop countdown
            if (parsed.status !== 'returning' && prevStatus === 'returning') {
                this._clearCountdown(state);
                state.landingTime = null;
            }

            this._refreshWindow(playerId);
        },

        // Scan page DOM for travel status text and plane type
        _scanStatusDOM() {
            // First try elements with travel-related classes
            const candidates = Array.from(document.querySelectorAll(
                '[class*="status"], [class*="travel"], [class*="icons"], [class*="userStatus"]'
            ));

            for (const el of candidates) {
                const text = el.textContent?.trim() || '';
                if (this._parseStatus(text)) {
                    const planeType = this._detectPlaneType(el);
                    return { text, planeType };
                }
            }

            // Fallback: broad text scan of content wrapper
            const wrapper = document.querySelector('.content-wrapper, #mainContainer, body');
            if (!wrapper) return { text: null, planeType: null };

            const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                const text = node.textContent?.trim() || '';
                if (this._parseStatus(text)) {
                    const planeType = this._detectPlaneType(node.parentElement);
                    return { text, planeType };
                }
            }

            return { text: null, planeType: null };
        },

        // Detect plane type from element or its nearby siblings/parents
        _detectPlaneType(el) {
            // Walk up to find a container that may have travel-class children
            let node = el;
            for (let i = 0; i < 6; i++) {
                if (!node) break;
                const cls = (node.className || '').toString().toLowerCase();
                if (cls.includes('airstrip')) return 'airstrip';
                if (cls.includes('business')) return 'business';
                // Check images inside
                const imgs = node.querySelectorAll?.('img') || [];
                for (const img of imgs) {
                    const src = (img.src || '').toLowerCase();
                    if (src.includes('airstrip')) return 'airstrip';
                    if (src.includes('business')) return 'business';
                }
                node = node.parentElement;
            }
            return 'standard';
        },

        // Parse status text → { status, country } or null
        _parseStatus(text) {
            if (!text) return null;
            let m;

            m = text.match(/Traveling\s+to\s+(.+?)(?:\s*$|\n)/i);
            if (m) return { status: 'traveling', country: m[1].trim() };

            m = text.match(/Returning\s+to\s+Torn\s+from\s+(.+?)(?:\s*$|\n)/i);
            if (m) return { status: 'returning', country: m[1].trim() };

            m = text.match(/^In\s+(.+?)(?:\s*$|\n)/i);
            if (m) return { status: 'abroad', country: m[1].trim() };

            return null;
        },

        // ── Countdown ─────────────────────────────────────────────────────────
        _startCountdown(playerId, country, planeType) {
            const state = this.tracking.get(playerId);
            if (!state) return;
            this._clearCountdown(state);

            const secs = getTravelTime(country, planeType);
            if (!secs) {
                console.warn(`✈️ [FlightTracker] No travel time for ${country} / ${planeType}`);
                return;
            }

            state.landingTime = Date.now() + secs * 1000;
            console.log(`✈️ [FlightTracker] Countdown started: ${country} ${planeType} → ${secs}s`);

            state.countdownInterval = setInterval(() => {
                this._refreshWindow(playerId);
                if (state.landingTime && Date.now() >= state.landingTime) {
                    this._clearCountdown(state);
                }
            }, 1000);
        },

        _clearCountdown(state) {
            if (state.countdownInterval) {
                clearInterval(state.countdownInterval);
                state.countdownInterval = null;
            }
        },

        // ── Live tracker window ───────────────────────────────────────────────
        _openWindow(playerId, anchorBtn) {
            const state = this.tracking.get(playerId);
            if (!state) return;

            // Remove old window if it exists
            state.windowEl?.remove();

            const rect = anchorBtn.getBoundingClientRect();
            const win = document.createElement('div');
            win.id = `sidekick-ft-win-${playerId}`;
            win.style.cssText = `
                position: fixed;
                top: ${rect.bottom + 8}px;
                right: ${window.innerWidth - rect.right}px;
                min-width: 260px;
                max-width: 340px;
                background: #141414;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 10px;
                padding: 0;
                color: #fff;
                font-family: Arial, sans-serif;
                font-size: 13px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                z-index: 9999999;
                user-select: none;
            `;
            win.innerHTML = this._buildWindowHTML(playerId);
            document.body.appendChild(win);
            state.windowEl = win;

            this._attachWindowListeners(win, playerId, anchorBtn);
        },

        _buildWindowHTML(playerId) {
            const state = this.tracking.get(playerId);
            if (!state) return '';

            // Header
            let statusLine = '';
            let statusColor = '#aaa';
            let countdownHTML = '';

            const planeLabel = state.planeType === 'airstrip' ? '🛩️ Airstrip'
                : state.planeType === 'business' ? '💼 Business'
                : '✈️ Commercial';
            const planeBadge = `<span style="font-size:11px;color:#999;margin-left:6px;">${planeLabel}</span>`;

            if (state.status === 'traveling' && state.country) {
                statusLine = `🛫 Waiting for arrival in <strong>${state.country}</strong>${planeBadge}`;
                statusColor = '#FFB74D';
            } else if (state.status === 'abroad' && state.country) {
                statusLine = `🌍 In <strong>${state.country}</strong> — waiting for return${planeBadge}`;
                statusColor = '#64B5F6';
            } else if (state.status === 'returning' && state.country) {
                statusLine = `🛬 Returning from <strong>${state.country}</strong>${planeBadge}`;
                statusColor = '#81C784';
                if (state.landingTime) {
                    const remaining = Math.max(0, Math.floor((state.landingTime - Date.now()) / 1000));
                    if (remaining === 0) {
                        countdownHTML = `<div style="margin-top:10px;padding:8px 10px;background:rgba(76,175,80,0.15);
                            border-radius:6px;color:#81C784;font-size:14px;font-weight:bold;text-align:center;">
                            🏠 Landed in Torn!
                        </div>`;
                    } else {
                        const urgentColor = remaining <= 60 ? '#F44336' : remaining <= 300 ? '#FF9800' : '#81C784';
                        countdownHTML = `<div style="margin-top:10px;padding:8px 10px;background:rgba(0,0,0,0.3);border-radius:6px;text-align:center;">
                            <div style="font-size:11px;color:#aaa;margin-bottom:4px;">Estimated arrival in</div>
                            <div style="font-size:22px;font-weight:bold;color:${urgentColor};font-variant-numeric:tabular-nums;">
                                ${this._fmtSeconds(remaining)}
                            </div>
                        </div>`;
                    }
                }
            } else {
                statusLine = `<span style="color:#666">👁️ Monitoring status…</span>`;
            }

            return `
            <div style="background:rgba(255,255,255,0.05);border-radius:10px 10px 0 0;
                padding:12px 14px;display:flex;justify-content:space-between;align-items:center;
                border-bottom:1px solid rgba(255,255,255,0.08);">
                <span style="font-weight:bold;font-size:13px;">✈️ Tracking: <span style="color:#81C784;">${state.name || 'Player'}</span></span>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="ft-stop-btn" title="Stop tracking"
                        style="background:rgba(244,67,54,0.15);border:1px solid rgba(244,67,54,0.3);
                        color:#F44336;border-radius:4px;cursor:pointer;font-size:11px;padding:2px 7px;">■ Stop</button>
                    <button class="ft-hide-btn" title="Hide window"
                        style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                        color:#aaa;border-radius:4px;cursor:pointer;font-size:11px;padding:2px 7px;">✕</button>
                </div>
            </div>
            <div style="padding:12px 14px;">
                <div style="color:${statusColor};line-height:1.6;">${statusLine}</div>
                ${countdownHTML}
            </div>`;
        },

        _refreshWindow(playerId) {
            const state = this.tracking.get(playerId);
            if (!state?.windowEl || !document.body.contains(state.windowEl)) return;
            state.windowEl.innerHTML = this._buildWindowHTML(playerId);
            this._attachWindowListeners(state.windowEl, playerId, null);
        },

        _attachWindowListeners(win, playerId, anchorBtn) {
            win.querySelector('.ft-stop-btn')?.addEventListener('click', () => {
                if (confirm(`Stop tracking ${this.tracking.get(playerId)?.name || 'this player'}?`)) {
                    this._stopTracking(playerId);
                }
            });
            win.querySelector('.ft-hide-btn')?.addEventListener('click', () => {
                win.style.display = 'none';
            });
        },

        // ── Stop tracking ─────────────────────────────────────────────────────
        _stopTracking(playerId) {
            const state = this.tracking.get(playerId);
            if (!state) return;
            this._clearCountdown(state);
            state.observer?.disconnect();
            state.windowEl?.remove();
            this.tracking.delete(playerId);

            const btn = document.querySelector('.sidekick-flight-tracker-btn');
            if (btn) this._setButtonState(btn, false);
        },

        // ── Helpers ───────────────────────────────────────────────────────────
        _waitForElement(selector, timeout = 3000) {
            const el = document.querySelector(selector);
            if (el) return Promise.resolve(el);
            return new Promise(resolve => {
                const obs = new MutationObserver(() => {
                    const found = document.querySelector(selector);
                    if (found) { obs.disconnect(); resolve(found); }
                });
                obs.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
            });
        },

        _getPlayerName() {
            const selectors = ['#skip-to-content', '.basic-information h4', 'h4[class*="name"]'];
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el) return el.textContent.trim().replace(/\[.*?\]/g, '').trim();
            }
            return 'Unknown';
        },

        _fmtSeconds(secs) {
            if (secs <= 0) return '0s';
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
            if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
            return `${s}s`;
        },

        _debounce(fn, delay) {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), delay);
            };
        },
    };

    // ── Register ──────────────────────────────────────────────────────────────
    if (!window.SidekickModules) window.SidekickModules = {};
    window.SidekickModules.FlightTracker = FlightTrackerModule;
    console.log('✅ Flight Tracker module loaded');
})();