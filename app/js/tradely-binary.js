        /* ==================== STRATEGIES & RULES ==================== */
        const STRATEGY_STORAGE_KEY = 'tradely_strategies';
        const STRATEGY_TYPES = {
            binary: { label: 'Binary', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20', accountCategory: 'binary' },
            forex:  { label: 'Forex',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       accountCategory: 'cfd' },
            crypto: { label: 'Crypto', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    accountCategory: 'crypto' }
        };
        let tradelyStrategies = [];
        let stState = { step: 'type', type: null, editingId: null, steps: [''], rules: [''], linked: [], limits: {} };
        let stExpanded = new Set();

        function loadStrategies() {
            try {
                const raw = localStorage.getItem(STRATEGY_STORAGE_KEY);
                tradelyStrategies = raw ? JSON.parse(raw) : [];
            } catch (e) { tradelyStrategies = []; }
        }
        function saveStrategies() {
            try { localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(tradelyStrategies)); } catch (e) {}
        }
        loadStrategies();

        function strategyAccountsFor(type) {
            const cat = STRATEGY_TYPES[type].accountCategory;
            return tradelyAccounts.filter(a => a.category === cat);
        }

        function renderStrategies() {
            pruneStrategyAccountLinks();
            const grid = document.getElementById('strategies-grid');
            const empty = document.getElementById('strategies-empty');
            if (!grid || !empty) return;
            if (!tradelyStrategies.length) {
                grid.classList.add('hidden');
                empty.classList.remove('hidden');
                return;
            }
            empty.classList.add('hidden');
            grid.classList.remove('hidden');

            grid.innerHTML = tradelyStrategies.map(s => {
                const t = STRATEGY_TYPES[s.type] || STRATEGY_TYPES.forex;
                const open = stExpanded.has(s.id);
                const linked = (s.accountIds || []).map(id => getAccountById(id)).filter(Boolean);
                const chips = linked.length
                    ? linked.map(a => `<span class="px-1.5 py-0.5 rounded text-[10px] border border-aura-border bg-aura-bg text-gray-300 truncate max-w-[140px]">${escapeHtml(a.nickname || a.name)}</span>`).join('')
                    : `<span class="text-[11px] text-gray-600">No accounts linked</span>`;
                const list = (items, icon) => items.map(x => `<li class="flex gap-2 text-[11px] text-gray-300"><i data-lucide="${icon}" class="w-3 h-3 text-gray-500 shrink-0 mt-0.5"></i><span>${escapeHtml(x)}</span></li>`).join('');
                return `
                <div class="glass-card p-4 rounded-xl border border-aura-border space-y-3 relative">
                    <div class="absolute top-3 right-3 flex items-center gap-2.5 z-10">
                        <button onclick="openStrategyModal('${s.id}')" title="Edit strategy" class="text-gray-600 hover:text-blue-400 transition"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                        <button onclick="deleteStrategy('${s.id}')" title="Delete strategy" class="text-gray-600 hover:text-aura-red transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                    <div class="pr-12">
                        <div class="text-sm font-bold text-white truncate">${escapeHtml(s.name)}</div>
                        <span class="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono border ${t.cls}">${t.label.toUpperCase()}</span>
                    </div>
                    ${s.description ? `<p class="text-[11px] text-gray-400 leading-relaxed ${open ? '' : 'line-clamp-2'}">${escapeHtml(s.description)}</p>` : ''}
                    <div class="flex flex-wrap gap-1.5 pt-2 border-t border-aura-border/60">${chips}</div>
                    ${strategyLimitChipsHTML(s)}
                    ${strategyComplianceLineHTML(s)}
                    ${open ? `
                    <div class="space-y-3 pt-2 border-t border-aura-border/60">
                        ${s.steps.length ? `<div><div class="text-[11px] font-semibold text-white mb-1.5">Steps</div><ol class="space-y-1.5">${s.steps.map((x, i) => `<li class="flex gap-2 text-[11px] text-gray-300"><span class="text-gray-500 font-mono shrink-0">${i + 1}.</span><span>${escapeHtml(x)}</span></li>`).join('')}</ol></div>` : ''}
                        ${s.rules.length ? `<div><div class="text-[11px] font-semibold text-white mb-1.5">Rules</div><ul class="space-y-1.5">${list(s.rules, 'check')}</ul></div>` : ''}
                    </div>` : ''}
                    <button onclick="toggleStrategyDetails('${s.id}')" class="text-[10px] text-blue-400 flex items-center gap-1">
                        <span>${open ? 'Hide details' : `View steps &amp; rules (${s.steps.length + s.rules.length})`}</span>
                        <i data-lucide="${open ? 'chevron-up' : 'chevron-down'}" class="w-3 h-3"></i>
                    </button>
                </div>`;
            }).join('');
            renderIcons();
        }

        function toggleStrategyDetails(id) {
            if (stExpanded.has(id)) stExpanded.delete(id); else stExpanded.add(id);
            renderStrategies();
        }

        let pendingDeleteStrategyId = null;

        function deleteStrategy(id) {
            const st = tradelyStrategies.find(x => x.id === id);
            if (!st) return;
            pendingDeleteStrategyId = id;
            document.getElementById('delete-strategy-name').textContent = st.name;
            const modal = document.getElementById('delete-strategy-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeDeleteStrategyModal() {
            pendingDeleteStrategyId = null;
            const modal = document.getElementById('delete-strategy-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function confirmDeleteStrategy() {
            const id = pendingDeleteStrategyId;
            if (!id) { closeDeleteStrategyModal(); return; }
            tradelyStrategies = tradelyStrategies.filter(x => x.id !== id);
            stExpanded.delete(id);
            saveStrategies();
            closeDeleteStrategyModal();
            renderStrategies();
        }

        function strategyShowStep(step) {
            stState.step = step;
            ['type', 'details', 'link'].forEach(s => document.getElementById('st-step-' + s).classList.toggle('hidden', s !== step));
            const t = stState.type ? STRATEGY_TYPES[stState.type].label : '';
            const titles = {
                type: 'New Strategy',
                details: (stState.editingId ? 'Edit ' : 'New ') + t + ' Strategy',
                link: 'Link Accounts'
            };
            document.getElementById('st-title').textContent = titles[step];
            document.getElementById('st-back-btn').classList.toggle('hidden', step === 'type' || (step === 'details' && stState.editingId));
            renderIcons();
        }

        function openStrategyModal(editId) {
            const existing = editId ? tradelyStrategies.find(x => x.id === editId) : null;
            stState = existing
                ? { step: 'details', type: existing.type, editingId: existing.id, steps: existing.steps.slice(), rules: existing.rules.slice(), linked: (existing.accountIds || []).slice(), limits: { ...(existing.limits || {}) } }
                : { step: 'type', type: null, editingId: null, steps: [''], rules: [''], linked: [], limits: {} };
            document.getElementById('st-field-name').value = existing ? existing.name : '';
            document.getElementById('st-field-desc').value = existing ? existing.description : '';
            document.getElementById('st-form-error').classList.add('hidden');
            if (!stState.steps.length) stState.steps = [''];
            if (!stState.rules.length) stState.rules = [''];
            renderStrategyRows();
            renderStrategyLimitInputs();
            strategyShowStep(existing ? 'details' : 'type');
            const modal = document.getElementById('strategy-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeStrategyModal() {
            const modal = document.getElementById('strategy-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function strategySelectType(type) {
            stState.type = type;
            strategyShowStep('details');
            document.getElementById('st-field-name').focus();
        }

        function strategyGoBack() {
            if (stState.step === 'link') strategyShowStep('details');
            else if (stState.step === 'details') strategyShowStep('type');
        }

        // Keep typed text in state before any re-render of the rows
        function syncStrategyRows() {
            stState.steps = Array.from(document.querySelectorAll('#st-steps-list input')).map(i => i.value);
            stState.rules = Array.from(document.querySelectorAll('#st-rules-list input')).map(i => i.value);
            stState.limits = {};
            STRATEGY_LIMITS.forEach(l => {
                const v = parseFloat(document.getElementById('st-limit-' + l.key).value);
                if (!isNaN(v) && v > 0) stState.limits[l.key] = v;
            });
        }

        function renderStrategyRows() {
            ['steps', 'rules'].forEach(kind => {
                const holder = document.getElementById('st-' + kind + '-list');
                holder.innerHTML = stState[kind].map((val, i) => `
                    <div class="flex items-center gap-2">
                        ${kind === 'steps' ? `<span class="text-[11px] text-gray-500 font-mono w-4 shrink-0">${i + 1}.</span>` : `<i data-lucide="check" class="w-3 h-3 text-gray-500 shrink-0"></i>`}
                        <input type="text" value="${escapeHtml(val)}" onkeydown="if(event.key==='Enter'){event.preventDefault();strategyAddRow('${kind}');}" placeholder="${kind === 'steps' ? 'Describe this step' : 'Describe this rule'}" class="flex-1 bg-aura-bg border border-aura-border rounded-md px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50">
                        <button onclick="strategyRemoveRow('${kind}', ${i})" title="Remove" class="text-gray-600 hover:text-aura-red transition"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                    </div>`).join('');
            });
            renderIcons();
        }

        function strategyAddRow(kind) {
            syncStrategyRows();
            stState[kind].push('');
            renderStrategyRows();
            const inputs = document.querySelectorAll('#st-' + kind + '-list input');
            if (inputs.length) inputs[inputs.length - 1].focus();
        }

        function strategyRemoveRow(kind, index) {
            syncStrategyRows();
            stState[kind].splice(index, 1);
            if (!stState[kind].length) stState[kind].push('');
            renderStrategyRows();
        }

        function strategyGoToLink() {
            syncStrategyRows();
            const name = document.getElementById('st-field-name').value.trim();
            const err = document.getElementById('st-form-error');
            if (!name) {
                err.textContent = 'Give your strategy a name.';
                err.classList.remove('hidden');
                return;
            }
            err.classList.add('hidden');

            const accs = strategyAccountsFor(stState.type);
            const typeLabel = STRATEGY_TYPES[stState.type].label;
            document.getElementById('st-link-hint').textContent = accs.length
                ? 'Optional. Choose the ' + typeLabel + ' accounts you trade this strategy on.'
                : '';
            const list = document.getElementById('st-link-list');
            if (!accs.length) {
                list.innerHTML = `<div class="text-center py-8 border border-dashed border-aura-border rounded-lg">
                    <p class="text-xs text-gray-400">No ${typeLabel} accounts yet.</p>
                    <p class="text-[11px] text-gray-600 mt-1">${stState.type === 'crypto' ? 'Crypto accounts are not available yet.' : 'Add one from the Accounts page, then link it by editing this strategy.'}</p>
                </div>`;
            } else {
                list.innerHTML = accs.map(a => `
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-aura-border bg-aura-bg hover:bg-aura-hover cursor-pointer transition">
                        <input type="checkbox" value="${a.id}" ${stState.linked.includes(a.id) ? 'checked' : ''} class="accent-blue-500 w-3.5 h-3.5 shrink-0">
                        ${providerIconHTML(a.provider, 28)}
                        <div class="min-w-0">
                            <div class="text-xs font-semibold text-white truncate">${escapeHtml(a.nickname || a.name)}</div>
                            <div class="text-[10px] text-gray-500 font-mono truncate">${escapeHtml(a.provider ? a.provider.name : '')}</div>
                        </div>
                    </label>`).join('');
            }
            strategyShowStep('link');
        }

        function strategySave() {
            const accountIds = Array.from(document.querySelectorAll('#st-link-list input[type=checkbox]:checked')).map(i => i.value);
            const clean = arr => arr.map(x => x.trim()).filter(Boolean);
            const data = {
                type: stState.type,
                name: document.getElementById('st-field-name').value.trim(),
                description: document.getElementById('st-field-desc').value.trim(),
                steps: clean(stState.steps),
                rules: clean(stState.rules),
                limits: { ...stState.limits },
                accountIds: accountIds
            };
            if (stState.editingId) {
                const idx = tradelyStrategies.findIndex(x => x.id === stState.editingId);
                if (idx > -1) tradelyStrategies[idx] = { ...tradelyStrategies[idx], ...data };
            } else {
                tradelyStrategies.push({ id: 'str_' + Date.now(), createdAt: Date.now(), ...data });
            }
            saveStrategies();
            closeStrategyModal();
            renderStrategies();
        }


        /* ---------- Preset daily limits + compliance checking ---------- */
        const STRATEGY_LIMITS = [
            { key: 'maxTrades',       label: 'Max trades per day',        unit: 'trades', short: 'Max trades' },
            { key: 'maxLosses',       label: 'Max losing trades per day', unit: 'trades', short: 'Max losses' },
            { key: 'maxWins',         label: 'Max winning trades per day', unit: 'trades', short: 'Max wins' },
            { key: 'maxConsecLosses', label: 'Max losses in a row',       unit: 'trades', short: 'Max losses in a row' },
            { key: 'maxDailyLoss',    label: 'Max daily loss',            unit: '$',      short: 'Max daily loss' }
        ];
        const FOREX_CALENDAR_KEY = 'tradely_calendar_entries';

        function renderStrategyLimitInputs() {
            document.getElementById('st-limits-list').innerHTML = STRATEGY_LIMITS.map(l => `
                <div class="flex items-center justify-between gap-3">
                    <label for="st-limit-${l.key}" class="text-xs text-gray-300">${l.label}</label>
                    <div class="relative w-28 shrink-0">
                        ${l.unit === '$' ? '<span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>' : ''}
                        <input type="number" min="1" step="any" id="st-limit-${l.key}" value="${stState.limits[l.key] || ''}" placeholder="Off" class="w-full bg-aura-bg border border-aura-border rounded-md ${l.unit === '$' ? 'pl-6' : 'pl-3'} pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 font-mono">
                    </div>
                </div>`).join('');
        }

        function strategyHasLimits(st) { return STRATEGY_LIMITS.some(l => st.limits && st.limits[l.key] > 0); }

        function strategyLimitChipsHTML(st) {
            if (!strategyHasLimits(st)) return '';
            return `<div class="flex flex-wrap gap-1.5">${STRATEGY_LIMITS.filter(l => st.limits[l.key] > 0).map(l =>
                `<span class="px-1.5 py-0.5 rounded text-[10px] border border-aura-border bg-aura-bg text-gray-400">${l.short}: <span class="text-white font-mono">${l.unit === '$' ? '$' : ''}${st.limits[l.key]}</span></span>`).join('')}</div>`;
        }

        // Per-day numbers the limits are checked against, read from what the Calendar logged.
        function strategyDayMetrics(type, e) {
            const trades = Number(e.trades) || 0, wins = Number(e.wins) || 0;
            let losses, seq = null, emotional = false;
            if (type === 'binary') {
                losses = Math.max(0, trades - wins - (Number(e.refunds) || 0));
                if (e.entries && e.entries.length) {
                    seq = e.entries.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                        .map(t => t.result === 'win' ? 'W' : (t.result === 'loss' ? 'L' : 'O'));
                }
                emotional = !!e.emotionalTrade;
            } else {
                losses = Number(e.sl) || 0;
                if (e.tradeLogs && e.tradeLogs.length) {
                    seq = e.tradeLogs.slice().sort((a, b) => ((a.hour24 || 0) * 60 + (a.min || 0)) - ((b.hour24 || 0) * 60 + (b.min || 0)))
                        .map(t => t.outcome === 'tp' ? 'W' : (t.outcome === 'sl' ? 'L' : 'O'));
                    emotional = e.tradeLogs.some(t => t.emotionalTrade);
                }
            }
            let maxRun = null;
            if (seq) { let run = 0; maxRun = 0; seq.forEach(x => { if (x === 'L') { run++; maxRun = Math.max(maxRun, run); } else run = 0; }); }
            return { trades, wins, losses, pnl: Number(e.pnl) || 0, maxRun, emotional };
        }

        // Which calendars hold this strategy's trades. Binary calendars are per account; the Forex
        // calendar is one shared calendar, so a Forex strategy reads it once if any Forex account is linked.
        function strategyDataSources(st) {
            const linked = (st.accountIds || []).map(id => getAccountById(id)).filter(Boolean);
            if (st.type === 'binary') {
                return linked.filter(a => a.category === 'binary').map(a => ({ accountId: a.id, accountName: a.nickname || a.name, days: baLoadDays(a.id) }));
            }
            if (st.type === 'forex') {
                const out = [];
                linked.filter(a => a.category === 'cfd').forEach(a => {
                    (a.mt5Accounts || []).forEach(m => {
                        if (fxIsProp(a) && (m.phaseSequence || []).length) (m.phaseSequence).forEach(l => out.push({ accountId: fxCalId(m, a, l), accountName: (a.nickname || a.name) + ' / ' + m.name + ' · ' + l, days: fxLoadDays(fxCalId(m, a, l)) }));
                        else out.push({ accountId: m.id, accountName: (a.nickname || a.name) + ' / ' + m.name, days: fxLoadDays(m.id) });
                    });
                });
                return out;
            }
            return [];
        }

        // One result per logged day: every limit checked, and whether the whole day passed.
        function evaluateStrategy(st) {
            if (!strategyHasLimits(st)) return [];
            const results = [];
            strategyDataSources(st).forEach(src => {
                Object.keys(src.days).sort().forEach(date => {
                    const e = src.days[date];
                    if (!e || !(Number(e.trades) > 0)) return;
                    const m = strategyDayMetrics(st.type, e);
                    const checks = [];
                    const add = (key, actual, ok) => checks.push({ key, label: STRATEGY_LIMITS.find(l => l.key === key).label, limit: st.limits[key], actual, ok });
                    if (st.limits.maxTrades > 0)   add('maxTrades', m.trades, m.trades <= st.limits.maxTrades);
                    if (st.limits.maxLosses > 0)   add('maxLosses', m.losses, m.losses <= st.limits.maxLosses);
                    if (st.limits.maxWins > 0)     add('maxWins', m.wins, m.wins <= st.limits.maxWins);
                    if (st.limits.maxConsecLosses > 0 && m.maxRun !== null) add('maxConsecLosses', m.maxRun, m.maxRun <= st.limits.maxConsecLosses);
                    if (st.limits.maxDailyLoss > 0) { const lossAmt = Math.max(0, -m.pnl); add('maxDailyLoss', lossAmt, lossAmt <= st.limits.maxDailyLoss); }
                    results.push({
                        strategyId: st.id, strategyName: st.name, market: st.type,
                        accountId: src.accountId, accountName: src.accountName, date,
                        checks, broken: checks.filter(c => !c.ok), passed: checks.every(c => c.ok),
                        emotional: m.emotional
                    });
                });
            });
            return results;
        }

        function strategyComplianceLineHTML(st, onlyAccountId) {
            if (!strategyHasLimits(st)) return '';
            let res = evaluateStrategy(st);
            if (onlyAccountId) res = res.filter(r => r.accountId === onlyAccountId);
            if (!res.length) return `<div class="text-[10px] text-gray-600 pt-1">No logged days to check yet.</div>`;
            const broken = res.filter(r => !r.passed).length;
            return `<div class="flex items-center gap-2 text-[10px] font-mono pt-1">
                <span class="text-gray-500">${res.length} days checked</span>
                <span class="text-aura-green">${res.length - broken} followed</span>
                <span class="${broken ? 'text-aura-red' : 'text-gray-500'}">${broken} broken</span>
            </div>`;
        }

        // Everything the Psychology page needs, in one place. Also saved as a snapshot
        // (tradely_psychology_feed) so the full Psychology page can read it later.
        function buildPsychologyFeed() {
            const days = [];
            tradelyStrategies.forEach(st => evaluateStrategy(st).forEach(r => days.push(r)));
            days.sort((a, b) => b.date.localeCompare(a.date));
            const broken = days.filter(d => !d.passed).length;
            const feed = {
                generatedAt: Date.now(),
                summary: { daysChecked: days.length, followed: days.length - broken, broken, compliancePct: days.length ? Math.round(((days.length - broken) / days.length) * 100) : null },
                days
            };
            try { localStorage.setItem('tradely_psychology_feed', JSON.stringify(feed)); } catch (e) {}
            return feed;
        }

        function renderPsychologyCompliance() {
            const host = document.getElementById('psy-compliance');
            if (!host) return;
            const feed = buildPsychologyFeed();
            const sm = feed.summary;
            if (!sm.daysChecked) {
                host.innerHTML = `<div class="glass-card p-5 rounded-xl border border-aura-border">
                    <h3 class="text-sm font-bold text-white">Strategy Rule Compliance</h3>
                    <p class="text-xs text-gray-500 mt-1">Nothing to show yet. Set daily limits on a strategy, link it to an account and log trades in the Calendar.</p>
                </div>`;
                return;
            }
            const rows = feed.days.slice(0, 30).map(d => `
                <div class="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-aura-border bg-aura-bg">
                    <div class="min-w-0">
                        <div class="text-xs text-white font-semibold truncate">${escapeHtml(d.strategyName)} <span class="text-gray-500 font-normal">on ${escapeHtml(d.accountName)}</span></div>
                        <div class="text-[10px] text-gray-500 font-mono">${d.date}${d.emotional ? ' · emotional trade flagged' : ''}</div>
                        ${d.passed ? '' : `<ul class="mt-1 space-y-0.5">${d.broken.map(c => `<li class="text-[11px] text-aura-red">${c.label}: limit ${c.key === 'maxDailyLoss' ? '$' : ''}${c.limit}, actual ${c.key === 'maxDailyLoss' ? '$' : ''}${Math.round(c.actual * 100) / 100}</li>`).join('')}</ul>`}
                    </div>
                    <span class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono border ${d.passed ? 'bg-aura-green/10 text-aura-green border-aura-green/20' : 'bg-aura-red/10 text-aura-red border-aura-red/20'}">${d.passed ? 'FOLLOWED' : 'BROKEN'}</span>
                </div>`).join('');
            host.innerHTML = `<div class="glass-card p-5 rounded-xl border border-aura-border space-y-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <h3 class="text-sm font-bold text-white">Strategy Rule Compliance</h3>
                    <div class="flex items-center gap-3 text-[11px] font-mono">
                        <span class="text-gray-400">${sm.daysChecked} days</span>
                        <span class="text-aura-green">${sm.followed} followed</span>
                        <span class="${sm.broken ? 'text-aura-red' : 'text-gray-500'}">${sm.broken} broken</span>
                        <span class="text-white font-bold">${sm.compliancePct}%</span>
                    </div>
                </div>
                <div class="space-y-2 max-h-80 overflow-y-auto pr-1">${rows}</div>
            </div>`;
        }


        /* ==================== PSYCHOLOGY ENGINE ==================== */
        // Scoring (per traded day): start 10. Overtrading -3, too many mistakes -5,
        // 2+ B/B+ setups -2, 3+ A/A+ setups -2. Score < 2 = Red Day.
        // 3 red days in a week = Red Week. 2 red weeks in a month = Red (unhealthy) Month.
        const PSY_DEFAULTS = { maxTrades: 5, mistakeLimit: 2 };
        const psyState = { month: null, mistakeScope: 'month' };
        const PSY_CATS = {
            fomo:     { label: 'FOMO / Chasing', color: 'amber', kw: ['fomo','chase','chasing','chased','missed','miss ho','jump','late entry','late in'],
                        fixes: ['Write one rule: "If price already moved, I do not enter." No chasing, ever.', 'Wait for the next setup. A missed trade costs $0, a chased trade costs money.', 'Set an alert at your entry zone instead of staring at the chart.'] },
            revenge:  { label: 'Revenge / Emotional', color: 'red', kw: ['revenge','recover','win back','get back','badla','angry','gussa','emotion','tilt','frustrat','bhar'],
                        fixes: ['After any SL, take a 30-minute break away from the screen before the next trade.', 'Two losses in a row = stop for the day. Write this in your plan.', 'Never raise lot size to recover a loss.'] },
            overtrade:{ label: 'Overtrading', color: 'amber', kw: ['overtrad','too many','zyada trade','extra trade','boht trade','over trad'],
                        fixes: ['Set a hard max trades per day and stop when you hit it.', 'Only trade your A / A+ setups. Skip everything else.', 'Close the platform after your planned trades are done.'] },
            sl:       { label: 'Stop-loss discipline', color: 'red', kw: ['no sl','without sl','sl nahi','no stop','moved sl','move sl','moving sl','widen','removed sl','remove sl','sl hit nahi','stoploss'],
                        fixes: ['Place the SL the moment you enter, before anything else.', 'Never move SL further away. Only move it toward breakeven/profit.', 'If you cannot accept the SL distance, reduce the lot size instead of widening the stop.'] },
            size:     { label: 'Lot size / Risk', color: 'red', kw: ['lot','oversize','over size','big size','risk too','double','heavy','size zyada','risk zyada'],
                        fixes: ['Fix your risk per trade (e.g. 0.5-1%) and calculate lots from the SL every time.', 'Use the same lot formula for every trade, win or lose.', 'Never increase size after a winning streak either.'] },
            early:    { label: 'Early entry / No confirmation', color: 'amber', kw: ['early','premature','jaldi','before confirmation','no confirmation','without confirmation','confirm nahi','anticipat','guess'],
                        fixes: ['Write your confirmation checklist and tick it before every entry.', 'Wait for the candle close. Do not enter inside a forming candle.', 'No confirmation = no trade.'] },
            exit:     { label: 'Exit management', color: 'amber', kw: ['exit','closed early','close early','cut early','cut profit','greed','greedy','hold too long','held too long','tp nahi','late exit','be early'],
                        fixes: ['Decide TP / partials before entering and do not change them mid-trade.', 'Use partial close + breakeven rules instead of deciding on emotion.', 'Review: did cutting early actually help, or hurt, over your last 20 trades?'] },
            plan:     { label: 'Ignored plan / Impulsive', color: 'red', kw: ['rule','plan','not my setup','setup nahi','random','impuls','gambl','no reason','bina','without setup','boredom','bored'],
                        fixes: ['Before each trade answer: "Is this my setup? Which grade?" If not, skip.', 'Keep a short pre-trade checklist visible next to the chart.', 'If you are bored, step away. Boredom is not a signal.'] },
            news:     { label: 'News / Bad timing', color: 'amber', kw: ['news','nfp','cpi','fomc','spread','rollover','friday'],
                        fixes: ['Check the economic calendar every morning and mark red-folder events.', 'No new trades 15-30 minutes around high-impact news.', 'Close or protect trades before major news if you cannot sit through it.'] },
            rulesFlag:{ label: 'Rules broken (flagged on trade)', color: 'red', kw: [], flag: true,
                        fixes: ['Open those trades and read what rule you broke. Pick the one you break most.', 'Turn that rule into a yes/no question you ask before entering.', 'Reward yourself for rule-following days, not only profit.'] },
            emoFlag:  { label: 'Emotional trade (flagged)', color: 'red', kw: [], flag: true,
                        fixes: ['Note your emotion before the trade (calm / anxious / angry). If not calm, skip.', 'Reduce screen time on losing days.', 'Keep a 10-minute breathing/walk reset after a loss.'] },
            other:    { label: 'Other mistakes', color: 'gray', kw: [],
                        fixes: ['Read these entries weekly and group the repeating ones into a rule.', 'Write mistakes in specific words (what, when, why) so patterns can be detected.'] }
        };

        function psyLoadSettings() {
            try { return Object.assign({}, PSY_DEFAULTS, JSON.parse(localStorage.getItem('tradely_psy_settings') || '{}')); } catch (e) { return Object.assign({}, PSY_DEFAULTS); }
        }
        function psySetSetting(k, v) {
            const cur = psyLoadSettings(); const n = parseInt(v, 10);
            if (isNaN(n) || n < 1) return;
            cur[k] = n;
            try { localStorage.setItem('tradely_psy_settings', JSON.stringify(cur)); } catch (e) {}
            renderPsychologyPage();
        }
        function psyLoadFixDone() { try { return JSON.parse(localStorage.getItem('tradely_psy_fixes') || '{}'); } catch (e) { return {}; } }
        function psyToggleFix(key) {
            const d = psyLoadFixDone(); d[key] = !d[key];
            try { localStorage.setItem('tradely_psy_fixes', JSON.stringify(d)); } catch (e) {}
            renderPsychologyPage();
        }

        const psyPad = n => String(n).padStart(2, '0');
        const psyKey = d => d.getFullYear() + '-' + psyPad(d.getMonth() + 1) + '-' + psyPad(d.getDate());
        function psyMonday(dateStr) {
            const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return psyKey(d);
        }
        // A week belongs to the month its Thursday falls in
        function psyWeekMonth(mondayStr) {
            const d = new Date(mondayStr + 'T00:00:00'); d.setDate(d.getDate() + 3); return psyKey(d).slice(0, 7);
        }
        function psyFmtDay(k) { const d = new Date(k + 'T00:00:00'); return WEEKDAY_NAMES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_NAMES[d.getMonth()]; }
        function psyFmtMonth(k) { const [y, m] = k.split('-'); return MONTH_NAMES[parseInt(m, 10) - 1] + ' ' + y; }

        // Every Forex (MT5) calendar, every phase, merged by date. Psychology belongs to the trader, not to one account.
        function psyCollect() {
            const byDate = {};
            tradelyAccounts.filter(a => a.category === 'cfd').forEach(a => {
                (a.mt5Accounts || []).forEach(m => {
                    const cals = (fxIsProp(a) && (m.phaseSequence || []).length) ? m.phaseSequence.map(l => fxCalId(m, a, l)) : [m.id];
                    cals.forEach(calId => {
                        const days = fxLoadDays(calId);
                        Object.keys(days).forEach(date => {
                            const e = days[date] || {};
                            const logs = Array.isArray(e.tradeLogs) ? e.tradeLogs : [];
                            const o = byDate[date] || (byDate[date] = { trades: [], extra: 0, pnl: 0 });
                            logs.forEach(t => o.trades.push(Object.assign({}, t, { _acc: (a.nickname || a.name) + ' / ' + m.name })));
                            if (!logs.length) o.extra += Number(e.trades) || 0;
                            o.pnl += Number(e.pnl) || 0;
                        });
                    });
                });
            });
            return byDate;
        }

        // Each separate line / ; / | / bullet in a Mistakes field counts as one mistake
        function psySplitMistakes(txt) {
            return String(txt || '').split(/\n|;|\||•|(?:^|\s)[-*]\s/).map(x => x.trim()).filter(x => x.length > 1);
        }

        function psyScoreDay(date, d, S) {
            const n = d.trades.length + d.extra;
            let score = 10; const items = [];
            const mistakes = [];
            d.trades.forEach(t => psySplitMistakes(t.mistakes).forEach(x => mistakes.push({ text: x, trade: t })));
            const bCount = d.trades.filter(t => t.isMySetup && (t.setupGrade === 'B' || t.setupGrade === 'B+')).length;
            const aCount = d.trades.filter(t => t.isMySetup && (t.setupGrade === 'A' || t.setupGrade === 'A+')).length;
            if (n > S.maxTrades) { score -= 3; items.push({ pts: -3, txt: `Overtrading: ${n} trades (limit ${S.maxTrades})` }); }
            if (mistakes.length >= S.mistakeLimit) { score -= 5; items.push({ pts: -5, txt: `${mistakes.length} mistakes logged (limit ${S.mistakeLimit - 1})` }); }
            if (bCount >= 2) { score -= 2; items.push({ pts: -2, txt: `${bCount} B / B+ setups taken` }); }
            if (aCount >= 3) { score -= 2; items.push({ pts: -2, txt: `${aCount} A / A+ setups taken (too many in a day)` }); }
            return { date, n, pnl: d.pnl, score, shown: Math.max(0, score), red: score < 2, items, mistakes, bCount, aCount, trades: d.trades };
        }

        function psyBuild() {
            const S = psyLoadSettings();
            const byDate = psyCollect();
            const days = Object.keys(byDate).filter(k => (byDate[k].trades.length + byDate[k].extra) > 0).sort().map(k => psyScoreDay(k, byDate[k], S));
            const weeks = {};
            days.forEach(d => {
                const mon = psyMonday(d.date);
                const w = weeks[mon] || (weeks[mon] = { monday: mon, month: psyWeekMonth(mon), days: [], redDays: 0 });
                w.days.push(d); if (d.red) w.redDays++;
            });
            Object.values(weeks).forEach(w => { w.red = w.redDays >= 3; });
            return { S, days, weeks };
        }

        function psyMistakeSummary(days) {
            const cats = {}; const bump = (c, entry) => { (cats[c] || (cats[c] = { count: 0, entries: [] })); cats[c].count++; if (entry) cats[c].entries.push(entry); };
            days.forEach(d => {
                d.mistakes.forEach(mk => {
                    const low = mk.text.toLowerCase(); let hit = false;
                    Object.keys(PSY_CATS).forEach(c => { if (PSY_CATS[c].kw.some(w => low.includes(w))) { bump(c, { date: d.date, text: mk.text }); hit = true; } });
                    if (!hit) bump('other', { date: d.date, text: mk.text });
                });
                d.trades.forEach(t => {
                    if (t.rulesFollowed === false) bump('rulesFlag', { date: d.date, text: (t.pair || 'Trade') + ' — rules not followed' });
                    if (t.emotionalTrade) bump('emoFlag', { date: d.date, text: (t.pair || 'Trade') + ' — emotional trade' });
                });
                if (d.n > 0 && d.items.some(i => i.txt.startsWith('Overtrading'))) bump('overtrade', { date: d.date, text: d.n + ' trades in a day' });
            });
            return Object.keys(cats).map(k => ({ key: k, ...cats[k] })).sort((a, b) => b.count - a.count);
        }

        function psyShiftMonth(delta) {
            const [y, m] = psyState.month.split('-').map(Number);
            const d = new Date(y, m - 1 + delta, 1);
            psyState.month = d.getFullYear() + '-' + psyPad(d.getMonth() + 1);
            renderPsychologyPage();
        }
        function psySetMistakeScope(v) { psyState.mistakeScope = v; renderPsychologyPage(); }

        const PSY_TONE = {
            green: 'text-aura-green border-aura-green/30 bg-aura-green/10',
            amber: 'text-aura-amber border-aura-amber/30 bg-aura-amber/10',
            red: 'text-aura-red border-aura-red/30 bg-aura-red/10',
            gray: 'text-gray-400 border-aura-border bg-aura-hover'
        };

        function renderPsychologyPage() {
            const host = document.getElementById('psy-root');
            if (!host) return;
            if (!psyState.month) psyState.month = psyKey(new Date()).slice(0, 7);
            const { S, days, weeks } = psyBuild();
            const month = psyState.month;
            const monthDays = days.filter(d => d.date.slice(0, 7) === month);
            const monthWeeks = Object.values(weeks).filter(w => w.month === month).sort((a, b) => b.monday.localeCompare(a.monday));
            const redWeeks = monthWeeks.filter(w => w.red).length;
            const redDaysM = monthDays.filter(d => d.red).length;
            const avg = monthDays.length ? monthDays.reduce((t, d) => t + d.shown, 0) / monthDays.length : null;
            const monthRed = redWeeks >= 2;
            const mStatus = !monthWeeks.length ? { t: 'No data', tone: 'gray', sub: 'Log trades on an MT5 calendar to start scoring.' }
                : monthRed ? { t: 'Month Red · Unhealthy', tone: 'red', sub: `${redWeeks} red weeks this month. Stop and fix your process before risking more.` }
                : redWeeks === 1 ? { t: 'Caution', tone: 'amber', sub: '1 red week so far. A second red week turns the month red.' }
                : { t: 'Healthy', tone: 'green', sub: 'No red weeks this month. Keep the routine.' };

            // ---- header + month nav ----
            const header = `
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 class="text-lg font-bold text-white">Psychology</h2>
                    <p class="text-xs text-gray-500">Daily score from your trades, setups and mistakes (all MT5 accounts combined).</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="psyShiftMonth(-1)" class="w-8 h-8 rounded-md border border-aura-border text-gray-400 hover:text-white hover:bg-aura-hover flex items-center justify-center"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                    <span class="text-sm font-mono text-white w-24 text-center">${psyFmtMonth(month)}</span>
                    <button onclick="psyShiftMonth(1)" class="w-8 h-8 rounded-md border border-aura-border text-gray-400 hover:text-white hover:bg-aura-hover flex items-center justify-center"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                </div>
            </div>`;

            // ---- hero ----
            const tile = (l, v, sub, cls) => `<div class="glass-card p-4 rounded-xl border border-aura-border"><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">${l}</div><div class="text-2xl font-bold font-mono mt-2 ${cls || 'text-white'}">${v}</div><div class="text-[11px] text-gray-500 mt-1">${sub}</div></div>`;
            const avgCls = avg === null ? 'text-gray-500' : (avg >= 7 ? 'text-aura-green' : (avg >= 4 ? 'text-aura-amber' : 'text-aura-red'));
            const hero = `
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div class="glass-card p-4 rounded-xl border ${PSY_TONE[mStatus.tone].split(' ').slice(1, 2).join(' ')} col-span-2 lg:col-span-1">
                    <div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">Month status</div>
                    <div class="text-lg font-bold mt-2 ${PSY_TONE[mStatus.tone].split(' ')[0]}">${mStatus.t}</div>
                    <div class="text-[11px] text-gray-500 mt-1">${mStatus.sub}</div>
                </div>
                ${tile('Average score', avg === null ? '—' : avg.toFixed(1) + ' / 10', `${monthDays.length} traded day${monthDays.length === 1 ? '' : 's'}`, avgCls)}
                ${tile('Red days', redDaysM, 'score below 2', redDaysM ? 'text-aura-red' : 'text-white')}
                ${tile('Red weeks', redWeeks + ' / 2', '3 red days = red week · 2 red weeks = red month', redWeeks ? (monthRed ? 'text-aura-red' : 'text-aura-amber') : 'text-white')}
            </div>`;

            // ---- rules card ----
            const numIn = (k, v) => `<input type="number" min="1" value="${v}" onchange="psySetSetting('${k}', this.value)" class="w-14 bg-aura-bg border border-aura-border rounded px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-blue-500/50">`;
            const rule = (pts, txt) => `<div class="flex items-center gap-2 text-xs"><span class="w-9 text-center px-1 py-0.5 rounded text-[10px] font-mono font-bold border ${pts ? PSY_TONE.red : PSY_TONE.green}">${pts || '10'}</span><span class="text-gray-300">${txt}</span></div>`;
            const rulesCard = `
            <div class="glass-card p-5 rounded-xl border border-aura-border space-y-3">
                <div class="flex items-center justify-between"><h3 class="text-sm font-bold text-white">How the score works</h3><span class="text-[10px] font-mono text-gray-500">per traded day</span></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                    ${rule(0, 'Every traded day starts with 10 points')}
                    <div class="flex items-center gap-2 text-xs"><span class="w-9 text-center px-1 py-0.5 rounded text-[10px] font-mono font-bold border ${PSY_TONE.red}">-3</span><span class="text-gray-300 flex items-center gap-1.5 flex-wrap">Overtrading: more than ${numIn('maxTrades', S.maxTrades)} trades in a day</span></div>
                    <div class="flex items-center gap-2 text-xs"><span class="w-9 text-center px-1 py-0.5 rounded text-[10px] font-mono font-bold border ${PSY_TONE.red}">-5</span><span class="text-gray-300 flex items-center gap-1.5 flex-wrap">Mistakes: ${numIn('mistakeLimit', S.mistakeLimit)} or more mistakes logged in a day</span></div>
                    ${rule('-2', '2 or more B / B+ setups in a day')}
                    ${rule('-2', '3 or more A / A+ setups in a day')}
                    <div class="flex items-center gap-2 text-xs"><span class="w-9 text-center px-1 py-0.5 rounded text-[10px] font-mono font-bold border ${PSY_TONE.red}">RED</span><span class="text-gray-300">Score below 2 = Red Day · 3 Red Days in a week = Red Week · 2 Red Weeks in a month = Red Month</span></div>
                </div>
                <p class="text-[10px] text-gray-500">A mistake = one line in a trade's Mistakes box (separate mistakes with a new line or ;). Only trades marked "My setup" with a grade count for setup rules.</p>
            </div>`;

            // ---- weeks ----
            let weeksHtml;
            if (!monthWeeks.length) {
                weeksHtml = `<div class="glass-card rounded-xl border border-dashed border-aura-border p-8 text-center"><div class="text-sm font-semibold text-white">No trades in ${psyFmtMonth(month)}</div><div class="text-xs text-gray-500 mt-1">Log trades on an MT5 calendar and each day gets scored automatically.</div></div>`;
            } else {
                weeksHtml = monthWeeks.map(w => {
                    const end = new Date(w.monday + 'T00:00:00'); end.setDate(end.getDate() + 6);
                    const tone = w.red ? 'red' : (w.redDays === 2 ? 'amber' : 'green');
                    const rows = w.days.slice().sort((a, b) => b.date.localeCompare(a.date)).map(d => {
                        const dt = d.red ? 'red' : (d.score < 6 ? 'amber' : 'green');
                        const bar = `<div class="h-1.5 rounded-full bg-aura-hover overflow-hidden mt-1.5"><div class="h-full ${d.red ? 'bg-aura-red' : (d.score < 6 ? 'bg-aura-amber' : 'bg-aura-green')}" style="width:${d.shown * 10}%"></div></div>`;
                        const chips = d.items.length ? d.items.map(i => `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono border ${PSY_TONE.red}">${i.pts} ${escapeHtml(i.txt)}</span>`).join('') : `<span class="text-[10px] text-gray-500">Clean day, no deductions</span>`;
                        const mk = d.mistakes.length ? `<ul class="mt-1.5 space-y-0.5">${d.mistakes.map(x => `<li class="text-[11px] text-gray-400">• ${escapeHtml(x.text)}</li>`).join('')}</ul>` : '';
                        return `<div class="p-3 rounded-lg border border-aura-border bg-aura-bg">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap"><span class="text-xs font-semibold text-white">${psyFmtDay(d.date)}</span><span class="text-[10px] font-mono text-gray-500">${d.n} trade${d.n === 1 ? '' : 's'} · <span class="${d.pnl >= 0 ? 'text-aura-green' : 'text-aura-red'}">${fxSigned(d.pnl)}</span></span>${d.red ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${PSY_TONE.red}">RED DAY</span>` : ''}</div>
                                    ${bar}
                                    <div class="flex flex-wrap gap-1.5 mt-2">${chips}</div>${mk}
                                </div>
                                <div class="text-right shrink-0"><div class="text-xl font-bold font-mono ${PSY_TONE[dt].split(' ')[0]}">${d.shown}</div><div class="text-[9px] font-mono text-gray-500">/ 10</div></div>
                            </div></div>`;
                    }).join('');
                    return `<div class="glass-card p-4 rounded-xl border ${w.red ? 'border-aura-red/40' : 'border-aura-border'} space-y-3">
                        <div class="flex items-center justify-between gap-2 flex-wrap">
                            <div class="text-sm font-semibold text-white">Week ${psyFmtDay(w.monday)} – ${psyFmtDay(psyKey(end))}</div>
                            <div class="flex items-center gap-2"><span class="text-[10px] font-mono text-gray-500">${w.redDays} / 3 red days</span><span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${PSY_TONE[tone]}">${w.red ? 'WEEK RED' : (w.redDays === 2 ? 'ONE MORE = RED' : 'OK')}</span></div>
                        </div>
                        <div class="space-y-2">${rows}</div></div>`;
                }).join('');
            }

            // ---- mistakes summary + fix points ----
            const mScopeDays = psyState.mistakeScope === 'all' ? days : monthDays;
            const sum = psyMistakeSummary(mScopeDays);
            const totalM = sum.reduce((t, c) => t + c.count, 0) || 1;
            const fixDone = psyLoadFixDone();
            const scopeBtn = (id, l) => `<button onclick="psySetMistakeScope('${id}')" class="px-2.5 py-1 rounded text-[10px] font-mono border transition ${psyState.mistakeScope === id ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-aura-border bg-aura-bg text-gray-400 hover:text-white'}">${l}</button>`;
            let mistakesHtml;
            if (!sum.length) {
                mistakesHtml = `<p class="text-xs text-gray-500">No mistakes logged ${psyState.mistakeScope === 'all' ? 'yet' : 'this month'}. Write what went wrong in a trade's Mistakes box and it shows up here with fix points.</p>`;
            } else {
                mistakesHtml = sum.map((c, idx) => {
                    const cat = PSY_CATS[c.key]; const top = idx < 3 && c.key !== 'other';
                    const pct = Math.round(c.count / totalM * 100);
                    const fixes = cat.fixes.map((f, i) => {
                        const key = c.key + ':' + i; const done = !!fixDone[key];
                        return `<label class="flex items-start gap-2 text-[11px] cursor-pointer ${done ? 'text-gray-500 line-through' : 'text-gray-300'}"><input type="checkbox" ${done ? 'checked' : ''} onchange="psyToggleFix('${key}')" class="mt-0.5 accent-blue-600 shrink-0"><span>${escapeHtml(f)}</span></label>`;
                    }).join('');
                    const recent = c.entries.slice(-3).reverse().map(e => `<div class="text-[10px] text-gray-500 font-mono truncate">${e.date} · ${escapeHtml(e.text)}</div>`).join('');
                    return `<div class="p-3 rounded-lg border ${top ? 'border-aura-red/30' : 'border-aura-border'} bg-aura-bg space-y-2.5">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0"><span class="text-xs font-semibold text-white truncate">${cat.label}</span>${top ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${PSY_TONE.red}">FIX FIRST</span>` : ''}</div>
                            <span class="text-xs font-mono text-white shrink-0">${c.count}× <span class="text-gray-500">${pct}%</span></span>
                        </div>
                        <div class="h-1.5 rounded-full bg-aura-hover overflow-hidden"><div class="h-full ${top ? 'bg-aura-red' : 'bg-aura-amber'}" style="width:${pct}%"></div></div>
                        <div class="space-y-1.5">${fixes}</div>
                        <div class="space-y-0.5 pt-1 border-t border-aura-border">${recent}</div>
                    </div>`;
                }).join('');
            }
            const mistakesCard = `
            <div class="glass-card p-5 rounded-xl border border-aura-border space-y-4">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div><h3 class="text-sm font-bold text-white">Mistakes summary & fix points</h3><p class="text-[11px] text-gray-500">Grouped from your trade Mistakes fields. Tick a point when you have made it part of your routine.</p></div>
                    <div class="flex items-center gap-1.5">${scopeBtn('month', 'This month')}${scopeBtn('all', 'All time')}</div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">${mistakesHtml}</div>
            </div>`;

            // ---- setup quality ----
            const sTrades = mScopeDays.flatMap(d => d.trades);
            const g = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0 }; let notMine = 0, untagged = 0;
            sTrades.forEach(t => { if (t.isMySetup && g[t.setupGrade] !== undefined) g[t.setupGrade]++; else if (t.isMySetup === false) notMine++; else untagged++; });
            const gCard = (k) => `<div class="bg-aura-bg p-3 rounded-lg border border-aura-border text-center"><div class="text-[10px] font-mono text-gray-500">${k} setups</div><div class="text-xl font-bold font-mono mt-1 ${k.charAt(0) === 'A' ? 'text-aura-green' : 'text-aura-amber'}">${g[k]}</div></div>`;
            const setupCard = `
            <div class="glass-card p-5 rounded-xl border border-aura-border space-y-3">
                <h3 class="text-sm font-bold text-white">Setup quality <span class="text-gray-500 font-normal text-xs">· ${psyState.mistakeScope === 'all' ? 'all time' : psyFmtMonth(month)}</span></h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${['A+', 'A', 'B+', 'B'].map(gCard).join('')}</div>
                <div class="flex items-center gap-4 text-[11px] font-mono text-gray-500"><span>Not my setup: <span class="${notMine ? 'text-aura-red' : 'text-gray-300'}">${notMine}</span></span><span>Not tagged: <span class="text-gray-300">${untagged}</span></span></div>
            </div>`;

            host.innerHTML = header + hero + rulesCard + `<div class="grid grid-cols-1 xl:grid-cols-3 gap-6"><div class="xl:col-span-2 space-y-4">${weeksHtml}</div><div class="space-y-6">${setupCard}</div></div>` + mistakesCard;
            renderPsychologyCompliance();
            renderIcons();
        }

        // Dropped accounts should not linger as links on strategies
        function pruneStrategyAccountLinks() {
            const ids = new Set(tradelyAccounts.map(a => a.id));
            let changed = false;
            tradelyStrategies.forEach(s => {
                const kept = (s.accountIds || []).filter(id => ids.has(id));
                if (kept.length !== (s.accountIds || []).length) { s.accountIds = kept; changed = true; }
            });
            if (changed) saveStrategies();
        }

        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            if (!document.getElementById('delete-strategy-modal').classList.contains('hidden')) closeDeleteStrategyModal();
            else if (!document.getElementById('strategy-modal').classList.contains('hidden')) closeStrategyModal();
        });


        /* ==================== BINARY ACCOUNT — FULL DETAIL PAGE ==================== */
        let baState = { accountId: null, statsPeriod: 'all', periodRange: null, heatmapYear: new Date().getFullYear(), editingDateKey: null, fundsType: 'deposit', editingFundId: null };
        // Traded Days accordion: which day rows are expanded, the last computed stats (so
        // expand/collapse + inline trade edits can re-render just this list), and the inline
        // "add/edit individual trade" form state (which day it's open under, and which trade id).
        let baExpandedDays = new Set();
        let baLastStats = null;
        let baTradeFormState = null; // { dateKey, editId, screenshot }
        let baCharts = { equity: null, drawdown: null, winloss: null, monthly: null };
        const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // NOTE: this is intentionally the SAME key the Calendar tab uses for a binary account's
        // per-day entries (see getCalendarStorageKey()). They used to be two separate stores, which
        // meant trades logged from the Calendar never showed up in this account's own Stats page.
        // Keeping one shared key per account means every trade you log — from the Calendar or from
        // this account's own "Log Day" form — updates this account's stats everywhere, immediately.
        function baDaysKey(id) { return 'tradely_calendar_entries_binary_' + id; }
        function baFundsKey(id) { return 'tradely_acc_funds_' + id; }
        function baTargetsKey(id) { return 'tradely_acc_targets_' + id; }

        function baLoadDays(id) {
            try { const raw = localStorage.getItem(baDaysKey(id)); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
        }
        function baSaveDays(id, days) {
            try { localStorage.setItem(baDaysKey(id), JSON.stringify(days)); } catch (e) {}
        }
        function baLoadFunds(id) {
            try { const raw = localStorage.getItem(baFundsKey(id)); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
        }
        function baSaveFunds(id, funds) {
            try { localStorage.setItem(baFundsKey(id), JSON.stringify(funds)); } catch (e) {}
        }
        function baLoadTargets(id) {
            try { const raw = localStorage.getItem(baTargetsKey(id)); return raw ? JSON.parse(raw) : { monthly: null, daily: null, winrate: null }; } catch (e) { return { monthly: null, daily: null, winrate: null }; }
        }
        function baSaveTargetsData(id, targets) {
            try { localStorage.setItem(baTargetsKey(id), JSON.stringify(targets)); } catch (e) {}
        }

        function getAccountById(id) { return tradelyAccounts.find(a => a.id === id); }

        // Weekly win rate: group traded days into Monday-start weeks (same as the Calendar), add up each
        // week's PnL, and count a week as a win when its net PnL is in profit (same ±$2 break-even band as days).
        function baWeeklyStats(daysObj, dateKeys) {
            const weeks = {};
            dateKeys.forEach(k => {
                const d = new Date(k + 'T00:00:00');
                const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
                const wk = toDateKey(monday);
                weeks[wk] = (weeks[wk] || 0) + (Number(daysObj[k].pnl) || 0);
            });
            const vals = Object.values(weeks);
            const tradedWeeks = vals.length;
            const winWeeks = vals.filter(v => getPnlBand(v) === 'profit').length;
            const lossWeeks = vals.filter(v => getPnlBand(v) === 'loss').length;
            return { tradedWeeks, winWeeks, lossWeeks, winRateWeeks: tradedWeeks > 0 ? (winWeeks / tradedWeeks) * 100 : 0 };
        }

        // Computes the complete performance-stats object for a binary account from its logged days + funds.
        function computeAccountStats(accountId, startingBalance) {
            startingBalance = Number(startingBalance) || 0;
            const daysObj = baLoadDays(accountId);
            const funds = baLoadFunds(accountId);
            const dateKeys = Object.keys(daysObj).sort(); // ascending

            let totalPnl = 0, totalTrades = 0, totalWins = 0, totalRefunds = 0;
            let bestDay = null, worstDay = null;
            let sumPositive = 0, sumNegative = 0, winDays = 0, lossDays = 0, beDays = 0;
            const monthly = {}; // 'YYYY-MM' -> {pnl, trades, wins, losses}
            const weekday = WEEKDAY_NAMES.map(() => ({ pnl: 0, trades: 0, wins: 0, days: 0 }));

            dateKeys.forEach(k => {
                const e = daysObj[k];
                const pnl = Number(e.pnl) || 0;
                const trades = Number(e.trades) || 0;
                const wins = Number(e.wins) || 0;
                const refunds = Number(e.refunds) || 0;
                totalPnl += pnl;
                totalTrades += trades;
                totalWins += wins;
                totalRefunds += refunds;
                if (bestDay === null || pnl > bestDay.pnl) bestDay = { date: k, pnl };
                if (worstDay === null || pnl < worstDay.pnl) worstDay = { date: k, pnl };
                if (pnl > 2) { winDays++; sumPositive += pnl; } else if (pnl < -2) { lossDays++; sumNegative += pnl; } else { beDays++; }

                const mKey = k.slice(0, 7);
                if (!monthly[mKey]) monthly[mKey] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
                monthly[mKey].pnl += pnl;
                monthly[mKey].trades += trades;
                monthly[mKey].wins += wins;
                monthly[mKey].losses += Math.max(0, trades - wins - refunds);

                const wd = new Date(k + 'T00:00:00').getDay();
                weekday[wd].pnl += pnl;
                weekday[wd].trades += trades;
                weekday[wd].wins += wins;
                weekday[wd].days += 1;
            });

            const tradedDays = dateKeys.length;
            const totalLosses = Math.max(0, totalTrades - totalWins - totalRefunds);
            const winRateDays = tradedDays > 0 ? (winDays / tradedDays) * 100 : 0;
            const tradeWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;
            const profitFactor = sumNegative < 0 ? (sumPositive / Math.abs(sumNegative)) : (sumPositive > 0 ? Infinity : 0);
            const avgDailyPnl = tradedDays > 0 ? totalPnl / tradedDays : 0;
            const avgWin = winDays > 0 ? sumPositive / winDays : 0;
            const avgLoss = lossDays > 0 ? sumNegative / lossDays : 0;

            // Equity curve + drawdown
            let running = startingBalance, peak = startingBalance, maxDrawdown = 0, maxDrawdownPct = 0;
            const equityCurve = [{ date: null, equity: startingBalance }];
            const drawdownSeries = [];
            dateKeys.forEach(k => {
                running += Number(daysObj[k].pnl) || 0;
                if (running > peak) peak = running;
                const dd = peak - running;
                const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
                if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownPct = ddPct; }
                equityCurve.push({ date: k, equity: running });
                drawdownSeries.push({ date: k, ddPct: -ddPct });
            });
            const netBalance = running;

            // Streaks (based on chronological win/loss/be per day)
            let currentStreak = 0, currentStreakType = null;
            let bestWinStreak = 0, worstLossStreak = 0, curWin = 0, curLoss = 0;
            dateKeys.forEach(k => {
                const band = getPnlBand(Number(daysObj[k].pnl) || 0);
                if (band === 'profit') { curWin++; curLoss = 0; bestWinStreak = Math.max(bestWinStreak, curWin); }
                else if (band === 'loss') { curLoss++; curWin = 0; worstLossStreak = Math.max(worstLossStreak, curLoss); }
                else { curWin = 0; curLoss = 0; }
            });
            for (let i = dateKeys.length - 1; i >= 0; i--) {
                const band = getPnlBand(Number(daysObj[dateKeys[i]].pnl) || 0);
                if (band === 'be') break;
                if (currentStreakType === null) { currentStreakType = band; currentStreak = 1; }
                else if (band === currentStreakType) currentStreak++;
                else break;
            }

            const deposits = funds.filter(f => f.type === 'deposit').reduce((s, f) => s + Number(f.amount || 0), 0);
            const withdrawals = funds.filter(f => f.type === 'withdraw').reduce((s, f) => s + Number(f.amount || 0), 0);

            return {
                daysObj, dateKeys, funds, startingBalance,
                totalPnl, tradedDays, totalTrades, totalWins, totalLosses, totalRefunds,
                winRateDays, tradeWinRate, profitFactor, bestDay, worstDay, avgDailyPnl, avgWin, avgLoss,
                maxDrawdown, maxDrawdownPct, equityCurve, drawdownSeries, netBalance,
                currentStreak, currentStreakType, bestWinStreak, worstLossStreak,
                monthly, weekday, deposits, withdrawals,
                ...baWeeklyStats(daysObj, dateKeys)
            };
        }

        function openBinaryAccountPage(accountId) {
            const acc = getAccountById(accountId);
            if (!acc) return;
            baState.accountId = accountId;
            baState.statsPeriod = 'all';
            baState.periodRange = null;
            baState.heatmapYear = new Date().getFullYear();
            baExpandedDays = new Set();
            baTradeFormState = null;
            document.getElementById('binary-account-page').classList.remove('hidden');
            document.getElementById('binary-account-page').classList.add('flex');
            document.body.style.overflow = 'hidden';
            renderBinaryAccountPage();
            baResetScrollAnimations();
            requestAnimationFrame(() => baInitScrollAnimations());
        }

        // Smooth scroll-reveal for the section cards on the binary account page.
        // Sections fade + slide in as they enter the scrollable viewport; re-armed every time the page opens.
        let baScrollObserver = null;
        function baResetScrollAnimations() {
            const page = document.getElementById('binary-account-page');
            if (!page) return;
            page.querySelectorAll('.ba-anim').forEach(el => el.classList.remove('ba-anim-visible'));
        }
        function baInitScrollAnimations() {
            const page = document.getElementById('binary-account-page');
            if (!page) return;
            if (baScrollObserver) baScrollObserver.disconnect();
            if (typeof IntersectionObserver === 'undefined') {
                page.querySelectorAll('.ba-anim').forEach(el => el.classList.add('ba-anim-visible'));
                return;
            }
            baScrollObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('ba-anim-visible');
                        baScrollObserver.unobserve(entry.target);
                    }
                });
            }, { root: page, threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
            page.querySelectorAll('.ba-anim').forEach(el => baScrollObserver.observe(el));
        }

        function closeBinaryAccountPage() {
            const page = document.getElementById('binary-account-page');
            page.classList.add('hidden');
            page.classList.remove('flex');
            document.body.style.overflow = '';
            baState.accountId = null;
            if (baScrollObserver) { baScrollObserver.disconnect(); baScrollObserver = null; }
        }

        function baStatCard(label, value, valueClass, sub) {
            return `<div class="bg-aura-bg p-3 rounded-lg border border-aura-border">
                <div class="text-[10px] md:text-xs font-mono uppercase tracking-wider text-gray-500">${label}</div>
                <div class="text-base md:text-lg font-bold font-mono ${valueClass || 'text-white'} mt-1">${value}</div>
                ${sub ? `<div class="text-[10px] md:text-xs text-gray-500 mt-0.5">${sub}</div>` : ''}
            </div>`;
        }

        // Period filter buttons shown under the main overview card.
        const BA_PERIODS = [
            { id: 'range', label: 'Range' },
            { id: 'today', label: 'Today' },
            { id: 'all', label: 'All Time' },
            { id: 'month', label: 'Current Month' },
            { id: 'year', label: 'Current Year' },
            { id: 'week', label: 'Current Week' }
        ];

        function renderBaPeriodButtons() {
            const active = baState.statsPeriod || 'all';
            document.getElementById('ba-period-buttons').innerHTML = BA_PERIODS.map(p => {
                const isActive = p.id === active;
                return `<button onclick="baSetStatsPeriod('${p.id}')" class="ba-period-btn px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold border transition ${isActive ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-aura-border text-gray-400 hover:bg-aura-hover'}">${p.label}</button>`;
            }).join('');
        }

        // Resolves a period id into an inclusive {start, end} date-key range, or null for "All Time".
        function baGetPeriodRange(period, customRange) {
            const now = new Date();
            if (period === 'today') {
                const k = toDateKey(now);
                return { start: k, end: k };
            }
            if (period === 'week') {
                const start = baWeekKeyOf(toDateKey(now));
                const endDate = new Date(start + 'T00:00:00');
                endDate.setDate(endDate.getDate() + 6);
                return { start, end: toDateKey(endDate) };
            }
            if (period === 'month') {
                const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return { start, end: toDateKey(lastDay) };
            }
            if (period === 'year') {
                return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
            }
            if (period === 'range') {
                return (customRange && customRange.start && customRange.end) ? customRange : null;
            }
            return null; // 'all'
        }

        // Lightweight period-scoped aggregate — same metrics as computeAccountStats
        // but limited to the given date range (used for the stats grid + main card PnL).
        function computePeriodSummary(accountId, range) {
            const daysObj = baLoadDays(accountId);
            const funds = baLoadFunds(accountId);
            let dateKeys = Object.keys(daysObj).sort();
            if (range) dateKeys = dateKeys.filter(k => k >= range.start && k <= range.end);

            let totalPnl = 0, totalTrades = 0, totalWins = 0, totalRefunds = 0;
            let bestDay = null, worstDay = null;
            let sumPositive = 0, sumNegative = 0, winDays = 0, lossDays = 0;

            dateKeys.forEach(k => {
                const e = daysObj[k];
                const pnl = Number(e.pnl) || 0;
                const trades = Number(e.trades) || 0;
                const wins = Number(e.wins) || 0;
                const refunds = Number(e.refunds) || 0;
                totalPnl += pnl; totalTrades += trades; totalWins += wins; totalRefunds += refunds;
                if (bestDay === null || pnl > bestDay.pnl) bestDay = { date: k, pnl };
                if (worstDay === null || pnl < worstDay.pnl) worstDay = { date: k, pnl };
                if (pnl > 2) { winDays++; sumPositive += pnl; } else if (pnl < -2) { lossDays++; sumNegative += pnl; }
            });

            const tradedDays = dateKeys.length;
            const totalLosses = Math.max(0, totalTrades - totalWins - totalRefunds);
            const winRateDays = tradedDays > 0 ? (winDays / tradedDays) * 100 : 0;
            const tradeWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;
            const profitFactor = sumNegative < 0 ? (sumPositive / Math.abs(sumNegative)) : (sumPositive > 0 ? Infinity : 0);
            const avgDailyPnl = tradedDays > 0 ? totalPnl / tradedDays : 0;
            const avgWin = winDays > 0 ? sumPositive / winDays : 0;
            const avgLoss = lossDays > 0 ? sumNegative / lossDays : 0;

            let currentStreak = 0, currentStreakType = null, bestWinStreak = 0, worstLossStreak = 0, curWin = 0, curLoss = 0;
            dateKeys.forEach(k => {
                const band = getPnlBand(Number(daysObj[k].pnl) || 0);
                if (band === 'profit') { curWin++; curLoss = 0; bestWinStreak = Math.max(bestWinStreak, curWin); }
                else if (band === 'loss') { curLoss++; curWin = 0; worstLossStreak = Math.max(worstLossStreak, curLoss); }
                else { curWin = 0; curLoss = 0; }
            });
            for (let i = dateKeys.length - 1; i >= 0; i--) {
                const band = getPnlBand(Number(daysObj[dateKeys[i]].pnl) || 0);
                if (band === 'be') break;
                if (currentStreakType === null) { currentStreakType = band; currentStreak = 1; }
                else if (band === currentStreakType) currentStreak++;
                else break;
            }

            // Max drawdown within the period, walked from a zero baseline (period-relative, not account-wide).
            let running = 0, peak = 0, maxDrawdown = 0;
            dateKeys.forEach(k => {
                running += Number(daysObj[k].pnl) || 0;
                if (running > peak) peak = running;
                const dd = peak - running;
                if (dd > maxDrawdown) maxDrawdown = dd;
            });

            const periodFunds = range ? funds.filter(f => f.date >= range.start && f.date <= range.end) : funds;
            const deposits = periodFunds.filter(f => f.type === 'deposit').reduce((s, f) => s + Number(f.amount || 0), 0);
            const withdrawals = periodFunds.filter(f => f.type === 'withdraw').reduce((s, f) => s + Number(f.amount || 0), 0);

            return {
                dateKeys, tradedDays, totalPnl, totalTrades, totalWins, totalLosses, totalRefunds,
                winRateDays, tradeWinRate, profitFactor, bestDay, worstDay, avgDailyPnl, avgWin, avgLoss,
                maxDrawdown, currentStreak, currentStreakType, bestWinStreak, worstLossStreak,
                deposits, withdrawals,
                ...baWeeklyStats(daysObj, dateKeys)
            };
        }

        function baSetStatsPeriod(period) {
            if (period === 'range') {
                baOpenRangeModal();
                return;
            }
            baState.statsPeriod = period;
            baState.periodRange = null;
            renderBinaryAccountPage();
        }

        function baOpenRangeModal() {
            const r = baState.periodRange;
            const now = new Date();
            const defaultStart = new Date(now);
            defaultStart.setDate(defaultStart.getDate() - 29);
            document.getElementById('ba-range-start').value = (r && r.start) || toDateKey(defaultStart);
            document.getElementById('ba-range-end').value = (r && r.end) || toDateKey(now);
            document.getElementById('ba-range-error').classList.add('hidden');
            const modal = document.getElementById('ba-range-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function baCloseRangeModal() {
            const modal = document.getElementById('ba-range-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function baApplyRangeModal() {
            const start = document.getElementById('ba-range-start').value;
            const end = document.getElementById('ba-range-end').value;
            const errorEl = document.getElementById('ba-range-error');
            if (!start || !end) {
                errorEl.textContent = 'Pick both a start and end date.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (start > end) {
                errorEl.textContent = 'Start date must be before end date.';
                errorEl.classList.remove('hidden');
                return;
            }
            errorEl.classList.add('hidden');
            baState.statsPeriod = 'range';
            baState.periodRange = { start, end };
            baCloseRangeModal();
            renderBinaryAccountPage();
        }

        function baRenderMainCard(stats, period) {
            const p = period || stats;
            const pnlColor = p.totalPnl > 0 ? 'text-aura-green' : (p.totalPnl < 0 ? 'text-aura-red' : 'text-white');
            document.getElementById('ba-main-current-balance').textContent = formatMoney(stats.netBalance);
            const pnlEl = document.getElementById('ba-main-total-pnl');
            pnlEl.textContent = formatMoney(p.totalPnl);
            pnlEl.className = 'text-3xl md:text-4xl font-bold font-mono mt-2 ' + pnlColor;
            document.getElementById('ba-main-starting-balance').textContent = formatMoney(stats.startingBalance);
        }

        // Strategy and Rules card on the binary account page: shows every strategy linked to this account.
        // On wide screens the card is pinned to the Equity Curve card's height and scrolls inside, so a long
        // list of rules never stretches the row.
        function baRenderStrategyPanel() {
            const panel = document.getElementById('ba-strategy-panel');
            if (!panel || !baState.accountId) return;
            const linked = tradelyStrategies.filter(st => (st.accountIds || []).includes(baState.accountId));
            const body = linked.length ? linked.map((st, idx) => `
                <div class="${idx ? 'pt-4 mt-4 border-t border-aura-border' : ''} space-y-3">
                    <div>
                        <div class="text-sm font-bold text-white">${escapeHtml(st.name)}</div>
                        ${st.description ? `<p class="text-xs text-gray-400 leading-relaxed mt-1 whitespace-pre-line">${escapeHtml(st.description)}</p>` : ''}
                    </div>
                    ${st.steps.length ? `<div>
                        <div class="text-[11px] font-semibold text-gray-300 mb-1.5">Steps</div>
                        <ol class="space-y-1.5">${st.steps.map((x, i) => `<li class="flex gap-2 text-xs text-gray-300"><span class="text-gray-500 font-mono shrink-0">${i + 1}.</span><span>${escapeHtml(x)}</span></li>`).join('')}</ol>
                    </div>` : ''}
                    ${st.rules.length ? `<div>
                        <div class="text-[11px] font-semibold text-gray-300 mb-1.5">Rules</div>
                        <ul class="space-y-1.5">${st.rules.map(x => `<li class="flex gap-2 text-xs text-gray-300"><i data-lucide="check" class="w-3.5 h-3.5 text-aura-green shrink-0 mt-0.5"></i><span>${escapeHtml(x)}</span></li>`).join('')}</ul>
                    </div>` : ''}
                    ${Object.keys(st.limits || {}).length ? `<div>
                        <div class="text-[11px] font-semibold text-gray-300 mb-1.5">Daily limits</div>
                        <ul class="space-y-1">${STRATEGY_LIMITS.filter(l => st.limits[l.key]).map(l => `<li class="flex justify-between gap-2 text-xs"><span class="text-gray-400">${l.label}</span><span class="text-white font-mono">${l.unit === '$' ? '$' : ''}${st.limits[l.key]}</span></li>`).join('')}</ul>
                        ${strategyComplianceLineHTML(st, baState.accountId)}
                    </div>` : ''}
                </div>`).join('')
                : `<div class="h-full flex flex-col items-center justify-center text-center py-10">
                        <p class="text-sm text-gray-400">No strategy linked to this account.</p>
                        <p class="text-xs text-gray-600 mt-1">Link one from Strategies &amp; Rules.</p>
                   </div>`;
            panel.innerHTML = `
                <div class="glass-card p-4 md:p-5 rounded-xl border border-aura-border flex flex-col max-h-[32rem] xl:max-h-none xl:absolute xl:inset-0">
                    <h2 class="text-base font-bold text-white flex items-center gap-2 shrink-0"><i data-lucide="shield-check" class="w-5 h-5 text-blue-400"></i> Strategy and Rules${linked.length ? `<span class="text-[10px] font-mono text-gray-500 font-normal">${linked.length}</span>` : ''}</h2>
                    <div class="mt-3 flex-1 min-h-0 overflow-y-auto pr-1">${body}</div>
                </div>`;
            renderIcons();
        }

        function renderBinaryAccountPage() {
            const id = baState.accountId;
            const acc = getAccountById(id);
            if (!acc) return;
            baRenderStrategyPanel();
            const stats = computeAccountStats(id, acc.startingBalance || 0); // all-time — drives balance + charts
            baLastStats = stats;
            const range = baGetPeriodRange(baState.statsPeriod || 'all', baState.periodRange);
            const period = range ? computePeriodSummary(id, range) : stats; // period-scoped — drives PnL + stats grid

            document.getElementById('ba-header-icon').innerHTML = providerIconHTML(acc.provider, 36);
            document.getElementById('ba-header-name').textContent = acc.nickname || acc.name;
            document.getElementById('ba-header-sub').textContent = `${acc.provider ? acc.provider.name : '—'} · Binary Account`;
            const modeEl = document.getElementById('ba-header-mode');
            modeEl.textContent = acc.mode === 'real' ? 'REAL' : 'DEMO';
            modeEl.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ' + (acc.mode === 'real' ? 'bg-aura-green/10 text-aura-green border-aura-green/20' : 'bg-aura-hover text-gray-400 border-aura-border');

            baRenderMainCard(stats, period);
            renderBaPeriodButtons();

            const periodLabelMap = { range: 'Range', today: 'Today', all: 'All Time', month: 'Current Month', year: 'Current Year', week: 'Current Week' };
            let subtitleLabel = periodLabelMap[baState.statsPeriod || 'all'];
            if (baState.statsPeriod === 'range' && baState.periodRange) {
                subtitleLabel = `${baState.periodRange.start} → ${baState.periodRange.end}`;
            }
            document.getElementById('ba-stats-subtitle').textContent = `${subtitleLabel} · ${period.tradedDays} traded days`;

            const pnlColor = period.totalPnl > 0 ? 'text-aura-green' : (period.totalPnl < 0 ? 'text-aura-red' : 'text-white');
            const bestColor = period.bestDay && period.bestDay.pnl >= 0 ? 'text-aura-green' : 'text-aura-red';
            const worstColor = period.worstDay && period.worstDay.pnl >= 0 ? 'text-aura-green' : 'text-aura-red';
            const streakLabel = period.currentStreakType === 'profit' ? 'win streak' : (period.currentStreakType === 'loss' ? 'loss streak' : '—');
            const streakVal = period.currentStreak > 0 ? `${period.currentStreakType === 'profit' ? '+' : '-'}${period.currentStreak} ${period.currentStreakType === 'profit' ? 'W' : 'L'}` : '—';

            document.getElementById('ba-stats-grid').innerHTML = [
                baStatCard('Total PNL', formatMoney(period.totalPnl), pnlColor, `${period.tradedDays} traded days`),
                baStatCard('Traded Days', period.tradedDays),
                baStatCard('Total Trades', period.totalTrades),
                baStatCard('Total Wins', period.totalWins, 'text-aura-green'),
                baStatCard('Total Losses', period.totalLosses, 'text-aura-red'),
                baStatCard('Total Refunds', period.totalRefunds || '—'),
                baStatCard('Win Rate (Days)', Math.round(period.winRateDays) + '%'),
                baStatCard('Win Rate (Trades)', period.tradeWinRate === null ? '—' : Math.round(period.tradeWinRate) + '%', null, period.totalTrades === 0 ? '0 trades' : `${period.totalWins}/${period.totalTrades} trades`),
                baStatCard('Win Rate (Weekly)', period.tradedWeeks > 0 ? Math.round(period.winRateWeeks) + '%' : '—', null, period.tradedWeeks === 0 ? '0 weeks' : `${period.winWeeks}/${period.tradedWeeks} weeks`),
                baStatCard('Profit Factor', isFinite(period.profitFactor) ? period.profitFactor.toFixed(2) : '∞'),
                baStatCard('Best Day', period.bestDay ? formatMoney(period.bestDay.pnl) : '—', bestColor),
                baStatCard('Worst Day', period.worstDay ? formatMoney(period.worstDay.pnl) : '—', worstColor),
                baStatCard('Avg Daily PnL', formatMoney(period.avgDailyPnl), period.avgDailyPnl >= 0 ? 'text-aura-green' : 'text-aura-red'),
                baStatCard('Max Drawdown', '-' + formatMoney(period.maxDrawdown).replace('$', '$'), 'text-aura-red'),
                baStatCard('Avg Win', formatMoney(period.avgWin), 'text-aura-green', 'per day'),
                baStatCard('Avg Loss', formatMoney(period.avgLoss), 'text-aura-red', 'per day'),
                baStatCard('Deposits', period.deposits ? formatMoney(period.deposits) : '—'),
                baStatCard('Withdrawals', period.withdrawals ? formatMoney(period.withdrawals) : '—'),
                baStatCard('Net Balance', formatMoney(stats.netBalance), 'text-white', 'Start ' + formatMoney(stats.startingBalance)),
                baStatCard('Current Streak', streakVal, period.currentStreakType === 'profit' ? 'text-aura-green' : (period.currentStreakType === 'loss' ? 'text-aura-red' : 'text-white'), streakLabel),
                baStatCard('Best Win Streak', period.bestWinStreak + ' days', 'text-aura-green'),
                baStatCard('Worst Loss Streak', period.worstLossStreak + ' days', 'text-aura-red')
            ].join('');

            renderBaTargetsPanel(stats);
            renderBaEquityChart(stats);
            renderBaHeatmap(stats);
            renderBaDrawdownChart(stats);
            renderBaDayOfWeek(stats);
            renderBaWinLossChart(stats);
            renderBaMonthlyChart(stats);
            renderBaTradedDaysList(stats);
            renderBaFundsHistory(stats);
            renderIcons();
        }

        function renderBaTargetsPanel(stats) {
            const targets = baLoadTargets(baState.accountId);
            const now = new Date();
            const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const monthPnl = (stats.monthly[curMonthKey] && stats.monthly[curMonthKey].pnl) || 0;
            const hasAny = targets.monthly || targets.daily || targets.winrate;

            let progressHtml = '';
            if (targets.monthly) {
                const pct = Math.max(0, Math.min(100, (monthPnl / targets.monthly) * 100));
                progressHtml = `
                    <div class="mt-3">
                        <div class="flex justify-between text-xs font-mono mb-1">
                            <span class="text-gray-400">This month: ${formatMoney(monthPnl)}</span>
                            <span class="text-gray-500">Target: ${formatMoney(targets.monthly)}</span>
                        </div>
                        <div class="w-full h-2 rounded-full bg-aura-hover overflow-hidden">
                            <div class="h-full ${monthPnl >= 0 ? 'bg-aura-green' : 'bg-aura-red'} rounded-full" style="width:${pct}%"></div>
                        </div>
                    </div>`;
            }

            document.getElementById('ba-targets-panel').innerHTML = `
                <div class="glass-card p-4 md:p-5 rounded-xl border border-aura-border h-full">
                    <div class="flex items-center justify-between">
                        <h2 class="text-base font-bold text-white flex items-center gap-2"><i data-lucide="target" class="w-5 h-5 text-blue-400"></i> Targets</h2>
                        <button onclick="baOpenTargetsModal()" class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button>
                    </div>
                    ${hasAny ? `
                    <div class="grid grid-cols-2 gap-2.5 mt-3 font-mono">
                        ${targets.monthly ? `<div class="bg-aura-bg p-3 rounded-lg border border-aura-border"><div class="text-[10px] md:text-xs uppercase tracking-wider text-gray-500">Monthly Target</div><div class="text-base font-bold text-white mt-1">${formatMoney(targets.monthly)}</div></div>` : ''}
                        ${targets.daily ? `<div class="bg-aura-bg p-3 rounded-lg border border-aura-border"><div class="text-[10px] md:text-xs uppercase tracking-wider text-gray-500">Daily Target</div><div class="text-base font-bold text-white mt-1">${formatMoney(targets.daily)}</div></div>` : ''}
                        ${targets.winrate ? `<div class="bg-aura-bg p-3 rounded-lg border border-aura-border"><div class="text-[10px] md:text-xs uppercase tracking-wider text-gray-500">Win Rate Target</div><div class="text-base font-bold text-white mt-1">${targets.winrate}%</div></div>` : ''}
                    </div>
                    ${progressHtml}` : `<p class="text-sm text-gray-500 mt-2">No targets set yet. Click Edit to set a monthly / daily PnL or win-rate goal.</p>`}
                </div>`;
        }

        function baWeekKeyOf(dateStr) {
            const d = new Date(dateStr + 'T00:00:00');
            const day = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - ((day + 6) % 7));
            return toDateKey(monday);
        }

        function baChartOpts(extra) {
            return Object.assign({
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#6b7280', font: { size: 9 } }, grid: { color: 'rgba(31,36,48,0.6)' } },
                    y: { ticks: { color: '#6b7280', font: { size: 9 } }, grid: { color: 'rgba(31,36,48,0.6)' } }
                }
            }, extra || {});
        }

        function renderBaEquityChart(stats) {
            const el = document.getElementById('ba-equity-chart');
            document.getElementById('ba-equity-subtitle').textContent = `${stats.tradedDays} traded days`;
            const labels = stats.equityCurve.map(p => p.date || 'Start');
            const data = stats.equityCurve.map(p => p.equity);
            if (baCharts.equity) baCharts.equity.destroy();
            baCharts.equity = new Chart(el, {
                type: 'line',
                data: { labels, datasets: [{ data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0, stepped: false,
                    pointRadius: 4, pointHoverRadius: 7, pointHitRadius: 12, pointBackgroundColor: '#3b82f6', pointBorderColor: '#0b0e14', pointBorderWidth: 1.5,
                    pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#3b82f6', pointHoverBorderWidth: 2, borderWidth: 2 }] },
                options: baChartOpts({
                    interaction: { mode: 'nearest', intersect: true },
                    plugins: { legend: { display: false }, tooltip: {
                        backgroundColor: 'rgba(15,18,25,0.97)', borderColor: '#2a3142', borderWidth: 1, padding: 12, displayColors: false,
                        titleColor: '#9ca3af', titleFont: { size: 11 }, bodyFont: { size: 12, family: 'monospace' }, bodySpacing: 4,
                        callbacks: {
                            title: items => { const i = items[0].dataIndex; return stats.equityCurve[i].date ? `${stats.equityCurve[i].date}  ·  Trade day #${i}` : 'Starting balance'; },
                            label: ctx => {
                                const i = ctx.dataIndex, bal = ctx.parsed.y;
                                const out = [`Balance: ${formatMoney(bal)}`];
                                if (i > 0) {
                                    const prev = stats.equityCurve[i - 1].equity, ch = bal - prev;
                                    const pct = prev ? (ch / prev) * 100 : 0;
                                    out.push(`Change: ${ch >= 0 ? '+' : '-'}${formatMoney(Math.abs(ch))}`);
                                    out.push(`% Change: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
                                    const start = stats.equityCurve[0].equity, tot = bal - start;
                                    out.push(`Total: ${tot >= 0 ? '+' : '-'}${formatMoney(Math.abs(tot))} (${start ? (tot / start * 100).toFixed(2) : '0.00'}%)`);
                                }
                                return out;
                            }
                        }
                    } }
                })
            });
        }

        function renderBaDrawdownChart(stats) {
            const el = document.getElementById('ba-drawdown-chart');
            document.getElementById('ba-drawdown-subtitle').textContent = `Max drawdown: -${stats.maxDrawdownPct.toFixed(2)}%`;
            const labels = stats.drawdownSeries.map(p => p.date);
            const data = stats.drawdownSeries.map(p => p.ddPct);
            if (baCharts.drawdown) baCharts.drawdown.destroy();
            baCharts.drawdown = new Chart(el, {
                type: 'line',
                data: { labels, datasets: [{ data, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)', fill: true, tension: 0.15, pointRadius: 0, borderWidth: 1.5 }] },
                options: baChartOpts()
            });
        }

        function renderBaWinLossChart(stats) {
            const el = document.getElementById('ba-winloss-chart');
            let win = 0, loss = 0;
            stats.dateKeys.forEach(k => {
                const band = getPnlBand(Number(stats.daysObj[k].pnl) || 0);
                if (band === 'profit') win++; else if (band === 'loss') loss++;
            });
            if (baCharts.winloss) baCharts.winloss.destroy();
            baCharts.winloss = new Chart(el, {
                type: 'doughnut',
                data: { labels: ['Win Days', 'Loss Days'], datasets: [{ data: [win, loss], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
            });
            const total = win + loss;
            const wr = total > 0 ? Math.round((win / total) * 100) : 0;
            document.getElementById('ba-winloss-legend').innerHTML = `
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-aura-green"></span>Win Days (${win})</span>
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-aura-red"></span>Loss Days (${loss})</span>
                <span class="text-white font-bold">${wr}% WR</span>`;
        }

        function renderBaMonthlyChart(stats) {
            const el = document.getElementById('ba-monthly-chart');
            const keys = Object.keys(stats.monthly).sort();
            const labels = keys.map(k => `${MONTH_NAMES[parseInt(k.split('-')[1], 10) - 1]} '${k.split('-')[0].slice(2)}`);
            const data = keys.map(k => stats.monthly[k].pnl);
            const colors = data.map(v => v >= 0 ? '#22c55e' : '#ef4444');
            if (baCharts.monthly) baCharts.monthly.destroy();
            baCharts.monthly = new Chart(el, {
                type: 'bar',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 4 }] },
                options: baChartOpts()
            });
        }

        function renderBaDayOfWeek(stats) {
            const container = document.getElementById('ba-day-of-week');
            const hasAny = stats.weekday.some(w => w.days > 0);
            if (!hasAny) {
                container.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">No trades logged yet.</p>`;
                return;
            }
            const maxAbs = Math.max(1, ...stats.weekday.map(w => Math.abs(w.pnl)));
            container.innerHTML = WEEKDAY_NAMES.map((name, i) => {
                const w = stats.weekday[i];
                const wr = w.trades > 0 ? Math.round((w.wins / w.trades) * 100) : 0;
                const widthPct = Math.round((Math.abs(w.pnl) / maxAbs) * 100);
                const barColor = w.pnl >= 0 ? 'bg-aura-green' : 'bg-aura-red';
                return `<div class="flex items-center gap-2 text-[11px] font-mono">
                    <span class="w-8 text-gray-400">${name}</span>
                    <div class="flex-1 h-2 rounded-full bg-aura-hover overflow-hidden"><div class="h-full ${barColor} rounded-full" style="width:${widthPct}%"></div></div>
                    <span class="w-16 text-right ${w.pnl >= 0 ? 'text-aura-green' : 'text-aura-red'}">${formatMoney(w.pnl)}</span>
                    <span class="w-10 text-right text-gray-500">${w.days ? wr + '%' : '—'}</span>
                </div>`;
            }).join('');
        }

        function baHeatmapPrevYear() { baState.heatmapYear--; renderBaHeatmapOnly(); }
        function baHeatmapNextYear() { baState.heatmapYear++; renderBaHeatmapOnly(); }
        function renderBaHeatmapOnly() {
            const stats = computeAccountStats(baState.accountId, (getAccountById(baState.accountId) || {}).startingBalance || 0);
            renderBaHeatmap(stats);
        }

        function renderBaHeatmap(stats) {
            document.getElementById('ba-heatmap-year').textContent = baState.heatmapYear;
            const yearKeys = stats.dateKeys.filter(k => k.startsWith(String(baState.heatmapYear)));
            const win = yearKeys.filter(k => getPnlBand(Number(stats.daysObj[k].pnl) || 0) === 'profit').length;
            const loss = yearKeys.filter(k => getPnlBand(Number(stats.daysObj[k].pnl) || 0) === 'loss').length;
            const netYear = yearKeys.reduce((s, k) => s + (Number(stats.daysObj[k].pnl) || 0), 0);
            document.getElementById('ba-heatmap-subtitle').textContent = `${yearKeys.length} traded days · ${win} win / ${loss} loss · Net ${formatMoney(netYear)}`;

            const maxAbs = Math.max(1, ...yearKeys.map(k => Math.abs(Number(stats.daysObj[k].pnl) || 0)));
            // Month tiles use the exact same size/typography as the stat cards above (baStatCard).
            document.getElementById('ba-heatmap').innerHTML = MONTH_NAMES.map((name, mi) => {
                const mKey = `${baState.heatmapYear}-${String(mi + 1).padStart(2, '0')}`;
                const mStats = stats.monthly[mKey];
                let textColor = 'text-gray-500', border = 'border-aura-border', bgStyle = '';
                if (mStats && mStats.pnl !== 0) {
                    const alpha = Math.min(0.4, Math.abs(mStats.pnl) / (maxAbs * 4 || 1) + 0.1).toFixed(2);
                    if (mStats.pnl > 0) { textColor = 'text-aura-green'; border = 'border-aura-green/40'; bgStyle = `background:rgba(34,197,94,${alpha});`; }
                    else { textColor = 'text-aura-red'; border = 'border-aura-red/40'; bgStyle = `background:rgba(239,68,68,${alpha});`; }
                }
                return `<div class="${bgStyle ? '' : 'bg-aura-bg'} p-3 rounded-lg border ${border}" style="${bgStyle}">
                    <div class="text-[10px] md:text-xs font-mono uppercase tracking-wider text-gray-500">${name}</div>
                    <div class="text-base md:text-lg font-bold font-mono ${textColor} mt-1">${mStats ? formatMoney(mStats.pnl) : '—'}</div>
                    <div class="text-[10px] md:text-xs text-gray-500 mt-0.5">${mStats ? mStats.trades + ' trade' + (mStats.trades === 1 ? '' : 's') : 'No trades'}</div>
                </div>`;
            }).join('');
        }

        function renderBaTradedDaysList(stats) {
            baLastStats = stats;
            document.getElementById('ba-traded-days-subtitle').textContent = `${stats.tradedDays} days`;
            const container = document.getElementById('ba-traded-days-list');
            if (!stats.dateKeys.length) {
                container.innerHTML = `<div class="text-center py-8 text-xs text-gray-500 border border-dashed border-aura-border rounded-lg">No trade days logged yet. Click "Log Trade Day" to add your first one.</div>`;
                return;
            }
            const sorted = [...stats.dateKeys].sort().reverse();
            container.innerHTML = sorted.map(k => baDayRowHTML(k, stats.daysObj[k])).join('');
            renderIcons();
        }

        // One "Traded Days" row + its (collapsed-by-default) trades panel as adjacent siblings —
        // the CSS uses an adjacent-sibling selector to animate the panel open on `.expanded`.
        function baDayRowHTML(k, e) {
            const pnl = Number(e.pnl) || 0;
            const d = new Date(k + 'T00:00:00');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const mon = MONTH_NAMES[d.getMonth()].toUpperCase();
            const wd = WEEKDAY_NAMES[d.getDay()];
            const pnlColor = pnl > 2 ? 'text-aura-green' : (pnl < -2 ? 'text-aura-red' : 'text-aura-amber');
            const isExpanded = baExpandedDays.has(k);
            const tradeCount = (e.entries || []).length;
            return `<div class="ba-day-row ${isExpanded ? 'expanded' : ''} flex items-center gap-3 bg-aura-bg hover:bg-aura-hover px-3 py-2 rounded-lg border border-aura-border cursor-pointer transition" onclick="baToggleDayExpand('${k}')">
                    <div class="w-11 text-center shrink-0">
                        <div class="text-[9px] text-gray-500 font-mono">${mon}</div>
                        <div class="text-sm font-bold text-white font-mono">${dayNum}</div>
                        <div class="text-[9px] text-gray-500">${wd}</div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs text-gray-300 font-mono">${e.trades || 0} trade${(e.trades || 0) === 1 ? '' : 's'}${e.note ? ' · <span class="text-gray-500">' + escapeHtml(e.note.slice(0, 60)) + (e.note.length > 60 ? '…' : '') + '</span>' : ''}</div>
                        ${tradeCount ? `<div class="text-[10px] text-gray-600 font-mono mt-0.5">${tradeCount} logged individually</div>` : ''}
                    </div>
                    <div class="text-sm font-bold font-mono ${pnlColor} shrink-0">${formatMoney(pnl)}</div>
                    <button onclick="event.stopPropagation(); baOpenDayModal('${k}')" class="shrink-0 text-gray-500 hover:text-white p-1" title="Edit day summary"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                    <i data-lucide="chevron-down" class="ba-day-chevron w-4 h-4 text-gray-500 shrink-0"></i>
                </div>
                <div class="ba-day-trades-panel">${baDayTradesPanelHTML(k, e)}</div>`;
        }

        function baToggleDayExpand(dateKey) {
            if (baExpandedDays.has(dateKey)) baExpandedDays.delete(dateKey);
            else baExpandedDays.add(dateKey);
            baTradeFormState = null;
            if (baLastStats) renderBaTradedDaysList(baLastStats);
        }

        // Individual trades logged under one day: shown one-by-one when that day is expanded.
        // Compact "main stats" strip shown at the top of an expanded Traded Day:
        // win rate, trades, wins / losses / refunds + a thin W/L/R split bar.
        function baDaySummaryHTML(e) {
            const trades = Number(e.trades) || 0;
            const wins = Number(e.wins) || 0;
            const refunds = Number(e.refunds) || 0;
            const losses = Math.max(0, trades - wins - refunds);
            const wr = trades > 0 ? Math.round((wins / trades) * 100) : null;
            const wrColor = wr === null ? 'text-gray-500' : (wr >= 50 ? 'text-aura-green' : 'text-aura-red');
            const tile = (label, value, cls) => `<div class="bg-aura-bg px-2.5 py-1.5 rounded-md border border-aura-border min-w-0">
                    <div class="text-[9px] font-mono uppercase tracking-wider text-gray-500 truncate">${label}</div>
                    <div class="text-xs font-bold font-mono ${cls || 'text-white'} mt-0.5">${value}</div>
                </div>`;
            const seg = (n, color) => n > 0 ? `<div class="${color}" style="width:${(n / trades) * 100}%"></div>` : '';
            const bar = trades > 0
                ? `<div class="flex h-1 rounded-full overflow-hidden bg-aura-hover mt-1.5">${seg(wins, 'bg-aura-green')}${seg(losses, 'bg-aura-red')}${seg(refunds, 'bg-aura-amber')}</div>`
                : '';
            return `<div>
                    <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        ${tile('Win Rate', wr === null ? '—' : wr + '%', wrColor)}
                        ${tile('Trades', trades)}
                        ${tile('Wins', wins, 'text-aura-green')}
                        ${tile('Losses', losses, 'text-aura-red')}
                        ${tile('Refunds', refunds, 'text-aura-amber')}
                    </div>
                    ${bar}
                </div>`;
        }

        function baDayTradesPanelHTML(dateKey, e) {
            const trades = (e.entries || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const formOpenHere = baTradeFormState && baTradeFormState.dateKey === dateKey;
            const rows = trades.map(t => baTradeRowHTML(dateKey, t)).join('');
            const formHtml = formOpenHere ? baTradeFormHTML(dateKey, baTradeFormState.editId) : '';
            return `<div class="mt-1.5 mb-2 ml-2 pl-3 border-l-2 border-aura-border/60 space-y-1.5">
                    ${baDaySummaryHTML(e)}
                    ${rows}
                    ${!rows && !formHtml ? `<div class="text-center py-4 text-[11px] text-gray-500 border border-dashed border-aura-border rounded-lg">No individual trades logged for this day yet.</div>` : ''}
                    ${formHtml}
                    ${!formHtml ? `<button onclick="event.stopPropagation(); baOpenTradeForm('${dateKey}')" class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-medium bg-aura-hover border border-dashed border-aura-border text-gray-400 hover:text-white hover:border-blue-500/40 transition"><i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Trade</button>` : ''}
                </div>`;
        }

        function baTradeRowHTML(dateKey, t) {
            const pnl = Number(t.pnl) || 0;
            const pnlColor = pnl > 0 ? 'text-aura-green' : (pnl < 0 ? 'text-aura-red' : 'text-gray-400');
            const resultCls = { win: 'bg-aura-green/10 text-aura-green border-aura-green/30', loss: 'bg-aura-red/10 text-aura-red border-aura-red/30', refund: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }[t.result] || 'bg-aura-hover text-gray-400 border-aura-border';
            const dirCls = t.direction === 'put' ? 'bg-aura-red/10 text-aura-red' : 'bg-aura-green/10 text-aura-green';
            return `<div class="flex items-center gap-2.5 bg-aura-card/60 hover:bg-aura-hover px-2.5 py-2 rounded-md border border-aura-border/70 group" onclick="event.stopPropagation()">
                    <div class="w-11 shrink-0 text-[10px] font-mono text-gray-500">${escapeHtml(t.time || '—')}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs font-semibold text-white truncate">${escapeHtml(t.asset || 'Trade')}</span>
                            ${t.direction ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${dirCls}">${escapeHtml(t.direction)}</span>` : ''}
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${resultCls}">${escapeHtml(t.result || '—')}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            ${t.amount != null && t.amount !== '' ? `<span class="text-[10px] text-gray-500 font-mono">Stake ${formatMoney(Number(t.amount) || 0)}</span>` : ''}
                            ${t.note ? `<span class="text-[10px] text-gray-500 truncate">${escapeHtml(t.note)}</span>` : ''}
                        </div>
                    </div>
                    <div class="text-xs font-bold font-mono ${pnlColor} shrink-0">${formatMoney(pnl)}</div>
                    ${t.screenshot ? `<div class="ba-trade-thumb" onclick="event.stopPropagation(); baShowShotLightbox('${dateKey}','${t.id}')"><img src="${escapeHtml(safeImgSrc(t.screenshot))}" alt="Trade screenshot"></div>` : `<div class="ba-trade-thumb-empty"><i data-lucide="image-off" class="w-3.5 h-3.5"></i></div>`}
                    <div class="hidden group-hover:flex items-center gap-1 shrink-0">
                        <button onclick="event.stopPropagation(); baOpenTradeForm('${dateKey}','${t.id}')" class="w-6 h-6 rounded bg-aura-bg/90 border border-aura-border flex items-center justify-center text-gray-400 hover:text-white"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                        <button onclick="event.stopPropagation(); baDeleteTrade('${dateKey}','${t.id}')" class="w-6 h-6 rounded bg-aura-bg/90 border border-aura-border flex items-center justify-center text-gray-400 hover:text-aura-red"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                    </div>
                </div>`;
        }

        // ---- Inline add/edit form for one individual trade, rendered inside a day's expand panel ----
        function baOpenTradeForm(dateKey, editId) {
            let screenshot = null;
            if (editId) {
                const days = baLoadDays(baState.accountId);
                const entry = days[dateKey];
                const t = entry && entry.entries ? entry.entries.find(x => x.id === editId) : null;
                if (t) screenshot = t.screenshot || null;
            }
            baTradeFormState = { dateKey, editId: editId || null, screenshot };
            baExpandedDays.add(dateKey);
            if (baLastStats) renderBaTradedDaysList(baLastStats);
        }
        function baCloseTradeForm() {
            baTradeFormState = null;
            if (baLastStats) renderBaTradedDaysList(baLastStats);
        }

        function baTradeFormHTML(dateKey, editId) {
            const days = baLoadDays(baState.accountId);
            const entry = days[dateKey] || {};
            const t = editId ? (entry.entries || []).find(x => x.id === editId) : null;
            const screenshot = baTradeFormState ? baTradeFormState.screenshot : (t ? t.screenshot : null);
            return `<div class="bg-aura-bg border border-blue-500/30 rounded-lg p-3 space-y-2" onclick="event.stopPropagation()">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Time</label>
                            <input type="time" id="ba-trade-time" value="${t ? (t.time || '') : ''}" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 font-mono">
                        </div>
                        <div>
                            <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Asset</label>
                            <input type="text" id="ba-trade-asset" placeholder="EUR/USD OTC" value="${t ? escapeHtml(t.asset || '') : ''}" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50">
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Direction</label>
                            <select id="ba-trade-direction" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50">
                                <option value="call" ${!t || t.direction === 'call' ? 'selected' : ''}>Call</option>
                                <option value="put" ${t && t.direction === 'put' ? 'selected' : ''}>Put</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Result</label>
                            <select id="ba-trade-result" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50">
                                <option value="win" ${!t || t.result === 'win' ? 'selected' : ''}>Win</option>
                                <option value="loss" ${t && t.result === 'loss' ? 'selected' : ''}>Loss</option>
                                <option value="refund" ${t && t.result === 'refund' ? 'selected' : ''}>Refund</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Stake ($)</label>
                            <input type="number" step="0.01" min="0" id="ba-trade-amount" placeholder="0.00" value="${t && t.amount != null ? t.amount : ''}" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 font-mono">
                        </div>
                    </div>
                    <div>
                        <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Net PnL ($)</label>
                        <input type="number" step="0.01" id="ba-trade-pnl" placeholder="0.00" value="${t && t.pnl != null ? t.pnl : ''}" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 font-mono">
                    </div>
                    <div>
                        <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Note (optional)</label>
                        <input type="text" id="ba-trade-note" placeholder="Setup, reason, mistake..." value="${t ? escapeHtml(t.note || '') : ''}" class="mt-1 w-full bg-aura-card border border-aura-border rounded-md px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50">
                    </div>
                    <div>
                        <label class="text-[9px] font-mono uppercase tracking-wider text-gray-500">Screenshot</label>
                        <input type="file" id="ba-trade-screenshot-input" accept="image/*" class="hidden" onchange="baTradeScreenshotSelect(event)">
                        <div id="ba-trade-screenshot-preview" class="mt-1.5 flex items-center gap-2">${screenshot ? `<div class="ba-trade-thumb" style="width:48px;height:48px;"><img src="${escapeHtml(safeImgSrc(screenshot))}" alt="Trade screenshot"></div><button type="button" onclick="baRemoveTradeScreenshot()" class="text-[10px] text-gray-500 hover:text-aura-red">Remove</button>` : ''}</div>
                        <button type="button" onclick="document.getElementById('ba-trade-screenshot-input').click()" class="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-aura-hover border border-aura-border text-gray-300 hover:text-white hover:border-blue-500/40 transition"><i data-lucide="image-plus" class="w-3 h-3"></i> Upload Screenshot</button>
                    </div>
                    <p id="ba-trade-error" class="text-[10px] text-aura-red hidden"></p>
                    <div class="flex items-center justify-end gap-2 pt-1">
                        <button onclick="baCloseTradeForm()" class="px-3 py-1.5 rounded-md text-[11px] font-medium text-gray-400 hover:bg-aura-hover transition">Cancel</button>
                        <button onclick="baSaveTrade('${dateKey}','${editId || ''}')" class="px-3 py-1.5 rounded-md text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white transition">Save Trade</button>
                    </div>
                </div>`;
        }

        function baRenderTradeScreenshotPreview() {
            const el = document.getElementById('ba-trade-screenshot-preview');
            if (!el) return;
            const shot = baTradeFormState ? baTradeFormState.screenshot : null;
            el.innerHTML = shot ? `<div class="ba-trade-thumb" style="width:48px;height:48px;"><img src="${escapeHtml(safeImgSrc(shot))}" alt="Trade screenshot"></div><button type="button" onclick="baRemoveTradeScreenshot()" class="text-[10px] text-gray-500 hover:text-aura-red">Remove</button>` : '';
            renderIcons();
        }
        function baTradeScreenshotSelect(event) {
            const files = event.target.files;
            if (!files || !files.length) return;
            const reader = new FileReader();
            reader.onload = () => {
                compressImage(reader.result, 1280, 0.72).then(compressed => {
                    if (!baTradeFormState) baTradeFormState = {};
                    baTradeFormState.screenshot = compressed;
                    baRenderTradeScreenshotPreview();
                }).catch(() => {
                    if (!baTradeFormState) baTradeFormState = {};
                    baTradeFormState.screenshot = reader.result;
                    baRenderTradeScreenshotPreview();
                });
            };
            reader.readAsDataURL(files[0]);
            event.target.value = '';
        }
        function baRemoveTradeScreenshot() {
            if (baTradeFormState) baTradeFormState.screenshot = null;
            baRenderTradeScreenshotPreview();
        }

        // Keeps a day's aggregate trades/wins/refunds/pnl (used everywhere in Stats) in sync with
        // its individually logged trades, so the two never disagree.
        function baResyncDayAggregatesFromEntries(entry) {
            const list = entry.entries || [];
            entry.trades = list.length;
            entry.wins = list.filter(t => t.result === 'win').length;
            entry.refunds = list.filter(t => t.result === 'refund').length;
            entry.pnl = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
        }

        function baSaveTrade(dateKey, editId) {
            const errorEl = document.getElementById('ba-trade-error');
            const time = document.getElementById('ba-trade-time').value;
            const asset = document.getElementById('ba-trade-asset').value.trim();
            const direction = document.getElementById('ba-trade-direction').value;
            const result = document.getElementById('ba-trade-result').value;
            const amountVal = document.getElementById('ba-trade-amount').value;
            const pnl = parseFloat(document.getElementById('ba-trade-pnl').value);
            const note = document.getElementById('ba-trade-note').value.trim();
            if (isNaN(pnl)) { errorEl.textContent = 'Enter a net PnL for this trade.'; errorEl.classList.remove('hidden'); return; }
            errorEl.classList.add('hidden');
            const days = baLoadDays(baState.accountId);
            const entry = days[dateKey] || { pnl: 0, trades: 0, wins: 0, refunds: 0, note: '' };
            entry.entries = entry.entries || [];
            const screenshot = baTradeFormState ? baTradeFormState.screenshot : null;
            const amount = amountVal === '' ? null : parseFloat(amountVal);
            if (editId) {
                const idx = entry.entries.findIndex(x => x.id === editId);
                const trade = { id: editId, time, asset, direction, amount, result, pnl, note, screenshot };
                if (idx >= 0) entry.entries[idx] = trade; else entry.entries.push(trade);
            } else {
                entry.entries.push({ id: 'trade-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), time, asset, direction, amount, result, pnl, note, screenshot });
            }
            baResyncDayAggregatesFromEntries(entry);
            days[dateKey] = entry;
            baSaveDays(baState.accountId, days);
            if (calendarType === 'binary' && calendarLinkedAccountId === baState.accountId) {
                calendarEntries = loadCalendarEntriesFromStorage();
            }
            baExpandedDays.add(dateKey);
            baTradeFormState = null;
            renderBinaryAccountPage();
            renderAccounts();
        }

        function baDeleteTrade(dateKey, tradeId) {
            if (!confirm('Delete this trade?')) return;
            const days = baLoadDays(baState.accountId);
            const entry = days[dateKey];
            if (!entry || !entry.entries) return;
            entry.entries = entry.entries.filter(t => t.id !== tradeId);
            baResyncDayAggregatesFromEntries(entry);
            if (!entry.entries.length && !entry.note && !(entry.screenshots && entry.screenshots.length)) {
                delete days[dateKey];
            } else {
                days[dateKey] = entry;
            }
            baSaveDays(baState.accountId, days);
            if (calendarType === 'binary' && calendarLinkedAccountId === baState.accountId) {
                calendarEntries = loadCalendarEntriesFromStorage();
            }
            renderBinaryAccountPage();
            renderAccounts();
        }

        function baShowShotLightbox(dateKey, tradeId) {
            const days = baLoadDays(baState.accountId);
            const entry = days[dateKey];
            const t = entry && entry.entries ? entry.entries.find(x => x.id === tradeId) : null;
            if (!t || !t.screenshot) return;
            document.getElementById('ba-shot-lightbox-img').src = t.screenshot;
            const modal = document.getElementById('ba-shot-lightbox');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            renderIcons();
        }
        function baCloseShotLightbox() {
            const modal = document.getElementById('ba-shot-lightbox');
            modal.classList.add('hidden'); modal.classList.remove('flex');
        }

        function renderBaFundsHistory(stats) {
            const funds = stats.funds;
            const container = document.getElementById('ba-funds-history');
            if (!funds.length) {
                container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500 border border-dashed border-aura-border rounded-lg">No deposits or withdrawals logged yet.</div>`;
                return;
            }
            const sorted = [...funds].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            container.innerHTML = sorted.map(f => `
                <div onclick="baOpenFundsModal('${f.id}')" class="flex items-center gap-3 bg-aura-bg hover:bg-aura-hover px-3 py-2 rounded-lg border border-aura-border cursor-pointer transition">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${f.type === 'deposit' ? 'bg-aura-green/10 text-aura-green' : 'bg-aura-red/10 text-aura-red'}">
                        <i data-lucide="${f.type === 'deposit' ? 'arrow-down' : 'arrow-up'}" class="w-3.5 h-3.5"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-white">${f.type === 'deposit' ? 'Deposit' : 'Withdrawal'}${f.auto ? ' <span class="text-[9px] font-normal text-gray-500">(starting balance)</span>' : ''}</div>
                        <div class="text-[10px] text-gray-500 font-mono">${f.date || '—'}</div>
                    </div>
                    <div class="text-sm font-bold font-mono ${f.type === 'deposit' ? 'text-aura-green' : 'text-aura-red'} shrink-0">${f.type === 'deposit' ? '+' : '-'}${formatMoney(Math.abs(Number(f.amount || 0))).replace('-', '')}</div>
                </div>`).join('');
        }

        // ---- BA: Go Log Trade ----
        // Takes the trader straight to the Binary calendar, linked to this account, instead of the
        // old single-day popup. The calendar toolbar then shows Name - Platform - Demo/Real - Starting Balance.
        function baGoLogTrade() {
            const accountId = baState.accountId;
            if (!accountId) return;
            closeBinaryAccountPage();
            calendarLinkedAccountId = accountId;
            const wasBinary = calendarType === 'binary';
            if (!wasBinary) {
                switchCalendarType('binary'); // also loads this account's entries + renders
            } else {
                calendarEntries = loadCalendarEntriesFromStorage(); // already on Binary — just load this account's own calendar
                calendarModalDateKey = null;
                renderCalendar();
            }
            switchTab('accounts-calendar');
        }

        function baOpenDayModal(dateKey) {
            baState.editingDateKey = dateKey || null;
            document.getElementById('ba-day-error').classList.add('hidden');
            const days = baLoadDays(baState.accountId);
            const entry = dateKey ? days[dateKey] : null;
            const hasEntries = !!(entry && entry.entries && entry.entries.length);
            document.getElementById('ba-day-date').value = dateKey || toDateKey(new Date());
            document.getElementById('ba-day-trades').value = entry ? entry.trades : '';
            document.getElementById('ba-day-wins').value = entry ? entry.wins : '';
            document.getElementById('ba-day-refunds').value = entry ? (entry.refunds || '') : '';
            document.getElementById('ba-day-pnl').value = entry ? entry.pnl : '';
            document.getElementById('ba-day-note').value = entry ? (entry.note || '') : '';
            // When individual trades are logged for this day, the aggregate numbers are derived
            // from them (see baResyncDayAggregatesFromEntries) — lock them here to avoid drift.
            ['ba-day-trades', 'ba-day-wins', 'ba-day-refunds', 'ba-day-pnl'].forEach(id => {
                const el = document.getElementById(id);
                el.disabled = hasEntries;
                el.classList.toggle('opacity-50', hasEntries);
                el.classList.toggle('cursor-not-allowed', hasEntries);
            });
            document.getElementById('ba-day-entries-hint').classList.toggle('hidden', !hasEntries);
            document.getElementById('ba-day-delete-btn').classList.toggle('hidden', !entry);
            const modal = document.getElementById('ba-day-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            renderIcons();
        }
        function baCloseDayModal() {
            const modal = document.getElementById('ba-day-modal');
            modal.classList.add('hidden'); modal.classList.remove('flex');
        }
        function baSaveDayEntry() {
            const errorEl = document.getElementById('ba-day-error');
            const dateVal = document.getElementById('ba-day-date').value;
            if (!dateVal) { errorEl.textContent = 'Pick a date.'; errorEl.classList.remove('hidden'); return; }
            const days = baLoadDays(baState.accountId);
            const existing = days[dateVal] || {};
            const hasEntries = !!(existing.entries && existing.entries.length);
            let pnl, trades, wins, refunds;
            if (hasEntries) {
                // Individually logged trades are the source of truth for this day — keep the
                // aggregate numbers exactly as computed from them, only the note is editable here.
                pnl = Number(existing.pnl) || 0;
                trades = existing.trades || 0;
                wins = existing.wins || 0;
                refunds = existing.refunds || 0;
            } else {
                pnl = parseFloat(document.getElementById('ba-day-pnl').value);
                if (isNaN(pnl)) { errorEl.textContent = 'Enter a net PnL amount.'; errorEl.classList.remove('hidden'); return; }
                trades = parseInt(document.getElementById('ba-day-trades').value, 10) || 0;
                wins = parseInt(document.getElementById('ba-day-wins').value, 10) || 0;
                refunds = parseInt(document.getElementById('ba-day-refunds').value, 10) || 0;
            }
            errorEl.classList.add('hidden');
            // Merge onto any existing entry (rather than overwrite) so fields only the Calendar form
            // sets — screenshots, mistakes, rules/emotional toggles — aren't wiped out from here.
            days[dateVal] = {
                ...existing,
                pnl, trades, wins, refunds,
                note: document.getElementById('ba-day-note').value.trim()
            };
            baSaveDays(baState.accountId, days);
            // Keep the Calendar tab's own in-memory copy fresh if it's currently showing this account.
            if (calendarType === 'binary' && calendarLinkedAccountId === baState.accountId) {
                calendarEntries = loadCalendarEntriesFromStorage();
            }
            baCloseDayModal();
            renderBinaryAccountPage();
            renderAccounts();
        }
        function baDeleteDayEntry() {
            if (!baState.editingDateKey) return;
            const days = baLoadDays(baState.accountId);
            delete days[baState.editingDateKey];
            baSaveDays(baState.accountId, days);
            if (calendarType === 'binary' && calendarLinkedAccountId === baState.accountId) {
                calendarEntries = loadCalendarEntriesFromStorage();
            }
            baCloseDayModal();
            renderBinaryAccountPage();
            renderAccounts();
        }

        // ---- BA: Deposit / Withdraw modal ----
        function baSetFundsType(type) {
            baState.fundsType = type;
            const dep = document.getElementById('ba-funds-type-deposit');
            const wit = document.getElementById('ba-funds-type-withdraw');
            const base = 'px-3 py-2 rounded-md text-xs font-medium border transition';
            dep.className = base + ' ' + (type === 'deposit' ? 'border-aura-green/50 bg-aura-green/10 text-aura-green' : 'border-aura-border bg-aura-bg text-gray-400');
            wit.className = base + ' ' + (type === 'withdraw' ? 'border-aura-red/50 bg-aura-red/10 text-aura-red' : 'border-aura-border bg-aura-bg text-gray-400');
        }
        function baOpenFundsModal(fundId) {
            baState.editingFundId = fundId || null;
            document.getElementById('ba-funds-error').classList.add('hidden');
            const funds = baLoadFunds(baState.accountId);
            const f = fundId ? funds.find(x => x.id === fundId) : null;
            baSetFundsType(f ? f.type : 'deposit');
            document.getElementById('ba-funds-amount').value = f ? f.amount : '';
            document.getElementById('ba-funds-date').value = f ? f.date : toDateKey(new Date());
            const modal = document.getElementById('ba-funds-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
        }
        function baCloseFundsModal() {
            const modal = document.getElementById('ba-funds-modal');
            modal.classList.add('hidden'); modal.classList.remove('flex');
        }
        function baSaveFundsEntry() {
            const errorEl = document.getElementById('ba-funds-error');
            const amount = parseFloat(document.getElementById('ba-funds-amount').value);
            if (isNaN(amount) || amount <= 0) { errorEl.textContent = 'Enter a valid amount.'; errorEl.classList.remove('hidden'); return; }
            errorEl.classList.add('hidden');
            let funds = baLoadFunds(baState.accountId);
            const date = document.getElementById('ba-funds-date').value || toDateKey(new Date());
            if (baState.editingFundId) {
                funds = funds.map(f => f.id === baState.editingFundId ? { ...f, amount, date, type: baState.fundsType } : f);
            } else {
                funds.push({ id: 'fund_' + Date.now(), type: baState.fundsType, amount, date });
            }
            baSaveFunds(baState.accountId, funds);
            baCloseFundsModal();
            renderBinaryAccountPage();
        }

        // ---- BA: Targets modal ----
        function baOpenTargetsModal() {
            const t = baLoadTargets(baState.accountId);
            document.getElementById('ba-target-monthly').value = t.monthly || '';
            document.getElementById('ba-target-daily').value = t.daily || '';
            document.getElementById('ba-target-winrate').value = t.winrate || '';
            const modal = document.getElementById('ba-targets-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
        }
        function baCloseTargetsModal() {
            const modal = document.getElementById('ba-targets-modal');
            modal.classList.add('hidden'); modal.classList.remove('flex');
        }
        function baSaveTargetsModal() {
            const monthly = parseFloat(document.getElementById('ba-target-monthly').value) || null;
            const daily = parseFloat(document.getElementById('ba-target-daily').value) || null;
            const winrate = parseFloat(document.getElementById('ba-target-winrate').value) || null;
            baSaveTargetsData(baState.accountId, { monthly, daily, winrate });
            baCloseTargetsModal();
            renderBinaryAccountPage();
        }

        // TAB SWITCHING LOGIC
        function switchTab(tabId) {
            // The forex account view needs an open account; on a fresh load fall back to the list.
            if (tabId === 'forex-account' && !mt5State.parentId) { switchTab('accounts-list'); return; }
            // The sidebar auto-collapses while a forex account is open; bring it back when leaving.
            if (tabId !== 'forex-account') fxRestoreSidebar();
            if (typeof flushNoteSave === 'function') flushNoteSave(); // never lose an open note when switching tabs
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            
            // Show selected tab content
            const selectedTab = document.getElementById('tab-' + tabId);
            if (selectedTab) selectedTab.classList.remove('hidden');

            // Reset active states on navbar items
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('active-tab', 'text-gray-300');
                el.classList.add('text-gray-400');
            });

            // Set active state on clicked nav button
            const navBtn = document.getElementById('nav-' + tabId);
            if (navBtn) {
                navBtn.classList.add('active-tab', 'text-gray-300');
            }
            if (tabId === 'forex-account') {
                const accNav = document.getElementById('nav-accounts-list');
                if (accNav) { accNav.classList.add('active-tab', 'text-gray-300'); accNav.classList.remove('text-gray-400'); }
            }

            // Update Header Title
            const titleMap = {
                'accounts-overview': ['Overview', 'Portfolio Snapshot'],
                'accounts-list': ['Account Manager', 'Broker & Prop Integrations'],
                'forex-account': ['Forex Account', 'MT5 Accounts'],
                'accounts-calendar': ['Performance Calendar', 'August 2026'],
                'accounts-stats': ['Stats', 'Performance Analytics'],
                'accounts-monthly': ['Monthly Summary', 'Performance Report'],
                'accounts-journal': ['Trading Journal', '54 Executions Logged'],
                'accounts-sessions': ['Trading Sessions', 'Global Market Hours'],
                'accounts-strategies': ['Strategies & Rules', 'Your Playbooks'],
                'accounts-psychology': ['Psychology Engine', 'Mindset Tracking'],
                'accounts-notes': ['Notes Workspace', 'Personal Knowledge Base'],
                'accounts-certificates': ['Certificates', 'Verified Trader Milestones'],
                'news-terminal': ['Financial News Terminal', 'Live Feeds']
            };

            if (tabId === 'accounts-sessions') { renderSessions(); updateSessionClock(); }
            if (tabId === 'accounts-monthly' && typeof msRender === 'function') msRender();

            if (titleMap[tabId]) {
                document.getElementById('page-title').innerText = titleMap[tabId][0];
                document.getElementById('page-subtitle').innerText = titleMap[tabId][1];
            }

            if (tabId === 'accounts-strategies') renderStrategies();
            if (tabId === 'accounts-psychology') renderPsychologyPage();
            if (tabId === 'accounts-calendar') renderCalendar();
            if (tabId === 'accounts-journal') renderJournal();
            if (tabId === 'accounts-overview') renderOverview();
            if (tabId === 'accounts-stats') renderStats();
        }
