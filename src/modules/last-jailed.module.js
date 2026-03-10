/**
 * Sidekick Chrome Extension - Last Jailed Module
 * Shows current jail status + cumulative jail stats for a player.
 *
 * NOTE: Torn API v1 ignores the 'timestamp' param for other players' personalstats,
 * so binary-search to determine "last jailed" date is unreliable and has been removed.
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

        // Fetch personalstats + profile for a player (current snapshot only)
        async _fetchStats(playerId, apiKey) {
            const url = `https://api.torn.com/user/${playerId}?selections=personalstats,profile&key=${apiKey}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.error) throw new Error(data.error.error || JSON.stringify(data.error));
            return data;
        },

        // Format minutes into a human-readable duration string
        _formatMinutes(minutes) {
            if (!minutes || minutes <= 0) return '0m';
            const d = Math.floor(minutes / 1440);
            const h = Math.floor((minutes % 1440) / 60);
            const m = minutes % 60;
            const parts = [];
            if (d > 0) parts.push(`${d}d`);
            if (h > 0) parts.push(`${h}h`);
            if (m > 0) parts.push(`${m}m`);
            return parts.join(' ') || '0m';
        },

        // ── UI ──────────────────────────────────────────────────────────────────
        async showForPlayer(playerId, anchorEl) {
            const PANEL_ID = `sidekick-lj-panel-${playerId}`;

            // Remove existing panel (toggle)
            const existing = document.getElementById(PANEL_ID);
            if (existing) { existing.remove(); return; }

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
                min-width: 240px;
                max-width: 310px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.6);
                z-index: 999999;
            `;
            panel.innerHTML = `<div style="color:#aaa">Loading jail data…</div>`;
            document.body.appendChild(panel);

            const apiKey = await this._getApiKey();
            if (!apiKey) {
                panel.innerHTML = `<div style="color:#f66">❌ No API key set in Sidekick settings.</div>
                    <div style="margin-top:8px;text-align:right;"><button class="lj-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button></div>`;
                panel.querySelector('.lj-close').addEventListener('click', () => panel.remove());
                return;
            }

            try {
                const data = await this._fetchStats(playerId, apiKey);

                const stats       = data.personalstats || {};
                const totalJails  = stats.jailed ?? 0;
                const minsInJail  = stats.timespentinjail ?? 0;

                const statusState = data?.status?.state ?? 'Unknown';
                const inJail      = statusState.toLowerCase().includes('jail') || statusState.toLowerCase().includes('federal');

                const statusBadge = inJail
                    ? `<span style="background:#c0392b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">IN JAIL</span>`
                    : '';

                let releaseRow = '';
                if (inJail && data?.status?.until) {
                    const releaseAt = new Date(data.status.until * 1000);
                    releaseRow = `<div style="margin-top:6px;color:#f0a500;font-size:12px;">🔓 Release: ${releaseAt.toLocaleString()}</div>`;
                }

                const avgDuration = totalJails > 0
                    ? this._formatMinutes(Math.round(minsInJail / totalJails))
                    : '—';

                panel.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div style="font-weight:bold;font-size:14px;">Jail Info</div>
                        ${statusBadge}
                    </div>
                    ${releaseRow}
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin-top:8px;font-size:12px;color:#ddd;">
                        <div style="color:#aaa;">Total jails:</div>
                        <div><strong style="color:#fff;">${totalJails.toLocaleString()}</strong></div>
                        <div style="color:#aaa;">Time in jail:</div>
                        <div><strong style="color:#fff;">${this._formatMinutes(minsInJail)}</strong></div>
                        <div style="color:#aaa;">Avg sentence:</div>
                        <div><strong style="color:#fff;">${avgDuration}</strong></div>
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
