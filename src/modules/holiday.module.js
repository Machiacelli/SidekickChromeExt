/**
 * Holiday Module — Easter Egg Hunt Helper
 * Minimal floating panel, auto-detects eggs, blocks navigation when egg is found.
 * Version: 2.0.0
 */

const EGG_HUNT_PAGES = [
    // Core
    { label: "Home",                      url: "/" },
    { label: "Preferences",               url: "/preferences.php" },
    { label: "Personal Stats",            url: "/personalstats.php" },
    { label: "Player Report",             url: "/playerreport.php" },
    { label: "Activity Log",              url: "/page.php?sid=log" },
    { label: "Events",                    url: "/page.php?sid=events" },
    { label: "Profile",                   url: "/profiles.php?XID=1" },
    { label: "Awards",                    url: "/page.php?sid=awards" },
    { label: "Hall of Fame",              url: "/page.php?sid=hof" },
    { label: "Revive",                    url: "/revive.php" },
    { label: "PC",                        url: "/pc.php" },
    // City
    { label: "City",                      url: "/city.php" },
    { label: "City Stats",                url: "/citystats.php" },
    { label: "Users Online",              url: "/usersonline.php" },
    { label: "User List",                 url: "/page.php?sid=UserList" },
    { label: "People",                    url: "/index.php?page=people" },
    { label: "Fortune Teller",            url: "/index.php?page=fortune" },
    { label: "Rehab",                     url: "/index.php?page=rehab" },
    { label: "Hunting",                   url: "/index.php?page=hunting" },
    // Inventory / Market
    { label: "Items",                     url: "/item.php" },
    { label: "Item Mods",                 url: "/page.php?sid=itemsMods" },
    { label: "Ammo",                      url: "/page.php?sid=ammo" },
    { label: "Display Case",              url: "/displaycase.php" },
    { label: "Keepsakes",                 url: "/page.php?sid=keepsakes" },
    { label: "Trade",                     url: "/trade.php" },
    { label: "Museum",                    url: "/museum.php" },
    { label: "Auction Market",            url: "/amarket.php" },
    { label: "Point Market",              url: "/pmarket.php" },
    { label: "Item Market",               url: "/page.php?sid=ItemMarket" },
    { label: "Item Market - Weapons",     url: "/page.php?sid=ItemMarket&type=weapons" },
    { label: "Item Market - Armor",       url: "/page.php?sid=ItemMarket&type=armor" },
    { label: "Item Market - Temporary",   url: "/page.php?sid=ItemMarket&type=temporary" },
    { label: "Item Market - Drugs",       url: "/page.php?sid=ItemMarket&type=drugs" },
    { label: "Item Market - Energy",      url: "/page.php?sid=ItemMarket&type=enhancers" },
    { label: "Item Market - Medical",     url: "/page.php?sid=ItemMarket&type=medical" },
    { label: "Item Market - Flowers",     url: "/page.php?sid=ItemMarket&type=flowers" },
    { label: "Item Market - Plushies",    url: "/page.php?sid=ItemMarket&type=plushies" },
    { label: "Item Market - Books",       url: "/page.php?sid=ItemMarket&type=books" },
    { label: "Item Market - Other",       url: "/page.php?sid=ItemMarket&type=other" },
    { label: "Bazaar",                    url: "/page.php?sid=bazaar" },
    // Finance
    { label: "Stocks",                    url: "/page.php?sid=stocks" },
    { label: "Bank",                      url: "/bank.php" },
    { label: "Points",                    url: "/points.php" },
    { label: "Loan",                      url: "/loan.php" },
    { label: "Donator",                   url: "/donator.php" },
    { label: "Token Shop",                url: "/token_shop.php" },
    { label: "Freebies",                  url: "/freebies.php" },
    { label: "Bring a Friend",            url: "/bringafriend.php" },
    { label: "Bounties",                  url: "/bounties.php" },
    { label: "Bounty List",               url: "/bounties.php?step=list" },
    // Shops
    { label: "Big Al's Gun Shop",         url: "/bigalgunshop.php" },
    { label: "Bits N Bobs",               url: "/shops.php?step=bitsnbobs" },
    { label: "Cyberforce",                url: "/shops.php?step=cyberforce" },
    { label: "Docks",                     url: "/shops.php?step=docks" },
    { label: "Jewelry",                   url: "/shops.php?step=jewelry" },
    { label: "Nike-H",                    url: "/shops.php?step=nikeh" },
    { label: "Pawn Shop",                 url: "/shops.php?step=pawnshop" },
    { label: "Pharmacy",                  url: "/shops.php?step=pharmacy" },
    { label: "Post Office",               url: "/shops.php?step=postoffice" },
    { label: "Print Store",               url: "/shops.php?step=printstore" },
    { label: "Recycling Center",          url: "/shops.php?step=recyclingcenter" },
    { label: "Supermarket",               url: "/shops.php?step=super" },
    { label: "Candy Shop",                url: "/shops.php?step=candy" },
    { label: "Clothes Shop",              url: "/shops.php?step=clothes" },
    { label: "Bunker",                    url: "/page.php?sid=bunker" },
    // Property
    { label: "Properties",                url: "/properties.php" },
    { label: "Estate Agents",             url: "/estateagents.php" },
    // Casino
    { label: "Casino",                    url: "/casino.php" },
    { label: "Slots",                     url: "/page.php?sid=slots" },
    { label: "Roulette",                  url: "/page.php?sid=roulette" },
    { label: "High/Low",                  url: "/page.php?sid=highlow" },
    { label: "Keno",                      url: "/page.php?sid=keno" },
    { label: "Craps",                     url: "/page.php?sid=craps" },
    { label: "Bookie",                    url: "/page.php?sid=bookie" },
    { label: "Lottery",                   url: "/page.php?sid=lottery" },
    { label: "Blackjack",                 url: "/page.php?sid=blackjack" },
    { label: "Hold'em",                   url: "/page.php?sid=holdem" },
    { label: "Russian Roulette",          url: "/page.php?sid=russianRoulette" },
    { label: "Spin The Wheel",            url: "/page.php?sid=spinTheWheel" },
    // Criminal
    { label: "Dump",                      url: "/dump.php" },
    { label: "Crimes 1.0",                url: "/crimes.php" },
    { label: "Crimes 2.0",                url: "/page.php?sid=crimes" },
    { label: "Criminal Records",          url: "/page.php?sid=crimesRecord" },
    // Missions NPCs
    { label: "Missions",                  url: "/loader.php?sid=missions" },
    { label: "Missions - Duke",           url: "/loader.php?sid=missions&step=duke" },
    { label: "Missions - Billie",         url: "/loader.php?sid=missions&step=billie" },
    { label: "Missions - Dave",           url: "/loader.php?sid=missions&step=dave" },
    { label: "Missions - Jesus",          url: "/loader.php?sid=missions&step=jesus" },
    { label: "Missions - Leslie",         url: "/loader.php?sid=missions&step=leslie" },
    { label: "Missions - Jimmy",          url: "/loader.php?sid=missions&step=jimmy" },
    { label: "Missions - Juan",           url: "/loader.php?sid=missions&step=juan" },
    { label: "Missions - Tiny",           url: "/loader.php?sid=missions&step=tiny" },
    // Racing
    { label: "Racing",                    url: "/loader.php?sid=racing" },
    { label: "Racing - Upgrade Car",      url: "/loader.php?sid=racing&step=upgradecar" },
    { label: "Racing - Leaderboards",     url: "/loader.php?sid=racing&step=leaderboards" },
    { label: "Racing - Your Races",       url: "/loader.php?sid=racing&step=yourRaces" },
    // Factions
    { label: "Factions",                  url: "/factions.php" },
    { label: "Faction - Main",            url: "/factions.php?step=your" },
    { label: "Faction - Armory",          url: "/factions.php?step=your&type=armoury" },
    { label: "Faction - Members",         url: "/factions.php?step=your&type=members" },
    { label: "Faction - Crimes",          url: "/factions.php?step=your&type=crimes" },
    { label: "Faction - News",            url: "/factions.php?step=your&type=news" },
    { label: "Faction - Attacks",         url: "/factions.php?step=your&type=attacks" },
    { label: "Faction - Stats",           url: "/factions.php?step=your&type=stats" },
    { label: "Faction - Donations",       url: "/factions.php?step=your&type=donations" },
    { label: "Faction - Upgrades",        url: "/factions.php?step=your&type=upgrades" },
    { label: "Faction - Territory",       url: "/factions.php?step=your&type=territory" },
    { label: "Faction - Wall",            url: "/factions.php?step=your&type=wall" },
    { label: "Faction - Applications",    url: "/factions.php?step=your&type=applications" },
    { label: "Faction Warfare",           url: "/page.php?sid=factionWarfare" },
    { label: "Faction - Search",          url: "/factions.php?step=search" },
    { label: "Ranked Wars",               url: "/page.php?sid=rankedWars" },
    // Jobs
    { label: "Jobs",                      url: "/jobs.php" },
    { label: "Job List",                  url: "/joblist.php" },
    { label: "Job Listing",               url: "/joblisting.php" },
    { label: "Companies",                 url: "/companies.php" },
    { label: "Company - Main",            url: "/companies.php?step=your" },
    { label: "Company - Employees",       url: "/companies.php?step=your&type=employees" },
    { label: "Company - Stock",           url: "/companies.php?step=your&type=stock" },
    { label: "Company - Stats",           url: "/companies.php?step=your&type=stats" },
    { label: "Company - Upgrades",        url: "/companies.php?step=your&type=upgrades" },
    { label: "Company - News",            url: "/companies.php?step=your&type=news" },
    { label: "Company - Applications",    url: "/companies.php?step=your&type=applications" },
    { label: "Company - Search",          url: "/companies.php?step=search" },
    // Education
    { label: "Education",                 url: "/education.php" },
    { label: "Education - Completed",     url: "/education.php?step=completed" },
    // Gym
    { label: "Gym",                       url: "/gym.php" },
    { label: "Gym - Strength",            url: "/gym.php?step=train&trainStat=strength" },
    { label: "Gym - Defense",             url: "/gym.php?step=train&trainStat=defense" },
    { label: "Gym - Speed",               url: "/gym.php?step=train&trainStat=speed" },
    { label: "Gym - Dexterity",           url: "/gym.php?step=train&trainStat=dexterity" },
    // Travel
    { label: "Travel",                    url: "/page.php?sid=travel" },
    { label: "Travel - Argentina",        url: "/page.php?sid=travel&code=AR" },
    { label: "Travel - Canada",           url: "/page.php?sid=travel&code=CA" },
    { label: "Travel - Cayman Islands",   url: "/page.php?sid=travel&code=CI" },
    { label: "Travel - China",            url: "/page.php?sid=travel&code=ZH" },
    { label: "Travel - Dubai",            url: "/page.php?sid=travel&code=DU" },
    { label: "Travel - Hawaii",           url: "/page.php?sid=travel&code=HI" },
    { label: "Travel - Japan",            url: "/page.php?sid=travel&code=JA" },
    { label: "Travel - Mexico",           url: "/page.php?sid=travel&code=MX" },
    { label: "Travel - South Africa",     url: "/page.php?sid=travel&code=SA" },
    { label: "Travel - Switzerland",      url: "/page.php?sid=travel&code=SW" },
    { label: "Travel - UK",               url: "/page.php?sid=travel&code=UK" },
    // Hospital / Jail
    { label: "Hospital",                  url: "/hospitalview.php" },
    { label: "Jail",                      url: "/jailview.php" },
    { label: "Jail - Bail",               url: "/jailview.php?step=bail" },
    { label: "Jail - Bust",               url: "/jailview.php?step=bust" },
    // Social
    { label: "Friends List",              url: "/page.php?sid=list&type=friends" },
    { label: "Enemies List",              url: "/page.php?sid=list&type=enemies" },
    { label: "Targets List",              url: "/page.php?sid=list&type=targets" },
    { label: "Messages",                  url: "/messages.php" },
    { label: "Message Inbox",             url: "/messages.php?step=inbox" },
    { label: "Message Outbox",            url: "/messages.php?step=outbox" },
    { label: "Message Inc",               url: "/messageinc.php" },
    { label: "Fans",                      url: "/fans.php" },
    { label: "Personals",                 url: "/personals.php" },
    { label: "Attack Log",                url: "/page.php?sid=attackLog" },
    { label: "Merits",                    url: "/page.php?sid=merits" },
    // Forums
    { label: "Forums",                    url: "/forums.php" },
    { label: "Forums - General",          url: "/forums.php#/p=threads&f=67" },
    { label: "Forums - Announcements",    url: "/forums.php#/p=threads&f=1" },
    { label: "Forums - Help",             url: "/forums.php#/p=threads&f=8" },
    { label: "Forums - Market",           url: "/forums.php#/p=threads&f=44" },
    { label: "Forums - Trade",            url: "/forums.php#/p=threads&f=9" },
    { label: "Forums - Questions",        url: "/forums.php#/p=threads&f=7" },
    // Newspaper / media
    { label: "Newspaper",                 url: "/newspaper.php" },
    { label: "Comics",                    url: "/comics.php" },
    { label: "Archives",                  url: "/archives.php" },
    // Staff / Info
    { label: "Rules",                     url: "/rules.php" },
    { label: "Staff",                     url: "/staff.php" },
    { label: "Credits",                   url: "/credits.php" },
    { label: "Committee",                 url: "/committee.php" },
    { label: "Calendar",                  url: "/calendar.php" },
    { label: "Competition",               url: "/competition.php" },
    { label: "Church",                    url: "/church.php" },
    { label: "Blacklist",                 url: "/blacklist.php" },
    { label: "Christmas Town",            url: "/christmas_town.php" },
    // HOF pages
    { label: "HOF - Rank",                url: "/page.php?sid=hof&type=rank" },
    { label: "HOF - Money",               url: "/page.php?sid=hof&type=money" },
    { label: "HOF - Crimes",              url: "/page.php?sid=hof&type=crimes" },
    { label: "HOF - Busts",               url: "/page.php?sid=hof&type=busts" },
    { label: "HOF - Hospital",            url: "/page.php?sid=hof&type=hospital" },
    { label: "HOF - Jail",                url: "/page.php?sid=hof&type=jail" },
    { label: "HOF - Defense",             url: "/page.php?sid=hof&type=defense" },
    { label: "HOF - Hunting",             url: "/page.php?sid=hof&type=hunting" },
    { label: "HOF - Racing",              url: "/page.php?sid=hof&type=racing" },
    { label: "HOF - Gambling",            url: "/page.php?sid=hof&type=gambling" },
    { label: "HOF - Travel",              url: "/page.php?sid=hof&type=travel" },
    { label: "HOF - Forum Posts",         url: "/page.php?sid=hof&type=forumposts" },
    { label: "HOF - Revives",             url: "/page.php?sid=hof&type=revives" },
    { label: "HOF - Attacks",             url: "/page.php?sid=hof&type=attacks" },
    { label: "HOF - Networth",            url: "/page.php?sid=hof&type=networth" },
    // Preferences sub-tabs
    { label: "Preferences - Account",     url: "/preferences.php#tab=account" },
    { label: "Preferences - Notifs",      url: "/preferences.php#tab=notifications" },
    { label: "Preferences - API",         url: "/preferences.php#tab=api" },
    { label: "Preferences - Display",     url: "/preferences.php#tab=display" },
    // Personal Stats sub-pages
    { label: "Stats - Misc",              url: "/personalstats.php?stats=misc" },
    { label: "Stats - Criminal",          url: "/personalstats.php?stats=criminal" },
    { label: "Stats - Trading",           url: "/personalstats.php?stats=trading" },
    { label: "Stats - Combat",            url: "/personalstats.php?stats=combat" },
    { label: "Stats - Travel",            url: "/personalstats.php?stats=travel" },
    { label: "Stats - Racing",            url: "/personalstats.php?stats=racing" },
    { label: "Stats - Casino",            url: "/personalstats.php?stats=casino" },
    // Loader pages
    { label: "Loader - Daily Gifts",      url: "/loader.php?sid=dailyGifts" },
    { label: "Loader - Bazaar",           url: "/loader.php?sid=bazaar" },
    { label: "Loader - Bounties",         url: "/loader.php?sid=bounties" },
    { label: "Loader - Events",           url: "/loader.php?sid=events" },
    { label: "Loader - Messages",         url: "/loader.php?sid=messages" },
    { label: "Loader - Stocks",           url: "/loader.php?sid=stocks" },
    { label: "Loader - Crimes",           url: "/loader.php?sid=crimes" },
    { label: "Loader - Hospital",         url: "/loader.php?sid=hospital" },
    { label: "Loader - Jail",             url: "/loader.php?sid=jail" },
    { label: "Loader - Items",            url: "/loader.php?sid=items" },
    { label: "Loader - Travel",           url: "/loader.php?sid=travel" },
    { label: "Loader - Auction",          url: "/loader.php?sid=auction" },
    { label: "Loader - Points Market",    url: "/loader.php?sid=points" },
    { label: "Loader - Education",        url: "/loader.php?sid=education" },
    { label: "Loader - Gym",              url: "/loader.php?sid=gym" },
    { label: "Loader - Forum",            url: "/loader.php?sid=forum" },
    { label: "Loader - Companies",        url: "/loader.php?sid=companies" },
    { label: "Loader - Jobs",             url: "/loader.php?sid=jobs" },
    { label: "Loader - Trade",            url: "/loader.php?sid=trade" },
    { label: "Loader - Newspaper",        url: "/loader.php?sid=newspaper" },
    { label: "Loader - Revive",           url: "/loader.php?sid=revive" },
    { label: "Loader - Donate",           url: "/loader.php?sid=donate" },
    { label: "Loader - Hall of Fame",     url: "/loader.php?sid=hof" },
    { label: "Loader - Museum",           url: "/loader.php?sid=museum" },
    { label: "Loader - Awards",           url: "/loader.php?sid=awards" },
    { label: "Loader - Merits",           url: "/loader.php?sid=merits" },
    { label: "Loader - Achievements",     url: "/loader.php?sid=achievements" },
    { label: "Loader - Display Case",     url: "/loader.php?sid=displaycase" },
    { label: "Loader - Keepsakes",        url: "/loader.php?sid=keepsakes" },
    { label: "Loader - Church",           url: "/loader.php?sid=church" },
    { label: "Loader - Hunting",          url: "/loader.php?sid=hunting" },
    { label: "Loader - Rehab",            url: "/loader.php?sid=rehab" },
    { label: "Loader - Property",         url: "/loader.php?sid=properties" },
    { label: "Loader - Estate",           url: "/loader.php?sid=estateagents" },
    { label: "Loader - Casino",           url: "/loader.php?sid=casino" },
    { label: "Loader - Lottery",          url: "/loader.php?sid=lottery" },
    { label: "Loader - Bookie",           url: "/loader.php?sid=bookie" },
    { label: "Loader - Dump",             url: "/loader.php?sid=dump" },
    { label: "Loader - Bank",             url: "/loader.php?sid=bank" },
    { label: "Loader - Loan",             url: "/loader.php?sid=loan" },
    { label: "Loader - Blackjack",        url: "/loader.php?sid=blackjack" },
    { label: "Loader - Slots",            url: "/loader.php?sid=slots" },
    { label: "Loader - Roulette",         url: "/loader.php?sid=roulette" },
    { label: "Loader - Keno",             url: "/loader.php?sid=keno" },
    { label: "Loader - Craps",            url: "/loader.php?sid=craps" },
    { label: "Loader - High/Low",         url: "/loader.php?sid=highlow" },
    { label: "Loader - Hold'em",          url: "/loader.php?sid=holdem" },
    { label: "Loader - Spin Wheel",       url: "/loader.php?sid=spinTheWheel" },
    { label: "Loader - Russian Roulette", url: "/loader.php?sid=russianRoulette" },
    { label: "Loader - Personalstats",    url: "/loader.php?sid=personalstats" },
    { label: "Loader - Faction",          url: "/loader.php?sid=faction" },
    { label: "Loader - Temp Items",       url: "/loader.php?sid=temporaryItems" },
];

// ─── Egg Hunt Tool ────────────────────────────────────────────────────────────

const EggHuntTool = {
    STORAGE_KEY: 'sidekick_holiday_eggHunt',
    PANEL_ID: 'sk-egg-panel',
    MINI_ID: 'sk-egg-mini',
    STYLES_ID: 'sk-egg-styles',
    OVERLAY_ID: 'sk-egg-overlay',

    state: {
        idx: 0, panelX: null, panelY: null,
        collapsed: false, hidden: false,
        eggsFound: 0, visited: [],
    },

    panel: null, miniBtn: null,
    _overlay: null, _eggObserver: null, _navBlocker: null,
    _progressFill: null, _visitedLabel: null, _eggCountLabel: null,

    // ─── State ───────────────────────────────────────────────────────────────

    async loadState() {
        try {
            const d = await window.SidekickModules.Core.ChromeStorage.get(this.STORAGE_KEY);
            if (d) Object.assign(this.state, d);
        } catch { }
    },

    async saveState() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, { ...this.state });
        } catch { }
    },

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    async init() {
        if (document.getElementById(this.PANEL_ID)) return;
        this._ensureStyles();
        await this.loadState();
        this._buildPanel();
        this._setupEggDetection();
        this._bindKeyboard();
    },

    destroy() {
        document.getElementById(this.PANEL_ID)?.remove();
        document.getElementById(this.MINI_ID)?.remove();
        document.getElementById(this.STYLES_ID)?.remove();
        this._removeEggOverlay(false);
        if (this._eggObserver) { this._eggObserver.disconnect(); this._eggObserver = null; }
        this.panel = null; this.miniBtn = null;
    },

    // ─── Styles ──────────────────────────────────────────────────────────────

    _ensureStyles() {
        if (document.getElementById(this.STYLES_ID)) return;
        const s = document.createElement('style');
        s.id = this.STYLES_ID;
        s.textContent = `
            #sk-egg-panel, #sk-egg-panel * { box-sizing: border-box; font-family: Arial, sans-serif; }

            #sk-egg-panel {
                position: fixed; z-index: 2147483640;
                width: 230px; background: #1a1a1a;
                border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
                overflow: hidden; box-shadow: 0 6px 28px rgba(0,0,0,0.6);
                user-select: none;
            }

            #sk-egg-header {
                display: flex; align-items: center; gap: 6px;
                padding: 10px 10px 10px 13px;
                background: #242424; border-bottom: 1px solid rgba(255,255,255,0.08);
                cursor: grab;
            }
            #sk-egg-header:active { cursor: grabbing; }
            #sk-egg-title { flex: 1; font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.04em; }

            .sk-egg-hbtn {
                width: 20px; height: 20px; border: none;
                background: rgba(255,255,255,0.07); border-radius: 4px;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                color: rgba(255,255,255,0.45); font-size: 11px; flex-shrink: 0; padding: 0;
                transition: background 0.15s, color 0.15s;
            }
            .sk-egg-hbtn:hover { background: rgba(102,187,106,0.2); color: #66BB6A; }

            #sk-egg-body {
                max-height: 200px; overflow: hidden;
                transition: max-height 0.22s ease, opacity 0.18s ease;
                opacity: 1;
            }
            #sk-egg-panel.sk-collapsed #sk-egg-body { max-height: 0; opacity: 0; }

            #sk-egg-stats {
                padding: 12px 13px 6px;
            }
            #sk-egg-track {
                height: 3px; background: rgba(255,255,255,0.08);
                border-radius: 2px; overflow: hidden; margin-bottom: 9px;
            }
            #sk-egg-fill {
                height: 100%; border-radius: 2px;
                background: linear-gradient(90deg, #66BB6A, #43A047);
                transition: width 0.4s ease;
            }
            .sk-egg-stat {
                font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;
            }
            .sk-egg-stat span { color: #66BB6A; font-weight: 700; }

            #sk-egg-controls {
                display: flex; gap: 6px; padding: 8px 10px 10px;
            }
            .sk-egg-btn {
                border: none; border-radius: 7px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-weight: 700; transition: filter 0.15s, transform 0.1s;
            }
            .sk-egg-btn:active { transform: scale(0.93); }
            .sk-egg-prev {
                width: 32px; height: 32px; flex-shrink: 0;
                background: rgba(255,255,255,0.07);
                color: rgba(255,255,255,0.55); font-size: 13px;
            }
            .sk-egg-prev:hover { background: rgba(255,255,255,0.13); color: #fff; }
            .sk-egg-next {
                flex: 1; height: 32px;
                background: linear-gradient(135deg, #66BB6A, #43A047);
                color: #fff; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
                box-shadow: 0 2px 10px rgba(66,175,80,0.25);
            }
            .sk-egg-next:hover { filter: brightness(1.1); }

            /* Mini restore button */
            #sk-egg-mini {
                position: fixed; width: 38px; height: 38px;
                background: #1a1a1a; border: 1px solid rgba(102,187,106,0.45);
                border-radius: 50%; cursor: pointer; z-index: 2147483640;
                display: flex; align-items: center; justify-content: center;
                font-size: 18px; box-shadow: 0 3px 12px rgba(0,0,0,0.5);
                transition: transform 0.2s, box-shadow 0.2s; touch-action: none;
            }
            #sk-egg-mini:hover { transform: scale(1.1); box-shadow: 0 4px 16px rgba(102,187,106,0.4); }

            /* ── Egg Overlay ── */
            #sk-egg-overlay {
                position: fixed; inset: 0; z-index: 2147483641;
                background: rgba(0,0,0,0.90);
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
            }

            #sk-egg-overlay-title {
                font-size: clamp(24px, 4.5vw, 40px); font-weight: 900;
                color: #66BB6A; text-align: center; letter-spacing: 0.06em;
                text-shadow: 0 0 30px rgba(102,187,106,0.5);
                animation: sk-ov-pulse 1.4s ease-in-out infinite;
                margin-bottom: 24px; font-family: Arial, sans-serif;
            }
            @keyframes sk-ov-pulse {
                0%,100% { transform: scale(1); text-shadow: 0 0 30px rgba(102,187,106,0.5); }
                50%      { transform: scale(1.04); text-shadow: 0 0 55px rgba(102,187,106,0.8); }
            }

            #sk-egg-wrap {
                width: min(68vmin, 540px); height: min(68vmin, 540px);
                border-radius: 50%;
                box-shadow: 0 0 0 3px rgba(102,187,106,0.55), 0 0 70px rgba(102,187,106,0.35);
                animation: sk-egg-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
                overflow: hidden; display: flex; align-items: center; justify-content: center;
                cursor: pointer;
            }
            @keyframes sk-egg-pop {
                from { transform: scale(0.2) rotate(-10deg); opacity: 0; }
                to   { transform: scale(1) rotate(0deg); opacity: 1; }
            }

            #sk-egg-wrap button {
                width: 100% !important; height: 100% !important;
                background: transparent !important; border: none !important;
                cursor: pointer !important;
                display: flex !important; align-items: center !important; justify-content: center !important;
                padding: 0 !important;
            }
            #sk-egg-wrap button img,
            #sk-egg-wrap button > *:first-child {
                width: 100% !important; height: 100% !important; object-fit: contain !important;
            }

            #sk-egg-overlay-sub {
                margin-top: 18px; font-size: 14px; color: rgba(255,255,255,0.5);
                font-family: Arial, sans-serif; text-align: center;
            }

            #sk-egg-overlay-skip {
                margin-top: 22px; padding: 7px 18px;
                background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
                color: rgba(255,255,255,0.4); border-radius: 6px; cursor: pointer;
                font-size: 11px; font-family: Arial, sans-serif; transition: all 0.2s;
            }
            #sk-egg-overlay-skip:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); }

            #sk-egg-overlay-collected {
                font-size: clamp(20px,3.5vw,32px); font-weight: 900; color: #66BB6A;
                font-family: Arial, sans-serif; text-align: center;
                animation: sk-collected-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
            }
            @keyframes sk-collected-pop {
                from { transform: scale(0.5); opacity: 0; }
                to   { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(s);
    },

    // ─── Panel ───────────────────────────────────────────────────────────────

    _buildPanel() {
        const W = 230;
        this.panel = document.createElement('div');
        this.panel.id = this.PANEL_ID;
        if (this.state.collapsed) this.panel.classList.add('sk-collapsed');
        const px = Math.max(0, Math.min(this.state.panelX ?? (window.innerWidth - W - 12), window.innerWidth - W));
        const py = Math.max(0, Math.min(this.state.panelY ?? 16, window.innerHeight - 120));
        this.panel.style.left = px + 'px';
        this.panel.style.top = py + 'px';

        // Header
        const header = document.createElement('div');
        header.id = 'sk-egg-header';
        const title = document.createElement('div');
        title.id = 'sk-egg-title';
        title.textContent = '🥚 Egg Hunt';

        const resetBtn = this._hbtn('↺', 'Reset all progress');
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Reset all egg hunt progress? This clears visited pages and egg count.')) {
                this.state.visited = []; this.state.idx = 0; this.state.eggsFound = 0;
                this.saveState(); this._updateUI();
            }
        });
        const collapseBtn = this._hbtn(this.state.collapsed ? '▲' : '▼', 'Collapse');
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.state.collapsed = !this.state.collapsed;
            this.panel.classList.toggle('sk-collapsed', this.state.collapsed);
            collapseBtn.textContent = this.state.collapsed ? '▲' : '▼';
            this.saveState();
        });
        const hideBtn = this._hbtn('✕', 'Minimise to button');
        hideBtn.addEventListener('click', (e) => { e.stopPropagation(); this._showMini(); });
        header.append(title, resetBtn, collapseBtn, hideBtn);

        // Body
        const body = document.createElement('div');
        body.id = 'sk-egg-body';

        const stats = document.createElement('div');
        stats.id = 'sk-egg-stats';
        const track = document.createElement('div'); track.id = 'sk-egg-track';
        this._progressFill = document.createElement('div'); this._progressFill.id = 'sk-egg-fill';
        track.appendChild(this._progressFill);
        this._visitedLabel = document.createElement('div'); this._visitedLabel.className = 'sk-egg-stat';
        this._eggCountLabel = document.createElement('div'); this._eggCountLabel.className = 'sk-egg-stat';
        stats.append(track, this._visitedLabel, this._eggCountLabel);

        const controls = document.createElement('div'); controls.id = 'sk-egg-controls';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'sk-egg-btn sk-egg-prev'; prevBtn.textContent = '◀'; prevBtn.title = 'Previous page';
        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this._navigateDelta(-1); });
        const nextBtn = document.createElement('button');
        nextBtn.className = 'sk-egg-btn sk-egg-next'; nextBtn.textContent = 'Next Page ▶';
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this._navigateDelta(1); });
        controls.append(prevBtn, nextBtn);

        body.append(stats, controls);
        this.panel.append(header, body);
        document.body.appendChild(this.panel);
        this._makeDraggable(header, this.panel);
        this._updateUI();
    },

    _hbtn(txt, title) {
        const b = document.createElement('button');
        b.className = 'sk-egg-hbtn'; b.textContent = txt; b.title = title;
        return b;
    },

    _updateUI() {
        const total = EGG_HUNT_PAGES.length;
        const visited = (this.state.visited || []).length;
        const pct = Math.min(100, (visited / total * 100)).toFixed(1);
        if (this._progressFill) this._progressFill.style.width = pct + '%';
        if (this._visitedLabel) this._visitedLabel.innerHTML = `Pages visited: <span>${visited} / ${total}</span>`;
        if (this._eggCountLabel) this._eggCountLabel.innerHTML = `Eggs collected: <span>${this.state.eggsFound}</span> 🥚`;
    },

    // ─── Navigation ──────────────────────────────────────────────────────────

    _navigateDelta(d) {
        let next = this.state.idx + d;
        if (next >= EGG_HUNT_PAGES.length) next = 0;
        if (next < 0) next = EGG_HUNT_PAGES.length - 1;
        this._navigateTo(next);
    },

    _navigateTo(idx) {
        this._unblockNavigation(); // always allow panel-initiated navigation
        this.state.idx = idx;
        if (!this.state.visited) this.state.visited = [];
        if (!this.state.visited.includes(idx)) this.state.visited.push(idx);
        this.saveState();
        window.location.href = 'https://www.torn.com' + EGG_HUNT_PAGES[idx].url;
    },

    // ─── Mini button ─────────────────────────────────────────────────────────

    _showMini() {
        if (this.panel) this.panel.style.display = 'none';
        if (!this.miniBtn) {
            this.miniBtn = document.createElement('button');
            this.miniBtn.id = this.MINI_ID;
            this.miniBtn.textContent = '🥚';
            this.miniBtn.title = 'Show Egg Hunt panel';
            document.body.appendChild(this.miniBtn);
            this._makeDraggable(this.miniBtn, this.miniBtn, true);
        }
        const px = Math.max(0, Math.min(this.state.pillX ?? (window.innerWidth - 50), window.innerWidth - 38));
        const py = Math.max(0, Math.min(this.state.pillY ?? (window.innerHeight - 85), window.innerHeight - 38));
        this.miniBtn.style.left = px + 'px';
        this.miniBtn.style.top = py + 'px';
        this.miniBtn.style.display = 'flex';
    },

    // ─── Egg Detection ───────────────────────────────────────────────────────

    _setupEggDetection() {
        this._checkForEggRoot();
        this._eggObserver = new MutationObserver(() => this._checkForEggRoot());
        this._eggObserver.observe(document.documentElement, { childList: true, subtree: true });
    },

    _checkForEggRoot() {
        const root = document.querySelector('#easter-egg-hunt-root');
        if (!root || root.dataset.skHandled) return;
        root.dataset.skHandled = '1';
        this._waitForEggButton(root).then(btn => this._showEggOverlay(btn)).catch(() => { });
    },

    _waitForEggButton(root) {
        return new Promise((resolve, reject) => {
            const deadline = setTimeout(() => { obs.disconnect(); reject(); }, 12000);
            const check = () => {
                const b = root.querySelector('button');
                if (b) { clearTimeout(deadline); obs.disconnect(); resolve(b); }
            };
            const obs = new MutationObserver(check);
            obs.observe(root, { childList: true, subtree: true });
            check();
        });
    },

    // ─── Egg Overlay ─────────────────────────────────────────────────────────

    _showEggOverlay(btn) {
        if (document.getElementById(this.OVERLAY_ID)) return;
        this._blockNavigation();

        // Store original DOM position so we can restore on skip
        const origParent = btn.parentElement;
        const origSibling = btn.nextSibling;

        const overlay = document.createElement('div');
        overlay.id = this.OVERLAY_ID;
        this._overlay = overlay;

        const titleEl = document.createElement('div');
        titleEl.id = 'sk-egg-overlay-title';
        titleEl.textContent = '🥚 EGG FOUND!';

        const wrap = document.createElement('div');
        wrap.id = 'sk-egg-wrap';

        // Reset button styles so our container controls the size
        btn.style.cssText = 'width:100%;height:100%;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;';
        wrap.appendChild(btn);

        const sub = document.createElement('div');
        sub.id = 'sk-egg-overlay-sub';
        sub.textContent = 'Click the egg to collect it!';

        const skipBtn = document.createElement('button');
        skipBtn.id = 'sk-egg-overlay-skip';
        skipBtn.textContent = 'Skip — I don\'t want this egg';
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Skip this egg? It will be gone.')) {
                // Restore button to original position
                if (origParent) origParent.insertBefore(btn, origSibling);
                this._removeEggOverlay(false);
            }
        });

        overlay.append(titleEl, wrap, sub, skipBtn);

        // Clicking the backdrop (not the egg) flashes the title
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                titleEl.style.color = '#fff';
                setTimeout(() => { titleEl.style.color = '#66BB6A'; }, 300);
            }
        });

        // Egg collected
        btn.addEventListener('click', () => {
            this.state.eggsFound = (this.state.eggsFound || 0) + 1;
            this._updateUI();
            this.saveState();

            // Show collected flash, then close
            wrap.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            wrap.style.transform = 'scale(1.15)';
            wrap.style.opacity = '0';
            titleEl.innerHTML = '';
            const collected = document.createElement('div');
            collected.id = 'sk-egg-overlay-collected';
            collected.textContent = '🥚 Egg Collected! +1';
            overlay.insertBefore(collected, wrap);
            sub.textContent = '';
            skipBtn.style.display = 'none';

            setTimeout(() => {
                if (origParent) origParent.insertBefore(btn, origSibling);
                this._removeEggOverlay(false);
            }, 1200);
        }, { once: true });

        document.body.appendChild(overlay);
    },

    _removeEggOverlay(restoreBtn) {
        this._overlay?.remove();
        this._overlay = null;
        this._unblockNavigation();
    },

    // ─── Navigation blocking ─────────────────────────────────────────────────

    _blockNavigation() {
        if (this._navBlocker) return;
        this._navBlocker = (e) => {
            e.preventDefault();
            e.returnValue = 'An Easter egg is waiting! Leave without collecting it?';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', this._navBlocker);
    },

    _unblockNavigation() {
        if (this._navBlocker) {
            window.removeEventListener('beforeunload', this._navBlocker);
            this._navBlocker = null;
        }
    },

    // ─── Keyboard ────────────────────────────────────────────────────────────

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this._navigateDelta(1); }
            if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); this._navigateDelta(-1); }
        });
    },

    // ─── Drag ────────────────────────────────────────────────────────────────

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
            const x = Math.max(0, Math.min(cx - ox, window.innerWidth - target.offsetWidth));
            const y = Math.max(0, Math.min(cy - oy, window.innerHeight - target.offsetHeight));
            target.style.left = x + 'px'; target.style.top = y + 'px';
            if (isPill) { this.state.pillX = x; this.state.pillY = y; }
            else { this.state.panelX = x; this.state.panelY = y; }
        };
        const end = () => {
            if (!dragging) return;
            dragging = false;
            this.saveState();
            if (isPill && !moved) {
                // Tap on mini btn — restore panel
                if (this.panel) this.panel.style.display = '';
                if (this.miniBtn) this.miniBtn.style.display = 'none';
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
    version: '2.0.0',
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
            if (data) this.eggHuntEnabled = data.eggHuntEnabled || false;
        } catch (e) { console.error('🎉 Holiday load failed:', e); }
    },

    async saveSettings() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(this.STORAGE_KEY, {
                eggHuntEnabled: this.eggHuntEnabled,
            });
        } catch (e) { console.error('🎉 Holiday save failed:', e); }
    },

    _apply() {
        if (this.eggHuntEnabled) EggHuntTool.init();
        else EggHuntTool.destroy();
    },
};

// ─── Register ─────────────────────────────────────────────────────────────────

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.Holiday = HolidayModule;
console.log('🎉 Holiday module registered');
