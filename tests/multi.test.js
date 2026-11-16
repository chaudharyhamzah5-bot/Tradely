/* Several Supabase projects in one app: nickname, save on log out, switch, add another account, expired saved login. */
const { makeServer, makeDevice, sleep, ok, summary } = require('./harness');
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await fn()) return true; } catch (e) {} await sleep(50); } return false; };
const SAVED = 'tradely_sync_saved_v1', CFG = 'tradely_sync_cfg_v1', WIPE = 'tradely_sync_wipe_v1';
const URL_A = 'https://abc.supabase.co', URL_B = 'https://xyz.supabase.co', KEY = 'test-anon-key-0123456789abcdef';
const type = (w, el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
const reg = D => { try { return JSON.parse(D.dump()[SAVED] || '{}'); } catch (e) { return {}; } };

/* log out / switch end with a wipe: first reload runs the wipe, the second is the clean start */
async function restart(D) { let X = D.reload(); await until(() => !X.dump()[WIPE]); X = X.reload(); await sleep(150); return X; }

(async () => {
    const A = makeServer(), B = makeServer(); const net = { byHost: { 'abc.supabase.co': A, 'xyz.supabase.co': B } };

    console.log('1. Project A: sign up Ali, nickname + email are shown');
    let D = makeDevice(net, null); await sleep(100);
    await D.signIn('ali@x.com', 'secret1', 'up', 'Ali');
    D.w.TradelyProfiles.create('Ali', 'ali', ''); D = D.reload(); await D.idle();
    D.w.localStorage.setItem('tradely_notes', JSON.stringify([{ id: 'n1', text: 'ali note' }])); await D.sync();
    let a = D.w.TradelySync.account();
    ok(a && a.email === 'ali@x.com' && a.display === 'Ali' && !a.saved, 'email known, display name falls back to the name, not saved yet');
    D.w.TradelySync.nickname(); let d = D.w.document;
    type(D.w, d.querySelector('#pp-nick'), 'Work'); d.querySelector('#pp-yes').click();
    a = D.w.TradelySync.account();
    ok(a.saved && a.nickname === 'Work' && a.display === 'Work', 'nickname "Work" saves the account');
    ok(D.w.TradelySync.saved().length === 1 && D.w.TradelySync.saved()[0].email === 'ali@x.com', 'saved list shows nickname + email');
    ok(!/pass/i.test(D.dump()[SAVED]) && /ref:/.test(D.dump()[SAVED]), 'only a refresh token is stored, never the password');

    console.log('2. Add another account (project B): the current one stays saved');
    D.w.TradelySync.addAccount(); d = D.w.document; d.querySelector('#pp-yes').click();
    ok(await until(() => D.dump()[WIPE]), 'device wipe requested');
    D = await restart(D); d = D.w.document;
    ok(!!d.querySelector('#tg-fresh') && !!d.querySelector('#tg-login'), 'Fresh start / Login screen opens');
    ok(!D.rawKeys().some(k => k.startsWith('tp:')) && !!D.dump()[SAVED], 'Ali\'s data left this device, the saved list stayed');
    ok(!!Array.from(d.querySelectorAll('button')).find(b => /saved accounts/i.test(b.textContent)), 'there is a way back to the saved accounts');
    d.querySelector('#tg-login').click(); type(D.w, d.querySelector('#tg-url'), 'xyz.supabase.co'); type(D.w, d.querySelector('#tg-key'), KEY);
    d.querySelector('#tg-tosign').click(); d.querySelector('#tg-name').value = 'Bob'; d.querySelector('#tg-email').value = 'bob@y.com'; d.querySelector('#tg-pass').value = 'bobpass1'; d.querySelector('#tg-go').click();
    await D.idle();
    ok(D.w.TradelySync.account() && D.w.TradelySync.account().email === 'bob@y.com', 'Bob is signed in on project B');
    ok(Object.keys(B.users).length === 1 && Object.keys(A.users).length === 1, 'each project has its own user');
    D.w.TradelyProfiles.create('Bob', 'bob', ''); D = D.reload(); await D.idle();
    D.w.localStorage.setItem('tradely_notes', JSON.stringify([{ id: 'n1', text: 'bob note' }])); await D.sync();
    D.w.TradelySync.nickname(); d = D.w.document; type(D.w, d.querySelector('#pp-nick'), 'Personal'); d.querySelector('#pp-yes').click();
    const names = D.w.TradelySync.saved().map(x => x.nickname + ':' + x.host + ':' + x.current).sort();
    ok(names.length === 2 && names[0] === 'Personal:xyz.supabase.co:true' && names[1] === 'Work:abc.supabase.co:false', 'two saved accounts, two projects, Bob is current');

    console.log('3. Switch from Settings to Ali (project A), no password');
    const aliId = D.w.TradelySync.saved().find(x => x.nickname === 'Work').id;
    D.w.TradelySync.switchTo(aliId); d = D.w.document; d.querySelector('#pp-yes').click();
    ok(await until(() => D.dump()[WIPE]), 'switch wipes the device');
    ok(JSON.parse(D.dump()[CFG]).url === URL_A && reg(D).next === aliId, 'project A is selected and Ali is queued');
    D = await restart(D); await D.idle(); await D.sync();
    a = D.w.TradelySync.account();
    ok(a && a.email === 'ali@x.com' && a.nickname === 'Work', 'Ali is signed in automatically');
    ok(D.rawKeys().some(k => /tradely_notes$/.test(k)) && Object.values(D.dump()).some(v => /ali note/.test(v)), 'Ali\'s data came down from project A');
    ok(!Object.values(D.dump()).some(v => /bob note/.test(v)), 'Bob\'s data is not on this device');
    ok(B.list().some(r => /bob note/.test(r.value || '')), 'Bob\'s data is safe in project B');

    console.log('4. Log out with "Save & log out", then pick the account from the list');
    const logoutsBefore = A.log.filter(l => /auth\/v1\/logout/.test(l)).length;
    D.w.TradelySync.signOut(); d = D.w.document;
    ok(!!d.querySelector('#pp-nick') && !!d.querySelector('#pp-save') && !!d.querySelector('#pp-yes'), 'log out offers: save, or log out without saving');
    type(D.w, d.querySelector('#pp-nick'), 'Work account'); d.querySelector('#pp-save').click();
    ok(await until(() => D.dump()[WIPE]), 'logged out');
    ok(A.log.filter(l => /auth\/v1\/logout/.test(l)).length === logoutsBefore, 'saved account is not logged out on the server (its saved login keeps working)');
    D = await restart(D); d = D.w.document;
    const rows = d.querySelectorAll('button[data-id]');
    ok(rows.length === 2 && /Work account/.test(d.getElementById('ts-overlay').textContent) && /bob@y\.com/.test(d.getElementById('ts-overlay').textContent), 'gate lists the saved accounts with nickname and email');
    const bobRow = Array.from(rows).find(b => /Personal/.test(b.textContent)); bobRow.click(); await D.idle();
    ok(D.w.TradelySync.account() && D.w.TradelySync.account().email === 'bob@y.com', 'tapping a saved account logs in, no password');

    console.log('5. Expired saved login: asks for the password, project + email prefilled');
    D.w.TradelySync.signOut(); d = D.w.document; d.querySelector('#pp-save').click(); await until(() => D.dump()[WIPE]);
    delete B.users['bob@y.com'];                                  // saved token no longer valid
    D = await restart(D); d = D.w.document;
    Array.from(d.querySelectorAll('button[data-id]')).find(b => /Personal/.test(b.textContent)).click();
    ok(await until(() => d.querySelector('#tg-go') && d.querySelector('#tg-email')), 'falls back to the Login screen');
    ok(d.querySelector('#tg-email').value === 'bob@y.com' && /expired/i.test(d.querySelector('#tg-err').textContent), 'email prefilled and the message says the saved login expired');

    console.log('6. Log out without saving forgets the account; remove from the list');
    d.querySelector('#tg-back').click(); d.querySelector('#tg-login').click();
    type(D.w, d.querySelector('#tg-url'), URL_A); type(D.w, d.querySelector('#tg-key'), KEY); d.querySelector('#tg-email').value = 'ali@x.com'; d.querySelector('#tg-pass').value = 'secret1'; d.querySelector('#tg-go').click(); await D.idle();
    ok(D.w.TradelySync.account() && D.w.TradelySync.account().email === 'ali@x.com', 'password login still works');
    ok(D.w.TradelySync.saved().some(x => x.email === 'ali@x.com' && x.current), 'saved Ali is current again');
    D.w.TradelySync.signOut(); d = D.w.document; d.querySelector('#pp-yes').click(); await until(() => D.dump()[WIPE]);
    ok(!reg(D).list.some(x => x.email === 'ali@x.com'), 'logged out without saving: Ali is removed from the list');
    ok(A.log.filter(l => /auth\/v1\/logout/.test(l)).length === logoutsBefore + 1, 'and the server session is closed');

    summary();
})().catch(e => { console.error(e); process.exit(1); });
