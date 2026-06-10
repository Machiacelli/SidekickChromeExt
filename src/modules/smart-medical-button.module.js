/**
 * Sidekick Smart Medical Button
 * Adapted from BBSmalls [3908857] Torn Smart FAK Button v4.43
 * Original: https://greasyfork.org/scripts/568502
 * Sidekick port: uses ChromeStorage, universal API key, morphine always included
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'sidekick_smart_medical';

    const PERSONAL_URL = 'https://www.torn.com/item.php';
    const FACTION_URL  = 'https://www.torn.com/factions.php?step=your&type=1#/tab=armoury';

    // Item definitions — morphine always included, blood bag conditional on type setting
    let ITEMS = {
        'Small First Aid Kit': { id: 68, removes: 1200, cd: 600,  baseRemoves: 1200 },
        'First Aid Kit':       { id: 67, removes: 2400, cd: 900,  baseRemoves: 2400 },
        'Morphine':            { id: 66, removes: 4200, cd: 1200, baseRemoves: 4200 },
        'Blood Bag':           { id: null, removes: 7200, cd: 1800, baseRemoves: 7200 }
    };

    const BLOOD_TYPES   = ['Disabled', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const BLOOD_BAG_IDS = { 'A+':732,'A-':733,'B+':734,'B-':735,'AB+':736,'AB-':737,'O+':738,'O-':739 };

    let cachedTimer       = 0;
    let isDragging        = false;
    let totalMedicalBonus = 0;
    let isEnabled         = false;
    let settings          = { itemSource: 'Personal Items', bloodType: 'Disabled' };
    let perkFetchInterval = null;
    let pollInterval      = null;

    // ─── Storage helpers ─────────────────────────────────────────────────────

    const CS = () => window.SidekickModules?.Core?.ChromeStorage;

    async function loadSettings() {
        if (!CS()) return;
        const saved = await CS().get(STORAGE_KEY) || {};
        isEnabled = saved.isEnabled === true;
        settings.itemSource = saved.itemSource || 'Personal Items';
        settings.bloodType  = saved.bloodType  || 'Disabled';
    }

    async function saveSettings(patch) {
        if (!CS()) return;
        const current = await CS().get(STORAGE_KEY) || {};
        await CS().set(STORAGE_KEY, { ...current, ...patch });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const getApiKey     = async () => CS() ? (await CS().get('sidekick_api_key') || '') : '';
    const bloodEnabled  = () => settings.bloodType !== 'Disabled';

    const formatTime = sec => {
        if (sec <= 0) return '';
        const m = Math.floor(sec / 60), s = sec % 60;
        return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
    };

    const formatCDTime = sec => {
        if (sec <= 0) return '0:00:00';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    };

    function inHospital()      { return !!document.querySelector('a[aria-label^="Hospital:"]'); }
    function isOnPersonalPage(){ return window.location.href.toLowerCase().includes('item.php'); }
    function isOnFactionPage() {
        const u = window.location.href.toLowerCase();
        return u.includes('factions.php') && u.includes('tab=armoury');
    }

    // ─── Medical cooldown from sessionStorage ─────────────────────────────────

    function getSidebarData() {
        try {
            const key = Object.keys(sessionStorage).find(k => /sidebarData\d+/.test(k));
            return key ? JSON.parse(sessionStorage.getItem(key)) : null;
        } catch { return null; }
    }

    function getMedicalCooldownInfo() {
        const data = getSidebarData();
        if (!data) return null;
        const med = data?.statusIcons?.icons?.medical_cooldown;
        if (!med) return null;
        const nowSec       = Date.now() / 1000;
        const remainingSec = Math.max(0, Math.round(med.timerExpiresAt - nowSec));
        return { remainingSec, isActive: remainingSec > 0 };
    }

    // ─── API: Medical effectiveness perk ─────────────────────────────────────

    async function fetchPerksAndUpdateThresholds() {
        const key = await getApiKey();
        if (!key || key.length !== 16) return;
        try {
            const res  = await fetch(`https://api.torn.com/user/?selections=education,perks&key=${encodeURIComponent(key)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.error) return;

            let bonus = 0;
            [...(data.education_perks || []), ...(data.faction_perks || [])].forEach(p => {
                if (typeof p === 'string' && p.includes('medical item effectiveness')) {
                    const m = p.match(/(\d+)%/);
                    if (m) bonus += parseInt(m[1], 10);
                }
            });

            totalMedicalBonus = Math.min(bonus, 50);
            const mult = 1 + totalMedicalBonus / 100;
            Object.keys(ITEMS).forEach(n => { ITEMS[n].removes = Math.round(ITEMS[n].baseRemoves * mult); });
            updateButtonDisplay();
        } catch {}
    }

    // ─── Item selection ───────────────────────────────────────────────────────

    function selectBestItem(timer) {
        if (timer <= 0) return null;
        const available = [
            { name: 'Small First Aid Kit', ...ITEMS['Small First Aid Kit'] },
            { name: 'First Aid Kit',       ...ITEMS['First Aid Kit'] },
            { name: 'Morphine',            ...ITEMS['Morphine'] },  // always included
        ];
        if (bloodEnabled()) available.push({
            name: `Blood Bag: ${settings.bloodType}`,
            id:   BLOOD_BAG_IDS[settings.bloodType],
            removes: ITEMS['Blood Bag'].removes,
            cd:      ITEMS['Blood Bag'].cd
        });
        available.sort((a, b) => a.removes - b.removes);
        for (const item of available) if (item.removes >= timer) return item;
        return available.reduce((best, item) =>
            (item.removes / item.cd) > (best.removes / best.cd) ? item : best
        );
    }

    function getButtonColor(timer) {
        if (timer <= 0) return '#555';
        const item = selectBestItem(timer);
        if (!item) return '#555';
        if (item.name.startsWith('Blood Bag')) return '#9333ea';
        if (item.name === 'Morphine')          return '#e87722';
        if (item.name === 'First Aid Kit')     return '#1a6fc4';
        return '#c82333';
    }

    // ─── Display ─────────────────────────────────────────────────────────────

    function updateButtonDisplay() {
        const container = document.getElementById('sk-med-container');
        if (!container) return;
        const timerEl = container.querySelector('#sk-med-timer');
        const btnEl   = container.querySelector('#sk-med-btn');
        if (cachedTimer <= 0) {
            timerEl.textContent    = 'No Hosp';
            btnEl.style.background = '#555';
        } else {
            timerEl.textContent    = formatTime(cachedTimer);
            btnEl.style.background = getButtonColor(cachedTimer);
        }
        updateCooldownDisplay();
    }

    function updateCooldownDisplay() {
        const el = document.getElementById('sk-med-cd-text');
        if (!el) return;
        const med = getMedicalCooldownInfo();
        el.textContent = (med && med.isActive) ? `CD ${formatCDTime(med.remainingSec)}` : 'No Med CD';
    }

    // ─── Position / dragging ─────────────────────────────────────────────────

    const POS_KEY    = 'sk-med-pos';
    const savePos    = (x, y) => { try { localStorage.setItem(POS_KEY, JSON.stringify({ xPct: x/window.innerWidth, yPct: y/window.innerHeight })); } catch {} };
    const loadPos    = () => { try { const p = JSON.parse(localStorage.getItem(POS_KEY)); return p ? { x: Math.round(p.xPct*window.innerWidth), y: Math.round(p.yPct*window.innerHeight) } : null; } catch { return null; } };
    const clamp      = (x, y, w, h) => ({ x: Math.min(Math.max(4,x), window.innerWidth-w-4), y: Math.min(Math.max(4,y), window.innerHeight-h-4) });

    function restorePosition() {
        const el = document.getElementById('sk-med-container');
        if (!el) return;
        const pos = loadPos();
        if (pos) {
            const r = el.getBoundingClientRect();
            const c = clamp(pos.x, pos.y, r.width, r.height);
            el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
        }
    }

    function enableDragging(el, handle) {
        let drag=false, startX, startY, initX, initY;
        const start = e => {
            drag=true; isDragging=false;
            const ev = e.touches ? e.touches[0] : e;
            startX=ev.clientX; startY=ev.clientY; initX=el.offsetLeft; initY=el.offsetTop;
            e.preventDefault();
        };
        const move = e => {
            if (!drag) return;
            const ev = e.touches ? e.touches[0] : e;
            const dx=ev.clientX-startX, dy=ev.clientY-startY;
            if (Math.abs(dx)>6 || Math.abs(dy)>6) isDragging=true;
            const r=el.getBoundingClientRect();
            const c=clamp(initX+dx, initY+dy, r.width, r.height);
            el.style.left=c.x+'px'; el.style.top=c.y+'px';
        };
        const end = () => {
            if (!drag) return; drag=false;
            const r=el.getBoundingClientRect();
            const c=clamp(r.left, r.top, r.width, r.height);
            el.style.left=c.x+'px'; el.style.top=c.y+'px';
            savePos(c.x, c.y);
            setTimeout(() => isDragging=false, 50);
        };
        handle.addEventListener('mousedown', start);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
        handle.addEventListener('touchstart', start, { passive: false });
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', end);
    }

    // ─── Hospital polling ─────────────────────────────────────────────────────

    async function fetchHospitalTime() {
        try {
            const res  = await fetch('/page.php?sid=UserApiData', { credentials:'include', headers:{'X-Requested-With':'XMLHttpRequest'} });
            const data = await res.json();
            const until = Number(data?.hospitalstamp) || 0;
            const now   = Math.floor(Date.now()/1000);
            return until > now ? Math.max(0, until-now) : 0;
        } catch { return inHospital() ? cachedTimer||60 : 0; }
    }

    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(async () => {
            if (!isEnabled) return;
            const hosp = inHospital();
            const t = hosp ? await fetchHospitalTime() : 0;
            if (t !== cachedTimer) { cachedTimer = t; updateButtonDisplay(); }
            updateCooldownDisplay();
        }, 1000);
    }

    // ─── Item use ─────────────────────────────────────────────────────────────

    async function useItem(item) {
        if (!item?.id) return false;
        try {
            const body = new URLSearchParams({ step:'useItem', itemID: item.id.toString() });
            if (settings.itemSource === 'Faction Armory') body.set('fac', '1');
            const res = await fetch('https://www.torn.com/item.php', {
                method:'POST', body, credentials:'include',
                headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'}
            });
            return res.ok;
        } catch { return false; }
    }

    function isOnCorrectPage() {
        return (settings.itemSource === 'Personal Items' && isOnPersonalPage()) ||
               (settings.itemSource === 'Faction Armory' && isOnFactionPage());
    }

    async function onButtonClick() {
        if (isDragging || cachedTimer <= 0) return;
        const item = selectBestItem(cachedTimer);
        if (!item) return;
        if (isOnCorrectPage()) {
            const ok = await useItem(item);
            if (ok) setTimeout(updateButtonDisplay, 800);
        } else {
            window.location.href = settings.itemSource === 'Faction Armory' ? FACTION_URL : PERSONAL_URL;
        }
    }

    // ─── UI injection ─────────────────────────────────────────────────────────

    function injectUI() {
        if (document.getElementById('sk-med-container')) return;

        const container = document.createElement('div');
        container.id = 'sk-med-container';
        container.innerHTML = `
            <div id="sk-med-btn-wrap">
                <div id="sk-med-btn" title="Click to use best med item · Drag to move">
                    <div id="sk-med-icon">✚</div>
                    <div id="sk-med-timer"></div>
                </div>
                <div id="sk-med-cd-box">
                    <div id="sk-med-cd-text">No Med CD</div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        // Position
        const pos = loadPos();
        if (pos) {
            const r = container.getBoundingClientRect();
            const c = clamp(pos.x, pos.y, r.width, r.height);
            container.style.left = c.x+'px'; container.style.top = c.y+'px';
        } else {
            // Default: next to random target floater (top-right area)
            container.style.right = '80px'; container.style.top = '120px';
        }

        const btn = container.querySelector('#sk-med-btn');
        btn.addEventListener('click', onButtonClick);
        btn.addEventListener('touchend', e => { if (!isDragging) { e.preventDefault(); onButtonClick(); } }, { passive: false });

        enableDragging(container, btn);
        window.addEventListener('resize', restorePosition);
    }

    function removeUI() {
        const el = document.getElementById('sk-med-container');
        if (el) el.remove();
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        if (perkFetchInterval) { clearInterval(perkFetchInterval); perkFetchInterval = null; }
    }

    // ─── Styles ───────────────────────────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('sk-med-styles')) return;
        const style = document.createElement('style');
        style.id = 'sk-med-styles';
        style.textContent = `
            #sk-med-container {
                position: fixed; z-index: 999998;
                display: flex; flex-direction: column; align-items: center;
                user-select: none;
            }
            #sk-med-btn-wrap { position: relative; width: 52px; height: 62px; }
            #sk-med-btn {
                position: absolute; top: 0;
                width: 52px; height: 52px; border-radius: 50%;
                background: #555; border: 2.5px solid rgba(255,255,255,0.25);
                display: flex; justify-content: center; align-items: center;
                overflow: hidden; cursor: pointer; transition: all .15s;
            }
            #sk-med-btn:hover { transform: scale(1.1); filter: brightness(1.15); }
            #sk-med-icon {
                font-size: 28px; position: absolute;
                top: calc(50% - 5px); left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none; color: #fff; text-shadow: 0 0 4px rgba(0,0,0,0.6);
            }
            #sk-med-timer {
                position: absolute; bottom: 8px; left: 50%;
                transform: translateX(-50%);
                font-size: 10px; color: #fff; font-weight: bold;
                text-shadow: 0 0 3px black; pointer-events: none; white-space: nowrap;
            }
            #sk-med-cd-box {
                position: absolute; top: 48px; left: -8px; width: 68px; height: 18px;
                background: #8b0000; border: 1.5px solid rgba(255,255,255,0.25);
                border-radius: 5px; display: flex; align-items: center; box-sizing: border-box;
            }
            #sk-med-cd-text {
                font-size: 9.5px; color: #fff; text-align: center;
                flex-grow: 1; pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    // ─── Public module API ────────────────────────────────────────────────────

    const SmartMedicalButton = {
        name: 'SmartMedicalButton',

        async initialize() {
            if (!window.SidekickModules?.Core?.ChromeStorage) return;

            await loadSettings();

            if (!isEnabled) return;

            injectStyles();
            injectUI();

            cachedTimer = inHospital() ? await fetchHospitalTime() : 0;
            updateButtonDisplay();

            startPolling();
            setInterval(updateCooldownDisplay, 1000);

            // Fetch perks after 2s, then every 15 min
            setTimeout(() => fetchPerksAndUpdateThresholds(), 2000);
            perkFetchInterval = setInterval(() => fetchPerksAndUpdateThresholds(), 15 * 60 * 1000);

            console.log('[Sidekick] Smart Medical Button initialized');
        },

        async enable() {
            isEnabled = true;
            await saveSettings({ isEnabled: true });
            injectStyles();
            injectUI();
            cachedTimer = inHospital() ? await fetchHospitalTime() : 0;
            updateButtonDisplay();
            startPolling();
            if (!perkFetchInterval) {
                setTimeout(() => fetchPerksAndUpdateThresholds(), 500);
                perkFetchInterval = setInterval(() => fetchPerksAndUpdateThresholds(), 15*60*1000);
            }
        },

        async disable() {
            isEnabled = false;
            await saveSettings({ isEnabled: false });
            removeUI();
        },

        // Called from settings panel to update item source / blood type
        async updateSetting(key, value) {
            settings[key] = value;
            await saveSettings({ [key]: value });
            updateButtonDisplay();
        },

        destroy() { removeUI(); }
    };

    if (!window.SidekickModules) window.SidekickModules = {};
    window.SidekickModules.SmartMedicalButton = SmartMedicalButton;

    // Auto-init after core is ready
    const tryInit = () => {
        if (window.SidekickModules?.Core?.ChromeStorage) {
            SmartMedicalButton.initialize();
        } else {
            setTimeout(tryInit, 200);
        }
    };
    tryInit();

})();
