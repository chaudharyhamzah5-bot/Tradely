/* profiles-ui.js - start-up screen, sidebar profile button and the profile pop-up. Uses TradelyProfiles (profiles.js). */
(function () {
    'use strict';
    var TP = window.TradelyProfiles; if (!TP) return;
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    var INPUT = 'w-full bg-aura-bg border border-aura-border rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';
    var BTN = 'px-3 py-2 rounded-md text-xs font-semibold transition', PRIMARY = BTN + ' bg-blue-600 hover:bg-blue-500 text-white', GHOST = BTN + ' border border-aura-border text-gray-300 hover:text-white hover:bg-aura-hover';
    function initial(n) { return esc((String(n || '?').trim().charAt(0) || '?').toUpperCase()); }
    function avatar(n, big) { return '<span class="' + (big ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-xs') + ' rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center shrink-0">' + initial(n) + '</span>'; }

    /* ---------- generic modal ---------- */
    var host = null;
    function closeModal() { if (host) { host.remove(); host = null; } }
    function modal(html, opts) {
        closeModal(); opts = opts || {};
        host = document.createElement('div');
        host.id = 'tp-modal'; host.className = 'fixed inset-0 flex items-center justify-center p-4';
        host.style.cssText = 'z-index:' + (opts.gate ? 10000 : 9000) + ';background:' + (opts.gate ? '#07080c' : 'rgba(0,0,0,.7)') + ';';
        host.innerHTML = '<div role="dialog" aria-modal="true" aria-label="' + esc(opts.label || 'Profile') + '" class="w-full max-w-sm rounded-xl border border-aura-border shadow-2xl p-5 space-y-4" style="background:#14161f;max-height:92vh;overflow:auto">' + html + '</div>';
        if (!opts.gate) host.addEventListener('mousedown', function (e) { if (e.target === host) closeModal(); });
        document.body.appendChild(host);
        var f = host.querySelector('input,button'); if (f) f.focus();
        return host;
    }
    function val(id) { var el = host && host.querySelector('#' + id); return el ? el.value : ''; }
    function showErr(msg) { var e = host && host.querySelector('#tp-err'); if (e) { e.textContent = msg; e.classList.toggle('hidden', !msg); } }
    var ERR = '<div id="tp-err" role="alert" class="hidden text-xs text-aura-red"></div>';
    function field(id, label, ph, type, extra) { return '<label class="block text-[11px] font-semibold text-gray-400">' + label + '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + esc(ph || '') + '" autocomplete="off" ' + (extra || '') + ' class="mt-1 ' + INPUT + '"></label>'; }

    /* ---------- create profile (also first-run welcome) ---------- */
    function createForm(first, canCancel) {
        var h = modal('<div><h2 class="text-base font-bold text-white">' + (first ? 'Welcome to Tradely' : 'New profile') + '</h2><p class="text-xs text-gray-500 mt-1">' + (first ? 'Create your profile. Everything you save stays in this profile.' : 'A new profile starts empty and keeps its own accounts, journal, settings and backups.') + '</p></div>' +
            field('tp-name', 'Name', 'Your name', 'text', 'maxlength="40"') + field('tp-user', 'Username', 'e.g. alex', 'text', 'maxlength="30"') +
            field('tp-pin', 'PIN (optional, 4 to 8 digits)', '', 'password', 'inputmode="numeric" maxlength="8"') + field('tp-pin2', 'Repeat PIN', '', 'password', 'inputmode="numeric" maxlength="8"') + ERR +
            '<div class="flex justify-end gap-2">' + (canCancel ? '<button id="tp-cancel" class="' + GHOST + '">Cancel</button>' : '') + '<button id="tp-ok" class="' + PRIMARY + '">' + (first ? 'Get started' : 'Create profile') + '</button></div>', { gate: first || canCancel === 'gate', label: 'Create profile' });
        function go() {
            if (val('tp-pin') !== val('tp-pin2')) return showErr('The two PINs do not match.');
            var err = TP.create(val('tp-name'), val('tp-user'), val('tp-pin')); if (err) showErr(err);
        }
        h.querySelector('#tp-ok').onclick = go;
        h.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
        var c = h.querySelector('#tp-cancel'); if (c) c.onclick = canCancel === 'gate' ? gate : closeModal;
    }

    /* ---------- PIN prompt / start-up screen ---------- */
    function pinPrompt(p, gateMode) {
        var h = modal('<div class="flex items-center gap-3">' + avatar(p.name, true) + '<div class="min-w-0"><div class="text-sm font-bold text-white truncate">' + esc(p.name) + '</div><div class="text-xs text-gray-500 truncate">@' + esc(p.username) + '</div></div></div>' + field('tp-pin', 'Enter PIN', '', 'password', 'inputmode="numeric" maxlength="8"') + ERR +
            '<div class="flex justify-end gap-2"><button id="tp-cancel" class="' + GHOST + '">Back</button><button id="tp-ok" class="' + PRIMARY + '">Unlock</button></div>', { gate: gateMode, label: 'Enter PIN' });
        function go() { var err = TP.switchTo(p.id, val('tp-pin')); if (err) { showErr(err); h.querySelector('#tp-pin').select(); } }
        h.querySelector('#tp-ok').onclick = go; h.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
        h.querySelector('#tp-cancel').onclick = gateMode ? gate : closeModal;
    }
    function gate() {
        var list = TP.list(); if (!list.length) return createForm(true, false);
        var h = modal('<div><h2 class="text-base font-bold text-white">Who is trading?</h2><p class="text-xs text-gray-500 mt-1">Choose a profile to continue.</p></div><div class="space-y-1.5">' +
            list.map(function (p) { return '<button data-id="' + esc(p.id) + '" class="tp-pick w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-aura-border hover:bg-aura-hover text-left">' + avatar(p.name) + '<span class="min-w-0 flex-1"><span class="block text-xs font-semibold text-white truncate">' + esc(p.name) + '</span><span class="block text-[11px] text-gray-500 truncate">@' + esc(p.username) + '</span></span>' + (p.hasPin ? '<span class="text-[10px] text-gray-500 font-mono">PIN</span>' : '') + '</button>'; }).join('') +
            '</div><button id="tp-new" class="' + GHOST + ' w-full">+ New profile</button>', { gate: true, label: 'Choose profile' });
        [].forEach.call(h.querySelectorAll('.tp-pick'), function (b) { b.onclick = function () { var p = list.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (p.hasPin) pinPrompt(p, true); else TP.switchTo(p.id, ''); }; });
        h.querySelector('#tp-new').onclick = function () { createForm(false, 'gate'); };
    }

    /* ---------- edit / delete ---------- */
    function editForm() {
        var c = TP.current(); if (!c) return;
        var h = modal('<h2 class="text-base font-bold text-white">Edit profile</h2>' + field('tp-name', 'Name', '', 'text', 'maxlength="40"') + field('tp-user', 'Username', '', 'text', 'maxlength="30"') +
            field('tp-pin', c.hasPin ? 'New PIN (leave empty to keep the current one)' : 'Set a PIN (optional, 4 to 8 digits)', '', 'password', 'inputmode="numeric" maxlength="8"') +
            (c.hasPin ? '<label class="flex items-center gap-2 text-xs text-gray-400"><input id="tp-nopin" type="checkbox"> Remove the PIN</label>' : '') + ERR +
            '<div class="flex justify-between gap-2"><button id="tp-del" class="' + BTN + ' border border-aura-red/40 text-aura-red hover:bg-aura-red/10">Delete profile</button><span class="flex gap-2"><button id="tp-cancel" class="' + GHOST + '">Cancel</button><button id="tp-ok" class="' + PRIMARY + '">Save</button></span></div>', { label: 'Edit profile' });
        h.querySelector('#tp-name').value = c.name; h.querySelector('#tp-user').value = c.username;
        h.querySelector('#tp-ok').onclick = function () { var np = h.querySelector('#tp-nopin'); var err = TP.update(c.id, val('tp-name'), val('tp-user'), val('tp-pin'), !!(np && np.checked)); if (err) showErr(err); };
        h.querySelector('#tp-cancel').onclick = closeModal;
        h.querySelector('#tp-del').onclick = function () { confirmDelete(c); };
    }

    /* Delete one profile: typed confirmation + checkbox, then the cloud rows are deleted AND checked before the local data goes. */
    function confirmDelete(c) {
        var DANGER = BTN + ' bg-aura-red/80 hover:bg-aura-red text-white disabled:opacity-40 disabled:cursor-not-allowed';
        modal('<h2 class="text-base font-bold text-aura-red">Delete \"' + esc(c.name) + '\"?</h2>' +
            '<p class="text-xs text-gray-400 leading-relaxed">This permanently deletes every account, trade, journal entry, note, certificate, screenshot and setting of this profile, <b class="text-gray-200">on this device and in your Supabase cloud</b>. Your other devices remove it too. Your other profiles and your login are not touched. This cannot be undone. Export a backup first if you may need it.</p>' +
            '<label class="flex items-start gap-2 text-xs text-gray-300 cursor-pointer"><input id="tp-ack" type="checkbox" class="mt-0.5 accent-red-500"> I understand this is permanent.</label>' +
            field('tp-confirm', 'Type <b class="text-white">DELETE</b> to confirm', 'DELETE') + ERR +
            '<div class="flex justify-end gap-2"><button id="tp-cancel" class="' + GHOST + '">Cancel</button><button id="tp-force" class="' + GHOST + ' hidden">Delete here anyway</button><button id="tp-ok" class="' + DANGER + '" disabled>Delete forever</button></div>', { label: 'Confirm delete' });
        var ok = host.querySelector('#tp-ok'), ack = host.querySelector('#tp-ack'), typed = host.querySelector('#tp-confirm'), force = host.querySelector('#tp-force'), busy = false;
        function ready() { ok.disabled = busy || !(ack.checked && typed.value.trim() === 'DELETE'); }
        ack.onchange = typed.oninput = ready;
        host.querySelector('#tp-cancel').onclick = function () { if (!busy) closeModal(); };
        force.onclick = function () { TP.remove(c.id); };      // sync.js queues the cloud delete and retries it until it worked
        ok.onclick = function () {
            if (val('tp-confirm').trim() !== 'DELETE') return showErr('Type DELETE to confirm.');
            var S = window.TradelySync, cloud = S && S.account && S.account() && S.purgeProfile ? S.purgeProfile : null;
            if (!cloud) return TP.remove(c.id);                // no cloud account on this device: local delete only
            busy = true; ready(); force.classList.add('hidden'); showErr('');
            var e0 = host.querySelector('#tp-err'); e0.classList.remove('hidden', 'text-aura-red'); e0.classList.add('text-gray-400'); e0.textContent = 'Deleting from the cloud\u2026';
            cloud(c.id).then(function () { TP.remove(c.id); }, function (e) {
                busy = false; ready(); e0.classList.add('text-aura-red'); e0.classList.remove('text-gray-400');
                var off = e && (e.name === 'TypeError' || /Failed to fetch|network/i.test(String(e.message)));
                e0.textContent = (off ? 'You are offline, so the cloud copy could not be deleted. ' : 'The cloud copy could not be fully deleted (' + (e && e.message || e) + '). ') + 'Try again, or delete here now and the cloud copy is removed automatically as soon as it can.';
                force.classList.remove('hidden');
            });
        };
    }

    /* ---------- sidebar button + drop-up ---------- */
    var menu = null;
    function closeMenu() { if (menu) { menu.remove(); menu = null; } }
    function openMenu(btn) {
        if (menu) return closeMenu();
        var c = TP.current(), others = TP.list().filter(function (p) { return !c || p.id !== c.id; });
        menu = document.createElement('div'); menu.setAttribute('role', 'menu');
        var r = btn.getBoundingClientRect();
        menu.style.cssText = 'position:fixed;z-index:8000;left:' + Math.max(8, r.left) + 'px;bottom:' + Math.max(8, Math.min(window.innerHeight - 120, window.innerHeight - r.top + 8)) + 'px;width:' + Math.max(250, Math.min(300, r.width + 40)) + 'px;background:#14161f;max-height:70vh;overflow:auto';
        menu.className = 'rounded-xl border border-aura-border shadow-2xl p-3 space-y-3';
        menu.innerHTML = '<div class="flex items-center gap-3">' + avatar(c && c.name, true) + '<div class="min-w-0"><div class="text-sm font-bold text-white truncate">' + esc(c && c.name) + '</div><div class="text-xs text-gray-500 truncate">@' + esc(c && c.username) + '</div><div class="text-[10px] mt-0.5 ' + (c && c.hasPin ? 'text-aura-green' : 'text-gray-500') + '">' + (c && c.hasPin ? 'PIN protected' : 'No PIN') + '</div></div></div>' +
            (others.length ? '<div class="border-t border-aura-border pt-2"><div class="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Switch profile</div>' + others.map(function (p) { return '<button role="menuitem" data-id="' + esc(p.id) + '" class="tp-sw w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-aura-hover text-left">' + avatar(p.name) + '<span class="min-w-0 flex-1"><span class="block text-xs text-white truncate">' + esc(p.name) + '</span><span class="block text-[10px] text-gray-500 truncate">@' + esc(p.username) + '</span></span>' + (p.hasPin ? '<span class="text-[10px] text-gray-500">PIN</span>' : '') + '</button>'; }).join('') + '</div>' : '') +
            '<div class="border-t border-aura-border pt-2 grid grid-cols-2 gap-2"><button role="menuitem" id="tp-add" class="' + GHOST + '">+ Add profile</button><button role="menuitem" id="tp-edit" class="' + GHOST + '">Edit</button>' + (c && c.hasPin ? '<button role="menuitem" id="tp-lock" class="' + GHOST + ' col-span-2">Lock now</button>' : '') + '</div>';
        if (window.innerWidth < 768) { menu.style.left = '10px'; menu.style.right = '10px'; menu.style.width = 'auto'; menu.style.bottom = 'calc(64px + env(safe-area-inset-bottom))'; }
        document.body.appendChild(menu);
        [].forEach.call(menu.querySelectorAll('.tp-sw'), function (b) { b.onclick = function () { var id = b.getAttribute('data-id'), p = others.filter(function (x) { return x.id === id; })[0]; closeMenu(); if (p.hasPin) pinPrompt(p, false); else TP.switchTo(id, ''); }; });
        menu.querySelector('#tp-add').onclick = function () { closeMenu(); createForm(false, true); };
        menu.querySelector('#tp-edit').onclick = function () { closeMenu(); editForm(); };
        var lk = menu.querySelector('#tp-lock'); if (lk) lk.onclick = function () { TP.lock(); };
    }
    document.addEventListener('mousedown', function (e) { if (menu && !menu.contains(e.target) && !e.target.closest('#profile-btn')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); if (host && !host.style.background.startsWith('rgb(7')) closeModal(); } });

    function mountFooter() {
        var img = document.querySelector('aside img[alt="Avatar"]'), foot = img && img.closest('.p-3');
        if (!foot) { foot = document.querySelector('aside .p-3.border-t'); }
        if (!foot) return;
        var c = TP.current();
        foot.innerHTML = '<button id="profile-btn" type="button" aria-haspopup="menu" aria-label="Profile menu" class="w-full flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-aura-hover transition text-left">' + avatar(c && c.name) +
            '<span class="overflow-hidden brand-text min-w-0 flex-1"><span class="block text-xs font-semibold text-white truncate">' + esc(c ? c.name : 'Profile') + '</span><span class="block text-[10px] text-gray-500 truncate">@' + esc(c ? c.username : '') + (c && c.hasPin ? ' · PIN' : '') + '</span></span><span class="brand-text text-gray-500 text-xs">&#9650;</span></button>';
        foot.querySelector('#profile-btn').onclick = function (e) { e.stopPropagation(); openMenu(this); };
    }
    function boot() { if (!TP.isUnlocked()) gate(); else mountFooter(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
