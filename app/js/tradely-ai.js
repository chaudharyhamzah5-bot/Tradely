        window.TradelyAI = (function () {
            const CFG_KEY = 'tradely_ai_config_v1', LEGACY_GROQ = 'tradely_groq_api_key';
            const PROVIDERS = [
                { id: 'groq',       label: 'Groq',          tag: 'Free tier',  url: 'https://api.groq.com/openai/v1/chat/completions',                         model: 'openai/gpt-oss-120b', models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound', 'groq/compound-mini', 'llama-3.1-8b-instant'], keyHint: 'gsk_…',  getKey: 'console.groq.com/keys' },
                { id: 'gemini',     label: 'Google Gemini', tag: 'Free tier',  url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash',       models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'], keyHint: 'AIza…', getKey: 'aistudio.google.com/apikey' },
                { id: 'openrouter', label: 'OpenRouter',    tag: 'Many models', url: 'https://openrouter.ai/api/v1/chat/completions',                          model: 'meta-llama/llama-3.3-70b-instruct:free', models: ['meta-llama/llama-3.3-70b-instruct:free', 'openai/gpt-4o-mini', 'deepseek/deepseek-chat'], keyHint: 'sk-or-…', getKey: 'openrouter.ai/keys' },
                { id: 'openai',     label: 'OpenAI',        tag: 'Paid',       url: 'https://api.openai.com/v1/chat/completions',                              model: 'gpt-4o-mini',            models: ['gpt-4o-mini', 'gpt-4.1-mini'], keyHint: 'sk-…',   getKey: 'platform.openai.com/api-keys' },
                { id: 'mistral',    label: 'Mistral',       tag: 'Free tier',  url: 'https://api.mistral.ai/v1/chat/completions',                              model: 'mistral-small-latest',   models: ['mistral-small-latest', 'mistral-large-latest'], keyHint: 'API key', getKey: 'console.mistral.ai/api-keys' },
                { id: 'deepseek',   label: 'DeepSeek',      tag: 'Paid',       url: 'https://api.deepseek.com/chat/completions',                               model: 'deepseek-chat',          models: ['deepseek-chat'], keyHint: 'sk-…', getKey: 'platform.deepseek.com/api_keys' },
                { id: 'custom',     label: 'Custom (OpenAI-compatible)', tag: 'Ollama, LM Studio…', url: '', model: '', models: [], keyHint: 'API key (optional for local)', getKey: '', custom: true }
            ];
            const FEATURES = [
                { id: 'calendar', label: 'News Calendar', desc: 'Expected move per event & pair' },
                { id: 'geo',      label: 'Geo Politics',  desc: 'AI Brief and per-headline pair impact' },
                { id: 'consistency', label: 'AI Coach', desc: 'Drawdown, consistency & daily target coach' }
            ];
            const byId = Object.fromEntries(PROVIDERS.map(p => [p.id, p]));
            const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
            function load() {
                let c = read(CFG_KEY);
                if (!c || typeof c !== 'object') c = {};
                c.providers = c.providers || {}; c.routes = c.routes || {};
                // one-time migration of the key the News Calendar used to store on its own
                try { const old = localStorage.getItem(LEGACY_GROQ); if (old && !(c.providers.groq && c.providers.groq.key)) c.providers.groq = { ...(c.providers.groq || {}), key: old }; } catch (e) {}
                FEATURES.forEach(f => { const r = c.routes[f.id] || {}; c.routes[f.id] = { primary: byId[r.primary] ? r.primary : 'groq', fallback: byId[r.fallback] && r.fallback !== r.primary ? r.fallback : '' }; });
                return c;
            }
            function save(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); return true; } catch (e) { return false; } }
            function resolved(id, c) { // provider definition merged with the user's saved settings, or null if unusable
                const def = byId[id]; if (!def) return null;
                const u = (c || load()).providers[id] || {}; const key = String(u.key || '').trim();
                const url = def.custom ? String(u.url || '').trim() : def.url, model = String(u.model || def.model || '').trim();
                if (!url || !model) return null;
                if (!key && !def.custom) return null;   // hosted providers need a key; custom (local) may not
                if (def.custom && !key && !u.url) return null;
                return { id, label: def.label, url, model, key };
            }
            function chain(feature) {
                const c = load(), r = c.routes[feature] || { primary: 'groq', fallback: '' };
                const ids = [r.primary, r.fallback].filter(Boolean);
                if (feature === 'consistency') PROVIDERS.forEach(p => { if (!ids.includes(p.id)) ids.push(p.id); }); // any provider that has a key (e.g. set up in Terminal) works
                return ids.map(id => resolved(id, c)).filter(Boolean);
            }
            function parseJSON(txt) {
                const raw = String(txt || '').replace(/```json|```/g, '').trim();
                try { return JSON.parse(raw); } catch (e) {}
                const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
                if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)); } catch (e) {} }
                const e = new Error('AI returned invalid JSON'); e.code = 'BADJSON'; throw e;
            }
            const stripThink = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
            async function call(p, system, user, maxTokens, useJsonMode) {
                const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
                const headers = { 'Content-Type': 'application/json' }; if (p.key) headers.Authorization = 'Bearer ' + p.key;
                const body = { model: p.model, temperature: 0.2, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
                if (useJsonMode) body.response_format = { type: 'json_object' };
                if (/gpt-oss/i.test(p.model)) { body.reasoning_effort = 'low'; body.max_tokens = maxTokens + 600; } // reasoning models spend tokens thinking: keep it short, leave room for the answer
                try {
                    const res = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers, body: JSON.stringify(body) });
                    if (!res.ok) {
                        const e = new Error(`${p.label} HTTP ${res.status}`); e.status = res.status; e.model = p.model;
                        try { const j = await res.json(); e.detail = String((j.error && (j.error.message || j.error)) || j.message || '').slice(0, 160); } catch (_) {}
                        throw e;
                    }
                    const data = await res.json();
                    const ch = data.choices?.[0] || {}, msg = ch.message || {};
                    const text = stripThink(msg.content) || stripThink(msg.reasoning) || '';   // reasoning models sometimes leave content empty
                    try { return parseJSON(text); }
                    catch (pe) { pe.message = `AI returned invalid JSON (${p.model}, finish: ${ch.finish_reason || '?'}, ${text.length} chars)`; pe.model = p.model; throw pe; }
                } catch (e) {
                    if (e.name === 'AbortError') { const t = new Error(`${p.label} timed out`); t.name = 'AbortError'; throw t; }
                    if (e instanceof TypeError) { const n = new Error(`${p.label}: network/CORS blocked`); n.net = true; throw n; }
                    throw e;
                } finally { clearTimeout(timer); }
            }
            async function ask(p, system, user, maxTokens) {
                try { return await call(p, system, user, maxTokens, true); }
                catch (e) {
                    if (e.status === 400 || e.status === 422) return await call(p, system, user, maxTokens, false); // some models reject json mode
                    if (e.code === 'BADJSON') return await call(p, system, user, Math.min(maxTokens * 2, 4000), false); // truncated / empty / chatty → retry once, roomier, no json mode
                    throw e;
                }
            }
            const PREFER = [/gpt-oss-120b/, /gpt-oss-20b/, /llama-3\.3-70b/, /llama-3\.1-8b/, /gemini-2\.5-flash$/, /gemini-2\.5-flash-lite/, /gpt-4o-mini/, /mistral-small/, /deepseek-chat/];
            async function heal(p) {
                const list = await api.listModels(p.id);
                if (!list.length || list.includes(p.model)) return null;           // model is listed → the 404 is something else
                const pick = (PREFER.map(rx => list.find(m => rx.test(m))).find(Boolean)) || list[0];
                const c = load(); c.providers[p.id] = { ...(c.providers[p.id] || {}), model: pick }; save(c); // persist so next call just works
                return { ...p, model: pick };
            }
            const api = {
                PROVIDERS, FEATURES, load, save,
                hasKey(feature) { return chain(feature).length > 0; },
                resolved,
                async chatJSON({ feature, system, user, maxTokens = 800 }) {
                    const list = chain(feature);
                    if (!list.length) { const e = new Error('No AI provider configured'); e.code = 'NO_KEY'; throw e; }
                    let last;
                    for (const p of list) {
                        try { const data = await ask(p, system, user, maxTokens); return { data, provider: { id: p.id, label: p.label, model: p.model } }; }
                        catch (e) {
                            e.providerLabel = p.label; last = e;
                            if (e.status === 404) { // model gone / not allowed for this key → find one that works, remember it, retry once
                                try {
                                    const healed = await heal(p);
                                    if (healed) { const data = await ask(healed, system, user, maxTokens); return { data, provider: { id: healed.id, label: healed.label, model: healed.model } }; }
                                } catch (e2) { e2.providerLabel = p.label; last = e2; }
                            }
                        }   // otherwise try the fallback provider next
                    }
                    throw last;
                },
                async listModels(id, override) { // asks the provider which models THIS key can use (GET .../models)
                    const c = load(); if (override) c.providers[id] = { ...(c.providers[id] || {}), ...override };
                    const def = byId[id], u = c.providers[id] || {}, key = String(u.key || '').trim();
                    const chatUrl = def.custom ? String(u.url || '').trim() : def.url;
                    if (!chatUrl || (!key && !def.custom)) { const e = new Error('Add a key first'); e.code = 'NO_KEY'; throw e; }
                    const url = chatUrl.replace(/\/chat\/completions\/?$/, '/models');
                    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
                    try {
                        const res = await fetch(url, { signal: ctl.signal, headers: key ? { Authorization: 'Bearer ' + key } : {} });
                        if (!res.ok) { const e = new Error(`${def.label} HTTP ${res.status}`); e.status = res.status; try { const j = await res.json(); e.detail = String((j.error && (j.error.message || j.error)) || '').slice(0, 160); } catch (_) {} throw e; }
                        const j = await res.json();
                        const ids = (Array.isArray(j.data) ? j.data : Array.isArray(j.models) ? j.models : []).map(m => String(m.id || m.name || '').replace(/^models\//, '')).filter(Boolean);
                        return [...new Set(ids)].filter(m => !/whisper|tts|embed|guard|orpheus|moderation|image|dall|transcri|audio|realtime|rerank|vision-preview/i.test(m)).sort();
                    } catch (e) {
                        if (e.name === 'AbortError') throw e;
                        if (e instanceof TypeError) { const n = new Error('network/CORS blocked'); n.net = true; throw n; }
                        throw e;
                    } finally { clearTimeout(timer); }
                },
                async test(id, override) { // used by Settings → Test; `override` = unsaved form values
                    const c = load(); if (override) c.providers[id] = { ...(c.providers[id] || {}), ...override };
                    const p = resolved(id, c); if (!p) { const e = new Error('Add a key (and model) first'); e.code = 'NO_KEY'; throw e; }
                    const t0 = performance.now();
                    const out = await ask(p, 'Reply with the JSON object {"ok": true} and nothing else.', 'ping', 20);
                    return { ms: Math.round(performance.now() - t0), ok: !!out, model: p.model };
                }
            };
            return api;
        })();
        window.CONS_AI = {
            PROVIDERS: window.TradelyAI.PROVIDERS,
            hasKey() { return window.TradelyAI.hasKey('consistency'); },
            chatJSON(o) { return window.TradelyAI.chatJSON({ feature: 'consistency', ...o }); },
            saveKey(id, key) { const c = window.TradelyAI.load(); c.providers[id] = { ...(c.providers[id] || {}), key }; c.routes.consistency = { primary: id, fallback: '' }; window.TradelyAI.save(c); }
        };

/* ==================== CONSISTENCY AI (single button on Forex + Binary account pages) ==================== */
/* Numbers are computed locally (exact). The AI only explains them in plain words + gives the daily plan. */
(function () {
    const $ = id => document.getElementById(id);
    const money = v => (typeof formatMoney === 'function') ? formatMoney(v) : (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
    const money0 = v => { const a = Math.abs(v); return (v < 0 ? '-$' : '$') + (a >= 100 ? Math.round(a).toLocaleString() : a.toFixed(2)); };
    const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s ?? '')) : String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const band = p => p > 2 ? 'profit' : p < -2 ? 'loss' : 'be';
    const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const ST = { ctx: null, F: null, M: null, busy: false, cache: new Map() };

    /* ---------- 1. gather facts from the open account ---------- */
    function gatherFx() {
        const c = window.fxConsCtx; if (!c) return null;
        const { m, parent, phaseLabel, calId, ph, isFunded } = c;
        const A = computeFxStats(m, null, calId);
        const days = A.keys.map(k => ({ date: k, pnl: Number(A.days[k].pnl) || 0 }));
        const prop = isFunded && phaseLabel;
        const DDI = prop ? fxDrawdownInfo(A.size, days, ph) : null;
        return {
            id: m.id, kind: prop ? 'prop' : 'forex', name: m.name + (phaseLabel ? ' · ' + phaseLabel : ''),
            size: A.size, balance: A.endEq, minEq: A.minEq, days,
            rules: prop ? {
                profitTarget: phaseLabel !== 'Funded' ? Number(ph.profitTarget) || 0 : 0, dailyLoss: Number(ph.dailyLoss) || 0, overallLoss: Number(ph.overallLoss) || 0,
                minTradingDays: Number(ph.minTradingDays) || 0, minProfitableDays: Number(ph.minProfitableDays) || 0, minProfitDayPct: Number(ph.minProfitDayPct) || 0,
                consistencyPct: ph.consistency === 'yes' ? Number(ph.consistencyPct) || 0 : 0, isFunded: phaseLabel === 'Funded',
                drawdownType: fxDdType(ph), weekendHolding: fxRuleFlag(ph, 'weekendHolding'), overnightHolding: fxRuleFlag(ph, 'overnightHolding'), newsTrading: fxRuleFlag(ph, 'newsTrading')
            } : null, dd: DDI, failed: (m.status === 'failed') ? fxFailText(m) : '', targets: {}
        };
    }
    function gatherBa() {
        const id = baState.accountId, acc = getAccountById(id); if (!acc) return null;
        const S = computeAccountStats(id, acc.startingBalance || 0);
        return {
            id, kind: 'binary', name: acc.nickname || acc.name, size: S.startingBalance, balance: S.netBalance, minEq: null,
            days: S.dateKeys.map(k => ({ date: k, pnl: Number(S.daysObj[k].pnl) || 0 })), rules: null, targets: baLoadTargets(id) || {}, winRateTrades: S.tradeWinRate
        };
    }

    /* ---------- 2. exact maths ---------- */
    function weekdaysLeft(includeToday) {
        const t = new Date(); t.setHours(0, 0, 0, 0);
        const end = new Date(t.getFullYear(), t.getMonth() + 1, 0); let n = 0;
        for (let d = new Date(t); d <= end; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w !== 0 && w !== 6 && (includeToday || d > t)) n++; }
        return n;
    }
    function compute(F) {
        const M = { kind: F.kind, n: F.days.length };
        const pnls = F.days.map(d => d.pnl);
        const pos = pnls.filter(p => band(p) === 'profit'), neg = pnls.filter(p => band(p) === 'loss');
        M.pnl = pnls.reduce((a, b) => a + b, 0);
        M.sumPos = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
        M.best = pnls.length ? Math.max(...pnls) : 0; M.worst = pnls.length ? Math.min(...pnls) : 0;
        M.profitDays = pos.length; M.lossDays = neg.length;
        M.avgWinDay = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : 0;
        M.avgLossDay = neg.length ? Math.abs(neg.reduce((a, b) => a + b, 0) / neg.length) : 0;
        M.avgDaily = pnls.length ? M.pnl / pnls.length : 0;
        M.dayWR = pnls.length ? pos.length / pnls.length * 100 : null;
        M.share = M.sumPos > 0 && M.best > 0 ? M.best / M.sumPos * 100 : null;
        const today = iso(new Date()); M.todayLogged = F.days.some(d => d.date === today); M.todayPnl = (F.days.find(d => d.date === today) || {}).pnl || 0;
        // score (needs >= 3 traded days)
        if (M.n >= 3) {
            const c1 = Math.min(1, (M.dayWR / 100) / 0.6);
            const sh = M.share === null ? 1 : M.share;
            const c2 = M.share === null ? 0 : sh <= 25 ? 1 : sh >= 60 ? 0 : (60 - sh) / 35;
            const worstAbs = Math.abs(Math.min(0, M.worst));
            const c3 = !neg.length ? 1 : !M.avgWinDay ? 0 : (r => r <= 1 ? 1 : r >= 3 ? 0 : (3 - r) / 2)(worstAbs / M.avgWinDay);
            M.score = Math.round((c1 * 40 + c2 * 30 + c3 * 30));
            M.scoreParts = { winDays: Math.round(c1 * 100), spread: Math.round(c2 * 100), lossControl: Math.round(c3 * 100) };
        } else M.score = null;
        const R = F.rules;
        if (R) { // ----- prop firm rules -----
            M.rules = R; const sz = F.size;
            M.profitTargetAmt = R.profitTarget ? sz * R.profitTarget / 100 : 0;
            M.remaining = R.profitTarget ? Math.max(0, M.profitTargetAmt - M.pnl) : null;
            M.dailyLossAmt = R.dailyLoss ? sz * R.dailyLoss / 100 : 0;
            M.ddType = R.drawdownType === 'trailing' ? 'trailing' : 'static';
            M.peak = F.dd ? F.dd.peak : sz;
            M.floor = R.overallLoss ? (F.dd && F.dd.floor !== null ? F.dd.floor : sz * (1 - R.overallLoss / 100)) : null;
            M.ovAmt = R.overallLoss ? sz * R.overallLoss / 100 : 0;
            M.bufferToFloor = M.floor !== null ? F.balance - M.floor : null;
            M.tradedDays = M.n;
            const minAmt = R.minProfitDayPct ? sz * R.minProfitDayPct / 100 : 0;
            M.qualDays = pnls.filter(p => p > 0 && (!minAmt || p >= minAmt)).length;
            M.minDaysLeft = Math.max(0, R.minTradingDays - M.n);
            M.profDaysLeft = Math.max(0, R.minProfitableDays - M.qualDays);
            M.minProfitDayAmt = minAmt;
            const L = R.consistencyPct / 100;
            if (L > 0) {
                M.L = R.consistencyPct;
                M.status = M.share === null ? 'nodata' : M.share > R.consistencyPct ? 'broken' : M.share >= R.consistencyPct * 0.8 ? 'close' : 'ok';
                M.minEqualDays = Math.ceil(100 / R.consistencyPct);
                M.safeDayCap = Math.max(M.best > 0 ? M.best : 0, L * M.sumPos / (1 - L)); // any new day up to this keeps the rule
                M.extraNeeded = M.share !== null && M.share > R.consistencyPct ? Math.max(0, M.best / L - M.sumPos) : 0; // profit from OTHER days needed to repair
                M.dayCapAtTarget = M.profitTargetAmt ? L * M.profitTargetAmt : null; // max single day when finishing exactly at target
            }
            // pace plan
            if (M.remaining !== null && M.remaining > 0) {
                const dayMax = M.dayCapAtTarget || M.safeDayCap || M.remaining;
                M.minDaysForTarget = dayMax > 0 ? Math.ceil(M.remaining / dayMax) : 1;
                const base = Math.max(M.minDaysForTarget, M.minDaysLeft, M.profDaysLeft, 1);
                M.recDays = L > 0 ? Math.max(base, Math.ceil(M.minDaysForTarget * 1.25)) : base;
                M.dailyTarget = M.remaining / M.recDays;
                M.scenarios = [5, 10, 15, 20].map(n => ({ n, per: M.remaining / n, ok: L > 0 ? (M.remaining / n) <= dayMax * 1.0001 : true }));
            } else if (M.remaining === 0) { M.targetHit = true; M.dailyTarget = 0; M.recDays = Math.max(M.minDaysLeft, M.profDaysLeft); }
            else { // funded / no profit target
                M.dailyTarget = L > 0 && M.safeDayCap ? Math.min(M.safeDayCap * 0.6, Math.max(M.avgWinDay, 0)) : M.avgWinDay;
            }
            M.dayMaxProfit = L > 0 ? (M.dayCapAtTarget && M.remaining ? Math.min(M.dayCapAtTarget, Math.max(M.safeDayCap, M.dayCapAtTarget)) : M.safeDayCap) : null;
            if (M.dayMaxProfit !== null && M.dayMaxProfit < (M.best > 0 ? M.best : 0)) M.dayMaxProfit = M.best;
            M.stopLoss = M.dailyLossAmt ? Math.min(M.dailyLossAmt * 0.4, M.bufferToFloor !== null ? Math.max(0, M.bufferToFloor) * 0.4 : Infinity) : (M.bufferToFloor !== null ? Math.max(0, M.bufferToFloor) * 0.2 : null);
        } else { // ----- personal / binary: own monthly goal -----
            const T = F.targets || {};
            const goal = Number(lsGet('tradely_cons_goal_' + F.id)) || Number(T.monthly) || 0;
            M.goalMonthly = goal; M.goalDaily = Number(T.daily) || 0; M.goalWR = Number(T.winrate) || 0; M.winRateTrades = F.winRateTrades;
            const mk = today.slice(0, 7);
            M.monthPnl = F.days.filter(d => d.date.startsWith(mk)).reduce((a, d) => a + d.pnl, 0);
            M.daysLeft = weekdaysLeft(!M.todayLogged);
            M.remaining = goal ? Math.max(0, goal - M.monthPnl) : null;
            M.neededPerDay = goal && M.daysLeft ? M.remaining / M.daysLeft : null;
            const base = M.goalDaily || M.neededPerDay || M.avgWinDay || 0;
            M.dailyTarget = M.neededPerDay !== null && M.goalDaily ? Math.min(M.goalDaily, Math.max(M.neededPerDay, M.goalDaily * 0.5)) : base;
            M.dayMaxProfit = M.dailyTarget ? M.dailyTarget * 1.5 : null;      // guideline: stop when ~1.5x target is hit
            M.stopLoss = M.dailyTarget ? Math.min(M.dailyTarget, M.avgLossDay || M.dailyTarget) : (M.avgLossDay || null);
            M.realistic = M.avgWinDay && M.dayWR !== null ? M.avgDaily : null;
            if (M.share !== null) M.status = M.share > 40 ? 'close' : 'ok';
        }
        return M;
    }

    /* ---------- 3. local (no-AI) explanation, also used as fallback ---------- */
    function localText(F, M) {
        const L = [], S = [], P = [], W = [], D = [];
        const R = M.rules;
        if (R && M.L) {
            L.push(`Consistency rule: your single best day must not exceed ${M.L}% of your total profit. Many steady days, not one big day.`);
            if (M.share === null) S.push('No profit day yet, so the share cannot be calculated.');
            else S.push(`Best day (${money0(M.best)}) is ${M.share.toFixed(1)}% of total profit vs ${M.L}% limit — ${M.status === 'broken' ? 'BROKEN' : M.status === 'close' ? 'close to the limit' : 'OK'}.`);
            if (M.extraNeeded > 0) P.push(`To repair it you need about ${money0(M.extraNeeded)} more profit from other days (none above your best day).`);
        } else if (R) L.push('No consistency rule on this phase, but steady daily profit is still best.');
        if (R && M.floor !== null) {
            const tr = M.ddType === 'trailing';
            if (tr) {
                L.push(`Drawdown is TRAILING: the loss floor follows your highest balance (${money0(M.peak)}). New highs push the floor up; it never moves back down.`);
                S.push(`Floor is now ${money0(M.floor)}; you have ${money0(Math.max(0, M.bufferToFloor))} of room.`);
                D.push('On trailing, floating profit lifts the floor too — giving profit back is the biggest danger. When you are up, cut risk or stop for the day.');
                D.push(`Size trades so a 3-loss streak stays inside your ${money0(Math.max(0, M.bufferToFloor))} room.`);
            } else {
                L.push(`Drawdown is STATIC: the loss floor is fixed from your starting balance (${money0(M.floor)}) and never moves. Every profit adds to your cushion.`);
                S.push(`Floor is ${money0(M.floor)}; you have ${money0(Math.max(0, M.bufferToFloor))} of room.`);
                D.push('On static you can grow risk slightly as the cushion builds, but watch the daily loss limit first — it usually breaks before the overall one.');
            }
        }
        if (R && F.failed) W.unshift(`This account has FAILED (${F.failed}). Trading is closed — build the daily loss limit and drawdown floor into your risk plan from day one on the next account.`);
        if (R) {
            const no = [];
            if (R.weekendHolding === 'not_allowed') no.push('weekend holding');
            if (R.overnightHolding === 'not_allowed') no.push('overnight holding');
            if (R.newsTrading === 'not_allowed') no.push('news trading');
            if (no.length) W.push(`This phase does NOT allow ${no.join(', ')} — breaking it can fail the account.`);
        }
        if (M.dailyTarget) P.push(`Daily target: ${money0(M.dailyTarget)} per day.`);
        if (M.dayMaxProfit) P.push(`If one day goes above ${money0(M.dayMaxProfit)}, stop trading for the day.`);
        if (M.stopLoss) P.push(`Daily stop-loss: ${money0(M.stopLoss)}.`);
        if (M.bufferToFloor !== null && M.bufferToFloor !== undefined && M.bufferToFloor < F.size * 0.03) W.push('Overall drawdown limit is very close — halve your risk.');
        if (!R && M.goalMonthly && M.neededPerDay && M.dailyTarget && M.neededPerDay > M.dailyTarget * 1.5) W.push(`Your monthly goal now needs ${money0(M.neededPerDay)}/day, far above your daily target (${money0(M.dailyTarget)}). Adjust the goal rather than the risk.`);
        if (M.score !== null && M.scoreParts.lossControl < 50) W.push('Your worst loss day is much bigger than your average win — work on loss control.');
        return { explain: L, standing: S, drawdown: D, plan: P, warnings: W };
    }

    /* ---------- 4. AI (shared config with Terminal -> Settings -> AI API) ---------- */
    

    function factsForAI(F, M) {
        const r = x => (typeof x === 'number' && isFinite(x)) ? Math.round(x * 100) / 100 : x;
        const out = { account: F.name, type: F.kind === 'prop' ? 'prop-firm challenge/funded' : F.kind === 'binary' ? 'binary options' : 'personal forex', startBalance: r(F.size), balance: r(F.balance), tradedDays: M.n, totalPnl: r(M.pnl), profitDays: M.profitDays, lossDays: M.lossDays, bestDay: r(M.best), worstDay: r(M.worst), avgDaily: r(M.avgDaily), avgWinDay: r(M.avgWinDay), avgLossDay: r(M.avgLossDay), dayWinRatePct: r(M.dayWR), bestDaySharePct: r(M.share), consistencyScore: M.score, today: { logged: M.todayLogged, pnl: r(M.todayPnl) } };
        if (F.failed) out.accountStatus = 'FAILED: ' + F.failed;
        if (M.rules) Object.assign(out, { drawdownType: M.ddType, highestBalance: r(M.peak), overallDrawdownAmount: r(M.ovAmt), tradingRules: { weekendHolding: M.rules.weekendHolding, overnightHolding: M.rules.overnightHolding, newsTrading: M.rules.newsTrading }, rules: M.rules, consistencyLimitPct: M.L || null, status: M.status || null, profitTargetAmount: r(M.profitTargetAmt), profitRemaining: r(M.remaining), dailyLossLimitAmount: r(M.dailyLossAmt), balanceFloor: r(M.floor), bufferToFloor: r(M.bufferToFloor), minTradingDaysLeft: M.minDaysLeft, profitableDaysLeft: M.profDaysLeft, minEqualProfitDaysForRule: M.minEqualDays || null, safeMaxProfitForOneDay: r(M.dayMaxProfit), extraProfitNeededFromOtherDays: r(M.extraNeeded), recommendedDays: M.recDays || null, recommendedDailyTarget: r(M.dailyTarget), recommendedDailyStopLoss: r(M.stopLoss) });
        else Object.assign(out, { monthlyGoal: r(M.goalMonthly), monthPnlSoFar: r(M.monthPnl), tradingDaysLeftThisMonth: M.daysLeft, neededPerDay: r(M.neededPerDay), userDailyTarget: r(M.goalDaily), winRateTargetPct: M.goalWR || null, tradeWinRatePct: r(M.winRateTrades), recommendedDailyTarget: r(M.dailyTarget), recommendedStopForDayProfit: r(M.dayMaxProfit), recommendedDailyStopLoss: r(M.stopLoss) });
        return out;
    }
    const SYS = () => `You are a calm AI trading coach inside a trading journal app. You coach on drawdown management (static vs trailing), consistency and daily targets. You get FACTS (already calculated) about one account. Use ONLY numbers present in FACTS; never invent or recalculate numbers, copy dollar amounts as given. Explain simply for a beginner.
${'Write in simple English.'}
Return ONLY JSON: {"headline": "one short line verdict", "explain": ["2-3 short lines: what the consistency rule / consistency means here"], "standing": ["2-4 lines: where the account stands now"], "drawdown": ["2-4 lines: how to manage drawdown for THIS account's drawdownType (static = fixed floor; trailing = floor follows highestBalance) using balanceFloor and bufferToFloor, only if drawdownType exists"], "daily_plan": ["3-5 lines: exact daily target, max profit for one day, daily stop-loss, how many days"], "this_week": ["2-3 lines"], "warnings": ["0-3 lines only if real risk"], "mindset": "one short line"}. No markdown. Not financial advice.`;

    /* ---------- 5. modal UI ---------- */
    const tile = (label, val, sub, cls) => `<div class="bg-aura-bg border border-aura-border rounded-lg p-3"><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">${label}</div><div class="text-lg font-bold font-mono ${cls || 'text-white'} mt-1">${val}</div>${sub ? `<div class="text-[10px] text-gray-500 mt-0.5">${sub}</div>` : ''}</div>`;
    const list = a => (a && a.length) ? `<ul class="space-y-1.5">${a.map(x => `<li class="flex gap-2 text-[13px] text-gray-300 leading-relaxed"><span class="text-blue-400 shrink-0">•</span><span>${esc(x)}</span></li>`).join('')}</ul>` : '';
    const sec = (title, inner, tone) => inner ? `<div class="rounded-lg border ${tone || 'border-aura-border'} bg-aura-bg/60 p-3.5"><div class="text-[11px] font-mono uppercase tracking-wider text-gray-500 mb-2">${title}</div>${inner}</div>` : '';

    function scoreBlock(M) {
        if (M.score === null) return `<div class="rounded-lg border border-dashed border-aura-border p-3 text-xs text-gray-400">The consistency score needs at least 3 traded days (currently ${M.n}).</div>`;
        const c = M.score >= 75 ? 'text-aura-green' : M.score >= 50 ? 'text-aura-amber' : 'text-aura-red';
        const lbl = M.score >= 75 ? 'Strong' : M.score >= 50 ? 'Building' : 'Needs work';
        const p = M.scoreParts, bar = (n, v) => `<div class="flex items-center gap-2 text-[10px] font-mono text-gray-400"><span class="w-24 shrink-0">${n}</span><div class="flex-1 h-1.5 rounded-full bg-aura-hover overflow-hidden"><div class="h-full ${v >= 75 ? 'bg-aura-green' : v >= 50 ? 'bg-aura-amber' : 'bg-aura-red'}" style="width:${v}%"></div></div><span class="w-8 text-right">${v}</span></div>`;
        return `<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3.5 flex items-center gap-4"><div class="text-center shrink-0"><div class="text-4xl font-bold font-mono ${c}">${M.score}</div><div class="text-[10px] uppercase font-mono ${c}">${lbl}</div></div><div class="flex-1 space-y-1.5">${bar('Profit days', p.winDays)}${bar('Spread of profit', p.spread)}${bar('Loss control', p.lossControl)}</div></div>`;
    }
    function tilesBlock(F, M) {
        const t = [];
        if (M.rules) {
            const R = M.rules;
            if (M.L) t.push(tile('Best-day share', M.share === null ? '—' : M.share.toFixed(1) + '%', `limit ${M.L}%`, M.status === 'broken' ? 'text-aura-red' : M.status === 'close' ? 'text-aura-amber' : M.status === 'ok' ? 'text-aura-green' : ''));
            t.push(tile('Daily target', M.targetHit ? 'Target hit' : M.dailyTarget ? money0(M.dailyTarget) : '—', M.recDays ? `over ~${M.recDays} trading days` : ''));
            if (M.dayMaxProfit) t.push(tile('Max profit / day', money0(M.dayMaxProfit), 'above this → stop for the day'));
            if (M.stopLoss) t.push(tile('Daily stop-loss', money0(M.stopLoss), M.dailyLossAmt ? `firm limit ${money0(M.dailyLossAmt)}` : ''));
            if (M.remaining !== null) t.push(tile('Profit left', money0(M.remaining), `target ${money0(M.profitTargetAmt)}`));
            if (R.minTradingDays) t.push(tile('Trading days', `${M.n} / ${R.minTradingDays}`, M.minDaysLeft ? M.minDaysLeft + ' more needed' : 'done', M.minDaysLeft ? '' : 'text-aura-green'));
            if (R.minProfitableDays) t.push(tile('Profitable days', `${M.qualDays} / ${R.minProfitableDays}`, M.profDaysLeft ? M.profDaysLeft + ' more needed' : 'done', M.profDaysLeft ? '' : 'text-aura-green'));
            if (M.floor !== null) t.push(tile('Drawdown type', M.ddType === 'trailing' ? 'Trailing' : 'Static', M.ddType === 'trailing' ? `peak ${money0(M.peak)}` : 'fixed floor', 'text-amber-300'));
            if (M.bufferToFloor !== null) t.push(tile('Room to drawdown', money0(Math.max(0, M.bufferToFloor)), `floor ${money0(M.floor)}${M.ddType === 'trailing' ? ' (moving)' : ''}`, M.bufferToFloor < F.size * 0.03 ? 'text-aura-red' : ''));
            if (M.L && M.extraNeeded > 0) t.push(tile('Repair needed', money0(M.extraNeeded), 'more profit from other days', 'text-aura-red'));
            if (M.L) t.push(tile('Min profit days', M.minEqualDays, 'if all days were equal'));
        } else {
            t.push(tile('Daily target', M.dailyTarget ? money0(M.dailyTarget) : '—', M.goalDaily ? 'your target' : M.neededPerDay ? 'from monthly goal' : 'from your average'));
            if (M.dayMaxProfit) t.push(tile('Stop when day hits', money0(M.dayMaxProfit), '≈ 1.5× target (avoid spikes)'));
            if (M.stopLoss) t.push(tile('Daily stop-loss', money0(M.stopLoss), 'guideline'));
            if (M.goalMonthly) { t.push(tile('Month so far', money0(M.monthPnl), `goal ${money0(M.goalMonthly)}`, M.monthPnl >= 0 ? 'text-aura-green' : 'text-aura-red')); t.push(tile('Still needed', money0(M.remaining), `${M.daysLeft} trading days left`)); }
            t.push(tile('Avg daily PnL', money0(M.avgDaily), `${M.n} traded days`, M.avgDaily >= 0 ? 'text-aura-green' : 'text-aura-red'));
            if (M.share !== null) t.push(tile('Best-day share', M.share.toFixed(1) + '%', 'of all profit', M.share > 40 ? 'text-aura-amber' : ''));
        }
        return `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">${t.join('')}</div>`;
    }
    function scenarioBlock(M) {
        if (!M.scenarios) return '';
        return sec('Pace table · to reach the profit target', `<div class="grid grid-cols-4 gap-2">${M.scenarios.map(s => `<div class="rounded-md border ${s.ok ? 'border-aura-border' : 'border-aura-red/40 bg-aura-red/5'} p-2 text-center"><div class="text-[10px] font-mono text-gray-500">${s.n} days</div><div class="text-sm font-bold font-mono ${s.ok ? 'text-white' : 'text-aura-red'}">${money0(s.per)}</div><div class="text-[9px] ${s.ok ? 'text-gray-600' : 'text-aura-red'}">${s.ok ? 'per day' : 'rule risk'}</div></div>`).join('')}</div><div class="text-[10px] text-gray-500 mt-2">“Rule risk” means a daily profit this large could break the consistency rule.</div>`);
    }
    function goalBlock(F, M) {
        if (M.rules) return '';
        const v = M.goalMonthly || '';
        return `<div class="flex items-center gap-2 flex-wrap rounded-lg border border-aura-border bg-aura-bg/60 p-3"><label class="text-[11px] font-mono uppercase tracking-wider text-gray-500">Monthly goal ($)</label><input id="cons-goal" type="number" min="0" step="1" value="${esc(v)}" placeholder="e.g. 500" class="w-28 bg-aura-bg border border-aura-border rounded-md px-2.5 py-1.5 text-xs text-white"><button onclick="consSaveGoal()" class="px-2.5 py-1.5 rounded-md text-xs font-medium border border-aura-border text-gray-300 hover:bg-aura-hover">Update plan</button><span class="text-[10px] text-gray-500">The daily target is derived from this goal.</span></div>`;
    }
    function keyForm(msg) {
        const prov = (window.CONS_AI.PROVIDERS || []).filter(p => !p.custom);
        return `<div class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
            <div class="text-xs text-amber-300">${esc(msg || 'AI is not connected yet. Add a free key (Groq / Gemini); the key from Terminal → Settings → AI API also works here.')}</div>
            <div class="flex gap-2 flex-wrap"><select id="cons-prov" class="bg-aura-bg border border-aura-border rounded-md px-2.5 py-1.5 text-xs text-white">${prov.map(p => `<option value="${p.id}">${esc(p.label)} · ${esc(p.tag)}</option>`).join('')}</select>
            <input id="cons-key" type="password" autocomplete="off" placeholder="API key" class="flex-1 min-w-[160px] bg-aura-bg border border-aura-border rounded-md px-2.5 py-1.5 text-xs text-white">
            <button onclick="consSaveKey()" class="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white">Save &amp; run</button></div>
            <div class="text-[10px] text-gray-500">The key is stored only in this browser's localStorage.</div></div>`;
    }
    function aiBlock(ai, local, note) {
        if (!ai) return `<div class="space-y-3">${sec('Understand the rule', list(local.explain))}${sec('Where you stand', list(local.standing))}${sec('Managing your drawdown', list(local.drawdown), 'border-amber-500/30')}${sec('Daily plan', list(local.plan), 'border-blue-500/30')}${sec('Warnings', list(local.warnings), 'border-aura-red/30')}${note || ''}</div>`;
        const arr = x => Array.isArray(x) ? x.map(String).filter(Boolean).slice(0, 6) : (x ? [String(x)] : []);
        return `<div class="space-y-3">
            ${ai.headline ? `<div class="text-sm font-semibold text-white">${esc(ai.headline)}</div>` : ''}
            ${sec('Understand the rule', list(arr(ai.explain)))}
            ${sec('Where you stand', list(arr(ai.standing)))}
            ${sec('Managing your drawdown', list(arr(ai.drawdown)), 'border-amber-500/30')}
            ${sec('Daily plan', list(arr(ai.daily_plan)), 'border-blue-500/30')}
            ${sec('This week', list(arr(ai.this_week)))}
            ${sec('Warnings', list(arr(ai.warnings)), 'border-aura-red/30')}
            ${ai.mindset ? `<div class="text-xs text-gray-400 italic">“${esc(ai.mindset)}”</div>` : ''}
            <div class="text-[10px] text-gray-600">${esc(ai._meta || '')} · numbers are calculated by the app, the AI only explains them · not financial advice.</div></div>`;
    }
    function skeleton() { return '<div class="space-y-2">' + [0, 1, 2, 3].map(() => '<div class="h-14 rounded-lg bg-aura-bg border border-aura-border animate-pulse"></div>').join('') + '<div class="text-[11px] text-gray-500">AI is analysing…</div></div>'; }

    function build() {
        const F = ST.ctx === 'ba' ? gatherBa() : gatherFx();
        if (!F) return null;
        ST.F = F; ST.M = compute(F); return F;
    }
    function paintStatic() {
        const F = ST.F, M = ST.M;
        $('cons-title').textContent = F.name;
        $('cons-sub').textContent = (F.kind === 'prop' ? 'Prop firm · ' : F.kind === 'binary' ? 'Binary · ' : 'Forex · ') + M.n + ' traded days';
        $('cons-static').innerHTML = (M.n === 0 ? '<div class="rounded-lg border border-dashed border-aura-border p-3 text-xs text-gray-400">No trades or days logged yet. The plan is based on your rules and targets and will become more accurate as history builds up.</div>' : '') + scoreBlock(M) + tilesBlock(F, M) + scenarioBlock(M) + goalBlock(F, M);
    }
    async function run(force) {
        if (ST.busy) return; const F = ST.F, M = ST.M, out = $('cons-ai'), local = localText(F, M);
        const facts = factsForAI(F, M), ck = JSON.stringify(facts);
        if (!force && ST.cache.has(ck) && Date.now() - ST.cache.get(ck).t < 30 * 60000) { out.innerHTML = aiBlock(ST.cache.get(ck).ai, local); return; }
        if (!window.CONS_AI.hasKey()) { out.innerHTML = aiBlock(null, local, keyForm()); return; }
        ST.busy = true; $('cons-regen').disabled = true; out.innerHTML = skeleton();
        try {
            const { data, provider } = await window.CONS_AI.chatJSON({ system: SYS(), user: 'FACTS:\n' + JSON.stringify(facts), maxTokens: 1000 });
            if (!data || typeof data !== 'object' || !(data.daily_plan || data.standing || data.explain)) throw new Error('The AI returned an empty response');
            data._meta = provider.label + ' · ' + provider.model;
            ST.cache.set(ck, { t: Date.now(), ai: data }); out.innerHTML = aiBlock(data, local);
        } catch (e) {
            const msg = e.code === 'NO_KEY' ? '' : e.status === 401 || e.status === 403 ? 'The key was rejected — please check it and try again.' : ('AI error: ' + (e.message || 'unknown') + (e.detail ? ' — ' + e.detail : ''));
            out.innerHTML = aiBlock(null, local, (msg ? `<div class="text-xs text-aura-red">${esc(msg)} (the app's calculated plan is shown above.)</div>` : '') + `<div class="flex gap-2"><button onclick="consRun(true)" class="px-3 py-1.5 rounded-md text-xs border border-aura-border text-gray-300 hover:bg-aura-hover">Try again</button></div>` + (e.code === 'NO_KEY' || e.status === 401 || e.status === 403 ? keyForm(msg) : ''));
        } finally { ST.busy = false; $('cons-regen').disabled = false; }
    }

    window.consOpen = function (ctx) {
        ST.ctx = ctx; if (!build()) { if (typeof showAppToast === 'function') showAppToast('Open an account first.'); return; }
        const m = $('cons-modal'); m.classList.remove('hidden'); m.classList.add('flex'); paintStatic(); run(false);
        if (typeof renderIcons === 'function') renderIcons();
    };
    window.consClose = function () { const m = $('cons-modal'); m.classList.add('hidden'); m.classList.remove('flex'); };
    window.consRun = run;
    window.consSaveGoal = function () { const v = parseFloat($('cons-goal').value) || 0; lsSet('tradely_cons_goal_' + ST.F.id, String(v)); build(); paintStatic(); run(false); };
    window.consSaveKey = function () { const id = $('cons-prov').value, key = $('cons-key').value.trim(); if (!key) return; window.CONS_AI.saveKey(id, key); run(true); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('cons-modal') && !$('cons-modal').classList.contains('hidden')) consClose(); });
})();
