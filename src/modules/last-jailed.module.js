/**
 * Sidekick Chrome Extension - Last Jailed Module
 * Binary-searches Torn API v1 personalstats (with timestamp param)
 * to find when a player's jailed count last incremented.
 */
(function () {
    'use strict';

    const LastJailedModule = {

        // ── API helper ──────────────────────────────────────────────────────────
        async _getApiKey() {
            try {
                return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
            } catch (_) { return null; }
        },

        // Fetch personalstats + profile for a player at a given Unix timestamp.
        // Uses Torn API v1 which supports timestamp param for personalstats.
        async _fetchStats(playerId, apiKey, timestamp) {
            let url = `https://api.torn.com/user/${playerId}?selections=personalstats,profile&key=${apiKey}`;
            if (timestamp) {
                url += `&timestamp=${Math.floor(timestamp / 1000)}`;
            }
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.error) throw new Error(data.error.error || JSON.stringify(data.error));
            return data;
        },

        // Return the jailed count from an API response (handles both v1 shapes)
        _getJailed(data) {
            return data.personalstats?.jailed ?? 0;
        },

        // ── Binary-search for last jail date ────────────────────────────────────
        async findLastJail(playerId, apiKey) {
            // Step 1: current snapshot
            const now = await this._fetchStats(playerId, apiKey, null);
            const totalJails = this._getJailed(now);
            const profile = now; // v1 top-level has status, name, etc.

            if (totalJails === 0) {
                return { lastJailDate: null, totalJails, profile };
            }

            const ONE_DAY = 86400 * 1000;

            // Step 2: probe milestones to bracket the last increment
            const probes = [1, 7, 14, 30, 60, 90, 180, 365].map(d => Date.now() - d * ONE_DAY);
            let lo = Date.now() - 365 * ONE_DAY;
            let hi = Date.now();

            for (let i = 0; i < probes.length; i++) {
                const probe = probes[i];
                try {
                    const snap = await this._fetchStats(playerId, apiKey, probe);
                    const count = this._getJailed(snap);
                    if (count < totalJails) {
                        // Count was lower at this probe — last jail was AFTER this probe
                        lo = probe;
                        hi = i > 0 ? probes[i - 1] : Date.now();
                        break;
                    }
                    // Same count — last jail was BEFORE this probe
                    hi = probe;
                } catch (_) { /* skip */ }
            }

            // Step 3: binary search within bracket for day precision
            for (let i = 0; i < 10 && (hi - lo) > ONE_DAY; i++) {
                const mid = Math.floor((lo + hi) / 2);
                try {
                    const snap = await this._fetchStats(playerId, apiKey, mid);
                    const count = this._getJailed(snap);
                    if (count < totalJails) {
                        lo = mid; // last jail happened after mid
                    } else {
                        hi = mid; // last jail happened before mid
                    }
                } catch (_) { break; }
            }

            return { lastJailDate: new Date(lo), totalJails, profile };
        },

        // ── UI ──────────────────────────────────────────────────────────────────
        async showForPlayer(playerId, anchorEl) {
            const PANEL_ID = `sidekick-lj-panel-${playerId}`;

            // Remove existing panel
            const existing = document.getElementById(PANEL_ID);
            if (existing) { existing.remove(); return; }

            // Calculate position from the anchor element (use fixed, append to body)
            const rect = anchorEl.getBoundingClientRect();

            const panel = document.createElement('div');
            panel.id = PANEL_ID;
            panel.style.cssText = `
                position: fixed;
                top: ${rect.bottom + 8}px;
                left: ${rect.left}px;
                background: #1a1a1a;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 12px 16px;
                color: #fff;
                font-size: 13px;
                min-width: 230px;
                max-width: 300px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.6);
                z-index: 999999;
            `;
            panel.innerHTML = `<div style="color:#aaa">⛓️ Loading jail data…</div>`;
            document.body.appendChild(panel);

            const apiKey = await this._getApiKey();
            if (!apiKey) {
                panel.innerHTML = `<div style="color:#f66">❌ No API key set in Sidekick settings.</div>
                    <div style="margin-top:8px;text-align:right;"><button class="lj-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button></div>`;
                panel.querySelector('.lj-close').addEventListener('click', () => panel.remove());
                return;
            }

            try {
                const { lastJailDate, totalJails, profile } = await this.findLastJail(playerId, apiKey);

                const statusState = profile?.status?.state ?? 'Unknown';
                const inJail = statusState.toLowerCase().includes('jail') || statusState.toLowerCase().includes('federal');

                const relativeTime = (date) => {
                    if (!date) return '';
                    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
                    if (days === 0) return 'today';
                    if (days === 1) return 'yesterday';
                    return `${days} days ago`;
                };

                const dateStr = lastJailDate
                    ? lastJailDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Never';

                const statusBadge = inJail
                    ? `<span style="background:#c0392b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">IN JAIL</span>`
                    : '';

                let releaseRow = '';
                if (inJail && profile?.status?.until) {
                    const releaseAt = new Date(profile.status.until * 1000);
                    releaseRow = `<div style="margin-top:6px;color:#f0a500;font-size:12px;">🔓 Released: ${releaseAt.toLocaleString()}</div>`;
                }

                panel.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div style="font-weight:bold;font-size:14px;">Jail Info</div>
                        ${statusBadge}
                    </div>
                    ${releaseRow}
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin-top:8px;font-size:12px;color:#ddd;">
                        <div style="color:#aaa;">Last jailed:</div>
                        <div><strong style="color:#fff;">${dateStr}</strong>${lastJailDate ? ` <span style="color:#888;font-size:11px;">(${relativeTime(lastJailDate)})</span>` : ''}</div>
                        <div style="color:#aaa;">Total jails:</div>
                        <div><strong style="color:#fff;">${totalJails.toLocaleString()}</strong></div>
                    </div>
                    <div style="margin-top:10px;text-align:right;">
                        <button class="lj-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button>
                    </div>
                `;
                panel.querySelector('.lj-close').addEventListener('click', () => panel.remove());

            } catch (err) {
                console.error('[LastJailed] Error:', err);
                panel.innerHTML = `<div style="color:#f66">❌ Error: ${err.message}</div>
                    <div style="margin-top:8px;text-align:right;"><button class="lj-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button></div>`;
                panel.querySelector('.lj-close').addEventListener('click', () => panel.remove());
            }
        },
    };

    if (!window.SidekickModules) window.SidekickModules = {};
    window.SidekickModules.LastJailed = LastJailedModule;
    console.log('⛓️ Last Jailed module registered');
})();
