/* settings-data.js - Settings page extras for terminal.html
   - TradelyData: export / import of ALL app data (localStorage + IndexedDB "tradely_db")
   - Settings sections: Data & Backup, Preferences, About (the AI API section already exists)
   Requires shared.js (escapeHtml, TradelyStore). */
(function () {
    'use strict';
    var FORMAT = 'tradely-suite-backup', VERSION = 1;
    var IDB_NAME = 'tradely_db', IDB_STORE = 'kv';
    var SECRET_KEYS = ['tw_twelvedata_api_key', 'tradely_groq_api_key'];
    var MAX_IMPORT_BYTES = 150 * 1024 * 1024;
    var $ = function (id) { return document.getElementById(id); };
    var esc = escapeHtml;

    /* ------------------------------------------------------------------ *
     * IndexedDB helpers (same database and store the certificates use)
     * ------------------------------------------------------------------ */
    function idbOpen() {
        return new Promise(function (res, rej) {
            if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
            var r = indexedDB.open(IDB_NAME, 1);
            r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
            r.onsuccess = function () { res(r.result); };
            r.onerror = function () { rej(r.error); };
        });
    }
    function idbReadAll() {
        return idbOpen().then(function (db) {
            return new Promise(function (res, rej) {
                var out = {}, tx = db.transaction(IDB_STORE), cur = tx.objectStore(IDB_STORE).openCursor();
                cur.onsuccess = function () { var c = cur.result; if (c) { out[String(c.key)] = c.value; c.continue(); } };
                tx.oncomplete = function () { db.close(); res(out); };
                tx.onerror = tx.onabort = function () { db.close(); rej(tx.error); };
            });
        });
    }
    function idbWrite(entries, clearFirst) {
        return idbOpen().then(function (db) {
            return new Promise(function (res, rej) {
                var tx = db.transaction(IDB_STORE, 'readwrite'), st = tx.objectStore(IDB_STORE);
                if (clearFirst) st.clear();
                Object.keys(entries).forEach(function (k) { st.put(entries[k], k); });
                tx.oncomplete = function () { db.close(); res(); };
                tx.onerror = tx.onabort = function () { db.close(); rej(tx.error); };
            });
        });
    }

    /* ------------------------------------------------------------------ *
     * Collect / export
     * ------------------------------------------------------------------ */
    function stripSecrets(key, value) {
        if (key !== 'tradely_ai_config_v1') return value;
        try {
            var c = JSON.parse(value);
            Object.keys((c && c.providers) || {}).forEach(function (id) { var p = c.providers[id]; if (p && typeof p === 'object') { delete p.key; delete p.apiKey; } });
            return JSON.stringify(c);
        } catch (e) { return value; }
    }
    function readLocal(includeKeys) {
        var out = {};
        TradelyStore.keys().forEach(function (k) {
            if (!includeKeys && SECRET_KEYS.indexOf(k) >= 0) return;
            var v = TradelyStore.get(k, null);
            if (v === null) return;
            out[k] = includeKeys ? v : stripSecrets(k, v);
        });
        return out;
    }
    function collect(includeKeys) {
        var local = readLocal(includeKeys);
        return idbReadAll().catch(function () { return {}; }).then(function (idb) {
            return {
                format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(),
                origin: location.origin === 'null' ? 'file' : location.origin, includesApiKeys: !!includeKeys,
                localStorage: local, indexedDB: (function () { var o = {}; o[IDB_NAME] = {}; o[IDB_NAME][IDB_STORE] = idb; return o; })()
            };
        });
    }
    function download(name, text) {
        var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 500);
    }
    function stamp() { var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }
    function exportAll(includeKeys) {
        return collect(includeKeys).then(function (b) {
            var text = JSON.stringify(b);
            download('tradely-backup-' + stamp() + '.json', text);
            return { keys: Object.keys(b.localStorage).length, bytes: text.length };
        });
    }

    /* ------------------------------------------------------------------ *
     * Validate / summarise / import
     * ------------------------------------------------------------------ */
    function validate(b) {
        if (!b || typeof b !== 'object' || b.format !== FORMAT) throw new Error('This file is not a Tradely backup.');
        if (typeof b.version !== 'number' || b.version > VERSION) throw new Error('This backup was made by a newer version of the app.');
        if (!b.localStorage || typeof b.localStorage !== 'object') throw new Error('The backup has no data section.');
        var clean = {}, skipped = 0;
        Object.keys(b.localStorage).forEach(function (k) {
            var v = b.localStorage[k];
            if (TradelyStore.isAppKey(k) && typeof v === 'string') clean[k] = v; else skipped++;
        });
        var idb = {};
        var store = b.indexedDB && b.indexedDB[IDB_NAME] && b.indexedDB[IDB_NAME][IDB_STORE];
        if (store && typeof store === 'object') Object.keys(store).forEach(function (k) { idb[k] = store[k]; });
        return { local: clean, idb: idb, skipped: skipped, meta: { exportedAt: b.exportedAt, origin: b.origin, includesApiKeys: !!b.includesApiKeys } };
    }
    function parseJSON(s) { try { return JSON.parse(s); } catch (e) { return undefined; } }
    function summarise(v) {
        var acc = parseJSON(v.local.tradely_accounts), n = Array.isArray(acc) ? acc.length : 0, mt5 = 0;
        if (Array.isArray(acc)) acc.forEach(function (a) { mt5 += ((a && a.mt5Accounts) || []).length; });
        var calendars = Object.keys(v.local).filter(function (k) { return k.indexOf('tradely_calendar_entries') === 0 || k.indexOf('tradely_acc_days_') === 0; }).length;
        var certs = 0; Object.keys(v.idb).forEach(function (k) { if (Array.isArray(v.idb[k])) certs += v.idb[k].length; });
        return { accounts: n, mt5: mt5, calendars: calendars, keys: Object.keys(v.local).length, idbItems: Object.keys(v.idb).length, certs: certs };
    }
    // Merge two stored values. Arrays of {id} objects are combined by id, plain objects are combined by key.
    // The value already in this browser always wins on a conflict.
    function mergeValue(curStr, impStr) {
        if (curStr == null) return impStr;
        var cur = parseJSON(curStr), imp = parseJSON(impStr);
        if (cur === undefined || imp === undefined) return curStr;
        return JSON.stringify(mergeData(cur, imp));
    }
    function mergeData(cur, imp) {
        if (Array.isArray(cur) && Array.isArray(imp)) {
            var seen = {}, out = cur.slice();
            cur.forEach(function (x) { if (x && x.id != null) seen[x.id] = 1; });
            imp.forEach(function (x) { if (x && x.id != null) { if (!seen[x.id]) out.push(x); } else if (cur.indexOf(x) < 0 && JSON.stringify(cur).indexOf(JSON.stringify(x)) < 0) out.push(x); });
            return out;
        }
        if (cur && imp && typeof cur === 'object' && typeof imp === 'object' && !Array.isArray(cur) && !Array.isArray(imp)) {
            var o = {}; Object.keys(imp).forEach(function (k) { o[k] = imp[k]; });
            Object.keys(cur).forEach(function (k) { o[k] = (k in imp && cur[k] && imp[k] && typeof cur[k] === 'object' && typeof imp[k] === 'object') ? mergeData(cur[k], imp[k]) : cur[k]; });
            return o;
        }
        return cur;
    }
    function applyImport(v, mode, keepKeys) {
        var before = {};
        TradelyStore.keys().forEach(function (k) { before[k] = TradelyStore.get(k, ''); });
        var failed = [];
        if (keepKeys && v.local.tradely_ai_config_v1 && before.tradely_ai_config_v1) { // backup has no keys: keep the ones already saved here
            try {
                var curC = JSON.parse(before.tradely_ai_config_v1), impC = JSON.parse(v.local.tradely_ai_config_v1);
                Object.keys(curC.providers || {}).forEach(function (id) { var k = curC.providers[id] && curC.providers[id].key; if (k) { impC.providers = impC.providers || {}; impC.providers[id] = Object.assign({}, impC.providers[id], { key: k }); } });
                v.local.tradely_ai_config_v1 = JSON.stringify(impC);
            } catch (e) {}
        }
        if (mode === 'replace') TradelyStore.keys().forEach(function (k) { if (keepKeys && SECRET_KEYS.indexOf(k) >= 0) return; TradelyStore.remove(k); });
        Object.keys(v.local).forEach(function (k) {
            var val = v.local[k];
            if (mode === 'merge') { var cur = TradelyStore.get(k, null); val = mergeValue(cur, val); }
            if (!TradelyStore.set(k, val)) failed.push(k);
        });
        if (failed.length) { // roll back so a half-imported state never remains
            TradelyStore.keys().forEach(function (k) { TradelyStore.remove(k); });
            Object.keys(before).forEach(function (k) { TradelyStore.set(k, before[k]); });
            return Promise.reject(new Error('The browser ran out of storage space while importing (' + failed.length + ' item(s) failed). Nothing was changed.'));
        }
        var run = function (existing) {
            var entries = {};
            Object.keys(v.idb).forEach(function (k) { entries[k] = (mode === 'merge' && existing[k] !== undefined) ? mergeData(existing[k], v.idb[k]) : v.idb[k]; });
            return Object.keys(entries).length || mode === 'replace' ? idbWrite(entries, mode === 'replace') : Promise.resolve();
        };
        return (mode === 'merge' ? idbReadAll().catch(function () { return {}; }) : Promise.resolve({})).then(run);
    }
    function eraseAll() {
        TradelyStore.keys().forEach(function (k) { TradelyStore.remove(k); });
        return idbWrite({}, true).catch(function () {});
    }

    /* ------------------------------------------------------------------ *
     * Storage usage by group
     * ------------------------------------------------------------------ */
    var GROUPS = [
        ['Accounts & rules', /^tradely_(accounts|rule_templates|starting_balance)/],
        ['Calendars & trades', /^tradely_(calendar_entries|acc_(days|funds|targets)_)/],
        ['Journal, notes & strategies', /^tradely_(notes|strategies|journal|psy|cons_goal)/],
        ['Certificates & screenshots', /^tradely_certificates$/],
        ['AI & API keys', /^(tradely_ai_config|tradely_groq|tw_twelvedata|tradely_geo_ai)/],
        ['News, charts & feeds', /^tradely_(ecal|geo|tw_|ms_prefs|psychology_feed|x)/]
    ];
    function groupOf(k) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].test(k)) return GROUPS[i][0]; return 'Other'; }
    function fmtBytes(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }
    function usage() {
        var g = {};
        TradelyStore.keys().forEach(function (k) { var n = (k.length + (TradelyStore.get(k, '') || '').length) * 2, name = groupOf(k); g[name] = g[name] || { keys: 0, bytes: 0 }; g[name].keys++; g[name].bytes += n; });
        return idbReadAll().catch(function () { return {}; }).then(function (idb) {
            var ib = 0, items = Object.keys(idb).length; try { ib = JSON.stringify(idb).length * 2; } catch (e) {}
            if (items) { g['Certificates & screenshots'] = g['Certificates & screenshots'] || { keys: 0, bytes: 0 }; g['Certificates & screenshots'].keys += items; g['Certificates & screenshots'].bytes += ib; }
            return g;
        });
    }

    /* ------------------------------------------------------------------ *
     * Settings UI
     * ------------------------------------------------------------------ */
    var CARD = 'glass-card rounded-xl border border-aura-border p-5 space-y-3';
    var BTN = 'px-3.5 py-2 rounded-md text-xs font-semibold border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';
    var BTN_PRIMARY = BTN + ' bg-blue-600 hover:bg-blue-500 border-blue-500/40 text-white';
    var BTN_GHOST = BTN + ' bg-aura-bg border-aura-border text-gray-300 hover:text-white hover:bg-aura-hover';
    var BTN_DANGER = BTN + ' bg-aura-red/10 border-aura-red/40 text-aura-red hover:bg-aura-red/20';
    var staged = null; // { v, summary }

    function msg(id, text, tone) {
        var el = $(id); if (!el) return;
        el.className = 'text-xs font-mono ' + (tone === 'err' ? 'text-aura-red' : tone === 'ok' ? 'text-aura-green' : 'text-gray-400');
        el.textContent = text || '';
    }
    function dataPaneHtml() {
        return '' +
        '<div class="' + CARD + '">' +
            '<div class="flex items-center gap-2"><h2 class="text-sm font-bold text-white">Export all data</h2><span class="geo-pill">Backup</span></div>' +
            '<p class="text-xs text-gray-400 leading-relaxed">Saves everything the app stores in this browser into one <b class="text-gray-200">.json</b> file: accounts and MT5 rules, rule templates, every calendar and trade, payouts, journal, notes, strategies, news and chart settings, calculator history, and your certificates and screenshots.</p>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input type="checkbox" id="sd-incl-keys" class="mt-0.5 accent-blue-500"><span>Include my API keys <span class="text-gray-500">(off by default. Anyone who gets the file could use your keys, so keep it private.)</span></span></label>' +
            '<div class="flex items-center gap-3 flex-wrap"><button id="sd-export" class="' + BTN_PRIMARY + '">Export backup</button><span id="sd-export-msg" class="text-xs font-mono text-gray-400" role="status"></span></div>' +
        '</div>' +
        '<div class="' + CARD + '">' +
            '<div class="flex items-center gap-2"><h2 class="text-sm font-bold text-white">Import data</h2><span class="geo-pill">Restore</span></div>' +
            '<p class="text-xs text-gray-400 leading-relaxed">Choose a backup file made by this app. You will see a summary before anything changes.</p>' +
            '<div><label for="sd-file" class="' + BTN_GHOST + ' inline-block cursor-pointer">Choose backup file…</label><input type="file" id="sd-file" accept=".json,application/json" class="sr-only"> <span id="sd-file-name" class="text-xs font-mono text-gray-500 ml-2"></span></div>' +
            '<div id="sd-preview" class="hidden space-y-3"></div>' +
            '<div id="sd-import-msg" class="text-xs font-mono text-gray-400" role="status"></div>' +
        '</div>' +
        '<div class="' + CARD + '"><div class="flex items-center justify-between gap-2 flex-wrap"><h2 class="text-sm font-bold text-white">Storage used</h2><button id="sd-refresh" class="' + BTN_GHOST + '">Refresh</button></div><div id="sd-usage" class="text-xs text-gray-400">Calculating…</div></div>' +
        '<div class="' + CARD + ' !border-aura-red/30"><h2 class="text-sm font-bold text-aura-red">Erase all app data</h2>' +
            '<p class="text-xs text-gray-400 leading-relaxed">Deletes every account, calendar, note, setting and saved image of the current profile, from this browser and from the cloud. Other profiles are not touched. Export a backup first. This cannot be undone.</p>' +
            '<div class="flex items-center gap-2 flex-wrap"><input id="sd-erase-input" type="text" autocomplete="off" placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" class="bg-aura-bg border border-aura-border rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-aura-red/60"><button id="sd-erase" class="' + BTN_DANGER + '" disabled>Erase everything</button></div><div id="sd-erase-msg" class="text-xs font-mono" role="status"></div></div>';
    }
    function accountPaneHtml() {
        var S = window.TradelySync, a = S && S.account && S.account();
        if (!a) return '<div class="' + CARD + '"><h2 class="text-sm font-bold text-white">Account</h2><p class="text-xs text-gray-400">You are not logged in. Open the sync chip in the top bar and press Sign in.</p></div>';
        var host = ''; try { host = new URL(a.url).host; } catch (e) { host = a.url || ''; }
        var row = function (k, v) { return '<div class="flex justify-between gap-4 text-xs"><span class="text-gray-500">' + k + '</span><span class="text-gray-100 font-medium text-right break-all">' + esc(v || '-') + '</span></div>'; };
        var av = function (t) { return '<span class="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">' + esc(String(t || '?').trim().charAt(0).toUpperCase()) + '</span>'; };
        var saved = (S.saved && S.saved()) || [];
        var list = saved.map(function (e) {
            return '<div class="flex items-center gap-3 rounded-lg border ' + (e.current ? 'border-blue-500/50 bg-blue-600/10' : 'border-aura-border bg-aura-bg/60') + ' p-2.5">' + av(e.nickname) +
                '<div class="min-w-0 flex-1"><div class="text-sm font-bold text-white truncate">' + esc(e.nickname) + (e.current ? ' <span class="text-[10px] font-semibold text-blue-300 ml-1">current</span>' : '') + '</div><div class="text-xs text-gray-300 truncate">' + esc(e.email) + '</div><div class="text-[10px] text-gray-500 truncate">' + esc(e.host) + '</div></div>' +
                '<div class="flex gap-1.5 shrink-0 flex-wrap justify-end">' + (e.current ? '' : '<button data-acc-switch="' + esc(e.id) + '" class="' + BTN_PRIMARY + '">Switch</button>') + '<button data-acc-nick="' + esc(e.id) + '" class="' + BTN_GHOST + '">Nickname</button><button data-acc-forget="' + esc(e.id) + '" class="' + BTN_GHOST + '" aria-label="Remove ' + esc(e.nickname) + ' from this device">Remove</button></div></div>';
        }).join('');
        return '' +
        '<div class="' + CARD + '">' +
            '<div class="flex items-center gap-3">' + av(a.display || a.email) + '<div class="min-w-0"><h2 class="text-sm font-bold text-white truncate">' + esc(a.display || 'Your account') + '</h2><div class="text-xs text-gray-300 truncate">' + esc(a.email) + '</div></div></div>' +
            '<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3 space-y-1.5">' + row('Nickname', a.saved ? a.nickname : 'not set (account not saved yet)') + row('Name', a.name) + row('Email', a.email) + row('Cloud project', host) + '</div>' +
            '<div class="flex gap-2 flex-wrap">' + (a.saved ? '<button id="sd-nick" class="' + BTN_GHOST + '">Change nickname</button>' : '<button id="sd-nick" class="' + BTN_PRIMARY + '">Save this account &amp; set nickname</button>') + '<button id="sd-logout" class="' + BTN_GHOST + '">Log out</button></div>' +
            '<p class="text-[11px] text-gray-500 leading-relaxed">Log out asks if you want to save the account. Saved accounts can be switched to without typing the password. Logging out without saving removes the copy on this device; your data stays in the cloud.</p>' +
        '</div>' +
        '<div class="' + CARD + '">' +
            '<div class="flex items-center justify-between gap-2 flex-wrap"><h2 class="text-sm font-bold text-white">Saved accounts <span class="text-gray-500 font-normal">(' + saved.length + ')</span></h2><button id="sd-addacc" class="' + BTN_PRIMARY + '">Add another account</button></div>' +
            (list ? '<div class="space-y-2">' + list + '</div>' : '<p class="text-xs text-gray-400">Nothing saved yet. Each account can use a different Supabase project. Save an account to switch between them from here.</p>') +
            '<p class="text-[11px] text-gray-500 leading-relaxed">Only a renewable login token is kept on this device, never your password. Switching uploads pending changes first, then loads the other account\u2019s data from its own cloud project.</p>' +
        '</div>' +
        '<div class="' + CARD + ' !border-aura-red/30"><h2 class="text-sm font-bold text-aura-red">Delete account</h2>' +
            '<p class="text-xs text-gray-400 leading-relaxed">Deletes the <b class="text-gray-200">current</b> login and <b class="text-gray-200">all its profiles with all their data</b> from Supabase and from this device, from A to Z. You must confirm with your password. This cannot be undone. Other saved accounts are not touched. To delete only one profile, use Edit \u2192 Delete profile in the profile menu (bottom left).</p>' +
            '<div><button id="sd-delacc" class="' + BTN_DANGER + '">Delete account\u2026</button></div></div>';
    }
    function wireAccount(root) {
        var S = window.TradelySync; if (!S) return;
        var q = function (sel) { return (root || document).querySelector(sel); };
        var lo = q('#sd-logout'); if (lo) lo.onclick = function () { S.signOut(); };
        var da = q('#sd-delacc'); if (da) da.onclick = function () { S.deleteAccount(); };
        var nk = q('#sd-nick'); if (nk) nk.onclick = function () { S.nickname(); };
        var ad = q('#sd-addacc'); if (ad) ad.onclick = function () { S.addAccount(); };
        (root || document).querySelectorAll('[data-acc-switch]').forEach(function (b) { b.onclick = function () { S.switchTo(b.getAttribute('data-acc-switch')); }; });
        (root || document).querySelectorAll('[data-acc-nick]').forEach(function (b) { b.onclick = function () { S.nickname(b.getAttribute('data-acc-nick')); }; });
        (root || document).querySelectorAll('[data-acc-forget]').forEach(function (b) { b.onclick = function () { S.forget(b.getAttribute('data-acc-forget')); }; });
    }
    function refreshAccountPane() {
        var p = document.querySelector('[data-spane="account"]'); if (!p) return;
        p.innerHTML = accountPaneHtml(); wireAccount(p);
    }
    window.addEventListener('tradely:accounts-changed', refreshAccountPane);
    function installCardHtml() {
        var P = window.TradelyPWA; if (!P) return '';
        return '<div class="' + CARD + '"><h2 class="text-sm font-bold text-white">Install app</h2><p id="sd-pwa-text" class="text-xs text-gray-400 leading-relaxed"></p>' +
            '<div><button id="sd-pwa-btn" class="' + BTN_PRIMARY + ' hidden">Install Tradely</button></div></div>';
    }
    function wireInstall() {
        var P = window.TradelyPWA, t = $('sd-pwa-text'), b = $('sd-pwa-btn'); if (!P || !t || !b) return;
        function paint() { t.textContent = P.howTo(); b.classList.toggle('hidden', !P.canInstall()); }
        b.onclick = function () { P.install(); }; paint(); window.addEventListener('tradely:pwa-changed', paint);
    }
    function prefsPaneHtml() {
        return installCardHtml() +
        '<div class="' + CARD + '">' +
            '<h2 class="text-sm font-bold text-white">Calculator</h2>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input type="checkbox" id="sd-calc-kb" class="mt-0.5 accent-blue-500"><span>Type with the keyboard <span class="text-gray-500">(numbers, + - * / ( ) %, Enter for equals, Backspace, Delete or C to clear, Esc to close. Ctrl+V pastes a sum. It never types while you are in another input field.)</span></span></label>' +
            '<div class="flex items-center gap-3 flex-wrap"><button id="sd-calc-clear" class="' + BTN_GHOST + '">Clear calculator history</button><button id="sd-calc-pos" class="' + BTN_GHOST + '">Reset calculator position</button><span id="sd-prefs-msg" class="text-xs font-mono text-gray-400" role="status"></span></div>' +
        '</div>';
    }
    function aboutPaneHtml() {
        return '' +
        '<div class="' + CARD + '"><h2 class="text-sm font-bold text-white">About your data</h2>' +
            '<ul class="text-xs text-gray-400 leading-relaxed space-y-2 list-disc pl-4">' +
            '<li>The working copy of your data is stored in this browser (localStorage and IndexedDB). When cloud sync is set up (sync chip, top bar), each profile\u2019s data is also saved to your Supabase project, under that profile only. AI and Twelve Data API keys are saved to the cloud with the profile too (as plain text, protected by your login); backup files never contain keys.</li>' +
            '<li><b class="text-gray-200">Keep all pages in one folder and open them from the same address.</b> Tradely, Terminal and Charts share data, which only works from the same folder and the same origin (for example all through <span class="font-mono">file://</span> in one browser, or all from one local server).</li>' +
            '<li><b class=\"text-gray-200\">Profiles are separate.</b> Each profile (sidebar, bottom left) has its own accounts, journal, notes, settings and certificates. Export, Import, Storage usage and Erase here always work on the <b class=\"text-gray-200\">current profile only</b>. A profile PIN only locks the app on this device; it does not encrypt the data, so do not rely on it to hide data from someone with access to your browser.</li>' +
            '<li>A different browser, a private window, or clearing site data starts empty. Use Export and Import to move data between them.</li>' +
            '<li>Export a backup regularly. Browsers can delete site data when storage is low.</li></ul></div>';
    }

    function renderUsage() {
        var box = $('sd-usage'); if (!box) return;
        usage().then(function (g) {
            var names = Object.keys(g).sort(function (a, b) { return g[b].bytes - g[a].bytes; }), total = 0, items = 0;
            names.forEach(function (n) { total += g[n].bytes; items += g[n].keys; });
            if (!names.length) { box.textContent = 'No saved data yet.'; return; }
            box.innerHTML = '<div class="text-gray-300 mb-2">Total <b class="text-white">' + esc(fmtBytes(total)) + '</b> in ' + items + ' item' + (items === 1 ? '' : 's') + '</div><div class="space-y-1.5">' +
                names.map(function (n) {
                    var pct = total ? Math.max(2, Math.round(g[n].bytes / total * 100)) : 0;
                    return '<div><div class="flex justify-between font-mono text-[11px]"><span class="text-gray-300">' + esc(n) + '</span><span class="text-gray-500">' + esc(fmtBytes(g[n].bytes)) + ' · ' + g[n].keys + '</span></div><div class="h-1 rounded bg-aura-border mt-1"><div class="h-1 rounded bg-blue-500" style="width:' + pct + '%"></div></div></div>';
                }).join('') + '</div>';
        });
    }
    function showPreview(v, fileName) {
        var s = summarise(v), box = $('sd-preview');
        var row = function (k, val) { return '<div class="flex justify-between gap-3"><span class="text-gray-500">' + k + '</span><span class="text-gray-200 text-right">' + val + '</span></div>'; };
        box.classList.remove('hidden');
        box.innerHTML = '<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3 space-y-1 text-xs font-mono">' +
            row('File', esc(fileName)) + row('Exported', esc(v.meta.exportedAt ? new Date(v.meta.exportedAt).toLocaleString() : 'unknown')) +
            row('Accounts', s.accounts + (s.mt5 ? ' (' + s.mt5 + ' MT5)' : '')) + row('Calendars', s.calendars) + row('Saved items', s.keys) +
            row('Certificates & images', s.certs) + row('API keys', v.meta.includesApiKeys ? 'included' : 'not included') +
            (v.skipped ? row('Ignored', v.skipped + ' unknown item(s)') : '') + '</div>' +
            '<fieldset class="space-y-2"><legend class="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-1">How to import</legend>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input type="radio" name="sd-mode" value="merge" checked class="mt-0.5 accent-blue-500"><span><b class="text-white">Merge</b> <span class="text-gray-500">add what is missing and keep what is already here (safest)</span></span></label>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input type="radio" name="sd-mode" value="replace" class="mt-0.5 accent-blue-500"><span><b class="text-white">Replace everything</b> <span class="text-gray-500">delete current data first, then load the backup</span></span></label></fieldset>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input type="checkbox" id="sd-safety" checked class="mt-0.5 accent-blue-500"><span>Download a backup of my current data first</span></label>' +
            '<div class="flex gap-2 flex-wrap"><button id="sd-do-import" class="' + BTN_PRIMARY + '">Import now</button><button id="sd-cancel" class="' + BTN_GHOST + '">Cancel</button></div>';
        $('sd-cancel').onclick = clearStaged;
        $('sd-do-import').onclick = doImport;
    }
    function clearStaged() { staged = null; var b = $('sd-preview'); if (b) { b.classList.add('hidden'); b.innerHTML = ''; } var f = $('sd-file'); if (f) f.value = ''; var n = $('sd-file-name'); if (n) n.textContent = ''; }
    function onFile(file) {
        msg('sd-import-msg', '');
        clearStaged();
        if (!file) return;
        if (file.size > MAX_IMPORT_BYTES) return msg('sd-import-msg', 'This file is too large to import (over 150 MB).', 'err');
        $('sd-file-name').textContent = file.name;
        var rd = new FileReader();
        rd.onerror = function () { msg('sd-import-msg', 'Could not read that file.', 'err'); };
        rd.onload = function () {
            try { var v = validate(JSON.parse(rd.result)); staged = { v: v, name: file.name }; showPreview(v, file.name); }
            catch (e) { msg('sd-import-msg', e instanceof SyntaxError ? 'This file is not valid JSON.' : e.message, 'err'); $('sd-file-name').textContent = ''; }
        };
        rd.readAsText(file);
    }
    function doImport() {
        if (!staged) return;
        var mode = (document.querySelector('input[name="sd-mode"]:checked') || {}).value || 'merge', btn = $('sd-do-import');
        if (mode === 'replace' && !confirm('Replace ALL current data with this backup? Anything not in the backup will be lost.')) return;
        btn.disabled = true; msg('sd-import-msg', 'Importing…');
        var safety = $('sd-safety') && $('sd-safety').checked;
        (safety ? collect(true).then(function (b) { download('tradely-before-import-' + stamp() + '.json', JSON.stringify(b)); }) : Promise.resolve())
            .then(function () { return applyImport(staged.v, mode, !staged.v.meta.includesApiKeys); })
            .then(function () { msg('sd-import-msg', 'Import complete. Reloading…', 'ok'); setTimeout(function () { location.reload(); }, 1200); })
            .catch(function (e) { btn.disabled = false; msg('sd-import-msg', 'Import failed: ' + (e && e.message || e), 'err'); });
    }
    function calcPrefs() { return TradelyStore.getJSON('tradely_calc_prefs', {}) || {}; }
    function wire() {
        $('sd-export').onclick = function () {
            var b = $('sd-export'); b.disabled = true; msg('sd-export-msg', 'Preparing…');
            exportAll($('sd-incl-keys').checked).then(function (r) { msg('sd-export-msg', 'Saved ' + r.keys + ' items (' + fmtBytes(r.bytes) + ').', 'ok'); })
                .catch(function (e) { msg('sd-export-msg', 'Export failed: ' + (e && e.message || e), 'err'); }).then(function () { b.disabled = false; });
        };
        $('sd-file').onchange = function () { onFile(this.files && this.files[0]); };
        $('sd-refresh').onclick = renderUsage;
        $('sd-erase-input').oninput = function () { $('sd-erase').disabled = this.value.trim() !== 'DELETE'; };
        $('sd-erase').onclick = function () {
            if (!confirm('Erase ALL data of this profile from this browser and from the cloud? Other profiles are not touched. This cannot be undone.')) return;
            eraseAll().then(function () { msg('sd-erase-msg', 'All data erased. Reloading…', 'ok'); setTimeout(function () { location.reload(); }, 900); });
        };
        wireAccount(); wireInstall();
        var kb = $('sd-calc-kb'); kb.checked = calcPrefs().keyboard !== false;
        kb.onchange = function () { var p = calcPrefs(); p.keyboard = kb.checked; TradelyStore.setJSON('tradely_calc_prefs', p); msg('sd-prefs-msg', 'Saved.', 'ok'); };
        $('sd-calc-clear').onclick = function () { TradelyStore.remove('tradely_calc_hist'); msg('sd-prefs-msg', 'Calculator history cleared.', 'ok'); };
        $('sd-calc-pos').onclick = function () { TradelyStore.remove('tradely_calc_pos_v1'); msg('sd-prefs-msg', 'Position reset. It applies the next time the calculator opens.', 'ok'); };
    }

    function init() {
        var tab = $('tab-settings'); if (!tab) return;
        var wrap = tab.querySelector(':scope > div'); if (!wrap || wrap.dataset.sdReady) return;
        wrap.dataset.sdReady = '1';
        var aiBlocks = Array.prototype.slice.call(wrap.children);
        aiBlocks.forEach(function (el) { el.setAttribute('data-spane', 'ai'); });
        var panes = { account: accountPaneHtml(), data: dataPaneHtml(), prefs: prefsPaneHtml(), about: aboutPaneHtml() };
        Object.keys(panes).forEach(function (k) { var d = document.createElement('div'); d.setAttribute('data-spane', k); d.className = 'space-y-6 hidden'; d.innerHTML = panes[k]; wrap.appendChild(d); });
        var tabs = [['account', 'Account'], ['ai', 'AI API'], ['data', 'Data & Backup'], ['prefs', 'Preferences'], ['about', 'About']];
        var nav = document.createElement('div');
        nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Settings sections');
        nav.className = 'flex gap-1 flex-wrap p-1 rounded-lg border border-aura-border bg-aura-bg/60 w-fit';
        nav.innerHTML = tabs.map(function (t) { return '<button type="button" role="tab" data-stab="' + t[0] + '" class="px-3.5 py-1.5 rounded-md text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"></button>'; }).join('');
        wrap.insertBefore(nav, wrap.firstChild);
        var btns = nav.querySelectorAll('[data-stab]');
        btns.forEach(function (b, i) { b.textContent = tabs[i][1]; });
        function show(name) {
            btns.forEach(function (b) { var on = b.dataset.stab === name; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.className = 'px-3.5 py-1.5 rounded-md text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ' + (on ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'); });
            wrap.querySelectorAll(':scope > [data-spane]').forEach(function (p) {
                var hide = p.getAttribute('data-spane') !== name;
                if (p.getAttribute('data-spane') === 'ai') p.style.display = hide ? 'none' : ''; else p.classList.toggle('hidden', hide);
            });
            if (name === 'data') renderUsage();
        }
        nav.addEventListener('click', function (e) { var b = e.target.closest('[data-stab]'); if (b) show(b.dataset.stab); });
        nav.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            var i = Array.prototype.findIndex.call(btns, function (b) { return b.getAttribute('aria-selected') === 'true'; });
            var n = (i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length; show(btns[n].dataset.stab); btns[n].focus(); e.preventDefault();
        });
        wire();
        show('account');
        window.settingsShow = show;
    }
    window.TradelyData = { collect: collect, exportAll: exportAll, validate: validate, applyImport: applyImport, mergeData: mergeData, eraseAll: eraseAll };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
