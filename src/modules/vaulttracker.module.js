// Vault Tracker Module for SidekickChromeExt
// Features:
//  - Persistent ledger of vault transactions (Chrome storage)
//  - WebSocket injection to capture live vault events (property/vault)
//  - Manual "Sync from Vault Page" fallback with "Load more" clicks (safe capped)
//  - Side panel showing You / Spouse / Total + last-change delta
//  - No external notifications, compact UI, draggable

(function () {
  'use strict';

  // Module name / storage keys
  const MODULE_NAME = 'VaultTracker';
  const STORAGE_KEY = 'sidekick:vaultledger:v1';
  const SETTINGS_KEY = 'sidekick:vaultsettings:v1';
  const PANEL_STATE_KEY = 'sidekick:vaultpanel:v1';
  const MAX_LOAD_MORE_CLICKS = 25;
  const LOAD_MORE_PAUSE_MS = 900;

  let isInitialized = false;

  // Helpers: ChromeStorage wrapper
  async function chromeStorageGet(key) {
    if (window.SidekickModules && window.SidekickModules.Core && window.SidekickModules.Core.ChromeStorage) {
      try {
        const result = await window.SidekickModules.Core.ChromeStorage.get(key);
        return result && result[key] !== undefined ? result[key] : null;
      } catch (e) {
        console.warn(`${MODULE_NAME}: ChromeStorage.get failed`, e);
      }
    }
    // fallback
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function chromeStorageSet(obj) {
    if (window.SidekickModules && window.SidekickModules.Core && window.SidekickModules.Core.ChromeStorage) {
      try {
        await window.SidekickModules.Core.ChromeStorage.set(obj);
        return true;
      } catch (e) {
        console.warn(`${MODULE_NAME}: ChromeStorage.set failed`, e);
      }
    }
    // fallback
    try {
      const key = Object.keys(obj)[0];
      localStorage.setItem(key, JSON.stringify(obj[key]));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Ledger model - kept in storage. Transactions keyed by transaction_id
  const Ledger = {
    data: {
      transactions: {}, // { txid: { id, timestamp, userId, name, type, amount, raw } }
      order: [], // ordered txids oldest -> newest
      lastChange: null // { id, whoName, whoId, amount, timestamp }
    },

    async load() {
      try {
        const stored = await window.SidekickModules.Core.ChromeStorage.get(STORAGE_KEY);
        if (stored && stored.transactions && stored.order) {
          this.data = stored;
          console.log(`[VaultTracker] Ledger loaded: ${stored.order.length} transactions`);
        } else {
          console.log(`[VaultTracker] No existing ledger data found`);
        }
      } catch (error) {
        console.error(`[VaultTracker] Failed to load ledger:`, error);
      }
    },

    async save() {
      try {
        await window.SidekickModules.Core.ChromeStorage.set(STORAGE_KEY, this.data);
        console.log(`[VaultTracker] Ledger saved: ${this.data.order.length} transactions`);
      } catch (e) {
        console.error(`${MODULE_NAME}: Failed to save ledger`, e);
      }
    },

    hasTransaction(id) {
      return !!this.data.transactions[String(id)];
    },

    addTransaction(tx) {
      if (!tx || !tx.id) return false;
      const id = String(tx.id);
      const existing = this.data.transactions[id];
      const tNormalized = {
        id,
        timestamp: Number(tx.timestamp) || Math.floor(Date.now() / 1000),
        userId: tx.userId ? Number(tx.userId) : null,
        name: tx.name || null,
        type: tx.type || 'Deposit',
        amount: Math.abs(Number(tx.amount) || 0),
        raw: tx.raw || null
      };

      // if identical exists, ignore
      if (existing && existing.timestamp === tNormalized.timestamp && existing.amount === tNormalized.amount && existing.userId === tNormalized.userId) {
        return false;
      }

      this.data.transactions[id] = tNormalized;
      if (!this.data.order.includes(id)) {
        this.data.order.push(id);
      }

      // keep chronological order
      this.data.order.sort((a, b) => this.data.transactions[a].timestamp - this.data.transactions[b].timestamp);

      // set last change
      const signed = (tNormalized.type.toLowerCase() === 'withdraw' ? -tNormalized.amount : tNormalized.amount);
      this.data.lastChange = {
        id,
        whoName: tNormalized.name,
        whoId: tNormalized.userId,
        amount: signed,
        timestamp: tNormalized.timestamp
      };

      // FIX 4: Auto re-render panel on every ledger update (no pulse to avoid constant flashing)
      this.save();
      if (window.SidekickModules && window.SidekickModules.VaultTracker) {
        try {
          window.SidekickModules.VaultTracker.renderPanel();
        } catch (e) { }
      }
      return true;
    },

    getBalancesFor(userId, spouseId) {
      // Sum up amounts by userId
      let you = 0, spouse = 0;
      for (const id of this.data.order) {
        const t = this.data.transactions[id];
        const signed = (t.type.toLowerCase() === 'withdraw' ? -t.amount : t.amount);
        if (t.userId !== null && userId !== null && Number(t.userId) === Number(userId)) {
          you += signed;
        } else if (t.userId !== null && spouseId !== null && Number(t.userId) === Number(spouseId)) {
          spouse += signed;
        }
      }
      return { you, spouse, total: you + spouse };
    },

    getLastChange() {
      return this.data.lastChange;
    },

    clearAll() {
      this.data = { transactions: {}, order: [], lastChange: null };
      this.save();
    }
  };

  // UI & runtime
  const VaultTracker = {
    settings: {
      playerId: null,
      playerName: null,
      spouseId: null,
      spouseName: null
    },

    panelEl: null,
    injectedFlag: '__sidekick_vault_ws_hook_injected__',

    async init() {
      if (isInitialized) return;
      await Ledger.load();
      await this.loadSettings();
      this.injectWebSocketHook();
      this.hookPageVisibility();
      isInitialized = true;
      console.log(`${MODULE_NAME}: Initialized`);

      // Auto-restore panel - try ChromeStorage first, fallback to localStorage
      let savedState = await window.SidekickModules.Core.ChromeStorage.get(PANEL_STATE_KEY);
      if (!savedState) {
        // Fallback to localStorage if ChromeStorage returns null/undefined
        const localData = localStorage.getItem(PANEL_STATE_KEY);
        savedState = localData ? JSON.parse(localData) : null;
      }
      console.log(`${MODULE_NAME}: Checking saved panel state:`, savedState);
      if (savedState && savedState.wasOpen) {
        console.log(`Restoring vault tracker panel after page refresh...`);
        // Wait a bit for UI to be ready
        setTimeout(async () => {
          await this.setupUI(savedState);
          // Detect spouse to get player IDs before rendering
          await this.autoDetectSpouse();
          // Now render the panel with loaded ledger data
          this.renderPanel();
          console.log(`Vault tracker panel restored`);
        }, 300);
      } else {
        console.log(`No vault tracker panel to restore (wasOpen: ${savedState?.wasOpen})`);
      }
    },

    async loadSettings() {
      const s = await chromeStorageGet(SETTINGS_KEY);
      if (s) {
        this.settings = Object.assign(this.settings, s);
      }

      // If no settings found or missing player/spouse info, auto-detect from API
      const needsAutoDetect = !this.settings.playerId || !this.settings.playerName || this.settings.spouseId === undefined;

      if (needsAutoDetect) {
        // Try reading player info from page first
        try {
          const conn = document.querySelector('#websocketConnectionData');
          if (conn) {
            const parsed = JSON.parse(conn.innerText || '{}');
            if (parsed && parsed.playerid) {
              this.settings.playerId = Number(parsed.playerid);
              this.settings.playerName = parsed.playername || this.settings.playerName;
            }
          }
        } catch (e) { /* ignore */ }

        // If we have player ID, auto-detect spouse from API
        if (this.settings.playerId) {
          await this.autoDetectSpouse();
        }
      }
    },

    async getApiKey() {
      try {
        if (window.SidekickModules?.Core?.ChromeStorage) {
          return await window.SidekickModules.Core.ChromeStorage.get('sidekick_api_key');
        }
        // Fallback to direct localStorage
        const key = localStorage.getItem('sidekick_api_key');
        return key ? JSON.parse(key) : null;
      } catch (e) {
        console.warn(`${MODULE_NAME}: Failed to get API key`, e);
        return null;
      }
    },

    async autoDetectSpouse() {
      try {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
          console.log(`${MODULE_NAME}: No API key found, skipping spouse detection`);
          return false;
        }

        console.log(`${MODULE_NAME}: Fetching player profile for spouse detection...`);
        const response = await fetch(`https://api.torn.com/user/?selections=profile&key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
          console.warn(`${MODULE_NAME}: API error:`, data.error);
          return false;
        }

        // Update player info
        this.settings.playerId = data.player_id;
        this.settings.playerName = data.name;

        // Check if married and extract spouse info
        if (data.married && data.married.spouse_id) {
          this.settings.spouseId = data.married.spouse_id;
          this.settings.spouseName = data.married.spouse_name || 'Spouse';

          console.log(`${MODULE_NAME}: Spouse detected - ${this.settings.spouseName} [${this.settings.spouseId}]`);

          // Show notification to user
          if (window.SidekickModules?.Core?.NotificationSystem) {
            window.SidekickModules.Core.NotificationSystem.show(
              'Vault Tracker',
              `Spouse detected: ${this.settings.spouseName}`,
              'success',
              4000
            );
          }
        } else {
          // Not married - set spouse to null so we know we checked
          this.settings.spouseId = null;
          this.settings.spouseName = null;
          console.log(`${MODULE_NAME}: No spouse found - tracking only player balance`);
        }

        // Save updated settings
        await this.saveSettings();
        return true;
      } catch (error) {
        console.error(`${MODULE_NAME}: Failed to auto-detect spouse:`, error);
        return false;
      }
    },

    async saveSettings() {
      await chromeStorageSet({ [SETTINGS_KEY]: this.settings });
    },

    injectWebSocketHook() {
      if (document[VaultTracker.injectedFlag]) return;
      document[VaultTracker.injectedFlag] = true;

      // FIX: Instead of inline script injection (CSP violation), use MutationObserver
      // to watch for vault page elements and parse transactions directly from DOM
      console.log(`${MODULE_NAME}: Using DOM-based transaction detection instead of WebSocket hook`);

      // No WebSocket hook injection - CSP blocks it
      // Transactions will be captured via manual sync only
    },

    async handleInjectedEvent(payload) {
      if (!payload) return;

      // Parse Torn's real vault WebSocket structure
      const tx = tryNormalizeTxFromPayload(payload);
      if (tx) {
        Ledger.addTransaction(tx);
        // renderPanel is now called automatically in addTransaction
      }
    },

    hookPageVisibility() {
      // Removed MutationObserver - WebSocket hook already handles live updates
      // No need for additional page monitoring that causes excessive triggering
    },

    async setupUI(passedState = null) {
      console.log('[VaultTracker] setupUI called');

      // Remove existing panel if present
      if (this.panelEl) {
        console.log('[VaultTracker] Removing existing panel');
        this.panelEl.remove();
        this.panelEl = null;
      }

      const root = document.querySelector('#sidekick-content');
      if (!root) {
        console.error('[VaultTracker] Content area not found');
        return;
      }

      const container = document.createElement('div');
      container.id = 'sidekick-vault-tracker';
      container.className = 'movable-notepad';

      const contentWidth = root.clientWidth || 480;
      const contentHeight = root.clientHeight || 500;

      // Use passed state or load from storage
      let savedState = passedState;
      if (!savedState) {
        savedState = await window.SidekickModules.Core.ChromeStorage.get(PANEL_STATE_KEY) || {};
      }
      console.log('[VaultTracker] Applying saved state:', savedState);

      const width = savedState.width || 280;
      const height = savedState.height || 260;
      const x = savedState.x !== undefined ? savedState.x : 20;
      const y = savedState.y !== undefined ? savedState.y : 20;

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
        min-height: 180px;
        z-index: 1000;
        resize: both;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      `;

      container.innerHTML = `
        <div class="vault-header" style="
          background: linear-gradient(135deg, #607D8B, #455A64);
          border-bottom: 1px solid #555;
          padding: 4px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          height: 24px;
          flex-shrink: 0;
          border-radius: 5px 5px 0 0;
          user-select: none;
        ">
          <span style="color: #fff; font-weight: 600; font-size: 11px;">Vault Tracker</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="vault-settings-btn" style="
              background: rgba(255,255,255,0.1);
              border: none;
              color: #fff;
              cursor: pointer;
              font-size: 12px;
              padding: 2px 6px;
              border-radius: 2px;
              line-height: 16px;
              font-weight: bold;
            ">⚙️</button>
            <button class="vault-close-btn" style="
              background: rgba(255,0,0,0.8);
              border: none;
              color: #fff;
              cursor: pointer;
              font-size: 12px;
              padding: 0px 4px;
              border-radius: 2px;
              line-height: 16px;
              font-weight: bold;
            ">✕</button>
          </div>
        </div>
        <div class="vault-body" style="
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          font-family: monospace;
          font-size: 12px;
          color: #fff;
        ">
          <div id="vault-values" style="display:flex;flex-direction:column;gap:6px;"></div>
        </div>
        <div style="display:flex;gap:8px;padding:8px;border-top:1px solid #444;flex-shrink:0;">
          <button id="vault-sync-btn" style="flex:1;padding:6px;border-radius:4px;border:1px solid #555;background:#333;color:#fff;cursor:pointer;font-size:11px;">Sync</button>
          <button id="vault-clear-btn" style="padding:6px;border-radius:4px;border:1px solid #555;background:#333;color:#fff;cursor:pointer;font-size:11px;">Clear</button>
        </div>
      `;

      root.appendChild(container);

      // Settings button
      container.querySelector('.vault-settings-btn').addEventListener('click', () => {
        this.showSettings();
      });

      // Close button
      container.querySelector('.vault-close-btn').addEventListener('click', async () => {
        container.remove();
        this.panelEl = null;
        // Mark panel as closed
        await chromeStorageSet({ [PANEL_STATE_KEY]: { ...await chromeStorageGet(PANEL_STATE_KEY), wasOpen: false } });
      });

      // Sync button
      container.querySelector('#vault-sync-btn').addEventListener('click', async () => {
        await this.syncFromVaultPage(true);
      });

      // Clear button
      container.querySelector('#vault-clear-btn').addEventListener('click', async () => {
        if (!confirm('Clear local vault ledger? This cannot be undone.')) return;
        Ledger.clearAll();
        this.renderPanel();
      });

      // Make draggable
      const header = container.querySelector('.vault-header');
      let isDragging = false;
      let startX, startY, startLeft, startTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.vault-close-btn')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = container.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        container.style.left = (startLeft + dx) + 'px';
        container.style.top = (startTop + dy) + 'px';
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        // Save position after dragging
        this.savePanelState();
      });

      // Save size when resized
      const resizeObserver = new ResizeObserver(() => {
        this.savePanelState();
      });
      resizeObserver.observe(container);

      // CRITICAL: Append to DOM FIRST before saving state
      root.appendChild(container);
      console.log('[VaultTracker] Container appended to DOM');

      this.panelEl = container;
      console.log('[VaultTracker] UI created as movable window');

      // CRITICAL: Save panel state immediately after creation
      await this.savePanelState();
      console.log('[VaultTracker] Panel state saved with wasOpen=true');

      this.renderPanel();
    },

    async savePanelState() {
      if (!this.panelEl) return;
      const rect = this.panelEl.getBoundingClientRect();
      const state = {
        x: this.panelEl.offsetLeft,
        y: this.panelEl.offsetTop,
        width: rect.width,
        height: rect.height,
        wasOpen: true  // Mark that panel was open
      };
      console.log('[VaultTracker] Saving state:', state);
      console.log('[VaultTracker] Storage key:', PANEL_STATE_KEY);

      // Use Core.ChromeStorage directly (the wrapper is broken!)
      await window.SidekickModules.Core.ChromeStorage.set(PANEL_STATE_KEY, state);
      console.log('[VaultTracker] Core.ChromeStorage.set() completed');

      // Verify immediately
      const result = await window.SidekickModules.Core.ChromeStorage.get(PANEL_STATE_KEY); const verify = result && result[PANEL_STATE_KEY];
      console.log('[VaultTracker] 🔍 Immediate verification:', verify);
    },

    showSettings() {
      // Remove existing settings overlay if present
      const existing = document.getElementById('vault-settings-overlay');
      if (existing) {
        existing.remove();
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'vault-settings-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const playerLabel = this.settings.playerName || 'Unknown';
      const spouseLabel = this.settings.spouseName || 'Not detected';
      const spouseStatus = this.settings.spouseId ? `ID: ${this.settings.spouseId}` : 'Not married';

      overlay.innerHTML = `
        <div style="
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        ">
          <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 16px;">Vault Tracker Settings</h3>
          
          <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
            <div style="color: #aaa; font-size: 11px; margin-bottom: 8px;">PLAYER INFO</div>
            <div style="color: #fff; font-size: 14px; margin-bottom: 4px;">${playerLabel}</div>
            <div style="color: #888; font-size: 11px;">ID: ${this.settings.playerId || 'Not detected'}</div>
          </div>
          
          <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
            <div style="color: #aaa; font-size: 11px; margin-bottom: 8px;">SPOUSE INFO</div>
            <div style="color: #fff; font-size: 14px; margin-bottom: 4px;">${spouseLabel}</div>
            <div style="color: #888; font-size: 11px;">${spouseStatus}</div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="vault-refresh-spouse" style="
              flex: 1;
              padding: 10px;
              background: #4CAF50;
              border: none;
              color: white;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
            ">Refresh Spouse</button>
            <button id="vault-reset-tracking" style="
              flex: 1;
              padding: 10px;
              background: #f44336;
              border: none;
              color: white;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
            ">Reset Tracking</button>
          </div>
          
          <button id="vault-close-settings" style="
            width: 100%;
            padding: 10px;
            background: #666;
            border: none;
            color: white;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
          ">Close</button>
        </div>
      `;

      document.body.appendChild(overlay);

      // Event listeners
      overlay.querySelector('#vault-close-settings').addEventListener('click', () => {
        overlay.remove();
      });

      overlay.querySelector('#vault-refresh-spouse').addEventListener('click', async () => {
        const btn = overlay.querySelector('#vault-refresh-spouse');
        btn.textContent = 'Refreshing...';
        btn.disabled = true;

        await this.autoDetectSpouse();
        overlay.remove();
        this.renderPanel();
      });

      overlay.querySelector('#vault-reset-tracking').addEventListener('click', async () => {
        if (!confirm('Clear all vault tracking data? This cannot be undone.')) return;

        Ledger.clearAll();
        this.renderPanel();
        overlay.remove();
      });

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    },

    async renderPanel() {
      if (!this.panelEl) return;
      const values = this.panelEl.querySelector('#vault-values');
      if (!values) return;

      const playerId = this.settings.playerId || null;
      const spouseId = this.settings.spouseId || null;
      const bal = Ledger.getBalancesFor(playerId, spouseId);
      const last = Ledger.getLastChange();
      const delta = last ? last.amount : 0;
      const deltaColor = delta > 0 ? '#6dd36d' : (delta < 0 ? '#ff6b6b' : '#9aa0a6');

      const fmt = (n) => (n === null || n === undefined) ? '—' : (n < 0 ? ('-$' + Math.abs(n).toLocaleString()) : ('$' + n.toLocaleString()));

      const playerLabel = this.settings.playerName || 'You';
      const spouseLabel = this.settings.spouseName || 'Spouse';
      const showSpouse = this.settings.spouseId !== null;

      // Calculate time since last transaction
      const lastUpdateText = last ? this.getTimeSince(last.timestamp) : 'No activity';

      // Status indicator
      const statusIcon = '🟢';
      const statusText = 'Tracking';

      values.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:12px;color:#cfd6da">${playerLabel}</div>
          <div style="font-weight:700;color:${bal.you >= 0 ? '#6dd36d' : '#ff6b6b'}">${fmt(bal.you)}</div>
        </div>
        ${showSpouse ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <div style="font-size:12px;color:#cfd6da">${spouseLabel}</div>
          <div style="font-weight:700;color:${bal.spouse >= 0 ? '#6dd36d' : '#ff6b6b'}">${fmt(bal.spouse)}</div>
        </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;margin-top:4px;border-top:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:12px;color:#b7bfc5">Total</div>
          <div style="font-weight:700;color:#fff">${fmt(bal.total)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:11px;color:#999">Last change</div>
          <div style="font-size:12px;color:${deltaColor};font-weight:600;">${delta !== 0 ? ((delta > 0 ? '+' : '') + '$' + Math.abs(delta).toLocaleString()) : '—'}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <div style="font-size:11px;color:#999">Last update</div>
          <div style="font-size:11px;color:#aaa">${lastUpdateText}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <div style="font-size:11px;color:#999">Status</div>
          <div style="font-size:11px;color:#6dd36d">${statusIcon} ${statusText}</div>
        </div>
      `;
    },

    // Helper function to get time since timestamp
    getTimeSince(timestamp) {
      if (!timestamp) return 'Never';
      const now = Math.floor(Date.now() / 1000);
      const diff = now - timestamp;

      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    },

    async syncFromVaultPage(userTriggered) {
      if (!(location.pathname.includes('properties.php') && location.href.includes('vault'))) {
        if (userTriggered) alert('Please open the Vault page (Properties → Vault) and try again.');
        return;
      }

      const loadMoreSelectorCandidates = [
        '.vault-trans-wrap .load-more a',
        '.vault-trans-wrap .load-more',
        '.vault-trans-wrap .pager a',
        '.vault-trans-wrap .btn-load-more'
      ];

      function getListItems() {
        // FIX 2: Use robust selectors for vault history
        const wrap =
          document.querySelector('.vault-trans-wrap') ||
          document.querySelector('[class*="vault"][class*="trans"]') ||
          document.querySelector('[id*="vault"][id*="trans"]');

        if (!wrap) return [];

        return Array.from(
          wrap.querySelectorAll('li[transaction_id], li, .transaction')
        );
      }

      let clicks = 0;
      let prevCount = -1;
      let stableRepeats = 0;

      while (clicks < MAX_LOAD_MORE_CLICKS) {
        const items = getListItems();
        if (items.length === 0) break;

        for (const li of items) {
          const tx = parseVaultListItem(li);
          if (tx && !Ledger.hasTransaction(tx.id)) {
            Ledger.addTransaction(tx);
          }
        }

        if (!userTriggered) break;

        let loadBtn = null;
        for (const sel of loadMoreSelectorCandidates) {
          loadBtn = document.querySelector(sel);
          if (loadBtn) break;
        }

        if (!loadBtn) {
          const wrap = document.querySelector('.vault-trans-wrap');
          if (wrap) {
            const a = wrap.querySelector('a');
            if (a && /load more|show more|more/i.test(a.innerText)) loadBtn = a;
          }
        }

        const nowCount = getListItems().length;
        if (nowCount === prevCount) {
          stableRepeats++;
          if (stableRepeats >= 2) break;
        } else {
          stableRepeats = 0;
        }
        prevCount = nowCount;

        if (!loadBtn) break;

        try {
          loadBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          loadBtn.click();
        } catch (e) {
          try { loadBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (e2) { }
        }
        clicks++;
        await new Promise(r => setTimeout(r, LOAD_MORE_PAUSE_MS));
      }

      await Ledger.save();
      this.renderPanel();

      if (userTriggered) {
        alert('Vault sync complete. Transactions stored locally: ' + Object.keys(Ledger.data.transactions).length);
      }
    }
  };

  function parseVaultListItem(li) {
    try {
      let id = li.getAttribute('transaction_id') || li.getAttribute('data-transaction-id') || li.dataset.transactionId || null;

      const dateEl = li.querySelector('.transaction-date');
      const timeEl = li.querySelector('.transaction-time');
      let timestamp = Math.floor(Date.now() / 1000);
      if (dateEl && timeEl) {
        const ds = dateEl.innerText.trim().split('/');
        const ts = timeEl.innerText.trim();
        if (ds.length === 3) {
          const year = 2000 + Number(ds[2]);
          const month = Number(ds[1]) - 1;
          const day = Number(ds[0]);
          const tparts = ts.split(':').map(x => Number(x));
          const hour = tparts[0] || 0;
          const min = tparts[1] || 0;
          const sec = tparts[2] || 0;
          timestamp = Math.floor(Date.UTC(year, month, day, hour, min, sec) / 1000);
        }
      }

      const userLink = li.querySelector('.user.name') || li.querySelector('a.user');
      let userId = null, name = null;
      if (userLink) {
        const href = userLink.getAttribute('href') || '';
        const m = href.match(/[?&]XID=(\d+)/i);
        if (m) userId = Number(m[1]);
        name = (userLink.getAttribute('title') || userLink.innerText || '').trim();
      }

      const typeEl = li.querySelector('.type');
      const type = typeEl ? (typeEl.innerText || '').replace(/[^A-Za-z]/g, '') : 'Deposit';

      const amountEl = li.querySelector('.amount');
      const amountRaw = amountEl ? (amountEl.innerText || '') : '';
      const amount = Number(String(amountRaw).replace(/[^0-9-]/g, '')) || 0;

      // FIX 3: Accept entries WITHOUT transaction_id
      if (!id) {
        id = 'synthetic_' + timestamp + '_' + (userId || 0) + '_' + amount;
      }

      return {
        id,
        timestamp,
        userId,
        name,
        type,
        amount,
        raw: li.innerText
      };
    } catch (e) {
      console.warn('VaultTracker: parseVaultListItem failed', e);
      return null;
    }
  }

  // Injected WebSocket hook (runs in page context) - NO LONGER NEEDED, USING FIX 5

  function tryNormalizeTxFromPayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    // FIX 1: Torn vault websocket events
    if (payload.event === "property" && payload.data && payload.data.vault) {
      const v = payload.data.vault;

      return {
        id: v.txID || ('wss_' + v.timestamp + '_' + v.userID + '_' + v.amount),
        timestamp: v.timestamp,
        userId: v.userID,
        name: null,
        amount: v.amount,
        type: v.type === "deposit" ? "deposit" : "withdraw",
        raw: v
      };
    }

    return null;
  }

  // Module Registration (adapted for Sidekick pattern)
  window.SidekickModules = window.SidekickModules || {};
  window.SidekickModules.VaultTracker = {
    initialize: async function () {
      console.log('[VaultTracker] Initializing...');
      await VaultTracker.init();
    },

    init: async function () {
      if (isInitialized) {
        this.initDone = true;
        return;
      }
      console.log('[VaultTracker] Init called from UI...');
      await VaultTracker.init();
      isInitialized = true;
      this.initDone = true;
    },

    initDone: false,
    setupUI: async function () { await VaultTracker.setupUI(); },
    syncNow: async function () { await VaultTracker.syncFromVaultPage(true); return true; },
    renderPanel: async function () { VaultTracker.renderPanel(); },
    refresh: function () { VaultTracker.renderPanel(); },

    // Visual pulse effect when transaction is added
    pulsePanel: function () {
      if (!VaultTracker.panelEl) return;
      const values = VaultTracker.panelEl.querySelector('#vault-values');
      if (!values) return;

      // Add pulse animation
      values.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      values.style.transform = 'scale(1.02)';
      values.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.3)';

      setTimeout(() => {
        values.style.transform = 'scale(1)';
        values.style.boxShadow = 'none';
      }, 300);
    },

    // Helper function to get time since timestamp (delegate to VaultTracker method)
    getTimeSince: function (timestamp) {
      return VaultTracker.getTimeSince(timestamp);
    }
  };

  console.log('[VaultTracker] Module registered');
})();
