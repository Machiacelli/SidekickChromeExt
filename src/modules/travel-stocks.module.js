/**
 * Travel Stock & Profit Module
 * Shows abroad stock from YATA with profit calculations
 */

const TravelStocksModule = {
    name: "Travel Stocks",
    version: "1.0.0",

    state: {
        isEnabled: false,
        window: null,
        cache: {
            yata: null,
            yataFetchedMs: 0,
            avgById: {} // itemId -> { avg, tMs }
        },
        queue: [],
        inFlight: 0
    },

    settings: {
        isEnabled: true,
        country: "ALL",
        sortBy: "profit",
        sortDir: "desc",
        showOnlyProfit: false,
        limit: 200
    },

    // Constants
    COUNTRY_MAP: {
        mex: "MEXICO",
        cay: "CAYMAN ISLANDS",
        can: "CANADA",
        haw: "HAWAII",
        uni: "UNITED KINGDOM",
        arg: "ARGENTINA",
        swi: "SWITZERLAND",
        jap: "JAPAN",
        chi: "CHINA",
        uae: "UAE",
        sou: "SOUTH AFRICA"
    },

    TTL_YATA_MS: 60 * 1000,      // 1 minute
    TTL_AVG_MS: 30 * 60 * 1000,  // 30 minutes
    MAX_IN_FLIGHT: 2,
    MAX_VISIBLE_FETCH: 250,

    // Initialize module
    async init() {
        console.log('💰 Travel Stocks: Initializing...');

        try {
            const ChromeStorage = window.SidekickModules.Core.ChromeStorage;

            // Load settings
            const settings = await ChromeStorage.get('sidekick_settings') || {};
            const moduleSettings = settings['travel-stocks'] || {};

            this.settings = {
                ...this.settings,
                ...moduleSettings
            };

            // Load cache
            const cache = await ChromeStorage.get('sidekick_travelStocksCache') || {};
            this.state.cache = {
                yata: cache.yata || null,
                yataFetchedMs: cache.yataFetchedMs || 0,
                avgById: cache.avgById || {}
            };

            console.log('💰 Travel Stocks initialized');
        } catch (err) {
            console.error('💰 Error loading settings:', err);
        }

        // Inject CSS
        this.injectCSS();

        // Restore window if it was open
        await this.restoreWindowState();
    },

    // Restore window state on page load
    async restoreWindowState() {
        try {
            const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
            const windowState = await ChromeStorage.get('sidekick_travelStocksWindowState') || {};

            if (windowState.isOpen) {
                console.log('💰 Restoring Travel Stocks window');
                // Wait for sidebar to be ready
                setTimeout(() => this.createWindow(), 500);
            }
        } catch (err) {
            console.error('💰 Error restoring window state:', err);
        }
    },

    // Inject CSS styles
    injectCSS() {
        if (document.getElementById('travel-stocks-styles')) return;

        const style = document.createElement('style');
        style.id = 'travel-stocks-styles';
        style.textContent = `
            .travel-stocks-window {
                position: absolute;
                left: 10px;
                top: 10px;
                width: 700px;
                height: 500px;
                min-width: 500px;
                min-height: 350px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                z-index: 1000;
                resize: both;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            }
            .travel-stocks-window .window-header {
                background: linear-gradient(135deg, #FF9800, #F57C00);
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move !important;
                color: #fff;
                font-weight: bold;
                border-radius: 6px 6px 0 0;
                font-size: 13px;
                user-select: none;
                -webkit-user-select: none;
            }
            .travel-stocks-window .window-controls {
                display: flex;
                gap: 4px;
            }
            .travel-stocks-window .window-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                cursor: pointer;
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 3px;
                transition: all 0.2s;
            }
            .travel-stocks-window .window-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            .travel-stocks-window .window-close {
                background: #dc3545;
                width: 18px;
                height: 18px;
                padding: 0;
                border-radius: 50%;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .travel-stocks-window .window-content {
                flex: 1;
                overflow: hidden;
                background: #1f1f1f;
                color: #fff;
                display: flex;
                flex-direction: column;
            }
            .travel-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
                padding: 12px 14px;
                background: linear-gradient(135deg, rgba(30,30,30,0.95), rgba(20,20,20,0.9));
                border-bottom: 1px solid rgba(255,152,0,0.2);
            }
            .travel-controls label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: rgba(255,255,255,0.85);
                font-weight: 500;
                letter-spacing: 0.3px;
            }
            .travel-controls select {
                padding: 5px 10px;
                border-radius: 6px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.12);
                color: white;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none;
            }
            .travel-controls select:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,152,0,0.4);
            }
            .travel-controls select:focus {
                border-color: rgba(255,152,0,0.6);
                box-shadow: 0 0 0 2px rgba(255,152,0,0.1);
            }
            .travel-checkbox-label {
                cursor: pointer;
                color: rgba(255,255,255,0.85);
                font-size: 11px;
                padding: 5px 10px;
                border-radius: 6px;
                background: rgba(255,255,255,0.04 );
                border: 1px solid rgba(255,255,255,0.08);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .travel-checkbox-label:hover {
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,152,0,0.3);
            }
            .travel-refresh-btn {
                padding: 6px 14px;
                border-radius: 6px;
                background: linear-gradient(135deg, #FF9800, #F57C00);
                border: none;
                color: white;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.3px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 6px rgba(255,152,0,0.25);
            }
            .travel-refresh-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 10px rgba(255,152,0,0.35);
                background: linear-gradient(135deg, #FFA726, #F57C00);
            }
            .travel-refresh-btn:active {
                transform: translateY(0);
            }
            .travel-meta {
                margin-left: auto;
                font-size: 10px;
                color: rgba(255,255,255,0.55);
                background: rgba(0,0,0,0.3);
                padding: 4px 10px;
                border-radius: 12px;
                font-weight: 500;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .travel-table-wrap {
                overflow: auto;
                flex: 1;
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE/Edge */
            }
            .travel-table-wrap::-webkit-scrollbar {
                display: none; /* Chrome/Safari */
            }
            .travel-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
                color: #ffffff;
            }
            .travel-table thead th {
                position: sticky;
                top: 0;
                background: linear-gradient(135deg, rgba(25,25,25,0.98), rgba(15,15,15,0.95));
                padding: 8px 10px;
                text-align: left;
                border-bottom: 2px solid rgba(255,152,0,0.25);
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: rgba(255,255,255,0.75);
                z-index: 1;
            }
            .travel-table th.num,
            .travel-table td.num {
                text-align: right;
            }
            .travel-table td {
                padding: 8px 10px;
                border-bottom: 1px solid rgba(255,255,255,0.04);
                transition: all 0.15s ease;
            }
            .travel-table tbody tr:nth-child(even) {
                background: rgba(255,255,255,0.025);
            }
            .travel-table tbody tr:hover {
                background: rgba(255,152,0,0.12) !important;
                transform: scale(1.005);
            }
            .item-name {
                font-weight: 600;
                color: #ffffff;
                font-size: 11px;
            }
            .item-id {
                font-size: 9px;
                color: rgba(255,255,255,0.45);
                font-weight: 400;
            }
            .profit-positive {
                color: #4ade80;
                font-weight: 600;
            }
            .profit-positive::before {
                content: '↑ ';
                opacity: 0.7;
            }
            .profit-negative {
                color: #f87171;
                font-weight: 600;
            }
            .profit-negative::before {
                content: '↓ ';
                opacity: 0.7;
            }
            .profit-zero {
                color: #94a3b8;
                font-weight: 500;
            }
            .profit-unknown {
                color: rgba(255,255,255,0.3);
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    },

    // Enable module
    enable() {
        console.log('💰 Enabling Travel Stocks...');
        this.state.isEnabled = true;
    },

    // Disable module
    disable() {
        console.log('💰 Disabling Travel Stocks...');
        this.state.isEnabled = false;
        if (this.state.window) {
            this.state.window.remove();
            this.state.window = null;
        }
    },

    // Create and show window
    async createWindow() {
        if (this.state.window) return;

        // Load saved state
        const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
        const savedState = await ChromeStorage.get('sidekick_travelStocksWindowState') || {};

        const x = savedState.x || 10;
        const y = savedState.y || 10;

        // Cap saved dimensions to prevent oversized windows
        let width = savedState.width || 380;
        let height = savedState.height || 280;

        // Override if saved state is too large
        if (width > 400) width = 380;
        if (height > 350) height = 280;

        const win = document.createElement('div');
        win.className = 'travel-stocks-window';
        win.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            min-width: 350px;
            min-height: 250px;
            z-index: 1000;
            resize: both;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        `;

        win.innerHTML = `
            <div class="window-header" style="
                background: linear-gradient(135deg, #FF9800, #F57C00);
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                color: #fff;
                font-weight: bold;
                border-radius: 6px 6px 0 0;
                font-size: 13px;
                user-select: none;
            ">
                <span class="window-title">💰 Travel Stock & Profit</span>
                <div class="window-controls" style="display: flex; gap: 4px;">
                    <button class="window-close" style="
                        background: #dc3545;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        padding: 0;
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
            </div>
            <div class="window-content" style="
                flex: 1;
                overflow: hidden;
                background: #1f1f1f;
                color: #ffffff !important;
                display: flex;
                flex-direction: column;
            ">
                <div class="travel-controls" style="color: #ffffff;">
                    <label style="color: rgba(255,255,255,0.9);">
                        Country:
                        <select class="travel-country">
                            <option value="ALL">All Countries</option>
                        </select>
                    </label>
                    <label style="color: rgba(255,255,255,0.9);">
                        Sort:
                        <select class="travel-sortby">
                            <option value="profit">Profit</option>
                            <option value="avg">Avg Price</option>
                            <option value="cost">Cost</option>
                            <option value="qty">Stock</option>
                            <option value="country">Country</option>
                            <option value="id">Item ID</option>
                        </select>
                    </label>
                    <label style="color: rgba(255,255,255,0.9);">
                        <select class="travel-sortdir">
                            <option value="desc">↓ Desc</option>
                            <option value="asc">↑ Asc</option>
                        </select>
                    </label>
                    <label class="travel-checkbox-label" style="color: rgba(255,255,255,0.9);">
                        <input type="checkbox" class="travel-showprofit" />
                        Show Only Profit
                    </label>
                    <button class="travel-refresh-btn">Refresh</button>
                    <span class="travel-meta"></span>
                </div>
                <div class="travel-table-wrap">
                    <table class="travel-table">
                        <thead>
                            <tr>
                                <th>Country</th>
                                <th>Item</th>
                                <th class="num">Cost</th>
                                <th class="num">Avg</th>
                                <th class="num">Profit</th>
                                <th class="num">Stock</th>
                            </tr>
                        </thead>
                        <tbody class="travel-tbody">
                            <tr><td colspan="6" class="travel-loading">Click Refresh to load data</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.state.window = win;
        this.wireWindow(win);

        // Auto-load data
        setTimeout(() => this.renderTable(win, true), 100);

        // Register with WindowManager
        if (window.SidekickModules?.Core?.WindowManager) {
            window.SidekickModules.Core.WindowManager.registerWindow(win, 'travel-stocks');
        }

        // Add to sidebar content area
        const contentArea = document.getElementById('sidekick-content');
        if (contentArea) {
            contentArea.appendChild(win);
            console.log('💰 Travel Stocks window added to sidebar');
        } else {
            console.error('💰 Sidebar content area not found');
        }

        // Apply saved settings to UI
        this.applySettingsToUI(win);
    },

    // Wire event listeners
    wireWindow(win) {
        const header = win.querySelector('.window-header');

        // Click to bring to front
        win.addEventListener('mousedown', () => {
            const allWindows = document.querySelectorAll('.travel-stocks-window, .movable-stockadvisor, .movable-notepad, .movable-timer');
            let maxZ = 1000;
            allWindows.forEach(w => {
                const z = parseInt(w.style.zIndex || 1000);
                if (z > maxZ) maxZ = z;
            });
            win.style.zIndex = String(maxZ + 1);
        });

        // Make draggable
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            // Don't drag when clicking buttons
            if (e.target.classList.contains('window-btn') ||
                e.target.closest('.window-btn') ||
                e.target.classList.contains('window-close') ||
                e.target.classList.contains('window-minimize')) {
                return;
            }

            e.preventDefault();
            isDragging = true;

            const rect = win.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;

            header.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // Constrain to sidebar bounds
            const sidebar = document.getElementById('sidekick-content');
            if (sidebar) {
                const sidebarRect = sidebar.getBoundingClientRect();
                const winWidth = win.offsetWidth;
                const winHeight = win.offsetHeight;

                // Keep within bounds
                currentX = Math.max(0, Math.min(currentX, sidebarRect.width - winWidth));
                currentY = Math.max(0, Math.min(currentY, sidebarRect.height - winHeight));
            }

            win.style.left = currentX + 'px';
            win.style.top = currentY + 'px';
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            header.style.cursor = 'move';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Save position
            this.saveWindowState(win);
        };

        // Close button
        win.querySelector('.window-close').addEventListener('click', () => {
            win.remove();
            this.state.window = null;
            // Save that window is closed
            this.saveWindowState(win, false);
        });

        // Controls
        const countrySel = win.querySelector('.travel-country');
        const sortBySel = win.querySelector('.travel-sortby');
        const sortDirSel = win.querySelector('.travel-sortdir');
        const showProfitChk = win.querySelector('.travel-showprofit');
        const refreshBtn = win.querySelector('.travel-refresh-btn');

        countrySel.addEventListener('change', async (e) => {
            this.settings.country = e.target.value;
            await this.saveSettings();
            this.renderTable(win, false);
        });

        sortBySel.addEventListener('change', async (e) => {
            this.settings.sortBy = e.target.value;
            await this.saveSettings();
            this.renderTable(win, false);
        });

        sortDirSel.addEventListener('change', async (e) => {
            this.settings.sortDir = e.target.value;
            await this.saveSettings();
            this.renderTable(win, false);
        });

        showProfitChk.addEventListener('change', async (e) => {
            this.settings.showOnlyProfit = e.target.checked;
            await this.saveSettings();
            this.renderTable(win, false);
        });

        refreshBtn.addEventListener('click', () => {
            this.renderTable(win, true);
        });

        // Save size on resize
        const resizeObserver = new ResizeObserver(() => {
            this.saveWindowState(win);
        });
        resizeObserver.observe(win);
    },

    // Save window state
    async saveWindowState(win, isOpen = true) {
        try {
            const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
            const state = {
                isOpen: isOpen,
                x: parseInt(win.style.left) || 10,
                y: parseInt(win.style.top) || 10,
                width: win.offsetWidth,
                height: win.offsetHeight
            };
            await ChromeStorage.set('sidekick_travelStocksWindowState', state);
        } catch (err) {
            console.error('💰 Error saving window state:', err);
        }
    },

    // Apply settings to UI elements
    applySettingsToUI(win) {
        win.querySelector('.travel-sortby').value = this.settings.sortBy;
        win.querySelector('.travel-sortdir').value = this.settings.sortDir;
        win.querySelector('.travel-showprofit').checked = this.settings.showOnlyProfit;
    },

    // Save settings
    async saveSettings() {
        try {
            const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
            const settings = await ChromeStorage.get('sidekick_settings') || {};
            settings['travel-stocks'] = this.settings;
            await ChromeStorage.set('sidekick_settings', settings);
        } catch (err) {
            console.error('💰 Error saving settings:', err);
        }
    },

    // Save cache
    async saveCache() {
        try {
            const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
            await ChromeStorage.set('sidekick_travelStocksCache', this.state.cache);
        } catch (err) {
            console.error('💰 Error saving cache:', err);
        }
    },

    // Get cached average
    getCachedAvg(itemId) {
        const hit = this.state.cache.avgById[String(itemId)];
        if (!hit) return null;
        if ((Date.now() - hit.tMs) > this.TTL_AVG_MS) return null;
        return hit.avg;
    },

    // Set cached average
    async setCachedAvg(itemId, avg) {
        this.state.cache.avgById[String(itemId)] = { avg, tMs: Date.now() };
        await this.saveCache();
    },

    // Fetch YATA export
    async fetchYATA(force = false) {
        const now = Date.now();

        if (!force && this.state.cache.yata &&
            this.state.cache.yataFetchedMs &&
            (now - this.state.cache.yataFetchedMs) < this.TTL_YATA_MS) {
            return this.state.cache.yata;
        }

        const response = await fetch('https://yata.yt/api/v1/travel/export/');
        const yata = await response.json();

        this.state.cache.yata = yata;
        this.state.cache.yataFetchedMs = now;
        await this.saveCache();

        return yata;
    },

    // Normalize YATA data
    normalizeYATA(payload) {
        const out = [];
        const rootStocks = payload?.stocks;
        if (!rootStocks) return out;

        for (const [countryKey, countryObj] of Object.entries(rootStocks)) {
            const country = this.COUNTRY_MAP[countryKey] || String(countryKey).toUpperCase();
            const updated = Number(countryObj?.update || 0);
            const items = countryObj?.stocks;
            if (!Array.isArray(items)) continue;

            for (const it of items) {
                const id = Number(it?.id);
                if (!Number.isFinite(id)) continue;
                out.push({
                    country,
                    id,
                    name: String(it?.name || ""),
                    qty: Number.isFinite(Number(it?.quantity)) ? Number(it.quantity) : 0,
                    cost: Number(it?.cost) || 0,
                    updated
                });
            }
        }
        return out;
    },

    // Fetch average price from API
    async fetchAvgPrice(itemId) {
        const cached = this.getCachedAvg(itemId);
        if (typeof cached === 'number') return cached;

        // Get API key from settings
        const ChromeStorage = window.SidekickModules.Core.ChromeStorage;
        const settings = await ChromeStorage.get('sidekick_settings') || {};
        const apiKey = settings.apiKey;

        if (!apiKey) throw new Error('API key not set');

        const url = `https://api.torn.com/v2/market/${itemId}/itemmarket?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        const avg = data?.itemmarket?.item?.average_price;
        if (typeof avg !== 'number') throw new Error('average_price missing');

        await this.setCachedAvg(itemId, avg);
        return avg;
    },

    // Throttled queue
    enqueue(task) {
        return new Promise((resolve, reject) => {
            this.state.queue.push({ task, resolve, reject });
            this.pump();
        });
    },

    async pump() {
        if (this.state.inFlight >= this.MAX_IN_FLIGHT) return;
        const next = this.state.queue.shift();
        if (!next) return;

        this.state.inFlight++;
        try {
            next.resolve(await next.task());
        } catch (e) {
            next.reject(e);
        } finally {
            this.state.inFlight--;
            setTimeout(() => this.pump(), 0);
        }
    },

    // Sort rows
    sortRows(rows, sortBy, sortDir) {
        const dir = sortDir === 'asc' ? 1 : -1;
        const keyFn = (r) => {
            switch (sortBy) {
                case 'country': return r.country;
                case 'id': return r.id;
                case 'cost': return r.cost;
                case 'qty': return r.qty;
                case 'avg': return (typeof r.avg === 'number') ? r.avg : -1;
                case 'profit': return (typeof r.profit === 'number') ? r.profit : -1;
                default: return (typeof r.profit === 'number') ? r.profit : -1;
            }
        };
        return rows.slice().sort((a, b) => {
            const ka = keyFn(a);
            const kb = keyFn(b);
            if (typeof ka === 'string' || typeof kb === 'string') {
                return String(ka).localeCompare(String(kb)) * dir;
            }
            return (Number(ka) - Number(kb)) * dir;
        });
    },

    // Format money
    fmtMoney(n) {
        return (typeof n === 'number' && Number.isFinite(n))
            ? '$' + Math.round(n).toLocaleString()
            : '…';
    },

    // Format profit
    fmtProfit(n) {
        if (typeof n !== 'number' || !Number.isFinite(n)) return '…';
        const sign = n >= 0 ? '+$' : '-$';
        return sign + Math.abs(Math.round(n)).toLocaleString();
    },

    // Profit CSS class
    profitClass(profit) {
        if (typeof profit !== 'number' || !Number.isFinite(profit)) return 'profit-unknown';
        if (profit > 0) return 'profit-positive';
        if (profit < 0) return 'profit-negative';
        return 'profit-zero';
    },

    // Render table
    async renderTable(win, forceYata = false) {
        const tbody = win.querySelector('.travel-tbody');
        const countrySel = win.querySelector('.travel-country');
        const meta = win.querySelector('.travel-meta');

        tbody.innerHTML = '<tr><td colspan="6" class="travel-loading">Loading YATA data…</td></tr>';
        meta.textContent = 'Fetching...';

        try {
            const yata = await this.fetchYATA(forceYata);
            let rows = this.normalizeYATA(yata);

            // Decorate with cached avg/profit
            rows = rows.map(r => {
                const avg = this.getCachedAvg(r.id);
                const profit = (typeof avg === 'number') ? (avg - r.cost) : null;
                return { ...r, avg, profit };
            });

            // Populate country dropdown
            const countries = [...new Set(rows.map(r => r.country))].sort();
            if (countrySel.options.length === 1) {
                for (const c of countries) {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c;
                    countrySel.appendChild(opt);
                }
                countrySel.value = this.settings.country;
            }

            // Filter
            let filtered = rows;
            if (this.settings.country !== 'ALL') {
                filtered = filtered.filter(x => x.country === this.settings.country);
            }
            if (this.settings.showOnlyProfit) {
                filtered = filtered.filter(x => x.profit && x.profit > 0);
            }

            // Limit & sort
            filtered = filtered.slice(0, this.settings.limit);
            filtered = this.sortRows(filtered, this.settings.sortBy, this.settings.sortDir);

            tbody.innerHTML = '';

            if (!filtered.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="travel-loading">No items match filters</td></tr>';
                meta.textContent = 'Rows: 0';
                return;
            }

            for (const r of filtered) {
                const tr = document.createElement('tr');
                tr.dataset.itemId = String(r.id);
                tr.style.color = '#ffffff';
                tr.innerHTML = `
                    <td style="color: #ffffff;">${this.esc(r.country)}</td>
                    <td style="color: #ffffff;">
                        <div class="item-name" style="color: #ffffff;">${this.esc(r.name || 'Unknown')}</div>
                        <div class="item-id" style="color: rgba(255,255,255,0.5);">#${r.id}</div>
                    </td>
                    <td class="num" style="color: #ffffff;">${this.fmtMoney(r.cost)}</td>
                    <td class="num" style="color: #ffffff;">${(typeof r.avg === 'number') ? this.fmtMoney(r.avg) : '…'}</td>
                    <td class="num ${this.profitClass(r.profit)}" data-profit="${r.profit || ''}">
                        ${(typeof r.profit === 'number') ? this.fmtProfit(r.profit) : '…'}
                    </td>
                    <td class="num" style="color: #ffffff;">${Math.trunc(r.qty).toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            }

            meta.textContent = `Rows: ${filtered.length} • Queue: ${this.state.queue.length} • In-flight: ${this.state.inFlight}`;

            // Fetch averages if sorting by profit/avg
            if (this.settings.sortBy === 'profit' || this.settings.sortBy === 'avg') {
                await this.fetchAverages(win, filtered);
            }

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="travel-loading">Error: ${err.message}</td></tr>`;
            meta.textContent = 'Error loading data';
            console.error('💰 Render error:', err);
        }
    },

    // Fetch averages for visible items
    async fetchAverages(win, rows) {
        const toFetch = rows
            .slice(0, this.MAX_VISIBLE_FETCH)
            .filter(r => typeof this.getCachedAvg(r.id) !== 'number')
            .map(r => r.id);

        if (!toFetch.length) return;

        const meta = win.querySelector('.travel-meta');
        let completed = 0;

        for (const itemId of toFetch) {
            this.enqueue(async () => {
                const avg = await this.fetchAvgPrice(itemId);
                return { itemId, avg };
            })
                .then(({ itemId, avg }) => {
                    completed++;

                    const rowEl = win.querySelector(`tr[data-item-id="${itemId}"]`);
                    if (!rowEl) return;

                    const tds = rowEl.querySelectorAll('td');
                    const cost = Number((tds[2]?.textContent || '').replace(/[^0-9]/g, '')) || 0;
                    const profit = avg - cost;

                    if (tds[3]) tds[3].textContent = this.fmtMoney(avg);
                    if (tds[4]) {
                        tds[4].textContent = this.fmtProfit(profit);
                        tds[4].className = 'num ' + this.profitClass(profit);
                        tds[4].dataset.profit = String(profit);
                    }

                    meta.textContent = `Loading avg prices… ${completed}/${toFetch.length} • Queue: ${this.state.queue.length}`;
                })
                .catch(() => {
                    completed++;
                    meta.textContent = `Loading avg prices… ${completed}/${toFetch.length} (some errors)`;
                });
        }
    },

    // HTML escape
    esc(s) {
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
};

// Register module
if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}
window.SidekickModules.TravelStocks = TravelStocksModule;

console.log('💰 Travel Stocks module registered');
