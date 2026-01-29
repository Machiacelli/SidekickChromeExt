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
    },

    // Inject CSS styles
    injectCSS() {
        if (document.getElementById('travel-stocks-styles')) return;

        const style = document.createElement('style');
        style.id = 'travel-stocks-styles';
        style.textContent = `
            .travel-stocks-window {
                min-width: 600px;
                min-height: 400px;
            }
            .travel-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: center;
                padding: 10px;
                background: rgba(0,0,0,0.3);
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .travel-controls label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
            }
            .travel-controls select {
                padding: 4px 8px;
                border-radius: 4px;
                background: rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.2);
                color: white;
            }
            .travel-checkbox-label {
                cursor: pointer;
            }
            .travel-refresh-btn {
                padding: 5px 12px;
                border-radius: 4px;
                background: rgba(76, 175, 80, 0.3);
                border: 1px solid rgba(76, 175, 80, 0.5);
                color: white;
                cursor: pointer;
                font-size: 12px;
            }
            .travel-refresh-btn:hover {
                background: rgba(76, 175, 80, 0.5);
            }
            .travel-meta {
                margin-left: auto;
                font-size: 11px;
                opacity: 0.8;
            }
            .travel-table-wrap {
                overflow: auto;
                flex: 1;
            }
            .travel-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            .travel-table thead th {
                position: sticky;
                top: 0;
                background: rgba(0,0,0,0.9);
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                font-weight: bold;
                z-index: 1;
            }
            .travel-table th.num,
            .travel-table td.num {
                text-align: right;
            }
            .travel-table td {
                padding: 6px 8px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .travel-table tbody tr:hover {
                background: rgba(255,255,255,0.05);
            }
            .travel-loading {
                padding: 20px;
                text-align: center;
                opacity: 0.7;
            }
            .item-name {
                font-weight: bold;
            }
            .item-id {
                font-size: 10px;
                opacity: 0.6;
            }
            .profit-positive {
                color: #4caf50;
                font-weight: bold;
            }
            .profit-negative {
                color: #f44336;
                font-weight: bold;
            }
            .profit-zero {
                color: rgba(255,255,255,0.6);
            }
            .profit-unknown {
                color: rgba(255,255,255,0.4);
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

        const win = document.createElement('div');
        win.className = 'sidekick-window travel-stocks-window';
        win.innerHTML = `
            <div class="window-header">
                <span class="window-title">💰 Travel Stock & Profit</span>
                <div class="window-controls">
                    <button class="window-btn window-minimize"><</button>
                    <button class="window-btn window-close">×</button>
                </div>
            </div>
            <div class="window-content travel-stocks-content">
                <div class="travel-controls">
                    <label>
                        Country:
                        <select class="travel-country">
                            <option value="ALL">All Countries</option>
                        </select>
                    </label>
                    <label>
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
                    <label>
                        <select class="travel-sortdir">
                            <option value="desc">↓ Desc</option>
                            <option value="asc">↑ Asc</option>
                        </select>
                    </label>
                    <label class="travel-checkbox-label">
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

        // Register with WindowManager
        if (window.SidekickModules?.Core?.WindowManager) {
            window.SidekickModules.Core.WindowManager.registerWindow(win, 'travel-stocks');
        }

        // Add to sidebar
        const sidebar = document.querySelector('#sidekick-sidebar .content-area');
        if (sidebar) {
            sidebar.appendChild(win);
        }

        // Apply saved settings to UI
        this.applySettingsToUI(win);
    },

    // Wire event listeners
    wireWindow(win) {
        // Close button
        win.querySelector('.window-close').addEventListener('click', () => {
            win.remove();
            this.state.window = null;
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
                tr.innerHTML = `
                    <td>${this.esc(r.country)}</td>
                    <td>
                        <div class="item-name">${this.esc(r.name || 'Unknown')}</div>
                        <div class="item-id">#${r.id}</div>
                    </td>
                    <td class="num">${this.fmtMoney(r.cost)}</td>
                    <td class="num">${(typeof r.avg === 'number') ? this.fmtMoney(r.avg) : '…'}</td>
                    <td class="num ${this.profitClass(r.profit)}" data-profit="${r.profit || ''}">
                        ${(typeof r.profit === 'number') ? this.fmtProfit(r.profit) : '…'}
                    </td>
                    <td class="num">${Math.trunc(r.qty).toLocaleString()}</td>
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
