/* ==================== MONTHLY SUMMARY (Accounts) ==================== */
(function () {
    const $ = id => document.getElementById(id);
    const esc = s => escapeHtml(String(s ?? ''));
    const PREF_KEY = 'tradely_ms_prefs_v1';
    const P = { sel: null, preset: 'month', from: '', to: '', shotsShown: 24 };
    try { const r = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (r) Object.assign(P, r, { shotsShown: 24 }); } catch (e) {}
    const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ sel: P.sel, preset: P.preset, from: P.from, to: P.to })); } catch (e) {} };
    const sgn = v => (v > 0 ? '+' : '') + formatMoney(v);
    const pc = v => v > 0 ? 'text-aura-green' : v < 0 ? 'text-aura-red' : 'text-gray-300';
    const pct = (v, d) => (v === null || v === undefined || !isFinite(v)) ? '—' : (v > 0 ? '+' : '') + v.toFixed(d === undefined ? 2 : d) + '%';
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const shortDate = k => { const d = new Date(k + 'T00:00:00'); return d.getDate() + ' ' + MON[d.getMonth()]; };
    const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    let SHOTS = [], shotIdx = 0;

    /* ---- sources: same account list the Stats & Journal pickers use — every MT5 account (each prop phase on its own) + every binary account ---- */
    function sources() {
        const out = [];
        const mk = acc => {
            const meta = jrAccMeta(acc), bin = acc.category === 'binary';
            const label = meta.name + (!bin && acc.phase ? ' · ' + acc.phase : '');
            return { key: (bin ? 'b:' : 'm:') + acc.id, label, sub: meta.sub, tag: meta.tag, tagCls: meta.tagCls, group: bin ? 'binary' : 'forex',
                size: Number(bin ? acc.startingBalance : (acc.mt5 ? acc.mt5.size : acc.startingBalance)) || 0, sizeKey: bin ? acc.id : (acc.mt5Id || acc.id),
                kind: bin ? 'binary' : 'forex', status: (!bin && acc.mt5 && acc.mt5.status === 'failed') ? 'failed' : '',
                load: () => Object.entries((bin ? baLoadDays(acc.id) : fxLoadDays(acc.id)) || {}).map(([date, e]) => ({ date, e })) };
        };
        calendarAccountsForType('forex').forEach(a => out.push(mk(a)));
        calendarAccountsForType('binary').forEach(a => out.push(mk(a)));
        return out;
    }
    function range() {
        const now = new Date(), today = toDateKey(now), y = now.getFullYear(), mo = now.getMonth();
        const back = n => { const d = new Date(now); d.setDate(d.getDate() - (n - 1)); return toDateKey(d); };
        if (P.preset === 'last') return { start: toDateKey(new Date(y, mo - 1, 1)), end: toDateKey(new Date(y, mo, 0)), label: MON[(mo + 11) % 12] + ' ' + (mo === 0 ? y - 1 : y) };
        if (P.preset === '30d') return { start: back(30), end: today, label: 'Last 30 days' };
        if (P.preset === '90d') return { start: back(90), end: today, label: 'Last 90 days' };
        if (P.preset === 'custom' && (P.from || P.to)) return { start: P.from || '0000-01-01', end: P.to || '9999-12-31', label: (P.from ? shortDate(P.from) : 'Start') + ' → ' + (P.to ? shortDate(P.to) : 'Today') };
        return { start: toDateKey(new Date(y, mo, 1)), end: today, label: MON[mo] + ' ' + y };
    }
    function norm(src, date, e) {
        const pnl = Number(e.pnl) || 0, d = { date, pnl, trades: 0, wins: 0, losses: 0, be: 0, units: [], shots: [] };
        if (src.kind === 'binary') {
            const en = Array.isArray(e.entries) ? e.entries : [];
            d.trades = Number(e.trades) || en.length;
            d.wins = e.wins != null && e.wins !== '' ? Number(e.wins) || 0 : en.filter(t => (Number(t.pnl) || 0) > 0).length;
            d.losses = Math.max(0, d.trades - d.wins);
            en.forEach(t => { d.units.push({ pnl: Number(t.pnl) || 0, pair: t.asset || t.pair || '', session: '' }); if (t.screenshot) d.shots.push({ url: t.screenshot, pnl: Number(t.pnl) || 0, pair: t.asset || t.pair || '' }); });
            (Array.isArray(e.screenshots) ? e.screenshots : []).map(fxShotUrl).filter(Boolean).forEach(u => d.shots.push({ url: u, pnl, pair: '' }));
            if (!en.length && (d.trades || pnl)) d.units.push({ pnl, pair: '', session: '' });
        } else {
            const logs = Array.isArray(e.tradeLogs) ? e.tradeLogs : [];
            d.trades = Number(e.trades) || logs.length;
            if (logs.length) { d.wins = logs.filter(t => t.outcome === 'tp').length; d.losses = logs.filter(t => t.outcome === 'sl').length; d.be = logs.filter(t => t.outcome === 'be').length; }
            else { d.wins = Number(e.tp) || Number(e.wins) || 0; d.losses = Number(e.sl) || 0; d.be = Number(e.be) || 0; }
            logs.forEach(t => { const p = Number(t.pnl) || 0; d.units.push({ pnl: p, pair: t.pair || '', session: t.session || '' }); (t.screenshots || []).map(fxShotUrl).filter(Boolean).forEach(u => d.shots.push({ url: u, pnl: p, pair: t.pair || '' })); });
            if (!logs.length && (d.trades || pnl)) d.units.push({ pnl, pair: '', session: '' });
        }
        return d;
    }
    function analyse(srcs, r) {
        const perAcc = [], daily = {}, units = [], pairs = {}, sessions = {}, wdays = WD.map(() => ({ pnl: 0, days: 0 })), shots = [];
        const sizeSeen = new Set();
        let totPnl = 0, totSize = 0, trades = 0, wins = 0, losses = 0, be = 0;
        srcs.forEach(src => {
            const days = src.load().filter(x => x.date >= r.start && x.date <= r.end).map(x => norm(src, x.date, x.e));
            const a = { src, pnl: 0, trades: 0, wins: 0, losses: 0, days: new Set() };
            days.forEach(d => {
                a.pnl += d.pnl; a.trades += d.trades; a.wins += d.wins; a.losses += d.losses; a.days.add(d.date);
                const dd = daily[d.date] || (daily[d.date] = { date: d.date, pnl: 0, trades: 0 }); dd.pnl += d.pnl; dd.trades += d.trades;
                trades += d.trades; wins += d.wins; losses += d.losses; be += d.be;
                d.units.forEach(u => {
                    units.push({ ...u, date: d.date, acc: src.label });
                    if (u.pair) { const o = pairs[u.pair] || (pairs[u.pair] = { trades: 0, wins: 0, pnl: 0 }); o.trades++; o.pnl += u.pnl; if (u.pnl > 0) o.wins++; }
                    if (u.session) { const o = sessions[u.session] || (sessions[u.session] = { trades: 0, wins: 0, pnl: 0 }); o.trades++; o.pnl += u.pnl; if (u.pnl > 0) o.wins++; }
                });
                d.shots.forEach(sh => shots.push({ ...sh, date: d.date, acc: src.label }));
            });
            totPnl += a.pnl; if (!sizeSeen.has(src.sizeKey)) { sizeSeen.add(src.sizeKey); totSize += src.size; } perAcc.push(a);
        });
        const dl = Object.values(daily).sort((x, y) => x.date < y.date ? -1 : 1);
        let cum = 0, peak = 0, maxDD = 0; const cumSeries = [];
        dl.forEach(d => { cum += d.pnl; if (cum > peak) peak = cum; if (peak - cum > maxDD) maxDD = peak - cum; cumSeries.push(cum); const w = new Date(d.date + 'T00:00:00').getDay(); wdays[w].pnl += d.pnl; wdays[w].days++; });
        const green = dl.filter(d => d.pnl > 0).length, red = dl.filter(d => d.pnl < 0).length;
        const gp = units.filter(u => u.pnl > 0).reduce((t, u) => t + u.pnl, 0), gl = Math.abs(units.filter(u => u.pnl < 0).reduce((t, u) => t + u.pnl, 0));
        let streak = 0, bestStreak = 0; dl.forEach(d => { if (d.pnl > 0) { streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0; });
        const best = dl.length ? dl.reduce((a, b) => b.pnl > a.pnl ? b : a) : null, worst = dl.length ? dl.reduce((a, b) => b.pnl < a.pnl ? b : a) : null;
        const bestT = units.length ? units.reduce((a, b) => b.pnl > a.pnl ? b : a) : null, worstT = units.length ? units.reduce((a, b) => b.pnl < a.pnl ? b : a) : null;
        shots.sort((a, b) => a.date < b.date ? 1 : -1);
        return { perAcc, dl, cumSeries, totPnl, totSize, trades, wins, losses, be, green, red, flat: dl.length - green - red, gp, gl, pf: gl ? gp / gl : (gp ? Infinity : null), maxDD, bestStreak, best, worst, bestT, worstT, pairs, sessions, wdays, shots, units };
    }

    /* ---- rendering ---- */
    const card = (label, value, sub, cls) => `<div class="glass-card rounded-xl border border-aura-border p-4"><div class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">${label}</div><div class="text-xl font-mono font-bold ${cls || 'text-white'} mt-1.5">${value}</div>${sub ? `<div class="text-xs text-gray-500 mt-1">${sub}</div>` : ''}</div>`;
    const panel = (title, inner, sub) => `<div class="glass-card rounded-xl border border-aura-border p-4"><div class="flex items-center justify-between mb-3"><h3 class="text-xs font-bold text-white">${title}</h3>${sub ? `<span class="text-[11px] font-mono text-gray-500">${sub}</span>` : ''}</div>${inner}</div>`;

    function chart(A) {
        if (!A.dl.length) return '';
        const W = 760, H = 220, pl = 8, pr = 8, pt = 12, pb = 22, n = A.dl.length;
        const vals = A.dl.map(d => d.pnl), cs = A.cumSeries;
        const hi = Math.max(0, ...vals, ...cs), lo = Math.min(0, ...vals, ...cs), span = (hi - lo) || 1;
        const y = v => pt + (hi - v) / span * (H - pt - pb), bw = Math.max(3, Math.min(34, (W - pl - pr) / n * 0.62)), x = i => pl + (i + 0.5) * (W - pl - pr) / n;
        const bars = A.dl.map((d, i) => { const y0 = y(0), y1 = y(d.pnl); return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.5, Math.abs(y1 - y0)).toFixed(1)}" rx="2" fill="${d.pnl >= 0 ? '#22c55e' : '#ef4444'}" opacity="0.75"><title>${shortDate(d.date)}: ${sgn(d.pnl)}</title></rect>`; }).join('');
        const line = cs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const step = Math.ceil(n / 12), labels = A.dl.map((d, i) => i % step === 0 ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#6b7280">${shortDate(d.date)}</text>` : '').join('');
        return panel('Daily PNL &amp; cumulative curve', `<div class="overflow-x-auto"><svg viewBox="0 0 ${W} ${H}" class="w-full min-w-[520px]" style="height:auto">
            <line x1="${pl}" x2="${W - pr}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#374151" stroke-dasharray="3 3"/>${bars}
            <polyline points="${line}" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linejoin="round"/>${labels}</svg></div>
            <div class="flex items-center gap-4 text-[11px] text-gray-500 mt-1"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-aura-green"></span>Profit day</span><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-aura-red"></span>Loss day</span><span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-blue-400"></span>Cumulative</span></div>`, A.dl.length + ' trading days');
    }
    function dayTiles(A) {
        if (!A.dl.length) return '';
        const mx = Math.max(...A.dl.map(d => Math.abs(d.pnl))) || 1;
        return panel('Every trading day', `<div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">${A.dl.map(d => {
            const a = Math.min(0.55, 0.12 + Math.abs(d.pnl) / mx * 0.43), bg = d.pnl > 0 ? `rgba(34,197,94,${a})` : d.pnl < 0 ? `rgba(239,68,68,${a})` : 'rgba(107,114,128,0.15)';
            return `<div class="rounded-lg border border-aura-border p-2 text-center" style="background:${bg}"><div class="text-[11px] text-gray-300">${shortDate(d.date)}</div><div class="text-xs font-bold font-mono ${pc(d.pnl)}">${sgn(d.pnl)}</div><div class="text-[10px] text-gray-400">${d.trades} trade${d.trades === 1 ? '' : 's'}</div></div>`; }).join('')}</div>`);
    }
    function accTable(A) {
        const rows = A.perAcc.map(a => { const n = a.days.size, ret = a.src.size ? a.pnl / a.src.size * 100 : null, wr = a.trades ? a.wins / a.trades * 100 : null;
            return `<tr class="border-t border-aura-border"><td class="py-2.5 pr-3"><div class="text-xs font-semibold text-white">${esc(a.src.label)}${a.src.status ? ' <span class="text-[10px] font-mono text-aura-red border border-aura-red/40 rounded px-1">FAILED</span>' : ''}</div><div class="text-[11px] text-gray-500 font-mono">${esc(a.src.sub)} · <span class="${a.src.tagCls.split(' ')[0]}">${esc(a.src.tag)}</span></div></td>
            <td class="py-2.5 px-2 text-right font-mono text-xs font-bold ${pc(a.pnl)}">${n ? sgn(a.pnl) : '—'}</td><td class="py-2.5 px-2 text-right font-mono text-xs ${pc(a.pnl)}">${n ? pct(ret) : '—'}</td>
            <td class="py-2.5 px-2 text-right font-mono text-xs text-gray-300">${a.trades}</td><td class="py-2.5 px-2 text-right font-mono text-xs text-gray-300">${wr === null ? '—' : wr.toFixed(0) + '%'}</td><td class="py-2.5 pl-2 text-right font-mono text-xs text-gray-300">${n}</td></tr>`; }).join('');
        return panel('Account breakdown', `<div class="overflow-x-auto"><table class="w-full min-w-[560px] text-left"><thead><tr class="text-[11px] font-semibold uppercase tracking-wider text-gray-500"><th class="pb-2 font-medium">Account</th><th class="pb-2 px-2 text-right font-medium">PNL</th><th class="pb-2 px-2 text-right font-medium">Return</th><th class="pb-2 px-2 text-right font-medium">Trades</th><th class="pb-2 px-2 text-right font-medium">Win %</th><th class="pb-2 pl-2 text-right font-medium">Days</th></tr></thead><tbody>${rows}</tbody></table></div>`);
    }
    function breakdown(title, map) {
        const rows = Object.keys(map).map(k => ({ k, ...map[k] })).sort((a, b) => b.pnl - a.pnl).slice(0, 8);
        if (!rows.length) return '';
        return panel(title, `<div class="space-y-1.5">${rows.map(r => `<div class="flex items-center gap-2 text-xs font-mono bg-aura-bg border border-aura-border rounded-md px-3 py-2"><span class="flex-1 text-white truncate">${esc(r.k)}</span><span class="text-gray-400 w-16 text-right">${r.trades} tr</span><span class="text-gray-400 w-12 text-right">${Math.round(r.wins / r.trades * 100)}%</span><span class="w-24 text-right font-bold ${pc(r.pnl)}">${sgn(r.pnl)}</span></div>`).join('')}</div>`);
    }
    function highlights(A, rg) {
        const L = [];
        if (A.best && A.best.pnl > 0) L.push(`Best day was <b class="text-aura-green">${shortDate(A.best.date)}</b> with ${sgn(A.best.pnl)}.`);
        if (A.worst && A.worst.pnl < 0) L.push(`Worst day was <b class="text-aura-red">${shortDate(A.worst.date)}</b> with ${sgn(A.worst.pnl)}.`);
        const pr = Object.entries(A.pairs).sort((a, b) => b[1].pnl - a[1].pnl);
        if (pr.length && pr[0][1].pnl > 0) L.push(`Best pair: <b class="text-white">${esc(pr[0][0])}</b> (${sgn(pr[0][1].pnl)} in ${pr[0][1].trades} trade${pr[0][1].trades === 1 ? '' : 's'}).`);
        if (pr.length > 1 && pr[pr.length - 1][1].pnl < 0) L.push(`Weakest pair: <b class="text-white">${esc(pr[pr.length - 1][0])}</b> (${sgn(pr[pr.length - 1][1].pnl)}).`);
        const wd = A.wdays.map((w, i) => ({ n: WD[i], ...w })).filter(w => w.days); if (wd.length > 1) { const b = wd.reduce((a, c) => c.pnl > a.pnl ? c : a); if (b.pnl > 0) L.push(`Most profitable weekday: <b class="text-white">${b.n}</b> (${sgn(b.pnl)}).`); }
        if (A.dl.length) L.push(`${A.green} green day${A.green === 1 ? '' : 's'} vs ${A.red} red day${A.red === 1 ? '' : 's'} (${Math.round(A.green / A.dl.length * 100)}% green)${A.bestStreak > 1 ? `, longest green streak ${A.bestStreak} days` : ''}.`);
        if (A.maxDD > 0) L.push(`Largest dip from a peak this period: <b class="text-aura-red">${formatMoney(-A.maxDD)}</b>${A.totSize ? ' (' + (A.maxDD / A.totSize * 100).toFixed(2) + '% of selected balance)' : ''}.`);
        return L.length ? panel('Highlights · ' + esc(rg.label), `<ul class="space-y-2">${L.map(x => `<li class="flex gap-2 text-xs text-gray-300 leading-relaxed"><span class="text-blue-400">•</span><span>${x}</span></li>`).join('')}</ul>`) : '';
    }
    function shotsPanel(A) {
        SHOTS = A.shots;
        if (!SHOTS.length) return panel('Trade screenshots', '<p class="text-xs text-gray-500 text-center py-6">No trade screenshots saved in this period.</p>');
        const show = SHOTS.slice(0, P.shotsShown);
        return panel('Trade screenshots', `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">${show.map((s, i) => `<button onclick="msShotOpen(${i})" class="group relative aspect-video rounded-lg overflow-hidden border border-aura-border bg-aura-bg text-left"><img src="${escapeHtml(safeImgSrc(s.url))}" loading="lazy" alt="" class="w-full h-full object-cover group-hover:scale-105 transition"><div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-5 pb-1.5"><div class="text-[11px] text-gray-300 truncate">${shortDate(s.date)}${s.pair ? ' · ' + esc(s.pair) : ''}</div><div class="text-xs font-bold font-mono ${pc(s.pnl)}">${sgn(s.pnl)}</div></div></button>`).join('')}</div>
            ${SHOTS.length > show.length ? `<div class="text-center mt-3"><button onclick="msMoreShots()" class="px-3 py-1.5 rounded-md text-xs border border-aura-border text-gray-300 hover:bg-aura-hover">Show more (${SHOTS.length - show.length} left)</button></div>` : ''}`, SHOTS.length + ' screenshot' + (SHOTS.length === 1 ? '' : 's'));
    }

    window.msRender = function () {
        const root = $('ms-root'); if (!root) return;
        const all = sources();
        if (!all.length) { root.innerHTML = `<div class="rounded-xl border border-dashed border-aura-border p-12 text-center"><div class="text-xs font-semibold text-white">No accounts yet</div><div class="text-xs text-gray-500 mt-1">Create an MT5 or Binary account to see its monthly summary.</div></div>`; return; }
        if (!P.sel) P.sel = all.map(s => s.key);
        P.sel = P.sel.flatMap(k => all.some(s => s.key === k) ? [k] : all.filter(s => s.key.startsWith(k + '~')).map(s => s.key));
        P.sel = P.sel.filter((k, i) => P.sel.indexOf(k) === i);
        const chosen = all.filter(s => P.sel.includes(s.key)), rg = range(), A = analyse(chosen, rg);
        const presets = [['month', 'This month'], ['last', 'Last month'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['custom', 'Custom']];
        const ret = A.totSize ? A.totPnl / A.totSize * 100 : null, wr = A.trades ? A.wins / A.trades * 100 : null;
        const pfTxt = A.pf === null ? '—' : A.pf === Infinity ? '∞' : A.pf.toFixed(2);
        const head = `<div class="flex items-start justify-between gap-3 flex-wrap"><div><h2 class="text-base font-bold text-white">Monthly Summary</h2><p class="text-xs text-gray-500">${esc(rg.label)} · ${chosen.length} account${chosen.length === 1 ? '' : 's'} selected</p></div></div>
        <div class="glass-card rounded-xl border border-aura-border p-4 space-y-3 relative z-30" style="position:relative;z-index:30">
            <div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mr-1">Period</span>${presets.map(([id, l]) => `<button onclick="msPreset('${id}')" class="px-3 py-1.5 rounded-md text-xs font-medium border transition ${P.preset === id ? 'bg-blue-600 border-blue-500/40 text-white' : 'bg-aura-bg border-aura-border text-gray-400 hover:text-white'}">${l}</button>`).join('')}
                ${P.preset === 'custom' ? `<input type="date" value="${esc(P.from)}" onchange="msDate('from',this.value)" class="bg-aura-bg border border-aura-border rounded-md px-2.5 py-1.5 text-xs text-white"><span class="text-gray-500">→</span><input type="date" value="${esc(P.to)}" onchange="msDate('to',this.value)" class="bg-aura-bg border border-aura-border rounded-md px-2.5 py-1.5 text-xs text-white">` : ''}</div>
            <div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mr-1">Accounts</span>
                <div class="relative" id="ms-acc-wrap">
                    <button type="button" onclick="msToggleMenu(event)" aria-haspopup="listbox" aria-expanded="${P.menu ? 'true' : 'false'}" class="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:border-blue-400/60 transition text-left max-w-full text-xs">
                        <span class="flex items-center gap-2 min-w-0">${chosen.length === 0 ? '<span class="text-gray-400">Select account(s)</span>' : chosen.length === 1 ? `<span class="font-semibold text-white truncate">${esc(chosen[0].label)}</span><span class="text-gray-500 text-[11px] font-mono truncate hidden sm:inline">${esc(chosen[0].sub)}</span><span class="text-[9px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${chosen[0].tagCls}">${esc(chosen[0].tag)}</span>` : `<span class="font-semibold text-white">${chosen.length === all.length ? 'All accounts' : chosen.length + ' accounts'}</span><span class="text-gray-500 text-[11px] truncate hidden sm:inline max-w-[220px]">${esc(chosen.map(c => c.label).join(', '))}</span>`}</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" class="shrink-0 text-gray-400"><path d="M2.5 4.5l3.5 3.5 3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
                    <div id="ms-acc-menu" class="${P.menu ? '' : 'hidden'} absolute left-0 top-full mt-1.5 w-80 max-w-[90vw] max-h-[60vh] overflow-y-auto rounded-lg shadow-2xl border border-aura-border z-50" style="background-color:#14161f;">
                        <div class="flex items-center justify-between px-3 py-2 border-b border-aura-border sticky top-0" style="background:#14161f;"><span class="text-[11px] text-gray-500">${chosen.length} selected</span><span class="flex gap-3 text-[11px]"><button type="button" onclick="msSelAll(true)" class="text-blue-400 hover:underline">Select all</button><button type="button" onclick="msSelAll(false)" class="text-gray-400 hover:underline">Clear</button></span></div>
                        ${[['forex', 'Forex · MT5 accounts'], ['binary', 'Binary accounts']].map(([g, title]) => { const list = all.filter(s => s.group === g); return !list.length ? '' : `<div class="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-gray-500">${title}</div>` + list.map(s => { const on = P.sel.includes(s.key); return `<button type="button" onclick="msToggle('${s.key}')" class="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-aura-hover transition ${on ? 'bg-aura-hover' : ''}"><span class="w-4 h-4 rounded border shrink-0 flex items-center justify-center ${on ? 'bg-blue-600 border-blue-500' : 'border-gray-600'}">${on ? '<svg viewBox="0 0 12 12" class="w-3 h-3"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="#fff" stroke-width="1.8"/></svg>' : ''}</span><span class="flex flex-col min-w-0 flex-1"><span class="text-white font-semibold truncate">${esc(s.label)}</span><span class="text-gray-500 text-[10px] font-mono truncate">${esc(s.sub)}</span></span><span class="text-[9px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${s.tagCls}">${esc(s.tag)}</span></button>`; }).join(''); }).join('')}
                    </div></div>
                <span class="flex gap-1">${[['all', 'All'], ['forex', 'Forex only'], ['binary', 'Binary only']].map(([k, t]) => `<button type="button" onclick="msQuick('${k}')" class="px-2 py-1 rounded text-[11px] text-gray-400 hover:text-white hover:bg-aura-hover transition">${t}</button>`).join('')}</span></div></div>`;
        if (!chosen.length) { root.innerHTML = head + `<div class="rounded-xl border border-dashed border-aura-border p-10 text-center text-xs text-gray-400">Select at least one account above.</div>`; return; }
        if (!A.dl.length) { root.innerHTML = head + `<div class="rounded-xl border border-dashed border-aura-border p-10 text-center"><div class="text-xs font-semibold text-white">No trades in ${esc(rg.label)}</div><div class="text-xs text-gray-500 mt-1">Pick another period or add accounts that traded in this time.</div></div>`; return; }
        const cards = [
            card('Net PNL', sgn(A.totPnl), esc(rg.label), pc(A.totPnl)),
            card('% gained', pct(ret), 'on ' + formatMoney(A.totSize) + ' selected balance', pc(A.totPnl)),
            card('Total trades', A.trades, A.dl.length + ' trading day' + (A.dl.length === 1 ? '' : 's')),
            card('Win rate (trades)', wr === null ? '—' : wr.toFixed(1) + '%', `${A.wins} win${A.wins === 1 ? '' : 's'} · ${A.losses} loss${A.losses === 1 ? '' : 'es'}${A.be ? ' · ' + A.be + ' BE' : ''}`),
            card('Win rate (days)', Math.round(A.green / A.dl.length * 100) + '%', `${A.green} green · ${A.red} red${A.flat ? ' · ' + A.flat + ' flat' : ''}`),
            card('Profit factor', pfTxt, `${formatMoney(A.gp)} won / ${formatMoney(A.gl)} lost`, A.pf !== null && A.pf >= 1.5 ? 'text-aura-green' : 'text-white'),
            card('Avg daily PNL', sgn(A.totPnl / A.dl.length), 'per trading day', pc(A.totPnl)),
            card('Best day', A.best ? sgn(A.best.pnl) : '—', A.best ? shortDate(A.best.date) : '', 'text-aura-green'),
            card('Worst day', A.worst ? sgn(A.worst.pnl) : '—', A.worst ? shortDate(A.worst.date) : '', 'text-aura-red'),
            card('Best trade', A.bestT ? sgn(A.bestT.pnl) : '—', A.bestT ? shortDate(A.bestT.date) + (A.bestT.pair ? ' · ' + esc(A.bestT.pair) : '') : '', 'text-aura-green'),
            card('Worst trade', A.worstT ? sgn(A.worstT.pnl) : '—', A.worstT ? shortDate(A.worstT.date) + (A.worstT.pair ? ' · ' + esc(A.worstT.pair) : '') : '', 'text-aura-red'),
            card('Max drawdown', A.maxDD ? formatMoney(-A.maxDD) : '$0.00', 'peak-to-trough in period', A.maxDD ? 'text-aura-red' : 'text-white')
        ].join('');
        root.innerHTML = head + `<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">${cards}</div>${highlights(A, rg)}${chart(A)}${accTable(A)}${dayTiles(A)}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${breakdown('By pair / asset', A.pairs)}${breakdown('By session', A.sessions)}</div>${shotsPanel(A)}`;
        if (typeof renderIcons === 'function') renderIcons();
    };
    window.msToggleMenu = e => { if (e) e.stopPropagation(); P.menu = !P.menu; msRender(); };
    document.addEventListener('click', e => { if (P.menu && !e.target.closest('#ms-acc-wrap')) { P.menu = false; if (typeof msRender === 'function') msRender(); } });
    window.msPreset = id => { P.preset = id; savePrefs(); msRender(); };
    window.msDate = (k, v) => { P[k] = v; savePrefs(); msRender(); };
    window.msToggle = key => { P.sel = P.sel.includes(key) ? P.sel.filter(k => k !== key) : P.sel.concat(key); P.shotsShown = 24; savePrefs(); msRender(); };
    window.msSelAll = on => { P.sel = on ? sources().map(s => s.key) : []; savePrefs(); msRender(); };
    window.msQuick = k => { P.sel = sources().filter(s => k === 'all' || s.group === k).map(s => s.key); P.shotsShown = 24; savePrefs(); msRender(); };
    window.msMoreShots = () => { P.shotsShown += 24; msRender(); };
    function paintShot() { const s = SHOTS[shotIdx]; if (!s) return; $('ms-lightbox-img').src = s.url; $('ms-lightbox-cap').textContent = `${shotIdx + 1}/${SHOTS.length} · ${shortDate(s.date)}${s.pair ? ' · ' + s.pair : ''} · ${sgn(s.pnl)} · ${s.acc}`; }
    window.msShotOpen = i => { shotIdx = i; paintShot(); const m = $('ms-lightbox'); m.classList.remove('hidden'); m.classList.add('flex'); if (typeof renderIcons === 'function') renderIcons(); };
    window.msShotClose = () => { const m = $('ms-lightbox'); m.classList.add('hidden'); m.classList.remove('flex'); };
    window.msShotStep = d => { if (!SHOTS.length) return; shotIdx = (shotIdx + d + SHOTS.length) % SHOTS.length; paintShot(); };
    document.addEventListener('keydown', e => { const m = $('ms-lightbox'); if (!m || m.classList.contains('hidden')) return; if (e.key === 'Escape') msShotClose(); if (e.key === 'ArrowLeft') msShotStep(-1); if (e.key === 'ArrowRight') msShotStep(1); });
})();
