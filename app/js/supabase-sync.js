/* supabase-sync.js - automatic two-way sync between this app's local storage and Supabase.

   How it works (the pages themselves are NOT changed):
   - Local storage (localStorage + IndexedDB) stays the fast working copy, so the app never waits for the network.
   - Every write is noticed (hooks on setItem / removeItem / IndexedDB put+delete), queued, and uploaded in the
     background in batches. The queue is saved, so offline edits and crashes lose nothing.
   - Changes made on another device are pulled every ~20 s, on window focus, and at start-up.
   - Big values (screenshots, certificates) are split into 700 KB parts automatically.
   - Last write wins per key. Deleted keys are kept as tombstones so deletions reach other devices too.
   - Page-by-page rollout: only keys that belong to a page listed in TRADELY_SUPABASE.pages are synced.

   Must load right after profiles.js and supabase-config.js (before every page script). */
(function () {
    'use strict';
    var CFG = window.TRADELY_SUPABASE || {};
    var TP = window.TradelyProfiles;
    if (!TP || !TP.raw) { window.TradelySync = { configured: false }; return; }
    var R = TP.raw;
    /* Every user connects their OWN Supabase project from the welcome screen. URL + anon key are kept on this device
       (CFG_KEY). All three keys start with 'tradely_sync_' so profiles.js never moves them into a profile. */
    var CFG_KEY = 'tradely_sync_cfg_v1', WIPE_KEY = 'tradely_sync_wipe_v1', META_KEY = 'tradely_sync_meta_v1', SAVED_KEY = 'tradely_sync_saved_v1';

    /* A wipe was requested (log out / account deleted / a different account signed in): do it first thing on the next
       load, before any page script has loaded data, then reload once more. Done at load time so a page that saves on
       unload cannot write its data back after the wipe. */
    function runPendingWipe() {
        var opt = {}; try { opt = JSON.parse(R.get(WIPE_KEY)) || {}; } catch (e) {}
        var names = ['tradely_db'];
        try { R.all().forEach(function (p) { names.push('tradely_db__' + p.id); }); } catch (e) {}
        var listed = (window.indexedDB && indexedDB.databases) ? indexedDB.databases().then(function (l) { return (l || []).map(function (d) { return d.name; }); }, function () { return []; }) : Promise.resolve([]);
        R.keys().forEach(function (k) { if (k === CFG_KEY || k === WIPE_KEY || k === SAVED_KEY || (opt.keepMeta && k === META_KEY)) return; R.rem(k); });
        try { sessionStorage.clear(); } catch (e) {}
        listed.then(function (l) {
            var seen = {}; names.concat(l).forEach(function (n) { if (n && /^tradely_db/.test(n) && !seen[n]) seen[n] = 1; });
            return Promise.all(Object.keys(seen).map(function (n) { return R.idbDelete ? R.idbDelete(n) : Promise.resolve(); }));
        }).then(function () { R.rem(WIPE_KEY); location.reload(); });
    }
    if (R.get(WIPE_KEY)) { window.TradelySync = { configured: false, wiping: true }; runPendingWipe(); return; }
    function requestWipe(keepMeta) { persist(); R.set(WIPE_KEY, JSON.stringify({ keepMeta: !!keepMeta })); location.reload(); }

    function readCfg() { try { var c = JSON.parse(R.get(CFG_KEY) || 'null'); if (c && c.url && c.anonKey) return c; } catch (e) {} return null; }
    var stored = readCfg();
    if (!stored && CFG.url && CFG.anonKey && !/YOUR[-_]/i.test(CFG.url + CFG.anonKey)) stored = { url: CFG.url, anonKey: CFG.anonKey };   // optional developer default
    var BASE = stored ? String(stored.url).replace(/\/+$/, '') : '', KEY = stored ? stored.anonKey : '';
    var LS = window.localStorage, SP = Storage.prototype;
    var CHUNK = 700000, BATCH_BYTES = 3000000, POLL_MS = 20000, FLUSH_MS = 1200, FLUSH_MAX_MS = 5000;

    /* ------------------------------------------------------------------ *
     * Page groups: which keys belong to which page (the rollout switch)
     * ------------------------------------------------------------------ */
    var GROUPS = {
        overview:     { label: 'Overview (accounts and trade data)', ls: [/^tradely_accounts$/, /^tradely_calendar_entries(_forex|_binary)?(_.+)?$/, /^tradely_acc_(days|funds|targets)_/, /^tradely_starting_balance$/], idb: [] },
        accounts:     { label: 'Accounts (rules, payouts)', ls: [/^tradely_rule_templates$/, /^tradely_payout_notified/], idb: [] },
        journal:      { label: 'Journal', ls: [/^tradely_journal_annotations_v1$/], idb: [] },
        monthly:      { label: 'Monthly Summary', ls: [/^tradely_ms_prefs_v1$/], idb: [] },
        strategies:   { label: 'Strategies & Rules', ls: [/^tradely_strategies$/], idb: [] },
        psychology:   { label: 'Psychology (incl. feed snapshot)', ls: [/^tradely_psy_/, /^tradely_cons_goal_/, /^tradely_psychology_feed$/], idb: [] },
        notes:        { label: 'Notes', ls: [/^tradely_notes/], idb: [] },
        certificates: { label: 'Certificates', ls: [/^tradely_certificates$/], idb: [/^tradely_certificates$/] },
        // API keys: stored per profile, as plain text, protected by your Supabase login (row level security). Remove 'apikeys' from `pages` to keep keys on each device only.
        apikeys:      { label: 'API keys (AI providers, Twelve Data)', ls: [/^tradely_ai_config_v1$/, /^tradely_groq_api_key$/, /^tw_twelvedata_api_key$/], idb: [] },
        // The calculator window position is deliberately NOT synced (it depends on each screen).
        settings:     { label: 'Settings (calculator, notifications)', ls: [/^tradely_calc_(prefs|hist)$/, /^tradely_notifications_v1$/], idb: [] }
    };
    function activeGroups() { return (CFG.pages || []).filter(function (g) { return GROUPS[g]; }); }
    function enabled(ns, key) {
        if (ns === 'meta') return true;
        var kind = ns.split(':')[0], g = activeGroups();
        for (var i = 0; i < g.length; i++) {
            var rx = GROUPS[g[i]][kind === 'idb' ? 'idb' : 'ls'];
            for (var j = 0; j < rx.length; j++) if (rx[j].test(key)) return true;
        }
        return false;
    }

    /* ------------------------------------------------------------------ *
     * Persistent bookkeeping (device-local, never synced)
     * ------------------------------------------------------------------ */
    var meta = (function () {
        var m = null; try { m = JSON.parse(R.get(META_KEY) || 'null'); } catch (e) {}
        m = m && typeof m === 'object' ? m : {};
        m.dirty = m.dirty || {}; m.sent = m.sent || {}; m.parts = m.parts || {}; m.fields = m.fields || {};
        m.device = m.device || ('d' + Math.random().toString(36).slice(2, 10));
        return m;
    })();
    var saveTimer = 0;
    function persist() { try { R.set(META_KEY, JSON.stringify(meta)); } catch (e) {} }
    function persistSoon() { if (!saveTimer) saveTimer = setTimeout(function () { saveTimer = 0; persist(); }, 300); }

    /* ------------------------------------------------------------------ *
     * Saved accounts: several Supabase projects / logins on one device.
     * Stored OUTSIDE the data wipe (SAVED_KEY) as { list, next, prefill, add }.
     *   list    [{ id, nickname, url, anonKey, userId, email, name, refresh, savedAt }]
     *           (only the refresh token is kept, never the password; it is renewed on every sign-in refresh)
     *   next    id to sign in to automatically after the device was wiped (switching)
     *   prefill { url, anonKey, email } opens the Login screen filled in (a saved login had expired)
     *   add     true = open Fresh start / Login after the wipe (adding another account)
     * ------------------------------------------------------------------ */
    function readSaved() { var x = null; try { x = JSON.parse(R.get(SAVED_KEY) || 'null'); } catch (e) {} if (!x || !Array.isArray(x.list)) x = { list: [] }; x.list = x.list.filter(function (e) { return e && e.id && e.url && e.anonKey && e.refresh; }); return x; }
    function writeSaved(x) { try { R.set(SAVED_KEY, JSON.stringify(x)); } catch (e) {} try { window.dispatchEvent(new Event('tradely:accounts-changed')); } catch (e) {} }
    function hostOf(u) { try { return new URL(u).host; } catch (e) { return String(u || ''); } }
    function entryId(url, uid) { return hostOf(url) + '|' + uid; }
    function curEntryId() { var u = meta.session && meta.session.user; return u && u.id ? entryId(BASE, u.id) : null; }
    function findSaved(id) { var l = readSaved().list; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
    function upsertSaved(e) { var x = readSaved(), i = -1; x.list.forEach(function (o, n) { if (o.id === e.id) i = n; }); if (i < 0) x.list.push(e); else x.list[i] = Object.assign(x.list[i], e); writeSaved(x); }
    function removeSaved(id) { if (!id) return; var x = readSaved(); x.list = x.list.filter(function (o) { return o.id !== id; }); writeSaved(x); }
    function nickOf(e) { return String((e && (e.nickname || e.name || String(e.email || '').split('@')[0])) || 'Account'); }
    function saveCurrent(nick) {
        var u = meta.session && meta.session.user; if (!u) return;
        var id = curEntryId(), old = findSaved(id);
        upsertSaved({ id: id, nickname: String(nick || '').trim().slice(0, 30) || (old && old.nickname) || u.name || String(u.email || '').split('@')[0], url: BASE, anonKey: KEY, userId: u.id, email: u.email || '', name: u.name || '', refresh: meta.session.refresh, savedAt: old ? old.savedAt : Date.now() });
    }
    function setNext(patch) { var x = readSaved(); x.next = null; x.prefill = null; x.add = false; Object.keys(patch || {}).forEach(function (k) { x[k] = patch[k]; }); writeSaved(x); }

    /* ------------------------------------------------------------------ *
     * Small helpers
     * ------------------------------------------------------------------ */
    var applying = false, flushing = false, pulling = false, initializing = false, ver = {}, lastError = '', lastSync = meta.lastSync || 0, deleting = false, gateOpen = false;
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    /* The Psychology feed snapshot is rebuilt (with a new generatedAt) every time the page renders. Ignore that field,
       so re-rendering does not upload anything unless the real content changed. */
    function hashFor(key, s) { return hash(baseOf(key) === 'tradely_psychology_feed' ? s.replace(/"generatedAt":\d+/, '"generatedAt":0') : s); }
    function hash(s) { var h = 5381, i = s.length; while (i) h = (h * 33) ^ s.charCodeAt(--i); return (h >>> 0).toString(36) + ':' + s.length; }
    /* Per-day sync: calendar/day objects ({ '2026-11-10': {...}, ... }) are stored in the cloud one row per day
       (key 'K::day'), so saving one trade uploads only that day instead of the whole account blob with all screenshots. */
    var SPLIT_RX = /^tradely_(calendar_entries(_forex|_binary)?_.+|acc_days_.+)$/, SEP = '::';
    function splitKind(ns, key) {                    // 'obj' = object keyed by day, 'arr' = list of {id} items, null = not split
        if (ns.indexOf('ls:') === 0 && SPLIT_RX.test(key)) return 'obj';
        if ((ns.indexOf('ls:') === 0 && key === 'tradely_notes') || (ns.indexOf('idb:') === 0 && key === 'tradely_certificates')) return 'arr';
        return null;
    }
    function isSplit(ns, key) { return !!splitKind(ns, key); }
    function toPseudo(ns, key, str) {                // value string -> { field: value } (arrays get an '__order' field)
        var v; try { v = JSON.parse(str); } catch (e) { return null; }
        var kind = splitKind(ns, key);
        if (kind === 'obj') return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
        if (kind !== 'arr' || !Array.isArray(v)) return null;
        var o = {}, ord = [];
        for (var i = 0; i < v.length; i++) { var it = v[i]; if (!it || it.id == null || String(it.id) === '__order' || Object.prototype.hasOwnProperty.call(o, String(it.id))) return null; o[String(it.id)] = it; ord.push(String(it.id)); }
        o.__order = ord; return o;
    }
    function fromPseudo(ns, key, o) {
        if (splitKind(ns, key) === 'obj') return o;
        var ord = Array.isArray(o.__order) ? o.__order : [], out = [], seen = {};
        ord.forEach(function (id) { if (o[id] && !seen[id]) { out.push(o[id]); seen[id] = 1; } });
        Object.keys(o).forEach(function (id) { if (id !== '__order' && !seen[id]) out.push(o[id]); });
        return out;
    }
    function baseOf(key) { var i = key.indexOf(SEP); return i < 0 ? key : key.slice(0, i); }
    function splitId(id) { var i = id.indexOf('|'); return { ns: id.slice(0, i), key: id.slice(i + 1) }; }
    function profiles() { return TP.raw.all().filter(function (p) { return !p.deleted; }); }                    // live profiles
    function deadPids() { var o = {}; TP.raw.all().forEach(function (p) { if (p.deleted) o[p.id] = 1; }); return o; }  // deleted profiles (tombstones)
    function nsPid(ns) { return ns === 'meta' ? null : ns.slice(ns.indexOf(':') + 1); }
    function curPid() { var c = TP.current(); return c ? c.id : null; }
    function dbNameFor(pid) { var p = profiles().filter(function (x) { return x.id === pid; })[0]; return p && p.legacyDb ? 'tradely_db' : 'tradely_db__' + pid; }
    function pidFromDb(name) {
        if (name === 'tradely_db') { var p = profiles().filter(function (x) { return x.legacyDb; })[0]; return p ? p.id : null; }
        if (name.indexOf('tradely_db__') === 0) { var id = name.slice(12); return id === 'locked' ? null : id; }
        return null;
    }
    function offlineErr(e) { return e && (e.name === 'TypeError' || /Failed to fetch|NetworkError|network/i.test(String(e.message))); }

    /* ------------------------------------------------------------------ *
     * IndexedDB access (the "kv" store of tradely_db, per profile)
     * ------------------------------------------------------------------ */
    function idbOpen(pid) {
        return new Promise(function (res, rej) {
            if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
            var r = R.idbOpen(dbNameFor(pid), 1);
            r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
            r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
        });
    }
    function idbTx(pid, mode, fn) {
        return idbOpen(pid).then(function (db) {
            return new Promise(function (res, rej) {
                var tx = db.transaction('kv', mode), out;
                try { out = fn(tx.objectStore('kv')); } catch (e) { db.close(); return rej(e); }
                tx.oncomplete = function () { db.close(); res(out && typeof out === 'object' && 'result' in out ? out.result : out); };   // a missing key must give undefined, not the request object
                tx.onerror = tx.onabort = function () { db.close(); rej(tx.error); };
            });
        });
    }
    function idbGet(pid, k) { return idbTx(pid, 'readonly', function (s) { return s.get(k); }); }
    function idbKeys(pid) { return idbTx(pid, 'readonly', function (s) { return s.getAllKeys(); }).then(function (k) { return (k || []).map(String); }); }
    function idbPut(pid, k, v) { applying = true; return idbTx(pid, 'readwrite', function (s) { var r = s.put(v, k); applying = false; return r; }).then(function () {}, function (e) { applying = false; throw e; }); }
    function idbDel(pid, k) { applying = true; return idbTx(pid, 'readwrite', function (s) { var r = s.delete(k); applying = false; return r; }).then(function () {}, function (e) { applying = false; throw e; }); }

    /* ------------------------------------------------------------------ *
     * Read one item from local storage as {exists, value:string}
     * ------------------------------------------------------------------ */
    function readLocal(ns, key) {
        var kind = ns.split(':')[0], pid = ns.slice(ns.indexOf(':') + 1);
        if (kind === 'meta') { var v0 = R.get(R.PROFILES_KEY); return Promise.resolve(v0 == null ? { exists: false } : { exists: true, value: TP.raw.cloudForm(v0) }); }
        if (kind === 'ls') { var v = R.get('tp:' + pid + ':' + key); return Promise.resolve(v == null ? { exists: false } : { exists: true, value: v }); }
        return idbGet(pid, key).then(function (val) {
            if (val === undefined) return { exists: false };
            return { exists: true, value: JSON.stringify(val) };
        });
    }

    /* ------------------------------------------------------------------ *
     * Change capture (hooks). Installed immediately so no write is missed.
     * ------------------------------------------------------------------ */
    function mark(id) {
        if (!meta.initialDone) return;               // the first sync uploads everything anyway
        meta.dirty[id] = 1; ver[id] = (ver[id] || 0) + 1;
        persistSoon(); scheduleFlush();
    }
    function noteLs(k) {
        if (applying || R.isLocked()) return;
        var pid = curPid(); if (!pid) return;
        var ns = 'ls:' + pid; if (enabled(ns, k)) mark(ns + '|' + k);
    }
    var pSet = SP.setItem, pRem = SP.removeItem, pClear = SP.clear;
    SP.setItem = function (k) { var r = pSet.apply(this, arguments); if (this === LS) noteLs(String(k)); return r; };
    SP.removeItem = function (k) { var r = pRem.apply(this, arguments); if (this === LS) noteLs(String(k)); return r; };
    SP.clear = function () {
        var ks = []; if (this === LS) { for (var i = 0; i < LS.length; i++) ks.push(LS.key(i)); }
        var r = pClear.apply(this, arguments); ks.forEach(noteLs); return r;
    };
    if (window.IDBObjectStore) {
        var OS = IDBObjectStore.prototype, oPut = OS.put, oAdd = OS.add, oDelete = OS.delete, oClear = OS.clear, oGetKeys = OS.getAllKeys;
        var noteIdb = function (store, k) {
            if (applying || k === undefined || k === null || typeof k === 'object') return;
            try {
                var pid = pidFromDb(store.transaction.db.name); if (!pid) return;
                var ns = 'idb:' + pid, key = String(k); if (enabled(ns, key)) mark(ns + '|' + key);
            } catch (e) {}
        };
        OS.put = function (v, k) { var r = oPut.apply(this, arguments); noteIdb(this, k); return r; };
        OS.add = function (v, k) { var r = oAdd.apply(this, arguments); noteIdb(this, k); return r; };
        OS.delete = function (k) { var r = oDelete.apply(this, arguments); noteIdb(this, k); return r; };
        OS.clear = function () {            // list the keys first (same transaction, runs before the clear), then mark each as changed
            try {
                if (!applying && oGetKeys) { var st = this, rq = oGetKeys.call(st); rq.onsuccess = function () { (rq.result || []).forEach(function (k) { noteIdb(st, k); }); }; }
            } catch (e) {}
            return oClear.apply(this, arguments);
        };
    }
    window.addEventListener('tradely:profiles-saved', function () { if (!applying) mark('meta|profiles'); });

    /* ------------------------------------------------------------------ *
     * Auth (Supabase GoTrue over fetch) and API calls
     * ------------------------------------------------------------------ */
    var refreshing = null;
    function nameOf(u) { var m = u && u.user_metadata; return String((m && (m.name || m.full_name)) || ''); }
    function setSession(j) {
        var old = meta.session && meta.session.user || {};
        meta.session = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, user: { id: (j.user && j.user.id) || old.id, email: (j.user && j.user.email) || old.email, name: nameOf(j.user) || old.name || '' } };
        if (meta.session.user.email) meta.email = meta.session.user.email;
        persist();
        var sid = curEntryId();
        if (sid && findSaved(sid)) upsertSaved({ id: sid, refresh: meta.session.refresh, email: meta.session.user.email, name: meta.session.user.name, url: BASE, anonKey: KEY });
    }
    function authErr() { var e = new Error('Not signed in'); e.auth = true; return e; }
    function refreshToken() {
        if (refreshing) return refreshing;
        refreshing = fetch(BASE + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: meta.session && meta.session.refresh }) })
            .then(function (r) {
                if (!r.ok) { if (r.status === 400 || r.status === 401 || r.status === 403 || r.status === 422) { meta.session = null; persist(); setStatus(); if (!gateOpen && !deleting) setTimeout(function () { showGate().then(function (ok) { if (ok) boot(); }); }, 0); } throw authErr(); }
                return r.json().then(setSession);
            })
            .then(function () { refreshing = null; }, function (e) { refreshing = null; throw e; });
        return refreshing;
    }
    function api(path, opt, retried) {
        opt = opt || {};
        if (!meta.session) return Promise.reject(authErr());
        var pre = meta.session.exp - Date.now() < 60000 ? refreshToken() : Promise.resolve();
        return pre.then(function () {
            return fetch(BASE + path, { method: opt.method || 'GET', keepalive: !!opt.keepalive, body: opt.body, headers: Object.assign({ apikey: KEY, Authorization: 'Bearer ' + meta.session.access, 'Content-Type': 'application/json' }, opt.headers || {}) });
        }).then(function (r) {
            if (r.status === 401 && !retried) return refreshToken().then(function () { return api(path, opt, true); });
            if (r.status === 401) throw authErr();
            if (!r.ok) return r.text().then(function (t) { var e = new Error('Supabase ' + r.status + ': ' + t.slice(0, 300)); e.status = r.status; throw e; });
            return r;
        });
    }
    var CONFIRM_MSG = 'Your Supabase project still asks for email confirmation. Click Copy SQL, run it again in SQL Editor (it turns confirmation off), then try again.';
    function friendly(j) {
        var m = String((j && (j.error_description || j.msg || j.message || j.error)) || 'Could not sign in.');
        if (/already registered|already been registered/i.test(m)) return 'This email is already registered. Use Login instead.';
        if (/invalid login/i.test(m)) return 'Wrong email or password.';
        if (/not confirmed/i.test(m)) return CONFIRM_MSG;
        return m;
    }
    /* Resolves { other: true } when this device held a different account's data (the caller then wipes it). */
    function authCall(kind, email, password, name) {
        var url = kind === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
        var body = { email: email, password: password }; if (kind === 'signup' && name) body.data = { name: name };
        return fetch(BASE + url, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: {} }; }); })
            .then(function (o) {
                if (!o.ok) throw new Error(friendly(o.j));
                if (!o.j.access_token) {
                    if (kind !== 'signup') throw new Error('Could not sign in.');
                    // the project returned the new user without a session: sign in straight away (no mail step)
                    return authCall('signin', email, password).catch(function (e) {
                        if (offlineErr(e)) throw e;
                        throw new Error(/confirmation/i.test(e.message) ? e.message : 'This email may already be registered. Use Login instead.');
                    });
                }
                return adopt(o.j);
            });
    }
    /* A session answer arrived (password login or saved refresh token): make it the current session.
       { other: true } = this device held a different account's data (the caller then wipes it). */
    function adopt(j) {
        var uid = j.user && j.user.id, other = !!(meta.userId && meta.userId !== uid);
        if (other) { meta.initialDone = false; meta.dirty = {}; meta.sent = {}; meta.parts = {}; meta.fields = {}; meta.purge = []; meta.lastPull = null; }
        meta.userId = uid; setSession(j); lastError = ''; return { other: other };
    }
    /* Sign in with a saved account's refresh token (no password). */
    function refreshLogin(e) {
        return fetch(e.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: e.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: e.refresh }) })
            .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }, function () { return { r: r, j: {} }; }); })
            .then(function (o) {
                if (!o.r.ok || !o.j.access_token) { var er = new Error('This saved login has expired. Log in again with your password.'); er.expired = o.r.status >= 400 && o.r.status < 500; throw er; }
                return o.j;
            });
    }
    function applySaved(e, j) { BASE = e.url; KEY = e.anonKey; stored = { url: e.url, anonKey: e.anonKey }; return adopt(j); }

    /* ------------------------------------------------------------------ *
     * Deleted profiles: forget their queue, delete their cloud rows
     * ------------------------------------------------------------------ */
    function forgetPid(pid) {
        [meta.dirty, meta.sent, meta.parts, meta.fields].forEach(function (o) { Object.keys(o).forEach(function (id) { var n = id.slice(0, id.indexOf('|')); if (n !== 'meta' && nsPid(n) === pid) delete o[id]; }); });
        persistSoon();
    }
    function purgeRemote() {
        meta.purge = meta.purge || []; if (!meta.purge.length || !meta.session || !navigator.onLine) return Promise.resolve();
        var list = meta.purge.slice();
        return Promise.all(list.map(function (pid) {
            var nss = '"ls:' + pid + '","idb:' + pid + '"';
            return api('/rest/v1/app_data?ns=in.(' + encodeURIComponent(nss) + ')', { method: 'DELETE', keepalive: true }).then(function () { meta.purge = meta.purge.filter(function (x) { return x !== pid; }); persist(); }, function () {});
        }));
    }
    window.addEventListener('tradely:profile-removed', function (e) {
        var pid = e && e.detail && e.detail.id; if (!pid) return;
        forgetPid(pid); meta.purge = meta.purge || []; if (meta.purge.indexOf(pid) < 0) meta.purge.push(pid);
        persist(); purgeRemote();
    });

    /* ------------------------------------------------------------------ *
     * PUSH: dirty keys -> Supabase
     * ------------------------------------------------------------------ */
    var flushTimer = 0, firstDirtyAt = 0, backoff = 0;
    function scheduleFlush(delay) {
        if (!meta.session) { setStatus(); return; }
        var now = Date.now(); if (!firstDirtyAt) firstDirtyAt = now;
        clearTimeout(flushTimer);
        var wait = delay != null ? delay : Math.min(FLUSH_MS, Math.max(0, firstDirtyAt + FLUSH_MAX_MS - now));
        flushTimer = setTimeout(flush, wait); setStatus();
    }
    function toRows(ns, key, value) {
        var uid = meta.session.user.id, n = Math.max(1, Math.ceil(value.length / CHUNK)), rows = [];
        for (var i = 0; i < n; i++) rows.push({ user_id: uid, ns: ns, key: key, part: i, parts: n, value: value.slice(i * CHUNK, (i + 1) * CHUNK), deleted: false, device: meta.device });
        return rows;
    }
    function post(rows) {
        return api('/rest/v1/app_data?on_conflict=user_id,ns,key,part', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
    }
    function commit(items) {
        var cleanups = [];
        items.forEach(function (it) {
            var p = splitId(it.id);
            if (it.base) {
                if (ver[it.id] === it.v0 || ver[it.id] === undefined) delete meta.dirty[it.id];
                meta.sent[it.id] = it.h; meta.fields[it.id] = it.fields;
                if (it.legacy) cleanups.push(api('/rest/v1/app_data?ns=eq.' + encodeURIComponent(p.ns) + '&key=eq.' + encodeURIComponent(p.key) + '&part=gte.0', { method: 'DELETE' }).catch(function () {}));
                return;
            }
            if (!it.sub && (ver[it.id] === it.v0 || ver[it.id] === undefined)) delete meta.dirty[it.id];
            if (!it.sub) meta.sent[it.id] = it.h;
            var prev = meta.parts[it.id] || 1; meta.parts[it.id] = it.n;
            if (it.n === 1) delete meta.parts[it.id];
            if (prev > it.n) cleanups.push(api('/rest/v1/app_data?ns=eq.' + encodeURIComponent(p.ns) + '&key=eq.' + encodeURIComponent(p.key) + '&part=gte.' + it.n, { method: 'DELETE' }).catch(function () {}));
        });
        persistSoon(); return Promise.all(cleanups);
    }
    function flush() {
        if (flushing || deleting || !meta.session || !meta.initialDone) return Promise.resolve();
        if (!navigator.onLine) { setStatus(); return Promise.resolve(); }
        purgeRemote();
        var ids = Object.keys(meta.dirty), live = {}; profiles().forEach(function (x) { live[x.id] = 1; });
        firstDirtyAt = 0;
        if (!ids.length) { setStatus(); return Promise.resolve(); }
        flushing = true; setStatus('syncing');
        var batch = [], bytes = 0, items = [];
        function send() { if (!batch.length && !items.length) return Promise.resolve(); var b = batch, it = items; batch = []; items = []; bytes = 0; return (b.length ? post(b) : Promise.resolve()).then(function () { return commit(it); }); }
        var chain = Promise.resolve();
        ids.forEach(function (id) {
            chain = chain.then(function () {
                var p = splitId(id), v0 = ver[id];
                if (!enabled(p.ns, p.key)) { delete meta.dirty[id]; return; }
                if (p.ns !== 'meta' && !live[nsPid(p.ns)]) { delete meta.dirty[id]; return; }
                return readLocal(p.ns, p.key).then(function (cur) {
                    var h = cur.exists ? hashFor(p.key, cur.value) : 'del';
                    if (meta.sent[id] === h) { if (ver[id] === v0 || v0 === undefined) delete meta.dirty[id]; return; }
                    var rows, group = [], obj = null, uid = meta.session.user.id;
                    if (isSplit(p.ns, p.key)) {
                        obj = cur.exists ? toPseudo(p.ns, p.key, cur.value) : {};
                    }
                    if (obj) {
                        var fh = meta.fields[id] || {}, nfh = {}; rows = [];
                        Object.keys(obj).forEach(function (f) {
                            var sv = JSON.stringify(obj[f]); if (sv === undefined) return;
                            var fhash = hash(sv); nfh[f] = fhash;
                            if (fh[f] !== fhash) { var rr = toRows(p.ns, p.key + SEP + f, sv); rows = rows.concat(rr); group.push({ id: p.ns + '|' + p.key + SEP + f, sub: true, h: fhash, n: rr.length }); }
                        });
                        Object.keys(fh).forEach(function (f) { if (!(f in nfh)) { rows.push({ user_id: uid, ns: p.ns, key: p.key + SEP + f, part: 0, parts: 1, value: null, deleted: true, device: meta.device }); group.push({ id: p.ns + '|' + p.key + SEP + f, sub: true, h: 'del', n: 1 }); } });
                        group.push({ id: id, v0: v0, h: h, n: 1, base: true, fields: nfh, legacy: !meta.fields[id] || !cur.exists });
                    } else {
                        rows = cur.exists ? toRows(p.ns, p.key, cur.value) : [{ user_id: uid, ns: p.ns, key: p.key, part: 0, parts: 1, value: null, deleted: true, device: meta.device }];
                        group.push({ id: id, v0: v0, h: h, n: rows.length });
                    }
                    var size = rows.reduce(function (sum, r) { return sum + (r.value ? r.value.length : 0) + 200; }, 0);
                    var pre = batch.length && bytes + size > BATCH_BYTES ? send() : Promise.resolve();
                    return pre.then(function () { batch = batch.concat(rows); bytes += size; items = items.concat(group); });
                });
            });
        });
        return chain.then(send).then(function () {
            flushing = false; backoff = 0; lastError = ''; lastSync = Date.now(); meta.lastSync = lastSync; persistSoon();
            if (Object.keys(meta.dirty).length) scheduleFlush(300); else setStatus();
        }).catch(function (e) {
            flushing = false; persistSoon();
            if (e && e.auth) { setStatus(); return; }
            lastError = offlineErr(e) ? '' : String(e.message || e);
            backoff = Math.min(60000, (backoff || 2000) * 2); setStatus(offlineErr(e) ? 'offline' : 'error');
            flushTimer = setTimeout(flush, backoff);
        });
    }

    /* ------------------------------------------------------------------ *
     * PULL: Supabase -> local storage
     * ------------------------------------------------------------------ */
    function iso(msAgo, from) { return new Date(new Date(from).getTime() - msAgo).toISOString(); }
    function listRemote(since, aliveOnly) {
        var out = [], offset = 0;
        function page() {
            var q = '/rest/v1/app_data?select=ns,key,parts,deleted,updated_at&part=eq.0&order=updated_at.asc,ns.asc,key.asc&limit=1000&offset=' + offset;
            if (since) q += '&updated_at=gt.' + encodeURIComponent(iso(10000, since));
            if (aliveOnly) q += '&deleted=eq.false';
            return api(q).then(function (r) { return r.json(); }).then(function (rows) {
                out = out.concat(rows); if (rows.length === 1000) { offset += 1000; return page(); }
                return out;
            });
        }
        return page();
    }
    function fetchValues(items) {            // items: [{ns,key,parts,deleted}] -> map id -> {deleted, value}
        var byNs = {}, res = {};
        items.forEach(function (it) { (byNs[it.ns] = byNs[it.ns] || []).push(it); });
        var chain = Promise.resolve();
        Object.keys(byNs).forEach(function (ns) {
            var live = byNs[ns].filter(function (it) { if (it.deleted) { res[ns + '|' + it.key] = { deleted: true }; return false; } return true; });
            for (var i = 0; i < live.length; i += 8) (function (grp) {
                chain = chain.then(function () {
                    var keys = grp.map(function (it) { return '"' + it.key.replace(/"/g, '') + '"'; }).join(',');
                    return api('/rest/v1/app_data?select=key,part,parts,value&ns=eq.' + encodeURIComponent(ns) + '&deleted=eq.false&key=in.(' + encodeURIComponent(keys) + ')&order=key.asc,part.asc').then(function (r) { return r.json(); }).then(function (rows) {
                        var parts = {};
                        rows.forEach(function (r) { var o = parts[r.key] = parts[r.key] || { n: r.parts, v: [] }; o.v[r.part] = r.value || ''; });
                        grp.forEach(function (it) {
                            var o = parts[it.key];
                            if (o && o.v.length >= o.n && o.v.slice(0, o.n).every(function (x) { return x !== undefined; })) res[ns + '|' + it.key] = { deleted: false, value: o.v.slice(0, o.n).join('') };
                            else res[ns + '|' + it.key] = { incomplete: true };
                        });
                    });
                });
            })(live.slice(i, i + 8));
        });
        return chain.then(function () { return res; });
    }
    function applyOne(ns, key, rec, force) {      // returns Promise<'changed'|'same'|'skipped'>
        var id = ns + '|' + key, kind = ns.split(':')[0], pid = ns.slice(ns.indexOf(':') + 1);
        if (!force && meta.dirty[id] && kind !== 'meta') return Promise.resolve('skipped');      // an unsent local edit wins (the profile list is merged instead)
        if (rec.incomplete) return Promise.resolve('skipped');
        var h = rec.deleted ? 'del' : hashFor(key, rec.value);
        if (kind === 'meta') {
            if (rec.deleted) { meta.sent[id] = h; return Promise.resolve('same'); }
            var curStr = R.get(R.PROFILES_KEY), before = TP.raw.all(), merged = TP.raw.mergeLocal(curStr, rec.value);
            meta.sent[id] = h;
            if (TP.raw.cloudForm(merged) !== rec.value) { meta.dirty[id] = 1; ver[id] = (ver[id] || 0) + 1; }   // this device knows profiles the cloud list lacks: push the union back
            if (merged === curStr) return Promise.resolve('same');
            R.set(R.PROFILES_KEY, merged);
            var after = TP.raw.all(), active = R.get(R.ACTIVE_KEY);
            before.forEach(function (o) {                    // a profile deleted on another device: remove it here too
                var n = after.filter(function (x) { return x.id === o.id; })[0];
                if (!o.deleted && n && n.deleted) { TP.raw.purgeLocal(o); forgetPid(o.id); if (active === o.id) R.rem(R.ACTIVE_KEY); }
            });
            var live = after.filter(function (x) { return !x.deleted; });
            if (live.length === 1 && !R.get(R.ACTIVE_KEY)) R.set(R.ACTIVE_KEY, live[0].id);
            return Promise.resolve('changed');
        }
        if (kind === 'ls') {
            var full = 'tp:' + pid + ':' + key, now = R.get(full);
            if (rec.deleted) { meta.sent[id] = h; if (now == null) return Promise.resolve('same'); R.rem(full); return Promise.resolve('changed'); }
            if (now === rec.value) { meta.sent[id] = h; return Promise.resolve('same'); }
            if (!R.set(full, rec.value)) { lastError = 'Local storage is full - could not apply cloud data.'; return Promise.resolve('skipped'); }
            meta.sent[id] = h; return Promise.resolve('changed');
        }
        // idb
        if (rec.deleted) return idbDel(pid, key).then(function () { meta.sent[id] = h; return 'changed'; });
        return readLocal(ns, key).then(function (c) {
            if (c.exists && c.value === rec.value) { meta.sent[id] = h; return 'same'; }
            var val; try { val = JSON.parse(rec.value); } catch (e) { return 'skipped'; }
            return idbPut(pid, key, val).then(function () { meta.sent[id] = h; return 'changed'; });
        });
    }
    function applyFields(ns, base, recs, force) {   // per-item rows -> merge into the local value, written once
        var id = ns + '|' + base, pid = ns.slice(ns.indexOf(':') + 1), kind = ns.split(':')[0];
        if (!force && meta.dirty[id]) return Promise.resolve('skipped');
        return readLocal(ns, base).then(function (cur) {
            var obj = (cur.exists && toPseudo(ns, base, cur.value)) || {};
            var fh = meta.fields[id] = meta.fields[id] || {}, changed = false;
            Object.keys(recs).forEach(function (f) {
                var r = recs[f];
                if (r.deleted) { if (f in obj) { delete obj[f]; changed = true; } delete fh[f]; return; }
                if (f in obj && JSON.stringify(obj[f]) === r.value) { fh[f] = hash(r.value); return; }
                try { obj[f] = JSON.parse(r.value); fh[f] = hash(r.value); changed = true; } catch (e) {}
            });
            if (!changed) return 'same';
            var val = fromPseudo(ns, base, obj), out = JSON.stringify(val);
            if (kind === 'ls') {
                if (!R.set('tp:' + pid + ':' + base, out)) { lastError = 'Local storage is full - could not apply cloud data.'; return 'skipped'; }
                meta.sent[id] = hash(out); return 'changed';
            }
            return idbPut(pid, base, val).then(function () { meta.sent[id] = hash(out); return 'changed'; });
        });
    }
    // Pull changes. opts.full: everything. opts.force: overwrite unsent local edits too (used by "re-download").
    function pull(opts) {
        opts = opts || {};
        if (pulling || deleting || !meta.session) return Promise.resolve({ changed: 0, affectsView: false });
        pulling = true; setStatus('syncing');
        var changed = 0, affects = false, maxAt = meta.lastPull || null, incomplete = false;
        return listRemote(opts.full ? null : meta.lastPull, false).then(function (heads) {
            heads.forEach(function (h) { if (!maxAt || h.updated_at > maxAt) maxAt = h.updated_at; });
            heads = heads.filter(function (h) { return enabled(h.ns, baseOf(h.key)); });
            return fetchValues(heads);
        }).then(function (vals) {
            var chain = Promise.resolve(), cur = curPid(), fm = {}, normal = [];
            var dead = deadPids();
            Object.keys(vals).forEach(function (id) {
                var p = splitId(id);
                if (p.ns !== 'meta' && dead[nsPid(p.ns)]) return;      // data of a deleted profile is ignored
                if (vals[id].incomplete) { incomplete = true; return; }
                var b = baseOf(p.key);
                if (b !== p.key) { var bid = p.ns + '|' + b; (fm[bid] = fm[bid] || { ns: p.ns, key: b, recs: {} }).recs[p.key.slice(b.length + SEP.length)] = vals[id]; }
                else normal.push(id);
            });
            function done(p, r) { applying = false; if (r === 'changed') { changed++; if (p.ns === 'meta' || p.ns === 'ls:' + cur || p.ns === 'idb:' + cur) affects = true; } }
            normal.sort(function (a, b) { return (a === 'meta|profiles' ? 0 : 1) - (b === 'meta|profiles' ? 0 : 1); });     // profile list first
            normal.forEach(function (id) {
                chain = chain.then(function () {
                    var p = splitId(id); applying = true;
                    return applyOne(p.ns, p.key, vals[id], opts.force).then(function (r) { done(p, r); }, function (e) { applying = false; throw e; });
                });
            });
            Object.keys(fm).forEach(function (bid) {
                chain = chain.then(function () {
                    var g = fm[bid]; applying = true;
                    return applyFields(g.ns, g.key, g.recs, opts.force).then(function (r) { done(g, r); }, function (e) { applying = false; throw e; });
                });
            });
            return chain;
        }).then(function () {
            if (!incomplete && maxAt) meta.lastPull = maxAt;
            pulling = false; lastError = ''; lastSync = Date.now(); meta.lastSync = lastSync; persist(); setStatus();
            if (meta.initialDone && meta.dirty['meta|profiles']) scheduleFlush(300);
            return { changed: changed, affectsView: affects };
        }).catch(function (e) {
            applying = false; pulling = false;
            if (!(e && e.auth)) { lastError = offlineErr(e) ? '' : String(e.message || e); setStatus(offlineErr(e) ? 'offline' : 'error'); } else setStatus();
            return { changed: changed, affectsView: affects, error: e };
        });
    }

    /* ------------------------------------------------------------------ *
     * First sync on this device (gate screen)
     * ------------------------------------------------------------------ */
    function scanLocal() {          // every syncable local item: [{ns,key}]
        var out = [];
        if (R.get(R.PROFILES_KEY)) out.push({ ns: 'meta', key: 'profiles' });
        R.keys().forEach(function (k) {
            var m = /^tp:([^:]+):(.*)$/.exec(k); if (!m || m[1] === '__locked__' || deadPids()[m[1]]) return;
            if (enabled('ls:' + m[1], m[2])) out.push({ ns: 'ls:' + m[1], key: m[2] });
        });
        var chain = Promise.resolve();
        profiles().forEach(function (p) {
            chain = chain.then(function () {
                return idbKeys(p.id).then(function (ks) { ks.forEach(function (k) { if (enabled('idb:' + p.id, k)) out.push({ ns: 'idb:' + p.id, key: k }); }); }, function () {});
            });
        });
        return chain.then(function () { return out; });
    }
    function chooseConflict(n) {
        return new Promise(function (res) {
            var o = overlay('<div><h2 class="text-base font-bold text-white">Data already exists in the cloud</h2>' +
                '<p class="text-xs text-gray-400 mt-1.5 leading-relaxed">This device and your cloud both have saved data (' + n + ' item' + (n === 1 ? '' : 's') + ' exist in both). Items that exist only on one side are always kept. For items on both sides, which copy should win?</p></div>' +
                '<div class="space-y-2"><button id="ts-local" class="w-full px-3 py-2.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white">This device wins (upload my data)</button>' +
                '<button id="ts-cloud" class="w-full px-3 py-2.5 rounded-md text-xs font-semibold border border-aura-border text-gray-200 hover:bg-aura-hover">Cloud wins (download cloud data)</button></div>');
            o.querySelector('#ts-local').onclick = function () { res('local'); };
            o.querySelector('#ts-cloud').onclick = function () { res('cloud'); };
        });
    }
    function initialSync() {
        var ov = overlay('<div class="flex items-center gap-3"><span class="mini-spin" style="width:22px;height:22px"></span><div><div class="text-sm font-bold text-white">Connecting to cloud</div><div id="ts-msg" class="text-xs text-gray-500 mt-0.5">Checking your data…</div></div></div>');
        function msg(t) { var m = ov.querySelector('#ts-msg'); if (m) m.textContent = t; }
        var local, remote;
        return Promise.all([scanLocal(), listRemote(null, true)]).then(function (r) {
            local = r[0]; remote = r[1].filter(function (h) { return enabled(h.ns, baseOf(h.key)); });
            var rIds = {}; remote.forEach(function (h) { rIds[h.ns + '|' + baseOf(h.key)] = 1; });
            var both = local.filter(function (x) { return x.ns !== 'meta' && rIds[x.ns + '|' + x.key]; });   // the profile list is merged, never a conflict
            var pol = both.length ? chooseConflict(both.length) : Promise.resolve('cloud');
            return pol.then(function (policy) {
                ov.innerHTML = '<div class="flex items-center gap-3"><span class="mini-spin" style="width:22px;height:22px"></span><div><div class="text-sm font-bold text-white">Syncing your data</div><div id="ts-msg" class="text-xs text-gray-500 mt-0.5">Please wait…</div></div></div>';
                local.forEach(function (x) {
                    var id = x.ns + '|' + x.key;
                    if (!rIds[id] || policy === 'local') { meta.dirty[id] = 1; ver[id] = (ver[id] || 0) + 1; }
                });
                meta.initialDone = true; persist();
                msg('Downloading from cloud…');
                return pull({ full: true }).then(function (pr) {
                    if (policy === 'cloud') local.forEach(function (x) { var id = x.ns + '|' + x.key; if (rIds[id] && isSplit(x.ns, x.key)) { meta.dirty[id] = 1; ver[id] = (ver[id] || 0) + 1; } });
                    return pr;
                });
            });
        }).then(function (pr) {
            msg('Uploading this device’s data…');
            return flush().then(function () { return pr; });
        }).then(function (pr) {
            if (pr.error) throw pr.error;
            if (pr.affectsView) { msg('Done. Restarting…'); setTimeout(function () { location.reload(); }, 300); }
            else ov.remove();
        }).catch(function (e) {
            meta.initialDone = false; persist();
            ov.innerHTML = '<div><h2 class="text-base font-bold text-white">Could not sync</h2><p class="text-xs text-aura-red mt-2 break-words">' + esc(e && e.message || e) + '</p><p class="text-xs text-gray-500 mt-2">Your local data is untouched. Check the internet and that setup.sql was run in Supabase.</p></div><div class="flex gap-2 justify-end"><button id="ts-skip" class="px-3 py-2 rounded-md text-xs border border-aura-border text-gray-300">Continue offline</button><button id="ts-retry" class="px-3 py-2 rounded-md text-xs font-semibold bg-blue-600 text-white">Retry</button></div>';
            ov.querySelector('#ts-skip').onclick = function () { ov.remove(); setStatus(); };
            ov.querySelector('#ts-retry').onclick = function () { ov.remove(); initialSync(); };
        });
    }

    /* ------------------------------------------------------------------ *
     * UI: overlay, login, status chip + panel, toast
     * ------------------------------------------------------------------ */
    var INPUT = 'w-full bg-aura-bg border border-aura-border rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';
    function overlay(inner, wide) {
        var old = document.getElementById('ts-overlay'); if (old) old.remove();
        var o = document.createElement('div'); o.id = 'ts-overlay';
        o.style.cssText = 'position:fixed;inset:0;z-index:10050;background:#07080c;display:flex;align-items:center;justify-content:center;padding:16px';
        o.innerHTML = '<div role="dialog" aria-modal="true" class="w-full ' + (wide ? 'max-w-md' : 'max-w-sm') + ' rounded-xl border border-aura-border shadow-2xl p-5 space-y-4" style="background:#11131a;max-height:96vh;overflow:auto">' + inner + '</div>';
        // keep the inner card addressable as the overlay itself for innerHTML updates
        var card = o.firstChild; var api2 = o;
        Object.defineProperty(api2, 'innerHTML', { configurable: true, get: function () { return card.innerHTML; }, set: function (v) { card.innerHTML = v; } });
        (document.body || document.documentElement).appendChild(o);
        return o;
    }
    function whenBody(fn) { if (typeof document === 'undefined' || !document) return; if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
    /* ---- Welcome gate: Fresh start / Login. No skipping: the app is used with an account. ---- */
    var PRI = 'px-3 py-2 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed';
    var GHOST = 'px-3 py-2 rounded-md text-xs border border-aura-border text-gray-300 hover:text-white hover:bg-aura-hover';
    var GS = { url: '', key: '', name: '', email: '' };        // what has been typed so far, carried between screens
    var gateTimers = [], gateDone = null;
    function fld(id, label, type, ph, extra) { return '<label class="block text-[11px] font-semibold text-gray-400">' + label + '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + esc(ph || '') + '" autocomplete="off" spellcheck="false" ' + (extra || '') + ' class="' + INPUT + ' mt-1"></label>'; }
    function clearGateTimers() { gateTimers.forEach(clearInterval); gateTimers = []; }
    function normUrl(u) {
        u = String(u || '').trim(); if (!u) return '';
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        try { var x = new URL(u); return x.hostname ? x.protocol + '//' + x.host : ''; } catch (e) { return ''; }
    }
    function copyText(t) {
        function fallback() { try { var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(a); a.select(); var ok = document.execCommand('copy'); a.remove(); return Promise.resolve(ok); } catch (e) { return Promise.resolve(false); } }
        try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, fallback); } catch (e) {}
        return fallback();
    }
    /* Is this Supabase project reachable, is the key accepted, and has the SQL been run? (no login needed) */
    function checkProject(url, key) {
        return fetch(url + '/rest/v1/app_data?select=user_id&limit=1', { headers: { apikey: key } }).then(function (r) {
            if (r.status === 200) return { k: 'live', t: 'Project is live. You can continue.' };
            return r.text().then(function (t) {
                if (r.status === 401 || r.status === 403 || /invalid api key|invalid jwt/i.test(t)) return { k: 'key', t: 'This API key is not accepted. Copy the \u201canon public\u201d key again.' };
                if (r.status === 404 || /PGRST205|42P01|schema cache|does not exist/i.test(t)) return { k: 'sql', t: 'Connected. Now run the SQL: Copy SQL, then Supabase \u2192 SQL Editor \u2192 New query \u2192 paste \u2192 Run.' };
                return { k: 'net', t: 'Unexpected answer from Supabase (' + r.status + ').' };
            });
        }, function () { return { k: 'net', t: 'Cannot reach this URL. Check the Project URL and your internet.' }; });
    }
    function finishGate(o, url, key, res) {
        R.set(CFG_KEY, JSON.stringify({ url: url, anonKey: key }));
        stored = { url: url, anonKey: key };
        clearGateTimers(); gateOpen = false;
        if (res && res.other) { requestWipe(true); return; }      // this device still held another account's data: wipe it, then start clean
        o.remove(); if (gateDone) gateDone(true);
    }
    function setErr(o, text, tone) { var e = o.querySelector('#tg-err'); if (!e) return; e.className = 'text-xs ' + (tone === 'ok' ? 'text-aura-green' : tone === 'info' ? 'text-gray-400' : 'text-aura-red'); e.textContent = text || ''; e.classList.toggle('hidden', !text); }
    var ERRBOX = '<div id="tg-err" role="alert" class="hidden text-xs"></div>';
    function onEnter(o, fn) { o.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target.tagName !== 'BUTTON') fn(); }); }

    function screenWelcome() {
        clearGateTimers();
        var o = overlay('<div class="text-center"><h2 class="text-lg font-bold text-white">Welcome to Tradely</h2><p class="text-xs text-gray-500 mt-1.5 leading-relaxed">Your data lives in your own Supabase project and syncs on every device you log in on.</p></div>' +
            '<button id="tg-fresh" class="w-full text-left px-4 py-3 rounded-lg border border-aura-border hover:bg-aura-hover"><span class="block text-sm font-bold text-white">Fresh start</span><span class="block text-[11px] text-gray-500 mt-0.5">New here? Connect your Supabase project and create your account.</span></button>' +
            '<button id="tg-login" class="w-full text-left px-4 py-3 rounded-lg border border-aura-border hover:bg-aura-hover"><span class="block text-sm font-bold text-white">Login</span><span class="block text-[11px] text-gray-500 mt-0.5">Already have an account? Log in and all your data syncs.</span></button>');
        o.querySelector('#tg-fresh').onclick = screenFresh; o.querySelector('#tg-login').onclick = screenLogin;
        if (readSaved().list.length) {
            var bk = document.createElement('button'); bk.className = GHOST + ' w-full'; bk.textContent = 'Back to saved accounts'; bk.onclick = screenSaved;
            o.querySelector('#tg-login').insertAdjacentElement('afterend', bk);
        }
        o.querySelector('#tg-fresh').focus();
    }
    /* Saved accounts: pick one to log in with no password. */
    function screenSaved() {
        clearGateTimers();
        var list = readSaved().list;
        if (!list.length) { if (stored) screenLogin(); else screenWelcome(); return; }
        var rows = list.map(function (e) {
            return '<div class="flex items-center gap-2"><button data-id="' + esc(e.id) + '" class="flex-1 min-w-0 flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border border-aura-border hover:bg-aura-hover">' + avatar(nickOf(e)) + '<span class="min-w-0"><span class="block text-sm font-bold text-white truncate">' + esc(nickOf(e)) + '</span><span class="block text-[11px] text-gray-300 truncate">' + esc(e.email) + '</span><span class="block text-[10px] text-gray-500 truncate">' + esc(hostOf(e.url)) + '</span></span></button>' +
                '<button data-ren="' + esc(e.id) + '" aria-label="Rename ' + esc(nickOf(e)) + '" title="Rename" class="w-8 h-8 shrink-0 rounded-md border border-aura-border text-gray-400 hover:text-white hover:bg-aura-hover text-xs">\u270E</button>' +
                '<button data-del="' + esc(e.id) + '" aria-label="Remove ' + esc(nickOf(e)) + '" title="Remove from this device" class="w-8 h-8 shrink-0 rounded-md border border-aura-border text-gray-400 hover:text-aura-red hover:bg-aura-hover text-xs">\u2715</button></div>';
        }).join('');
        var o = overlay('<div class="text-center"><h2 class="text-lg font-bold text-white">Choose an account</h2><p class="text-xs text-gray-500 mt-1.5">Saved on this device. Tap one to log in, no password needed.</p></div><div class="space-y-2">' + rows + '</div>' + ERRBOX +
            '<button id="tg-add" class="' + GHOST + ' w-full">Use another account</button>');
        o.querySelector('#tg-add').onclick = screenWelcome;
        o.querySelectorAll('button[data-id]').forEach(function (b) {
            b.onclick = function () {
                var e = findSaved(b.getAttribute('data-id')); if (!e) return;
                o.querySelectorAll('button').forEach(function (x) { x.disabled = true; }); setErr(o, 'Logging in\u2026', 'info'); BASE = e.url; KEY = e.anonKey;
                refreshLogin(e).then(function (j) { finishGate(o, e.url, e.anonKey, applySaved(e, j)); }, function (x) {
                    if (offlineErr(x)) { o.querySelectorAll('button').forEach(function (y) { y.disabled = false; }); return setErr(o, 'No internet connection.'); }
                    GS.url = e.url; GS.key = e.anonKey; GS.email = e.email; screenLogin();
                    setErr(document.getElementById('ts-overlay'), x.message, 'info');
                });
            };
        });
        o.querySelectorAll('button[data-ren]').forEach(function (b) { b.onclick = function () { var e = findSaved(b.getAttribute('data-ren')); var v = e && prompt('Nickname', nickOf(e)); if (v && v.trim()) { upsertSaved({ id: e.id, nickname: v.replace(/\s+/g, ' ').trim().slice(0, 30) }); screenSaved(); } }; });
        o.querySelectorAll('button[data-del]').forEach(function (b) { b.onclick = function () { var e = findSaved(b.getAttribute('data-del')); if (e && confirm('Remove "' + nickOf(e) + '" from this device? Your data stays in the cloud. You can add it again with the password.')) { removeSaved(e.id); screenSaved(); } }; });
    }

    function screenFresh() {
        clearGateTimers();
        var o = overlay('<div><h2 class="text-base font-bold text-white">Fresh start</h2><p class="text-xs text-gray-500 mt-1 leading-relaxed">Connect your own Supabase project (the free plan is enough). Every user sets up their own.</p></div>' +
            '<ol class="text-[11px] text-gray-400 space-y-1 list-decimal pl-4 leading-relaxed"><li>On supabase.com create a project, then open Project Settings \u2192 API.</li><li>Paste the <b class="text-gray-200">Project URL</b> and the <b class="text-gray-200">anon public</b> key below.</li><li>Click <b class="text-gray-200">Copy SQL</b>, open SQL Editor \u2192 New query, paste and Run.</li></ol>' +
            fld('tg-url', 'Project URL', 'text', 'https://xxxx.supabase.co') + fld('tg-key', 'API key (anon public)', 'text', 'eyJ\u2026 or sb_publishable_\u2026') +
            '<div class="flex items-stretch gap-3"><button id="tg-copy" type="button" class="w-24 h-24 shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-aura-border bg-aura-bg hover:bg-aura-hover text-gray-200 text-[11px] font-semibold"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg><span id="tg-copy-t">Copy SQL</span></button>' +
            '<div class="flex-1 rounded-lg border border-aura-border bg-aura-bg/60 p-3 flex items-center gap-3"><span id="tg-light" aria-hidden="true" style="width:14px;height:14px;border-radius:9999px;flex:none;background:#6b7280"></span><span id="tg-lt" role="status" class="text-xs text-gray-300 leading-snug"></span></div></div>' + ERRBOX +
            '<div class="flex justify-between gap-2"><button id="tg-back" class="' + GHOST + '">Back</button><button id="tg-next" class="' + PRI + '" disabled>Continue</button></div>', true);
        var u = o.querySelector('#tg-url'), k = o.querySelector('#tg-key'), light = o.querySelector('#tg-light'), lt = o.querySelector('#tg-lt'), next = o.querySelector('#tg-next');
        u.value = GS.url; k.value = GS.key;
        var seq = 0, state = null, COL = { idle: '#6b7280', busy: '#f59e0b', live: '#10b981', sql: '#f59e0b', key: '#ef4444', net: '#ef4444', url: '#ef4444' };
        function paint(s) {
            state = s; light.style.background = COL[s.k] || COL.idle;
            light.style.boxShadow = s.k === 'live' ? '0 0 10px 2px rgba(16,185,129,.8)' : 'none';
            light.style.animation = s.k === 'busy' ? 'pulse 1s infinite' : '';
            lt.textContent = s.t; lt.style.color = s.k === 'live' ? '#34d399' : ''; next.disabled = s.k !== 'live';
        }
        function run(quiet) {
            var url = normUrl(u.value), key = k.value.trim(); GS.url = u.value; GS.key = key;
            if (!url || key.length < 20) { seq++; paint({ k: 'idle', t: 'Enter the Project URL and the anon public key.' }); return; }
            var my = ++seq; if (!quiet) paint({ k: 'busy', t: 'Checking\u2026' });
            checkProject(url, key).then(function (s) { if (my === seq) paint(s); });
        }
        var deb = 0; function later() { clearTimeout(deb); seq++; paint({ k: 'idle', t: 'Checking soon\u2026' }); deb = setTimeout(run, 500); }
        u.oninput = k.oninput = later;
        gateTimers.push(setInterval(function () { if (state && (state.k === 'sql' || state.k === 'net')) run(true); }, 3500));   // turns green by itself once the SQL has been run
        o.querySelector('#tg-copy').onclick = function () {
            var t = o.querySelector('#tg-copy-t');
            copyText(window.TRADELY_SQL || '').then(function (ok) { t.textContent = ok ? 'Copied \u2713' : 'Copy failed'; setTimeout(function () { t.textContent = 'Copy SQL'; }, 2200); });
        };
        o.querySelector('#tg-back').onclick = screenWelcome;
        next.onclick = function () { if (!next.disabled) screenSignup(); };
        onEnter(o, function () { if (!next.disabled) screenSignup(); });
        run(); u.focus();
    }

    function screenSignup() {
        clearGateTimers();
        var o = overlay('<div><h2 class="text-base font-bold text-white">Create your account</h2><p class="text-xs text-gray-500 mt-1">No email verification. Use this email and password to log in on any device.</p></div>' +
            fld('tg-name', 'Name', 'text', 'Your name', 'maxlength="40"') + fld('tg-email', 'Email', 'email', 'you@example.com', 'autocomplete="username"') + fld('tg-pass', 'Password (at least 6 characters)', 'password', '', 'autocomplete="new-password"') + ERRBOX +
            '<div class="flex flex-wrap justify-between gap-2"><button id="tg-back" class="' + GHOST + '">Back</button><span class="flex gap-2"><button id="tg-tologin" class="' + GHOST + '">I have an account</button><button id="tg-go" class="' + PRI + '">Create account</button></span></div>');
        var n = o.querySelector('#tg-name'), em = o.querySelector('#tg-email'), pw = o.querySelector('#tg-pass'), go = o.querySelector('#tg-go');
        n.value = GS.name; em.value = GS.email; n.focus();
        function submit() {
            var name = n.value.replace(/\s+/g, ' ').trim(), e = em.value.trim(), p = pw.value; GS.name = name; GS.email = e;
            if (!name) return setErr(o, 'Enter your name.');
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setErr(o, 'Enter a valid email.');
            if (p.length < 6) return setErr(o, 'Password must be at least 6 characters.');
            var url = normUrl(GS.url), key = String(GS.key || '').trim();
            go.disabled = true; setErr(o, 'Creating your account\u2026', 'info'); BASE = url; KEY = key;
            checkProject(url, key).then(function (s) {
                if (s.k !== 'live') throw Object.assign(new Error(s.t), { check: true });
                return authCall('signup', e, p, name);
            }).then(function (res) { finishGate(o, url, key, res); }, function (x) { go.disabled = false; setErr(o, offlineErr(x) ? 'No internet connection.' : x.message); });
        }
        go.onclick = submit; onEnter(o, submit);
        o.querySelector('#tg-back').onclick = screenFresh; o.querySelector('#tg-tologin').onclick = screenLogin;
    }

    function screenLogin() {
        clearGateTimers();
        var known = !!(stored || (GS.url && GS.key)), hostName = '';
        try { hostName = new URL(normUrl(GS.url || (stored && stored.url))).host; } catch (e) {}
        var o = overlay('<div><h2 class="text-base font-bold text-white">Login</h2><p class="text-xs text-gray-500 mt-1">' + (known ? 'Enter your email and password. Your data syncs from the cloud.' : 'This device does not know your Supabase project yet. Enter its URL and key once, then your email and password.') + '</p></div>' +
            '<div id="tg-proj" class="space-y-4' + (known ? ' hidden' : '') + '">' + fld('tg-url', 'Project URL', 'text', 'https://xxxx.supabase.co') + fld('tg-key', 'API key (publishable / anon)', 'text', 'sb_publishable_\u2026 or eyJ\u2026') + '</div>' +
            (known ? '<div class="text-[11px] text-gray-500">Project: <span class="text-gray-300">' + esc(hostName || 'saved on this device') + '</span> \u00b7 <button id="tg-change" type="button" class="underline hover:text-white">change</button></div>' : '') +
            fld('tg-email', 'Email', 'email', 'you@example.com', 'autocomplete="username"') + fld('tg-pass', 'Password', 'password', '', 'autocomplete="current-password"') + ERRBOX +
            '<div class="flex flex-wrap justify-between gap-2"><button id="tg-back" class="' + GHOST + '">Back</button><span class="flex gap-2"><button id="tg-tosign" class="' + GHOST + '">Create account</button><button id="tg-go" class="' + PRI + '">Login</button></span></div>');
        var chg = o.querySelector('#tg-change'); if (chg) chg.onclick = function () { o.querySelector('#tg-proj').classList.remove('hidden'); chg.parentNode.remove(); };
        var u = o.querySelector('#tg-url'), k = o.querySelector('#tg-key'), em = o.querySelector('#tg-email'), pw = o.querySelector('#tg-pass'), go = o.querySelector('#tg-go');
        u.value = GS.url || (stored && stored.url) || ''; k.value = GS.key || (stored && stored.anonKey) || ''; em.value = GS.email || meta.email || '';
        (em.value ? pw : (known ? em : u)).focus();
        function grab() { GS.url = u.value; GS.key = k.value.trim(); GS.email = em.value.trim(); return { url: normUrl(u.value), key: k.value.trim(), e: em.value.trim(), p: pw.value }; }
        function submit() {
            var v = grab();
            if (!v.url) return setErr(o, 'Enter the Project URL.');
            if (v.key.length < 20) return setErr(o, 'Enter the API key (anon public).');
            if (!v.e || !v.p) return setErr(o, 'Enter email and password.');
            go.disabled = true; setErr(o, 'Please wait\u2026', 'info'); BASE = v.url; KEY = v.key;
            authCall('signin', v.e, v.p).then(function (res) { finishGate(o, v.url, v.key, res); }, function (x) { go.disabled = false; setErr(o, offlineErr(x) ? 'No internet connection, or the Project URL is wrong.' : x.message); });
        }
        go.onclick = submit; onEnter(o, submit);
        o.querySelector('#tg-back').onclick = screenWelcome;
        o.querySelector('#tg-tosign').onclick = function () {
            var v = grab(); if (!v.url || v.key.length < 20) return setErr(o, 'Enter the Project URL and API key first.');
            screenSignup();
        };
    }
    function showGate(mode) {
        return new Promise(function (resolve) {
            gateDone = resolve; gateOpen = true;
            whenBody(function () {
                var sv = readSaved();
                if (sv.prefill) { GS.url = sv.prefill.url; GS.key = sv.prefill.anonKey; GS.email = sv.prefill.email || ''; sv.prefill = null; writeSaved(sv); screenLogin(); return; }
                if (mode === 'welcome') { screenWelcome(); return; }
                if (sv.list.length) { screenSaved(); return; }
                if (stored) { GS.url = GS.url || stored.url; GS.key = GS.key || stored.anonKey; screenLogin(); } else screenWelcome();
            });
        });
    }

    /* ---- small pop-up (over the app, not a full gate) ---- */
    var pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; } }
    function popup(inner) {
        closePop(); pop = document.createElement('div'); pop.id = 'ts-popup';
        pop.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px';
        pop.innerHTML = '<div role="dialog" aria-modal="true" class="w-full max-w-sm rounded-xl border border-aura-border shadow-2xl p-5 space-y-4" style="background:#11131a;max-height:92vh;overflow:auto">' + inner + '</div>';
        document.body.appendChild(pop); return pop;
    }
    function say(o, text, tone) { var e = o.querySelector('#pp-msg'); if (!e) return; e.className = 'text-xs ' + (tone === 'err' ? 'text-aura-red' : tone === 'ok' ? 'text-aura-green' : tone === 'warn' ? 'text-amber-400' : 'text-gray-400'); e.textContent = text || ''; e.classList.toggle('hidden', !text); }
    var PMSG = '<div id="pp-msg" role="alert" class="hidden text-xs"></div>';

    /* ---- account info (Settings -> Account) ---- */
    function account() {
        var u = meta.session && meta.session.user; if (!u) return null;
        var sv = findSaved(curEntryId());
        return { id: u.id, email: u.email || '', name: u.name || '', url: BASE, saved: !!sv, nickname: sv ? nickOf(sv) : '', display: sv ? nickOf(sv) : (u.name || String(u.email || '').split('@')[0]) };
    }
    function savedList() {
        var cur = curEntryId();
        return readSaved().list.map(function (e) { return { id: e.id, nickname: nickOf(e), email: e.email || '', name: e.name || '', host: hostOf(e.url), current: e.id === cur }; });
    }

    /* ---- shared helpers for the log out / switch / add flows ---- */
    var BTN2 = 'px-3 py-2 rounded-md text-xs font-semibold';
    function avatar(t) { return '<span class="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">' + esc(String(t || '?').trim().charAt(0).toUpperCase()) + '</span>'; }
    /* Upload what is pending, then run go(). If something cannot be uploaded (offline), warn once; the next click goes on anyway. */
    function guarded(o, btns, go) {
        var forced = false;
        function lock(on) { btns.forEach(function (b) { b.disabled = on; }); }
        btns.forEach(function (b) {
            b.onclick = function () {
                if (forced) return go(b);
                lock(true); say(o, 'Saving your latest changes\u2026');
                (navigator.onLine ? flush() : Promise.resolve()).then(function () {
                    var left = Object.keys(meta.dirty).length;
                    if (left || !meta.initialDone) {
                        say(o, (meta.initialDone ? left + ' change(s) are not uploaded yet (offline?). ' : 'Your data was never uploaded to the cloud. ') + 'If you go on now they are lost.', 'warn');
                        forced = true; btns.forEach(function (x) { x.textContent += ' anyway'; }); lock(false); return;
                    }
                    go(b);
                });
            };
        });
    }
    /* Leave the current account on this device: keep it in the saved list (no server log out, so the saved login keeps working)
       or forget it (server log out, removed from the list). */
    function leaveCurrent(keep, nick) {
        if (keep) { saveCurrent(nick); return Promise.resolve(); }
        removeSaved(curEntryId());
        return api('/auth/v1/logout', { method: 'POST' }).catch(function () {});
    }
    function wipeNow() { meta.session = null; meta.userId = null; requestWipe(false); }
    function defaultNick() { var a = account(); return a ? (a.saved ? a.nickname : (a.name || String(a.email || '').split('@')[0])) : ''; }
    var KEEPBOX = function (checked) { return '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input id="pp-keep" type="checkbox" class="mt-0.5 accent-blue-500"' + (checked ? ' checked' : '') + '> <span>Keep the account you are leaving in the saved list, so you can switch back later without typing the password.</span></label>'; };

    /* ---- log out: confirm, upload what is pending, offer to SAVE this account, wipe this device, back to the gate ---- */
    function signOutFlow() {
        if (!meta.session) { showGate().then(function (ok) { if (ok) boot(); }); return; }
        var a = account();
        var o = popup('<div><h2 class="text-base font-bold text-white">Log out?</h2><p class="text-xs text-gray-400 mt-1.5 leading-relaxed">Your data stays safe in the cloud and comes back when you log in again. The copy on this device is removed.</p></div>' +
            '<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3 space-y-2"><div class="text-xs text-gray-300 leading-relaxed"><b class="text-white">Save this account on this device?</b> Next time you pick it from the list, no email or password is needed. Account: <span class="text-gray-100">' + esc(a.email) + '</span></div>' + fld('pp-nick', 'Nickname', 'text', 'e.g. Work, Personal', 'maxlength="30"') + '</div>' + PMSG +
            '<div class="flex flex-wrap justify-end gap-2"><button id="pp-no" class="' + GHOST + '">Cancel</button><button id="pp-yes" class="' + GHOST + '">Log out without saving</button><button id="pp-save" class="' + PRI + '">Save &amp; log out</button></div>');
        var nick = o.querySelector('#pp-nick'); nick.value = defaultNick();
        o.querySelector('#pp-no').onclick = closePop;
        guarded(o, [o.querySelector('#pp-yes'), o.querySelector('#pp-save')], function (b) {
            var keep = b.id === 'pp-save'; say(o, 'Logging out\u2026');
            leaveCurrent(keep, nick.value).then(wipeNow);
        });
    }

    /* ---- switch to another saved account ---- */
    function switchFlow(id) {
        var t = findSaved(id); if (!t || !meta.session || id === curEntryId()) return;
        var cur = findSaved(curEntryId());
        var o = popup('<div><h2 class="text-base font-bold text-white">Switch account</h2><p class="text-xs text-gray-400 mt-1.5 leading-relaxed">Switch to <b class="text-gray-100">' + esc(nickOf(t)) + '</b> (' + esc(t.email) + ', ' + esc(hostOf(t.url)) + '). Pending changes are uploaded first. This device then loads that account\u2019s data from its cloud project.</p></div>' +
            (cur ? '' : '<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3 space-y-2">' + KEEPBOX(true) + fld('pp-nick', 'Nickname for the current account', 'text', 'e.g. Work', 'maxlength="30"') + '</div>') + PMSG +
            '<div class="flex flex-wrap justify-end gap-2"><button id="pp-no" class="' + GHOST + '">Cancel</button><button id="pp-yes" class="' + PRI + '">Switch</button></div>');
        var nick = o.querySelector('#pp-nick'), keepBox = o.querySelector('#pp-keep'); if (nick) nick.value = defaultNick();
        o.querySelector('#pp-no').onclick = closePop;
        guarded(o, [o.querySelector('#pp-yes')], function (b) {
            say(o, 'Checking the saved login\u2026');
            refreshLogin(t).then(function (j) {
                upsertSaved({ id: t.id, refresh: j.refresh_token, email: (j.user && j.user.email) || t.email, name: nameOf(j.user) || t.name });
                var keep = cur ? true : !!(keepBox && keepBox.checked);
                say(o, 'Switching\u2026', 'ok');
                return leaveCurrent(keep, nick ? nick.value : '').then(function () {
                    var nx = findSaved(t.id) || t;
                    R.set(CFG_KEY, JSON.stringify({ url: nx.url, anonKey: nx.anonKey }));
                    setNext({ next: t.id }); wipeNow();
                });
            }, function (e) {
                b.disabled = false; b.textContent = 'Switch';
                if (offlineErr(e)) return say(o, 'No internet connection. Switching needs the internet.', 'err');
                say(o, e.message, 'err');
                if (e.expired) {
                    var re = document.createElement('button'); re.className = PRI; re.textContent = 'Log in again';
                    re.onclick = function () { addFlow({ url: t.url, anonKey: t.anonKey, email: t.email }); };
                    o.querySelector('#pp-msg').insertAdjacentElement('afterend', re);
                }
            });
        });
    }

    /* ---- add another account (another Supabase project, or another login in the same one) ---- */
    function addFlow(prefill) {
        if (!meta.session) { showGate('welcome').then(function (ok) { if (ok) boot(); }); return; }
        var cur = findSaved(curEntryId());
        var o = popup('<div><h2 class="text-base font-bold text-white">' + (prefill ? 'Log in again' : 'Add another account') + '</h2><p class="text-xs text-gray-400 mt-1.5 leading-relaxed">You will be taken to ' + (prefill ? 'the Login screen' : 'Fresh start / Login') + '. Pending changes are uploaded first and the copy on this device is replaced by the next account\u2019s data.</p></div>' +
            (cur ? '<div class="text-xs text-gray-400">The current account (<b class="text-gray-200">' + esc(nickOf(cur)) + '</b>) stays in your saved list.</div>' : '<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3 space-y-2">' + KEEPBOX(true) + fld('pp-nick', 'Nickname for the current account', 'text', 'e.g. Work', 'maxlength="30"') + '</div>') + PMSG +
            '<div class="flex flex-wrap justify-end gap-2"><button id="pp-no" class="' + GHOST + '">Cancel</button><button id="pp-yes" class="' + PRI + '">Continue</button></div>');
        var nick = o.querySelector('#pp-nick'), keepBox = o.querySelector('#pp-keep'); if (nick) nick.value = defaultNick();
        o.querySelector('#pp-no').onclick = closePop;
        guarded(o, [o.querySelector('#pp-yes')], function () {
            say(o, 'Please wait\u2026');
            leaveCurrent(cur ? true : !!(keepBox && keepBox.checked), nick ? nick.value : '').then(function () {
                if (prefill) { R.set(CFG_KEY, JSON.stringify({ url: prefill.url, anonKey: prefill.anonKey })); setNext({ prefill: prefill }); }
                else { R.rem(CFG_KEY); setNext({ add: true }); }
                wipeNow();
            });
        });
    }

    /* ---- nickname: save the current account (or rename a saved one) ---- */
    function nickFlow(id) {
        id = id || curEntryId(); if (!id) return;
        var e = findSaved(id), isCur = id === curEntryId(), a = account();
        if (!e && !isCur) return;
        var o = popup('<div><h2 class="text-base font-bold text-white">' + (e ? 'Nickname' : 'Save this account') + '</h2><p class="text-xs text-gray-400 mt-1.5 leading-relaxed">' + (e ? 'Pick a short name so you can tell your accounts apart.' : 'It is added to the saved list on this device, so you can switch to it later without the password.') + '</p></div>' +
            fld('pp-nick', 'Nickname', 'text', 'e.g. Work, Personal', 'maxlength="30"') + PMSG +
            '<div class="flex justify-end gap-2"><button id="pp-no" class="' + GHOST + '">Cancel</button><button id="pp-yes" class="' + PRI + '">Save</button></div>');
        var n = o.querySelector('#pp-nick'); n.value = e ? nickOf(e) : defaultNick(); n.focus(); n.select();
        o.querySelector('#pp-no').onclick = closePop;
        function go() {
            var v = n.value.replace(/\s+/g, ' ').trim(); if (!v) return say(o, 'Enter a nickname.', 'err');
            if (e) upsertSaved({ id: id, nickname: v.slice(0, 30) }); else saveCurrent(v);
            closePop(); setStatus();
        }
        o.querySelector('#pp-yes').onclick = go; o.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(); });
    }
    function forgetFlow(id) {
        var e = findSaved(id); if (!e) return;
        if (!confirm('Remove "' + nickOf(e) + '" from the saved list on this device? Your data stays in the cloud, and you can add the account again with its password.')) return;
        removeSaved(id);
        if (id === curEntryId()) setStatus();
    }

    /* ---- account switcher pop-up (sync panel and Settings -> Account both use it) ---- */
    function switcher() {
        var list = savedList(), cur = account();
        var rows = list.map(function (e) {
            return '<div class="flex items-center gap-2"><button data-id="' + esc(e.id) + '" ' + (e.current ? 'disabled' : '') + ' class="flex-1 min-w-0 flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border ' + (e.current ? 'border-blue-500/50 bg-blue-600/10' : 'border-aura-border hover:bg-aura-hover') + '">' + avatar(e.nickname) + '<span class="min-w-0"><span class="block text-sm font-bold text-white truncate">' + esc(e.nickname) + (e.current ? ' <span class="text-[10px] font-semibold text-blue-300 ml-1">current</span>' : '') + '</span><span class="block text-[11px] text-gray-300 truncate">' + esc(e.email) + '</span><span class="block text-[10px] text-gray-500 truncate">' + esc(e.host) + '</span></span></button></div>';
        }).join('');
        var unsaved = cur && !cur.saved ? '<div class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-blue-500/50 bg-blue-600/10">' + avatar(cur.display) + '<span class="min-w-0"><span class="block text-sm font-bold text-white truncate">' + esc(cur.display) + ' <span class="text-[10px] font-semibold text-blue-300 ml-1">current, not saved</span></span><span class="block text-[11px] text-gray-300 truncate">' + esc(cur.email) + '</span></span></div>' : '';
        var o = popup('<div><h2 class="text-base font-bold text-white">Your accounts</h2><p class="text-xs text-gray-400 mt-1">Pick an account to switch to it.</p></div><div class="space-y-2">' + unsaved + rows + '</div>' +
            '<div class="flex justify-between gap-2"><button id="pp-no" class="' + GHOST + '">Close</button><button id="pp-add" class="' + PRI + '">Add another account</button></div>');
        o.querySelector('#pp-no').onclick = closePop;
        o.querySelector('#pp-add').onclick = function () { addFlow(); };
        o.querySelectorAll('button[data-id]').forEach(function (b) { b.onclick = function () { switchFlow(b.getAttribute('data-id')); }; });
    }

    /* ---- delete account A to Z (login + every profile + all data), needs password + typed DELETE ---- */
    function deleteAccountFlow() {
        if (!meta.session) return;
        var o = popup('<div><h2 class="text-base font-bold text-aura-red">Delete account?</h2><p class="text-xs text-gray-400 mt-1.5 leading-relaxed">This permanently deletes your login and <b class="text-gray-200">every profile with all its data</b> (accounts, trades, journal, notes, certificates, settings, API keys) from Supabase and from this device. Other devices lose access. It cannot be undone. Export a backup first if you may need anything.</p></div>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input id="da-ack" type="checkbox" class="mt-0.5 accent-red-500"> I understand this is permanent.</label>' +
            fld('da-pass', 'Your password', 'password', '', 'autocomplete="current-password"') + fld('da-type', 'Type DELETE to confirm', 'text', 'DELETE') + PMSG +
            '<div class="flex justify-end gap-2"><button id="pp-no" class="' + GHOST + '">Cancel</button><button id="pp-yes" class="px-3 py-2 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed" disabled>Delete account forever</button></div>');
        var ack = o.querySelector('#da-ack'), pw = o.querySelector('#da-pass'), ty = o.querySelector('#da-type'), yes = o.querySelector('#pp-yes');
        function ready() { yes.disabled = !(ack.checked && pw.value && ty.value.trim() === 'DELETE'); }
        ack.onchange = pw.oninput = ty.oninput = ready;
        o.querySelector('#pp-no').onclick = function () { if (!deleting) closePop(); };
        yes.onclick = function () {
            yes.disabled = true; deleting = true; say(o, 'Checking your password\u2026');
            function fail(text) { deleting = false; ready(); say(o, text, 'err'); }
            fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: meta.session.user.email, password: pw.value }) })
                .then(function (r) { if (!r.ok) throw Object.assign(new Error('Wrong password.'), { pw: true }); say(o, 'Deleting everything\u2026'); return api('/rest/v1/rpc/delete_my_account', { method: 'POST', body: '{}' }); })
                .then(function () {
                    say(o, 'Account deleted. Removing data from this device\u2026', 'ok');
                    meta.session = null; meta.userId = null; setTimeout(function () { requestWipe(false); }, 900);
                }, function (e) {
                    if (e && e.pw) return fail('Wrong password.');
                    if (offlineErr(e)) return fail('No internet connection. Nothing was deleted.');
                    if (e && e.status === 404) { fail('Your Supabase project does not have the delete function yet. Click Copy SQL, run it in SQL Editor, then try again.'); var b = document.createElement('button'); b.className = GHOST; b.textContent = 'Copy SQL'; b.onclick = function () { copyText(window.TRADELY_SQL || '').then(function () { b.textContent = 'Copied \u2713'; }); }; o.querySelector('#pp-msg').insertAdjacentElement('afterend', b); return; }
                    fail('Could not delete: ' + (e && e.message || e));
                });
        };
    }

    /* ---- delete one profile's cloud data and check that nothing is left ---- */
    function purgeProfileNow(pid) {
        if (!meta.session) return Promise.reject(authErr());
        if (!navigator.onLine) return Promise.reject(new TypeError('Failed to fetch'));
        var q = '/rest/v1/app_data?ns=in.(' + encodeURIComponent('"ls:' + pid + '","idb:' + pid + '"') + ')';
        return api(q, { method: 'DELETE' }).then(function () { return api(q + '&select=key&limit=1'); }).then(function (r) { return r.json(); }).then(function (rows) {
            if (rows && rows.length) throw new Error('Some cloud data of this profile is still there.');
            return true;
        });
    }

    function toast(text, actionLabel, action) {
        whenBody(function () {
            var d = document.getElementById('ts-toast'); if (d) d.remove();
            d = document.createElement('div'); d.id = 'ts-toast'; d.setAttribute('role', 'status');
            d.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9500;background:#11131a;border:1px solid #1f2430;color:#e5e7eb;font:600 12px/1.4 system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);display:flex;gap:12px;align-items:center';
            d.innerHTML = '<span>' + esc(text) + '</span>' + (actionLabel ? '<button style="background:#2563eb;color:#fff;border-radius:6px;padding:4px 10px;font-weight:700">' + esc(actionLabel) + '</button>' : '') + '<button aria-label="Dismiss" style="color:#9ca3af">✕</button>';
            var b = d.querySelectorAll('button'); if (actionLabel) b[0].onclick = function () { d.remove(); action(); };
            b[b.length - 1].onclick = function () { d.remove(); };
            document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.remove(); }, 20000);
        });
    }
    var chip = null, panel = null;
    function statusInfo(force) {
        var pending = Object.keys(meta.dirty).length;
        if (!meta.session) return { k: 'login', t: 'Sign in', c: '#f59e0b', d: 'Not signed in. Data is saved on this device only.' };
        if (force === 'syncing' || flushing || pulling || initializing) return { k: 'syncing', t: 'Syncing…', c: '#3b82f6', d: 'Syncing with the cloud…' };
        if (force === 'error' || (lastError && !offlineErr({ message: lastError }))) return { k: 'error', t: 'Sync error', c: '#ef4444', d: lastError || 'Sync problem.' };
        if (force === 'offline' || !navigator.onLine) return { k: 'offline', t: 'Offline', c: '#f59e0b', d: 'Offline. ' + pending + ' change(s) will upload when the internet is back.' };
        if (pending) return { k: 'pending', t: pending + ' pending', c: '#3b82f6', d: pending + ' change(s) waiting to upload.' };
        return { k: 'ok', t: 'Synced', c: '#10b981', d: 'Everything is saved to the cloud.' };
    }
    var lastForce;
    function setStatus(force) { lastForce = force; whenBody(renderChip); }
    function renderChip() {
        var s = statusInfo(lastForce);
        if (!chip) {
            chip = document.createElement('button'); chip.id = 'sync-chip'; chip.type = 'button'; chip.setAttribute('aria-label', 'Cloud sync status');
            chip.className = 'flex items-center gap-1.5 px-2 py-1 rounded-full bg-aura-bg border border-aura-border text-[11px] font-mono text-gray-300 hover:text-white hover:border-gray-600 transition';
            chip.onclick = togglePanel;
            var anchor = document.getElementById('calc-toggle');
            if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(chip, anchor);
            else { chip.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9000'; document.body.appendChild(chip); }
        }
        chip.innerHTML = '<span style="width:8px;height:8px;border-radius:9999px;background:' + s.c + (s.k === 'syncing' ? ';animation:pulse 1s infinite' : '') + '"></span><span class="hidden sm:inline">' + esc(s.t) + '</span>';
        chip.title = s.d;
        if (panel) renderPanel();
    }
    function ago(ms) { if (!ms) return 'never'; var s = Math.round((Date.now() - ms) / 1000); if (s < 10) return 'just now'; if (s < 60) return s + 's ago'; if (s < 3600) return Math.round(s / 60) + ' min ago'; return Math.round(s / 3600) + ' h ago'; }
    function togglePanel() { if (panel) { panel.remove(); panel = null; return; } panel = document.createElement('div'); panel.id = 'sync-panel'; document.body.appendChild(panel); renderPanel(); setTimeout(function () { document.addEventListener('mousedown', outside); }, 0); }
    function outside(e) { if (panel && !panel.contains(e.target) && !(chip && chip.contains(e.target))) { panel.remove(); panel = null; document.removeEventListener('mousedown', outside); } }
    function renderPanel() {
        var s = statusInfo(lastForce), r = chip.getBoundingClientRect(), pending = Object.keys(meta.dirty).length;
        panel.style.cssText = 'position:fixed;z-index:9600;top:' + Math.round(r.bottom + 8) + 'px;right:' + Math.max(8, Math.round(window.innerWidth - r.right)) + 'px;width:290px;max-width:94vw;background:#11131a;border:1px solid #1f2430;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.55);padding:14px;font:12px/1.45 system-ui,sans-serif;color:#d1d5db';
        var btn = 'class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-aura-border text-gray-200 hover:bg-aura-hover"';
        panel.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:9px;height:9px;border-radius:9999px;background:' + s.c + '"></span><b style="color:#fff;font-size:13px">Cloud sync</b></div>' +
            '<div style="color:#9ca3af;margin-bottom:8px">' + esc(s.d) + '</div>' +
            (meta.session ? '<div style="margin-bottom:2px">Account: <b style="color:#fff">' + esc(account().display) + '</b></div><div style="margin-bottom:2px;color:#9ca3af">' + esc(meta.session.user.email || '') + '</div>' : '') +
            '<div style="margin-bottom:2px">Last sync: <b style="color:#fff">' + ago(lastSync) + '</b> &middot; Pending: <b style="color:#fff">' + pending + '</b></div>' +
            '<div style="margin:6px 0 10px;color:#9ca3af">Synced pages: ' + esc(activeGroups().map(function (g) { return GROUPS[g].label; }).join(', ') || 'none') + '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px">' + (meta.session
                ? '<button id="sp-now" ' + btn + '>Sync now</button><button id="sp-re" ' + btn + ' title="Replace this device with the cloud copy">Re-download all</button><button id="sp-sw" ' + btn + '>Switch account</button><button id="sp-out" ' + btn + '>Log out</button>'
                : '<button id="sp-in" class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-blue-600 text-white">Sign in</button>') + '</div>';
        function q(id) { return panel.querySelector(id); }
        if (q('#sp-now')) q('#sp-now').onclick = function () { syncNow(); };
        if (q('#sp-re')) q('#sp-re').onclick = function () { if (confirm('Replace the data on this device with the cloud copy? Unsent local changes will be lost.')) { lastPullReset(); pull({ full: true, force: true }).then(function (r) { if (r.affectsView) location.reload(); }); } };
        if (q('#sp-sw')) q('#sp-sw').onclick = function () { panel.remove(); panel = null; switcher(); };
        if (q('#sp-out')) q('#sp-out').onclick = function () { panel.remove(); panel = null; signOutFlow(); };
        if (q('#sp-in')) q('#sp-in').onclick = function () { panel.remove(); panel = null; showGate().then(function (ok) { if (ok) boot(); }); };
    }
    function lastPullReset() { meta.lastPull = null; }

    /* ------------------------------------------------------------------ *
     * Orchestration
     * ------------------------------------------------------------------ */
    function syncNow() { return flush().then(function () { return pull(); }).then(function (r) { if (r.affectsView) offerReload(); return r; }); }
    function offerReload() { toast('New data arrived from another device.', 'Reload', function () { location.reload(); }); }
    var pollTimer = 0;
    function startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(function () { if (!document.hidden && meta.session && navigator.onLine) pull().then(function (r) { if (r.affectsView) offerReload(); }); }, POLL_MS);
        window.addEventListener('focus', function () { if (meta.session && meta.initialDone && navigator.onLine) syncNow(); });
        window.addEventListener('online', function () { setStatus(); syncNow(); });
        window.addEventListener('offline', function () { setStatus('offline'); });
        document.addEventListener('visibilitychange', function () { if (document.hidden) { persist(); flush(); } });
        window.addEventListener('beforeunload', persist);
    }
    function boot() {
        if (!meta.session) { setStatus(); return Promise.resolve(); }
        if (!meta.initialDone) { initializing = true; setStatus(); return new Promise(function (r) { whenBody(r); }).then(initialSync).then(function () { initializing = false; setStatus(); startPolling(); }); }
        setStatus(); startPolling();
        return purgeRemote().then(flush).then(function () { return pull(); }).then(function (r) { if (r.affectsView) offerReload(); });
    }
    function start() {
        whenBody(function () {
            if (meta.session) { boot(); return; }
            setStatus();
            var sv = readSaved();
            if (sv.next) {                                  // we just switched: sign in to the chosen saved account by ourselves
                var t = findSaved(sv.next); sv.next = null; writeSaved(sv);
                if (t) { autoSwitch(t); return; }
            }
            if (sv.add) { sv.add = false; writeSaved(sv); showGate('welcome').then(function (ok) { if (ok) boot(); }); return; }
            showGate().then(function (ok) { if (ok) boot(); });
        });
    }
    function autoSwitch(t) {
        var o = overlay('<div class="text-center space-y-2"><h2 class="text-base font-bold text-white">Switching to ' + esc(nickOf(t)) + '</h2><p class="text-xs text-gray-400" role="status">Logging in and loading your data\u2026</p></div>');
        BASE = t.url; KEY = t.anonKey;
        refreshLogin(t).then(function (j) { applySaved(t, j); o.remove(); boot(); }, function (x) {
            o.remove();
            if (!offlineErr(x)) { GS.url = t.url; GS.key = t.anonKey; GS.email = t.email; }
            showGate().then(function (ok) { if (ok) boot(); });
            whenBody(function () { var ov = document.getElementById('ts-overlay'); if (ov) setErr(ov, offlineErr(x) ? 'No internet connection. Pick the account again when you are online.' : x.message, 'info'); });
        });
    }
    window.TradelySync = {
        configured: !!stored, account: account, signOut: signOutFlow, saved: savedList, switcher: switcher, switchTo: switchFlow, addAccount: addFlow, nickname: nickFlow, forget: forgetFlow, deleteAccount: deleteAccountFlow, purgeProfile: purgeProfileNow, status: function () { return statusInfo(lastForce); }, pending: function () { return Object.keys(meta.dirty).length; },
        syncNow: syncNow, pull: pull, flush: flush, groups: activeGroups, _meta: meta
    };
    start();
})();
