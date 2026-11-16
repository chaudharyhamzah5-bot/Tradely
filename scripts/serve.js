/* Tiny static server for trying the web/PWA version locally:  npm run web   ->  http://localhost:8080
   (localhost counts as a secure context, so the service worker and "Install app" work here.)
   For phones and other devices, deploy the app/ folder to any HTTPS static host (see README). */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'app'), PORT = +process.env.PORT || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => {
        if (e) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': /sw\.js$/.test(f) ? 'no-cache' : 'no-cache' });
        res.end(b);
    });
}).listen(PORT, () => console.log('Tradely web app: http://localhost:' + PORT));
