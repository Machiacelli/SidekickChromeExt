/**
 * Vault Tracker Module for Sidekick Chrome Extension
 * Maintains a persistent local ledger of vault transactions and shows live balances
 * Adapted from userscript to Chrome extension architecture
 */

(function(){
    'use strict';

    // Namespace guard
    if (!window.SidekickModules) window.SidekickModules = {};
    if (window.SidekickModules.VaultTracker) return; // already loaded

    const STORAGE_KEY = 'sidekick_vault_ledger_v1';
    const SETTINGS_KEY = 'sidekick_vault_settings_v1';

    // Utility helpers
    function now() { return Math.floor(Date.now()/1000); }
    function safeInt(v){ const n = parseInt(String(v).replace(/[^0-9-]/g,''),10); return Number.isNaN(n)?0:n; }
    function formatMoney(n){ const sign = n<0?'-':''; return sign + '$' + Math.abs(n).toLocaleString(); }

    // Ledger model
    const Ledger = {
        data: {
            transactions: {}, // id -> transaction object
            order: [], // list of ids in chronological order (oldest -> newest)
            balances: { you: 0, spouse: 0, total: 0 },
            lastChange: null // {id, amount, who, timestamp}
        },

        async load(){
            try{
                const raw = await window.SidekickModules.Core.ChromeStorage.get(STORAGE_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                // Basic validation
                if (parsed && parsed.transactions && parsed.order) {
                    this.data = parsed;
                }
            }catch(err){ console.error('[Sidekick] VaultLedger.load failed', err); }
        },
        
        async save(){
            try{ 
                await window.SidekickModules.Core.ChromeStorage.set(STORAGE_KEY, JSON.stringify(this.data)); 
            } catch(e){ 
                console.error('[Sidekick] VaultLedger.save failed', e); 
            }
        },

        // Add or replace transaction by id. tx must include: id, timestamp (unix), userId, name, type('Deposit'|'Withdraw'), amount (positive int)
        async addTransaction(tx){
            if (!tx || !tx.id) return false;
            const id = String(tx.id);
            const exists = !!this.data.transactions[id];
            // Normalize
            const t = {
                id: id,
                timestamp: tx.timestamp || now(),
                userId: tx.userId || null,
                name: tx.name || 'Unknown',
                type: tx.type || 'Deposit',
                amount: Math.abs(safeInt(tx.amount)),
                raw: tx.raw || null
            };

            this.data.transactions[id] = t;
            if (!exists) this.data.order.push(id);

            // Keep order sorted by timestamp (stable)
            this.data.order.sort((a,b)=> this.data.transactions[a].timestamp - this.data.transactions[b].timestamp);

            // Recompute balances
            await this.recomputeBalances();
            this.data.lastChange = { id: id, amount: (t.type==='Deposit'?t.amount:-t.amount), who: t.name, timestamp: t.timestamp };
            await this.save();
            return true;
        },

        async recomputeBalances(){
            // Reset
            let you = 0, spouse = 0;
            const settings = await VaultTracker.settings();
            const myName = settings.playerName || null;
            const spouseName = settings.spouseName || null;

            for (const id of this.data.order){
                const t = this.data.transactions[id];
                const signed = (t.type==='Deposit')? t.amount : -t.amount;
                // Decide who this applies to
                if (t.name && myName && t.name === myName) you += signed;
                else if (t.name && spouseName && t.name === spouseName) spouse += signed;
                else {
                    // If unknown, attribute by userId if possible (settings may include spouseId)
                    if (t.userId && settings.spouseId && Number(t.userId) === Number(settings.spouseId)) spouse += signed;
                    else if (t.userId && settings.playerId && Number(t.userId) === Number(settings.playerId)) you += signed;
                    else {
                        // Fallback: treat as "other" contribution to total only (we'll add to total later)
                    }
                }
            }

            this.data.balances.you = you;
            this.data.balances.spouse = spouse;
            this.data.balances.total = you + spouse;
        },

        getBalances(){ return this.data.balances; },
        getLastChange(){ return this.data.lastChange; },
        async clear(){ 
            this.data = { transactions: {}, order: [], balances: { you:0, spouse:0, total:0 }, lastChange: null }; 
            await this.save(); 
        }
    };

    // Vault Tracker core
    const VaultTracker = {
        version: '0.1.0',
        name: 'VaultTracker',
        description: 'Track vault transactions and balances',
        initDone: false,
        _wsHooked: false,
        _panel: null,
        _windowState: null,

        async settings(data){
            if (!data){
                // read
                const raw = await window.SidekickModules.Core.ChromeStorage.get(SETTINGS_KEY);
                if (!raw) return { playerName: null, playerId: null, spouseName: null, spouseId: null };
                try{ return JSON.parse(raw); } catch(e){ return { playerName:null, playerId:null, spouseName:null, spouseId:null }; }
            }
            await window.SidekickModules.Core.ChromeStorage.set(SETTINGS_KEY, JSON.stringify(data));
            return data;
        },

        async init(){
            if (this.initDone) return;
            console.log('[Sidekick] VaultTracker: Initializing...');
            await Ledger.load();
            await this.loadWindowState();
            
            // Only create UI if it was previously visible
            if (this._windowState.isVisible) {
                this.setupUI();
                await this.renderPanel();
                console.log('[Sidekick] VaultTracker: Window restored from previous session');
            } else {
                console.log('[Sidekick] VaultTracker: Window hidden (not visible in previous session)');
            }
            
            this.hookWebSocket();
            this.attachVaultPageSync();
            this.initDone = true;
            console.log('[Sidekick] VaultTracker: Started');
        },

        async loadWindowState() {
            try {
                const raw = await window.SidekickModules.Core.ChromeStorage.get('sidekick_vault_window_state');
                if (raw) {
                    this._windowState = JSON.parse(raw);
                } else {
                    // Default window state
                    this._windowState = {
                        x: 10,
                        y: 10,
                        width: 320,
                        height: 280,
                        pinned: false,
                        isVisible: false
                    };
                }
            } catch (e) {
                console.warn('[Sidekick] VaultTracker: Failed to load window state', e);
                this._windowState = { x: 10, y: 10, width: 320, height: 280, pinned: false, isVisible: false };
            }
        },

        async saveWindowState() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set(
                    'sidekick_vault_window_state',
                    JSON.stringify(this._windowState)
                );
            } catch (e) {
                console.warn('[Sidekick] VaultTracker: Failed to save window state', e);
            }
        },

        // UI: simple modern panel in the sidekick content area
        setupUI(){
            try{
                // If window already exists, don't recreate
                if (this._panel) {
                    console.log('[Sidekick] VaultTracker: Window already exists');
                    return;
                }
                
                const root = document.querySelector('#sidekick-content');
                if (!root) {
                    console.warn('[Sidekick] VaultTracker: Could not find #sidekick-content');
                    return;
                }
                
                const contentWidth = root.clientWidth || 400;
                const contentHeight = root.clientHeight || 500;
                
                // Clamp window dimensions and position
                const width = Math.min(Math.max(this._windowState.width, 280), contentWidth - 20);
                const height = Math.min(Math.max(this._windowState.height, 240), contentHeight - 40);
                const x = Math.min(Math.max(this._windowState.x, 0), contentWidth - width);
                const y = Math.min(Math.max(this._windowState.y, 0), contentHeight - height);
                
                // Update state with clamped values
                this._windowState = { ...this._windowState, x, y, width, height };
                
                // Create movable window container
                const container = document.createElement('div');
                container.id = 'sidekick-vault-tracker';
                container.className = 'movable-notepad'; // Use same class for consistency
                container.style.cssText = `
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
                    min-width: 280px;
                    min-height: 240px;
                    z-index: 1000;
                    resize: ${this._windowState.pinned ? 'none' : 'both'};
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                `;

                container.innerHTML = `
                    <div class="vault-header" style="
                        background: linear-gradient(135deg, #4a6fa5, #364f7a);
                        border-bottom: 1px solid #555;
                        padding: 4px 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: ${this._windowState.pinned ? 'default' : 'move'};
                        height: 24px;
                        flex-shrink: 0;
                        border-radius: 5px 5px 0 0;
                        user-select: none;
                    ">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                            <span style="font-size: 11px; font-weight: 600; color: #fff;">🏦 Vault Tracker</span>
                            <span style="font-size: 9px; opacity: 0.7; color: #fff;">v${this.version}</span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <button class="pin-btn" style="
                                background: none;
                                border: none;
                                color: rgba(255,255,255,0.8);
                                cursor: pointer;
                                font-size: 10px;
                                padding: 1px 3px;
                                border-radius: 2px;
                                transition: background 0.2s;
                            " title="${this._windowState.pinned ? 'Unpin' : 'Pin'}">${this._windowState.pinned ? '📌' : '📍'}</button>
                            <button class="close-btn" style="
                                background: none;
                                border: none;
                                color: rgba(255,255,255,0.8);
                                cursor: pointer;
                                font-size: 12px;
                                padding: 0 3px;
                                border-radius: 2px;
                                line-height: 1;
                                transition: background 0.2s;
                            " title="Close">×</button>
                        </div>
                    </div>
                    <div id="sidekick-vault-values" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 10px;
                        color: #fff;
                        font-family: Arial, Helvetica, sans-serif;
                    "></div>
                `;

                // Insert into content area
                root.appendChild(container);

                // Save reference
                this._panel = container;
                
                // Make window draggable (only if not pinned)
                this.makeDraggable(container);
                
                // Add resize observer
                this.addResizeObserver(container);
                
                // Add button handlers
                this.attachWindowControls(container);
                
                // Mark as visible and save state
                this._windowState.isVisible = true;
                this.saveWindowState();
                
                console.log('[Sidekick] VaultTracker: UI created');
            }catch(err){ console.error('[Sidekick] VaultTracker.setupUI failed', err); }
        },

        makeDraggable(element) {
            const header = element.querySelector('.vault-header');
            let isDragging = false;
            let currentX, currentY, initialX, initialY;

            const dragStart = (e) => {
                if (this._windowState.pinned) return;
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
                
                isDragging = true;
                initialX = e.clientX - this._windowState.x;
                initialY = e.clientY - this._windowState.y;
                
                element.style.zIndex = '10000';
            };

            const drag = (e) => {
                if (!isDragging) return;
                e.preventDefault();

                const contentArea = document.getElementById('sidekick-content');
                const contentWidth = contentArea ? contentArea.clientWidth : 400;
                const contentHeight = contentArea ? contentArea.clientHeight : 500;
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                // Clamp to content area bounds
                const maxX = contentWidth - element.offsetWidth;
                const maxY = contentHeight - element.offsetHeight;
                
                currentX = Math.max(0, Math.min(currentX, maxX));
                currentY = Math.max(0, Math.min(currentY, maxY));

                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
                
                this._windowState.x = currentX;
                this._windowState.y = currentY;
            };

            const dragEnd = () => {
                if (isDragging) {
                    isDragging = false;
                    element.style.zIndex = '1000';
                    this.saveWindowState();
                }
            };

            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        },

        addResizeObserver(element) {
            const resizeObserver = new ResizeObserver(() => {
                if (!this._windowState.pinned) {
                    this._windowState.width = element.offsetWidth;
                    this._windowState.height = element.offsetHeight;
                    this.saveWindowState();
                }
            });
            resizeObserver.observe(element);
        },

        attachWindowControls(element) {
            const pinBtn = element.querySelector('.pin-btn');
            const closeBtn = element.querySelector('.close-btn');

            pinBtn.addEventListener('click', () => {
                this._windowState.pinned = !this._windowState.pinned;
                pinBtn.textContent = this._windowState.pinned ? '📌' : '📍';
                pinBtn.title = this._windowState.pinned ? 'Unpin' : 'Pin';
                element.style.resize = this._windowState.pinned ? 'none' : 'both';
                element.querySelector('.vault-header').style.cursor = this._windowState.pinned ? 'default' : 'move';
                this.saveWindowState();
            });

            closeBtn.addEventListener('click', () => {
                this.cleanup();
            });
        },

        async renderPanel(){
            if (!this._panel) return;
            const values = this._panel.querySelector('#sidekick-vault-values');
            if (!values) return;

            const bal = Ledger.getBalances();
            const last = Ledger.getLastChange();
            const delta = last ? last.amount : 0;
            const deltaSign = delta>0 ? '+' : (delta<0 ? '-' : '');
            const deltaColor = delta>0 ? '#7ED321' : (delta<0 ? '#FF5C5C' : '#999');
            const lastWho = last ? last.who : '';

            values.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;">
                        <div style="font-size:12px;opacity:0.9;">You</div>
                        <div style="font-weight:700;font-size:14px;">${formatMoney(bal.you)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;">
                        <div style="font-size:12px;opacity:0.9;">Spouse</div>
                        <div style="font-weight:700;font-size:14px;">${formatMoney(bal.spouse)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(74,111,165,0.2);border-radius:4px;border:1px solid rgba(74,111,165,0.3);">
                        <div style="font-size:12px;font-weight:600;">Total</div>
                        <div style="font-weight:700;font-size:14px;">${formatMoney(bal.total)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding:6px;background:rgba(0,0,0,0.15);border-radius:4px;">
                        <div style="font-size:11px;color:#ccc;">Last change</div>
                        <div style="font-weight:700;font-size:12px;color:${deltaColor};">
                            ${delta!==0?deltaSign+formatMoney(Math.abs(delta)): '—'} 
                            <span style="font-weight:400;color:#bbb;font-size:10px;margin-left:4px;">${lastWho?lastWho:''}</span>
                        </div>
                    </div>
                    <div style="margin-top:8px;display:flex;gap:6px;">
                        <button id="sidekick-vault-sync-btn" style="
                            flex:1;
                            padding:8px;
                            border-radius:4px;
                            border:1px solid rgba(255,255,255,0.1);
                            background:rgba(74,111,165,0.3);
                            color:#fff;
                            cursor:pointer;
                            font-size:11px;
                            font-weight:500;
                            transition: all 0.2s;
                        ">Sync from Vault</button>
                        <button id="sidekick-vault-clear-btn" style="
                            padding:8px 12px;
                            border-radius:4px;
                            border:1px solid rgba(255,255,255,0.1);
                            background:rgba(255,255,255,0.05);
                            color:#fff;
                            cursor:pointer;
                            font-size:11px;
                            transition: all 0.2s;
                        ">Clear</button>
                    </div>
                </div>
            `;

            // attach handlers
            const syncBtn = this._panel.querySelector('#sidekick-vault-sync-btn');
            const clearBtn = this._panel.querySelector('#sidekick-vault-clear-btn');
            
            if (syncBtn) {
                syncBtn.onmouseenter = () => syncBtn.style.background = 'rgba(74,111,165,0.5)';
                syncBtn.onmouseleave = () => syncBtn.style.background = 'rgba(74,111,165,0.3)';
                syncBtn.onclick = ()=> this.syncFromVaultPage(true);
            }
            
            if (clearBtn) {
                clearBtn.onmouseenter = () => clearBtn.style.background = 'rgba(255,255,255,0.1)';
                clearBtn.onmouseleave = () => clearBtn.style.background = 'rgba(255,255,255,0.05)';
                clearBtn.onclick = async ()=> { 
                    if (confirm('Clear local vault ledger?')) { 
                        await Ledger.clear(); 
                        await this.renderPanel(); 
                    } 
                };
            }
        },

        // Hook into WebSocket messages to capture live vault events
        hookWebSocket(){
            if (this._wsHooked) return;
            try{
                const OriginalWebSocket = window.WebSocket;
                // Proxy constructor
                const self = this;
                function WSProxy(url, protocols){
                    const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

                    // Attach our listener
                    ws.addEventListener('message', function(evt){
                        try{ self.handleSocketMessage(evt.data); } catch(e){ /* swallow */ }
                    });

                    return ws;
                }
                WSProxy.prototype = OriginalWebSocket.prototype; // keep prototype chain
                window.WebSocket = WSProxy;
                this._wsHooked = true;
                console.log('[Sidekick] VaultTracker: WebSocket hooked');
            }catch(err){ console.warn('[Sidekick] VaultTracker.hookWebSocket failed', err); }
        },

        // Heuristic parser for websocket messages - tries to find vault-related payloads
        async handleSocketMessage(data){
            if (!data) return;
            // Many messages are text JSON; try parse
            let parsed = null;
            try{ parsed = JSON.parse(data); } catch(e){ parsed = null; }
            // If parsed and contains likely keys, process
            if (parsed){
                // Example heuristics - adapt to real format if known
                if (parsed.type && parsed.type.toString().toLowerCase().includes('vault')){
                    // structure may differ; look for transaction
                    const tx = this.extractTxFromPayload(parsed);
                    if (tx) { await Ledger.addTransaction(tx); await this.renderPanel(); }
                } else {
                    // fallback: scan for nested objects containing "transaction" or "vault"
                    const txt = JSON.stringify(parsed).toLowerCase();
                    if (txt.includes('vault') || txt.includes('transaction') || txt.includes('property')){
                        const tx = this.extractTxFromPayload(parsed);
                        if (tx) { await Ledger.addTransaction(tx); await this.renderPanel(); }
                    }
                }
            }
        },

        // Attempt to extract transaction from parsed websocket payload
        extractTxFromPayload(obj){
            try{
                // Common candidate paths
                // payload.transaction
                if (obj.transaction && typeof obj.transaction === 'object'){
                    const t = obj.transaction;
                    return {
                        id: t.id || t.transaction_id || t.txid || (t.timestamp?('tx_'+t.timestamp):null),
                        timestamp: t.timestamp || (t.time?Math.floor(new Date(t.time).getTime()/1000):now()),
                        userId: t.userId || t.userid || t.user_id || (t.player && t.player.id),
                        name: t.name || t.player?.name || t.user || (t.player && t.player.username) || null,
                        type: (t.type||t.action||'deposit').toString().toLowerCase().includes('withdraw')? 'Withdraw' : 'Deposit',
                        amount: t.amount || t.value || Math.abs(safeInt(t.change)) || 0,
                        raw: obj
                    };
                }

                // payload.data.transactions[] style
                if (obj.data && Array.isArray(obj.data.transactions) && obj.data.transactions.length){
                    const t = obj.data.transactions[0];
                    return {
                        id: t.id || null,
                        timestamp: t.timestamp || now(),
                        userId: t.userId || t.userid || null,
                        name: t.name || t.username || null,
                        type: (t.type||'deposit').toString().toLowerCase().includes('withdraw')? 'Withdraw':'Deposit',
                        amount: t.amount || t.value || 0,
                        raw: obj
                    };
                }

                // Try scanning for numeric amount + username heuristics
                // Walk object keys shallowly
                for (const k in obj){
                    const v = obj[k];
                    if (v && typeof v === 'object'){
                        const candidate = this.extractTxFromPayload(v);
                        if (candidate) return candidate;
                    }
                }

            }catch(e){ console.warn('[Sidekick] VaultTracker extractTxFromPayload error', e); }
            return null;
        },

        // Attach logic that will sync (one-time) by parsing the vault page DOM when user visits properties.php?vault
        attachVaultPageSync(){
            // If user is currently on vault page, run initial sync
            if (window.location.pathname.includes('properties.php') && window.location.href.includes('vault')){
                // schedule a delayed sync to allow page to render
                setTimeout(()=> this.syncFromVaultPage(false), 900);
            }

            // Also observe page changes to detect when user navigates to vault page
            const pageWrap = document.getElementById('properties-page-wrap') || document.body;
            const obs = new MutationObserver((mutations)=>{
                if (window.location.pathname.includes('properties.php') && window.location.href.includes('vault')){
                    this.syncFromVaultPage(false);
                }
            });
            try{ obs.observe(pageWrap, { childList:true, subtree:true }); }
            catch(e){}
        },

        // Parse vault page DOM to extract transactions (one-time full scan). This will only run when user visits vault page.
        async syncFromVaultPage(userTriggered){
            try{
                const wrap = document.querySelector('.vault-trans-wrap');
                if (!wrap){ 
                    if (userTriggered) {
                        if (window.SidekickModules?.Core?.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Vault Tracker', 
                                'Vault page not detected. Open the vault page and retry.', 
                                'error', 
                                3000
                            );
                        } else {
                            alert('Vault page not detected. Open the vault page and retry.');
                        }
                    }
                    return; 
                }

                const listItems = wrap.querySelectorAll('ul li[transaction_id]');
                if (!listItems || !listItems.length){ 
                    if (userTriggered) {
                        if (window.SidekickModules?.Core?.NotificationSystem) {
                            window.SidekickModules.Core.NotificationSystem.show(
                                'Vault Tracker', 
                                'No transactions found on the vault page.', 
                                'warning', 
                                3000
                            );
                        } else {
                            alert('No transactions found on the vault page.');
                        }
                    }
                    return; 
                }

                let added = 0;
                for (const li of listItems){
                    try{
                        const tx = this.parseVaultListItem(li);
                        if (!tx) continue;
                        const addedNow = await Ledger.addTransaction(tx);
                        if (addedNow) added++;
                    }catch(e){ console.error('[Sidekick] VaultTracker syncFromVaultPage parse error', e, li); }
                }
                if (added>0) await this.renderPanel();
                if (userTriggered) {
                    if (window.SidekickModules?.Core?.NotificationSystem) {
                        window.SidekickModules.Core.NotificationSystem.show(
                            'Vault Tracker', 
                            `Vault sync complete. New items added: ${added}`, 
                            'success', 
                            3000
                        );
                    } else {
                        alert('Vault sync complete. New items added: '+added);
                    }
                }
            }catch(err){ console.error('[Sidekick] VaultTracker syncFromVaultPage failed', err); }
        },

        parseVaultListItem(li){
            try{
                const id = li.getAttribute('transaction_id') || li.getAttribute('data-transaction-id') || li.dataset.transactionId || null;
                const dateEl = li.querySelector('.transaction-date');
                const timeEl = li.querySelector('.transaction-time');
                const userLink = li.querySelector('.user.name') || li.querySelector('a.user');
                const typeEl = li.querySelector('.type');
                const amountEl = li.querySelector('.amount');

                let timestamp = now();
                if (dateEl && timeEl){
                    // date format DD/MM/YY
                    const ds = dateEl.innerText.trim().split('/');
                    const ts = timeEl.innerText.trim();
                    if (ds.length===3){
                        const year = 2000 + parseInt(ds[2],10);
                        const month = parseInt(ds[1],10)-1;
                        const day = parseInt(ds[0],10);
                        // time may be HH:MM:SS or HH:MM
                        const tparts = ts.split(':').map(x=>parseInt(x,10));
                        const hour = tparts[0]||0; const min = tparts[1]||0; const sec = tparts[2]||0;
                        timestamp = Math.floor(Date.UTC(year,month,day,hour,min,sec)/1000);
                    }
                }

                const name = userLink ? (userLink.title || userLink.innerText).trim().split(' ')[0] : 'Unknown';
                let userId = null;
                if (userLink && userLink.href){ const m = userLink.href.match(/[?&]XID=(\d+)/i); if (m) userId = parseInt(m[1],10); }

                const type = typeEl ? (typeEl.innerText||'').replace(/[^A-Za-z]/g,'') : 'Deposit';
                const amount = amountEl ? safeInt(amountEl.innerText) : 0;

                if (!id) return null;
                return { id, timestamp, userId, name, type, amount, raw: li.innerText };
            }catch(e){ console.error('[Sidekick] VaultTracker parseVaultListItem fail', e); return null; }
        },

        // Cleanup
        async cleanup(){
            if (this._panel) {
                this._panel.remove();
                this._panel = null;
            }
            // Mark as not visible and save state
            this._windowState.isVisible = false;
            await this.saveWindowState();
            console.log('[Sidekick] VaultTracker: Window closed and state saved');
        }
    };

    // Expose module
    window.SidekickModules.VaultTracker = VaultTracker;
    window.SidekickModules.VaultTracker.Ledger = Ledger;

    console.log('[Sidekick] VaultTracker module loaded');

})();
