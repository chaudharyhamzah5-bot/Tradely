(function () {
    const $ = id => document.getElementById(id);
    const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s ?? '')) : String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const money = v => '$' + (Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const open = new Set();
    let ctxM = null;

    const row = (label, value, note, tone) => `<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3.5">
        <div class="text-[11px] font-mono uppercase tracking-wider text-gray-500">${label}</div>
        <div class="text-lg font-bold ${tone || 'text-white'} mt-1 leading-snug">${value}</div>
        ${note ? `<div class="text-xs text-gray-400 mt-1 leading-relaxed">${note}</div>` : ''}</div>`;
    const flag = (ph, k, title, okTxt, noTxt) => {
        const ok = fxRuleFlag(ph, k) === 'allowed';
        return `<div class="rounded-lg border ${ok ? 'border-aura-green/30 bg-aura-green/5' : 'border-aura-red/40 bg-aura-red/5'} p-3.5">
            <div class="text-[11px] font-mono uppercase tracking-wider text-gray-500">${title}</div>
            <div class="text-lg font-bold ${ok ? 'text-aura-green' : 'text-aura-red'} mt-1">${ok ? 'Allowed' : 'Not allowed'}</div>
            <div class="text-xs text-gray-400 mt-1 leading-relaxed">${ok ? okTxt : noTxt}</div></div>`;
    };

    function phaseBody(m, label) {
        const ph = (m.phases || {})[label] || {};
        const size = Number(m.size) || 0, isF = label === 'Funded';
        const amt = p => size * (Number(p) || 0) / 100;
        const tr = fxDdType(ph) === 'trailing';
        const cells = [];
        cells.push(row('Account size', money(size)));
        cells.push(row('Leverage', esc(ph.leverage || '—')));
        if (!isF) cells.push(row('Profit target', ph.profitTarget ? `${ph.profitTarget}% <span class="text-sm font-mono text-gray-400">(${money(amt(ph.profitTarget))})</span>` : '—', 'Reach this profit to pass the phase.', 'text-aura-green'));
        if (isF) cells.push(row('Profit split', ph.profitSplit ? `${ph.profitSplit}% to you` : '—', ph.profitSplit ? `The firm keeps ${100 - ph.profitSplit}% of payouts.` : 'Not set.', 'text-aura-green'));
        cells.push(row('Daily drawdown limit', ph.dailyLoss ? `${ph.dailyLoss}% <span class="text-sm font-mono text-gray-400">(${money(amt(ph.dailyLoss))})</span>` : '—', 'Max you may lose in a single day.', 'text-aura-red'));
        cells.push(row('Overall drawdown limit', ph.overallLoss ? `${ph.overallLoss}% <span class="text-sm font-mono text-gray-400">(${money(amt(ph.overallLoss))})</span>` : '—', 'Max total loss allowed on the account.', 'text-aura-red'));
        cells.push(`<div class="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
            <div class="text-[11px] font-mono uppercase tracking-wider text-gray-500">Drawdown type</div>
            <div class="text-lg font-bold text-amber-300 mt-1">${tr ? 'Trailing' : 'Static'}</div>
            <div class="text-xs text-gray-300 mt-1 leading-relaxed">${tr
                ? `Your loss floor follows your <b>highest balance</b>. Example: on ${money(size)} with ${ph.overallLoss || 'X'}% drawdown, the floor starts at ${money(size - amt(ph.overallLoss))} and rises every time your balance makes a new high. It never moves back down.`
                : `Your loss floor is <b>fixed</b> from the starting balance: ${money(size - amt(ph.overallLoss))}. It never moves, so every profit you make adds to your cushion.`}</div></div>`);
        if (isF) { cells.push(row('Minimum payout amount', ph.minPayoutAmt ? money(ph.minPayoutAmt) : 'Not set', 'Your share must reach this amount before you can request a payout.')); }
        if (isF) { cells.push(row('Payout cycle', ph.payoutCycle ? `Every ${ph.payoutCycle} days` : 'Not set', 'Minimum gap between two payouts.')); cells.push(row('Minimum payout profit', ph.minPayoutPct ? `${ph.minPayoutPct}% <span class="text-sm font-mono text-gray-400">(${money(amt(ph.minPayoutPct))})</span>` : 'Not set', 'Profit needed in a cycle before you can request a payout.', 'text-aura-green')); }
        cells.push(row('Inactivity rule', ph.inactivityDays ? `${ph.inactivityDays} days` : 'Not set', ph.inactivityDays ? 'Place at least one trade within this many days or the account can be closed.' : '', ph.inactivityDays ? 'text-amber-300' : 'text-gray-400'));
        cells.push(row('Minimum trading days', ph.minTradingDays ? `${ph.minTradingDays} days` : 'No minimum'));
        cells.push(row('Minimum profitable days', ph.minProfitableDays ? `${ph.minProfitableDays} days` : 'No minimum', ph.minProfitDayPct ? `Each must make at least ${ph.minProfitDayPct}% (${money(amt(ph.minProfitDayPct))}).` : (ph.minProfitableDays ? 'Any green day counts.' : '')));
        cells.push(row('Consistency rule', ph.consistency === 'yes' ? `Best day ≤ ${ph.consistencyPct}% of profit` : 'No rule', ph.consistency === 'yes' ? 'Your biggest profit day must not be more than this share of your total profit.' : '', ph.consistency === 'yes' ? 'text-white' : 'text-gray-400'));
        cells.push(flag(ph, 'weekendHolding', 'Weekend holding', 'You may keep trades open over the weekend.', 'Close every trade before the market closes on Friday.'));
        cells.push(flag(ph, 'overnightHolding', 'Overnight holding', 'You may keep trades open overnight.', 'Close every trade before the daily rollover.'));
        cells.push(flag(ph, 'newsTrading', 'News trading', 'Trading during high-impact news is permitted.', 'Do not open or hold trades around high-impact news.'));
        const next = (m.phaseSequence || [])[(m.phaseSequence || []).indexOf(label) + 1];
        cells.push(`<div class="sm:col-span-2 rounded-lg border border-aura-red/40 bg-aura-red/5 p-3.5">
            <div class="text-[11px] font-mono uppercase tracking-wider text-gray-500">Account fails if</div>
            <div class="text-sm text-gray-200 mt-1 leading-relaxed">• You lose ${ph.dailyLoss ? ph.dailyLoss + '% (' + money(amt(ph.dailyLoss)) + ')' : 'the daily limit'} or more in one day.<br>• Your balance touches the ${tr ? 'trailing' : 'static'} drawdown floor${ph.overallLoss ? ' (' + ph.overallLoss + '% = ' + money(amt(ph.overallLoss)) + ')' : ''}.</div>
            <div class="text-xs text-gray-400 mt-1">The account is then marked <b class="text-aura-red">Failed</b> and trading is closed.</div></div>`);
        if (next) cells.push(`<div class="sm:col-span-2 rounded-lg border border-aura-green/30 bg-aura-green/5 p-3.5">
            <div class="text-[11px] font-mono uppercase tracking-wider text-gray-500">Moves to ${esc(next)} automatically when</div>
            <div class="text-sm text-gray-200 mt-1 leading-relaxed">• Profit target ${ph.profitTarget ? ph.profitTarget + '% (' + money(amt(ph.profitTarget)) + ')' : ''} is reached${ph.minTradingDays ? '<br>• At least ' + ph.minTradingDays + ' trading days are done' : ''}${ph.minProfitableDays ? '<br>• At least ' + ph.minProfitableDays + ' profitable days are done' : ''}</div></div>`);
        return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${cells.join('')}</div>`;
    }

    let cmp = false, cmpSel = new Set(), diffOnly = false;
    const CMP_ROWS = [
        ['Account size', (m, p) => money(m.size)], ['Leverage', (m, p) => p.leverage || '—'],
        ['Profit target', (m, p, l) => l === 'Funded' ? '—' : (p.profitTarget ? p.profitTarget + '%' : '—')],
        ['Profit split', (m, p, l) => l === 'Funded' && p.profitSplit ? p.profitSplit + '%' : '—'],
        ['Daily drawdown', (m, p) => p.dailyLoss ? p.dailyLoss + '%' : '—'], ['Overall drawdown', (m, p) => p.overallLoss ? p.overallLoss + '%' : '—'],
        ['Drawdown type', (m, p) => fxDdType(p) === 'trailing' ? 'Trailing' : 'Static'],
        ['Min trading days', (m, p) => p.minTradingDays || 'None'], ['Min profitable days', (m, p) => p.minProfitableDays ? p.minProfitableDays + (p.minProfitDayPct ? ' (≥' + p.minProfitDayPct + '% each)' : '') : 'None'],
        ['Consistency', (m, p) => p.consistency === 'yes' ? 'Best day ≤ ' + p.consistencyPct + '%' : 'None'],
        ['Weekend holding', (m, p) => fxRuleFlag(p, 'weekendHolding') === 'allowed' ? 'Allowed' : 'Not allowed'],
        ['Overnight holding', (m, p) => fxRuleFlag(p, 'overnightHolding') === 'allowed' ? 'Allowed' : 'Not allowed'],
        ['News trading', (m, p) => fxRuleFlag(p, 'newsTrading') === 'allowed' ? 'Allowed' : 'Not allowed'],
        ['Payout cycle', (m, p, l) => l === 'Funded' && p.payoutCycle ? p.payoutCycle + ' days' : '—'],
        ['Min payout amount', (m, p, l) => l === 'Funded' && p.minPayoutAmt ? '$' + p.minPayoutAmt : '—'],
        ['Min payout profit', (m, p, l) => l === 'Funded' && p.minPayoutPct ? p.minPayoutPct + '%' : '—'],
        ['Inactivity rule', (m, p) => p.inactivityDays ? p.inactivityDays + ' days' : '—']
    ];
    function paintCompare(m, seq, run) {
        if (!cmpSel.size) seq.forEach(l => cmpSel.add(l));
        const cols = seq.filter(l => cmpSel.has(l));
        const chips = seq.map(l => `<button onclick="rulesCmpToggle('${l}')" class="px-2.5 py-1 rounded-md text-xs font-medium border transition ${cmpSel.has(l) ? 'bg-blue-600 border-blue-500/40 text-white' : 'bg-aura-bg border-aura-border text-gray-400 hover:text-white'}">${esc(l)}</button>`).join('');
        const head = cols.map(l => `<th class="px-3 py-2 text-left text-xs font-bold ${l === 'Funded' ? 'text-aura-green' : 'text-blue-400'} whitespace-nowrap">${esc(l)}</th>`).join('');
        const rowsAll = CMP_ROWS.map(([lab, fn]) => {
            const vals = cols.map(l => String(fn(m, (m.phases || {})[l] || {}, l)));
            const diff = new Set(vals).size > 1;
            return { diff, html: `<tr class="border-t border-aura-border ${diff ? 'bg-amber-500/5' : ''}"><td class="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-gray-500 whitespace-nowrap sticky left-0 bg-[#14161f]">${lab}</td>${vals.map(v => `<td class="px-3 py-2 text-xs font-semibold ${diff ? 'text-amber-300' : 'text-white'} whitespace-nowrap">${esc(v)}</td>`).join('')}</tr>` };
        });
        const shown = diffOnly && cols.length > 1 ? rowsAll.filter(r => r.diff) : rowsAll;
        const body = shown.length ? shown.map(r => r.html).join('') : `<tr><td colspan="${cols.length + 1}" class="px-3 py-6 text-center text-xs text-gray-400">No differences between the selected phases.</td></tr>`;
        const diffBtn = `<button onclick="rulesCmpDiff()" aria-pressed="${diffOnly}" class="ml-auto px-2.5 py-1 rounded-md text-xs font-medium border transition ${diffOnly ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-aura-bg border-aura-border text-gray-400 hover:text-white'}">Show only differences</button>`;
        $('rules-body').innerHTML = `<div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] font-mono uppercase tracking-wider text-gray-500">Select phases</span>${chips}${diffBtn}</div>
            <div class="rounded-xl border border-aura-border overflow-x-auto"><table class="w-full min-w-[420px]"><thead><tr class="bg-aura-bg/60"><th class="px-3 py-2 text-left text-[11px] font-mono uppercase tracking-wider text-gray-500 sticky left-0 bg-[#14161f]">Rule</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
            <p class="text-[11px] text-gray-500">Highlighted rows differ between the selected phases.</p>`;
    }
    window.rulesCmpToggle = l => { cmpSel.has(l) ? cmpSel.delete(l) : cmpSel.add(l); if (!cmpSel.size) cmpSel.add(l); paint(); };
    window.rulesCmpMode = () => { cmp = !cmp; paint(); };
    window.rulesCmpDiff = () => { diffOnly = !diffOnly; paint(); };
    function paint() {
        const m = ctxM, c = window.fxConsCtx;
        { const b = $('rules-cmp-btn'); if (b) { b.className = 'px-3 py-1.5 rounded-md text-xs font-medium border transition flex items-center gap-1.5 ' + (cmp ? 'bg-blue-600 border-blue-500/40 text-white' : 'bg-aura-bg border-aura-border text-gray-300 hover:text-white'); } }
        if (cmp) { const s = m.phaseSequence || []; return paintCompare(m, s, s[0]), (typeof renderIcons === 'function') && renderIcons(); }
        const stBanner = m.status === 'failed' ? `<div class="rounded-xl border border-aura-red/50 bg-aura-red/10 p-3.5 text-sm text-aura-red font-semibold">FAILED — ${esc(fxFailText(m))}</div>` : '';
        const seq = m.phaseSequence || [], run = m.runningPhase && seq.includes(m.runningPhase) ? m.runningPhase : seq[0];
        $('rules-body').innerHTML = stBanner + seq.map(label => {
            const isOpen = open.has(label), isF = label === 'Funded';
            const ph = (m.phases || {})[label] || {};
            const tr = fxDdType(ph) === 'trailing';
            return `<div class="rounded-xl border ${label === run ? 'border-blue-500/40' : 'border-aura-border'} overflow-hidden">
                <button onclick="rulesToggle('${label}')" class="w-full flex items-center gap-3 px-4 py-3.5 bg-aura-bg/60 hover:bg-aura-hover transition text-left">
                    <div class="w-8 h-8 rounded-md ${isF ? 'bg-aura-green/10 text-aura-green' : 'bg-blue-500/10 text-blue-400'} flex items-center justify-center text-xs font-bold shrink-0">${isF ? 'F' : label.replace('Phase ', '')}</div>
                    <div class="flex-1 min-w-0"><div class="text-base font-bold text-white">${isF ? 'Funded Account' : esc(label)}${(m.status === 'failed' && label === run) ? ' <span class="ml-1.5 text-[10px] font-mono text-aura-red border border-aura-red/40 rounded px-1.5 py-0.5 align-middle">FAILED</span>' : (label === run ? ' <span class="ml-1.5 text-[10px] font-mono text-aura-green border border-aura-green/30 rounded px-1.5 py-0.5 align-middle">RUNNING</span>' : (m.passed && m.passed[label] ? ' <span class="ml-1.5 text-[10px] font-mono text-aura-green border border-aura-green/30 rounded px-1.5 py-0.5 align-middle">PASSED</span>' : ''))}</div>
                    <div class="text-xs text-gray-500 font-mono mt-0.5">${isF ? (ph.profitSplit ? 'Split ' + ph.profitSplit + '% · ' : '') : (ph.profitTarget ? 'Target ' + ph.profitTarget + '% · ' : '')}DD ${ph.dailyLoss || '—'}% / ${ph.overallLoss || '—'}% · ${tr ? 'Trailing' : 'Static'}</div></div>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 shrink-0 transition ${isOpen ? 'rotate-180' : ''}"></i>
                </button>
                ${isOpen ? `<div class="p-4 border-t border-aura-border">${phaseBody(m, label)}</div>` : ''}</div>`;
        }).join('') || '<p class="text-sm text-gray-400">No phases set on this account.</p>';
        if (typeof renderIcons === 'function') renderIcons();
    }
    window.rulesToggle = function (label) { open.has(label) ? open.delete(label) : open.add(label); paint(); };
    window.rulesOpen = function () {
        const c = window.fxConsCtx; if (!c || !c.m) { if (typeof showAppToast === 'function') showAppToast('Open an account first.'); return; }
        ctxM = c.m; open.clear(); cmp = false; cmpSel.clear();
        const seq = c.m.phaseSequence || [], run = seq.includes(c.m.runningPhase) ? c.m.runningPhase : seq[0];
        open.add(c.phaseLabel || run);
        $('rules-title').textContent = c.m.name;
        $('rules-sub').textContent = `${money(c.m.size)} · ${mt5ModeLabel(c.m.phasesMode)} · ${seq.length} phase${seq.length === 1 ? '' : 's'}`;
        paint();
        const el = $('rules-modal'); el.classList.remove('hidden'); el.classList.add('flex');
    };
    window.rulesClose = function () { const el = $('rules-modal'); el.classList.add('hidden'); el.classList.remove('flex'); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('rules-modal') && !$('rules-modal').classList.contains('hidden')) rulesClose(); });

    /* ---------------- Rule templates (FTMO, The5ers, ...) ---------------- */
    const TPL_KEY = 'tradely_rule_templates';
    const Tpl = {
        all() { const v = TradelyStore.getJSON(TPL_KEY, []); return Array.isArray(v) ? v.filter(t => t && t.id && t.name) : []; },
        save(name, mode, phases, size) {
            const list = Tpl.all().filter(t => t.name.toLowerCase() !== name.toLowerCase()); // same name = replace
            list.push({ id: 'tpl_' + Date.now().toString(36), name, mode, size: Number(size) || null, phases: JSON.parse(JSON.stringify(phases || {})) });
            return TradelyStore.setJSON(TPL_KEY, list);
        },
        remove(id) { return TradelyStore.setJSON(TPL_KEY, Tpl.all().filter(t => t.id !== id)); }
    };
    window.RuleTemplates = Tpl;
    const toast = (m, t) => { if (typeof showAppToast === 'function') showAppToast(m, t); };
    window.mt5TplRefresh = function () {
        const sel = $('mt5-tpl-select'); if (!sel) return;
        const list = Tpl.all();
        sel.innerHTML = `<option value="">${list.length ? 'Choose a template…' : 'No templates saved yet'}</option>` + list.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
        const del = $('mt5-tpl-del'), app = $('mt5-tpl-apply'); if (del) del.disabled = app.disabled = !list.length;
    };
    window.mt5TplApply = function () {
        const t = Tpl.all().find(x => x.id === ($('mt5-tpl-select') || {}).value);
        if (!t) return toast('Choose a template first.');
        mt5State.phasesMode = t.mode || '1';
        $('mt5-phases-select').value = mt5State.phasesMode;
        mt5State.phases = JSON.parse(JSON.stringify(t.phases || {}));
        mt5State.running = mt5Sequence(mt5State.phasesMode)[0];
        mt5RenderPhaseBlocks();
        if (t.size && !$('mt5-size').value) { $('mt5-size').value = t.size; if (typeof mt5HighlightSize === 'function') mt5HighlightSize(); }
        toast('Template "' + t.name + '" applied. Check the values, then save.', 'success');
    };
    window.mt5TplSave = function () {
        const name = ($('mt5-tpl-name').value || '').trim();
        if (!name) return toast('Type a template name first (for example FTMO 2-step).');
        mt5CollectPhases();
        const seq = mt5Sequence(mt5State.phasesMode), phases = {};
        seq.forEach(l => { if (mt5State.phases[l]) phases[l] = mt5State.phases[l]; });
        if (!Tpl.save(name, mt5State.phasesMode, phases, $('mt5-size').value)) return toast('Could not save the template (browser storage blocked).', 'error');
        $('mt5-tpl-name').value = ''; mt5TplRefresh(); toast('Template "' + name + '" saved.', 'success');
    };
    window.mt5TplDelete = function () {
        const sel = $('mt5-tpl-select'), t = Tpl.all().find(x => x.id === (sel || {}).value);
        if (!t) return toast('Choose a template to delete.');
        if (!confirm('Delete the template "' + t.name + '"? Accounts already created from it are not changed.')) return;
        Tpl.remove(t.id); mt5TplRefresh(); toast('Template deleted.', 'success');
    };
    window.rulesSaveTemplate = function () {
        if (!ctxM) return;
        const name = (prompt('Template name (for example FTMO 2-step):', ctxM.name || '') || '').trim();
        if (!name) return;
        const seq = ctxM.phaseSequence || [], phases = {};
        seq.forEach(l => { if ((ctxM.phases || {})[l]) phases[l] = ctxM.phases[l]; });
        toast(Tpl.save(name, ctxM.phasesMode || '1', phases, ctxM.size) ? 'Template "' + name + '" saved. Use it when you add a new account.' : 'Could not save the template.', 'success');
    };
})();
