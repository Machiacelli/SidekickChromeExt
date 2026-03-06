/**
 * Price Filler Module
 * Handles automatic price filling on:
 *  - bazaar.php  (Add and Manage tabs, adapted from Customizable Bazaar Filler)
 *  - Item Market (page.php?sid=ItemMarket)
 * 
 * Settings stored in chrome.storage.local:
 *   sidekick_price_filler_prefs  – pricing preferences (source, offsets, etc.)
 * Module enabled/disabled via:
 *   sidekick_settings['price-filler'].isEnabled
 */

const PriceFillerModule = (() => {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    let prefs = {
        apiKey: '',
        pricingSource: 'Market Value', // 'Market Value' | 'Item Market' | 'Bazaars/weav3r.dev'
        marketMarginOffset: 0,
        marketMarginType: 'absolute',
        itemMarketListing: 1,
        itemMarketOffset: -1,
        itemMarketMarginType: 'absolute',
        itemMarketClamp: false,
        bazaarListing: 1,
        bazaarMarginOffset: 0,
        bazaarMarginType: 'absolute',
        bazaarClamp: false,
        blackFridayMode: false,
        imPriceDelta: '-1',      // Item Market filler offset formula
        imSlotOffset: 0,         // Item Market filler slot
    };

    const PREFS_KEY = 'sidekick_price_filler_prefs';
    let itemMarketCache = {};
    let weav3rCache = {};
    let pageObserver = null;
    let bazaarObserver = null;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    async function loadPrefs() {
        try {
            const d = await window.SidekickModules.Core.ChromeStorage.get(PREFS_KEY);
            if (d) Object.assign(prefs, d);
            // Also try to get apiKey from the main sidekick key if not set
            if (!prefs.apiKey) {
                const key = await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
                if (key) prefs.apiKey = key;
            }
        } catch (e) { console.error('[PriceFiller] loadPrefs:', e); }
    }

    async function savePrefs() {
        try {
            await window.SidekickModules.Core.ChromeStorage.set(PREFS_KEY, prefs);
        } catch (e) { console.error('[PriceFiller] savePrefs:', e); }
    }

    // -------------------------------------------------------------------------
    // Torn items cache (localStorage – same key as Bazaar Filler TM script)
    // -------------------------------------------------------------------------
    function getStoredItems() {
        try { return JSON.parse(localStorage.getItem('tornItems') || '{}'); }
        catch { return {}; }
    }

    function getItemIdByName(name) {
        const items = getStoredItems();
        for (const [id, info] of Object.entries(items)) {
            if (info.name === name) return id;
        }
        return null;
    }

    async function refreshTornItems() {
        if (!prefs.apiKey) return;
        try {
            const resp = await fetch(`https://api.torn.com/torn/?key=${prefs.apiKey}&selections=items&comment=SidekickPriceFiller`);
            const data = await resp.json();
            if (!data.items) throw new Error(data.error?.error || 'No items in response');
            const filtered = {};
            for (const [id, item] of Object.entries(data.items)) {
                if (item.tradeable) filtered[id] = { name: item.name, market_value: item.market_value };
            }
            localStorage.setItem('tornItems', JSON.stringify(filtered));
            localStorage.setItem('tornItems_ts', String(Date.now()));
        } catch (e) { console.error('[PriceFiller] refreshTornItems:', e); }
    }

    function maybeRefreshItems() {
        const ts = parseInt(localStorage.getItem('tornItems_ts') || '0', 10);
        const age = Date.now() - ts;
        if (!localStorage.getItem('tornItems') || age > 86400000) refreshTornItems();
    }

    // -------------------------------------------------------------------------
    // API calls
    // -------------------------------------------------------------------------
    async function fetchItemMarketData(itemId) {
        const now = Date.now();
        if (itemMarketCache[itemId]?.time && now - itemMarketCache[itemId].time < 30000)
            return itemMarketCache[itemId].data;
        if (!prefs.apiKey) return null;
        const resp = await fetch(`https://api.torn.com/v2/market/${itemId}/itemmarket?comment=SidekickPriceFiller`, {
            headers: { Authorization: 'ApiKey ' + prefs.apiKey }
        });
        const data = await resp.json();
        if (data.error) { console.warn('[PriceFiller] API error:', data.error); return null; }
        itemMarketCache[itemId] = { time: now, data };
        return data;
    }

    async function fetchWeav3rData(itemId) {
        const now = Date.now();
        if (weav3rCache[itemId]?.time && now - weav3rCache[itemId].time < 60000)
            return weav3rCache[itemId].data;
        const resp = await fetch(`https://weav3r.dev/api/marketplace/${itemId}`);
        const data = await resp.json();
        weav3rCache[itemId] = { time: now, data };
        return data;
    }

    // -------------------------------------------------------------------------
    // Price calculation
    // -------------------------------------------------------------------------
    async function calculatePrice(itemName, itemId, matchedItem) {
        if (!matchedItem) return null;

        if (prefs.pricingSource === 'Market Value') {
            const mv = matchedItem.market_value || 0;
            let price = mv;
            if (prefs.marketMarginType === 'percentage') price = Math.round(mv * (1 + prefs.marketMarginOffset / 100));
            else price = mv + prefs.marketMarginOffset;
            return { price, marketValue: mv };
        }

        if (prefs.pricingSource === 'Item Market' && itemId) {
            const data = await fetchItemMarketData(itemId).catch(() => null);
            const listings = data?.itemmarket?.listings;
            if (!listings?.length) return null;
            const idx = Math.min((prefs.itemMarketListing || 1) - 1, listings.length - 1);
            let price = listings[idx].price;
            if (prefs.itemMarketMarginType === 'percentage') price = Math.round(price * (1 + prefs.itemMarketOffset / 100));
            else price += prefs.itemMarketOffset;
            if (prefs.itemMarketClamp && matchedItem.market_value) price = Math.max(price, matchedItem.market_value);
            return { price, marketValue: matchedItem.market_value, listings: listings.slice(0, 5) };
        }

        if (prefs.pricingSource === 'Bazaars/weav3r.dev' && itemId) {
            const data = await fetchWeav3rData(itemId).catch(() => null);
            if (!data?.listings?.length) return null;
            const idx = Math.min((prefs.bazaarListing || 1) - 1, data.listings.length - 1);
            let price = data.listings[idx].price;
            if (prefs.bazaarMarginType === 'percentage') price = Math.round(price * (1 + prefs.bazaarMarginOffset / 100));
            else price += prefs.bazaarMarginOffset;
            if (prefs.bazaarClamp && matchedItem.market_value) price = Math.max(price, matchedItem.market_value);
            return { price, marketValue: matchedItem.market_value };
        }

        return null;
    }

    function applyDeltaFormula(num, formula) {
        const m = String(formula).match(/^([+-]?)(\d+(?:\.\d+)?)(%)?$/);
        if (!m) return num;
        const sign = m[1] === '-' ? -1 : 1;
        const val = parseFloat(m[2]);
        const adj = m[3] ? (num * val / 100) : val;
        return Math.round(num + sign * adj);
    }

    // -------------------------------------------------------------------------
    // Price color helpers
    // -------------------------------------------------------------------------
    function getPriceColor(listed, mv) {
        if (!mv) return '';
        const ratio = listed / mv;
        const dark = document.body.classList.contains('dark-mode');
        if (ratio >= 0.998 && ratio <= 1.002) return '';
        if (ratio < 0.998) {
            const t = Math.min((0.998 - ratio) / 0.05, 1.2);
            return dark ? `rgb(${Math.round(255 - t * 65)},${Math.round(255 - t * 185)},${Math.round(255 - t * 185)})`
                : `rgb(${Math.round(180 - t * 40)},${Math.round(60 - t * 40)},${Math.round(60 - t * 40)})`;
        }
        const t = Math.min((ratio - 1.002) / 0.05, 1.2);
        return dark ? `rgb(${Math.round(255 - t * 185)},${Math.round(255 - t * 65)},${Math.round(255 - t * 185)})`
            : `rgb(${Math.round(60 - t * 40)},${Math.round(160 - t * 40)},${Math.round(60 - t * 40)})`;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    function fmt(n) { return new Intl.NumberFormat('en-US').format(n); }

    function triggerEvents(el, ...events) {
        events.forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
    }

    // -------------------------------------------------------------------------
    // BAZAAR – Add page (#/add)
    // -------------------------------------------------------------------------
    async function fillAddRow(row, checked) {
        const qtyInput = row.querySelector('.amount input');
        const priceInput = row.querySelector('.price input');
        const choiceCheckbox = row.querySelector('div.amount.choice-container input');

        if (!checked) {
            if (choiceCheckbox?.checked) choiceCheckbox.click();
            qtyInput.value = '';
            triggerEvents(qtyInput, 'keyup');
            priceInput.value = '';
            priceInput.style.color = '';
            triggerEvents(priceInput, 'input', 'keyup');
            return;
        }

        if (choiceCheckbox) {
            if (!choiceCheckbox.checked) choiceCheckbox.click();
        } else {
            const qty = row.querySelector('.item-amount.qty')?.textContent.trim() || '';
            qtyInput.value = qty;
            triggerEvents(qtyInput, 'keyup');
        }

        if (prefs.blackFridayMode) {
            priceInput.value = '1';
            triggerEvents(priceInput, 'input', 'keyup');
            return;
        }

        const itemName = row.querySelector('.name-wrap span.t-overflow')?.textContent.trim();
        if (!itemName) return;
        const itemId = getItemIdByName(itemName);
        const items = getStoredItems();
        const matchedItem = Object.values(items).find(i => i.name === itemName);

        const result = await calculatePrice(itemName, itemId, matchedItem).catch(() => null);
        if (!result) return;

        priceInput.value = fmt(result.price);
        priceInput.style.color = result.marketValue ? getPriceColor(result.price, result.marketValue) : '';
        triggerEvents(priceInput, 'input', 'keyup');
    }

    // -------------------------------------------------------------------------
    // BAZAAR – Manage page (#/manage)
    // -------------------------------------------------------------------------
    async function fillManageRow(row, checked) {
        const priceInput = row.querySelector('.price___DoKP7 .input-money-group.success input.input-money');
        if (!priceInput) return;

        if (!checked) {
            priceInput.value = '';
            priceInput.style.color = '';
            triggerEvents(priceInput, 'input');
            return;
        }

        if (prefs.blackFridayMode) {
            priceInput.value = '1';
            triggerEvents(priceInput, 'input');
            return;
        }

        const itemName = row.querySelector('.desc___VJSNQ b')?.textContent.trim();
        if (!itemName) return;
        const itemId = getItemIdByName(itemName);
        const items = getStoredItems();
        const matchedItem = Object.values(items).find(i => i.name === itemName);

        const result = await calculatePrice(itemName, itemId, matchedItem).catch(() => null);
        if (!result) return;

        priceInput.value = fmt(result.price);
        priceInput.style.color = result.marketValue ? getPriceColor(result.price, result.marketValue) : '';
        triggerEvents(priceInput, 'input');
    }

    // -------------------------------------------------------------------------
    // BAZAAR – Checkbox injection
    // -------------------------------------------------------------------------
    function injectBazaarStyles() {
        if (document.getElementById('sk-pf-bazaar-styles')) return;
        const s = document.createElement('style');
        s.id = 'sk-pf-bazaar-styles';
        s.textContent = `
            .sk-pf-check {
                width:18px; height:18px; border-radius:4px;
                appearance:none; outline:none; cursor:pointer;
                position:absolute; top:6px; left:6px;
                border:1px solid #4e535a; background:#2f3237;
            }
            .sk-pf-check:checked { background:#5b9bd5; border-color:#5b9bd5; }
            .sk-pf-check-wrap {
                position:absolute; top:50%; right:8px;
                width:30px; height:30px;
                transform:translateY(-50%); cursor:pointer;
            }
            .sk-pf-settings-link {
                display:inline-flex; align-items:center; gap:6px;
                padding:4px 8px; margin:0 4px;
                background:rgba(91,155,213,0.15); border:1px solid rgba(91,155,213,0.3);
                border-radius:4px; cursor:pointer; font-size:12px; color:#5b9bd5;
                text-decoration:none;
            }
            .sk-pf-settings-link:hover { background:rgba(91,155,213,0.25); }
            .sk-pf-bf-link { color:#28a745 !important; border-color:rgba(40,167,69,0.4) !important; background:rgba(40,167,69,0.1) !important; }
        `;
        document.head.appendChild(s);
    }

    function addBazaarCheckboxes() {
        const hash = window.location.hash;

        if (hash === '#/add') {
            document.querySelectorAll('.items-cont .title-wrap').forEach(titleWrap => {
                if (titleWrap.querySelector('.sk-pf-check-wrap')) return;
                titleWrap.style.position = 'relative';
                const wrap = document.createElement('div');
                wrap.className = 'sk-pf-check-wrap';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'sk-pf-check';
                cb.addEventListener('change', async (e) => {
                    e.stopPropagation();
                    const row = cb.closest('li.clearfix');
                    await fillAddRow(row, cb.checked).catch(err => console.error('[PriceFiller]', err));
                });
                wrap.appendChild(cb);
                titleWrap.appendChild(wrap);
            });
        }

        if (hash === '#/manage') {
            document.querySelectorAll('.item___jLJcf').forEach(row => {
                const desc = row.querySelector('.desc___VJSNQ');
                if (!desc || desc.querySelector('.sk-pf-check-wrap')) return;
                desc.style.position = 'relative';
                const wrap = document.createElement('div');
                wrap.className = 'sk-pf-check-wrap';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'sk-pf-check';
                cb.addEventListener('change', async (e) => {
                    e.stopPropagation();
                    await fillManageRow(row, cb.checked).catch(err => console.error('[PriceFiller]', err));
                });
                wrap.appendChild(cb);
                desc.appendChild(wrap);
            });
        }
    }

    function addBazaarSettingsButton() {
        if (document.getElementById('sk-pf-settings-btn')) return;
        const container = document.querySelector('.linksContainer___LiOTN');
        if (!container) return;

        // Settings button
        const settingsBtn = document.createElement('a');
        settingsBtn.id = 'sk-pf-settings-btn';
        settingsBtn.href = '#';
        settingsBtn.className = 'sk-pf-settings-link';
        settingsBtn.innerHTML = `<span>⚙</span><span>Price Filler Settings</span>`;
        settingsBtn.addEventListener('click', e => { e.preventDefault(); openSettingsModal(); });
        container.insertBefore(settingsBtn, container.firstChild);

        // Black Friday toggle
        const bfBtn = document.createElement('a');
        bfBtn.id = 'sk-pf-bf-btn';
        bfBtn.href = '#';
        bfBtn.className = 'sk-pf-settings-link' + (prefs.blackFridayMode ? ' sk-pf-bf-link' : '');
        bfBtn.innerHTML = `<span>💰</span><span>Black Friday: ${prefs.blackFridayMode ? 'ON' : 'OFF'}</span>`;
        bfBtn.addEventListener('click', e => {
            e.preventDefault();
            prefs.blackFridayMode = !prefs.blackFridayMode;
            savePrefs();
            bfBtn.querySelector('span:last-child').textContent = `Black Friday: ${prefs.blackFridayMode ? 'ON' : 'OFF'}`;
            bfBtn.classList.toggle('sk-pf-bf-link', prefs.blackFridayMode);
        });
        container.insertBefore(bfBtn, settingsBtn.nextSibling);
    }

    // -------------------------------------------------------------------------
    // Settings Modal (Bazaar)
    // -------------------------------------------------------------------------
    function openSettingsModal() {
        document.getElementById('sk-pf-modal-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sk-pf-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

        const dark = document.body.classList.contains('dark-mode');
        const bg = dark ? '#2f3237' : '#fff';
        const fg = dark ? '#eee' : '#000';
        const inputStyle = `width:100%;padding:6px;box-sizing:border-box;background:${dark ? '#3c3f41' : '#fff'};color:${fg};border:1px solid ${dark ? '#555' : '#ccc'};border-radius:4px;`;
        const labelStyle = `display:block;margin-bottom:4px;font-weight:bold;`;

        overlay.innerHTML = `
        <div style="background:${bg};color:${fg};padding:20px;border-radius:8px;width:420px;max-width:92%;max-height:90vh;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:Arial,sans-serif;">
            <h2 style="margin-top:0;font-size:16px;">🛒 Price Filler Settings</h2>
            <hr style="border-color:#555;margin:10px 0;">
            
            <label style="${labelStyle}">Torn API Key</label>
            <div style="display:flex;gap:8px;margin-bottom:14px;">
                <input id="sk-pf-apikey" style="${inputStyle}flex:1;" type="text" value="${prefs.apiKey}" placeholder="Enter API key">
                <button id="sk-pf-refresh-items" title="Refresh market values" style="padding:6px 10px;cursor:pointer;border-radius:4px;border:1px solid #555;background:${dark ? '#444' : '#eee'};">↻</button>
            </div>
            
            <label style="${labelStyle}">Pricing Source</label>
            <select id="sk-pf-source" style="${inputStyle}margin-bottom:14px;">
                <option value="Market Value">Market Value</option>
                <option value="Item Market">Item Market</option>
                <option value="Bazaars/weav3r.dev">Bazaars / weav3r.dev</option>
            </select>
            
            <div id="sk-pf-mv-opts" style="display:none;margin-bottom:14px;padding:10px;border:1px solid #444;border-radius:6px;">
                <b>Market Value Options</b>
                <label style="${labelStyle}margin-top:8px;">Margin offset (e.g. -1000 for $1000 less)</label>
                <input id="sk-pf-mv-offset" type="number" style="${inputStyle}" value="${prefs.marketMarginOffset}">
                <label style="${labelStyle}margin-top:8px;">Margin type</label>
                <select id="sk-pf-mv-type" style="${inputStyle}">
                    <option value="absolute">Absolute ($)</option>
                    <option value="percentage">Percentage (%)</option>
                </select>
            </div>
            
            <div id="sk-pf-im-opts" style="display:none;margin-bottom:14px;padding:10px;border:1px solid #444;border-radius:6px;">
                <b>Item Market Options</b>
                <label style="${labelStyle}margin-top:8px;">Listing index (1 = cheapest)</label>
                <input id="sk-pf-im-listing" type="number" style="${inputStyle}" value="${prefs.itemMarketListing}" min="1">
                <label style="${labelStyle}margin-top:8px;">Margin offset (e.g. -1 for $1 less)</label>
                <input id="sk-pf-im-offset" type="number" style="${inputStyle}" value="${prefs.itemMarketOffset}">
                <label style="${labelStyle}margin-top:8px;">Margin type</label>
                <select id="sk-pf-im-type" style="${inputStyle}">
                    <option value="absolute">Absolute ($)</option>
                    <option value="percentage">Percentage (%)</option>
                </select>
                <label style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer;">
                    <input id="sk-pf-im-clamp" type="checkbox" ${prefs.itemMarketClamp ? 'checked' : ''}> Clamp minimum to Market Value
                </label>
            </div>
            
            <div id="sk-pf-bz-opts" style="display:none;margin-bottom:14px;padding:10px;border:1px solid #444;border-radius:6px;">
                <b>weav3r.dev Options</b>
                <label style="${labelStyle}margin-top:8px;">Listing index (1 = cheapest)</label>
                <input id="sk-pf-bz-listing" type="number" style="${inputStyle}" value="${prefs.bazaarListing}" min="1">
                <label style="${labelStyle}margin-top:8px;">Margin offset</label>
                <input id="sk-pf-bz-offset" type="number" style="${inputStyle}" value="${prefs.bazaarMarginOffset}">
                <label style="${labelStyle}margin-top:8px;">Margin type</label>
                <select id="sk-pf-bz-type" style="${inputStyle}">
                    <option value="absolute">Absolute ($)</option>
                    <option value="percentage">Percentage (%)</option>
                </select>
                <label style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer;">
                    <input id="sk-pf-bz-clamp" type="checkbox" ${prefs.bazaarClamp ? 'checked' : ''}> Clamp minimum to Market Value
                </label>
            </div>

            <hr style="border-color:#555;margin:10px 0;">
            <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end;">
                <button id="sk-pf-save" style="padding:6px 16px;cursor:pointer;background:#5b9bd5;color:#fff;border:none;border-radius:4px;">Save</button>
                <button id="sk-pf-cancel" style="padding:6px 16px;cursor:pointer;background:#555;color:#fff;border:none;border-radius:4px;">Cancel</button>
            </div>
            <div id="sk-pf-modal-msg" style="margin-top:8px;font-size:12px;text-align:center;min-height:18px;"></div>
        </div>`;

        document.body.appendChild(overlay);

        // Pre-fill selects
        overlay.querySelector('#sk-pf-source').value = prefs.pricingSource;
        overlay.querySelector('#sk-pf-mv-type').value = prefs.marketMarginType;
        overlay.querySelector('#sk-pf-im-type').value = prefs.itemMarketMarginType;
        overlay.querySelector('#sk-pf-bz-type').value = prefs.bazaarMarginType;

        function toggleOpts() {
            const src = overlay.querySelector('#sk-pf-source').value;
            overlay.querySelector('#sk-pf-mv-opts').style.display = src === 'Market Value' ? '' : 'none';
            overlay.querySelector('#sk-pf-im-opts').style.display = src === 'Item Market' ? '' : 'none';
            overlay.querySelector('#sk-pf-bz-opts').style.display = src === 'Bazaars/weav3r.dev' ? '' : 'none';
        }
        overlay.querySelector('#sk-pf-source').addEventListener('change', toggleOpts);
        toggleOpts();

        overlay.querySelector('#sk-pf-refresh-items').addEventListener('click', async () => {
            const key = overlay.querySelector('#sk-pf-apikey').value.trim();
            if (!key) { overlay.querySelector('#sk-pf-modal-msg').textContent = '⚠️ Enter API key first'; return; }
            prefs.apiKey = key;
            overlay.querySelector('#sk-pf-modal-msg').textContent = 'Refreshing...';
            await refreshTornItems();
            overlay.querySelector('#sk-pf-modal-msg').textContent = '✓ Market values refreshed!';
        });

        overlay.querySelector('#sk-pf-save').addEventListener('click', async () => {
            prefs.apiKey = overlay.querySelector('#sk-pf-apikey').value.trim();
            prefs.pricingSource = overlay.querySelector('#sk-pf-source').value;
            prefs.marketMarginOffset = Number(overlay.querySelector('#sk-pf-mv-offset').value);
            prefs.marketMarginType = overlay.querySelector('#sk-pf-mv-type').value;
            prefs.itemMarketListing = Number(overlay.querySelector('#sk-pf-im-listing').value);
            prefs.itemMarketOffset = Number(overlay.querySelector('#sk-pf-im-offset').value);
            prefs.itemMarketMarginType = overlay.querySelector('#sk-pf-im-type').value;
            prefs.itemMarketClamp = overlay.querySelector('#sk-pf-im-clamp').checked;
            prefs.bazaarListing = Number(overlay.querySelector('#sk-pf-bz-listing').value);
            prefs.bazaarMarginOffset = Number(overlay.querySelector('#sk-pf-bz-offset').value);
            prefs.bazaarMarginType = overlay.querySelector('#sk-pf-bz-type').value;
            prefs.bazaarClamp = overlay.querySelector('#sk-pf-bz-clamp').checked;
            // Clear caches when source changes
            itemMarketCache = {};
            weav3rCache = {};
            await savePrefs();
            overlay.remove();
        });

        overlay.querySelector('#sk-pf-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }

    // -------------------------------------------------------------------------
    // BAZAAR – Page wiring
    // -------------------------------------------------------------------------
    function runBazaarUI() {
        injectBazaarStyles();
        addBazaarCheckboxes();
        addBazaarSettingsButton();
    }

    function setupBazaarObserver() {
        if (bazaarObserver) bazaarObserver.disconnect();
        let debounce;
        bazaarObserver = new MutationObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(runBazaarUI, 150);
        });
        const root = document.querySelector('#bazaarRoot') || document.body;
        bazaarObserver.observe(root, { childList: true, subtree: true });

        window.addEventListener('hashchange', () => setTimeout(runBazaarUI, 200));
        setTimeout(runBazaarUI, 300);
    }

    // -------------------------------------------------------------------------
    // ITEM MARKET – Fill button
    // -------------------------------------------------------------------------
    let imRecentInputs = null;
    let imPopupDragX = 0, imPopupDragY = 0, imDragging = false;

    function ensureImPopup() {
        if (document.getElementById('sk-pf-im-popup')) return;
        const el = document.createElement('div');
        el.id = 'sk-pf-im-popup';
        el.style.cssText = `display:none;position:fixed;z-index:99999;
            background:#1e2430;border:1px solid #444;border-radius:8px;
            padding:10px 14px;font-size:13px;color:#ccc;
            box-shadow:0 4px 20px rgba(0,0,0,0.7);min-width:230px;
            pointer-events:auto;top:80px;left:200px;`;
        el.innerHTML = `
            <div id="sk-pf-im-drag" style="cursor:move;font-size:11px;color:#666;border-bottom:1px solid #333;padding-bottom:6px;margin-bottom:8px;user-select:none;">
                &#9776; Item Market Filler
                <span id="sk-pf-im-close" style="float:right;cursor:pointer;color:#888;font-size:16px;line-height:1;">&times;</span>
            </div>
            <div id="sk-pf-im-body" style="min-height:30px;"></div>
            <div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;">
                Offset: <b id="sk-pf-im-delta-lbl"></b> &nbsp;|&nbsp; Slot: <b id="sk-pf-im-slot-lbl"></b>
                &nbsp;&nbsp;<a id="sk-pf-im-edit" href="#" style="color:#5b9bd5;">Edit</a>
            </div>`;
        document.body.appendChild(el);
        el.querySelector('#sk-pf-im-close').onclick = () => { el.style.display = 'none'; };
        el.querySelector('#sk-pf-im-edit').onclick = e => { e.preventDefault(); openImSettings(); };
        const drag = el.querySelector('#sk-pf-im-drag');
        drag.addEventListener('mousedown', e => {
            imDragging = true; imPopupDragX = e.clientX - el.offsetLeft; imPopupDragY = e.clientY - el.offsetTop; e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!imDragging) return;
            el.style.left = (e.clientX - imPopupDragX) + 'px'; el.style.top = (e.clientY - imPopupDragY) + 'px';
        });
        document.addEventListener('mouseup', () => { imDragging = false; });
    }

    function showImPopup(anchor, listings, loading) {
        const popup = document.getElementById('sk-pf-im-popup');
        if (!popup) return;
        const body = popup.querySelector('#sk-pf-im-body');
        const MARKET_TAX = 0.05;
        popup.querySelector('#sk-pf-im-delta-lbl').textContent = prefs.imPriceDelta;
        popup.querySelector('#sk-pf-im-slot-lbl').textContent = `#${(prefs.imSlotOffset || 0) + 1}`;
        if (loading) {
            body.innerHTML = '<span style="color:#888;">Loading prices...</span>';
        } else if (!listings?.length) {
            body.innerHTML = '<span style="color:#e57373;">No listings found</span>';
        } else {
            body.innerHTML = listings.slice(0, 5).map((l, i) => {
                const net = Math.round(l.price * (1 - MARKET_TAX));
                return `<div class="sk-pf-im-row" data-price="${l.price}" style="cursor:pointer;padding:3px 0;"
                    title="Click to use this as base price">
                    <b>#${i + 1}</b> ${l.amount}x @ $${fmt(l.price)}
                    <span style="color:#666;font-size:11px;"> ($${fmt(net)} after tax)</span>
                </div>`;
            }).join('');
            popup.querySelectorAll('.sk-pf-im-row').forEach(row => {
                row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.06)'; });
                row.addEventListener('mouseleave', () => { row.style.background = ''; });
                row.addEventListener('click', () => {
                    const p = parseInt(row.getAttribute('data-price'), 10) - 1;
                    if (imRecentInputs) { imRecentInputs.forEach(i => { i.value = p; }); imRecentInputs[0]?.dispatchEvent(new Event('input', { bubbles: true })); }
                });
            });
        }
        popup.style.display = 'block';
        const rect = anchor.getBoundingClientRect();
        popup.style.left = Math.max(8, rect.left - 250) + 'px';
        popup.style.top = Math.max(8, rect.top + window.scrollY - 10) + 'px';
    }

    function openImSettings() {
        const current = (prefs.imSlotOffset || 0) > 0 ? `${prefs.imPriceDelta}[${prefs.imSlotOffset}]` : prefs.imPriceDelta;
        const input = prompt(
            'Item Market price offset formula:\n' +
            '  -1      → cheapest listing minus $1 (default)\n' +
            '  +0      → exact match\n' +
            '  -1%     → 1% below cheapest\n' +
            '  -1[1]   → 2nd cheapest minus $1\n\n' +
            'Current:', current
        );
        if (input === null) return;
        const slotM = input.match(/\[(\d+)\]$/);
        prefs.imSlotOffset = slotM ? parseInt(slotM[1], 10) : 0;
        prefs.imPriceDelta = (slotM ? input.replace(/\[\d+\]$/, '') : input).trim();
        savePrefs();
    }

    async function handleImFill(e, itemId, priceInputs, qtyInputs) {
        e.preventDefault();
        e.stopPropagation();
        imRecentInputs = priceInputs;
        const btn = e.currentTarget;
        const wasActive = btn.classList.contains('sk-pf-im-active');
        if (wasActive) {
            btn.classList.remove('sk-pf-im-active');
            btn.textContent = 'Fill';
            btn.style.background = '#2a4a7f';
            priceInputs.forEach(i => { i.value = ''; });
            qtyInputs?.forEach(i => { i.value = ''; });
            priceInputs[0]?.dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('sk-pf-im-popup')?.style && (document.getElementById('sk-pf-im-popup').style.display = 'none');
            return;
        }
        btn.classList.add('sk-pf-im-active');
        btn.textContent = 'Clear';
        btn.style.background = '#1a3a5f';
        ensureImPopup();
        showImPopup(btn, null, true);

        const data = await fetchItemMarketData(itemId).catch(() => null);
        const listings = data?.itemmarket?.listings;
        if (listings?.length) {
            const idx = Math.min(prefs.imSlotOffset || 0, listings.length - 1);
            const price = applyDeltaFormula(listings[idx].price, prefs.imPriceDelta || '-1');
            if (price > 0) {
                priceInputs.forEach(i => { i.value = price; });
                priceInputs[0]?.dispatchEvent(new Event('input', { bubbles: true }));
                if (qtyInputs?.length) {
                    qtyInputs.forEach(i => { i.value = 9999999; });
                    qtyInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
        showImPopup(btn, listings, false);
    }

    function getItemIdFromWrapper(rowWrapper) {
        // Try aria-controls (headlessui-tabs-panel-{itemId}-…)
        const ctrl = rowWrapper.querySelector('[aria-controls]');
        if (ctrl) { const m = (ctrl.getAttribute('aria-controls') || '').match(/-(\d+)-/); if (m) return m[1]; }
        // Try image src
        const img = rowWrapper.querySelector('[class*="viewInfoButton"] img, [class*="itemImage"] img');
        if (img) { const m = (img.src || '').match(/\/(\d+)\//); if (m) return m[1]; }
        return null;
    }

    function addImFillButton(priceWrapper, itemId) {
        if (priceWrapper.querySelector('.sk-pf-im-btn') || priceWrapper.dataset.skPfDone) return;
        const priceInputs = [...priceWrapper.querySelectorAll('input.input-money')];
        if (!priceInputs.length) return;
        priceWrapper.dataset.skPfDone = '1';

        const rowEl = priceWrapper.closest('[class*="itemRowWrapper"]') || priceWrapper.closest('li');
        const qtyInputs = rowEl ? [...rowEl.querySelectorAll('[class*="amountInput"] input.input-money')] : [];

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sk-pf-im-btn';
        btn.textContent = 'Fill';
        btn.title = 'Fill price from cheapest Item Market listing';
        btn.style.cssText = `cursor:pointer;background:#2a4a7f;color:#fff;border:none;
            padding:0 8px;border-radius:3px;font-size:11px;height:26px;line-height:26px;
            margin-right:4px;vertical-align:middle;flex-shrink:0;transition:background 0.15s;`;
        btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('sk-pf-im-active')) btn.style.background = '#3a6abf'; });
        btn.addEventListener('mouseleave', () => { if (!btn.classList.contains('sk-pf-im-active')) btn.style.background = '#2a4a7f'; });
        btn.addEventListener('click', e => handleImFill(e, itemId, priceInputs, qtyInputs));

        const group = priceWrapper.querySelector('.input-money-group') || priceWrapper;
        group.style.display = 'flex';
        group.style.alignItems = 'center';
        group.prepend(btn);
    }

    function processImPage() {
        document.querySelectorAll('[class*="priceInputWrapper"]:not([data-sk-pf-done])').forEach(wrapper => {
            const row = wrapper.closest('[class*="itemRowWrapper"]');
            if (!row) return;
            const itemId = getItemIdFromWrapper(row);
            if (!itemId) return;
            addImFillButton(wrapper, itemId);
        });
    }

    function isOnItemMarket() {
        return window.location.href.includes('page.php?sid=ItemMarket') ||
            window.location.href.includes('imarket.php');
    }

    function isOnBazaar() {
        return window.location.href.includes('bazaar.php');
    }

    function setupImObserver() {
        processImPage();
        let tries = 0;
        const poll = setInterval(() => { processImPage(); if (++tries >= 30) clearInterval(poll); }, 500);
        const root = document.getElementById('item-market-root') ||
            document.querySelector('[class*="itemMarket"]') ||
            document.body;
        if (pageObserver) pageObserver.disconnect();
        pageObserver = new MutationObserver(() => processImPage());
        pageObserver.observe(root, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------------
    // Module lifecycle
    // -------------------------------------------------------------------------
    return {
        isEnabled: false,

        async init() {
            console.log('[PriceFiller] Init...');
            await loadPrefs();

            // Read enabled flag from sidekick_settings['price-filler']
            const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
            this.isEnabled = settings?.['price-filler']?.isEnabled === true;

            if (this.isEnabled) this.enable();
            console.log('[PriceFiller] Init done, enabled:', this.isEnabled);
        },

        enable() {
            this.isEnabled = true;
            maybeRefreshItems();

            if (isOnBazaar()) {
                setupBazaarObserver();
            }

            if (isOnItemMarket()) {
                ensureImPopup();
                setupImObserver();
            }
        },

        disable() {
            this.isEnabled = false;
            bazaarObserver?.disconnect();
            bazaarObserver = null;
            pageObserver?.disconnect();
            pageObserver = null;
            document.getElementById('sk-pf-im-popup')?.remove();
            document.getElementById('sk-pf-bazaar-styles')?.remove();
        }
    };
})();

if (!window.SidekickModules) window.SidekickModules = {};
window.SidekickModules.PriceFiller = PriceFillerModule;
console.log('[PriceFiller] Module registered');
