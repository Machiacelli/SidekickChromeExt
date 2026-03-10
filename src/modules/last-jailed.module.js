/**
 * Sidekick Chrome Extension - Last Jailed Module
 *
 * How it works:
 *   Torn shows "Last time jailed" in the Personal Stats popup on a profile.
 *   That data is publicly visible and loaded via Torn's internal endpoint:
 *   https://www.torn.com/profiles.php?step=getPersonalStats&ID=<playerid>
 *
 *   Because our content script runs inside the user's active torn.com session,
 *   the request goes out with their session cookies automatically — no API key needed.
 */
(function () {
    'use strict';

    const LastJailedModule = {

        // ── Internal Torn endpoint ──────────────────────────────────────────────
        async _fetchPersonalStatsHtml(playerId) {
            // Torn's internal personal-stats modal endpoint — session cookie is sent automatically
            const url = `https://www.torn.com/profiles.php?step=getPersonalStats&ID=${playerId}`;
            const resp = await fetch(url, { credentials: 'same-origin' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.text();
        },

        // Also fetch basic profile (jailed count + current status) via official API
        async _getApiKey() {
            try { return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key'); }
            catch (_) { return null; }
        },
        async _fetchProfile(playerId, apiKey) {
            const resp = await fetch(
                `https://api.torn.com/user/${playerId}?selections=personalstats,profile&key=${apiKey}`
            );
            const data = await resp.json();
            if (data.error) throw new Error(data.error.error || JSON.stringify(data.error));
            return data;
        },

        // ── Parse "Last time jailed" from the HTML fragment Torn returns ────────
        _parseLastJailed(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Strategy 1: walk every leaf text node looking for "last time jailed" label,
            // then grab the immediately following value element.
            const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                const txt = node.textContent.trim().toLowerCase();
                if (txt === 'last time jailed' || txt === 'last jailed') {
                    // Try next sibling text / element
                    const sib = node.nextSibling;
                    if (sib) {
                        const v = (sib.textContent || '').trim();
                        if (v) return v;
                    }
                    // Try parent's next sibling
                    const parent = node.parentElement;
                    if (parent) {
                        const nextEl = parent.nextElementSibling;
                        if (nextEl) return nextEl.textContent.trim();
                    }
                }
            }

            // Strategy 2: find any element whose textContent ONLY (leaf) is the label.
            const allEls = Array.from(doc.querySelectorAll('*'));
            for (const el of allEls) {
                if (el.children.length > 0) continue; // leaf only
                const txt = el.textContent.trim().toLowerCase();
                if (txt === 'last time jailed' || txt === 'last jailed') {
                    const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
                    if (next) return next.textContent.trim();
                }
            }

            // Strategy 3: regex on raw HTML — catches any format
            const patterns = [
                /last\s+time\s+jailed\s*<[^>]+>\s*([^<]+)/i,
                /last\s*jailed\s*<[^>]+>\s*([^<]+)/i,
                /last\s+time\s+jailed[^0-9a-z]*([0-9]{2,4}[\/\-][0-9]{2}[\/\-][0-9]{2,4}[^<"]*)/i,
            ];
            for (const re of patterns) {
                const m = html.match(re);
                if (m && m[1].trim()) return m[1].trim();
            }

            return null;
        },

        // ── Parse a date string torn may return (several possible formats) ──────
        _parseDate(raw) {
            if (!raw) return null;
            // "2026-03-11 18:42:12"
            let d = new Date(raw.replace(' ', 'T'));
            if (!isNaN(d)) return d;
            // "11/03/26 18:42" → dd/mm/yy HH:MM
            let m = raw.match(/(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})/);
            if (m) {
                const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
                d = new Date(year, +m[2] - 1, +m[1], +m[4], +m[5]);
                if (!isNaN(d)) return d;
            }
            // "03/11/2026 18:42" → mm/dd/yyyy HH:MM
            m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
            if (m) {
                d = new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5]);
                if (!isNaN(d)) return d;
            }
            return null;
        },

        _relativeTime(date) {
            if (!date) return '';
            const diffMs = Date.now() - date.getTime();
            const s = Math.floor(diffMs / 1000);
            if (s < 60) return `${s}s ago`;
            const m = Math.floor(s / 60);
            if (m < 60) return `${m}m ago`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h ${m % 60}m ago`;
            const d = Math.floor(h / 24);
            return `${d}d ${h % 24}h ago`;
        },

        // ── UI ──────────────────────────────────────────────────────────────────
        async showForPlayer(playerId, anchorEl) {
            const PANEL_ID = `sidekick-lj-panel-${playerId}`;

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
                min-width: 230px;
                max-width: 310px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.6);
                z-index: 999999;
            `;
            panel.innerHTML = `<div style="color:#aaa">Loading jail data…</div>`;
            document.body.appendChild(panel);

            // Run both fetches in parallel — API gives current status/count, internal endpoint gives last-jail date
            const apiKey = await this._getApiKey();
            const promises = [
                this._fetchPersonalStatsHtml(playerId).catch(e => ({ _error: e.message })),
                apiKey
                    ? this._fetchProfile(playerId, apiKey).catch(e => ({ _error: e.message }))
                    : Promise.resolve(null),
            ];
            const [htmlResult, profileData] = await Promise.all(promises);

            // Parse last-jail date from internal endpoint
            let lastJailDate = null;
            let lastJailRaw = null;
            let internalError = null;
            if (htmlResult && !htmlResult._error) {
                lastJailRaw = this._parseLastJailed(htmlResult);
                if (lastJailRaw) {
                    lastJailDate = this._parseDate(lastJailRaw);
                }
            } else if (htmlResult?._error) {
                internalError = htmlResult._error;
            }

            // Parse profile data from official API
            const totalJails = profileData && !profileData._error
                ? (profileData.personalstats?.jailed ?? null)
                : null;
            const statusState = profileData?.status?.state ?? null;
            const inJail = statusState
                ? statusState.toLowerCase().includes('jail') || statusState.toLowerCase().includes('federal')
                : false;

            const statusBadge = inJail
                ? `<span style="background:#c0392b;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">IN JAIL</span>`
                : '';

            let releaseRow = '';
            if (inJail && profileData?.status?.until) {
                const releaseAt = new Date(profileData.status.until * 1000);
                releaseRow = `<div style="margin-top:6px;color:#f0a500;font-size:12px;">🔓 Release: ${releaseAt.toLocaleString()}</div>`;
            }

            // Last jailed row
            let lastJailRow = '';
            if (lastJailDate) {
                const dateStr = lastJailDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const rel = this._relativeTime(lastJailDate);
                lastJailRow = `
                    <div style="color:#aaa;">Last jailed:</div>
                    <div>
                        <strong style="color:#fff;">${dateStr}</strong>
                        <span style="color:#888;font-size:11px;"> (${rel})</span>
                    </div>
                `;
            } else if (lastJailRaw) {
                // Got text but couldn't parse as date — show raw
                lastJailRow = `
                    <div style="color:#aaa;">Last jailed:</div>
                    <div><strong style="color:#fff;">${lastJailRaw}</strong></div>
                `;
            } else {
                const errNote = internalError
                    ? `<div style="color:#f66;font-size:11px;grid-column:1/-1;">⚠️ Could not load personal stats: ${internalError}</div>`
                    : `<div style="color:#666;font-size:11px;grid-column:1/-1;">⚠️ "Last jailed" not found in personal stats</div>`;
                lastJailRow = errNote;
            }

            const totalRow = totalJails !== null
                ? `<div style="color:#aaa;">Total jailed:</div><div><strong style="color:#fff;">${totalJails.toLocaleString()}</strong></div>`
                : '';

            panel.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-weight:bold;font-size:14px;">Jail Info</div>
                    ${statusBadge}
                </div>
                ${releaseRow}
                <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin-top:${releaseRow ? '8' : '0'}px;font-size:12px;color:#ddd;">
                    ${lastJailRow}
                    ${totalRow}
                </div>
                <div style="margin-top:10px;text-align:right;">
                    <button class="lj-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:11px;">✕ Close</button>
                </div>
            `;
            panel.querySelector('.lj-close').addEventListener('click', () => panel.remove());
        },
    };

    if (!window.SidekickModules) window.SidekickModules = {};
    window.SidekickModules.LastJailed = LastJailedModule;
    console.log('⛓️ Last Jailed module registered');
})();
