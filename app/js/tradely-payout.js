(function () {
    const $ = id => document.getElementById(id);
    const esc = s => escapeHtml(String(s ?? ''));
    const money = v => '$' + (Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    let PL = null;
    function weekdays(n) { let c = 0; const d = new Date(); for (let i = 0; i < n; i++) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) c++; } return c; }
    function calc(target, days) {
        const X = window.fxPayCtx; if (!X) return null;
        const { m, ph, P } = X, size = P.size, split = P.split / 100, steps = [], warn = [];
        const grossNeed = target / split;                                   // total profit needed in cycle
        const needProfit = Math.max(grossNeed, P.minP ? size * P.minP / 100 : 0, P.minAmt ? P.minAmt / split : 0);
        const remaining = Math.max(0, needProfit - Math.max(0, P.profit));
        const tdays = Math.max(1, weekdays(days));
        const perDay = remaining / tdays, perDayPct = size ? perDay / size * 100 : 0;
        const earliest = P.cycle && P.start ? (() => { const d = new Date(P.start + 'T00:00:00'); d.setDate(d.getDate() + P.cycle); return d; })() : null;
        const deadline = new Date(); deadline.setDate(deadline.getDate() + days);
        const fmt = d => d.toISOString().slice(0, 10);
        if (earliest && earliest > deadline) warn.push(`The payout cycle does not complete until ${fmt(earliest)}, so a payout cannot be requested within ${days} days. Allow at least ${Math.max(0, Math.ceil((earliest - new Date()) / 864e5))} days.`);
        if (P.minP && target / split < size * P.minP / 100) warn.push(`Your target is below the minimum payout (${P.minP}% = ${money(size * P.minP / 100)} profit). That much profit is required for any payout, so the plan is built on ${money(needProfit)} profit.`);
        if (P.minAmt && target < P.minAmt) warn.push(`Your target is below the minimum payout amount (${money(P.minAmt)}). The plan is built so your share reaches at least that amount.`);
        const dl = Number(ph.dailyLoss) || 0, cons = ph.consistency === 'yes' ? Number(ph.consistencyPct) || 0 : 0;
        const minProfDays = Number(ph.minProfitableDays) || 0, minProfPct = Number(ph.minProfitDayPct) || 0, minTD = Number(ph.minTradingDays) || 0;
        let needDays = Math.max(1, minProfDays, cons ? Math.ceil(100 / cons) : 0);
        const dayCap = cons ? needProfit * cons / 100 : null;
        if (needDays > tdays) warn.push(`The rules require at least ${needDays} profitable trading days, but ${days} calendar days contain only about ${tdays} trading days. Extend the timeframe.`);
        const useDays = Math.min(tdays, Math.max(needDays, Math.min(tdays, 10)));
        const dailyTarget = remaining / Math.max(1, useDays), dailyPct = size ? dailyTarget / size * 100 : 0;
        if (minProfPct && dailyPct < minProfPct) steps.push(`Each profitable day must be at least ${minProfPct}% (${money(size * minProfPct / 100)}) or it will not count as a profitable day. Keep your daily target above that.`);
        let verdict = ['Realistic', 'text-aura-green', 'border-aura-green/40 bg-aura-green/10'];
        if (remaining <= 0) verdict = ['Target already reached', 'text-aura-green', 'border-aura-green/40 bg-aura-green/10'];
        else if (dailyPct > 2.5 || (dl && dailyPct > dl * 0.6)) verdict = ['Very risky', 'text-aura-red', 'border-aura-red/40 bg-aura-red/10'];
        else if (dailyPct > 1) verdict = ['Aggressive', 'text-amber-300', 'border-amber-500/40 bg-amber-500/10'];
        const stopLoss = dl ? size * dl / 100 * 0.4 : size * 0.01;
        steps.unshift(`Goal: ${money(target)} payout = ${money(grossNeed)} gross profit (your split is ${P.split}%). This cycle you have already made ${money(Math.max(0, P.profit))} (${Math.max(0, P.pct).toFixed(2)}%); ${money(remaining)} remaining.`);
        if (P.minP) steps.push(`Minimum payout rule: reach ${P.minP}% (${money(size * P.minP / 100)}) cycle profit${P.pctOk ? ' — this condition is already met.' : '.'}`);
        if (remaining > 0) steps.push(`${days} days contain about ${tdays} trading days. Trade over ${useDays} of them, aiming for about ${money(dailyTarget)} per day (${dailyPct.toFixed(2)}% of the account). Stop trading for the day once the target is hit.`);
        if (dayCap) steps.push(`Consistency rule: no single day may exceed ${cons}% of total profit, i.e. about ${money(dayCap)} per day at most. Spread your profit across at least ${Math.ceil(100 / cons)} profitable days.`);
        if (minProfDays) steps.push(`At least ${minProfDays} profitable days are required${minProfPct ? ' (each ≥ ' + minProfPct + '%)' : ''}.`);
        if (minTD) steps.push(`Complete at least ${minTD} trading days${P.pctOk && P.cycleOk ? '' : ' (keep logging trades in the calendar)'}.`);
        steps.push(`Risk control: cap your daily loss at about ${money(stopLoss)}${dl ? ` (well below the ${dl}% daily limit = ${money(size * dl / 100)})` : ''}. Stop trading for the day after two losses.`);
        if (P.inact) steps.push(`Inactivity rule: place at least 1 trade within every ${P.inact} days${P.idle !== null ? ` (it has been ${P.idle} days since your last trade)` : ''}.`);
        if (ph.weekendHolding === 'not_allowed' || ph.overnightHolding === 'not_allowed' || ph.newsTrading === 'not_allowed') steps.push('Trading rules: ' + [ph.weekendHolding === 'not_allowed' ? 'weekend holding not allowed' : '', ph.overnightHolding === 'not_allowed' ? 'overnight holding not allowed' : '', ph.newsTrading === 'not_allowed' ? 'news trading not allowed' : ''].filter(Boolean).join(', ') + '.');
        steps.push(earliest && earliest > new Date() ? `Request the payout on or after ${fmt(earliest > deadline ? earliest : deadline)}, once both the cycle and the profit requirement are complete.` : 'Request the payout as soon as the target and cycle are complete, then click "Mark payout taken" to start a new cycle.');
        if (P.minAmt) steps.push(`Minimum payout amount: your share must reach ${money(P.minAmt)}${P.amtOk ? ' — this condition is already met.' : '.'}`);
        if (cons && P.profit > 0 && !P.consOk) steps.push(`Consistency warning: your best day is already ${P.consShare.toFixed(1)}% of this cycle's profit (limit ${cons}%). Make about ${money(P.consExtra)} more across other days to fix it.`);
        const blocked = !!(earliest && earliest > deadline);
        const sv = remaining <= 0 ? 'Target already reached' : (perDayPct > 2.5 || (dl && perDayPct > dl * 0.6)) ? 'Very risky' : perDayPct > 1 ? 'Aggressive' : 'Realistic';
        return { perDay, perDayPct, spreadVerdict: sv, target, days, remaining, tdays, dailyTarget, dailyPct, needProfit, verdict: verdict[0], steps, warn, blocked, short: needDays > tdays, rules: { cycle: P.cycle, minP: P.minP, minAmt: P.minAmt, inact: P.inact, split: P.split, cons, dl, size } };
    }
    function build() {
        const target = parseFloat($('pay-target').value), days = parseInt($('pay-days').value, 10);
        if (!(target > 0) || !(days > 0)) { showAppToast('Enter both the payout amount and the number of days.'); return null; }
        PL = calc(target, days);
        return PL;
    }
    // Compare how hard the same payout is over 7 / 14 / 30 days
    function scenarioHtml(R) {
        const list = [7, 14, 30].map(d => d === R.days ? R : calc(R.target, d));
        const tone = v => v === 'Very risky' ? 'text-aura-red' : v === 'Aggressive' ? 'text-amber-300' : 'text-aura-green';
        const base = R.perDayPct;
        const rows = list.map(x => {
            const delta = base && x.days !== R.days ? (x.perDayPct - base) / base * 100 : null;
            const note = x.blocked ? 'Cycle not finished by then' : x.short ? 'Too few trading days' : (delta === null ? 'Your chosen timeframe' : (delta < 0 ? Math.abs(delta).toFixed(0) + '% easier' : delta > 0 ? delta.toFixed(0) + '% harder' : 'Same'));
            return `<tr class="border-t border-aura-border/60 ${x.days === R.days ? 'bg-blue-500/5' : ''}"><td class="py-2 pr-3 font-bold text-white">${x.days} days</td><td class="py-2 pr-3 text-right text-gray-300">${x.tdays}</td><td class="py-2 pr-3 text-right text-gray-300">${money(x.perDay)}</td><td class="py-2 pr-3 text-right text-gray-300">${x.perDayPct.toFixed(2)}%</td><td class="py-2 pr-3 font-bold ${tone(x.spreadVerdict)}">${x.spreadVerdict}</td><td class="py-2 text-gray-400">${esc(note)}</td></tr>`;
        }).join('');
        return `<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3"><div class="text-xs font-bold text-white mb-0.5">What if I take more or fewer days?</div><div class="text-[11px] text-gray-500 mb-2">Same ${money(R.target)} payout if you trade every weekday, compared over 7, 14 and 30 days.</div><div class="overflow-x-auto"><table class="w-full text-[11px] font-mono"><thead><tr class="text-gray-500 text-left"><th class="pb-1.5 font-medium">Timeframe</th><th class="pb-1.5 font-medium text-right">Trading days</th><th class="pb-1.5 font-medium text-right">Daily target</th><th class="pb-1.5 font-medium text-right">Daily %</th><th class="pb-1.5 font-medium">Difficulty</th><th class="pb-1.5 font-medium">vs your plan</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    window.payBuild = function () {
        const R = build(); if (!R) return;
        $('pay-ai').innerHTML = '';
        const tile = (l, v, c) => `<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3"><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">${l}</div><div class="text-sm font-bold ${c || 'text-white'} mt-1 font-mono">${v}</div></div>`;
        $('pay-out').innerHTML = `<div class="rounded-lg border ${R.verdict === 'Very risky' ? 'border-aura-red/40 bg-aura-red/10' : R.verdict === 'Aggressive' ? 'border-amber-500/40 bg-amber-500/10' : 'border-aura-green/40 bg-aura-green/10'} p-3 text-xs font-bold ${R.verdict === 'Very risky' ? 'text-aura-red' : R.verdict === 'Aggressive' ? 'text-amber-300' : 'text-aura-green'}">Plan difficulty: ${R.verdict}</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${tile('Profit needed', money(R.remaining))}${tile('Trading days', R.tdays)}${tile('Daily target', money(R.dailyTarget))}${tile('Daily %', R.dailyPct.toFixed(2) + '%')}</div>
            ${R.warn.map(w => `<div class="rounded-lg border border-aura-red/40 bg-aura-red/5 p-3 text-xs text-gray-200 leading-relaxed">⚠ ${esc(w)}</div>`).join('')}
            ${scenarioHtml(R)}
            <ol class="space-y-2">${R.steps.map((s, i) => `<li class="flex gap-2.5 text-xs text-gray-200 leading-relaxed"><span class="w-5 h-5 shrink-0 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] font-bold">${i + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>`;
    };
    window.payAI = async function () {
        if (!PL && !build()) return; if (!PL) return;
        const out = $('pay-ai');
        if (!window.CONS_AI || !window.CONS_AI.hasKey()) { out.innerHTML = '<div class="rounded-lg border border-dashed border-aura-border p-3 text-xs text-gray-400">No AI key is set. Add one in AI Coach (consistency) or Settings; until then, use the calculated plan above.</div>'; return; }
        const btn = $('pay-ai-btn'); btn.disabled = true; out.innerHTML = '<div class="text-xs text-gray-400 animate-pulse">Building the AI plan…</div>';
        try {
            const sys = 'You are a prop-firm payout coach. Reply ONLY JSON: {"steps":["..."],"risks":["..."]}. Plain English, max 7 steps and 3 risks, each under 30 words. Use only the numbers in FACTS, never invent rules.';
            const { data } = await window.CONS_AI.chatJSON({ system: sys, user: 'FACTS:\n' + JSON.stringify(PL), maxTokens: 700 });
            const L = a => (Array.isArray(a) ? a : []).map(x => `<li class="text-xs text-gray-200 leading-relaxed">• ${esc(x)}</li>`).join('');
            out.innerHTML = `<div class="text-xs font-bold text-white flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3.5 h-3.5 text-violet-400"></i> AI refined steps</div><ul class="space-y-1.5">${L(data && data.steps)}</ul>${(data && data.risks && data.risks.length) ? `<div class="text-xs font-bold text-aura-red mt-2">Risks</div><ul class="space-y-1.5">${L(data.risks)}</ul>` : ''}`;
            if (typeof renderIcons === 'function') renderIcons();
        } catch (e) { out.innerHTML = `<div class="text-xs text-aura-red">AI error: ${esc(e.message || 'unknown')} — the calculated plan above is still valid.</div>`; }
        finally { btn.disabled = false; }
    };
    window.payOpen = function () {
        const X = window.fxPayCtx; if (!X) return; PL = null;
        $('pay-title').textContent = X.m.name; $('pay-sub').textContent = `${money(X.P.size)} · split ${X.P.split}%`;
        $('pay-out').innerHTML = '<p class="text-xs text-gray-500">Enter your payout amount and number of days, and we will build a step-by-step plan based on your rules.</p>'; $('pay-ai').innerHTML = '';
        const el = $('pay-modal'); el.classList.remove('hidden'); el.classList.add('flex'); if (typeof renderIcons === 'function') renderIcons();
    };
    window.payClose = function () { const el = $('pay-modal'); el.classList.add('hidden'); el.classList.remove('flex'); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('pay-modal') && !$('pay-modal').classList.contains('hidden')) payClose(); });
})();
