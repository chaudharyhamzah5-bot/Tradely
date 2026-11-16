/* a11y.js - keyboard and screen-reader support shared by all pages.
   1) names icon-only buttons and images that have no accessible name (also for dynamically built UI)
   2) modal focus trap: Tab stays inside the open dialog, Esc closes it, focus returns afterwards */
(function () {
    'use strict';
    var ICONS = { 'chevron-left': 'Previous', 'chevron-right': 'Next', 'chevron-down': 'Toggle menu', 'x': 'Close', 'trash-2': 'Delete', 'trash': 'Delete', 'plus': 'Add', 'pencil': 'Edit', 'edit-2': 'Edit', 'edit-3': 'Edit', 'copy': 'Copy', 'download': 'Download', 'upload': 'Upload', 'settings': 'Settings', 'refresh-cw': 'Refresh', 'search': 'Search', 'eye': 'View', 'external-link': 'Open in new tab', 'more-horizontal': 'More options', 'more-vertical': 'More options', 'calculator': 'Calculator', 'menu': 'Menu', 'minus': 'Decrease', 'bell': 'Notifications', 'check': 'Confirm', 'arrow-left': 'Back', 'arrow-right': 'Next', 'star': 'Favourite', 'image': 'Image', 'save': 'Save', 'filter': 'Filter', 'info': 'Information', 'maximize-2': 'Expand', 'minimize-2': 'Collapse', 'rotate-ccw': 'Reset', 'play': 'Play', 'pause': 'Pause' };
    function humanize(s) { s = String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
    function hasText(el) { return (el.textContent || '').replace(/\s+/g, '').length > 0; }
    function nameControl(el) {
        if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || hasText(el)) return;
        var label = el.getAttribute('title') || el.getAttribute('data-tip') || '';
        if (!label) { var ic = el.querySelector('[data-lucide]'); if (ic) { var n = ic.getAttribute('data-lucide'); label = ICONS[n] || humanize(n); } }
        if (!label) { var oc = (el.getAttribute('onclick') || '').match(/([A-Za-z_]\w*)\s*\(/); if (oc && oc[1] !== 'if') label = humanize(oc[1]); }
        if (label) el.setAttribute('aria-label', label);
    }
    function nameImages(root) {
        var imgs = root.querySelectorAll ? root.querySelectorAll('img:not([alt])') : [];
        for (var i = 0; i < imgs.length; i++) imgs[i].setAttribute('alt', imgs[i].getAttribute('title') || 'Image');
    }
    function scan(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.matches && root.matches('button,[role="button"]')) nameControl(root);
        var els = root.querySelectorAll ? root.querySelectorAll('button,[role="button"]') : [];
        for (var i = 0; i < els.length; i++) nameControl(els[i]);
        if (root.tagName === 'IMG' && !root.hasAttribute('alt')) root.setAttribute('alt', 'Image');
        nameImages(root);
    }
    /* ---------- modal focus trap ---------- */
    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
    function topModal() {
        var best = null, bz = -1, nodes = document.querySelectorAll('[role="dialog"],[aria-modal="true"],.modal-overlay,.fixed.inset-0');
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n.id === 'calc-win' || !visible(n)) continue;
            var cs = getComputedStyle(n);
            if (cs.position !== 'fixed' && !n.matches('[role="dialog"]')) continue;
            var host = n; while (host.parentElement && !(getComputedStyle(host).position === 'fixed')) host = host.parentElement;
            if (!visible(host) || host === document.documentElement || host === document.body) continue;
            var hs = getComputedStyle(host);
            if (hs.position !== 'fixed') continue;
            if (host.matches('aside,nav,header') || host.querySelector(':scope > aside')) continue;
            var cover = host.offsetWidth >= window.innerWidth * 0.5 && host.offsetHeight >= window.innerHeight * 0.4;
            if (!cover) continue;
            var z = parseInt(hs.zIndex, 10) || 0;
            if (z >= bz) { bz = z; best = host; }
        }
        return best;
    }
    var lastFocus = null, activeModal = null;
    function syncModal() {
        var m = topModal();
        if (m && m !== activeModal) {
            if (!activeModal) lastFocus = document.activeElement;
            activeModal = m;
            if (!m.contains(document.activeElement)) {
                var f = Array.prototype.filter.call(m.querySelectorAll(FOCUSABLE), visible)[0];
                if (f) f.focus({ preventScroll: true }); else { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
            }
        } else if (!m && activeModal) {
            activeModal = null;
            if (lastFocus && document.contains(lastFocus) && visible(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
            lastFocus = null;
        }
    }
    document.addEventListener('keydown', function (e) {
        if (!activeModal) return;
        if (e.key === 'Escape' && !e.defaultPrevented) {
            var c = activeModal.querySelector('[aria-label^="Close"],[aria-label="Cancel"],button[onclick*="lose"],button[onclick*="Close"]');
            if (c && visible(c)) { e.preventDefault(); c.click(); }
            return;
        }
        if (e.key !== 'Tab') return;
        var items = Array.prototype.filter.call(activeModal.querySelectorAll(FOCUSABLE), visible);
        if (!items.length) { e.preventDefault(); return; }
        var first = items[0], last = items[items.length - 1], a = document.activeElement;
        if (!activeModal.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    }, true);
    var pending = false;
    function schedule(nodes) {
        if (nodes) nodes.forEach(scan);
        if (pending) return; pending = true;
        setTimeout(function () { pending = false; syncModal(); }, 60);
    }
    function init() {
        scan(document.body); syncModal();
        new MutationObserver(function (muts) {
            var added = [];
            muts.forEach(function (m) { if (m.type === 'childList') m.addedNodes.forEach(function (n) { if (n.nodeType === 1) added.push(n); }); });
            schedule(added);
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.TradelyA11y = { scan: scan };
})();
