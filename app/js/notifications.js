/* notifications.js - working notification bell (top right). Every in-app toast message is also kept here,
   per profile, so nothing is missed. Unread badge, mark all read, clear all, click outside or Esc to close. */
(function () {
    'use strict';
    var KEY = 'tradely_notifications_v1', MAX = 60;
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function load() { try { var l = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
    function save(l) { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, MAX))); } catch (e) {} }
    function ago(ts) { var s = Math.max(0, (Date.now() - ts) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return new Date(ts).toLocaleDateString(); }
    var btn = null, badge = null, panel = null;
    function add(text, tone) {
        text = String(text || '').trim(); if (!text) return;
        var l = load(); if (l[0] && l[0].text === text && Date.now() - l[0].ts < 5000) return;   // ignore instant duplicates
        l.unshift({ id: Date.now() + '' + Math.floor(Math.random() * 1000), ts: Date.now(), text: text.slice(0, 300), tone: tone || 'info', read: false });
        save(l); paintBadge(); if (panel) paintPanel();
    }
    function unread() { return load().filter(function (n) { return !n.read; }).length; }
    function paintBadge() {
        if (!badge) return; var n = unread();
        badge.textContent = n > 9 ? '9+' : String(n); badge.style.display = n ? 'flex' : 'none';
        if (btn) btn.setAttribute('aria-label', n ? 'Notifications, ' + n + ' unread' : 'Notifications');
    }
    function tone(t) { return t === 'error' ? 'bg-aura-red' : (t === 'success' || t === 'ok') ? 'bg-aura-green' : 'bg-blue-500'; }
    function paintPanel() {
        var l = load();
        panel.innerHTML = '<div class="flex items-center justify-between px-3 py-2.5 border-b border-aura-border"><span class="text-xs font-bold text-white">Notifications</span><span class="flex gap-3 text-[11px]"><button type="button" id="nf-read" class="text-blue-400 hover:underline">Mark all read</button><button type="button" id="nf-clear" class="text-gray-400 hover:underline">Clear all</button></span></div>' +
            (l.length ? '<div class="max-h-80 overflow-y-auto">' + l.map(function (n) { return '<div class="flex gap-2.5 px-3 py-2.5 border-b border-aura-border/50 ' + (n.read ? '' : 'bg-blue-500/5') + '"><span class="mt-1.5 w-2 h-2 rounded-full shrink-0 ' + (n.read ? 'bg-gray-600' : tone(n.tone)) + '"></span><div class="min-w-0"><div class="text-xs ' + (n.read ? 'text-gray-400' : 'text-gray-100') + '">' + esc(n.text) + '</div><div class="text-[10px] text-gray-500 mt-0.5">' + ago(n.ts) + '</div></div></div>'; }).join('') + '</div>' : '<div class="px-4 py-8 text-center text-xs text-gray-500">No notifications yet.<br>Payout alerts, passed or failed accounts and save confirmations will show up here.</div>');
        panel.querySelector('#nf-read').onclick = function () { var x = load(); x.forEach(function (n) { n.read = true; }); save(x); paintBadge(); paintPanel(); };
        panel.querySelector('#nf-clear').onclick = function () { save([]); paintBadge(); paintPanel(); };
    }
    function close() { if (panel) { panel.remove(); panel = null; if (btn) btn.setAttribute('aria-expanded', 'false'); var x = load(); x.forEach(function (n) { n.read = true; }); save(x); paintBadge(); } }
    function open() {
        panel = document.createElement('div'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Notifications');
        var r = btn.getBoundingClientRect();
        panel.style.cssText = 'position:fixed;z-index:8500;top:' + (r.bottom + 8) + 'px;right:' + Math.max(8, window.innerWidth - r.right) + 'px;width:340px;max-width:calc(100vw - 16px);background:#14161f';
        panel.className = 'rounded-xl border border-aura-border shadow-2xl overflow-hidden';
        document.body.appendChild(panel); paintPanel(); btn.setAttribute('aria-expanded', 'true');
    }
    function init() {
        btn = document.querySelector('button[aria-label^="Notifications"]'); if (!btn) return;
        btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
        var dot = btn.querySelector('span'); if (dot) dot.remove();
        badge = document.createElement('span'); badge.style.display = 'none';
        badge.className = 'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold items-center justify-center';
        btn.appendChild(badge); paintBadge();
        btn.onclick = function (e) { e.stopPropagation(); if (panel) close(); else open(); };
        document.addEventListener('mousedown', function (e) { if (panel && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel) { close(); btn.focus(); } });
        var orig = window.showAppToast;
        if (typeof orig === 'function') window.showAppToast = function (m, t) { try { add(m, t); } catch (e) {} return orig.apply(this, arguments); };
        window.addEventListener('storage', paintBadge);
    }
    window.TradelyNotify = { add: add, count: unread };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
