/**
 * Holiday Module
 * Manages seasonal tools injected into Torn.com pages.
 * Current tools: Easter Egg Hunt Helper
 * Version: 1.0.0
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const EGG_HUNT_PAGES = [
    { label: "Home",                 url: "/" },
    { label: "Preferences",          url: "/preferences.php" },
    { label: "Personal Stats",       url: "/personalstats.php" },
    { label: "Player Report",        url: "/playerreport.php" },
    { label: "Activity Log",         url: "/page.php?sid=log" },
    { label: "Events",               url: "/page.php?sid=events" },
    { label: "Profile",              url: "/profiles.php?XID=1" },
    { label: "Awards",               url: "/page.php?sid=awards" },
    { label: "Hall of Fame",         url: "/page.php?sid=hof" },
    { label: "Revive",               url: "/revive.php" },
    { label: "PC",                   url: "/pc.php" },
    { label: "City",                 url: "/city.php" },
    { label: "City Stats",           url: "/citystats.php" },
    { label: "Users Online",         url: "/usersonline.php" },
    { label: "User List",            url: "/page.php?sid=UserList" },
    { label: "People",               url: "/index.php?page=people" },
    { label: "Fortune Teller",       url: "/index.php?page=fortune" },
    { label: "Rehab",                url: "/index.php?page=rehab" },
    { label: "Hunting",              url: "/index.php?page=hunting" },
    { label: "Items",                url: "/item.php" },
    { label: "Item Mods",            url: "/page.php?sid=itemsMods" },
    { label: "Ammo",                 url: "/page.php?sid=ammo" },
    { label: "Display Case",         url: "/displaycase.php" },
    { label: "Keepsakes",            url: "/page.php?sid=keepsakes" },
    { label: "Trade",                url: "/trade.php" },
    { label: "Museum",               url: "/museum.php" },
    { label: "Auction Market",       url: "/amarket.php" },
    { label: "Point Market",         url: "/pmarket.php" },
    { label: "Item Market",          url: "/page.php?sid=ItemMarket" },
    { label: "Bazaar",               url: "/page.php?sid=bazaar" },
    { label: "Stocks",               url: "/page.php?sid=stocks" },
    { label: "Bank",                 url: "/bank.php" },
    { label: "Points",               url: "/points.php" },
    { label: "Loan",                 url: "/loan.php" },
    { label: "Donator",              url: "/donator.php" },
    { label: "Token Shop",           url: "/token_shop.php" },
    { label: "Freebies",             url: "/freebies.php" },
    { label: "Bring a Friend",       url: "/bringafriend.php" },
    { label: "Bounties",             url: "/bounties.php" },
    { label: "Big Al's Gun Shop",    url: "/bigalgunshop.php" },
    { label: "Bits N' Bobs",         url: "/shops.php?step=bitsnbobs" },
    { label: "Cyberforce",           url: "/shops.php?step=cyberforce" },
    { label: "Docks",                url: "/shops.php?step=docks" },
    { label: "Jewelry",              url: "/shops.php?step=jewelry" },
    { label: "Nike-H",               url: "/shops.php?step=nikeh" },
    { label: "Pawn Shop",            url: "/shops.php?step=pawnshop" },
    { label: "Pharmacy",             url: "/shops.php?step=pharmacy" },
    { label: "Post Office",          url: "/shops.php?step=postoffice" },
    { label: "Print Store",          url: "/shops.php?step=printstore" },
    { label: "Recycling Center",     url: "/shops.php?step=recyclingcenter" },
    { label: "Supermarket",          url: "/shops.php?step=super" },
    { label: "Candy Shop",           url: "/shops.php?step=candy" },
    { label: "Clothes Shop",         url: "/shops.php?step=clothes" },
    { label: "Bunker",               url: "/page.php?sid=bunker" },
    { label: "Properties",           url: "/properties.php" },
    { label: "Estate Agents",        url: "/estateagents.php" },
    { label: "Casino",               url: "/casino.php" },
    { label: "Slots",                url: "/page.php?sid=slots" },
    { label: "Roulette",             url: "/page.php?sid=roulette" },
    { label: "High/Low",             url: "/page.php?sid=highlow" },
    { label: "Keno",                 url: "/page.php?sid=keno" },
    { label: "Craps",                url: "/page.php?sid=craps" },
    { label: "Bookie",               url: "/page.php?sid=bookie" },
    { label: "Lottery",              url: "/page.php?sid=lottery" },
    { label: "Blackjack",            url: "/page.php?sid=blackjack" },
    { label: "Hold'em",              url: "/page.php?sid=holdem" },
    { label: "Russian Roulette",     url: "/page.php?sid=russianRoulette" },
    { label: "Spin The Wheel",       url: "/page.php?sid=spinTheWheel" },
    { label: "Dump",                 url: "/dump.php" },
    { label: "Crimes 1.0",           url: "/crimes.php" },
    { label: "Crimes 2.0",           url: "/page.php?sid=crimes" },
    { label: "Criminal Records",     url: "/page.php?sid=crimesRecord" },
    { label: "Missions",             url: "/loader.php?sid=missions" },
    { label: "Racing",               url: "/loader.php?sid=racing" },
    { label: "Factions",             url: "/factions.php" },
    { label: "Faction Warfare",      url: "/page.php?sid=factionWarfare" },
    { label: "Jobs",                 url: "/jobs.php" },
    { label: "Job List",             url: "/joblist.php" },
    { label: "Job Listing",          url: "/joblisting.php" },
    { label: "Companies",            url: "/companies.php" },
    { label: "Education",            url: "/education.php" },
    { label: "Gym",                  url: "/gym.php" },
    { label: "Travel",               url: "/page.php?sid=travel" },
    { label: "Hospital",             url: "/hospitalview.php" },
    { label: "Jail",                 url: "/jailview.php" },
    { label: "Friends List",         url: "/page.php?sid=list&type=friends" },
    { label: "Enemies List",         url: "/page.php?sid=list&type=enemies" },
    { label: "Targets List",         url: "/page.php?sid=list&type=targets" },
    { label: "Messages",             url: "/messages.php" },
    { label: "Message Inc",          url: "/messageinc.php" },
    { label: "Fans",                 url: "/fans.php" },
    { label: "Personals",            url: "/personals.php" },
    { label: "Forums",               url: "/forums.php" },
    { label: "Newspaper",            url: "/newspaper.php" },
    { label: "Comics",               url: "/comics.php" },
    { label: "Archives",             url: "/archives.php" },
    { label: "Rules",                url: "/rules.php" },
    { label: "Staff",                url: "/staff.php" },
    { label: "Credits",              url: "/credits.php" },
    { label: "Committee",            url: "/committee.php" },
    { label: "Calendar",             url: "/calendar.php" },
    { label: "Competition",          url: "/competition.php" },
    { label: "Church",               url: "/church.php" },
    { label: "Blacklist",            url: "/blacklist.php" },
    { label: "Christmas Town",       url: "/christmas_town.php" }
];

// ─── Egg Hunt Tool ───────────────────────────────────────────────────────────

const EggHuntTool = {
    STORAGE_KEY: 'sidekick_holiday_eggHunt',
    PANEL_ID: 'sk-egg-hunt-panel',
    STYLES_ID: 'sk-egg-hunt-styles',

    // State
    state: {
        idx: 0,
        panelX: null,
        panelY: null,
        collapsed: false,
        hidden: false,
        eggsFound: 0,
        visited: [],
        filter: '',
    },

    panel: null,
    miniBtn: null,
    _listWrap: null,
    _progressFill: null,
    _progressLabel: null,
    _jumpInput: null,
    _searchInput: null,
    _currentPageEl: null,
    _eggBadge: null,
    _eggObserver: null,

    // ─── State Persistence ────────────────────────────────────────────────────

    async loadState() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get(this.STORAGE_KEY);
            if (data) {
                Object.assign(this.state, data);
            }
        } catch {}
    },

    async saveState() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, { ...this.state });
        } catch {}
    },

    async resetVisited() {
        this.state.visited = [];
        this.state.idx = 0;
        await this.saveState();
        this._renderList(false);
        this._updateUI();
    },

    async resetEggs() {
        this.state.eggsFound = 0;
        await this.saveState();
        if (this._eggBadge) this._eggBadge.textContent = this.state.eggsFound;
    },

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    async init() {
        if (document.getElementById(this.PANEL_ID)) return; // already alive
        this._ensureStyles();
        await this.loadState();
        this._buildPanel();
        this._setupEggDetection();
        this._bindKeyboard();
    },

    destroy() {
        document.getElementById(this.PANEL_ID)?.remove();
        document.getElementById('sk-egg-mini-btn')?.remove();
        document.getElementById(this.STYLES_ID)?.remove();
        if (this._eggObserver) { this._eggObserver.disconnect(); this._eggObserver = null; }
        this.panel = null;
        this.miniBtn = null;
    },

    // ─── Styles ───────────────────────────────────────────────────────────────

    _ensureStyles() {
        if (document.getElementById(this.STYLES_ID)) return;
        const s = document.createElement('style');
        s.id = this.STYLES_ID;
        s.textContent = `
            #sk-egg-hunt-panel, #sk-egg-hunt-panel * {
                box-sizing: border-box;
                font-family: Arial, 'Segoe UI', sans-serif;
            }

            #sk-egg-hunt-panel {
                position: fixed;
                z-index: 2147483640;
                width: 260px;
                background: #1a1a1a;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
                user-select: none;
            }

            #sk-egg-hunt-header {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 10px 12px;
                background: #242424;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                cursor: grab;
            }
            #sk-egg-hunt-header:active { cursor: grabbing; }

            #sk-egg-hunt-title {
                flex: 1;
                font-size: 12px;
                font-weight: 700;
                color: #fff;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #sk-egg-badge {
                background: linear-gradient(135deg, #66BB6A, #43A047);
                color: #fff;
                font-size: 10px;
                font-weight: 800;
                padding: 2px 8px;
                border-radius: 10px;
                min-width: 28px;
                text-align: center;
            }

            .sk-egg-hdr-btn {
                width: 22px;
                height: 22px;
                border: none;
                background: rgba(255,255,255,0.06);
                border-radius: 5px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(255,255,255,0.5);
                font-size: 11px;
                flex-shrink: 0;
                padding: 0;
                transition: background 0.15s, color 0.15s;
            }
            .sk-egg-hdr-btn:hover {
                background: rgba(102,187,106,0.2);
                color: #66BB6A;
            }

            #sk-egg-hunt-body {
                overflow: hidden;
                transition: max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease;
                max-height: 400px;
                opacity: 1;
            }
            #sk-egg-hunt-panel.sk-collapsed #sk-egg-hunt-body {
                max-height: 0;
                opacity: 0;
            }

            #sk-egg-progress-wrap {
                padding: 8px 12px 6px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            #sk-egg-progress-track {
                height: 3px;
                background: rgba(255,255,255,0.08);
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 5px;
            }
            #sk-egg-progress-fill {
                height: 100%;
                border-radius: 2px;
                background: linear-gradient(90deg, #66BB6A, #43A047);
                transition: width 0.35s cubic-bezier(0.4,0,0.2,1);
            }
            #sk-egg-progress-label {
                font-size: 10px;
                color: rgba(255,255,255,0.4);
                display: flex;
                justify-content: space-between;
            }
            #sk-egg-progress-label span { color: #66BB6A; }

            #sk-egg-current-page {
                padding: 5px 12px;
                font-size: 10px;
                color: rgba(255,255,255,0.3);
                border-bottom: 1px solid rgba(255,255,255,0.04);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            #sk-egg-current-page em {
                font-style: normal;
                color: rgba(102,187,106,0.85);
            }

            #sk-egg-search-wrap {
                padding: 7px 10px 5px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            #sk-egg-search {
                width: 100%;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                padding: 5px 9px;
                font-size: 11px;
                color: #fff;
                outline: none;
                transition: border-color 0.2s;
            }
            #sk-egg-search::placeholder { color: rgba(255,255,255,0.25); }
            #sk-egg-search:focus { border-color: rgba(102,187,106,0.5); }

            #sk-egg-list-wrap {
                max-height: 165px;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 3px 0;
                scrollbar-width: thin;
                scrollbar-color: rgba(102,187,106,0.25) transparent;
            }
            #sk-egg-list-wrap::-webkit-scrollbar { width: 4px; }
            #sk-egg-list-wrap::-webkit-scrollbar-track { background: transparent; }
            #sk-egg-list-wrap::-webkit-scrollbar-thumb { background: rgba(102,187,106,0.25); border-radius: 2px; }

            .sk-egg-page-item {
                display: flex;
                align-items: center;
                gap: 7px;
                padding: 5px 12px;
                cursor: pointer;
                font-size: 11px;
                color: rgba(255,255,255,0.7);
                text-decoration: none;
                transition: background 0.1s;
            }
            .sk-egg-page-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .sk-egg-page-item.sk-active {
                background: rgba(102,187,106,0.12);
                color: #66BB6A;
                font-weight: 600;
            }
            .sk-egg-page-num {
                font-size: 9px;
                color: rgba(255,255,255,0.2);
                min-width: 22px;
                text-align: right;
                flex-shrink: 0;
            }
            .sk-egg-page-label {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .sk-egg-check {
                font-size: 10px;
                color: #66BB6A;
                opacity: 0;
                flex-shrink: 0;
            }
            .sk-egg-page-item.sk-visited .sk-egg-check { opacity: 1; }

            #sk-egg-controls {
                padding: 8px 10px;
                display: flex;
                gap: 6px;
                align-items: center;
                border-top: 1px solid rgba(255,255,255,0.06);
            }

            .sk-egg-btn {
                border: none;
                border-radius: 7px;
                cursor: pointer;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: filter 0.15s, background 0.15s, transform 0.1s;
                outline: none;
            }
            .sk-egg-btn:active { transform: scale(0.93); }

            .sk-egg-btn-prev {
                width: 32px;
                height: 32px;
                background: rgba(255,255,255,0.07);
                color: rgba(255,255,255,0.6);
                font-size: 13px;
                flex-shrink: 0;
            }
            .sk-egg-btn-prev:hover { background: rgba(255,255,255,0.12); color: #fff; }

            .sk-egg-btn-next {
                flex: 1;
                height: 32px;
                background: linear-gradient(135deg, #66BB6A, #43A047);
                color: #fff;
                font-size: 11px;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                box-shadow: 0 2px 10px rgba(102,187,106,0.25);
            }
            .sk-egg-btn-next:hover { filter: brightness(1.1); box-shadow: 0 3px 16px rgba(102,187,106,0.4); }

            #sk-egg-jump-row {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 0 10px 9px;
            }
            #sk-egg-jump-row label {
                font-size: 10px;
                color: rgba(255,255,255,0.28);
                flex-shrink: 0;
            }
            #sk-egg-jump-input {
                width: 48px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 5px;
                padding: 4px 6px;
                font-size: 11px;
                color: #fff;
                outline: none;
                text-align: center;
                -moz-appearance: textfield;
            }
            #sk-egg-jump-input::-webkit-inner-spin-button { -webkit-appearance: none; }
            #sk-egg-jump-input:focus { border-color: rgba(102,187,106,0.4); }
            #sk-egg-jump-total {
                font-size: 10px;
                color: rgba(255,255,255,0.22);
                flex-shrink: 0;
            }
            #sk-egg-jump-go {
                flex: 1;
                height: 26px;
                font-size: 10px;
                font-weight: 700;
                background: rgba(102,187,106,0.15);
                color: #66BB6A;
                border: 1px solid rgba(102,187,106,0.25);
                border-radius: 5px;
                cursor: pointer;
                letter-spacing: 0.04em;
                transition: background 0.15s;
            }
            #sk-egg-jump-go:hover { background: rgba(102,187,106,0.28); }

            #sk-egg-mini-btn {
                position: fixed;
                width: 40px;
                height: 40px;
                background: #1a1a1a;
                border: 1px solid rgba(102,187,106,0.4);
                border-radius: 50%;
                cursor: pointer;
                z-index: 2147483640;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 3px 14px rgba(0,0,0,0.5), 0 0 8px rgba(102,187,106,0.15);
                transition: transform 0.2s, box-shadow 0.2s;
                touch-action: none;
            }
            #sk-egg-mini-btn:hover {
                transform: scale(1.08);
                box-shadow: 0 5px 18px rgba(0,0,0,0.6), 0 0 12px rgba(102,187,106,0.35);
            }

            /* egg detected glow */
            #sk-egg-hunt-panel.sk-egg-found {
                box-shadow: 0 0 0 2px rgba(102,187,106,0.8), 0 0 24px 4px rgba(102,187,106,0.3), 0 8px 32px rgba(0,0,0,0.6);
                animation: sk-egg-found-pulse 0.7s ease-in-out 3;
            }
            @keyframes sk-egg-found-pulse {
                0%,100% { box-shadow: 0 0 0 2px rgba(102,187,106,0.7), 0 0 24px 4px rgba(102,187,106,0.3), 0 8px 32px rgba(0,0,0,0.6); }
                50%      { box-shadow: 0 0 0 3px rgba(102,187,106,1),   0 0 40px 10px rgba(102,187,106,0.5), 0 8px 32px rgba(0,0,0,0.6); }
            }

            /* repositioned egg button */
            #easter-egg-hunt-root button.__sk-egg-repositioned {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: min(50vw, 50vh) !important;
                height: min(50vw, 50vh) !important;
                z-index: 2147483639 !important;
                cursor: pointer !important;
                border: 2px solid rgba(102,187,106,0.8) !important;
                border-radius: 50% !important;
                box-shadow: 0 0 0 5px rgba(102,187,106,0.15), 0 0 32px 8px rgba(102,187,106,0.3) !important;
                animation: sk-egg-button-appear 0.35s cubic-bezier(0.34,1.56,0.64,1) both !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: visible !important;
                background: transparent !important;
            }
            @keyframes sk-egg-button-appear {
                from { transform: translate(-50%,-50%) scale(0.4) rotate(-6deg); opacity: 0; }
                to   { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity: 1; }
            }
            #easter-egg-hunt-root button.__sk-egg-repositioned img,
            #easter-egg-hunt-root button.__sk-egg-repositioned > *:first-child {
                width: 100% !important; height: 100% !important; object-fit: contain !important;
            }
        `;
        document.head.appendChild(s);
    },

    // ─── Panel Construction ───────────────────────────────────────────────────

    _buildPanel() {
        const s = this.state;
        const W = 260;

        this.panel = document.createElement('div');
        this.panel.id = this.PANEL_ID;
        if (s.collapsed) this.panel.classList.add('sk-collapsed');

        const dx = Math.max(0, Math.min(s.panelX ?? (window.innerWidth - W - 10), window.innerWidth - W));
        const dy = Math.max(0, Math.min(s.panelY ?? 16, window.innerHeight - 80));
        this.panel.style.left = dx + 'px';
        this.panel.style.top  = dy + 'px';

        // ── Header ────────────────────────────────────────────────────────────
        const header = document.createElement('div');
        header.id = 'sk-egg-hunt-header';

        const titleEl = document.createElement('div');
        titleEl.id = 'sk-egg-hunt-title';
        titleEl.textContent = '🥚 Egg Hunt';

        this._eggBadge = document.createElement('div');
        this._eggBadge.id = 'sk-egg-badge';
        this._eggBadge.textContent = s.eggsFound;

        const resetEggsBtn = this._headerBtn('0', 'Reset egg count');
        resetEggsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Reset egg counter to 0?')) this.resetEggs();
        });

        const resetVisitBtn = this._headerBtn('↺', 'Reset visited pages');
        resetVisitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Reset all visited checkpoints?')) this.resetVisited();
        });

        const collapseBtn = this._headerBtn(s.collapsed ? '▲' : '▼', 'Collapse / Expand');
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.state.collapsed = !this.state.collapsed;
            this.panel.classList.toggle('sk-collapsed', this.state.collapsed);
            collapseBtn.textContent = this.state.collapsed ? '▲' : '▼';
            this.saveState();
        });

        const hideBtn = this._headerBtn('✕', 'Hide panel');
        hideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.state.hidden = true;
            this.saveState();
            this._applyHidden();
        });

        header.append(titleEl, this._eggBadge, resetEggsBtn, resetVisitBtn, collapseBtn, hideBtn);

        // ── Body ──────────────────────────────────────────────────────────────
        const body = document.createElement('div');
        body.id = 'sk-egg-hunt-body';

        // Progress
        const progWrap = document.createElement('div');
        progWrap.id = 'sk-egg-progress-wrap';
        const track = document.createElement('div');
        track.id = 'sk-egg-progress-track';
        this._progressFill = document.createElement('div');
        this._progressFill.id = 'sk-egg-progress-fill';
        track.appendChild(this._progressFill);
        this._progressLabel = document.createElement('div');
        this._progressLabel.id = 'sk-egg-progress-label';
        progWrap.append(track, this._progressLabel);

        // Current page
        this._currentPageEl = document.createElement('div');
        this._currentPageEl.id = 'sk-egg-current-page';

        // Search
        const searchWrap = document.createElement('div');
        searchWrap.id = 'sk-egg-search-wrap';
        this._searchInput = document.createElement('input');
        this._searchInput.id = 'sk-egg-search';
        this._searchInput.type = 'text';
        this._searchInput.placeholder = '🔍 Search pages…';
        this._searchInput.value = s.filter || '';
        this._searchInput.addEventListener('input', () => {
            this.state.filter = this._searchInput.value;
            this._renderList(false);
        });
        searchWrap.appendChild(this._searchInput);

        // List
        this._listWrap = document.createElement('div');
        this._listWrap.id = 'sk-egg-list-wrap';

        body.append(progWrap, this._currentPageEl, searchWrap, this._listWrap);

        // ── Controls ──────────────────────────────────────────────────────────
        const controls = document.createElement('div');
        controls.id = 'sk-egg-controls';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'sk-egg-btn sk-egg-btn-prev';
        prevBtn.textContent = '◀';
        prevBtn.title = 'Previous page';
        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this._navigateDelta(-1); });
        const nextBtn = document.createElement('button');
        nextBtn.className = 'sk-egg-btn sk-egg-btn-next';
        nextBtn.textContent = 'Next Page ▶';
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this._navigateDelta(1); });
        controls.append(prevBtn, nextBtn);

        // Jump row
        const jumpRow = document.createElement('div');
        jumpRow.id = 'sk-egg-jump-row';
        const jumpLbl = document.createElement('label');
        jumpLbl.textContent = 'Jump:';
        this._jumpInput = document.createElement('input');
        this._jumpInput.id = 'sk-egg-jump-input';
        this._jumpInput.type = 'number';
        this._jumpInput.min = '1';
        this._jumpInput.max = String(EGG_HUNT_PAGES.length);
        this._jumpInput.value = String(s.idx + 1);
        const jumpTotal = document.createElement('span');
        jumpTotal.id = 'sk-egg-jump-total';
        jumpTotal.textContent = '/ ' + EGG_HUNT_PAGES.length;
        const jumpGo = document.createElement('button');
        jumpGo.id = 'sk-egg-jump-go';
        jumpGo.textContent = 'GO';
        jumpGo.addEventListener('click', (e) => {
            e.stopPropagation();
            const v = parseInt(this._jumpInput.value, 10) - 1;
            if (!isNaN(v) && v >= 0 && v < EGG_HUNT_PAGES.length) this._navigateTo(v);
        });
        this._jumpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') jumpGo.click(); e.stopPropagation(); });
        jumpRow.append(jumpLbl, this._jumpInput, jumpTotal, jumpGo);

        this.panel.append(header, body, controls, jumpRow);
        document.body.appendChild(this.panel);

        this._makeDraggable(header, this.panel);
        this._updateUI();
        this._renderList(false);
        this._applyHidden();
    },

    _headerBtn(text, title) {
        const btn = document.createElement('button');
        btn.className = 'sk-egg-hdr-btn';
        btn.textContent = text;
        btn.title = title;
        return btn;
    },

    // ─── List Rendering ───────────────────────────────────────────────────────

    _renderList(scrollToActive) {
        const q = (this.state.filter || '').toLowerCase();
        const visited = new Set(this.state.visited || []);
        this._listWrap.innerHTML = '';

        EGG_HUNT_PAGES.forEach((p, i) => {
            if (q && !p.label.toLowerCase().includes(q) && !p.url.toLowerCase().includes(q)) return;

            const el = document.createElement('a');
            el.className = 'sk-egg-page-item';
            if (i === this.state.idx) el.classList.add('sk-active');
            if (visited.has(i)) el.classList.add('sk-visited');
            el.href = 'https://www.torn.com' + p.url;
            el.draggable = false;
            el.addEventListener('click', (e) => { e.preventDefault(); this._navigateTo(i); });

            const num = document.createElement('span');
            num.className = 'sk-egg-page-num';
            num.textContent = i + 1;
            const lbl = document.createElement('span');
            lbl.className = 'sk-egg-page-label';
            lbl.textContent = p.label;
            const chk = document.createElement('span');
            chk.className = 'sk-egg-check';
            chk.textContent = '✓';
            el.append(num, lbl, chk);
            this._listWrap.appendChild(el);
        });

        if (scrollToActive) {
            this._listWrap.querySelector('.sk-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    _updateUI() {
        if (!this._progressFill) return;
        const visited = (this.state.visited || []).length;
        const pct = (visited / EGG_HUNT_PAGES.length * 100).toFixed(1);
        this._progressFill.style.width = pct + '%';
        this._progressLabel.innerHTML = `<span>${visited}</span> visited &nbsp; <span>${pct}%</span>`;
        if (this._jumpInput) this._jumpInput.value = String(this.state.idx + 1);
        const cur = EGG_HUNT_PAGES[this.state.idx];
        if (this._currentPageEl && cur) {
            this._currentPageEl.innerHTML = `Next: <em>${cur.label}</em>`;
        }
        if (this._eggBadge) this._eggBadge.textContent = this.state.eggsFound;
    },

    // ─── Navigation ───────────────────────────────────────────────────────────

    _navigateDelta(d) {
        let next = this.state.idx + d;
        if (next >= EGG_HUNT_PAGES.length) next = 0;
        if (next < 0) next = EGG_HUNT_PAGES.length - 1;
        this._navigateTo(next);
    },

    _navigateTo(idx) {
        this.state.idx = idx;
        if (!this.state.visited) this.state.visited = [];
        if (!this.state.visited.includes(idx)) this.state.visited.push(idx);
        this.saveState();
        const url = 'https://www.torn.com' + EGG_HUNT_PAGES[idx].url;
        if (window.location.href.split('#')[0] === url.split('#')[0]) {
            window.location.href = url;
            window.location.reload();
        } else {
            window.location.href = url;
        }
    },

    // ─── Hidden / Mini Button ─────────────────────────────────────────────────

    _applyHidden() {
        if (this.state.hidden) {
            if (this.panel) this.panel.style.display = 'none';
            if (!this.miniBtn) {
                this.miniBtn = document.createElement('button');
                this.miniBtn.id = 'sk-egg-mini-btn';
                this.miniBtn.title = 'Show Egg Hunt';
                this.miniBtn.textContent = '🥚';
                document.body.appendChild(this.miniBtn);
                this._makeDraggable(this.miniBtn, this.miniBtn, true);
            }
            const px = Math.max(0, Math.min(this.state.pillX ?? (window.innerWidth - 50), window.innerWidth - 40));
            const py = Math.max(0, Math.min(this.state.pillY ?? (window.innerHeight - 90), window.innerHeight - 40));
            this.miniBtn.style.left = px + 'px';
            this.miniBtn.style.top  = py + 'px';
            this.miniBtn.style.display = 'flex';
        } else {
            if (this.panel) this.panel.style.display = '';
            if (this.miniBtn) this.miniBtn.style.display = 'none';
        }
    },

    // ─── Egg Detection ────────────────────────────────────────────────────────

    _setupEggDetection() {
        this._checkForEggRoot();
        this._eggObserver = new MutationObserver(() => this._checkForEggRoot());
        this._eggObserver.observe(document.documentElement, { childList: true, subtree: true });
    },

    _checkForEggRoot() {
        const root = document.querySelector('#easter-egg-hunt-root');
        if (!root || root.dataset.skHandled) return;
        root.dataset.skHandled = '1';
        this._waitForEggButtons(root).then((buttons) => {
            buttons.forEach(btn => {
                if (!btn.classList.contains('__sk-egg-repositioned')) {
                    btn.classList.add('__sk-egg-repositioned');
                }
                btn.addEventListener('click', () => {
                    this.state.eggsFound = (this.state.eggsFound || 0) + 1;
                    if (this._eggBadge) this._eggBadge.textContent = this.state.eggsFound;
                    this.saveState();
                }, { once: true });
            });
            if (this.panel) {
                this.panel.classList.add('sk-egg-found');
                setTimeout(() => this.panel?.classList.remove('sk-egg-found'), 2500);
            }
        }).catch(() => {});
    },

    _waitForEggButtons(root) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => { obs.disconnect(); reject('timeout'); }, 12000);
            const check = () => {
                const btns = root.querySelectorAll('button');
                if (btns.length) { clearTimeout(t); obs.disconnect(); resolve(btns); }
            };
            const obs = new MutationObserver(check);
            obs.observe(root, { childList: true, subtree: true });
            check();
        });
    },

    // ─── Keyboard ─────────────────────────────────────────────────────────────

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this._navigateDelta(1); }
            if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); this._navigateDelta(-1); }
        });
    },

    // ─── Drag ─────────────────────────────────────────────────────────────────

    _makeDraggable(handle, target, isPill = false) {
        let dragging = false, moved = false, ox = 0, oy = 0, sx = 0, sy = 0;

        const start = (cx, cy) => {
            dragging = true; moved = false; sx = cx; sy = cy;
            const r = target.getBoundingClientRect();
            ox = cx - r.left; oy = cy - r.top;
            target.style.transition = 'none';
        };
        const move = (cx, cy) => {
            if (!dragging) return;
            if (Math.abs(cx - sx) > 4 || Math.abs(cy - sy) > 4) moved = true;
            if (!moved) return;
            const x = Math.max(0, Math.min(cx - ox, window.innerWidth  - target.offsetWidth));
            const y = Math.max(0, Math.min(cy - oy, window.innerHeight - target.offsetHeight));
            target.style.left = x + 'px'; target.style.top = y + 'px';
            if (isPill) { this.state.pillX = x; this.state.pillY = y; }
            else        { this.state.panelX = x; this.state.panelY = y; }
        };
        const end = () => {
            if (dragging) { dragging = false; this.saveState(); }
            if (isPill && !moved) {
                // Click on mini button — restore panel
                this.state.hidden = false;
                this.saveState();
                this._applyHidden();
            }
        };

        handle.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); start(e.clientX, e.clientY); } });
        document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
        document.addEventListener('mouseup', end);
        handle.addEventListener('touchstart', (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
        document.addEventListener('touchmove', (e) => { if (!dragging) return; const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
        document.addEventListener('touchend', end);
    },
};

// ─── Holiday Module ───────────────────────────────────────────────────────────

const HolidayModule = {
    name: 'Holiday',
    version: '1.0.0',
    STORAGE_KEY: 'sidekick_holiday',

    eggHuntEnabled: false,

    async init() {
        console.log('🎉 Holiday Module: initializing...');
        await this.loadSettings();
        this._apply();

        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes[this.STORAGE_KEY]) {
                this.loadSettings().then(() => this._apply());
            }
        });

        console.log('🎉 Holiday Module: initialized');
    },

    async loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get(this.STORAGE_KEY);
            if (data) {
                this.eggHuntEnabled = data.eggHuntEnabled || false;
            }
        } catch (e) {
            console.error('🎉 Holiday Module: load failed:', e);
        }
    },

    async saveSettings() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, {
                eggHuntEnabled: this.eggHuntEnabled,
            });
        } catch (e) {
            console.error('🎉 Holiday Module: save failed:', e);
        }
    },

    _apply() {
        if (this.eggHuntEnabled) {
            EggHuntTool.init();
        } else {
            EggHuntTool.destroy();
        }
    },
};

// ─── Register ─────────────────────────────────────────────────────────────────

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.Holiday = HolidayModule;
console.log('🎉 Holiday module registered');
