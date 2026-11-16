/* profiles.js - separate profiles (name, username, optional PIN) with fully independent data.
   Must load FIRST, before any other script: it re-maps localStorage keys and the IndexedDB name
   to the active profile, so every other script works on that profile's data without changes.
   NOTE: the PIN is a convenience lock on this device, not encryption. */
(function () {
    'use strict';
    var LS = window.localStorage, SP = Storage.prototype;
    var raw = { get: SP.getItem, set: SP.setItem, rem: SP.removeItem, key: SP.key };
    var lenDesc = Object.getOwnPropertyDescriptor(SP, 'length');
    var PROFILES_KEY = 'tradely_profiles_v1', ACTIVE_KEY = 'tradely_active_profile', SESSION_KEY = 'tradely_unlocked_profile', LOCKED = '__locked__';
    function rget(k) { try { return raw.get.call(LS, k); } catch (e) { return null; } }
    function rset(k, v) { try { raw.set.call(LS, k, v); return true; } catch (e) { return false; } }
    function rrem(k) { try { raw.rem.call(LS, k); } catch (e) {} }
    function rkeys() { var n = lenDesc.get.call(LS), out = []; for (var i = 0; i < n; i++) out.push(raw.key.call(LS, i)); return out; }
    function parseList(s) { try { var l = JSON.parse(s || '[]'); return Array.isArray(l) ? l.filter(function (p) { return p && p.id; }) : []; } catch (e) { return []; } }
    function loadAll() { return parseList(rget(PROFILES_KEY)); }                                   // live profiles + tombstones
    function loadList() { return loadAll().filter(function (p) { return !p.deleted; }); }           // live profiles only (what the UI sees)
    function saveList(l, newTombs) {                                                                  // l = live profiles; tombstones are kept automatically
        var ids = {}; l.forEach(function (p) { ids[p.id] = 1; });
        var tombs = loadAll().filter(function (p) { return p.deleted && !ids[p.id]; });
        (newTombs || []).forEach(function (t) { tombs = tombs.filter(function (x) { return x.id !== t.id; }); tombs.push(t); });
        var ok = rset(PROFILES_KEY, JSON.stringify(l.concat(tombs))); try { window.dispatchEvent(new Event('tradely:profiles-saved')); } catch (e) {} return ok;
    }

    /* ---- merging profile lists from two devices (used by supabase-sync.js) ----
       Union by id. A deleted profile (tombstone) always wins. Otherwise the newer 'updated' stamp wins.
       Same username on two different ids gets a short suffix on the newer one, so usernames stay unique.
       The cloud copy never carries the device-local 'legacyDb' flag, so two devices never ping-pong over it. */
    function stamp(p) { return p.updated || p.created || 0; }
    function canonical(list, withLegacy) {
        var out = list.slice().sort(function (a, b) { return (a.created || 0) - (b.created || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }), used = {};
        return out.map(function (p) {
            if (p.deleted) return { id: p.id, deleted: true, updated: p.updated || Date.now() };
            var u = p.username; if (used[u]) { u = (u.slice(0, 24) + '_' + String(p.id).slice(1, 5)).toLowerCase().replace(/[^a-z0-9._-]/g, ''); }
            used[u] = 1;
            var o = { id: p.id, name: p.name, username: u, pin: p.pin || null, created: p.created || 0, updated: p.updated || p.created || 0 };
            if (withLegacy && p.legacyDb) o.legacyDb = true;
            return o;
        });
    }
    function mergeLocal(localStr, remoteStr) {          // -> list string in local form (keeps this device's legacyDb flags)
        var L = parseList(localStr), Rm = parseList(remoteStr), by = {};
        L.forEach(function (p) { by[p.id] = p; });
        Rm.forEach(function (r) {
            var l = by[r.id];
            if (!l) { by[r.id] = r.deleted ? r : Object.assign({}, r, { legacyDb: false }); return; }
            if (l.deleted) return;
            if (r.deleted) { by[r.id] = r; return; }
            var win = stamp(r) > stamp(l) || (stamp(r) === stamp(l) && JSON.stringify(canonical([r])) > JSON.stringify(canonical([l]))) ? r : l;
            by[r.id] = win === r ? Object.assign({}, r, { legacyDb: !!l.legacyDb }) : l;
        });
        return JSON.stringify(canonical(Object.keys(by).map(function (k) { return by[k]; }), true));
    }
    function cloudForm(localStr) { return JSON.stringify(canonical(parseList(localStr), false)); }
    function getUnlocked() { try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; } }
    function setUnlocked(id) { try { if (id) sessionStorage.setItem(SESSION_KEY, id); else sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }

    /* ---- compact synchronous SHA-256 for the PIN ---- */
    function sha256(str) {
        var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
        var utf = unescape(encodeURIComponent(str)), n = utf.length, bytes = [], i, j;
        for (i = 0; i < n; i++) bytes.push(utf.charCodeAt(i));
        bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
        var hi = Math.floor(n * 8 / 4294967296), lo = (n * 8) >>> 0;
        bytes.push(hi >>> 24 & 255, hi >>> 16 & 255, hi >>> 8 & 255, hi & 255, lo >>> 24 & 255, lo >>> 16 & 255, lo >>> 8 & 255, lo & 255);
        function rr(x, c) { return (x >>> c) | (x << (32 - c)); }
        for (var off = 0; off < bytes.length; off += 64) {
            var W = new Array(64);
            for (i = 0; i < 16; i++) W[i] = (bytes[off + 4 * i] << 24) | (bytes[off + 4 * i + 1] << 16) | (bytes[off + 4 * i + 2] << 8) | bytes[off + 4 * i + 3];
            for (i = 16; i < 64; i++) { var s0 = rr(W[i - 15], 7) ^ rr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rr(W[i - 2], 17) ^ rr(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0; }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (i = 0; i < 64; i++) {
                var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + W[i]) | 0;
                var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
        }
        var out = ''; for (j = 0; j < 8; j++) out += ('00000000' + (H[j] >>> 0).toString(16)).slice(-8); return out;
    }
    function hashPin(pin, salt) { var h = salt + ':' + pin; for (var i = 0; i < 500; i++) h = sha256(h + salt); return h; }
    function rnd() { var a = new Uint32Array(3); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : (a[0] = Math.random() * 4e9, a[1] = Math.random() * 4e9, a[2] = Date.now()); return Array.prototype.map.call(a, function (x) { return x.toString(36); }).join(''); }

    /* ---- which profile is active in this tab? ---- */
    var list = loadList(), activeId = rget(ACTIVE_KEY), cur = list.filter(function (p) { return p.id === activeId; })[0] || null;
    var unlocked = !!(cur && (!cur.pin || getUnlocked() === cur.id));
    var nsId = unlocked ? cur.id : LOCKED;
    var PREFIX = 'tp:' + nsId + ':';
    var dbSuffix = unlocked ? (cur.legacyDb ? '' : '__' + cur.id) : '__locked';
    rkeys().forEach(function (k) { if (k.indexOf('tp:' + LOCKED + ':') === 0) rrem(k); });   // anything written while locked is discarded

    function mine() { return rkeys().filter(function (k) { return k.indexOf(PREFIX) === 0; }).map(function (k) { return k.slice(PREFIX.length); }); }
    SP.getItem = function (k) { return this === LS ? raw.get.call(this, PREFIX + k) : raw.get.call(this, k); };
    /* A failed save (storage full, blocked, etc.) must never be silent: show a banner, then re-throw so callers behave as before. */
    var lastWarn = 0;
    function warnSaveFailed(err) {
        var now = Date.now(); if (now - lastWarn < 4000) return; lastWarn = now;
        var full = err && (err.name === 'QuotaExceededError' || /quota/i.test(String(err.message)));
        var text = full ? 'Storage is full. Your latest change was NOT saved. Open Settings > Data & Backup, export a backup, then free space (for example remove old screenshots).' : 'Could not save your latest change to this browser\u2019s storage. Export a backup now.';
        function show() {
            var d = document.getElementById('tp-save-warn');
            if (!d) { d = document.createElement('div'); d.id = 'tp-save-warn'; d.setAttribute('role', 'alert'); d.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;max-width:min(560px,92vw);background:#3b0d12;border:1px solid #ef4444;color:#fecaca;font:600 12px/1.45 system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);cursor:pointer'; d.onclick = function () { d.remove(); }; document.body.appendChild(d); }
            d.textContent = text; clearTimeout(d._t); d._t = setTimeout(function () { d.remove(); }, 15000);
        }
        if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    }
    SP.setItem = function (k, v) {
        if (this !== LS) return raw.set.call(this, k, v);
        try { return raw.set.call(this, PREFIX + k, v); } catch (e) { warnSaveFailed(e); throw e; }
    };
    SP.removeItem = function (k) { return this === LS ? raw.rem.call(this, PREFIX + k) : raw.rem.call(this, k); };
    SP.key = function (i) { return this === LS ? (mine()[i] === undefined ? null : mine()[i]) : raw.key.call(this, i); };
    Object.defineProperty(SP, 'length', { configurable: true, get: function () { return this === LS ? mine().length : lenDesc.get.call(this); } });
    var Clear = SP.clear; SP.clear = function () { if (this === LS) { mine().forEach(function (k) { rrem(PREFIX + k); }); } else Clear.call(this); };

    function purgeLocal(p) {            // remove every local trace of one profile (its keys and its IndexedDB)
        rkeys().forEach(function (k) { if (k.indexOf('tp:' + p.id + ':') === 0) rrem(k); });
        if (rawDel) rawDel('tradely_db' + (p.legacyDb ? '' : '__' + p.id));
    }
    var rawDel = null;
    var IDB = window.IDBFactory && IDBFactory.prototype;
    var oOpen = IDB && IDB.open, oDel = IDB && IDB.deleteDatabase;
    if (IDB) {
        IDB.open = function (name, v) { return arguments.length > 1 ? oOpen.call(this, name === 'tradely_db' ? name + dbSuffix : name, v) : oOpen.call(this, name === 'tradely_db' ? name + dbSuffix : name); };
        IDB.deleteDatabase = function (name) { return oDel.call(this, name === 'tradely_db' ? name + dbSuffix : name); };
        rawDel = function (n) { try { oDel.call(indexedDB, n); } catch (e) {} };
    }

    /* ---- profile API ---- */
    function clean(s, max) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max); }
    function validate(name, username, pin, ignoreId) {
        if (!clean(name, 40)) return 'Enter a name.';
        var u = clean(username, 30).toLowerCase();
        if (!/^[a-z0-9._-]{2,30}$/.test(u)) return 'Username: 2-30 letters, numbers, dot, dash or underscore.';
        if (loadList().some(function (p) { return p.id !== ignoreId && p.username === u; })) return 'That username is already used.';
        if (pin && !/^\d{4,8}$/.test(pin)) return 'PIN must be 4 to 8 digits (or leave it empty).';
        return '';
    }
    function makePin(pin) { if (!pin) return null; var salt = rnd(); return { salt: salt, hash: hashPin(pin, salt) }; }
    function checkPin(p, pin) { return !p.pin || hashPin(pin, p.pin.salt) === p.pin.hash; }
    function activate(id) { rset(ACTIVE_KEY, id); var p = loadList().filter(function (x) { return x.id === id; })[0]; setUnlocked(p && p.pin ? id : null); location.reload(); }
    var API = {
        list: function () { return loadList().map(function (p) { return { id: p.id, name: p.name, username: p.username, hasPin: !!p.pin }; }); },
        current: function () { return unlocked ? { id: cur.id, name: cur.name, username: cur.username, hasPin: !!cur.pin } : null; },
        isUnlocked: function () { return unlocked; },
        validate: validate, checkPin: function (id, pin) { var p = loadList().filter(function (x) { return x.id === id; })[0]; return !!p && checkPin(p, pin); },
        create: function (name, username, pin) {
            var err = validate(name, username, pin); if (err) return err;
            var l = loadList(), first = l.length === 0, p = { id: 'u' + rnd().slice(0, 8), name: clean(name, 40), username: clean(username, 30).toLowerCase(), pin: makePin(pin), created: Date.now(), updated: Date.now(), legacyDb: first };
            if (first) {   // data that existed before profiles belongs to the first profile
                rkeys().forEach(function (k) { if (k !== PROFILES_KEY && k !== ACTIVE_KEY && k.indexOf('tp:') !== 0 && k.indexOf('tradely_sync_') !== 0) { var v = rget(k); if (v !== null && rset('tp:' + p.id + ':' + k, v)) rrem(k); } });
            }
            l.push(p); if (!saveList(l)) return 'Storage is full. Could not save the profile.';
            activate(p.id); return '';
        },
        update: function (id, name, username, newPin, removePin) {
            var err = validate(name, username, newPin, id); if (err) return err;
            var l = loadList(), p = l.filter(function (x) { return x.id === id; })[0]; if (!p) return 'Profile not found.';
            p.name = clean(name, 40); p.username = clean(username, 30).toLowerCase(); p.updated = Date.now();
            if (removePin) p.pin = null; else if (newPin) p.pin = makePin(newPin);
            saveList(l); setUnlocked(p.pin ? p.id : null); if (p.pin) setUnlocked(p.id); location.reload(); return '';
        },
        remove: function (id) {
            var l = loadList(), p = l.filter(function (x) { return x.id === id; })[0]; if (!p) return;
            purgeLocal(p);
            l = l.filter(function (x) { return x.id !== id; }); saveList(l, [{ id: id, deleted: true, updated: Date.now() }]);
            try { window.dispatchEvent(new CustomEvent('tradely:profile-removed', { detail: { id: id } })); } catch (e) {}
            if (id === activeId) { rrem(ACTIVE_KEY); setUnlocked(null); }
            location.reload();
        },
        switchTo: function (id, pin) { var p = loadList().filter(function (x) { return x.id === id; })[0]; if (!p) return 'Profile not found.'; if (!checkPin(p, pin || '')) return 'Wrong PIN.'; if (p.pin) setUnlocked(p.id); activate(id); return ''; },
        lock: function () { setUnlocked(null); location.reload(); }
    };
    /* low-level access for supabase-sync.js (raw = not re-mapped to the active profile) */
    API.raw = {
        get: rget, set: rset, rem: rrem, keys: rkeys, PROFILES_KEY: PROFILES_KEY, ACTIVE_KEY: ACTIVE_KEY,
        idbOpen: function (name, ver) { return oOpen.call(indexedDB, name, ver); },
        idbDelete: function (name) { return new Promise(function (res) { try { var r = oDel.call(indexedDB, name); r.onsuccess = r.onerror = r.onblocked = function () { res(); }; } catch (e) { res(); } }); },
        isLocked: function () { return !unlocked; },
        all: loadAll, mergeLocal: mergeLocal, cloudForm: cloudForm, purgeLocal: purgeLocal
    };
    window.TradelyProfiles = API;
})();
