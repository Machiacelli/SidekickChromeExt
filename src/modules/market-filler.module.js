// Item Market Filler Module
// Adds a "Fill" button to item market listings that auto-fills
// the lowest market price minus $1 (configurable), fills max quantity,
// and shows a popup of the top 5 current listings.
// Adapted from Silmaril's Torn Market Filler (Tampermonkey) for use as a Chrome extension module.

const MarketFillerModule = (() => {
    const MARKET_TAX = 0.05;
    const STORAGE_KEY = 'sidekick_market_filler';

    let priceDelta = '-1';         // offset formula, e.g. "-1", "+0", "-1%"
    let marketSlotOffset = 0;      // which listing to use as reference (0 = cheapest)
    let showPopup = true;
    let recentFilledInputs = null;
    let isDragging = false;
    let popupDragOffsetX = 0, popupDragOffsetY = 0;

    // -----------------------------------------------------------------------
    // Settings persistence (Chrome storage, not localStorage)
    // -----------------------------------------------------------------------
    async function loadSettings() {
        try {
            const data = await window.SidekickModules.Core.ChromeStorage.get(STORAGE_KEY);
            if (data) {
                priceDelta = data.priceDelta ?? '-1';
                marketSlotOffset = data.marketSlotOffset ?? 0;
                showPopup = data.showPopup ?? true;
            }
        } catch (e) { console.error('[MarketFiller] loadSettings error:', e); }
    }

    async function saveSettings() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(STORAGE_KEY, { priceDelta, marketSlotOffset, showPopup });
        } catch (e) { console.error('[MarketFiller] saveSettings error:', e); }
    }

    // -----------------------------------------------------------------------
    // Torn API: fetch item market listings via background script
    // -----------------------------------------------------------------------
    async function fetchMarketListings(itemId) {
        const apiKey = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
        if (!apiKey) return null;

        const response = await chrome.runtime.sendMessage({
            action: 'fetchTornApi',
            apiKey,
            endpoint: `https://api.torn.com/v2/market?id=${itemId}&selections=itemMarket&key=${apiKey}&comment=SidekickMarketFiller`
        });

        if (!response || !response.success) return null;

        // Try standard v2 response shape
        const listings = response.itemmarket?.listings || response.data?.itemmarket?.listings;
        if (listings) return listings;

        // Fall back to raw data if shaped differently
        if (response.data?.listings) return response.data.listings;
        return null;
    }

    // -----------------------------------------------------------------------
    // Price calculation
    // -----------------------------------------------------------------------
    function calcPrice(listings) {
        if (!listings || listings.length === 0) return null;
        const refListing = listings[Math.min(marketSlotOffset, listings.length - 1)];
        const base = refListing.price;
        return applyDelta(base, priceDelta);
    }

    function applyDelta(num, formula) {
        const m = formula.match(/^([+-]?)(\d+(?:\.\d+)?)(%)?$/);
        if (!m) return num;
        const sign = m[1] === '-' ? -1 : 1;
        const val = parseFloat(m[2]);
        const adj = m[3] ? (num * val / 100) : val;
        return Math.round(num + sign * adj);
    }

    function formatNum(n) {
        return new Intl.NumberFormat('en-US').format(n);
    }

    // -----------------------------------------------------------------------
    // Popup
    // -----------------------------------------------------------------------
    function ensurePopup() {
        if (document.getElementById('sk-mf-popup')) return;
        const popup = document.createElement('div');
        popup.id = 'sk-mf-popup';
        popup.style.cssText = `
            display:none; position:fixed; z-index:99999;
            background:var(--tooltip-bg-color, #1e1e1e);
            border:1px solid #555; border-radius:8px;
            padding:12px 16px; font-size:13px;
            color:var(--info-msg-font-color, #ccc);
            box-shadow:0 4px 20px rgba(0,0,0,0.6);
            min-width:220px; pointer-events:auto;
            top:80px; left:240px;
        `;
        popup.innerHTML = `
            <div id="sk-mf-drag" style="cursor:move;font-size:11px;color:#888;margin-bottom:6px;user-select:none;">
                &#9776; Market Filler &mdash; drag to move
                <span id="sk-mf-close" style="float:right;cursor:pointer;color:#aaa;font-size:15px;line-height:1;">&times;</span>
            </div>
            <div id="sk-mf-body"></div>
            <div style="margin-top:8px;font-size:11px;color:#666;">
                Price offset: <b id="sk-mf-delta-label">...</b>
                &nbsp;|&nbsp; Slot: <b id="sk-mf-slot-label">...</b>
                <br><a id="sk-mf-settings-link" href="#" style="color:#5b9bd5;font-size:11px;">Edit settings</a>
            </div>
        `;
        document.body.appendChild(popup);

        document.getElementById('sk-mf-close').onclick = () => { popup.style.display = 'none'; };

        // Drag
        const drag = document.getElementById('sk-mf-drag');
        drag.addEventListener('mousedown', e => {
            isDragging = true;
            popupDragOffsetX = e.clientX - popup.offsetLeft;
            popupDragOffsetY = e.clientY - popup.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            popup.style.left = (e.clientX - popupDragOffsetX) + 'px';
            popup.style.top = (e.clientY - popupDragOffsetY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        // Settings
        document.getElementById('sk-mf-settings-link').onclick = e => {
            e.preventDefault();
            openSettings();
        };
    }

    function showFillerPopup(anchorEl, listings) {
        const popup = document.getElementById('sk-mf-popup');
        if (!popup || !showPopup) return;

        document.getElementById('sk-mf-delta-label').textContent = priceDelta;
        document.getElementById('sk-mf-slot-label').textContent = `#${marketSlotOffset + 1}`;

        const body = document.getElementById('sk-mf-body');
        if (!listings || listings.length === 0) {
            body.innerHTML = '<em style="color:#e57373;">No listings found</em>';
        } else {
            const top5 = listings.slice(0, 5);
            body.innerHTML = top5.map((l, i) => {
                const afterTax = Math.round(l.price * (1 - MARKET_TAX));
                return `<div class="sk-mf-price-row" data-price="${l.price}" style="cursor:pointer;padding:2px 0;" title="Click to use this price">
                    <b>#${i + 1}</b> &mdash; ${l.amount}x @ $${formatNum(l.price)}
                    <span style="color:#888;font-size:11px;"> ($${formatNum(afterTax)} after tax)</span>
                </div>`;
            }).join('');

            body.querySelectorAll('.sk-mf-price-row').forEach(row => {
                row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.06)');
                row.addEventListener('mouseleave', () => row.style.background = '');
                row.addEventListener('click', () => {
                    const price = parseInt(row.getAttribute('data-price'), 10) - 1;
                    applyPriceToInputs(price);
                });
            });
        }

        // Position near anchor
        const rect = anchorEl.getBoundingClientRect();
        popup.style.display = 'block';
        popup.style.left = Math.max(4, rect.left - 230) + 'px';
        popup.style.top = Math.max(4, rect.top - 10 + window.scrollY) + 'px';
    }

    function applyPriceToInputs(price) {
        if (!recentFilledInputs) return;
        recentFilledInputs.forEach(input => { input.value = price; });
        recentFilledInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }

    // -----------------------------------------------------------------------
    // Settings dialog
    // -----------------------------------------------------------------------
    function openSettings() {
        const delta = prompt(
            'Price offset formula:\n' +
            '  -1       → lowest price minus $1 (default)\n' +
            '  +0       → exact match\n' +
            '  -1%      → 1% below lowest\n' +
            '  (append [N] to use Nth listing, e.g. -1[1])\n\n' +
            'Current value:',
            `${priceDelta}[${marketSlotOffset}]`
        );
        if (delta === null) return;

        // Parse slot suffix
        const slotMatch = delta.match(/\[(\d+)\]\s*$/);
        if (slotMatch) {
            marketSlotOffset = parseInt(slotMatch[1], 10);
            priceDelta = delta.replace(/\[\d+\]\s*$/, '').trim();
        } else {
            priceDelta = delta.trim();
            marketSlotOffset = 0;
        }
        saveSettings();
    }

    // -----------------------------------------------------------------------
    // Fill button logic
    // -----------------------------------------------------------------------
    async function handleFillClick(e, itemId, priceInputs, quantityInputs) {
        e.preventDefault();
        e.stopPropagation();
        recentFilledInputs = priceInputs;

        const btn = e.currentTarget;
        const wasActive = btn.classList.contains('sk-mf-active');

        if (wasActive) {
            // Clear mode
            priceInputs.forEach(i => { i.value = ''; });
            quantityInputs?.forEach(i => { i.value = ''; });
            if (priceInputs[0]) priceInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            btn.classList.remove('sk-mf-active');
            btn.title = 'Fill price';
            document.getElementById('sk-mf-popup')?.style && (document.getElementById('sk-mf-popup').style.display = 'none');
            return;
        }

        btn.classList.add('sk-mf-active');
        btn.title = 'Click to clear';
        ensurePopup();
        showFillerPopup(btn, null); // show loading state

        const listings = await fetchMarketListings(itemId);
        const price = calcPrice(listings);

        if (price !== null) {
            priceInputs.forEach(i => { i.value = price; });
            if (priceInputs[0]) priceInputs[0].dispatchEvent(new Event('input', { bubbles: true }));

            // Fill max quantity
            if (quantityInputs && quantityInputs.length > 0) {
                const qty = Number.MAX_SAFE_INTEGER;
                quantityInputs.forEach(i => { i.value = qty; });
                quantityInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        showFillerPopup(btn, listings);
    }

    // -----------------------------------------------------------------------
    // DOM injection: add Fill button to each item row's price input
    // -----------------------------------------------------------------------
    function addFillButton(priceWrapper, itemId) {
        if (priceWrapper.querySelector('.sk-mf-btn')) return;

        // Find price inputs in this wrapper
        const priceInputs = [...priceWrapper.querySelectorAll('input.input-money')];
        if (priceInputs.length === 0) return;

        // Find quantity inputs in parent row
        const rowParent = findParent(priceWrapper, el => /item[Rr]owWrapper|itemRow[^_]/.test(el.className || '')) || priceWrapper.closest('li');
        const quantityInputs = rowParent ? [...rowParent.querySelectorAll('[class*=amountInput] input.input-money')] : [];

        const btn = document.createElement('span');
        btn.className = 'sk-mf-btn input-money-symbol';
        btn.textContent = 'Fill';
        btn.title = 'Fill price with lowest listing minus offset';
        btn.style.cssText = `
            cursor:pointer; background:#2a4a7f; color:#fff;
            padding:0 6px; border-radius:3px 0 0 3px;
            font-size:11px; line-height:22px; display:inline-flex;
            align-items:center; user-select:none;
        `;
        btn.addEventListener('mouseenter', () => btn.style.background = '#3a6abf');
        btn.addEventListener('mouseleave', () => { btn.style.background = btn.classList.contains('sk-mf-active') ? '#1a3a5f' : '#2a4a7f'; });

        btn.addEventListener('click', e => handleFillClick(e, itemId, priceInputs, quantityInputs));

        const inputGroup = priceWrapper.querySelector('.input-money-group');
        if (inputGroup) {
            inputGroup.prepend(btn);
        } else {
            priceWrapper.prepend(btn);
        }
    }

    // -----------------------------------------------------------------------
    // Item ID extraction helpers
    // -----------------------------------------------------------------------
    function getItemIdFromAriaControls(el) {
        // aria-controls format: "headlessui-tabs-panel-{itemId}-..."
        const str = el?.getAttribute('aria-controls') || '';
        const m = str.match(/-(\d+)-/);
        return m ? m[1] : null;
    }

    function getItemIdFromImage(img) {
        if (!img) return null;
        const m = img.src.match(/\/(\d+)\//);
        return m ? m[1] : null;
    }

    function findItemId(rowWrapper) {
        // Try aria-controls on viewInfoButton
        const btn = rowWrapper.querySelector('[class*=viewInfoButton] [type=button], [aria-controls]');
        if (btn) {
            const id = getItemIdFromAriaControls(btn);
            if (id) return id;
        }
        // Try image src
        const img = rowWrapper.querySelector('[class*=viewInfoButton] img, [class*=itemImage] img');
        return getItemIdFromImage(img);
    }

    function findParent(el, test) {
        let cur = el;
        while (cur) {
            if (test(cur)) return cur;
            cur = cur.parentElement;
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // Scan page for price wrappers and inject Fill buttons
    // -----------------------------------------------------------------------
    function processPage() {
        // React item market: [class^=priceInputWrapper___]
        document.querySelectorAll('[class*=priceInputWrapper]:not(.sk-mf-done)').forEach(wrapper => {
            wrapper.classList.add('sk-mf-done');
            const rowWrapper = findParent(wrapper, el => /itemRowWrapper/.test(el.className || ''));
            if (!rowWrapper) return;
            const itemId = findItemId(rowWrapper);
            if (!itemId) return;
            addFillButton(wrapper, itemId);
        });
    }

    // -----------------------------------------------------------------------
    // Module lifecycle
    // -----------------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById('sk-mf-styles')) return;
        const s = document.createElement('style');
        s.id = 'sk-mf-styles';
        s.textContent = `
            .sk-mf-btn { transition: background 0.15s; }
            .sk-mf-btn.sk-mf-active { background: #1a3a5f !important; }
            .sk-mf-price-row:hover { background: rgba(255,255,255,0.06); }
        `;
        document.head.appendChild(s);
    }

    return {
        isEnabled: false,
        STORAGE_KEY: 'sidekick_market_filler_enabled',
        observer: null,

        async init() {
            console.log('[MarketFiller] Initializing...');
            await loadSettings();
            await this.loadEnabled();

            if (this.isEnabled) this.enable();
            console.log('[MarketFiller] Initialized (enabled:', this.isEnabled, ')');
        },

        async loadEnabled() {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            this.isEnabled = data?.['market-filler']?.isEnabled ?? false;
        },

        async saveEnabled() {
            const data = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings') || {};
            data['market-filler'] = { isEnabled: this.isEnabled };
            await window.SidekickModules.Core.ChromeStorage.set('sidekick_settings', data);
        },

        enable() {
            this.isEnabled = true;
            this.saveEnabled();
            injectStyles();
            ensurePopup();

            const url = window.location.href;
            if (!url.includes('page.php?sid=ItemMarket') && !url.includes('imarket.php')) {
                return; // only active on item market pages
            }

            processPage();

            this.observer = new MutationObserver(() => processPage());
            const root = document.getElementById('item-market-root') || document.body;
            this.observer.observe(root, { childList: true, subtree: true });

            // URL navigation (SPA)
            window.addEventListener('locationchange', () => processPage());

            console.log('[MarketFiller] Enabled on item market page');
        },

        disable() {
            this.isEnabled = false;
            this.saveEnabled();
            this.observer?.disconnect();
            this.observer = null;
            document.getElementById('sk-mf-popup')?.remove();
            document.getElementById('sk-mf-styles')?.remove();
        }
    };
})();

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.MarketFiller = MarketFillerModule;
console.log('[MarketFiller] Module registered');
