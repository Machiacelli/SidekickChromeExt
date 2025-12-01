/**
 * Vault Tracker Module for Sidekick Chrome Extension - SIMPLIFIED VERSION
 * Reads actual vault balances directly from the vault page
 * No complex transaction tracking - just show the real numbers
 */

(function(){
    'use strict';

    if (!window.SidekickModules) window.SidekickModules = {};
    if (window.SidekickModules.VaultTracker) return;

    const STORAGE_KEY = 'sidekick_vault_data_v2';

    function formatMoney(n){ 
        const sign = n<0?'-':''; 
        return sign + '$' + Math.abs(n).toLocaleString(); 
    }

    // Simple data store
    const VaultData = {
        data: {
            playerName: null,
            playerId: null,
            spouseName: null,
            spouseId: null,
            yourBalance: 0,
            spouseBalance: 0,
            totalVault: 0,
            lastSync: null
        },

        async load(){
            try{
                const raw = await window.SidekickModules.Core.ChromeStorage.get(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    this.data = { ...this.data, ...parsed };
                }
            }catch(err){ 
                console.error('[VaultTracker] Load failed', err); 
            }
        },

        async save(){
            try{
                await window.SidekickModules.Core.ChromeStorage.set(STORAGE_KEY, JSON.stringify(this.data));
            }catch(err){ 
                console.error('[VaultTracker] Save failed', err); 
            }
        },

        async updateFromVaultPage(){
            console.log('[VaultTracker] Reading balances from vault page...');
            
            // Check if we're on the vault page
            const vaultWrap = document.querySelector('.vault-wrap');
            if (!vaultWrap) {
                console.log('[VaultTracker] Not on vault page');
                return false;
            }

            // Read the actual vault total from the page
            const vaultTotalElement = document.querySelector('.vault-wrap .cont-gray .desc .bold');
            if (vaultTotalElement) {
                const totalText = vaultTotalElement.textContent.trim();
                this.data.totalVault = parseInt(totalText.replace(/[^0-9]/g, ''), 10) || 0;
                console.log('[VaultTracker] Total vault:', this.data.totalVault);
            }

            // Read individual balances from the balance list
            const balanceItems = document.querySelectorAll('.vault-wrap .user-info-list-wrap li');
            console.log('[VaultTracker] Found', balanceItems.length, 'balance items');
            
            for (const item of balanceItems) {
                const nameLink = item.querySelector('a.user.name');
                if (!nameLink) continue;

                const userName = nameLink.textContent.trim();
                const userIdMatch = nameLink.href.match(/XID=(\d+)/);
                const userId = userIdMatch ? parseInt(userIdMatch[1], 10) : null;

                const balanceSpan = item.querySelector('.desc');
                if (!balanceSpan) continue;

                const balanceText = balanceSpan.textContent.trim();
                const balance = parseInt(balanceText.replace(/[^0-9]/g, ''), 10) || 0;

                console.log('[VaultTracker] Found user:', userName, 'ID:', userId, 'Balance:', balance);

                // Check if this is the player (will fetch from API)
                if (!this.data.playerName || !this.data.playerId) {
                    // Assume first one is the player for now, will be corrected by API
                    this.data.playerName = userName;
                    this.data.playerId = userId;
                    this.data.yourBalance = balance;
                    console.log('[VaultTracker] Assumed player:', userName);
                } else if (userId === this.data.playerId) {
                    this.data.yourBalance = balance;
                    console.log('[VaultTracker] Updated YOUR balance:', balance);
                } else {
                    // This is the spouse
                    this.data.spouseName = userName;
                    this.data.spouseId = userId;
                    this.data.spouseBalance = balance;
                    console.log('[VaultTracker] Updated SPOUSE balance:', balance);
                }
            }

            this.data.lastSync = new Date().toISOString();
            await this.save();
            console.log('[VaultTracker] Sync complete:', this.data);
            return true;
        },

        async fetchPlayerInfo(){
            try {
                console.log('[VaultTracker] Fetching player info from API...');
                const response = await window.SidekickModules.Core.SafeMessageSender.sendMessage({
                    action: 'fetchTornApi',
                    selections: ['profile']
                });

                if (response && response.success && response.profile) {
                    const oldPlayerId = this.data.playerId;
                    const newPlayerId = response.profile.player_id;
                    const newPlayerName = response.profile.name;

                    console.log('[VaultTracker] API returned:', newPlayerName, newPlayerId);

                    // If we already have data and the player ID changed, we need to swap
                    if (oldPlayerId && oldPlayerId !== newPlayerId && this.data.playerName) {
                        console.log('[VaultTracker] Player ID mismatch! Swapping balances...');
                        // The person we thought was the player is actually the spouse
                        const tempBalance = this.data.yourBalance;
                        const tempName = this.data.playerName;
                        const tempId = this.data.playerId;

                        this.data.playerName = newPlayerName;
                        this.data.playerId = newPlayerId;
                        this.data.yourBalance = this.data.spouseBalance;
                        
                        this.data.spouseName = tempName;
                        this.data.spouseId = tempId;
                        this.data.spouseBalance = tempBalance;
                    } else {
                        this.data.playerName = newPlayerName;
                        this.data.playerId = newPlayerId;
                    }

                    await this.save();
                    console.log('[VaultTracker] Player info updated:', this.data.playerName);
                    return true;
                }
            } catch (err) {
                console.error('[VaultTracker] Failed to fetch player info:', err);
            }
            return false;
        }
    };

    // Main module
    const VaultTracker = {
        version: '0.2.0',
        name: 'VaultTracker',
        initDone: false,
        _panel: null,
        _windowState: null,

        async init(){
            if (this.initDone) return;
            console.log('[VaultTracker] Initializing...');
            
            await VaultData.load();
            await this.loadWindowState();
            
            // Fetch player info from API
            await VaultData.fetchPlayerInfo();
            
            // If we're on the vault page, sync immediately
            if (window.location.href.includes('properties.php') && window.location.href.includes('vault')) {
                setTimeout(async () => {
                    await VaultData.updateFromVaultPage();
                    if (this._panel) await this.renderPanel();
                }, 1000);
            }
            
            // Restore window if it was open
            if (this._windowState && this._windowState.wasCreated) {
                console.log('[VaultTracker] Restoring window');
                await this.setupUI();
                await this.renderPanel();
            }
            
            this.initDone = true;
            console.log('[VaultTracker] Ready');
        },

        async loadWindowState() {
            try {
                const raw = await window.SidekickModules.Core.ChromeStorage.get('sidekick_vault_window_state');
                if (raw) {
                    this._windowState = JSON.parse(raw);
                } else {
                    this._windowState = {
                        x: 10, y: 10,
                        width: 320, height: 240,
                        pinned: false,
                        wasCreated: false
                    };
                }
            } catch (e) {
                console.error('[VaultTracker] Failed to load window state', e);
                this._windowState = { x: 10, y: 10, width: 320, height: 240, pinned: false, wasCreated: false };
            }
        },

        async saveWindowState() {
            try {
                await window.SidekickModules.Core.ChromeStorage.set(
                    'sidekick_vault_window_state',
                    JSON.stringify(this._windowState)
                );
            } catch (e) {
                console.error('[VaultTracker] Failed to save window state', e);
            }
        },

        async setupUI(){
            if (this._panel) return;
            
            const root = document.querySelector('#sidekick-content');
            if (!root) {
                console.warn('[VaultTracker] Could not find #sidekick-content');
                return;
            }

            const contentWidth = root.clientWidth || 400;
            const contentHeight = root.clientHeight || 500;
            
            const width = Math.min(Math.max(this._windowState.width, 200), contentWidth - 20);
            const height = Math.min(Math.max(this._windowState.height, 200), contentHeight - 40);
            const x = Math.min(Math.max(this._windowState.x, 0), contentWidth - width);
            const y = Math.min(Math.max(this._windowState.y, 0), contentHeight - height);
            
            this._windowState = { ...this._windowState, x, y, width, height, wasCreated: true };

            const container = document.createElement('div');
            container.id = 'sidekick-vault-tracker';
            container.className = 'movable-notepad';
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
                min-width: 200px;
                min-height: 200px;
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
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                        <span style="font-size: 11px; font-weight: 600; color: #fff;">Vault Tracker</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 3px; min-width: 32px; flex-shrink: 0;">
                        <div class="vault-dropdown" style="position: relative;">
                            <button class="dropdown-btn" style="
                                background: none;
                                border: none;
                                color: rgba(255,255,255,0.8);
                                cursor: pointer;
                                font-size: 10px;
                                padding: 1px 3px;
                                border-radius: 2px;
                                transition: background 0.2s;
                            " title="Options">⚙️</button>
                            <div class="dropdown-content" style="
                                display: none;
                                position: absolute;
                                background: #333;
                                min-width: 140px;
                                box-shadow: 0px 8px 16px rgba(0,0,0,0.3);
                                z-index: 1001;
                                border-radius: 4px;
                                border: 1px solid #555;
                                top: 100%;
                                right: 0;
                            ">
                                <button class="vault-sync-option" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">🔄 Sync from Vault</button>
                                <button class="vault-clear-option" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">🗑️ Clear Data</button>
                                <button class="vault-pin-option" style="
                                    background: none;
                                    border: none;
                                    color: #fff;
                                    padding: 8px 12px;
                                    width: 100%;
                                    text-align: left;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">${this._windowState.pinned ? '📌 Unpin' : '📌 Pin'}</button>
                            </div>
                        </div>
                        <button class="close-btn" style="
                            background: #dc3545;
                            border: none;
                            color: #fff;
                            cursor: pointer;
                            font-size: 14px;
                            width: 16px;
                            height: 16px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            line-height: 1;
                            padding: 0;
                        " title="Close">×</button>
                    </div>
                </div>
                <div id="sidekick-vault-values" style="
                    flex: 1;
                    overflow: auto;
                    padding: 12px;
                    color: #fff;
                    font-family: Arial, sans-serif;
                "></div>
            `;

            root.appendChild(container);
            this._panel = container;

            this.attachWindowControls(container);
            this.makeDraggable(container);
            this.makeResizable(container);
            
            await this.saveWindowState();
        },

        attachWindowControls(element){
            const dropdownBtn = element.querySelector('.dropdown-btn');
            const dropdownContent = element.querySelector('.dropdown-content');
            const syncOption = element.querySelector('.vault-sync-option');
            const clearOption = element.querySelector('.vault-clear-option');
            const pinOption = element.querySelector('.vault-pin-option');
            const closeBtn = element.querySelector('.close-btn');

            // Dropdown toggle
            if (dropdownBtn && dropdownContent) {
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
                });

                document.addEventListener('click', (e) => {
                    if (!element.contains(e.target)) {
                        dropdownContent.style.display = 'none';
                    }
                });
            }

            // Sync option
            if (syncOption) {
                syncOption.addEventListener('mouseenter', () => syncOption.style.background = 'rgba(255,255,255,0.1)');
                syncOption.addEventListener('mouseleave', () => syncOption.style.background = 'none');
                syncOption.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    dropdownContent.style.display = 'none';
                    
                    const success = await VaultData.updateFromVaultPage();
                    if (success) {
                        await this.renderPanel();
                        alert('Vault data synced successfully!');
                    } else {
                        alert('Please open the vault page (Properties → Vault) and try again.');
                    }
                });
            }

            // Clear option
            if (clearOption) {
                clearOption.addEventListener('mouseenter', () => clearOption.style.background = 'rgba(255,255,255,0.1)');
                clearOption.addEventListener('mouseleave', () => clearOption.style.background = 'none');
                clearOption.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    dropdownContent.style.display = 'none';
                    
                    if (confirm('Clear all vault data?')) {
                        VaultData.data = {
                            playerName: null,
                            playerId: null,
                            spouseName: null,
                            spouseId: null,
                            yourBalance: 0,
                            spouseBalance: 0,
                            totalVault: 0,
                            lastSync: null
                        };
                        await VaultData.save();
                        await this.renderPanel();
                    }
                });
            }

            // Pin option
            if (pinOption) {
                pinOption.addEventListener('mouseenter', () => pinOption.style.background = 'rgba(255,255,255,0.1)');
                pinOption.addEventListener('mouseleave', () => pinOption.style.background = 'none');
                pinOption.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownContent.style.display = 'none';
                    
                    this._windowState.pinned = !this._windowState.pinned;
                    pinOption.textContent = this._windowState.pinned ? '📌 Unpin' : '📌 Pin';
                    element.style.resize = this._windowState.pinned ? 'none' : 'both';
                    element.querySelector('.vault-header').style.cursor = this._windowState.pinned ? 'default' : 'move';
                    this.saveWindowState();
                });
            }

            // Close button
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.cleanup());
            }
        },

        makeDraggable(element){
            const header = element.querySelector('.vault-header');
            let isDragging = false;
            let currentX, currentY, initialX, initialY;

            header.addEventListener('mousedown', (e) => {
                if (this._windowState.pinned) return;
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                
                isDragging = true;
                initialX = e.clientX - this._windowState.x;
                initialY = e.clientY - this._windowState.y;
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                this._windowState.x = currentX;
                this._windowState.y = currentY;
                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    this.saveWindowState();
                }
            });
        },

        makeResizable(element){
            const observer = new ResizeObserver(() => {
                this._windowState.width = element.offsetWidth;
                this._windowState.height = element.offsetHeight;
                this.saveWindowState();
            });
            observer.observe(element);
        },

        async renderPanel(){
            if (!this._panel) return;
            
            const values = this._panel.querySelector('#sidekick-vault-values');
            if (!values) return;

            const data = VaultData.data;
            
            if (!data.lastSync) {
                values.innerHTML = `
                    <div style="display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;height:100%;text-align:center;">
                        <div style="font-size:32px;opacity:0.3;">🏦</div>
                        <div style="font-size:12px;opacity:0.7;line-height:1.5;">
                            No vault data yet.<br><br>
                            Go to Properties → Vault<br>
                            Then click ⚙️ → Sync from Vault
                        </div>
                    </div>
                `;
                return;
            }

            const lastSyncDate = new Date(data.lastSync);
            const timeAgo = Math.floor((Date.now() - lastSyncDate.getTime()) / 1000 / 60); // minutes ago

            values.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(0,0,0,0.3);border-radius:4px;">
                        <div>
                            <div style="font-size:11px;opacity:0.7;">YOU</div>
                            <div style="font-size:10px;opacity:0.5;">${data.playerName || 'Unknown'}</div>
                        </div>
                        <div style="font-weight:700;font-size:16px;color:#7ED321;">${formatMoney(data.yourBalance)}</div>
                    </div>
                    
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(0,0,0,0.3);border-radius:4px;">
                        <div>
                            <div style="font-size:11px;opacity:0.7;">SPOUSE</div>
                            <div style="font-size:10px;opacity:0.5;">${data.spouseName || 'Unknown'}</div>
                        </div>
                        <div style="font-weight:700;font-size:16px;color:#7ED321;">${formatMoney(data.spouseBalance)}</div>
                    </div>
                    
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(74,111,165,0.2);border-radius:4px;border:1px solid rgba(74,111,165,0.4);">
                        <div style="font-size:12px;font-weight:600;">TOTAL VAULT</div>
                        <div style="font-weight:700;font-size:16px;">${formatMoney(data.totalVault)}</div>
                    </div>
                    
                    <div style="text-align:center;font-size:9px;opacity:0.5;margin-top:4px;">
                        Last sync: ${timeAgo < 1 ? 'just now' : timeAgo + ' min ago'}
                    </div>
                </div>
            `;
        },

        async cleanup(){
            if (this._panel) {
                this._panel.remove();
                this._panel = null;
            }
            if (this._windowState) {
                this._windowState.wasCreated = false;
                await this.saveWindowState();
            }
        }
    };

    window.SidekickModules.VaultTracker = VaultTracker;
    console.log('[VaultTracker] Module loaded (v0.2.0 - Simplified)');

})();
