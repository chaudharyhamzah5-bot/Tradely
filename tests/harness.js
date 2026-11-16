const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
function freshFDB() { Object.keys(require.cache).forEach(k => { if (k.includes('fake-indexeddb')) delete require.cache[k]; }); return require('fake-indexeddb'); }
const APP = process.env.APP_JS || path.join(__dirname, '..', 'app', 'js');
const src = f => fs.readFileSync(path.join(APP, f), 'utf8');

/* ---------- fake Supabase (auth + PostgREST subset used by the app) ---------- */
function makeServer() {
    const users = {}, rows = new Map(); let tick = Date.now(); const log = [];
    const keyOf = r => [r.user_id, r.ns, r.key, r.part].join('\u0001');
    function uidFrom(h) { const a = (h && (h.Authorization || h.authorization)) || ''; const m = /^Bearer tok:(.+)$/.exec(a); return m ? m[1] : null; }
    function authOk(email, o) { const uid = users[email].id; return { access_token: 'tok:' + uid, refresh_token: 'ref:' + uid, expires_in: 3600, user: { id: uid, email, user_metadata: { name: users[email].name || '' } } }; }
    const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => typeof body === 'string' ? body : JSON.stringify(body) });
    function parseIn(v) { const m = /^in\.\((.*)\)$/.exec(v); return m[1].split(',').map(x => x.replace(/^"|"$/g, '')); }
    function match(r, q) {
        for (const [k, v] of q) {
            if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
            let val = r[k];
            if (v.startsWith('eq.')) { if (String(val) !== v.slice(3)) return false; }
            else if (v.startsWith('gte.')) { if (!(val >= +v.slice(4))) return false; }
            else if (v.startsWith('gt.')) { if (!(val > v.slice(3))) return false; }
            else if (v.startsWith('in.(')) { if (!parseIn(v).includes(String(val))) return false; }
            else throw new Error('fake server: unsupported filter ' + k + '=' + v);
        }
        return true;
    }
    async function fetch(url, opt = {}) {
        const u = new URL(url), method = opt.method || 'GET', body = opt.body ? JSON.parse(opt.body) : null;
        log.push(method + ' ' + u.pathname + u.search.slice(0, 120));
        if (server.offline) throw new TypeError('Failed to fetch');
        const apikey = opt.headers && (opt.headers.apikey || opt.headers.Apikey);
        if (apikey !== server.anonKey) return res(401, { message: 'Invalid API key' });
        if (u.pathname === '/auth/v1/signup' || u.pathname === '/auth/v1/token') {
            const em = body.email;
            if (u.pathname.endsWith('signup')) {
                if (users[em]) return res(400, { msg: 'User already registered' });
                users[em] = { id: 'user-' + (++server.seq), pw: body.password, name: body.data && body.data.name, confirmed: !server.requireConfirm };
                return res(200, server.noToken || server.requireConfirm ? { id: users[em].id, email: em } : authOk(em));
            }
            if (u.searchParams.get('grant_type') === 'refresh_token') {      // 'ref:<uid>' tokens belong to one user; anything else keeps the old behaviour (first user)
                const rt = String((body && body.refresh_token) || ''), uid = rt.indexOf('ref:') === 0 ? rt.slice(4) : null;
                const em = uid ? Object.keys(users).find(e => users[e].id === uid) : Object.keys(users)[0];
                if (!em) return res(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' });
                return res(200, authOk(em));
            }
            if (!users[em] || users[em].pw !== body.password) return res(400, { error_description: 'Invalid login credentials' });
            if (!users[em].confirmed) return res(400, { error_description: 'Email not confirmed' });
            return res(200, authOk(em));
        }
        if (u.pathname === '/auth/v1/logout') return res(204, '');
        const uid = uidFrom(opt.headers);
        if (!uid) {                                           // anon (no login): only the project check is answered
            if (u.pathname === '/rest/v1/app_data' && method === 'GET') return server.sqlRan ? res(200, []) : res(404, { code: 'PGRST205', message: 'Could not find the table public.app_data in the schema cache' });
            return res(401, 'no auth');
        }
        if (u.pathname === '/rest/v1/rpc/delete_my_account') {
            if (server.noDeleteFn) return res(404, { code: 'PGRST202', message: 'Could not find the function public.delete_my_account' });
            [...rows.values()].filter(r => r.user_id === uid).forEach(r => rows.delete(keyOf(r)));
            Object.keys(users).forEach(e => { if (users[e].id === uid) delete users[e]; });
            return res(204, '');
        }
        if (u.pathname !== '/rest/v1/app_data') return res(404, 'nope');
        const q = [...u.searchParams.entries()];
        if (method === 'POST') {
            for (const r of body) { if (r.user_id !== uid) return res(403, 'RLS'); const k = keyOf(r); rows.set(k, Object.assign({}, rows.get(k) || {}, r, { updated_at: new Date(++tick).toISOString() })); }
            return res(201, '');
        }
        let mine = [...rows.values()].filter(r => r.user_id === uid && match(r, q));
        if (method === 'DELETE') { mine.forEach(r => rows.delete(keyOf(r))); return res(204, ''); }
        const ord = (u.searchParams.get('order') || '').split(',').filter(Boolean).map(x => x.split('.'));
        mine.sort((a, b) => { for (const [f, d] of ord) { if (a[f] < b[f]) return d === 'desc' ? 1 : -1; if (a[f] > b[f]) return d === 'desc' ? -1 : 1; } return 0; });
        const off = +(u.searchParams.get('offset') || 0), lim = +(u.searchParams.get('limit') || 1000);
        return res(200, mine.slice(off, off + lim).map(r => Object.assign({}, r)));
    }
    const server = { fetch, rows, users, log, offline: false, sqlRan: true, anonKey: 'test-anon-key-0123456789abcdef', seq: 0, requireConfirm: false, noToken: false, noDeleteFn: false,
        list: (ns) => [...rows.values()].filter(r => (!ns || r.ns === ns)).map(r => ({ ns: r.ns, key: r.key, part: r.part, deleted: r.deleted, value: r.value })) };
    return server;
}

/* ---------- a "device" = one browser profile (its own localStorage + IndexedDB) ---------- */
function makeDevice(server, persisted, opts) {
    opts = opts || {};
    const FDB = freshFDB(); const state = persisted || { ls: {}, ss: {}, dbs: new Map() };
    const factory = new FDB.IDBFactory(); factory._databases = state.dbs;
    let reloads = 0;
    const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (/navigation/i.test(e.message)) reloads++; else console.log('jsdomError', e.message); });
    const dom = new JSDOM('<!doctype html><body><div id="calc-toggle"></div></body>', { url: 'http://localhost/app/tradely.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
    const w = dom.window;
    Object.keys(state.ls).forEach(k => w.localStorage.setItem(k, state.ls[k]));
    Object.keys(state.ss).forEach(k => w.sessionStorage.setItem(k, state.ss[k]));
    const SP = w.Storage.prototype, rawKey = SP.key, rawGet = SP.getItem, lenD = Object.getOwnPropertyDescriptor(SP, 'length');
    ['IDBFactory', 'IDBObjectStore', 'IDBDatabase', 'IDBTransaction', 'IDBRequest', 'IDBKeyRange', 'IDBCursor', 'IDBOpenDBRequest'].forEach(n => { w[n] = FDB[n]; });
    Object.defineProperty(w, 'indexedDB', { value: factory, configurable: true });
    w.fetch = server.byHost ? (u, o) => server.byHost[new URL(u).host].fetch(u, o) : server.fetch; w.confirm = () => true;   // server.byHost = several Supabase projects, routed by host
    w.prompt = () => null;
    w.eval(src('profiles.js'));
    w.eval(src('cloud-sql.js'));
    w.TRADELY_SUPABASE = Object.assign(opts.noCfg ? {} : { url: 'https://abc.supabase.co', anonKey: 'test-anon-key-0123456789abcdef' }, { pages: ['overview', 'accounts', 'journal', 'notes', 'certificates', 'monthly', 'strategies', 'psychology', 'settings', 'apikeys'] });
    w.eval(src('supabase-sync.js'));
    const dev = {
        w, state, get reloads() { return reloads; },
        dump() { const o = {}, n = lenD.get.call(w.localStorage); for (let i = 0; i < n; i++) { const k = rawKey.call(w.localStorage, i); o[k] = rawGet.call(w.localStorage, k); } return o; },
        rawKeys() { return Object.keys(dev.dump()); },
        save() { state.ls = dev.dump(); state.ss = {}; try { const n = w.sessionStorage.length; for (let i = 0; i < n; i++) { const k = w.sessionStorage.key(i); state.ss[k] = w.sessionStorage.getItem(k); } } catch (e) {} return state; },
        reload() { try { w.dispatchEvent(new w.Event('beforeunload')); } catch (e) {} dev.save(); w.close(); return makeDevice(server, state, opts); },
        async signIn(email, pw, kind, name) {       // drives the Login / Create account screens
            const d = w.document; if (!d.querySelector('#tg-go') && !d.querySelector('#tg-login')) return;
            if (d.querySelector('#tg-login')) d.querySelector('#tg-login').click();
            if (kind === 'up') {
                d.querySelector('#tg-tosign').click();
                d.querySelector('#tg-name').value = name || 'Test User';
            }
            d.querySelector('#tg-email').value = email; d.querySelector('#tg-pass').value = pw; d.querySelector('#tg-go').click();
            await dev.idle();
        },
        async idle(ms) { const end = Date.now() + (ms || 8000); await sleep(60); while (Date.now() < end) { const s = w.TradelySync.status().k; const ov = w.document.getElementById('ts-overlay'); if ((s === 'ok') && !ov) break; await sleep(40); } await sleep(40); },
        async sync() { await w.TradelySync.syncNow(); await sleep(50); await w.TradelySync.syncNow(); await sleep(50); },
        profile: () => w.TradelyProfiles.current(),
        ids: () => w.TradelyProfiles.list().map(p => p.id),
        idbPut(key, val) { return new Promise((res, rej) => { const r = w.indexedDB.open('tradely_db', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => { r.result.close(); res(); }; }; r.onerror = () => rej(r.error); }); },
        idbClear() { return new Promise((res, rej) => { const r = w.indexedDB.open('tradely_db', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = () => { r.result.close(); res(); }; }; }); },
        idbAll() { return new Promise((res) => { const r = w.indexedDB.open('tradely_db', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv'), g = tx.objectStore('kv').getAllKeys(); tx.oncomplete = () => { r.result.close(); res(g.result); }; }; }); }
    };
    return dev;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg) { if (c) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } }
module.exports = { makeServer, makeDevice, sleep, ok, summary: () => { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); } };
