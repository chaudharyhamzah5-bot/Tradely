/* pwa.js - registers the service worker and offers "Install app" on phone and desktop.
   Only runs on http(s) (not inside the Electron app, which loads files directly). */
(function () {
    'use strict';
    var isWeb = /^https?:$/.test(location.protocol);
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay)').matches) || window.navigator.standalone === true;
    var ua = navigator.userAgent || '';
    var ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var deferred = null, KEY = 'tradely_sync_pwa_dismissed';   // 'tradely_sync_' prefix: device-only, never moved into a profile or synced
    function get(k) { try { return window.TradelyProfiles && TradelyProfiles.raw ? TradelyProfiles.raw.get(k) : localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { if (window.TradelyProfiles && TradelyProfiles.raw) TradelyProfiles.raw.set(k, v); else localStorage.setItem(k, v); } catch (e) {} }

    function install() {
        if (!deferred) return Promise.resolve('unavailable');
        var d = deferred; deferred = null; d.prompt();
        return d.userChoice.then(function (c) { hideBanner(); changed(); return c && c.outcome; });
    }
    function changed() { try { window.dispatchEvent(new Event('tradely:pwa-changed')); } catch (e) {} }
    var banner = null;
    function hideBanner() { if (banner) { banner.remove(); banner = null; } }
    function showBanner() {
        if (banner || standalone || get(KEY) === '1' || !document.body) return;
        banner = document.createElement('div'); banner.id = 'pwa-banner'; banner.setAttribute('role', 'status');
        banner.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(70px + env(safe-area-inset-bottom));z-index:9400;max-width:94vw;background:#11131a;border:1px solid #1f2430;color:#e5e7eb;font:600 12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.5);display:flex;gap:10px;align-items:center';
        banner.innerHTML = '<span>Install Tradely on this device</span><button id="pwa-yes" style="background:#2563eb;color:#fff;border-radius:6px;padding:5px 12px;font-weight:700">Install</button><button id="pwa-no" aria-label="Not now" style="color:#9ca3af">\u2715</button>';
        document.body.appendChild(banner);
        banner.querySelector('#pwa-yes').onclick = install;
        banner.querySelector('#pwa-no').onclick = function () { set(KEY, '1'); hideBanner(); };
    }
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; changed(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner); else showBanner(); });
    window.addEventListener('appinstalled', function () { deferred = null; standalone = true; hideBanner(); changed(); });

    window.TradelyPWA = {
        supported: isWeb && 'serviceWorker' in navigator,
        installed: function () { return standalone; },
        canInstall: function () { return !!deferred; },
        ios: ios,
        install: install,
        howTo: function () {
            if (standalone) return 'Tradely is installed on this device.';
            if (!isWeb) return 'This is the desktop (Electron) app already. The web version installs from a browser.';
            if (ios) return 'On iPhone/iPad: open this page in Safari, tap Share, then \u201cAdd to Home Screen\u201d.';
            if (deferred) return 'Press Install to add Tradely to this device.';
            return 'In Chrome or Edge open the browser menu and choose \u201cInstall Tradely\u201d (or the install icon in the address bar). On Android: menu \u2192 Install app.';
        }
    };
    if (isWeb && 'serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
