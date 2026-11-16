/* shared.js - loaded by every page right after the vendor libraries.
   1) Tailwind (CDN) theme config   2) escapeHtml   3) TradelyStore (safe storage layer) */
window.tailwind = window.tailwind || {};
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        aura: {
                            bg: '#090a0f',
                            card: '#11131a',
                            border: '#1f2430',
                            hover: '#1a1d26',
                            muted: '#6b7280',
                            accent: '#3b82f6',
                            green: '#10b981',
                            red: '#ef4444',
                            amber: '#f59e0b',
                            purple: '#8b5cf6',
                            pink: '#ec4899'
                        }
                    },
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'sans-serif'],
                        mono: ['Open Sans', 'sans-serif']
                    }
                }
            }
        }
    

/* ------------------------------------------------------------------ *
 * 2) escapeHtml - the single hardened copy.
 *    Escapes & < > " ' so user text (account names, notes, titles) is
 *    safe both inside element content AND inside attribute values.
 * ------------------------------------------------------------------ */
function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

/* safeImgSrc - only lets image data URLs and http(s) URLs through (blocks javascript: etc.) */
function safeImgSrc(u) {
    u = String(u == null ? '' : u);
    return /^(data:image\/|https?:\/\/|blob:)/i.test(u) ? u : '';
}

/* ------------------------------------------------------------------ *
 * 3) TradelyStore - one safe wrapper around localStorage.
 *    Every page can use it; the Settings page (export / import) is built
 *    on top of it. All keys used by the app start with "tradely_" except
 *    the Twelve Data key ("tw_twelvedata_api_key").
 * ------------------------------------------------------------------ */
var TradelyStore = (function () {
    var PREFIXES = ['tradely_', 'tw_'];
    var ok = true;
    try { var t = '__tradely_probe__'; localStorage.setItem(t, '1'); localStorage.removeItem(t); } catch (e) { ok = false; }

    function isAppKey(k) {
        for (var i = 0; i < PREFIXES.length; i++) if (String(k).indexOf(PREFIXES[i]) === 0) return true;
        return false;
    }
    function get(key, fallback) {
        try { var v = localStorage.getItem(key); return v === null ? (fallback === undefined ? null : fallback) : v; }
        catch (e) { return fallback === undefined ? null : fallback; }
    }
    function set(key, value) {
        try { localStorage.setItem(key, String(value)); return true; }
        catch (e) { console.warn('TradelyStore: could not save "' + key + '"', e); return false; }
    }
    function getJSON(key, fallback) {
        try { var raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
        catch (e) { return fallback; }
    }
    function setJSON(key, value) { return set(key, JSON.stringify(value)); }
    function remove(key) { try { localStorage.removeItem(key); return true; } catch (e) { return false; } }
    function keys() {
        var out = [];
        try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (isAppKey(k)) out.push(k); } }
        catch (e) {}
        return out.sort();
    }
    function bytes() {
        var n = 0;
        keys().forEach(function (k) { n += k.length + (get(k, '') || '').length; });
        return n * 2; // UTF-16
    }
    return { available: ok, isAppKey: isAppKey, get: get, set: set, getJSON: getJSON, setJSON: setJSON, remove: remove, keys: keys, bytes: bytes };
})();
