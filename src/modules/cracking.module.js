/**
 * Sidekick Chrome Extension - Cracking Module
 * Ported from Simple Cracking Helper by SirAua
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
            this.remoteWords = new Set();
            this.statusEl = null;
            this.prevRowStates = new Map();
            this.panelUpdateTimers = new Map();
            this.LAST_INPUT = { key: null, time: 0 };

            this.outboxFlushTimer = null;
            this.lastOutboxPost = 0;
            this.autoSyncTimer = null;
            this.autoSyncInFlight = false;

            this.MIN_LENGTH = 4;
            this.MAX_LENGTH = 10;
            this.WORDLIST_URL = 'https://gitlab.com/kalilinux/packages/seclists/-/raw/kali/master/Passwords/Common-Credentials/Pwdb_top-1000000.txt?ref_type=heads';
            this.DOWNLOAD_MIN_DELTA = 20;
            this.CF_WORKER_ORIGIN = 'https://torn-crack-files.siraua.workers.dev';
            this.CF_ADD_WORD_URL = `${this.CF_WORKER_ORIGIN}/submit`;
            this.CF_STORAGE_BASE = `${this.CF_WORKER_ORIGIN}/words`;
            this.METADATA_URL = `${this.CF_STORAGE_BASE}/metadata.json`;

            this.SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
            this.OUTBOX_FLUSH_INTERVAL_MS = 5 * 1000;
            this.OUTBOX_POST_INTERVAL_MS = 2000;
            this.OUTBOX_BATCH_SIZE = 5;
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
            this.startAutoSyncHeartbeat();
        },

        stopModule() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            if (this.autoSyncTimer) {
                clearInterval(this.autoSyncTimer);
                this.autoSyncTimer = null;
            }
            if (this.outboxFlushTimer) {
                clearTimeout(this.outboxFlushTimer);
                this.outboxFlushTimer = null;
            }
            if (this.keydownHandler) {
                window.removeEventListener('keydown', this.keydownHandler, true);
                this.keydownHandler = null;
            }

            // Cleanup UI
            if (this.statusEl && this.statusEl.parentNode) {
                this.statusEl.parentNode.removeChild(this.statusEl);
                this.statusEl = null;
            }
            const panels = document.querySelectorAll('.__crackhelp_panel');
            panels.forEach(p => p.remove());
        },

        crackLog(...args) { if (this.debug) console.log('[Crack]', ...args); },

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

        applyStatusBadgeTheme(el) {
            const t = this.getTheme();
            if (!el) return;
            el.style.background = t.uiBg;
            el.style.color = t.uiText;
            el.style.border = `1px solid ${t.uiBorder}`;
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

        ensureStatusBadge() {
            if (this.statusEl) return this.statusEl;
            this.statusEl = document.createElement('div');
            this.statusEl.id = '__crack_status';
            this.statusEl.style.cssText = `
                  position: fixed; right: 10px; bottom: 40px; z-index: 10000;
                  padding:6px 8px; font-size:11px; font-family:monospace; opacity:0.9;
                  border-radius:6px;
                `;
            this.statusEl.textContent = 'Dictionary: Idle';
            document.body.appendChild(this.statusEl);
            this.applyStatusBadgeTheme(this.statusEl);
            return this.statusEl;
        },

        setStatus(msg) {
            const text = `Dictionary: ${msg}`;
            const badge = this.ensureStatusBadge();
            if (badge.textContent !== text) badge.textContent = text;
            this.crackLog('STATUS →', msg);
        },

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

                    const gmResponse = {
                        status: res.status,
                        statusText: res.statusText,
                        responseText: responseText,
                        response: response,
                        responseHeaders: [...res.headers].map(([k, v]) => `${k}: ${v}`).join('\r\n')
                    };

                    resolve(gmResponse);
                } catch (err) {
                    reject(err);
                }
            });
        },

        getHeader(headers, name) {
            const re = new RegExp('^' + name + ':\\s*(.*)$', 'mi');
            const m = headers && headers.match ? headers.match(re) : null;
            return m ? m[1].trim() : null;
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

        metadataURL(force = false) {
            const ts = force ? Date.now() : Math.floor(Date.now() / 60000);
            return `${this.METADATA_URL}?cb=${ts}`;
        },

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

        async idbClear() {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                tx.objectStore(this.STORE_NAME).clear();
                tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
            });
        },

        captureKey(k) {
            if (!k) return;
            const m = String(k).match(/^[A-Za-z0-9._]$/);
            if (!m) return;
            this.LAST_INPUT.key = k.toUpperCase();
            this.LAST_INPUT.time = performance.now();
        },

        async commitBucketsToIDB(buckets) {
            for (const lenStr of Object.keys(buckets)) {
                const L = Number(lenStr);
                const newArr = Array.from(buckets[lenStr]);
                let existing = await this.idbGet(`len_${L}`);
                if (!existing) existing = [];
                const merged = Array.from(new Set([...existing, ...newArr]));
                await this.idbSet(`len_${L}`, merged);
                this.dict[L] = merged;
            }
        },

        async fetchAndIndex(url, onProgress) {
            this.setStatus('Downloading base wordlist …');
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
                const DELAYS = [0, 3000, 10000, 30000]; // ms
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
            this.setStatus('Ready');
        },

        async fetchRemoteMeta(force = false) {
            try {
                const lastSync = Number(await this.idbGet('cf_last_sync_ts')) || 0;
                const now = Date.now();
                if (!force && (now - lastSync) < this.SYNC_MIN_INTERVAL_MS) {
                    this.crackLog('Skipping fetchRemoteMeta (recent sync)');
                    const cachedMeta = await this.idbGet('cf_metadata') || {};
                    return {
                        count: cachedMeta.count || Number(await this.idbGet('cf_remote_count')) || 0,
                        etag: '',
                        snapshot_path: cachedMeta.snapshot_path || null,
                        diff_path: cachedMeta.diff_path || null,
                        generated_at: cachedMeta.generated_at || null
                    };
                }

                const metaUrl = this.metadataURL(force);
                this.crackLog('Fetching metadata.json ->', metaUrl);
                const metaRes = await this.gmRequest({ method: 'GET', url: metaUrl, timeout: 10000, responseType: 'text' });

                if (metaRes.status !== 200) {
                    this.crackLog('metadata.json not available; using cached meta only', metaRes.status);
                    const cachedMeta = await this.idbGet('cf_metadata') || {};
                    return {
                        count: cachedMeta.count || Number(await this.idbGet('cf_remote_count')) || 0,
                        etag: '',
                        snapshot_path: cachedMeta.snapshot_path || null,
                        diff_path: cachedMeta.diff_path || null,
                        generated_at: cachedMeta.generated_at || null
                    };
                }

                const meta = JSON.parse(metaRes.responseText || '{}');
                const toSave = {
                    count: meta.count || 0,
                    etag: '',
                    snapshot_path: meta.snapshot_path || meta.latest_path || null,
                    diff_path: meta.diff_path || null,
                    generated_at: meta.generated_at || null
                };

                await this.idbSet('cf_metadata', toSave);
                await this.idbSet('cf_remote_count', toSave.count);
                await this.idbSet('cf_last_sync_ts', Date.now());

                return { count: toSave.count, etag: '', snapshot_path: toSave.snapshot_path, diff_path: toSave.diff_path, generated_at: toSave.generated_at };
            } catch (e) {
                this.crackLog('fetchRemoteMeta failed:', e);
                return { count: Number(await this.idbGet('cf_remote_count')) || 0, etag: '', snapshot_path: null, diff_path: null, generated_at: null };
            }
        },

        async downloadCommunityWordlist(meta, ifNoneMatchEtag) {
            try {
                if (!meta || !meta.snapshot_path) {
                    this.crackLog('No snapshot_path in metadata.');
                    return 0;
                }

                const snapshotUrl = `${this.CF_STORAGE_BASE}/${meta.snapshot_path}`;
                this.crackLog('Fetching snapshot ->', snapshotUrl);

                const headers = {};
                if (ifNoneMatchEtag) headers['If-None-Match'] = ifNoneMatchEtag;

                const isGz = this.isGzipPath(meta.snapshot_path);
                const res = await this.gmRequest({ method: 'GET', url: snapshotUrl, headers, timeout: 45000, responseType: isGz ? 'arraybuffer' : 'text' });

                const remoteEtag = this.getHeader(res.responseHeaders, 'ETag') || '';
                if (remoteEtag) await this.idbSet('cf_remote_etag', remoteEtag);

                if (res.status === 304) {
                    this.crackLog('Snapshot unchanged (304)');
                    await this.idbSet('cf_last_downloaded_count', meta.count || 0);
                    await this.idbSet('cf_last_sync_ts', Date.now());
                    return 0;
                }

                if (res.status !== 200) {
                    this.crackLog('Snapshot fetch failed, status:', res.status);
                    return 0;
                }

                const text = await this.responseToText(res, meta.snapshot_path);
                this.setStatus('Indexing snapshot…');
                const lines = text.split(/\r?\n/);
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
                    if (processed % 5000 === 0) await new Promise(r => setTimeout(r, 0));
                }

                await this.commitBucketsToIDB(buckets);
                this.setStatus('Snapshot indexed');

                await this.idbSet('cf_remote_count', meta.count || 0);
                await this.idbSet('cf_last_downloaded_count', meta.count || 0);
                await this.idbSet('cf_last_sync_ts', Date.now());

                await this.idbSet('cf_metadata', {
                    snapshot_path: meta.snapshot_path,
                    diff_path: meta.diff_path || null,
                    count: meta.count || 0,
                    generated_at: meta.generated_at || null,
                    etag: remoteEtag || ''
                });

                return 1;
            } catch (e) {
                this.crackLog('downloadCommunityWordlist failed:', e);
                return 0;
            }
        },

        async checkRemoteAndMaybeDownload(force = false) {
            const meta = await this.fetchRemoteMeta(force);

            const lastDownloaded = (await this.idbGet('cf_last_downloaded_count')) || 0;
            const remoteCount = meta.count || Number(await this.idbGet('cf_remote_count')) || 0;
            const delta = Math.max(0, remoteCount - lastDownloaded);

            if (!force && delta < this.DOWNLOAD_MIN_DELTA) {
                this.crackLog(`Skip download: delta=${delta} < ${this.DOWNLOAD_MIN_DELTA}`);
                await this.idbSet('cf_pending_delta', delta);
                return 0;
            }

            this.setStatus(force ? 'Manual sync…' : `Syncing (+${delta})…`);
            const etag = (await this.idbGet('cf_remote_etag')) || '';
            const added = await this.downloadCommunityWordlist(meta, etag);
            await this.idbSet('cf_pending_delta', 0);
            return added;
        },

        async msUntilEligibleSync() {
            const last = Number(await this.idbGet('cf_last_sync_ts')) || 0;
            const remain = last + this.SYNC_MIN_INTERVAL_MS - Date.now();
            return Math.max(0, remain);
        },

        startAutoSyncHeartbeat() {
            if (this.autoSyncTimer) return;
            this.autoSyncTimer = setInterval(async () => {
                if (this.autoSyncInFlight) return;
                try {
                    const remain = await this.msUntilEligibleSync();
                    if (remain > 0) return;

                    this.autoSyncInFlight = true;
                    this.setStatus('Auto-syncing community words…');

                    const added = await this.checkRemoteAndMaybeDownload(false);

                    const remoteCount = await this.idbGet('cf_remote_count');
                    const delta = await this.idbGet('cf_pending_delta');
                    if (added && added > 0) {
                        this.setStatus(`Ready (+${added}, remote: ${remoteCount})`);
                    } else {
                        this.setStatus(`Ready (remote ${remoteCount}${delta ? `, +${delta} pending` : ''})`);
                    }
                } catch (e) {
                    this.crackLog('Auto-sync failed', e);
                    this.setStatus('Ready');
                } finally {
                    this.autoSyncInFlight = false;
                }
            }, 1000);
        },

        async enqueueOutbox(word) {
            if (!word) return;
            const w = word.toUpperCase();
            let out = await this.idbGet('cf_outbox') || [];
            if (!out.includes(w)) {
                out.push(w);
                await this.idbSet('cf_outbox', out);
                this.crackLog('Enqueued word to outbox:', w);
                this.ensureOutboxFlushScheduled();
            }
        },

        ensureOutboxFlushScheduled() {
            if (this.outboxFlushTimer) return;
            this.outboxFlushTimer = setTimeout(() => this.flushOutbox(), this.OUTBOX_FLUSH_INTERVAL_MS);
        },

        async flushOutbox() {
            this.outboxFlushTimer = null;
            let out = await this.idbGet('cf_outbox') || [];
            if (!out || out.length === 0) return;

            while (out.length > 0) {
                const batch = out.splice(0, this.OUTBOX_BATCH_SIZE);
                const now = Date.now();
                const sinceLast = now - this.lastOutboxPost;
                if (sinceLast < this.OUTBOX_POST_INTERVAL_MS) await new Promise(r => setTimeout(r, this.OUTBOX_POST_INTERVAL_MS - sinceLast));

                try {
                    await this.gmRequest({
                        method: 'POST',
                        url: this.CF_ADD_WORD_URL,
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({ words: batch }),
                        timeout: 15000
                    });

                    this.crackLog('Flushed outbox batch:', batch.length);
                    for (const w of batch) {
                        this.remoteWords.add(w);
                        await this.addWordToLocalCache(w);
                    }
                } catch (e) {
                    this.crackLog('Batch POST failed, falling back to single POSTs', e);
                    for (const w of batch) {
                        try {
                            await this.gmRequest({
                                method: 'POST',
                                url: this.CF_ADD_WORD_URL,
                                headers: { 'Content-Type': 'application/json' },
                                data: JSON.stringify({ word: w }),
                                timeout: 10000
                            });

                            this.crackLog('Flushed outbox (single):', w);
                            this.remoteWords.add(w);
                            await this.addWordToLocalCache(w);
                            await new Promise(r => setTimeout(r, this.OUTBOX_POST_INTERVAL_MS));
                        } catch (ee) {
                            this.crackLog('Single POST failed for', w, ee);
                            out.unshift(w);
                            break;
                        }
                    }
                }

                this.lastOutboxPost = Date.now();
                await this.idbSet('cf_outbox', out);
            }
        },

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
            this.panelUpdateTimers.set(key, setTimeout(() => {
                panel.updateSuggestions();
                this.panelUpdateTimers.delete(key);
            }, 50));
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

        async suggest(pattern, rowKey) {
            const len = pattern.length;
            if (len < this.MIN_LENGTH || len > this.MAX_LENGTH) return [];
            if (!this.dict[len]) {
                const chunk = await this.idbGet(`len_${len}`); if (!chunk) return [];
                this.dict[len] = chunk;
            }
            const maxSug = 5; // Hardcoded requirement
            const maxCandidates = maxSug * 50;
            const worker = new Worker(URL.createObjectURL(new Blob([`
                  self.onmessage = function(e) {
                    const { dictChunk, pattern, max } = e.data;
                    const regex = new RegExp('^' + pattern.replace(/[*]/g, '.') + '$');
                    const out = [];
                    for (const word of dictChunk) {
                      if (regex.test(word)) out.push(word);
                      if (out.length >= max) break;
                    }
                    self.postMessage(out);
                  };
                `], { type: 'application/javascript' })));
            const candidates = await new Promise((resolve) => {
                worker.onmessage = (e) => { worker.terminate(); resolve([...new Set(e.data)]); };
                worker.postMessage({ dictChunk: this.dict[len], pattern: pattern.toUpperCase(), max: maxCandidates });
            });

            const exSets = this.loadExclusions(rowKey, len);
            const filtered = candidates.filter(w => {
                for (let i = 0; i < len; i++) {
                    const s = exSets[i];
                    if (s && s.has(w[i])) return false;
                }
                return true;
            });
            return filtered.slice(0, maxSug);
        },

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

                panel.updateSuggestions = async () => {
                    const curPat = panel.dataset.pattern || '';
                    const curRowKey = panel.dataset.rowkey;

                    const showOnComplete = true; // Always show
                    if (!showOnComplete && curPat && !curPat.includes('*')) {
                        if (listDiv.childNodes.length) listDiv.innerHTML = '';
                        return;
                    }

                    this.applyPanelTheme(panel);

                    if (!this.dictLoaded && this.dictLoading) {
                        if (!listDiv.firstChild || listDiv.firstChild.textContent !== '(loading dictionary…)') {
                            listDiv.innerHTML = '<span style="padding:2px;color:#ff0;">(loading dictionary…)</span>';
                        }
                        return;
                    }

                    const seq = ++panel._seq;
                    const sugs = await this.suggest(curPat, curRowKey);
                    if (seq !== panel._seq) return;

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

        getRowKey(crimeOption) {
            if (!crimeOption.dataset.crackKey) {
                crimeOption.dataset.crackKey = String(Date.now()) + '-' + Math.floor(Math.random() * 100000);
            }
            return crimeOption.dataset.crackKey;
        },

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

                if (!/[*]/.test(patText)) {
                    const newWord = patText.toUpperCase();
                    if (!/^[A-Z0-9_.]+$/.test(newWord)) {
                        this.crackLog('Revealed word contains invalid chars. skippin:', newWord);
                    } else {
                        (async () => {
                            const localHas = await this.isWordInLocalDict(newWord);
                            const supHas = this.remoteWords.has(newWord);
                            if (!localHas && !supHas) {
                                await this.addWordToLocalCache(newWord);
                                await this.enqueueOutbox(newWord);
                            } else if (supHas && !localHas) {
                                await this.addWordToLocalCache(newWord);
                            }
                        })();
                    }
                }

                const showOnComplete = true; // Always show
                const isComplete = patText && !patText.includes('*');
                if (isComplete && !showOnComplete) {
                    const existing = crimeOption.querySelector('.__crackhelp_panel');
                    if (existing) {
                        const key = existing.dataset.rowkey;
                        if (this.panelUpdateTimers.has(key)) { clearTimeout(this.panelUpdateTimers.get(key)); this.panelUpdateTimers.delete(key); }
                        existing.remove();
                    }
                } else {
                    if (!/^[*]+$/.test(patText)) this.prependPanelToRow(crimeOption, patText, rowKey);
                }
            }
        }
    };

    window.SidekickModules = window.SidekickModules || {};
    window.SidekickModules.Cracking = CrackingModule;

    console.log('✅ Sidekick Cracking Module loaded and ready');
})();
