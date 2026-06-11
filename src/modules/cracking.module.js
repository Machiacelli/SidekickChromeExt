/**
 * Sidekick Chrome Extension - Cracking Module
 */

(function () {
    'use strict';

    console.log('💻 Loading Sidekick Cracking Module...');

    const CrackingModule = {
        isInitialized: false,
        isEnabled: false,
        _intervalId: null,

        async init() {
            if (this.isInitialized) return;
            console.log('💻 Initializing Cracking Module...');

            try {
                this.isEnabled = await this.loadSettings();
                if (this.isEnabled) {
                    this.enable();
                }
                this.isInitialized = true;
                console.log('✅ Cracking Module initialized');
            } catch (error) {
                console.error('❌ Failed to initialize Cracking Module:', error);
            }
        },

        async loadSettings() {
            try {
                if (window.SidekickModules?.Core?.ChromeStorage?.get) {
                    const settings = await window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
                    if (settings && settings['crime-cracking']) {
                        return settings['crime-cracking'].isEnabled !== false;
                    }
                }
                return false; // Default off
            } catch (error) {
                console.error('Error loading Cracking settings:', error);
                return false;
            }
        },

        enable() {
            if (this._enabledInternal) return;
            this._enabledInternal = true;
            console.log('💻 Enabling Cracking Module');
            this.startModule();
        },

        disable() {
            if (!this._enabledInternal) return;
            this._enabledInternal = false;
            console.log('💻 Disabling Cracking Module');
            this.stopModule();
        },

        async toggle() {
            this.isEnabled = !this.isEnabled;
            if (this.isEnabled) {
                this.enable();
            } else {
                this.disable();
            }
        },

        startModule() {
            // State
            this.dict = [];
            this.dictLoaded = false;
            this.dictLoading = false;
            this.prevRowStates = new Map();
            this.panelUpdateTimers = new Map();
            this.LAST_INPUT = { key: null, time: 0 };

            this.MIN_LENGTH = 4;
            this.MAX_LENGTH = 10;
            this.WORDLIST_URL = 'https://gitlab.com/kalilinux/packages/seclists/-/raw/kali/master/Passwords/Common-Credentials/Pwdb_top-1000000.txt?ref_type=heads';
            this.DOWNLOAD_MIN_DELTA = 20;

            this.DB_NAME = 'crack';
            this.STORE_NAME = 'dictionary';
            this.EXCL_STORAGE_PREFIX = 'crack_excl_';

            this.debug = false;

            // Start DOM scanning interval
            this._intervalId = setInterval(() => this.scanCrimePage(), 50);

            // Key capture
            this.keydownHandler = (e) => {
                if (e.metaKey || e.ctrlKey || e.altKey) return;
                this.captureKey(e.key);
            };
            window.addEventListener('keydown', this.keydownHandler, true);

            // Load dict
            this.loadDict();

            // Start nav watcher for header badge
            this.startNavWatcher();
        },

        stopModule() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            if (this._navWatcher) {
                clearInterval(this._navWatcher);
                this._navWatcher = null;
            }
            if (this.keydownHandler) {
                window.removeEventListener('keydown', this.keydownHandler, true);
                this.keydownHandler = null;
            }

            // Remove header badge
            const badge = document.getElementById('sidekick-cracking-badge');
            if (badge) badge.remove();

            // Cleanup UI panels
            const panels = document.querySelectorAll('.__crackhelp_panel');
            panels.forEach(p => p.remove());
        },

        // ── Status (console-only, no DOM element) ────────────────────────────
        setStatus(msg) {
            if (this.debug && msg) console.log('[Crack] Status:', msg);
        },

        crackLog(...args) { if (this.debug) console.log('[Crack]', ...args); },

        // ── Header Badge ─────────────────────────────────────────────────────

        injectHeaderBadge() {
            // Only on cracking page
            if (window.location.hash !== '#/cracking') return;
            if (document.getElementById('sidekick-cracking-badge')) return;

            const header = document.querySelector('div.appHeader___tG_Ot h4.heading___BtymB');
            if (!header) return;

            const badge = document.createElement('span');
            badge.id = 'sidekick-cracking-badge';
            badge.title = 'Sidekick Cracking active';
            badge.style.cssText = [
                'display:inline-flex',
                'align-items:center',
                'justify-content:center',
                'width:16px',
                'height:16px',
                'border-radius:50%',
                'background:linear-gradient(135deg,#66BB6A,#4CAF50)',
                'color:#fff',
                'font-size:10px',
                'font-weight:bold',
                'margin-left:6px',
                'vertical-align:middle',
                'flex-shrink:0',
                'box-shadow:0 0 4px rgba(102,187,106,0.6)',
            ].join(';');
            badge.textContent = '✓';
            header.appendChild(badge);
        },

        startNavWatcher() {
            if (this._navWatcher) return;
            let lastUrl = window.location.href;
            this._navWatcher = setInterval(() => {
                const cur = window.location.href;
                if (cur !== lastUrl) {
                    lastUrl = cur;
                    // Remove stale badge when leaving the page
                    const old = document.getElementById('sidekick-cracking-badge');
                    if (old) old.remove();
                }
                this.injectHeaderBadge();
            }, 400);
            // Also attempt immediately
            this.injectHeaderBadge();
        },

        // ── Theme ─────────────────────────────────────────────────────────────

        getTheme() {
            return {
                uiBg: '#222',
                uiText: '#fff',
                uiBorder: 'rgba(255,255,255,0.2)',
                sugBg: 'rgba(30, 32, 36, 0.95)',
                sugText: '#4fa854', // Sidekick Green
                sugFontPx: 12,
            };
        },

        styleSugSpan(sp) {
            const t = this.getTheme();
            sp.style.padding = '2px 4px';
            sp.style.margin = '0 2px';
            sp.style.display = 'inline-block';
            sp.style.borderRadius = '3px';
            sp.style.fontSize = `${t.sugFontPx}px`;
            sp.style.color = t.sugText;
            sp.style.fontWeight = 'bold';
        },

        applyPanelTheme(panel) {
            const t = this.getTheme();
            if (!panel) return;
            panel.style.background = t.sugBg;
            panel.style.color = t.sugText;
            panel.style.fontSize = `${t.sugFontPx}px`;
            panel.style.textAlign = 'center';
            panel.style.position = 'absolute';
            panel.style.zIndex = '9999';

            const listDiv = panel.querySelector(':scope > div');
            if (!listDiv) return;
            for (const child of Array.from(listDiv.children)) {
                if (child.dataset && child.dataset.kind === 'sug') {
                    this.styleSugSpan(child);
                }
            }
        },

        // ── Network helpers ───────────────────────────────────────────────────

        gmRequest(opts) {
            return new Promise(async (resolve, reject) => {
                try {
                    const method = opts.method || 'GET';
                    const headers = opts.headers || { Accept: 'application/json, text/plain, */*; q=0.1' };
                    const reqOpts = { method, headers };
                    if (opts.data) reqOpts.body = opts.data;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), opts.timeout || 30000);
                    reqOpts.signal = controller.signal;

                    const res = await fetch(opts.url, reqOpts);
                    clearTimeout(timeoutId);

                    let responseText = '';
                    let response = null;

                    if (opts.responseType === 'arraybuffer') {
                        response = await res.arrayBuffer();
                    } else {
                        responseText = await res.text();
                    }

                    resolve({
                        status: res.status,
                        statusText: res.statusText,
                        responseText,
                        response,
                        responseHeaders: [...res.headers].map(([k, v]) => `${k}: ${v}`).join('\r\n')
                    });
                } catch (err) {
                    reject(err);
                }
            });
        },

        isGzipPath(pathOrUrl) {
            try {
                const s = String(pathOrUrl || '');
                const clean = s.split('?')[0];
                return /\.gz$/i.test(clean);
            } catch (_) { return false; }
        },

        async gunzipArrayBufferToText(arrayBuffer) {
            if (!arrayBuffer) return '';
            if (typeof DecompressionStream !== 'function') {
                throw new Error('Your browser does not support DecompressionStream(gzip).');
            }
            const ds = new DecompressionStream('gzip');
            const stream = new Blob([arrayBuffer]).stream().pipeThrough(ds);
            return await new Response(stream).text();
        },

        async responseToText(res, pathOrUrl) {
            if (this.isGzipPath(pathOrUrl)) {
                return await this.gunzipArrayBufferToText(res.response);
            }
            return res.responseText || '';
        },

        // ── IndexedDB ─────────────────────────────────────────────────────────

        openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) db.createObjectStore(this.STORE_NAME);
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        async idbSet(key, value) {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                tx.objectStore(this.STORE_NAME).put(value, key);
                tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
            });
        },

        async idbGet(key) {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const req = tx.objectStore(this.STORE_NAME).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        // ── Key capture ───────────────────────────────────────────────────────

        captureKey(k) {
            if (!k) return;
            const m = String(k).match(/^[A-Za-z0-9._]$/);
            if (!m) return;
            this.LAST_INPUT.key = k.toUpperCase();
            this.LAST_INPUT.time = performance.now();
        },

        // ── Dictionary loading ────────────────────────────────────────────────

        async commitBucketsToIDB(buckets) {
            for (const lenStr of Object.keys(buckets)) {
                const L = Number(lenStr);
                const newArr = Array.from(buckets[lenStr]);
                let existing = await this.idbGet(`len_${L}`);
                if (!existing) existing = [];
                const merged = Array.from(new Set([...existing, ...newArr]));
                await this.idbSet(`len_${L}`, merged);
                this.dict[L] = merged;
                this._buildIndex(L); // rebuild fast-lookup index
            }
        },

        // Build a first-char bucket index for O(1) narrowing
        _buildIndex(len) {
            if (!this.dictIndex) this.dictIndex = [];
            const idx = {};
            for (const word of (this.dict[len] || [])) {
                const c = word[0];
                if (!idx[c]) idx[c] = [];
                idx[c].push(word);
            }
            this.dictIndex[len] = idx;
        },

        async fetchAndIndex(url, onProgress) {
            this.setStatus('Downloading base wordlist…');
            let res;
            try {
                res = await this.gmRequest({ method: 'GET', url, timeout: 90000, responseType: 'text' });
            } catch (e) {
                throw e;
            }
            if (res.status < 200 || res.status >= 300 || !res.responseText) {
                const err = new Error(`Bad response from base wordlist: ${res.status}`);
                err.status = res.status;
                throw err;
            }
            this.setStatus('Indexing…');

            const lines = (res.responseText || '').split(/\r?\n/);
            const buckets = {};
            let processed = 0;

            for (const raw of lines) {
                processed++;
                const word = (raw || '').trim().toUpperCase();
                if (!word) continue;
                if (!/^[A-Z0-9_.]+$/.test(word)) continue;
                const L = word.length;
                if (L < this.MIN_LENGTH || L > this.MAX_LENGTH) continue;
                if (!buckets[L]) buckets[L] = new Set();
                buckets[L].add(word);

                if (processed % 5000 === 0 && typeof onProgress === 'function') {
                    onProgress({ phase: '1M-index', processed, pct: null });
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            await this.commitBucketsToIDB(buckets);
            this.setStatus('1M cached');
            return { totalProcessed: processed };
        },

        async loadDict() {
            if (this.dictLoaded || this.dictLoading) return;
            this.dictLoading = true;
            this.setStatus('Loading from cache…');

            let hasData = false;
            this.dict = [];
            for (let len = this.MIN_LENGTH; len <= this.MAX_LENGTH; len++) {
                const chunk = await this.idbGet(`len_${len}`);
                if (chunk && chunk.length) { this.dict[len] = chunk; hasData = true; }
            }

            if (!hasData) {
                this.crackLog('No cache found. Downloading dictionary…');
                const MAX_TRIES = 4;
                const DELAYS = [0, 3000, 10000, 30000];
                let ok = false, lastErr = null;

                for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
                    try {
                        await this.fetchAndIndex(this.WORDLIST_URL, ({ phase, processed }) => {
                            if (phase === '1M-index') this.setStatus(`Indexing 1M… processed ${processed}`);
                        });
                        ok = true;
                        break;
                    } catch (e) {
                        lastErr = e;
                        const wait = DELAYS[Math.min(attempt, DELAYS.length - 1)];
                        this.crackLog(`Base download failed (try ${attempt + 1}/${MAX_TRIES})`, e);
                        this.setStatus(`Download failed (try ${attempt + 1}/${MAX_TRIES}) — retrying in ${Math.ceil(wait / 1000)}s…`);
                        if (wait) await new Promise(r => setTimeout(r, wait));
                    }
                }

                if (!ok) {
                    this.crackLog('Giving up on base download for now.', lastErr);
                    this.dictLoading = false;
                    this.dictLoaded = false;
                    setTimeout(() => { this.loadDict().catch(() => { }); }, 60000);
                    this.setStatus('Failed to fetch base wordlist (will retry)...');
                    return;
                }
            } else {
                this.crackLog('Dictionary loaded from IndexedDB');
            }

            this.dictLoaded = true;
            this.dictLoading = false;
            // Build fast-lookup index for all loaded lengths
            if (!this.dictIndex) this.dictIndex = [];
            for (let len = this.MIN_LENGTH; len <= this.MAX_LENGTH; len++) {
                if (this.dict[len]) this._buildIndex(len);
            }
            this.setStatus('');
        },

        // ── Exclusions ────────────────────────────────────────────────────────

        loadExclusions(rowKey, len) {
            const raw = sessionStorage.getItem(this.EXCL_STORAGE_PREFIX + rowKey + '_' + len);
            let arr = [];
            if (raw) { try { arr = JSON.parse(raw); } catch { } }
            const out = new Array(len);
            for (let i = 0; i < len; i++) {
                const s = Array.isArray(arr[i]) ? arr[i] : (typeof arr[i] === 'string' ? arr[i].split('') : []);
                out[i] = new Set(s.map(c => String(c || '').toUpperCase()).filter(Boolean));
            }
            return out;
        },

        saveExclusions(rowKey, len, sets) {
            const arr = new Array(len);
            for (let i = 0; i < len; i++) arr[i] = Array.from(sets[i] || new Set());
            sessionStorage.setItem(this.EXCL_STORAGE_PREFIX + rowKey + '_' + len, JSON.stringify(arr));
        },

        schedulePanelUpdate(panel) {
            if (!panel) return;
            const key = panel.dataset.rowkey;
            if (this.panelUpdateTimers.has(key)) clearTimeout(this.panelUpdateTimers.get(key));
            // Use 0ms debounce — we want suggestions instantly after state change
            this.panelUpdateTimers.set(key, setTimeout(() => {
                panel.updateSuggestions();
                this.panelUpdateTimers.delete(key);
            }, 0));
        },

        addExclusion(rowKey, pos, letter, len) {
            letter = String(letter || '').toUpperCase();
            if (!letter) return;
            const sets = this.loadExclusions(rowKey, len);
            if (!sets[pos]) sets[pos] = new Set();
            const before = sets[pos].size;
            sets[pos].add(letter);
            if (sets[pos].size !== before) {
                this.saveExclusions(rowKey, len, sets);
                const panel = document.querySelector(`.__crackhelp_panel[data-rowkey="${rowKey}"]`);
                this.schedulePanelUpdate(panel);
            }
        },

        // ── Suggestions ───────────────────────────────────────────────────────

        suggest(pattern, rowKey) {
            const len = pattern.length;
            if (len < this.MIN_LENGTH || len > this.MAX_LENGTH) return [];
            if (!this.dict[len]) return []; // dict not yet loaded for this length

            const maxSug = 5;
            const pat = pattern.toUpperCase();

            // Narrow candidates using first-char index if available
            const idx = this.dictIndex && this.dictIndex[len];
            let candidates;
            if (idx && pat[0] !== '*') {
                // known first char — only scan ~1/26th of the list
                candidates = idx[pat[0]] || [];
            } else {
                candidates = this.dict[len];
            }

            const exSets = this.loadExclusions(rowKey, len);
            const results = [];

            outer: for (const word of candidates) {
                // Plain char-by-char match — much faster than RegExp for this case
                for (let i = 0; i < len; i++) {
                    const pc = pat[i];
                    if (pc !== '*' && pc !== word[i]) continue outer;
                    const ex = exSets[i];
                    if (ex && ex.has(word[i])) continue outer;
                }
                results.push(word);
                if (results.length >= maxSug) break;
            }
            return results;
        },

        // ── Panel ─────────────────────────────────────────────────────────────

        prependPanelToRow(row, pat, rowKey) {
            let panel = row.querySelector('.__crackhelp_panel');

            if (!panel) {
                panel = document.createElement('div');
                panel.className = '__crackhelp_panel';
                panel.dataset.rowkey = rowKey;
                panel.dataset.pattern = pat;
                panel._seq = 0;
                panel.style.cssText = 'text-align:center; position:absolute; z-index:9999;';
                panel.style.border = `1px solid ${this.getTheme().uiBorder}`;
                panel.style.borderRadius = '4px';

                const listDiv = document.createElement('div');
                listDiv.style.cssText = 'margin-top:2px;';
                panel.appendChild(listDiv);

                panel.updateSuggestions = () => {
                    const curPat = panel.dataset.pattern || '';
                    const curRowKey = panel.dataset.rowkey;

                    this.applyPanelTheme(panel);

                    if (!this.dictLoaded && this.dictLoading) {
                        if (!listDiv.firstChild || listDiv.firstChild.textContent !== '(loading dictionary…)') {
                            listDiv.innerHTML = '<span style="padding:2px;color:#ff0;">(loading dictionary…)</span>';
                        }
                        return;
                    }

                    const sugs = this.suggest(curPat, curRowKey);

                    let i = 0;
                    for (; i < sugs.length; i++) {
                        let sp = listDiv.children[i];
                        if (!sp) {
                            sp = document.createElement('span');
                            sp.dataset.kind = 'sug';
                            listDiv.appendChild(sp);
                        }
                        if (sp.textContent !== sugs[i]) sp.textContent = sugs[i];
                        this.styleSugSpan(sp);
                    }
                    while (listDiv.children.length > sugs.length) listDiv.removeChild(listDiv.lastChild);

                    if (sugs.length === 0) {
                        if (!listDiv.firstChild) {
                            const sp = document.createElement('span');
                            sp.dataset.kind = 'msg';
                            sp.textContent = this.dictLoaded ? '(no matches)' : '(loading dictionary…)';
                            sp.style.padding = '2px 4px';
                            sp.style.color = this.dictLoaded ? '#a00' : '#ff0';
                            sp.style.background = 'transparent';
                            sp.style.fontSize = `${this.getTheme().sugFontPx}px`;
                            listDiv.appendChild(sp);
                        } else {
                            const sp = listDiv.firstChild;
                            const txt = this.dictLoaded ? '(no matches)' : '(loading dictionary…)';
                            if (sp.textContent !== txt) sp.textContent = txt;
                            sp.style.color = this.dictLoaded ? '#a00' : '#ff0';
                            sp.style.background = 'transparent';
                            sp.style.fontSize = `${this.getTheme().sugFontPx}px`;
                        }
                    }
                };

                row.prepend(panel);
                this.applyPanelTheme(panel);
            } else {
                panel.dataset.pattern = pat;
                this.applyPanelTheme(panel);
            }
            this.schedulePanelUpdate(panel);
            return panel;
        },

        // ── Local word cache ──────────────────────────────────────────────────

        async isWordInLocalDict(word) {
            const len = word.length;
            if (!this.dict[len]) {
                const chunk = await this.idbGet(`len_${len}`); if (!chunk) return false;
                this.dict[len] = chunk;
            }
            return this.dict[len].includes(word);
        },

        async addWordToLocalCache(word) {
            const len = word.length;
            if (len < this.MIN_LENGTH || len > this.MAX_LENGTH) return;
            let chunk = await this.idbGet(`len_${len}`); if (!chunk) chunk = [];
            if (!chunk.includes(word)) {
                chunk.push(word); await this.idbSet(`len_${len}`, chunk);
                if (!this.dict[len]) this.dict[len] = [];
                if (!this.dict[len].includes(word)) this.dict[len].push(word);
                this.crackLog('Added to local cache:', word);
            }
        },

        // ── Row key ───────────────────────────────────────────────────────────

        getRowKey(crimeOption) {
            if (!crimeOption.dataset.crackKey) {
                crimeOption.dataset.crackKey = String(Date.now()) + '-' + Math.floor(Math.random() * 100000);
            }
            return crimeOption.dataset.crackKey;
        },

        // ── Slot sensors ──────────────────────────────────────────────────────

        attachSlotSensors(crimeOption, rowKey) {
            if (crimeOption.dataset.crackDelegated === '1') return;
            crimeOption.dataset.crackDelegated = '1';

            const slotSelector = '[class^="charSlot"]:not([class*="charSlotDummy"])';
            const badLineSelector = '[class*="incorrectGuessLine"]';

            const onVisualCue = (ev) => {
                const t = ev.target;
                const slot = t.closest && t.closest(slotSelector);
                if (!slot || !crimeOption.contains(slot)) return;

                const slots = crimeOption.querySelectorAll(slotSelector);
                const i = Array.prototype.indexOf.call(slots, slot);
                if (i < 0) return;
                if (getComputedStyle(slot).borderColor === 'rgb(130, 201, 30)') return;

                const now = performance.now();
                const shown = (slot.textContent || '').trim();
                if (shown && /^[A-Za-z0-9._]$/.test(shown)) return;

                const prev = this.prevRowStates.get(rowKey) || null;
                const hasRowLastInput = !!(prev && prev.lastInput && (now - prev.lastInput.time) <= 1800 && prev.lastInput.i === i);
                const isIncorrectLineEvent = t.matches && t.matches(badLineSelector);
                const freshGlobal = (now - (this.LAST_INPUT.time || 0)) <= 1800;

                let letter = null;
                if (hasRowLastInput) letter = prev.lastInput.letter;
                else if (isIncorrectLineEvent && freshGlobal && this.LAST_INPUT.key) letter = this.LAST_INPUT.key.toUpperCase();
                else return;

                if (!/^[A-Za-z0-9._]$/.test(letter)) return;

                const len = slots.length;
                this.addExclusion(rowKey, i, letter, len);

                const panel = document.querySelector(`.__crackhelp_panel[data-rowkey="${rowKey}"]`);
                if (panel && panel.updateSuggestions) this.schedulePanelUpdate(panel);
            };

            crimeOption.addEventListener('animationstart', onVisualCue, true);
            crimeOption.addEventListener('transitionend', onVisualCue, true);
        },

        // ── Main scan loop ────────────────────────────────────────────────────

        scanCrimePage() {
            if (location.hash !== '#/cracking') return;

            const currentCrime = document.querySelector('[class^="currentCrime"]');
            if (!currentCrime) return;

            const container = currentCrime.querySelector('[class^="virtualList"]');
            if (!container) return;

            const crimeOptions = container.querySelectorAll('[class^="crimeOptionWrapper"]');

            for (const crimeOption of crimeOptions) {
                let patText = '';
                const rowKey = this.getRowKey(crimeOption);
                this.attachSlotSensors(crimeOption, rowKey);

                const charSlots = crimeOption.querySelectorAll('[class^="charSlot"]:not([class*="charSlotDummy"])');
                const curChars = [];
                for (const charSlot of charSlots) {
                    let ch = (charSlot.textContent || '').trim().toUpperCase();
                    curChars.push(ch ? ch : '*');
                }
                patText = curChars.join('');

                const now = performance.now();
                const len = curChars.length;

                const prev = this.prevRowStates.get(rowKey) || { chars: Array(len).fill('*') };

                for (let i = 0; i < len; i++) {
                    const was = prev.chars[i];
                    const is = curChars[i];
                    if (was === '*' && is !== '*') prev.lastInput = { i, letter: is, time: now };
                    if (was !== '*' && is === '*') {
                        if (prev.lastInput && prev.lastInput.i === i && prev.lastInput.letter === was && (now - prev.lastInput.time) <= 1800) {
                            this.addExclusion(rowKey, i, was, len);
                        }
                    }
                }
                this.prevRowStates.set(rowKey, { chars: curChars, lastInput: prev.lastInput, time: now });

                // Save fully-revealed words to local cache only
                if (!/[*]/.test(patText)) {
                    const newWord = patText.toUpperCase();
                    if (/^[A-Z0-9_.]+$/.test(newWord)) {
                        (async () => {
                            const localHas = await this.isWordInLocalDict(newWord);
                            if (!localHas) {
                                await this.addWordToLocalCache(newWord);
                            }
                        })();
                    }
                }

                if (!/^[*]+$/.test(patText)) this.prependPanelToRow(crimeOption, patText, rowKey);
            }
        }
    };

    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Cracking = CrackingModule;

    console.log('✅ Sidekick Cracking Module loaded and ready');
})();
