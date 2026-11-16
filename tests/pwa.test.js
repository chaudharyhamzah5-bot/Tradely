/* Installable web app: manifest, icons, service worker, HTML wiring. */
const fs = require('fs'), path = require('path');
const { ok, summary } = require('./harness');
const APP = path.join(__dirname, '..', 'app'), rd = f => fs.readFileSync(path.join(APP, f), 'utf8');
const man = JSON.parse(rd('manifest.webmanifest'));
ok(man.display === 'standalone' && man.start_url && man.name && man.short_name, 'manifest has name, start_url and standalone display');
ok(man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512') && man.icons.some(i => i.purpose === 'maskable'), 'manifest has 192, 512 and maskable icons');
ok(man.icons.every(i => fs.existsSync(path.join(APP, i.src))), 'every icon file exists');
ok(fs.existsSync(path.join(APP, man.start_url)), 'start_url exists');
const sw = rd('sw.js'), shell = (/const SHELL = \[([\s\S]*?)\];/.exec(sw) || [, ''])[1].match(/'([^']+)'/g).map(x => x.slice(1, -1));
ok(shell.length > 20 && shell.filter(f => f !== './').every(f => fs.existsSync(path.join(APP, f))), 'every file the service worker pre-caches exists (' + shell.length + ' files)');
ok(/supabase/.test(sw) && /method !== 'GET'/.test(sw), 'service worker never touches Supabase or non-GET requests');
const html = rd('tradely.html');
ok(/rel="manifest"/.test(html) && /js\/pwa\.js/.test(html) && /apple-touch-icon/.test(html) && /theme-color/.test(html), 'tradely.html links manifest, pwa.js, theme color and iOS icon');
ok(fs.existsSync(path.join(APP, 'index.html')), 'index.html opens the app at the site root');
summary();
