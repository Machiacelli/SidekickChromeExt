/**
 * Sidekick Chrome Extension - Last Jailed Module
 * Binary-searches Torn API personalstats (with timestamp param)
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

        // Fetch personalstats (+ profile) for a player at a given Unix timestamp.
        // Torn API v2 supports: GET /v2/user/{id}?selections=personalstats,profile&timestamp={ts}
        async _fetchStats(playerId, apiKey, timestamp) {
            const ts = Math.floor(timestamp / 1000); // seconds
            const url = timestamp
                ? `https://api.torn.com/v2/user/${playerId}?selections=personalstats,profile&key=${apiKey}&timestamp=${ts}`
                : `https://api.torn.com/v2/user/${playerId}?selections=personalstats,profile&key=${apiKey}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.error) throw new Error(data.error.error || JSON.stringify(data.error));
            return data;
        },

        // ── Binary-search for last jail date ────────────────────────────────────
        // Returns { lastJailDate: Date|null, totalJails: number, status, profile }
        async findLastJail(playerId, apiKey) {
            // Step 1: get current snapshot
            const now = await this._fetchStats(playerId, apiKey, null);
            const totalJails = now.personalstats?.jailed ?? now.personalstats?.jail?.jailed ?? 0;
            const profile = now.profile ?? {};

            if (totalJails === 0) {
                return { lastJailDate: null, totalJails, profile };
            }

            // Step 2: probe milestone points going back to find bracket
            const ONE_DAY = 86400 * 1000;
            const probes = [1, 7, 14, 30, 60, 90, 180, 365].map(d => Date.now() - d * ONE_DAY);
            let lo = Date.now() - 365 * ONE_DAY; // default lower bound = 1 year ago
            let hi = Date.now();

            for (const probe of probes) {
                try {
                    const snap = await this._fetchStats(playerId, apiKey, probe);
                    const count = snap.personalstats?.jailed ?? snap.personalstats?.jail?.jailed ?? 0;
                    if (count < totalJails) {
                        // Jailed count was lower at this probe — bracket found
                        lo = probe;
                        hi = probes[probes.indexOf(probe) - 1] || Date.now();
                        break;
                    }
                    // Count same = last jail happened earlier
                    lo = Date.now() - 365 * ONE_DAY;
                    hi = probe;
                } catch (_) { /* skip failed probes */ }
            }

            // Step 3: binary search within bracket (~8 iterations for day-resolution)
            for (let i = 0; i < 10; i++) {
                const mid = Math.floor((lo + hi) / 2);
                if (hi - lo < ONE_DAY) break; // day precision reached
                try {
                    const snap = await this._fetchStats(playerId, apiKey, mid);
                    const count = snap.personalstats?.jailed ?? snap.personalstats?.jail?.jailed ?? 0;
                    if (count < totalJails) {
                        lo = mid; // jail happened after mid
                    } else {
                        hi = mid; // jail happened before mid
                    }
                } catch (_) { break; }
            }

            // lo is roughly when the count changed (last jail entered)
            return { lastJailDate: new Date(lo), totalJails, profile };
        },

        // ── UI ──────────────────────────────────────────────────────────────────
        async showForPlayer(playerId, containerEl) {
            // Remove existing panel
            const existing = containerEl.querySelector('.sidekick-last-jailed-panel');
            if (existing) { existing.remove(); return; }

            // Insert loading panel
            const panel = document.createElement('div');
            panel.className = 'sidekick-last-jailed-panel';
            panel.style.cssText = `
                background: #1a1a1a;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 12px 16px;
                color: #fff;
                font-size: 13px;
                min-width: 220px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                position: relative;
            `;
            panel.innerHTML = `<div style="color:#aaa">⛓️ Loading jail data…</div>`;
            containerEl.appendChild(panel);

            const apiKey = await this._getApiKey();
            if (!apiKey) {
                panel.innerHTML = `<div style="color:#f66">❌ No API key set in Sidekick settings.</div>`;
                return;
            }

            try {
                const { lastJailDate, totalJails, profile } = await this.findLastJail(playerId, apiKey);

                const statusState = profile?.status?.state ?? 'Unknown';
                const statusDesc = profile?.status?.description ?? '';
                const inJail = statusState.toLowerCase().includes('jail') || statusState.toLowerCase().includes('federal');

                const relativeTime = (date) => {
                    if (!date) return 'Unknown';
                    const diffMs = Date.now() - date.getTime();
                    const days = Math.floor(diffMs / 86400000);
                    if (days === 0) return 'Today';
                    if (days === 1) return 'Yesterday';
                    return `${days} days ago`;
                };

                const dateStr = lastJailDate
                    ? lastJailDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Never';

                let statusBadge = inJail
                    ? `<span style="background:#c0392b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">IN JAIL</span>`
                    : `<span style="background:#27ae60;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">FREE</span>`;

                let releaseRow = '';
                if (inJail && profile?.status?.until) {
                    const releaseAt = new Date(profile.status.until * 1000);
                    releaseRow = `<div style="margin-top:6px;color:#f0a500;font-size:12px;">🔓 Release: ${releaseAt.toLocaleString()}</div>`;
                }

                panel.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div style="font-weight:bold;font-size:14px;">⛓️ Jail Info</div>
                        ${statusBadge}
                    </div>
                    ${releaseRow}
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin-top:8px;font-size:12px;color:#ddd;">
                        <div style="color:#aaa;">Last jailed:</div>
                        <div><strong style="color:#fff;">${dateStr}</strong> &nbsp;<span style="color:#888;">${relativeTime(lastJailDate)}</span></div>
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
