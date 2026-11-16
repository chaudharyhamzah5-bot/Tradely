/* sw.js - makes Tradely installable and usable offline.
   - App files (same origin): network first (always fresh when online, so every file is from the same version),
     falling back to the cached copy when offline. Everything is also pre-cached on install.
   - CDN files (Tailwind, Google Fonts): cached after the first load.
   - Supabase and every non-GET request are NEVER touched: sync always goes straight to the network. */
const CACHE = 'tradely-pwa-v1';
const SHELL = [
  './', 'tradely.html', 'manifest.webmanifest',
  'css/tradely.css', 'css/calculator.css', 'css/mobile.css', 'css/settings.css',
  'vendor/chart.umd.js', 'vendor/lucide.min.js',
  'js/profiles.js', 'js/supabase-config.js', 'js/cloud-sql.js', 'js/supabase-sync.js', 'js/shared.js', 'js/a11y.js',
  'js/profiles-ui.js', 'js/settings-data.js', 'js/settings-ai.js', 'js/notifications.js', 'js/mobile-nav.js', 'js/pwa.js',
  'js/tradely-accounts.js', 'js/tradely-binary.js', 'js/tradely-workspace.js', 'js/tradely-journal.js', 'js/tradely-monthly.js',
  'js/tradely-rules.js', 'js/tradely-payout.js', 'js/tradely-ai.js', 'js/calculator.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
const CDN = [/^https:\/\/cdn\.tailwindcss\.com\//, /^https:\/\/fonts\.googleapis\.com\//, /^https:\/\/fonts\.gstatic\.com\//];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function networkFirst(req, ms) {
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('tradely.html'));
    const timer = ms ? setTimeout(() => { fallback().then((r) => { if (r && !done) { done = true; resolve(r); } }); }, ms) : 0;
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(timer); if (!done) { done = true; fallback().then((r) => resolve(r || Response.error())); } });
  });
}
function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.supabase\.(co|in)$/i.test(url.hostname)) return;          // sync traffic: never cached
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    e.respondWith(networkFirst(req, req.mode === 'navigate' ? 4000 : 6000));
    return;
  }
  if (CDN.some((rx) => rx.test(req.url))) e.respondWith(cacheFirst(req));
});
