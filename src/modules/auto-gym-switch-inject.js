// Auto Gym Switch - Page World Fetch Interceptor
// Runs in MAIN world at document_start so it can override window.fetch
// before Torn's own scripts load. Enabled flag is read from localStorage
// (set by the isolated-world content script auto-gym-switch.module.js).
(function () {
    'use strict';

    const LS_KEY = 'sidekick_auto_gym_enabled';

    // ── Gym data ──────────────────────────────────────────────────────────────
    const gymInfo = {
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
    };

    // ── State ─────────────────────────────────────────────────────────────────
    let currentGym = null;
    let picks = { str: [], def: [], spe: [], dex: [] };
    let booted = false;
    const originalFetch = window.fetch;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function isEnabled() {
        return localStorage.getItem(LS_KEY) === 'true';
    }

    function processGymData(gyms) {
        const classList = ['specialist', 'heavyweight', 'middleweight', 'lightweight', 'jail'];
        picks = { str: [], def: [], spe: [], dex: [] };

        for (const gymClass of classList) {
            if (!gyms[gymClass]) continue;
            for (const gym of gyms[gymClass]) {
                if (gym.status === 'active') currentGym = gym.id;
                if (gym.status === 'available' || gym.status === 'active') {
                    for (const stat of ['str', 'def', 'spe', 'dex']) {
                        const gain = gymInfo[gym.id]?.[stat];
                        if (gain) picks[stat].push({ id: gym.id, gain });
                    }
                }
            }
        }
        for (const stat in picks) {
            picks[stat].sort((a, b) => b.gain !== a.gain ? b.gain - a.gain : b.id - a.id);
        }
        console.log('💪 [AutoGym] Gym data loaded. Current gym:', currentGym, 'Picks:', picks);
    }

    function getBestGym(stat) {
        for (const gym of (picks[stat] || [])) {
            // Special gyms (27-31) need a lock check
            if (gym.id >= 27 && gym.id <= 31) {
                const el = document.querySelector(`[class*='gym-${gym.id}']`);
                if (!el) continue;
                const isLocked = Array.from(el.parentElement?.classList || []).some(c => c.includes('locked'));
                if (!isLocked) return gym.id;
            } else {
                return gym.id;
            }
        }
        return null;
    }

    async function switchGym(gymId) {
        // Try the same pattern as the train request (POST /gym.php?step=X with JSON body)
        const attempts = [
            // Attempt 1: POST with JSON body (matches train request format)
            () => originalFetch('/gym.php?step=changeGym', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymID: gymId })
            }),
            // Attempt 2: GET with query params (matches getInitialGymInfo format)
            () => originalFetch(`/gym.php?step=changeGym&gymID=${gymId}`),
            // Attempt 3: POST to root with URLSearchParams (old Torn API style)
            () => originalFetch('/gym.php', {
                method: 'POST',
                body: new URLSearchParams({ step: 'changeGym', gymID: gymId })
            })
        ];

        for (let i = 0; i < attempts.length; i++) {
            let resp;
            try {
                resp = await attempts[i]();
                const text = await resp.text();
                console.log(`💪 [AutoGym] switchGym attempt ${i + 1}: status=${resp.status} ct=${resp.headers.get('content-type')} body=${text.slice(0, 150)}`);
                const data = JSON.parse(text);
                if (data.success) {
                    currentGym = gymId;
                    updateGymUI(gymId);
                    return data.message || `Switched to gym ${gymId}`;
                }
                // Got JSON but not success — no point retrying, return the message
                return data.message || 'Gym switch failed';
            } catch (e) {
                console.warn(`💪 [AutoGym] switchGym attempt ${i + 1} failed:`, e.message);
            }
        }
        return 'Gym switch failed after all attempts';
    }

    function updateGymUI(gymId) {
        try {
            const info = gymInfo[gymId];
            if (!info) return;

            // Update active button highlight
            const activeButton = document.querySelector('[class*=\'active\'][class^=\'gymButton\']');
            if (activeButton) {
                const activeClass = Array.from(activeButton.classList).find(c => c.includes('active'));
                if (activeClass) {
                    activeButton.classList.remove(activeClass);
                    const newActive = document.querySelector(`[class*='gym-${gymId}']`);
                    newActive?.parentElement?.classList.add(activeClass);
                }
            }

            // Update logo image
            const logos = document.querySelectorAll('[class^=\'logo\']');
            for (const el of logos) {
                if (el.tagName === 'IMG') {
                    const parts = el.src.split('/');
                    parts[parts.length - 1] = gymId + '.png';
                    el.src = parts.join('/');
                    break;
                }
            }
        } catch (e) {
            console.warn('💪 [AutoGym] UI update error:', e);
        }
    }

    // ── Fetch override ────────────────────────────────────────────────────────
    window.fetch = async function (...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

        // 1. Capture gym info on page load
        if (url.includes('/gym.php?step=getInitialGymInfo')) {
            const result = await originalFetch(...args);
            try {
                const data = await result.clone().json();
                if (!booted && data.gyms) {
                    booted = true;
                    processGymData(data.gyms);
                }
            } catch (e) { /* ignore */ }
            return result;
        }

        // 2. Track manual gym changes
        if (url.includes('/gym.php?step=changeGym') || url.includes('/gym.php?step=purchaseMembership')) {
            const result = await originalFetch(...args);
            try {
                const data = await result.clone().json();
                if (data.success) {
                    // Extract gymID from URLSearchParams body
                    const body = args[1]?.body;
                    let gymID = null;
                    if (body instanceof URLSearchParams) {
                        gymID = body.get('gymID');
                    } else if (typeof body === 'string') {
                        gymID = new URLSearchParams(body).get('gymID');
                    }
                    if (gymID) currentGym = Number(gymID);
                }
            } catch (e) { /* ignore */ }
            return result;
        }

        // 3. Intercept training — switch gym first if needed
        if (url.includes('/gym.php?step=train') && isEnabled()) {
            try {
                const bodyStr = args[1]?.body;
                const body = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : {};
                const stat = (body.stat || '').substring(0, 3); // str/def/spe/dex
                const bestGym = getBestGym(stat);

                if (bestGym && bestGym !== currentGym) {
                    console.log(`💪 [AutoGym] Switching from ${currentGym} → ${bestGym} for ${stat}`);
                    const msg = await switchGym(bestGym);
                    // Return a synthetic response so Torn shows the switch message.
                    // The user will need to click Train again (same as original script).
                    return new Response(JSON.stringify({ success: true, message: msg }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } catch (err) {
                console.error('💪 [AutoGym] Train intercept error:', err);
            }
        }

        return originalFetch(...args);
    };

    console.log('💪 [AutoGym] Fetch interceptor ready (enabled:', isEnabled(), ')');
})();
