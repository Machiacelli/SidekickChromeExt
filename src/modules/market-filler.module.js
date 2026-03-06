// Item Market Filler Module
// Adds a "Fill" button to item market listings that auto-fills
// the lowest market price minus $1 (configurable), fills max quantity,
// and shows a popup of the top 5 current listings.
// Adapted from Silmaril's Torn Market Filler for the Sidekick Chrome extension.

const MarketFillerModule = (() => {
    const MARKET_TAX = 0.05;
    const SETTINGS_KEY = 'market-filler'; // Must match the data-module id in settings

    let priceDelta = '-1';
    let marketSlotOffset = 0;
    let showPopup = true;
    let recentFilledInputs = null;
    let isDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let pageObserver = null;

    // -----------------------------------------------------------------------
    // Settings
    // -----------------------------------------------------------------------
    async function loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_market_filler_prefs');
            if (data) {
                priceDelta = data.priceDelta ?? '-1';
                marketSlotOffset = data.marketSlotOffset ?? 0;
                showPopup = data.showPopup ?? true;
            }
        } catch (e) { console.error('[MarketFiller] loadSettings error:', e); }
    }

    async function savePrefs() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_market_filler_prefs', { priceDelta, marketSlotOffset, showPopup });
        } catch (e) { console.error('[MarketFiller] savePrefs error:', e); }
    }

    // -----------------------------------------------------------------------
    // API: fetch item market listings
    // -----------------------------------------------------------------------
    async function fetchMarketListings(itemId) {
        const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
        if (!apiKey) return null;

        try {
            const url = `https://api.torn.com/v2/market?id=${itemId}&selections=itemMarket&key=${apiKey}&comment=SidekickMarketFiller`;
            const resp = await fetch(url);
            const json = await resp.json();
            if (json.error) { console.warn('[MarketFiller] API error:', json.error); return null; }
            return json.itemmarket?.listings || json.data?.itemmarket?.listings || null;
        } catch (e) {
            console.error('[MarketFiller] fetch error:', e);
            return null;
        }
    }

    // -----------------------------------------------------------------------
    // Price helpers
    // -----------------------------------------------------------------------
    function calcFillPrice(listings) {
        if (!listings || listings.length === 0) return null;
        const ref = listings[Math.min(marketSlotOffset, listings.length - 1)];
        return applyDelta(ref.price, priceDelta);
    }

    function applyDelta(num, formula) {
        const m = String(formula).match(/^([+-]?)(\d+(?:\.\d+)?)(%)?$/);
        if (!m) return num;
        const sign = m[1] === '-' ? -1 : 1;
        const val = parseFloat(m[2]);
        const adj = m[3] ? (num * val / 100) : val;
        return Math.round(num + sign * adj);
    }

    function fmt(n) { return new Intl.NumberFormat('en-US').format(n); }

    // -----------------------------------------------------------------------
    // Popup
    // -----------------------------------------------------------------------
    function ensurePopup() {
        if (document.getElementById('sk-mf-popup')) return;
        const el = document.createElement('div');
        el.id = 'sk-mf-popup';
        el.style.cssText = `display:none;position:fixed;z-index:99999;
            background:#1e2430;border:1px solid #444;border-radius:8px;
            padding:10px 14px;font-size:13px;color:#ccc;
            box-shadow:0 4px 20px rgba(0,0,0,0.7);min-width:220px;
            pointer-events:auto;top:80px;left:200px;`;
        el.innerHTML = `
            <div id="sk-mf-drag" style="cursor:move;font-size:11px;color:#666;border-bottom:1px solid #333;padding-bottom:6px;margin-bottom:8px;user-select:none;">
                &#9776; Item Market Filler
                <span id="sk-mf-close" style="float:right;cursor:pointer;color:#888;font-size:16px;line-height:1;">&times;</span>
            </div>
            <div id="sk-mf-body" style="min-height:30px;"></div>
            <div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;">
                Offset: <b id="sk-mf-delta-lbl"></b> &nbsp;|&nbsp; Slot: <b id="sk-mf-slot-lbl"></b>
                &nbsp;&nbsp;<a id="sk-mf-edit" href="#" style="color:#5b9bd5;">Edit</a>
            </div>`;
        document.body.appendChild(el);

        el.querySelector('#sk-mf-close').onclick = () => { el.style.display = 'none'; };
        el.querySelector('#sk-mf-edit').onclick = e => { e.preventDefault(); openSettingsPrompt(); };

        const drag = el.querySelector('#sk-mf-drag');
        drag.addEventListener('mousedown', e => {
            isDragging = true;
            dragOffsetX = e.clientX - el.offsetLeft;
            dragOffsetY = e.clientY - el.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            el.style.left = (e.clientX - dragOffsetX) + 'px';
            el.style.top = (e.clientY - dragOffsetY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    function showListingsPopup(anchorEl, listings, loading) {
        const popup = document.getElementById('sk-mf-popup');
        if (!popup || !showPopup) return;

        const body = popup.querySelector('#sk-mf-body');
        popup.querySelector('#sk-mf-delta-lbl').textContent = priceDelta;
        popup.querySelector('#sk-mf-slot-lbl').textContent = `#${marketSlotOffset + 1}`;

        if (loading) {
            body.innerHTML = '<span style="color:#888;">Loading prices...</span>';
        } else if (!listings || listings.length === 0) {
            body.innerHTML = '<span style="color:#e57373;">No listings found</span>';
        } else {
            body.innerHTML = listings.slice(0, 5).map((l, i) => {
                const afterTax = Math.round(l.price * (1 - MARKET_TAX));
                return `<div class="sk-mf-row" data-price="${l.price}" style="cursor:pointer;padding:3px 0;"
                    title="Click to use $${fmt(l.price - 1)} (1 below this)">
                    <b>#${i + 1}</b> ${l.amount}x @ $${fmt(l.price)}
                    <span style="color:#666;font-size:11px;"> ($${fmt(afterTax)} net)</span>
                </div>`;
            }).join('');

            popup.querySelectorAll('.sk-mf-row').forEach(row => {
                row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.06)'; });
                row.addEventListener('mouseleave', () => { row.style.background = ''; });
                row.addEventListener('click', () => {
                    const price = parseInt(row.getAttribute('data-price'), 10) - 1;
                    if (recentFilledInputs) {
                        recentFilledInputs.forEach(i => { i.value = price; });
                        if (recentFilledInputs[0]) recentFilledInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });
        }

        popup.style.display = 'block';
        // Position relative to the anchor button
        const rect = anchorEl.getBoundingClientRect();
        const left = Math.max(8, rect.left - 240);
        const top = Math.max(8, rect.top + window.scrollY - 10);
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    function openSettingsPrompt() {
        const current = marketSlotOffset > 0 ? `${priceDelta}[${marketSlotOffset}]` : priceDelta;
        const input = prompt(
            'Price offset formula:\n' +
            '  -1      → cheapest listing minus $1 (default)\n' +
            '  +0      → exact match\n' +
            '  -1%     → 1% below cheapest\n' +
            '  -1[1]   → 2nd cheapest minus $1\n\n' +
            'Current:', current
        );
        if (input === null) return;
        const slotM = input.match(/\[(\d+)\]$/);
        if (slotM) {
            marketSlotOffset = parseInt(slotM[1], 10);
            priceDelta = input.replace(/\[\d+\]$/, '').trim();
        } else {
            priceDelta = input.trim();
            marketSlotOffset = 0;
        }
        savePrefs();
    }

    // -----------------------------------------------------------------------
    // Fill button logic
    // -----------------------------------------------------------------------
    async function handleFill(e, itemId, priceInputs, qtyInputs) {
        e.preventDefault();
        e.stopPropagation();
        recentFilledInputs = priceInputs;

        const btn = e.currentTarget;
        const wasActive = btn.classList.contains('sk-mf-active');

        if (wasActive) {
            // Clear mode
            btn.classList.remove('sk-mf-active');
            btn.textContent = 'Fill';
            btn.style.background = '#2a4a7f';
            priceInputs.forEach(i => { i.value = ''; });
            qtyInputs?.forEach(i => { i.value = ''; });
            priceInputs[0]?.dispatchEvent(new Event('input', { bubbles: true }));
            const popup = document.getElementById('sk-mf-popup');
            if (popup) popup.style.display = 'none';
            return;
        }

        btn.classList.add('sk-mf-active');
        btn.textContent = 'Clear';
        btn.style.background = '#1a3a5f';

        ensurePopup();
        showListingsPopup(btn, null, true);

        const listings = await fetchMarketListings(itemId);
        const price = calcFillPrice(listings);

        if (price !== null && price > 0) {
            priceInputs.forEach(i => { i.value = price; });
            priceInputs[0]?.dispatchEvent(new Event('input', { bubbles: true }));
            // Fill quantity with a large number — Torn will cap it at available stock
            if (qtyInputs && qtyInputs.length > 0) {
                qtyInputs.forEach(i => { i.value = 9999999; });
                qtyInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        showListingsPopup(btn, listings, false);
    }

    // -----------------------------------------------------------------------
    // DOM injection: add Fill button next to each price input
    // -----------------------------------------------------------------------
    function addFillButton(priceWrapper, itemId) {
        if (priceWrapper.querySelector('.sk-mf-btn')) return;
        const priceInputs = [...priceWrapper.querySelectorAll('input.input-money')];
        if (priceInputs.length === 0) return;

        // Find quantity inputs in parent row
        const rowEl = priceWrapper.closest('[class*="itemRowWrapper"]') || priceWrapper.closest('li');
        const qtyInputs = rowEl ? [...rowEl.querySelectorAll('[class*="amountInput"] input.input-money')] : [];

        const btn = document.createElement('button');
        btn.className = 'sk-mf-btn';
        btn.type = 'button';
        btn.textContent = 'Fill';
        btn.title = 'Fill price and quantity from cheapest listing';
        btn.style.cssText = `
            cursor:pointer; background:#2a4a7f; color:#fff;
            border:none; padding:0 8px; border-radius:3px;
            font-size:11px; height:26px; line-height:26px;
            margin-right:4px; vertical-align:middle; flex-shrink:0;
            transition:background 0.15s; white-space:nowrap;
        `;
        btn.addEventListener('mouseenter', () => {
            if (!btn.classList.contains('sk-mf-active')) btn.style.background = '#3a6abf';
        });
        btn.addEventListener('mouseleave', () => {
            if (!btn.classList.contains('sk-mf-active')) btn.style.background = '#2a4a7f';
        });
        btn.addEventListener('click', e => handleFill(e, itemId, priceInputs, qtyInputs));

        const inputGroup = priceWrapper.querySelector('.input-money-group') || priceWrapper;
        inputGroup.style.display = 'flex';
        inputGroup.style.alignItems = 'center';
        inputGroup.prepend(btn);

        // Also tag the price wrapper so we don't double-process
        priceWrapper.dataset.skMfDone = '1';
    }

    // -----------------------------------------------------------------------
    // Item ID extraction
    // -----------------------------------------------------------------------
    function getItemId(rowWrapper) {
        // Method 1: aria-controls on the info button — "headlessui-tabs-panel-{itemId}-..."
        const infoBtn = rowWrapper.querySelector('[aria-controls]');
        if (infoBtn) {
            const m = (infoBtn.getAttribute('aria-controls') || '').match(/-(\d+)-/);
            if (m) return m[1];
        }
        // Method 2: image src contains item ID as a path segment
        const img = rowWrapper.querySelector('[class*="viewInfoButton"] img, [class*="itemImage"] img');
        if (img) {
            const m = (img.src || '').match(/\/(\d+)\//);
            if (m) return m[1];
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // Page scanning
    // -----------------------------------------------------------------------
    function processPage() {
        // React item market uses [class*=priceInputWrapper]
        document.querySelectorAll('[class*="priceInputWrapper"]:not([data-sk-mf-done])').forEach(wrapper => {
            wrapper.dataset.skMfDone = '1';
            const rowWrapper = wrapper.closest('[class*="itemRowWrapper"]');
            if (!rowWrapper) return;
            const itemId = getItemId(rowWrapper);
            if (!itemId) return;
            addFillButton(wrapper, itemId);
        });
    }

    // -----------------------------------------------------------------------
    // Module lifecycle
    // -----------------------------------------------------------------------
    function isOnItemMarket() {
        const url = window.location.href;
        return url.includes('page.php?sid=ItemMarket') || url.includes('imarket.php');
    }

    return {
        isEnabled: false,

        async init() {
            console.log('[MarketFiller] Init...');
            await loadSettings();

            // Read enabled state from the unified settings key (matches data-module="market-filler")
            const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            this.isEnabled = settings?.['market-filler']?.isEnabled === true;

            if (this.isEnabled) {
                this.enable();
            }
            console.log('[MarketFiller] Init done, enabled:', this.isEnabled);
        },

        enable() {
            this.isEnabled = true;
            if (!isOnItemMarket()) return; // Only inject on item market

            // Initial scan — may need to wait for React to render
            processPage();
            let tries = 0;
            const poll = setInterval(() => {
                processPage();
                if (++tries >= 20) clearInterval(poll);
            }, 500);

            // MutationObserver for dynamic content
            const root = document.getElementById('item-market-root') || document.querySelector('[class*="itemMarket"]') || document.body;
            pageObserver = new MutationObserver(() => processPage());
            pageObserver.observe(root, { childList: true, subtree: true });

            // SPA navigation
            window.addEventListener('locationchange', () => processPage());

            console.log('[MarketFiller] Enabled on item market');
        },

        disable() {
            this.isEnabled = false;
            pageObserver?.disconnect();
            pageObserver = null;
            document.getElementById('sk-mf-popup')?.remove();
        }
    };
})();

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.MarketFiller = MarketFillerModule;
console.log('[MarketFiller] Module registered');
