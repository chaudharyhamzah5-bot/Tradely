/* settings-ai.js - Settings -> AI API (provider keys + feature routing). Needs window.TradelyAI (tradely-ai.js). */
(function(){
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(m){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[m];});}
        // ==================== SETTINGS → AI API ====================
        (function () {
            const AI = window.TradelyAI, $ = id => document.getElementById(id);
            const pdef = id => AI.PROVIDERS.find(p => p.id === id);
            const usable = id => !!AI.resolved(id);
            const maskKey = k => k ? '••••••••' + k.slice(-4) : '';
            const errText = e => e.code === 'NO_KEY' ? e.message : e.status === 401 || e.status === 403 ? 'Key rejected (' + e.status + ') — check the key.' : e.status === 404 ? `Model "${e.model || '?'}" or endpoint not found (404)${e.detail ? ' — ' + e.detail : ''}.` : e.status === 429 ? 'Rate limit hit — try again shortly.' : e.status ? `HTTP ${e.status}${e.detail ? ' — ' + e.detail : ''}` : e.net ? 'Network/CORS blocked — check connection (local servers need CORS enabled).' : e.name === 'AbortError' ? 'Timed out.' : (e.message || 'Request failed');
            const flash = (id, msg, tone) => { const el = $(id); if (!el) return; el.textContent = msg; el.className = 'text-[11px] font-mono ' + (tone === 'ok' ? 'text-aura-green' : tone === 'err' ? 'text-aura-red' : 'text-gray-500'); };
            let inited = false;

            function summary() {
                const n = AI.PROVIDERS.filter(p => usable(p.id)).length, el = $('set-ai-summary');
                el.textContent = n ? `${n} provider${n > 1 ? 's' : ''} connected` : 'No provider connected';
                el.className = 'geo-pill ' + (n ? '' : 'is-hot');
            }
            function routesHtml() {
                const cfg = AI.load();
                const opt = (id, sel) => `<option value="${id}" ${sel ? 'selected' : ''}>${pdef(id).label}${usable(id) ? '' : ' — no key'}</option>`;
                return AI.FEATURES.map(f => {
                    const r = cfg.routes[f.id];
                    const warn = !usable(r.primary) && !(r.fallback && usable(r.fallback));
                    return `<div class="p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div class="min-w-[180px] flex-1"><div class="text-xs font-semibold text-white">${esc(f.label)}</div><div class="text-[11px] text-gray-500">${esc(f.desc)}</div></div>
                        <label class="text-[11px] text-gray-500 flex items-center gap-2">Primary
                            <select data-set-route="${f.id}" data-slot="primary" class="geo-input px-3 py-2 font-mono font-semibold">${AI.PROVIDERS.map(p => opt(p.id, p.id === r.primary)).join('')}</select></label>
                        <label class="text-[11px] text-gray-500 flex items-center gap-2">Fallback
                            <select data-set-route="${f.id}" data-slot="fallback" class="geo-input px-3 py-2 font-mono font-semibold"><option value="">None</option>${AI.PROVIDERS.filter(p => p.id !== r.primary).map(p => opt(p.id, p.id === r.fallback)).join('')}</select></label>
                        ${warn ? `<div class="basis-full text-[11px] text-amber-400">${esc(pdef(r.primary).label)} has no key yet — add one below, or ${esc(f.label)} AI will ask for a key when used.</div>` : ''}
                    </div>`;
                }).join('');
            }
            function cardHtml(p) {
                const u = AI.load().providers[p.id] || {}, ok = usable(p.id);
                return `<div class="glass-card rounded-xl border border-aura-border p-4 space-y-3" data-set-card="${p.id}">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-aura-hover border border-aura-border flex items-center justify-center text-[11px] font-bold text-white">${esc(p.label.slice(0, 2).toUpperCase())}</div>
                        <div class="min-w-0 flex-1"><div class="text-xs font-semibold text-white truncate">${esc(p.label)}</div><div class="text-[10px] text-gray-500">${esc(p.tag)}</div></div>
                        <span class="geo-pill ${ok ? 'geo-bias-bullish' : ''}" style="${ok ? 'border-color:currentColor' : ''}">${ok ? 'Connected' : 'Not set'}</span>
                    </div>
                    ${p.custom ? `<label class="block text-[11px] text-gray-500 space-y-1">Endpoint (chat completions URL)<input data-f="url" type="url" value="${esc(u.url || '')}" placeholder="http://localhost:11434/v1/chat/completions" class="geo-input w-full px-3 py-2 font-mono"></label>` : ''}
                    <label class="block text-[11px] text-gray-500 space-y-1">API key${p.getKey ? ` · get one at <span class="text-blue-400">${esc(p.getKey)}</span>` : ''}
                        <div class="relative"><input data-f="key" type="password" autocomplete="off" spellcheck="false" placeholder="${esc(u.key ? maskKey(u.key) + '  (saved — type to replace)' : p.keyHint)}" class="geo-input w-full px-3 py-2 pr-14 font-mono">
                        <button type="button" data-set="eye" class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-white px-1">Show</button></div></label>
                    <label class="block text-[11px] text-gray-500 space-y-1">Model
                        <input data-f="model" list="set-models-${p.id}" value="${esc(u.model || p.model)}" placeholder="${esc(p.model || 'model name')}" class="geo-input w-full px-3 py-2 font-mono"><datalist id="set-models-${p.id}">${p.models.map(m => `<option value="${esc(m)}">`).join('')}</datalist></label>
                    <div id="set-models-box-${p.id}" class="hidden flex flex-wrap gap-1.5"></div>
                    <div class="flex items-center gap-2 flex-wrap pt-1">
                        <button data-set="save" class="geo-btn is-primary px-3.5 py-1.5">Save</button>
                        <button data-set="test" class="geo-btn px-3.5 py-1.5">Test</button>
                        <button data-set="models" class="geo-btn px-3.5 py-1.5" title="List the models your key can actually use">Fetch models</button>
                        ${u.key ? '<button data-set="remove" class="geo-btn px-3.5 py-1.5 hover:!border-red-500/60">Remove key</button>' : ''}
                        <span id="set-msg-${p.id}" class="text-[11px] font-mono text-gray-500"></span>
                    </div></div>`;
            }
            function renderAll() { $('set-routes').innerHTML = routesHtml(); $('set-providers').innerHTML = AI.PROVIDERS.map(cardHtml).join(''); summary(); }
            function renderCard(id) { const old = document.querySelector(`[data-set-card="${id}"]`); if (old) old.outerHTML = cardHtml(pdef(id)); $('set-routes').innerHTML = routesHtml(); summary(); } // only this card, so other cards' unsaved input survives
            function refreshRoutes() { $('set-routes').innerHTML = routesHtml(); summary(); }
            function fields(card) {
                const g = n => { const el = card.querySelector(`[data-f="${n}"]`); return el ? el.value.trim() : undefined; };
                return { key: g('key'), model: g('model'), url: g('url') };
            }
            function validUrl(u) { try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(x.hostname)); } catch (e) { return false; } }
            function saveCard(card) {
                const id = card.dataset.setCard, p = pdef(id), f = fields(card), cfg = AI.load(), cur = cfg.providers[id] || {};
                if (p.custom && f.url && !validUrl(f.url)) { flash('set-msg-' + id, 'Endpoint must be https:// (or http://localhost).', 'err'); return false; }
                const next = { ...cur };
                if (f.key) next.key = f.key;
                next.model = f.model && f.model !== p.model ? f.model : (p.custom ? f.model || '' : '');
                if (p.custom) next.url = f.url || '';
                cfg.providers[id] = next;
                if (!AI.save(cfg)) { flash('set-msg-' + id, 'Could not save (browser storage blocked).', 'err'); return false; }
                return true;
            }
            async function onClick(ev) {
                const t = ev.target.closest('[data-set]'); if (!t) return;
                const card = t.closest('[data-set-card]'); const id = card && card.dataset.setCard;
                if (t.dataset.set === 'eye') { const i = card.querySelector('[data-f="key"]'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.textContent = show ? 'Hide' : 'Show'; return; }
                if (t.dataset.set === 'save') { if (saveCard(card)) { renderCard(id); flash('set-msg-' + id, 'Saved ✓', 'ok'); } return; }
                if (t.dataset.set === 'remove') { const cfg = AI.load(); if (cfg.providers[id]) { delete cfg.providers[id].key; AI.save(cfg); try { if (id === 'groq') localStorage.removeItem('tradely_groq_api_key'); } catch (e) {} } renderCard(id); flash('set-msg-' + id, 'Key removed.', 'ok'); return; }
                if (t.dataset.set === 'pick') { const i = card.querySelector('[data-f="model"]'); i.value = t.dataset.model; flash('set-msg-' + id, `Selected ${t.dataset.model} — press Save`, 'ok'); return; }
                if (t.dataset.set === 'models') {
                    const f = fields(card), ov = {}; if (f.key) ov.key = f.key; if (f.url) ov.url = f.url;
                    if (f.url && !validUrl(f.url)) return flash('set-msg-' + id, 'Endpoint must be https:// (or http://localhost).', 'err');
                    t.disabled = true; flash('set-msg-' + id, 'Fetching models…');
                    try {
                        const list = await AI.listModels(id, ov), box = $('set-models-box-' + id), cur = f.model;
                        const dl = document.getElementById('set-models-' + id); if (dl) dl.innerHTML = list.map(m => `<option value="${esc(m)}">`).join('');
                        box.classList.remove('hidden');
                        box.innerHTML = list.slice(0, 40).map(m => `<button type="button" data-set="pick" data-model="${esc(m)}" class="geo-pill hover:!border-blue-400 hover:text-white ${m === cur ? 'is-hot' : ''}">${esc(m)}</button>`).join('') || '<span class="text-[11px] text-gray-500">No chat models returned.</span>';
                        flash('set-msg-' + id, list.length ? (list.includes(cur) ? `${list.length} models · current model is available ✓` : `${list.length} models · "${cur}" is NOT available to this key — click one below, then Save`) : 'No models returned', list.includes(cur) ? 'ok' : 'err');
                    } catch (e) { flash('set-msg-' + id, errText(e), 'err'); }
                    t.disabled = false; return;
                }
                if (t.dataset.set === 'test') {
                    const f = fields(card), ov = {}; if (f.key) ov.key = f.key; if (f.model) ov.model = f.model; if (f.url) ov.url = f.url;
                    if (f.url && !validUrl(f.url)) return flash('set-msg-' + id, 'Endpoint must be https:// (or http://localhost).', 'err');
                    t.disabled = true; flash('set-msg-' + id, 'Testing…');
                    try { const r = await AI.test(id, ov); flash('set-msg-' + id, `✓ Works · ${r.ms}ms · ${r.model}${f.key ? ' (not saved yet)' : ''}`, 'ok'); }
                    catch (e) { flash('set-msg-' + id, errText(e), 'err'); }
                    t.disabled = false;
                }
            }
            function onChange(ev) {
                const s = ev.target.closest('[data-set-route]'); if (!s) return;
                const cfg = AI.load(), r = cfg.routes[s.dataset.setRoute];
                r[s.dataset.slot] = s.value; if (r.fallback === r.primary) r.fallback = '';
                AI.save(cfg); refreshRoutes();
            }
            function init() {
                if (inited) return; inited = true;
                const root = $('tab-settings'); root.addEventListener('click', onClick); root.addEventListener('change', onChange);
                root.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('[data-f]')) { const c = ev.target.closest('[data-set-card]'); if (c && saveCard(c)) { const cid = c.dataset.setCard; renderCard(cid); flash('set-msg-' + cid, 'Saved ✓', 'ok'); } } });
            }
            const _setOriginalSwitchTab = window.switchTab;
            window.switchTab = function (tabId) {
                const result = _setOriginalSwitchTab.apply(this, arguments);
                if (tabId === 'settings') { init(); renderAll(); }
                return result;
            };
        })();

})();
/* header title for the Settings tab */
(function(){var o=window.switchTab;window.switchTab=function(t){var r=o.apply(this,arguments);if(t==='settings'){var a=document.getElementById('page-title'),b=document.getElementById('page-subtitle');if(a)a.innerText='Settings';if(b)b.innerText='AI API · Data & backup · Preferences';}return r;};})();
