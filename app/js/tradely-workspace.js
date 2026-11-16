        /* ==================== TRADING WORKSPACE (TradingView Lightweight Charts + Twelve Data live feed) ==================== */
        const TW_SYMBOLS = {
            XAUUSD: { name: 'Gold Spot',        td: 'XAU/USD', precision: 2 },
            EURUSD: { name: 'Euro / US Dollar', td: 'EUR/USD', precision: 5 },
            GBPUSD: { name: 'Pound / US Dollar',td: 'GBP/USD', precision: 5 },
            USDJPY: { name: 'US Dollar / Yen',  td: 'USD/JPY', precision: 3 },
            NAS100: { name: 'US Tech 100',      td: 'NDX',     precision: 1 },
            BTCUSD: { name: 'Bitcoin / USD',    td: 'BTC/USD', precision: 1 }
        };
        const TW_TIMEFRAMES = [
            { id: '1m',  label: '1m',  td: '1min' },
            { id: '5m',  label: '5m',  td: '5min' },
            { id: '15m', label: '15m', td: '15min' },
            { id: '1h',  label: '1H',  td: '1h' },
            { id: '4h',  label: '4H',  td: '4h' },
            { id: '1d',  label: '1D',  td: '1day' }
        ];
        const TW_CHART_TYPES = [
            { id: 'candle', label: 'candlestick-chart', title: 'Candles' },
            { id: 'area',   label: 'area-chart',        title: 'Area' },
            { id: 'line',   label: 'trending-up',       title: 'Line' }
        ];
        const TW_API_BASE = 'https://api.twelvedata.com';
        const TW_KEY_STORAGE = 'tw_twelvedata_api_key';
        const TW_DEFAULT_API_KEY = '1585b10475584caeb49cfe8e99498aa2'; // pre-configured Twelve Data key (Basic/free plan)

        let twChart = null, twMainSeries = null, twVolumeSeries = null;
        let twState = { symbol: 'XAUUSD', timeframe: '15m', chartType: 'candle' };
        let twInitialized = false;
        let twQuoteTimer = null;
        let twLastCandles = [];
        let twWatchQuotes = {}; // cache of last known price per symbol for the watchlist

        function twGetApiKey() {
            return localStorage.getItem(TW_KEY_STORAGE) || TW_DEFAULT_API_KEY;
        }
        function twSetApiKey(key) {
            localStorage.setItem(TW_KEY_STORAGE, key.trim());
        }
        function twFormat(price, symbol) {
            const p = TW_SYMBOLS[symbol].precision;
            return Number(price).toFixed(p);
        }

        function twThemedChartOptions() {
            return {
                layout: {
                    background: { type: 'solid', color: 'transparent' },
                    textColor: '#6b7280',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: 11
                },
                grid: {
                    vertLines: { color: 'rgba(31,36,48,0.6)' },
                    horzLines: { color: 'rgba(31,36,48,0.6)' }
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                    vertLine: { color: '#3b82f6', width: 1, style: 2, labelBackgroundColor: '#3b82f6' },
                    horzLine: { color: '#3b82f6', width: 1, style: 2, labelBackgroundColor: '#3b82f6' }
                },
                rightPriceScale: { borderColor: '#1f2430' },
                timeScale: { borderColor: '#1f2430', timeVisible: true, secondsVisible: false },
                autoSize: true
            };
        }

        function initTradingWorkspace() {
            renderTwTimeframes();
            renderTwChartTypes();
            renderTwWatchlist();

            if (!twInitialized) {
                const container = document.getElementById('tw-chart');
                twChart = LightweightCharts.createChart(container, twThemedChartOptions());
                buildTwSeries();
                twInitialized = true;
            }

            const key = twGetApiKey();
            document.getElementById('tw-api-status').innerHTML = key
                ? '<span class="w-1.5 h-1.5 rounded-full bg-aura-green inline-block"></span> Live'
                : '<span class="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block"></span> Not connected';

            if (!key) {
                twShowKeyPrompt();
            } else {
                twHideOverlay();
                loadTwSymbolData();
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();

            if (twQuoteTimer) clearInterval(twQuoteTimer);
            twQuoteTimer = setInterval(twPollQuote, 10000);
        }

        function buildTwSeries() {
            if (twMainSeries) { twChart.removeSeries(twMainSeries); twMainSeries = null; }
            if (twVolumeSeries) { twChart.removeSeries(twVolumeSeries); twVolumeSeries = null; }

            if (twState.chartType === 'candle') {
                twMainSeries = twChart.addCandlestickSeries({
                    upColor: '#10b981', downColor: '#ef4444',
                    borderVisible: false,
                    wickUpColor: '#10b981', wickDownColor: '#ef4444'
                });
            } else if (twState.chartType === 'area') {
                twMainSeries = twChart.addAreaSeries({
                    lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.35)', bottomColor: 'rgba(59,130,246,0.02)',
                    lineWidth: 2
                });
            } else {
                twMainSeries = twChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
            }

            twVolumeSeries = twChart.addHistogramSeries({
                priceFormat: { type: 'volume' },
                priceScaleId: 'tw-volume',
                color: 'rgba(59,130,246,0.35)'
            });
            twChart.priceScale('tw-volume').applyOptions({
                scaleMargins: { top: 0.82, bottom: 0 }
            });
        }

        // ---- Twelve Data REST calls ----
        async function twFetchTimeSeries(symbol, timeframe) {
            const key = twGetApiKey();
            const cfg = TW_SYMBOLS[symbol];
            const tf = TW_TIMEFRAMES.find(t => t.id === timeframe);
            const url = `${TW_API_BASE}/time_series?symbol=${encodeURIComponent(cfg.td)}&interval=${tf.td}&outputsize=200&timezone=UTC&apikey=${encodeURIComponent(key)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === 'error' || data.code) {
                throw new Error(data.message || 'Twelve Data request failed');
            }
            if (!data.values || !data.values.length) {
                throw new Error('No data returned for this symbol/timeframe.');
            }
            // API returns newest-first; chart needs oldest-first
            return data.values
                .map(v => ({
                    time: Math.floor(Date.parse(v.datetime + ' UTC') / 1000),
                    open: parseFloat(v.open),
                    high: parseFloat(v.high),
                    low: parseFloat(v.low),
                    close: parseFloat(v.close),
                    volume: parseFloat(v.volume) || 0
                }))
                .filter(c => !isNaN(c.time))
                .sort((a, b) => a.time - b.time);
        }

        async function twFetchQuote(symbol) {
            const key = twGetApiKey();
            const cfg = TW_SYMBOLS[symbol];
            const url = `${TW_API_BASE}/quote?symbol=${encodeURIComponent(cfg.td)}&apikey=${encodeURIComponent(key)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === 'error' || data.code) {
                throw new Error(data.message || 'Quote request failed');
            }
            return data;
        }

        async function loadTwSymbolData() {
            if (!twGetApiKey()) { twShowKeyPrompt(); return; }
            twSetLoading(true);
            try {
                const candles = await twFetchTimeSeries(twState.symbol, twState.timeframe);
                twLastCandles = candles;
                twHideOverlay();

                if (twState.chartType === 'candle') {
                    twMainSeries.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
                } else {
                    twMainSeries.setData(candles.map(c => ({ time: c.time, value: c.close })));
                }
                twVolumeSeries.setData(candles.map(c => ({
                    time: c.time, value: c.volume,
                    color: c.close >= c.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'
                })));
                twChart.timeScale().fitContent();

                const last = candles[candles.length - 1];
                const first = candles[0];
                twUpdateReadout(last, first);
                twWatchQuotes[twState.symbol] = { price: last.close, changePct: ((last.close - first.open) / first.open) * 100 };
                renderTwWatchlist();
            } catch (err) {
                twShowError(err.message || 'Failed to load chart data.');
            } finally {
                twSetLoading(false);
            }
        }

        // Poll the real-time quote endpoint for the active symbol and patch the last candle in place
        async function twPollQuote() {
            if (!twGetApiKey() || !twInitialized) return;
            const tab = document.getElementById('tab-charts-main');
            if (!tab || tab.classList.contains('hidden')) return;
            if (document.hidden) return;

            try {
                const q = await twFetchQuote(twState.symbol);
                const price = parseFloat(q.close);
                if (isNaN(price) || !twLastCandles.length) return;

                const lastIdx = twLastCandles.length - 1;
                const last = twLastCandles[lastIdx];
                last.close = price;
                last.high = Math.max(last.high, price);
                last.low = Math.min(last.low, price);
                if (q.volume) last.volume = parseFloat(q.volume) || last.volume;

                const point = twState.chartType === 'candle'
                    ? { time: last.time, open: last.open, high: last.high, low: last.low, close: last.close }
                    : { time: last.time, value: last.close };
                twMainSeries.update(point);
                twVolumeSeries.update({ time: last.time, value: last.volume, color: last.close >= last.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)' });

                twUpdateReadout(last, twLastCandles[0]);
                twWatchQuotes[twState.symbol] = { price: last.close, changePct: parseFloat(q.percent_change) || 0 };
                renderTwWatchlist();
            } catch (err) {
                // Silent on transient poll errors (e.g. rate limit) — keep last good chart on screen
                console.warn('Twelve Data quote poll failed:', err.message);
            }
        }

        function twUpdateReadout(last, first) {
            const symbol = twState.symbol;
            document.getElementById('tw-o').innerText = twFormat(last.open, symbol);
            document.getElementById('tw-h').innerText = twFormat(last.high, symbol);
            document.getElementById('tw-l').innerText = twFormat(last.low, symbol);
            document.getElementById('tw-c').innerText = twFormat(last.close, symbol);

            const chg = ((last.close - first.open) / first.open) * 100;
            const chgEl = document.getElementById('tw-chg');
            chgEl.innerText = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
            chgEl.className = 'px-1.5 py-0.5 rounded border ' + (chg >= 0
                ? 'bg-aura-green/10 text-aura-green border-aura-green/20'
                : 'bg-aura-red/10 text-aura-red border-aura-red/20');

            document.getElementById('tw-bid').innerText = twFormat(last.close, symbol);
            document.getElementById('tw-ask').innerText = twFormat(last.close, symbol);
            document.getElementById('tw-symbol-label').innerText = symbol;
        }

        function twSetLoading(isLoading) {
            const el = document.getElementById('tw-overlay');
            if (isLoading) {
                el.classList.remove('hidden');
                el.innerHTML = `<div class="flex flex-col items-center gap-2 text-gray-400 text-xs">
                    <i data-lucide="loader-2" class="w-5 h-5 animate-spin text-blue-400"></i>
                    Loading live candles from Twelve Data...
                </div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else if (el.dataset.state !== 'error' && el.dataset.state !== 'prompt') {
                el.classList.add('hidden');
            }
        }

        function twHideOverlay() {
            const el = document.getElementById('tw-overlay');
            el.classList.add('hidden');
            el.dataset.state = '';
        }

        function twShowError(message) {
            const el = document.getElementById('tw-overlay');
            el.dataset.state = 'error';
            el.classList.remove('hidden');
            el.innerHTML = `<div class="flex flex-col items-center gap-3 text-center max-w-xs px-4">
                <i data-lucide="alert-triangle" class="w-6 h-6 text-aura-red"></i>
                <div class="text-xs text-gray-300">${message}</div>
                <button onclick="loadTwSymbolData()" class="px-3 py-1.5 rounded-md bg-aura-hover border border-aura-border text-xs text-white hover:border-blue-500/40 transition">Retry</button>
                <button onclick="twShowKeyPrompt()" class="text-[11px] text-gray-500 hover:text-white transition">Change API key</button>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function twShowKeyPrompt() {
            const el = document.getElementById('tw-overlay');
            el.dataset.state = 'prompt';
            el.classList.remove('hidden');
            const existing = twGetApiKey();
            el.innerHTML = `<div class="flex flex-col items-center gap-3 text-center max-w-sm px-6">
                <i data-lucide="plug-zap" class="w-6 h-6 text-blue-400"></i>
                <div class="text-sm font-bold text-white">Connect a live market data feed</div>
                <p class="text-[11px] text-gray-400 leading-relaxed">Real candles need a data provider. Get a free Twelve Data API key (no credit card) at
                    <a href="https://twelvedata.com/register" target="_blank" rel="noopener" class="text-blue-400 hover:underline">twelvedata.com/register</a>, then paste it below.</p>
                <input id="tw-key-input" type="text" value="${existing}" placeholder="Paste your Twelve Data API key" class="w-full bg-aura-bg border border-aura-border rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500/50">
                <button onclick="twSaveKeyFromPrompt()" class="w-full py-2 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition">Connect & Load Live Chart</button>
                ${existing ? '<button onclick="twDisconnectKey()" class="text-[11px] text-gray-500 hover:text-aura-red transition">Disconnect this key</button>' : ''}
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function twSaveKeyFromPrompt() {
            const val = document.getElementById('tw-key-input').value.trim();
            if (!val) return;
            twSetApiKey(val);
            document.getElementById('tw-api-status').innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-aura-green inline-block"></span> Live';
            loadTwSymbolData();
        }

        function twDisconnectKey() {
            localStorage.removeItem(TW_KEY_STORAGE);
            twShowKeyPrompt();
            document.getElementById('tw-api-status').innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block"></span> Not connected';
        }

        function renderTwWatchlist() {
            const el = document.getElementById('tw-watchlist');
            el.innerHTML = Object.entries(TW_SYMBOLS).map(([sym, cfg]) => {
                const active = sym === twState.symbol;
                const q = twWatchQuotes[sym];
                const priceStr = q ? twFormat(q.price, sym) : '--';
                const chgStr = q ? (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%' : '--';
                const chgColor = q && q.changePct < 0 ? 'text-aura-red' : 'text-aura-green';
                return `
                <div onclick="selectTwSymbol('${sym}')" class="p-2 rounded-lg cursor-pointer flex justify-between items-center transition ${active ? 'bg-aura-hover border border-blue-500/30' : 'hover:bg-aura-hover border border-transparent'}">
                    <div>
                        <div class="font-bold text-white">${sym}</div>
                        <div class="text-[10px] text-gray-500">${cfg.name}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-white">${priceStr}</div>
                        <div class="text-[10px] ${chgColor}">${chgStr}</div>
                    </div>
                </div>`;
            }).join('');
        }

        function renderTwTimeframes() {
            const el = document.getElementById('tw-timeframes');
            el.innerHTML = TW_TIMEFRAMES.map(tf => `
                <button onclick="selectTwTimeframe('${tf.id}')" class="px-2 py-1 rounded text-[11px] font-mono transition ${tf.id === twState.timeframe ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-aura-hover'}">${tf.label}</button>
            `).join('');
        }

        function renderTwChartTypes() {
            const el = document.getElementById('tw-chart-types');
            el.innerHTML = TW_CHART_TYPES.map(ct => `
                <button onclick="selectTwChartType('${ct.id}')" title="${ct.title}" class="p-1.5 rounded transition ${ct.id === twState.chartType ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-aura-hover'}"><i data-lucide="${ct.label}" class="w-3.5 h-3.5"></i></button>
            `).join('');
        }

        function selectTwSymbol(sym) {
            twState.symbol = sym;
            document.getElementById('tw-symbol-menu').classList.add('hidden');
            renderTwWatchlist();
            loadTwSymbolData();
        }

        function selectTwTimeframe(tf) {
            twState.timeframe = tf;
            renderTwTimeframes();
            loadTwSymbolData();
        }

        function selectTwChartType(ct) {
            twState.chartType = ct;
            renderTwChartTypes();
            buildTwSeries();
            if (twLastCandles.length) {
                if (ct === 'candle') {
                    twMainSeries.setData(twLastCandles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
                } else {
                    twMainSeries.setData(twLastCandles.map(c => ({ time: c.time, value: c.close })));
                }
                twVolumeSeries.setData(twLastCandles.map(c => ({
                    time: c.time, value: c.volume,
                    color: c.close >= c.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'
                })));
                twChart.timeScale().fitContent();
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function toggleSymbolMenu(e) {
            e.stopPropagation();
            const menu = document.getElementById('tw-symbol-menu');
            const isHidden = menu.classList.contains('hidden');
            if (isHidden) {
                menu.innerHTML = Object.entries(TW_SYMBOLS).map(([sym, cfg]) => {
                    const q = twWatchQuotes[sym];
                    return `
                    <div onclick="selectTwSymbol('${sym}')" class="px-2.5 py-2 rounded-lg cursor-pointer hover:bg-aura-hover flex justify-between items-center text-xs">
                        <span class="font-bold text-white">${sym}</span>
                        <span class="text-gray-500">${q ? twFormat(q.price, sym) : '--'}</span>
                    </div>`;
                }).join('');
                menu.classList.remove('hidden');
            } else {
                menu.classList.add('hidden');
            }
        }
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('tw-symbol-menu');
            const btn = document.getElementById('tw-symbol-btn');
            if (!menu || menu.classList.contains('hidden')) return;
            if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
            menu.classList.add('hidden');
        });

        function adjustLot(delta) {
            const input = document.getElementById('tw-lot');
            let val = Math.max(0.01, (parseFloat(input.value) || 0) + delta);
            input.value = val.toFixed(2);
        }

        let twPositions = [];
        function placeOrder(side) {
            if (!twGetApiKey() || !twLastCandles.length) { twShowKeyPrompt(); return; }
            const symbol = twState.symbol;
            const lot = parseFloat(document.getElementById('tw-lot').value) || 0.01;
            const entry = parseFloat(document.getElementById(side === 'buy' ? 'tw-ask' : 'tw-bid').innerText);
            twPositions.unshift({ id: Date.now(), symbol, side, lot, entry });
            renderTwPositions();
        }

        function closePosition(id) {
            twPositions = twPositions.filter(p => p.id !== id);
            renderTwPositions();
        }

        function renderTwPositions() {
            const el = document.getElementById('tw-positions');
            if (twPositions.length === 0) {
                el.innerHTML = '<div class="text-center text-gray-600 text-[11px] py-6">No open positions</div>';
                return;
            }
            el.innerHTML = twPositions.map(p => `
                <div class="p-2 rounded-lg bg-aura-bg border border-aura-border">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-white">${p.symbol}</span>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${p.side === 'buy' ? 'bg-aura-green/10 text-aura-green' : 'bg-aura-red/10 text-aura-red'}">${p.side.toUpperCase()}</span>
                    </div>
                    <div class="flex justify-between text-gray-500 text-[10px] mt-1">
                        <span>Lot ${p.lot.toFixed(2)}</span>
                        <span>@ ${twFormat(p.entry, p.symbol)}</span>
                    </div>
                    <button onclick="closePosition(${p.id})" class="mt-1.5 w-full text-[10px] text-gray-500 hover:text-aura-red transition">Close</button>
                </div>
            `).join('');
        }

        // SIDEBAR TOGGLE LOGIC
        let isCollapsed = false;
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const icon = document.getElementById('collapse-icon');
            const brandTexts = document.querySelectorAll('.brand-text');

            isCollapsed = !isCollapsed;

            if (isCollapsed) {
                sidebar.classList.remove('w-64');
                sidebar.classList.add('w-16');
                brandTexts.forEach(el => el.classList.add('hidden'));
                icon.setAttribute('data-lucide', 'chevron-right');
            } else {
                sidebar.classList.remove('w-16');
                sidebar.classList.add('w-64');
                brandTexts.forEach(el => el.classList.remove('hidden'));
                icon.setAttribute('data-lucide', 'chevron-left');
            }
            renderIcons();
        }

        // MODALS & DRAWERS TOGGLE
        function toggleCommandPalette() {
            const palette = document.getElementById('command-palette');
            palette.classList.toggle('hidden');
        }

        function openTradeDrawer() {
            document.getElementById('trade-drawer').classList.remove('translate-x-full');
        }

        function closeTradeDrawer() {
            document.getElementById('trade-drawer').classList.add('translate-x-full');
        }

        // ==================== CERTIFICATES ====================
        const CERT_STORAGE_KEY = 'tradely_certificates';
        let certificatePendingImage = null; // base64 data URL of image currently staged in the add-modal
        let activeCertificateId = null;     // id of certificate currently open in the fullscreen viewer
        let certificatesCache = [];         // in-memory copy; the source of truth on disk is IndexedDB

        // Certificates hold big images, so they live in IndexedDB (hundreds of MB) instead of the ~5MB localStorage
        // that is shared with the whole app. Falls back to localStorage only if IndexedDB is unavailable.
        const tdDB = {
            open() {
                return this._p || (this._p = new Promise((res, rej) => {
                    if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
                    const r = indexedDB.open('tradely_db', 1);
                    r.onupgradeneeded = () => r.result.createObjectStore('kv');
                    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
                }));
            },
            async get(k) { const db = await this.open(); return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
            async set(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error); }); }
        };

        async function initCertificates() {
            let list = null;
            try { list = await tdDB.get(CERT_STORAGE_KEY); } catch (e) {}
            if (!Array.isArray(list)) { // first run on IndexedDB: migrate anything saved the old way
                try { const raw = localStorage.getItem(CERT_STORAGE_KEY); list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
                if (list.length) { try { await tdDB.set(CERT_STORAGE_KEY, list); localStorage.removeItem(CERT_STORAGE_KEY); } catch (e) {} }
            }
            certificatesCache = (Array.isArray(list) ? list : []).filter(c => c && c.id && c.image);
            renderCertificates();
        }

        function getCertificates() {
            return certificatesCache;
        }

        async function setCertificates(list) {
            try { await tdDB.set(CERT_STORAGE_KEY, list); certificatesCache = list; return { ok: true }; }
            catch (e) {
                try { localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(list)); certificatesCache = list; return { ok: true }; }
                catch (e2) { console.warn('Certificates: could not persist.', e2); return { ok: false, error: e2 }; }
            }
        }

// Small non-blocking toast for storage warnings, etc.
        // ---- Generic styled confirm popup (returns a Promise<boolean>) ----
        let _appConfirmResolver = null;
        function appConfirm(opts) {
            opts = opts || {};
            if (_appConfirmResolver) appConfirmResolve(false);
            const esc = typeof escapeHtml === 'function' ? escapeHtml : (x => String(x));
            document.getElementById('app-confirm-title').textContent = opts.title || 'Are you sure?';
            // message may reference an item name; it is escaped and highlighted
            document.getElementById('app-confirm-message').innerHTML =
                (opts.message || '').split('{name}').map(esc).join('<span class="text-white font-semibold">' + esc(opts.name || '') + '</span>');
            const img = document.getElementById('app-confirm-preview');
            if (opts.image) { img.src = opts.image; img.classList.remove('hidden'); } else { img.removeAttribute('src'); img.classList.add('hidden'); }
            document.getElementById('app-confirm-ok').textContent = opts.confirmText || 'Delete';
            document.getElementById('app-confirm-cancel').textContent = opts.cancelText || 'Cancel';
            const modal = document.getElementById('app-confirm-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            if (typeof renderIcons === 'function') renderIcons();
            setTimeout(() => { const c = document.getElementById('app-confirm-cancel'); if (c) c.focus(); }, 30);
            return new Promise(res => { _appConfirmResolver = res; });
        }
        function appConfirmResolve(val) {
            const modal = document.getElementById('app-confirm-modal');
            modal.classList.add('hidden'); modal.classList.remove('flex');
            const r = _appConfirmResolver; _appConfirmResolver = null;
            if (r) r(!!val);
        }
        // Escape cancels the confirm first (capture phase, so it doesn't also close the certificate viewer behind it)
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && _appConfirmResolver) { e.stopPropagation(); e.preventDefault(); appConfirmResolve(false); }
        }, true);

        function showAppToast(message, tone) {
            const existing = document.getElementById('certificate-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = 'certificate-toast';
            const toneClasses = tone === 'error'
                ? 'border-aura-red/40 text-aura-red'
                : 'border-amber-500/40 text-amber-400';
            toast.className = `fixed bottom-5 right-5 z-[60] max-w-xs glass-card border ${toneClasses} rounded-lg px-4 py-3 text-xs shadow-2xl`;
            toast.innerText = message;
            document.body.appendChild(toast);

            setTimeout(() => toast.remove(), 6000);
        }

        // escapeHtml() now lives in js/shared.js (one hardened copy for every page)

        function renderCertificates() {
            const grid = document.getElementById('certificates-grid');
            const empty = document.getElementById('certificates-empty');
            if (!grid || !empty) return;

            const certs = getCertificates();

            if (certs.length === 0) {
                grid.innerHTML = '';
                grid.classList.add('hidden');
                empty.classList.remove('hidden');
                empty.classList.add('flex');
                return;
            }

            empty.classList.add('hidden');
            empty.classList.remove('flex');
            grid.classList.remove('hidden');

            grid.innerHTML = certs.map(cert => `
                <div onclick="openCertificateView('${cert.id}')" class="glass-card rounded-xl border border-aura-border overflow-hidden cursor-pointer group transition hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5">
                    <div class="aspect-[4/3] w-full bg-black/40 overflow-hidden">
                        <img src="${escapeHtml(safeImgSrc(cert.image))}" alt="${escapeHtml(cert.title)}" loading="lazy" class="w-full h-full object-contain group-hover:scale-[1.03] transition duration-300">
                    </div>
                    <div class="p-4 space-y-0.5">
                        <h3 class="text-sm font-bold text-white truncate">${escapeHtml(cert.title)}</h3>
                        ${cert.subtitle ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(cert.subtitle)}</p>` : ''}
                    </div>
                </div>
            `).join('');
        }

        // --- Add Certificate Modal ---
        function openAddCertificateModal() {
            certificatePendingImage = null;
            document.getElementById('certificate-title-input').value = '';
            document.getElementById('certificate-subtitle-input').value = '';
            document.getElementById('certificate-description-input').value = '';
            document.getElementById('certificate-image-input').value = '';
            document.getElementById('certificate-form-error').classList.add('hidden');
            resetCertificateImageDrop();

            const modal = document.getElementById('certificate-add-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeAddCertificateModal() {
            const modal = document.getElementById('certificate-add-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function resetCertificateImageDrop() {
            const drop = document.getElementById('certificate-image-drop');
            drop.innerHTML = `
                <i data-lucide="image-plus" class="w-6 h-6 text-gray-500"></i>
                <span class="text-[11px] text-gray-500">Click to upload image</span>
            `;
            renderIcons();
        }

        // Resize + compress an image so many certificates can fit within localStorage's quota
        function compressImage(dataUrl, maxDim, quality) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = function() {
                    let { width, height } = img;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round(height * (maxDim / width));
                            width = maxDim;
                        } else {
                            width = Math.round(width * (maxDim / height));
                            height = maxDim;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); // PNGs with transparency would turn black as JPEG
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = dataUrl;
            });
        }

        // ==================== CLIPBOARD PASTE (Screenshots) ====================
        // Tracks which screenshot list ('binary' | 'forex') should receive a pasted image
        // while the corresponding modal is open, so Ctrl+V works without extra clicks.
        let activeScreenshotPasteTarget = null;

        function addPastedScreenshot(target, dataUrl) {
            const push = (list, render) => {
                compressImage(dataUrl, 1280, 0.72).then(compressed => {
                    list.push({ id: 'shot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), dataUrl: compressed });
                    render();
                }).catch(() => {
                    list.push({ id: 'shot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), dataUrl });
                    render();
                });
            };
            if (target === 'binary') {
                push(bdScreenshots, renderBinaryScreenshots);
            } else if (target === 'forex') {
                push(tfState.screenshots, renderTradeScreenshots);
            }
        }

        function blobToDataUrl(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        // "Paste" button — reads the OS clipboard directly (Chrome/Edge support this on click).
        async function pasteScreenshotFromClipboard(target) {
            try {
                if (navigator.clipboard && navigator.clipboard.read) {
                    const items = await navigator.clipboard.read();
                    let found = false;
                    for (const item of items) {
                        const imgType = item.types.find(t => t.startsWith('image/'));
                        if (imgType) {
                            const blob = await item.getType(imgType);
                            const dataUrl = await blobToDataUrl(blob);
                            addPastedScreenshot(target, dataUrl);
                            found = true;
                        }
                    }
                    if (!found) {
                        showToast ? showToast('No image found on clipboard. Copy a screenshot first, then Paste.') : alert('No image found on clipboard. Copy a screenshot first, then Paste.');
                    }
                    return;
                }
            } catch (err) {
                // Fall through to hint below — most browsers require a user-gesture Ctrl+V for image clipboard access.
            }
            const msg = 'Press Ctrl+V (or Cmd+V) anywhere in this form to paste your screenshot.';
            if (typeof showToast === 'function') showToast(msg); else alert(msg);
        }

        // Native paste event — works everywhere (desktop + most browsers) once the relevant modal is open.
        document.addEventListener('paste', function(e) {
            if (!activeScreenshotPasteTarget) return;
            const items = (e.clipboardData && e.clipboardData.items) || [];
            let handled = false;
            for (const item of items) {
                if (item.type && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (!blob) continue;
                    blobToDataUrl(blob).then(dataUrl => addPastedScreenshot(activeScreenshotPasteTarget, dataUrl));
                    handled = true;
                }
            }
            if (handled) e.preventDefault();
        });

        function handleCertificateImageSelect(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const drop = document.getElementById('certificate-image-drop');
            const errorEl = document.getElementById('certificate-form-error');
            if (!file.type.startsWith('image/')) { errorEl.innerText = 'That file is not an image.'; errorEl.classList.remove('hidden'); return; }
            errorEl.classList.add('hidden');
            drop.innerHTML = `<span class="text-[11px] text-gray-500">Processing image...</span>`;

            const reader = new FileReader();
            reader.onload = function(e) {
                compressImage(e.target.result, 1600, 0.82)
                    .then(compressed => {
                        certificatePendingImage = compressed;
                        drop.innerHTML = `<img src="${escapeHtml(safeImgSrc(certificatePendingImage))}" class="w-full h-full object-contain">`;
                    })
                    .catch(() => {
                        // Browser can't decode it (e.g. HEIC) — never store an undisplayable blob
                        certificatePendingImage = null;
                        resetCertificateImageDrop();
                        errorEl.innerText = 'Could not read this image. Please use a JPG or PNG.';
                        errorEl.classList.remove('hidden');
                    });
            };
            reader.onerror = function() { certificatePendingImage = null; resetCertificateImageDrop(); };
            reader.readAsDataURL(file);
        }

        async function saveCertificate() {
            const title = document.getElementById('certificate-title-input').value.trim();
            const subtitle = document.getElementById('certificate-subtitle-input').value.trim();
            const description = document.getElementById('certificate-description-input').value.trim();
            const errorEl = document.getElementById('certificate-form-error');
            const showErr = (m) => { errorEl.innerText = m; errorEl.classList.remove('hidden'); };

            if (!certificatePendingImage) return showErr('Please upload a certificate image.');
            if (!title) return showErr('Please give this certificate a title.');
            errorEl.classList.add('hidden');

            const newCert = { id: 'cert-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), image: certificatePendingImage, title, subtitle, description, createdAt: new Date().toISOString() };
            const result = await setCertificates([newCert, ...getCertificates()]);
            if (!result.ok) return showErr('Could not save — browser storage is full or blocked. Try a smaller image or free up space.'); // modal stays open, nothing is lost
            renderCertificates();
            closeAddCertificateModal();
            showAppToast('Certificate saved.', 'ok');
        }

        // --- Fullscreen Certificate Viewer ---
        function openCertificateView(id) {
            const cert = getCertificates().find(c => c.id === id);
            if (!cert) return;

            activeCertificateId = id;
            document.getElementById('certificate-view-image').src = cert.image;
            document.getElementById('certificate-view-title').innerText = cert.title;
            document.getElementById('certificate-view-subtitle').innerText = cert.subtitle || '';
            document.getElementById('certificate-view-description').innerText = cert.description || '';

            const modal = document.getElementById('certificate-view-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeCertificateView() {
            const modal = document.getElementById('certificate-view-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            activeCertificateId = null;
        }

        async function deleteCertificateFromView() {
            if (!activeCertificateId) return;
            const cert = getCertificates().find(c => c.id === activeCertificateId);
            const ok = await appConfirm({
                title: 'Delete this certificate?',
                message: 'You are about to permanently delete {name}. The uploaded image will be removed from this browser. This action cannot be undone.',
                name: (cert && cert.title) || 'this certificate',
                image: cert && cert.image,
                confirmText: 'Yes, delete certificate'
            });
            if (!ok || !activeCertificateId) return;
            const result = await setCertificates(getCertificates().filter(c => c.id !== activeCertificateId));
            if (!result.ok) return showAppToast('Could not delete — storage error. Nothing was changed.', 'error');
            renderCertificates();
            closeCertificateView();
        }

        // Close fullscreen viewer with Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('certificate-view-modal');
                if (modal && !modal.classList.contains('hidden')) closeCertificateView();
                const add = document.getElementById('certificate-add-modal');
                if (add && !add.classList.contains('hidden')) closeAddCertificateModal();
            }
        });

        // Initial load (async: reads IndexedDB, migrates old localStorage data)
        initCertificates();

        // ==================== NOTES ====================
        const NOTES_STORAGE_KEY = 'tradely_notes';
        let notesCache = loadNotesFromStorage();
        let selectedNoteId = null;
        let currentNoteTags = [];
        let isNoteDirty = false;
        let noteSaveTimer = null;

        function normalizeNote(n) {
            const now = new Date().toISOString();
            return { id: String(n.id || ('note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7))), title: String(n.title || ''), category: String(n.category || ''),
                tags: Array.isArray(n.tags) ? n.tags.map(String) : [], content: String(n.content || ''), createdAt: n.createdAt || now, updatedAt: n.updatedAt || n.createdAt || now };
        }
        function loadNotesFromStorage() {
            let raw = null;
            try {
                raw = localStorage.getItem(NOTES_STORAGE_KEY);
                const arr = raw ? JSON.parse(raw) : [];
                return Array.isArray(arr) ? arr.filter(Boolean).map(normalizeNote) : [];
            } catch (e) {
                // Corrupt data: keep a backup so the next save can never silently destroy it
                try { if (raw) localStorage.setItem(NOTES_STORAGE_KEY + '_corrupt_backup', raw); } catch (e2) {}
                console.warn('Notes: could not read saved notes.', e);
                return [];
            }
        }

function getNotes() {
            return notesCache;
        }

        function setNotes(list) {
            notesCache = list;
            try {
                localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(list));
                return { ok: true };
            } catch (e) {
                console.warn('Notes: could not persist to localStorage.', e);
                return { ok: false, error: e };
            }
        }

        function formatRelativeDate(iso) {
            const date = new Date(iso);
            const now = new Date();
            const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays > 1 && diffDays < 7) return diffDays + ' days ago';
            return date.toISOString().slice(0, 10);
        }

        function formatFullDate(iso) {
            const date = new Date(iso);
            return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        // --- Sidebar list ---
        function renderNotesList() {
            const listEl = document.getElementById('notes-list');
            const countEl = document.getElementById('notes-count');
            if (!listEl) return;

            const query = (document.getElementById('notes-search-input')?.value || '').trim().toLowerCase();
            const notes = getNotes()
                .slice()
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            const filtered = query
                ? notes.filter(n =>
                    n.title.toLowerCase().includes(query) ||
                    n.content.toLowerCase().includes(query) ||
                    n.category.toLowerCase().includes(query) ||
                    n.tags.some(t => t.toLowerCase().includes(query))
                  )
                : notes;

            countEl.innerText = notes.length + (notes.length === 1 ? ' note' : ' notes');

            if (filtered.length === 0) {
                listEl.innerHTML = `<div class="text-[11px] text-gray-600 text-center py-6 px-2">${query ? 'No notes match your search.' : 'No notes yet — create your first one.'}</div>`;
                return;
            }

            listEl.innerHTML = filtered.map(n => {
                const isActive = n.id === selectedNoteId;
                const title = escapeHtml(n.title || 'Untitled Note');
                const preview = n.category ? escapeHtml(n.category) : (n.tags[0] ? '#' + escapeHtml(n.tags[0]) : '');
                return `
                <div onclick="selectNote('${n.id}')" class="p-2.5 rounded cursor-pointer transition border ${isActive ? 'bg-aura-hover border-aura-border' : 'border-transparent hover:bg-aura-hover'}">
                    <div class="text-xs font-bold ${isActive ? 'text-white' : 'text-gray-300'} truncate">${title}</div>
                    <div class="text-[10px] text-gray-500 mt-1 truncate">${formatRelativeDate(n.updatedAt)}${preview ? ' • ' + preview : ''}</div>
                </div>`;
            }).join('');
        }

        // --- Editor ---
        function renderNoteEditor() {
            const emptyEl = document.getElementById('notes-editor-empty');
            const formEl = document.getElementById('notes-editor-form');
            if (!emptyEl || !formEl) return;
            const note = getNotes().find(n => n.id === selectedNoteId);

            if (!note) {
                emptyEl.classList.remove('hidden');
                emptyEl.classList.add('flex');
                formEl.classList.add('hidden');
                formEl.classList.remove('flex');
                return;
            }

            emptyEl.classList.add('hidden');
            emptyEl.classList.remove('flex');
            formEl.classList.remove('hidden');
            formEl.classList.add('flex');

            document.getElementById('note-title-input').value = note.title;
            document.getElementById('note-category-input').value = note.category;
            document.getElementById('note-content-input').value = note.content;
            document.getElementById('note-updated-label').innerText = 'Last updated ' + formatFullDate(note.updatedAt);
            currentNoteTags = [...note.tags];
            renderTagChips();
            setNoteDirty(false);
        }

        function selectNote(id) {
            flushNoteSave();
            selectedNoteId = id;
            renderNoteEditor();
            renderNotesList();
        }

        function createNewNote() {
            flushNoteSave();
            const now = new Date().toISOString();
            const newNote = { id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), title: 'Untitled Note', category: '', tags: [], content: '', createdAt: now, updatedAt: now };
            const result = setNotes([newNote, ...getNotes()]);
            selectedNoteId = newNote.id;
            renderNotesList();
            renderNoteEditor();
            document.getElementById('note-title-input').focus();
            document.getElementById('note-title-input').select();
            if (!result.ok) showAppToast('New note created, but couldn\'t be saved permanently in this browser.', 'error');
        }

        function setNoteDirty(dirty) {
            isNoteDirty = dirty;
            const indicator = document.getElementById('note-dirty-indicator');
            if (!indicator) return;
            indicator.classList.toggle('hidden', !dirty);
            indicator.classList.toggle('flex', dirty);
        }

        // Every edit schedules an autosave, so nothing typed is ever lost
        function markNoteDirty() {
            setNoteDirty(true);
            clearTimeout(noteSaveTimer);
            noteSaveTimer = setTimeout(() => saveCurrentNote(true), 700);
        }

        // A tag typed but not confirmed with Enter is still kept
        function commitPendingTag() {
            const input = document.getElementById('note-tag-input');
            if (!input) return;
            const raw = input.value.trim().replace(/^#/, '');
            if (raw && !currentNoteTags.some(t => t.toLowerCase() === raw.toLowerCase())) currentNoteTags.push(raw);
            input.value = '';
            renderTagChips();
        }

        function flushNoteSave() {
            clearTimeout(noteSaveTimer);
            if (isNoteDirty && selectedNoteId) saveCurrentNote(true);
        }

        function saveCurrentNote(silent) {
            clearTimeout(noteSaveTimer);
            const note = getNotes().find(n => n.id === selectedNoteId);
            if (!note) return;
            commitPendingTag();
            note.title = document.getElementById('note-title-input').value.trim() || 'Untitled Note';
            note.category = document.getElementById('note-category-input').value.trim();
            note.content = document.getElementById('note-content-input').value;
            note.tags = [...currentNoteTags];
            note.updatedAt = new Date().toISOString();

            const result = setNotes(getNotes().map(n => n.id === note.id ? note : n));
            renderNotesList();
            if (result.ok) {
                document.getElementById('note-updated-label').innerText = 'Last updated ' + formatFullDate(note.updatedAt);
                setNoteDirty(false);
                if (silent !== true) {
                    const btn = document.getElementById('note-save-btn');
                    btn.innerText = 'Saved ✓';
                    setTimeout(() => { btn.innerText = 'Save Note'; }, 1500);
                }
            } else {
                setNoteDirty(true); // still unsaved — keep the warning visible
                showAppToast(result.error && result.error.name === 'QuotaExceededError'
                    ? 'Browser storage is full — this note is NOT saved yet. Delete old notes/screenshots to free space.'
                    : 'Couldn\'t save to this browser\'s storage — this note is NOT saved yet.', 'error');
            }
        }

        async function deleteCurrentNote() {
            const note = getNotes().find(n => n.id === selectedNoteId);
            if (!note) return;
            const ok = await appConfirm({
                title: 'Delete this note?',
                message: 'You are about to permanently delete {name}. Its content and tags will be removed. This action cannot be undone.',
                name: note.title || 'Untitled Note',
                confirmText: 'Yes, delete note'
            });
            if (!ok) return;
            clearTimeout(noteSaveTimer);
            setNoteDirty(false);
            setNotes(getNotes().filter(n => n.id !== note.id));
            selectedNoteId = null;
            renderNotesList();
            renderNoteEditor();
        }

        // --- Tags ---
        function renderTagChips() {
            const container = document.getElementById('note-tags-chips');
            if (!container) return;
            container.innerHTML = currentNoteTags.map((tag, i) => `
                <span class="inline-flex items-center gap-1 bg-aura-bg px-2 py-0.5 rounded text-blue-400 text-[11px] border border-aura-border">
                    #${escapeHtml(tag)}
                    <button type="button" onclick="removeNoteTag(${i})" class="text-gray-500 hover:text-aura-red leading-none">&times;</button>
                </span>
            `).join('');
        }

        function handleTagInputKeydown(event) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const input = event.target;
                const raw = input.value.trim().replace(/^#/, '');
                if (raw && !currentNoteTags.some(t => t.toLowerCase() === raw.toLowerCase())) {
                    currentNoteTags.push(raw);
                    renderTagChips();
                    markNoteDirty();
                }
                input.value = '';
            } else if (event.key === 'Backspace' && event.target.value === '' && currentNoteTags.length) {
                currentNoteTags.pop();
                renderTagChips();
                markNoteDirty();
            }
        }

        function removeNoteTag(index) {
            currentNoteTags.splice(index, 1);
            renderTagChips();
            markNoteDirty();
        }

        // Ctrl/Cmd + S saves the open note while the Notes tab is active
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                const tab = document.getElementById('tab-accounts-notes');
                if (tab && !tab.classList.contains('hidden') && selectedNoteId) {
                    e.preventDefault();
                    saveCurrentNote();
                }
            }
        });

        // Save on tab hide / close, and stay in sync if notes change in another browser tab
        window.addEventListener('pagehide', flushNoteSave);
        window.addEventListener('beforeunload', flushNoteSave);
        document.addEventListener('visibilitychange', () => { if (document.hidden) flushNoteSave(); });
        window.addEventListener('storage', (e) => {
            if (e.key !== NOTES_STORAGE_KEY || isNoteDirty) return;
            notesCache = loadNotesFromStorage();
            if (!notesCache.some(n => n.id === selectedNoteId)) selectedNoteId = null;
            renderNotesList(); renderNoteEditor();
        });
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

        // Initial render for notes (open the most recent note so the editor isn't empty)
        if (notesCache.length) selectedNoteId = notesCache.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0].id;
        renderNotesList();
        renderNoteEditor();

        // ==================== CALENDAR ====================
        // Type selector: 'forex' or 'binary'. Each type keeps its own entries in its own storage key,
        // so forex accounts and binary accounts never mix on the same calendar.
        let calendarType = 'forex';
        // Each Binary account gets its own fresh calendar — this holds which one is currently open,
        // so the toolbar badge can show Name - Platform - Demo/Real - Starting Balance and its
        // storage stays separate per account (see getCalendarStorageKey()).
        let calendarLinkedAccountId = null;
        const CALENDAR_STORAGE_KEYS = {
            forex: 'tradely_calendar_entries_forex',
            binary: 'tradely_calendar_entries_binary'
        };
        // Both calendar types are per-account now: Forex shows only CFD (forex) accounts,
        // Binary shows only Binary accounts — same idea as Quotex.
        function calendarCategoryFor(type) { return type === 'binary' ? 'binary' : 'cfd'; }
        // Binary: one calendar per Binary account. Forex: one calendar per MT5 account (listed across all Forex accounts).
        function calendarAccountsForType(type) {
            if (type === 'binary') return tradelyAccounts.filter(a => a.category === 'binary');
            const out = [];
            tradelyAccounts.filter(a => a.category !== 'binary').forEach(p => (p.mt5Accounts || []).forEach(m => {
                if (fxIsProp(p) && (m.phaseSequence || []).length) fxVisiblePhases(m, p).forEach(l => out.push(decorateMt5(p, m, l)));
                else out.push(decorateMt5(p, m));
            }));
            return out;
        }
        const CALENDAR_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        tradelyAccounts.forEach(a => migrateLegacyForexCalendar(a));
        fxMigratePhaseCalendars();
        { const firstForex = calendarAccountsForType('forex')[0]; if (firstForex) calendarLinkedAccountId = firstForex.id; }
        let calendarEntries = loadCalendarEntriesFromStorage();
        let calendarViewDate = new Date(); // tracks the currently-viewed month (day is irrelevant)
        let calendarModalDateKey = null;

        // Binary calendars are stored per-account (tradely_calendar_entries_binary_<accountId>) so
        // every account starts with its own fresh, empty calendar and none of them ever mix.
        function getCalendarStorageKey() {
            // No account -> no storage at all (calendar is locked until an account is picked).
            if (!calendarLinkedAccountId) return null;
            const linked = getCalendarAccount(calendarLinkedAccountId);
            return `${CALENDAR_STORAGE_KEYS[calendarType]}_${linked ? linked.id : calendarLinkedAccountId}`;
        }

        // Calendar with no (valid) account of the matching type selected = locked: greyed out, empty, unclickable.
        // A failed MT5 account is view-only: stats, calendar and journal stay readable, but nothing can be added, changed or deleted.
        function calendarReadOnly() {
            const ca = calendarLinkedAccountId ? getCalendarAccount(calendarLinkedAccountId) : null;
            return !!(ca && ca.isMt5 && ca.mt5 && ca.mt5.status === 'failed');
        }
        function blockIfReadOnly() {
            if (!calendarReadOnly()) return false;
            if (typeof showAppToast === 'function') showAppToast('This account has failed. It is view-only, so trades cannot be added or changed.', 'error');
            return true;
        }
        function isCalendarLocked() {
            if (!calendarLinkedAccountId) return true;
            const acc = getCalendarAccount(calendarLinkedAccountId);
            return !acc || acc.category !== calendarCategoryFor(calendarType);
        }

        function loadCalendarEntriesFromStorage() {
            if (isCalendarLocked()) return {};
            try {
                const storageKey = getCalendarStorageKey();
                const raw = storageKey ? localStorage.getItem(storageKey) : null;
                if (raw) return JSON.parse(raw);
            } catch (e) {
                console.warn('Calendar: localStorage unavailable, using in-memory data only.', e);
            }
            // Every account starts with a completely fresh, empty calendar.
            return {};
        }

        function switchCalendarType(type) {
            if (type !== 'forex' && type !== 'binary') return;
            // Keep the linked account only if it belongs to this calendar type; otherwise
            // default to the first account of that type (or none -> locked).
            const cur = calendarLinkedAccountId ? getCalendarAccount(calendarLinkedAccountId) : null;
            if (!cur || cur.category !== calendarCategoryFor(type)) {
                const first = calendarAccountsForType(type)[0];
                calendarLinkedAccountId = first ? first.id : null;
            }
            if (calendarType === type) {
                calendarEntries = loadCalendarEntriesFromStorage();
                renderCalendar();
                return;
            }
            calendarType = type;
            calendarEntries = loadCalendarEntriesFromStorage();
            calendarModalDateKey = null;
            const label = document.getElementById('calendar-type-label');
            if (label) label.innerText = type === 'binary' ? 'Binary' : 'Forex';
            const menu = document.getElementById('calendar-type-menu');
            if (menu) menu.classList.add('hidden');
            document.querySelectorAll('.calendar-type-option').forEach(el => {
                el.classList.toggle('text-blue-400', el.dataset.type === type);
                el.classList.toggle('text-gray-300', el.dataset.type !== type);
            });
            renderCalendar();
        }

        function toggleCalendarTypeMenu() {
            const menu = document.getElementById('calendar-type-menu');
            if (menu) menu.classList.toggle('hidden');
        }

        // ---- Per-Account Calendar Switcher (badge shows Name - Platform - Demo/Real - Starting Balance) ----
        function setCalendarLinkedAccount(accountId) {
            const __lk = accountId ? getCalendarAccount(accountId) : null;
            calendarLinkedAccountId = __lk ? __lk.id : (accountId || null);
            renderCalendarAccountBadge();
        }

        // Click the badge to open the dropdown of every created Binary account and jump straight
        // to that account's own calendar.
        function toggleCalendarAccountMenu(e) {
            if (e) e.stopPropagation();
            const menu = document.getElementById('calendar-account-menu');
            if (!menu) return;
            const willOpen = menu.classList.contains('hidden');
            closeCalendarAccountMenu();
            if (willOpen) {
                renderCalendarAccountMenu();
                menu.classList.remove('hidden');
                setTimeout(() => document.addEventListener('click', closeCalendarAccountMenu, { once: true }), 0);
            }
        }

        function closeCalendarAccountMenu() {
            const menu = document.getElementById('calendar-account-menu');
            if (menu) menu.classList.add('hidden');
        }

        function renderCalendarAccountMenu() {
            const menu = document.getElementById('calendar-account-menu');
            if (!menu) return;
            const isBinaryCal = calendarType === 'binary';
            const list = calendarAccountsForType(calendarType);
            if (!list.length) {
                menu.innerHTML = isBinaryCal
                    ? `<div class="px-3 py-3 text-[11px] text-gray-500 leading-relaxed">No Binary accounts yet.<br>Create one to get its own calendar.</div>`
                    : `<div class="px-3 py-3 text-[11px] text-gray-500 leading-relaxed">No MT5 accounts yet.<br>Open a Forex account and add an MT5 account to get its own calendar.</div>`;
                return;
            }
            menu.innerHTML = list.map(acc => {
                const name = escapeHtml(acc.nickname || acc.name || 'Account');
                const platform = escapeHtml(acc.isMt5
                    ? ((acc.parent.nickname || acc.parent.name || 'Account') + ' · ' + (acc.provider ? acc.provider.name : '—') + ' · ' + mt5FmtSize(acc.mt5.size))
                    : (acc.provider ? acc.provider.name : '—'));
                const active = acc.id === calendarLinkedAccountId;
                let tag;
                if (isBinaryCal) {
                    const isReal = acc.mode === 'real';
                    tag = `<span class="text-[9px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${isReal ? 'text-aura-green border-aura-green/20 bg-aura-green/10' : 'text-gray-400 border-aura-border bg-aura-hover'}">${isReal ? 'REAL' : 'DEMO'}</span>`;
                } else {
                    const isFunded = acc.phase ? acc.phase === 'Funded' : acc.subtype === 'funded';
                    tag = `<span class="text-[9px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${isFunded ? 'text-aura-green border-aura-green/20 bg-aura-green/10' : 'text-blue-400 border-blue-500/20 bg-blue-500/10'}">${acc.phase ? escapeHtml(acc.phase.toUpperCase()) : (isFunded ? 'FUNDED' : 'PERSONAL')}</span>`;
                }
                return `<button onclick="selectCalendarAccount('${acc.id}')" class="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-aura-hover transition ${active ? 'bg-aura-hover' : ''}">
                    <span class="flex flex-col min-w-0">
                        <span class="text-white font-semibold truncate">${name}</span>
                        <span class="text-gray-500 text-[10px] font-mono truncate">${platform}</span>
                    </span>
                    ${tag}
                </button>`;
            }).join('');
        }

        function selectCalendarAccount(accountId) {
            closeCalendarAccountMenu();
            const picked = getCalendarAccount(accountId);
            const type = picked && picked.category === 'binary' ? 'binary' : 'forex';
            calendarLinkedAccountId = picked ? picked.id : accountId;
            if (calendarType !== type) {
                calendarType = type;
                const label = document.getElementById('calendar-type-label');
                if (label) label.innerText = type === 'binary' ? 'Binary' : 'Forex';
                document.querySelectorAll('.calendar-type-option').forEach(el => {
                    el.classList.toggle('text-blue-400', el.dataset.type === type);
                    el.classList.toggle('text-gray-300', el.dataset.type !== type);
                });
            }
            calendarEntries = loadCalendarEntriesFromStorage();
            calendarModalDateKey = null;
            renderCalendar();
        }

        function renderCalendarAccountBadge() {
            const badge = document.getElementById('calendar-account-badge');
            const textEl = document.getElementById('calendar-account-badge-text');
            if (!badge || !textEl) return;

            const acc = calendarLinkedAccountId ? getCalendarAccount(calendarLinkedAccountId) : null;
            if (acc && acc.category !== calendarCategoryFor(calendarType)) {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
                return;
            }
            if (!acc) {
                textEl.innerHTML = `<span class="text-gray-400">Select account</span>`;
            } else if (acc.category !== 'binary') {
                // Forex (CFD) account: Name · Firm/Broker · Funded/Personal · Starting balance (if set)
                const name = escapeHtml(acc.nickname || acc.name || 'Account');
                const platform = escapeHtml(acc.provider ? acc.provider.name : '—');
                const isFunded = acc.phase ? acc.phase === 'Funded' : acc.subtype === 'funded';
                const typeLbl = acc.phase || (isFunded ? 'Funded' : 'Personal');
                const sep = '<span class="text-gray-600 mx-1.5">&middot;</span>';
                const hasBal = acc.startingBalance !== undefined && acc.startingBalance !== null && acc.startingBalance !== '';
                textEl.innerHTML =
                    `<span class="text-white">${name}</span>${sep}` +
                    `<span class="text-blue-400">${platform}</span>${sep}` +
                    `<span class="${isFunded ? 'text-aura-green' : 'text-blue-400'} font-bold">${escapeHtml(typeLbl)}</span>` +
                    (hasBal ? `${sep}<span class="text-aura-amber">${Number(acc.startingBalance).toLocaleString()}$</span>` : '');
            } else {
                const name = escapeHtml(acc.nickname || acc.name || 'Account');
                const platform = escapeHtml(acc.provider ? acc.provider.name : '—');
                const isReal = acc.mode === 'real';
                const modeLabel = isReal ? 'Real' : 'Demo';
                const modeClass = isReal ? 'text-aura-green' : 'text-gray-400';
                const hasBalance = acc.startingBalance !== undefined && acc.startingBalance !== null && acc.startingBalance !== '';
                const balance = hasBalance ? `${Number(acc.startingBalance).toLocaleString()}$` : '—';
                const sep = '<span class="text-gray-600 mx-1.5">&middot;</span>';

                textEl.innerHTML =
                    `<span class="text-white">${name}</span>${sep}` +
                    `<span class="text-blue-400">${platform}</span>${sep}` +
                    `<span class="${modeClass} font-bold">${modeLabel}</span>${sep}` +
                    `<span class="text-aura-amber">${balance}</span>`;
            }

            badge.classList.remove('hidden');
            badge.classList.add('flex');
            renderIcons();
        }

        function getCalendarEntries() {
            return calendarEntries;
        }

        // ---- Starting balance (used by Mini Stats) ----
        const STARTING_BALANCE_KEY = 'tradely_starting_balance';
        function loadStartingBalance() {
            try {
                const raw = localStorage.getItem(STARTING_BALANCE_KEY);
                if (raw !== null) return parseFloat(raw) || 0;
            } catch (e) { /* ignore */ }
            return 0;
        }
        function saveStartingBalance(value) {
            try { localStorage.setItem(STARTING_BALANCE_KEY, String(value)); } catch (e) { /* ignore */ }
        }
        let startingBalance = loadStartingBalance();

        // When the Calendar is linked to a Binary account, its starting balance IS that account's
        // starting balance (set once at account creation) — not the old manual/global value below.
        // Falls back to the manual global value for Forex, or when no account is linked yet.
        function getEffectiveStartingBalance() {
            if (calendarLinkedAccountId) {
                const acc = getCalendarAccount(calendarLinkedAccountId);
                if (acc && acc.category === calendarCategoryFor(calendarType)) {
                    const has = acc.startingBalance !== undefined && acc.startingBalance !== null && acc.startingBalance !== '';
                    if (has) return Number(acc.startingBalance) || 0;
                    if (calendarType === 'forex') return 0; // each forex account has its own balance
                }
            }
            return startingBalance;
        }

        function editStartingBalance() {
            const acc = calendarLinkedAccountId ? getCalendarAccount(calendarLinkedAccountId) : null;
            if (calendarType === 'binary' && acc) {
                const msg = 'This calendar is linked to a Binary account — its starting balance comes from that account. Edit it from Accounts instead.';
                if (typeof showToast === 'function') showToast(msg); else alert(msg);
                return;
            }
            if (calendarType === 'forex' && acc) {
                const rawF = prompt('Set starting balance for this account:', acc.startingBalance || '');
                if (rawF === null) return;
                const valF = parseFloat(rawF);
                if (Number.isNaN(valF)) return;
                if (acc.isMt5) acc.mt5.size = valF; else acc.startingBalance = valF;
                saveAccounts();
                renderStatsPanel();
                renderCalendarAccountBadge();
                if (typeof renderAccounts === 'function') renderAccounts();
                return;
            }
            const raw = prompt('Set starting balance:', startingBalance);
            if (raw === null) return;
            const val = parseFloat(raw);
            if (Number.isNaN(val)) return;
            startingBalance = val;
            saveStartingBalance(val);
            renderStatsPanel();
        }

        function setCalendarEntries(entries) {
            const storageKey = getCalendarStorageKey();
            if (!storageKey || isCalendarLocked()) return { ok: false, error: new Error('No account selected') };
            if (calendarReadOnly()) return { ok: false, error: new Error('This account has failed and is view-only.') };
            { // A failed account is closed: no new/changed days after the day it failed (older days stay editable so mistakes can be fixed).
                const ca = getCalendarAccount(calendarLinkedAccountId), mm = ca && ca.isMt5 ? ca.mt5 : null;
                if (mm && mm.status === 'failed' && mm.failInfo && (!ca.phase || ca.phase === mm.failInfo.phase)) {
                    const bad = Object.keys(entries).some(k => k > mm.failInfo.date && JSON.stringify(entries[k]) !== JSON.stringify((calendarEntries || {})[k]));
                    if (bad) { showAppToast('This account FAILED (' + fxFailText(mm) + '). Trading is closed — no new days can be logged.', 'error'); return { ok: false, blocked: true }; }
                }
            }
            calendarEntries = entries;
            try {
                localStorage.setItem(storageKey, JSON.stringify(entries));
                try {
                    const ca = getCalendarAccount(calendarLinkedAccountId);
                    if (ca && ca.isMt5 && fxIsProp(ca.parent)) {
                        const evs = fxEvaluateMt5(ca.mt5, ca.parent).map(e => Object.assign({ m: ca.mt5, parent: ca.parent }, e));
                        if (evs.length) {
                            const adv = evs.find(e => e.type === 'passed' || e.type === 'revived');
                            if (adv) { fxAcc.phase[ca.mt5.id] = fxPhaseOf(ca.mt5, ca.parent); calendarLinkedAccountId = fxCalId(ca.mt5, ca.parent, fxPhaseOf(ca.mt5, ca.parent)); calendarEntries = loadCalendarEntriesFromStorage(); }
                            setTimeout(() => { fxToastEvents(evs); try { renderCfdAccountPage(); } catch (e) {} }, 80);
                        }
                    }
                } catch (e) { console.warn('Phase check failed', e); }
                return { ok: true };
            } catch (e) {
                console.warn('Calendar: could not persist to localStorage.', e);
                return { ok: false, error: e };
            }
        }

        function toDateKey(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function formatMoney(amount) {
            const abs = Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (amount < 0 ? '-$' : '$') + abs;
        }

        function calendarPrevMonth() {
            if (isCalendarLocked()) return;
            if (calendarViewMode === 'all' || calendarViewMode === 'traded') return; // arrows disabled in these views
            if (calendarViewMode === 'year') {
                calendarViewDate = new Date(calendarViewDate.getFullYear() - 1, calendarViewDate.getMonth(), 1);
            } else {
                calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
            }
            renderCalendar();
        }

        function calendarNextMonth() {
            if (isCalendarLocked()) return;
            if (calendarViewMode === 'all' || calendarViewMode === 'traded') return; // arrows disabled in these views
            if (calendarViewMode === 'year') {
                calendarViewDate = new Date(calendarViewDate.getFullYear() + 1, calendarViewDate.getMonth(), 1);
            } else {
                calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
            }
            renderCalendar();
        }

        function calendarGoToday() {
            if (isCalendarLocked()) return;
            calendarViewDate = new Date();
            if (calendarViewMode !== 'month') {
                calendarViewMode = 'month';
                const btnLabel = document.getElementById('calendar-view-mode-label');
                if (btnLabel) btnLabel.textContent = CALENDAR_VIEW_MODE_LABELS.month;
            }
            renderCalendar();
        }

        // Day P&L color rule: > $2 green, < -$2 red, between (inclusive) counts as a breakeven (BE) day
        function getPnlBand(pnl) {
            if (pnl > 2) return 'profit';
            if (pnl < -2) return 'loss';
            return 'be';
        }

        function buildDayCellHtml(cellDate, inCurrentMonth, isToday) {
            const locked = isCalendarLocked();
            const dateKey = toDateKey(cellDate);
            const entry = calendarEntries[dateKey];
            const dayNum = cellDate.getDate();

            let classes = 'day-cell glass-card min-h-[104px] p-2.5 rounded-lg border text-sm font-sans cursor-pointer transition flex flex-col justify-between ';
            if (!inCurrentMonth) {
                classes += 'border-aura-border/30 opacity-40 hover:opacity-70 ';
            } else if (entry) {
                const band = getPnlBand(entry.pnl);
                if (band === 'profit') classes += 'border-aura-green/40 bg-aura-green/10 hover:border-aura-green/70 ';
                else if (band === 'loss') classes += 'border-aura-red/40 bg-aura-red/10 hover:border-aura-red/70 ';
                else classes += 'border-aura-amber/40 bg-aura-amber/10 hover:border-aura-amber/70 ';
            } else {
                classes += 'border-aura-border hover:border-blue-500/30 hover:bg-aura-hover ';
            }
            if (isToday) classes += 'ring-1 ring-blue-500/60 ';

            let inner = `<span class="font-sans font-bold text-sm ${isToday ? 'text-blue-400' : 'text-gray-200'}">${dayNum}</span>`;
            if (entry) {
                const band = getPnlBand(entry.pnl);
                const pnlColor = band === 'profit' ? 'text-aura-green' : (band === 'loss' ? 'text-aura-red' : 'text-aura-amber');
                const wr = entry.trades > 0 ? Math.round((entry.wins / entry.trades) * 100) : 0;
                inner += `<div>
                    <div class="${pnlColor} font-mono font-extrabold text-lg leading-tight">${formatMoney(entry.pnl)}</div>
                    <div class="text-xs font-sans font-semibold text-gray-300">${entry.trades} Trade${entry.trades === 1 ? '' : 's'} <span class="text-gray-400 font-medium">(${wr}% WR)</span></div>
                </div>`;
            } else if (inCurrentMonth && !locked) {
                inner += `<div class="text-xs font-sans font-medium text-gray-500">No Trades</div>`;
            }

            return `<div class="${classes}" ${locked ? '' : `onclick="openDayModal('${dateKey}')"`}>${inner}</div>`;
        }

        function buildWeekLabelCellHtml(weekIndex, weekStats) {
            const locked = isCalendarLocked();
            const hasTrades = weekStats && weekStats.trades > 0;
            const pnlColor = !hasTrades ? 'text-gray-500' : (weekStats.pnl > 0 ? 'text-aura-green' : (weekStats.pnl < 0 ? 'text-aura-red' : 'text-aura-amber'));
            const borderClass = !hasTrades
                ? 'border-aura-border/40'
                : (weekStats.pnl > 2 ? 'border-aura-green/40' : (weekStats.pnl < -2 ? 'border-aura-red/40' : 'border-aura-amber/40'));

            const body = hasTrades
                ? `<div class="font-mono font-extrabold text-sm leading-tight ${pnlColor}">${formatMoney(weekStats.pnl)}</div>
                   <div class="text-[10px] font-sans font-semibold text-gray-400 leading-tight">${weekStats.trades} Trade${weekStats.trades === 1 ? '' : 's'} <span class="text-gray-500">(${weekStats.winRate}% WR)</span></div>`
                : (locked ? '' : `<div class="text-[10px] font-sans font-medium text-gray-500">No Trades</div>`);

            return `<div class="week-label-cell glass-card min-h-[96px] rounded-lg border ${borderClass} flex flex-col items-center justify-center gap-1 px-1 text-center">
                <span class="font-sans font-bold text-[11px] text-gray-400 tracking-wide">Week ${weekIndex + 1}</span>
                ${body}
            </div>`;
        }

        function renderMonthGridView() {
            const label = document.getElementById('calendar-month-label');
            const cellsEl = document.getElementById('calendar-cells');
            if (!label || !cellsEl) return;

            const year = calendarViewDate.getFullYear();
            const month = calendarViewDate.getMonth();
            label.innerText = `${CALENDAR_MONTH_NAMES[month]} ${year}`;

            const firstOfMonth = new Date(year, month, 1);
            const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
            const gridStart = new Date(year, month, 1 - startWeekday);
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const totalWeeks = Math.ceil((startWeekday + daysInMonth) / 7);

            const today = new Date();
            const todayKey = toDateKey(today);

            let html = '';
            for (let w = 0; w < totalWeeks; w++) {
                let weekPnl = 0, weekTrades = 0, weekWins = 0;
                for (let d = 0; d < 7; d++) {
                    const i = w * 7 + d;
                    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
                    const inCurrentMonth = cellDate.getMonth() === month;
                    const isToday = toDateKey(cellDate) === todayKey;
                    html += buildDayCellHtml(cellDate, inCurrentMonth, isToday);

                    const entry = calendarEntries[toDateKey(cellDate)];
                    if (entry) {
                        weekPnl += entry.pnl;
                        weekTrades += entry.trades;
                        weekWins += entry.wins;
                    }
                }
                const weekStats = {
                    pnl: weekPnl,
                    trades: weekTrades,
                    winRate: weekTrades > 0 ? Math.round((weekWins / weekTrades) * 100) : 0
                };
                html += buildWeekLabelCellHtml(w, weekStats);
            }
            cellsEl.innerHTML = html;

            // Monthly stats
            const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
            let totalPnl = 0, totalTrades = 0, totalWins = 0;
            Object.keys(calendarEntries).forEach(key => {
                if (key.startsWith(monthPrefix)) {
                    const e = calendarEntries[key];
                    totalPnl += e.pnl;
                    totalTrades += e.trades;
                    totalWins += e.wins;
                }
            });

            const pnlEl = document.getElementById('calendar-monthly-pnl');
            pnlEl.innerText = formatMoney(totalPnl);
            // Kept hidden intentionally: this value is tracked internally only (no longer shown next to Show Stats).
            pnlEl.className = 'hidden font-bold ' + (totalPnl > 0 ? 'text-aura-green' : (totalPnl < 0 ? 'text-aura-red' : 'text-white'));

            document.getElementById('calendar-winrate').innerText = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) + '%' : '--%';
            document.getElementById('calendar-trade-count').innerText = totalTrades;

            document.getElementById('page-subtitle').innerText = `${CALENDAR_MONTH_NAMES[month]} ${year}`;
            renderStatsPanel();
            renderIcons();
        }

        // ==================== CALENDAR VIEW MODE (Monthly / All Time / Yearly / Traded Months) ====================
        // 'month'  -> normal single-month grid (default)
        // 'all'    -> all-time summary + month-by-month breakdown
        // 'year'   -> all 12 months of the selected year, scrollable
        // 'traded' -> only the months that actually have logged trades, scrollable
        let calendarViewMode = 'month';
        const CALENDAR_VIEW_MODE_LABELS = { month: 'Monthly View', all: 'All Time View', year: 'Yearly View', traded: 'Traded Months' };

        // Maps the current view mode to the scope used by computeMonthStats() for the stats panel.
        function getStatsScopeType() {
            if (calendarViewMode === 'all') return 'all';
            if (calendarViewMode === 'year') return 'year';
            if (calendarViewMode === 'traded') return 'all';
            return 'month';
        }

        // Master dispatcher — every place that used to call renderCalendar() keeps working,
        // it now just renders whichever view is currently active.
        // Elements that get greyed out + disabled while the calendar is locked (type + account pickers stay usable).
        const CALENDAR_LOCK_TARGET_IDS = ['calendar-prev-btn', 'calendar-next-btn', 'calendar-today-btn', 'show-stats-btn',
            'calendar-open-panel-btn', 'calendar-view-mode-btn', 'pinned-stats-row', 'stats-panel',
            'calendar-month-grid-wrap', 'calendar-alt-view'];

        function applyCalendarLockState(locked) {
            const root = document.getElementById('tab-accounts-calendar');
            if (root) root.classList.toggle('calendar-locked', locked);
            const targets = CALENDAR_LOCK_TARGET_IDS.map(id => document.getElementById(id)).filter(Boolean);
            const monthLabel = document.getElementById('calendar-month-label');
            if (monthLabel && monthLabel.parentElement) targets.push(monthLabel.parentElement); // label + month picker wrapper
            targets.forEach(el => {
                el.classList.toggle('cal-lock-target', locked);
                if (el.tagName === 'BUTTON') el.disabled = locked;
            });
            if (monthLabel) monthLabel.disabled = locked;
        }

        // Closes anything that could still be open on top of a calendar that just got locked.
        function resetCalendarForLock() {
            calendarEntries = {};              // never keep stale trades in memory without an account
            calendarModalDateKey = null;
            if (calendarViewMode !== 'month') {
                calendarViewMode = 'month';
                const btnLabel = document.getElementById('calendar-view-mode-label');
                if (btnLabel) btnLabel.textContent = CALENDAR_VIEW_MODE_LABELS.month;
            }
            const panel = document.getElementById('stats-panel');
            if (panel) panel.classList.remove('stats-panel-open');
            const statsLabel = document.getElementById('show-stats-btn-label');
            if (statsLabel) statsLabel.textContent = 'Show Stats';
            const statsBtn = document.getElementById('show-stats-btn');
            if (statsBtn) statsBtn.classList.remove('stats-active');
            const picker = document.getElementById('calendar-month-picker');
            if (picker) picker.classList.add('hidden');
            closeSidePanel();
        }

        function renderCalendar() {
            const locked = isCalendarLocked();
            if (locked) resetCalendarForLock();
            applyCalendarLockState(locked);
            renderCalendarAccountBadge();

            const gridWrap = document.getElementById('calendar-month-grid-wrap');
            const altView = document.getElementById('calendar-alt-view');
            const prevBtn = document.getElementById('calendar-prev-btn');
            const nextBtn = document.getElementById('calendar-next-btn');

            if (calendarViewMode === 'month') {
                if (gridWrap) gridWrap.classList.remove('hidden');
                if (altView) altView.classList.add('hidden');
                if (prevBtn) prevBtn.classList.remove('opacity-30', 'pointer-events-none');
                if (nextBtn) nextBtn.classList.remove('opacity-30', 'pointer-events-none');
                renderMonthGridView();
                return;
            }

            if (gridWrap) gridWrap.classList.add('hidden');
            if (altView) altView.classList.remove('hidden');

            if (calendarViewMode === 'year') {
                // Year mode: prev/next arrows shift the whole year.
                if (prevBtn) prevBtn.classList.remove('opacity-30', 'pointer-events-none');
                if (nextBtn) nextBtn.classList.remove('opacity-30', 'pointer-events-none');
                renderYearlyView();
            } else {
                // All Time / Traded Months: arrows don't apply to an aggregate view.
                if (prevBtn) prevBtn.classList.add('opacity-30', 'pointer-events-none');
                if (nextBtn) nextBtn.classList.add('opacity-30', 'pointer-events-none');
                if (calendarViewMode === 'all') renderAllTimeView();
                else renderTradedMonthsView();
            }

            updateCalendarModeLabel();
            renderStatsPanel();
            renderIcons();
        }

        function updateCalendarModeLabel() {
            const label = document.getElementById('calendar-month-label');
            const subtitle = document.getElementById('page-subtitle');
            let text;
            if (calendarViewMode === 'year') text = String(calendarViewDate.getFullYear());
            else if (calendarViewMode === 'all') text = 'All Time';
            else if (calendarViewMode === 'traded') text = 'Traded Months';
            else text = `${CALENDAR_MONTH_NAMES[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()}`;
            if (label) label.innerText = text;
            if (subtitle) subtitle.innerText = text;
        }

        // Cycles Monthly -> All Time -> Yearly -> Traded Months -> Monthly ...
        function cycleCalendarViewMode() {
            if (isCalendarLocked()) return;
            const order = ['month', 'all', 'year', 'traded'];
            const idx = order.indexOf(calendarViewMode);
            calendarViewMode = order[(idx + 1) % order.length];
            const btnLabel = document.getElementById('calendar-view-mode-label');
            if (btnLabel) btnLabel.textContent = CALENDAR_VIEW_MODE_LABELS[calendarViewMode];
            renderCalendar();
        }

        // Builds a compact clickable month summary card, reused by Yearly / Traded Months / All Time views.
        function buildMonthSummaryCard(year, month) {
            const s = computeMonthStats(year, month, 'month');
            const hasTrades = s.totalTrades > 0;
            const pnlColor = !hasTrades ? 'text-gray-500' : (s.totalPnl > 0 ? 'text-aura-green' : (s.totalPnl < 0 ? 'text-aura-red' : 'text-aura-amber'));
            const isCurrent = calendarViewDate.getFullYear() === year && calendarViewDate.getMonth() === month;
            return `<div onclick="jumpToMonth(${year}, ${month})" class="glass-card rounded-lg border ${isCurrent ? 'border-blue-500/50' : 'border-aura-border'} p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/40 transition">
                <div>
                    <div class="text-sm font-bold text-white">${CALENDAR_MONTH_NAMES[month]} ${year}</div>
                    <div class="text-[11px] text-gray-500">${hasTrades ? `${s.tradingDays} trading day${s.tradingDays === 1 ? '' : 's'} • ${s.totalTrades} trade${s.totalTrades === 1 ? '' : 's'}` : 'No trades'}</div>
                </div>
                <div class="text-right font-mono">
                    <div class="text-sm font-bold ${pnlColor}">${hasTrades ? formatMoney(s.totalPnl) : '—'}</div>
                    <div class="text-[10px] text-gray-500">${hasTrades && s.winRate !== null ? s.winRate + '% WR' : ''}</div>
                </div>
            </div>`;
        }

        // Jumping into a specific month from Yearly / Traded Months / All Time / the month-year picker.
        function jumpToMonth(year, month) {
            calendarViewDate = new Date(year, month, 1);
            calendarViewMode = 'month';
            const btnLabel = document.getElementById('calendar-view-mode-label');
            if (btnLabel) btnLabel.textContent = CALENDAR_VIEW_MODE_LABELS.month;
            renderCalendar();
        }

        // All months (YYYY-MM) that actually have at least one logged trade, most recent first.
        function getTradedMonthsList() {
            const monthsSet = new Set();
            Object.keys(calendarEntries).forEach(key => {
                const e = calendarEntries[key];
                if (e && e.trades > 0) monthsSet.add(key.slice(0, 7));
            });
            return Array.from(monthsSet).sort().reverse();
        }

        function renderYearlyView() {
            const altView = document.getElementById('calendar-alt-view');
            if (!altView) return;
            const year = calendarViewDate.getFullYear();
            let html = `<div class="text-center text-[11px] text-gray-500 font-mono mb-1 sticky top-0">${year} — all 12 months</div>`;
            for (let m = 0; m < 12; m++) html += buildMonthSummaryCard(year, m);
            altView.innerHTML = html;
        }

        function renderTradedMonthsView() {
            const altView = document.getElementById('calendar-alt-view');
            if (!altView) return;
            const months = getTradedMonthsList();
            if (months.length === 0) {
                altView.innerHTML = `<div class="text-center text-sm text-gray-500 py-10">No traded months yet.</div>`;
                return;
            }
            let html = `<div class="text-center text-[11px] text-gray-500 font-mono mb-1 sticky top-0">${months.length} traded month${months.length === 1 ? '' : 's'}</div>`;
            months.forEach(ym => {
                const [y, m] = ym.split('-').map(Number);
                html += buildMonthSummaryCard(y, m - 1);
            });
            altView.innerHTML = html;
        }

        function renderAllTimeView() {
            const altView = document.getElementById('calendar-alt-view');
            if (!altView) return;
            const now = calendarViewDate;
            const s = computeMonthStats(now.getFullYear(), now.getMonth(), 'all');
            const pnlColor = s.totalPnl > 0 ? 'text-aura-green' : (s.totalPnl < 0 ? 'text-aura-red' : 'text-gray-400');

            let html = `<div class="glass-card rounded-xl border border-aura-border p-6 text-center space-y-1.5">
                <div class="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">All-Time PNL</div>
                <div class="text-3xl font-mono font-extrabold ${pnlColor}">${formatMoney(s.totalPnl)}</div>
                <div class="text-xs text-gray-500 font-mono">${s.tradingDays} trading day${s.tradingDays === 1 ? '' : 's'} • ${s.totalTrades} trade${s.totalTrades === 1 ? '' : 's'}${s.winRate !== null ? ' • ' + s.winRate + '% WR' : ''}</div>
            </div>`;

            const monthKeys = new Set();
            Object.keys(calendarEntries).forEach(key => monthKeys.add(key.slice(0, 7)));
            const sortedMonths = Array.from(monthKeys).sort().reverse();
            if (sortedMonths.length) {
                html += `<div class="text-[11px] text-gray-500 font-mono mt-4 mb-1 text-center">By month</div>`;
                sortedMonths.forEach(ym => {
                    const [y, m] = ym.split('-').map(Number);
                    html += buildMonthSummaryCard(y, m - 1);
                });
            }
            altView.innerHTML = html;
        }

        // ==================== MONTH / YEAR PICKER (clickable label between the nav arrows) ====================
        let mypPickerYear = new Date().getFullYear();

        function toggleMonthYearPicker() {
            if (isCalendarLocked()) return;
            const picker = document.getElementById('calendar-month-picker');
            if (!picker) return;
            const isHidden = picker.classList.contains('hidden');
            if (isHidden) {
                mypPickerYear = calendarViewDate.getFullYear();
                renderMonthYearPickerGrid();
                picker.classList.remove('hidden');
            } else {
                picker.classList.add('hidden');
            }
        }

        function mypShiftYear(delta) {
            mypPickerYear += delta;
            renderMonthYearPickerGrid();
        }

        function renderMonthYearPickerGrid() {
            const yearEl = document.getElementById('calendar-month-picker-year');
            const gridEl = document.getElementById('calendar-month-picker-grid');
            if (!yearEl || !gridEl) return;
            yearEl.innerText = mypPickerYear;
            const currentYear = calendarViewDate.getFullYear();
            const currentMonth = calendarViewDate.getMonth();
            gridEl.innerHTML = CALENDAR_MONTH_NAMES.map((name, i) => {
                const isSelected = calendarViewMode === 'month' && mypPickerYear === currentYear && i === currentMonth;
                return `<button onclick="mypSelectMonth(${mypPickerYear}, ${i})" class="text-xs font-mono px-2 py-1.5 rounded transition ${isSelected ? 'bg-blue-600 text-white' : 'bg-aura-bg text-gray-300 hover:bg-aura-hover hover:text-white'}">${name.slice(0, 3)}</button>`;
            }).join('');
        }

        function mypSelectMonth(year, month) {
            const picker = document.getElementById('calendar-month-picker');
            if (picker) picker.classList.add('hidden');
            jumpToMonth(year, month);
        }

        document.addEventListener('click', (e) => {
            const picker = document.getElementById('calendar-month-picker');
            const labelBtn = document.getElementById('calendar-month-label');
            if (!picker || picker.classList.contains('hidden')) return;
            if (picker.contains(e.target) || (labelBtn && labelBtn.contains(e.target))) return;
            picker.classList.add('hidden');
        });

        // ==================== MINI STATS ====================
        const WEEKDAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

        // Picks the key with the highest count/value out of a plain object map.
        // Returns null if the map is empty so callers can render '—'.
        function pickTopKey(map) {
            let bestKey = null, bestVal = -Infinity;
            Object.keys(map).forEach(k => {
                if (map[k] > bestVal) { bestVal = map[k]; bestKey = k; }
            });
            return bestKey;
        }
        function pickBottomKey(map) {
            let bestKey = null, bestVal = Infinity;
            Object.keys(map).forEach(k => {
                if (map[k] < bestVal) { bestVal = map[k]; bestKey = k; }
            });
            return bestKey;
        }

        function computeMonthStats(year, month, scopeType) {
            scopeType = scopeType || 'month';
            const yearPrefix = `${year}-`;
            const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
            const dateKeys = Object.keys(calendarEntries).filter(key => {
                if (scopeType === 'all') return true;
                if (scopeType === 'year') return key.startsWith(yearPrefix);
                return key.startsWith(monthPrefix);
            });
            const entries = dateKeys.map(key => calendarEntries[key]);

            let totalPnl = 0, totalTrades = 0, totalWins = 0;
            let totalLosses = 0, totalRefunds = 0;
            let profitDays = 0, lossDays = 0, beDays = 0;
            let highestProfitDay = null, highestLossDay = null;
            let runningPnl = 0, peakPnl = 0, maxDrawdown = 0;

            // Per-trade rollups (populated from Forex tradeLogs; Binary logs entries at day level only)
            let totalRR = 0, rrCount = 0;
            let tpCount = 0, slCount = 0, beCount = 0;
            let tpRfCount = 0, beRfCount = 0, slRfCount = 0;
            const symbolCounts = {};
            const rrTargetCounts = {};
            const sessionCounts = {};
            const sessionPnl = {};
            const weekdayPnl = {};

            dateKeys.forEach(key => {
                const e = calendarEntries[key];
                totalPnl += e.pnl;
                totalTrades += e.trades;
                totalWins += e.wins;
                totalLosses += e.losses || 0;
                totalRefunds += e.refunds || 0;
                const band = getPnlBand(e.pnl);
                if (band === 'profit') profitDays++;
                else if (band === 'loss') lossDays++;
                else beDays++;

                // Only count a day toward "highest profit" if it actually IS a profit day,
                // and only toward "highest loss" if it actually IS a loss day. Previously this
                // compared raw pnl across all days, so a single profit day (with no loss days
                // at all) could incorrectly get shown as the "Highest Loss Day".
                if (band === 'profit' && (highestProfitDay === null || e.pnl > highestProfitDay)) highestProfitDay = e.pnl;
                if (band === 'loss' && (highestLossDay === null || e.pnl < highestLossDay)) highestLossDay = e.pnl;

                runningPnl += e.pnl;
                if (runningPnl > peakPnl) peakPnl = runningPnl;
                const drawdown = peakPnl - runningPnl;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;

                const weekday = WEEKDAY_NAMES_FULL[new Date(key + 'T00:00:00').getDay()];
                weekdayPnl[weekday] = (weekdayPnl[weekday] || 0) + e.pnl;

                (e.tradeLogs || []).forEach(t => {
                    if (t.outcome === 'tp') tpCount++;
                    else if (t.outcome === 'sl') slCount++;
                    else if (t.outcome === 'be') beCount++;

                    if (t.rr && t.rr.enabled) {
                        totalRR += Number(t.rr.achieved) || 0;
                        rrCount++;
                        if (t.rr.targetRR) {
                            const label = '1:' + t.rr.targetRR;
                            rrTargetCounts[label] = (rrTargetCounts[label] || 0) + 1;
                        }
                        if (t.rr.rfEnabled) {
                            if (t.outcome === 'tp') tpRfCount++;
                            else if (t.outcome === 'be') beRfCount++;
                            else if (t.outcome === 'sl') slRfCount++;
                        }
                    }

                    if (t.pair) symbolCounts[t.pair] = (symbolCounts[t.pair] || 0) + 1;
                    if (t.session) {
                        sessionCounts[t.session] = (sessionCounts[t.session] || 0) + 1;
                        sessionPnl[t.session] = (sessionPnl[t.session] || 0) + (Number(t.pnl) || 0);
                    }
                });
            });

            const tradingDays = entries.filter(e => e.trades > 0).length;
            const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : null;
            const winRateDays = tradingDays > 0 ? Math.round((profitDays / tradingDays) * 100) : null;
            const effectiveStartingBalance = getEffectiveStartingBalance();
            const currentBalance = effectiveStartingBalance + totalPnl;

            const avgRR = rrCount > 0 ? totalRR / rrCount : null;
            const mostTradedSymbol = pickTopKey(symbolCounts);
            const mostlyUsedRR = pickTopKey(rrTargetCounts);
            const mostTradedSession = pickTopKey(sessionCounts);
            const mostProfitableSession = Object.keys(sessionPnl).length ? pickTopKey(sessionPnl) : null;
            const mostLossSession = Object.keys(sessionPnl).length ? pickBottomKey(sessionPnl) : null;
            const mostProfitableDay = Object.keys(weekdayPnl).length ? pickTopKey(weekdayPnl) : null;

            return {
                startingBalance: effectiveStartingBalance, totalPnl, totalTrades, totalWins, tradingDays, currentBalance, winRate, winRateDays,
                profitDays, lossDays, beDays, totalLosses, totalRefunds,
                totalRR: rrCount > 0 ? totalRR : null, avgRR,
                tpCount, slCount, beCount, tpRfCount, beRfCount, slRfCount,
                mostTradedSymbol, mostlyUsedRR, mostTradedSession, mostProfitableSession, mostLossSession, mostProfitableDay,
                highestProfitDay, highestLossDay, maxDrawdown
            };
        }

        // Small colored dot tags used to flag stat cards instead of a glowing border.
        // Card border itself always stays the plain, neutral border from .stat-card-glass.
        const DOT = {
            green: 'stat-dot-green',
            red: 'stat-dot-red',
            amber: 'stat-dot-amber',
            pink: 'stat-dot-pink',
            amberRed: 'stat-dot-amberred'
        };

        function statCard(label, value, sub, dotColor) {
            return `<div class="stat-card-glass rounded-xl px-4 py-3.5 flex flex-col gap-1.5 transition min-w-0">
                <span class="text-[11px] text-gray-500 font-semibold tracking-wider uppercase leading-tight break-words flex items-center gap-1.5">
                    ${dotColor ? `<span class="stat-dot ${dotColor}"></span>` : ''}
                    <span>${label}</span>
                </span>
                <span class="text-xl font-mono font-bold text-white leading-tight break-words">${value}</span>
                ${sub ? `<span class="text-[10.5px] text-gray-500 leading-tight">${sub}</span>` : ''}
            </div>`;
        }

        // Pinned variant: same premium glass look, slightly stronger — used for cards that stay
        // visible at all times regardless of the Show/Hide Stats toggle.
        function statCardPinned(label, value, sub, dotColor) {
            return `<div class="stat-card-glass stat-card-pinned rounded-xl px-3.5 py-3 flex flex-col gap-1 transition min-w-0">
                <span class="text-[11px] text-gray-500 font-semibold tracking-wider uppercase leading-tight break-words flex items-center gap-1.5">
                    ${dotColor ? `<span class="stat-dot ${dotColor}"></span>` : ''}
                    <span>${label}</span>
                </span>
                <span class="text-xl font-mono font-bold text-white leading-tight break-words">${value}</span>
                ${sub ? `<span class="text-[10.5px] text-gray-500 leading-tight">${sub}</span>` : ''}
            </div>`;
        }

        // Renders the 3 pinned cards (Current Total Balance / Starting Balance / Total PNL).
        // These always stay visible in the calendar, whether stats are shown or hidden.
        function renderPinnedStats() {
            const row = document.getElementById('pinned-stats-row');
            if (!row) return;

            if (isCalendarLocked()) {
                row.innerHTML = statCardPinned('CURRENT TOTAL BALANCE', '—', 'starting + pnl')
                    + statCardPinned('STARTING BALANCE', '—')
                    + statCardPinned('TOTAL PNL', '—', 'this month');
                renderIcons();
                return;
            }

            const year = calendarViewDate.getFullYear();
            const month = calendarViewDate.getMonth();
            const scope = getStatsScopeType();
            const s = computeMonthStats(year, month, scope);
            const pnlSubLabel = scope === 'all' ? 'all time' : (scope === 'year' ? 'this year' : 'this month');

            const pnlColor = s.totalPnl > 0 ? 'text-aura-green' : (s.totalPnl < 0 ? 'text-aura-red' : 'text-white');
            const pnlDot = s.totalPnl >= 2 ? DOT.green : (s.totalPnl <= -2 ? DOT.red : DOT.amber);

            let html = '';
            html += statCardPinned('CURRENT TOTAL BALANCE', formatMoney(s.currentBalance), 'starting + pnl');
            html += statCardPinned('STARTING BALANCE', `${s.startingBalance >= 0 ? '+' : ''}${s.startingBalance.toFixed(2)}`);
            html += statCardPinned('TOTAL PNL', `<span class="${pnlColor}">${s.totalPnl >= 0 ? '+' : ''}${formatMoney(s.totalPnl)}</span>`, pnlSubLabel, pnlDot);

            row.innerHTML = html;
            renderIcons();
        }

        function renderStatsPanel() {
            renderPinnedStats();

            const body = document.getElementById('stats-panel-body');
            if (!body) return;
            if (isCalendarLocked()) { body.innerHTML = ''; return; }

            const year = calendarViewDate.getFullYear();
            const month = calendarViewDate.getMonth();
            const scope = getStatsScopeType();
            const s = computeMonthStats(year, month, scope);

            let html = '';

            // 4. Monthly Win Rate (days basis)
            html += statCard('MONTHLY WIN RATE (DAYS)', s.winRateDays !== null ? s.winRateDays + '%' : '—', 'profit days / trading days');

            // 5. Monthly Win Rate (trades basis)
            html += statCard('MONTHLY WIN RATE (TRADES)', s.winRate !== null ? s.winRate + '%' : '—', 'wins / total trades');

            html += statCard('TOTAL TRADES', s.totalTrades, `${s.tradingDays} trading days`);
            html += statCard('TOTAL TRADING DAYS', s.tradingDays, 'current month');

            // Day-count breakdown (small colored dots)
            html += statCard('TOTAL PROFIT DAYS', s.profitDays, 'current month', DOT.green);
            html += statCard('TOTAL BE DAYS', s.beDays, 'current month', DOT.amber);
            html += statCard('TOTAL LOSS DAYS', s.lossDays, 'current month', DOT.red);

            html += statCard('HIGHEST PROFIT DAY', s.highestProfitDay !== null ? formatMoney(s.highestProfitDay) : '—', null, DOT.green);
            html += statCard('HIGHEST LOSS DAY', s.highestLossDay !== null ? formatMoney(s.highestLossDay) : '—', null, DOT.red);
            html += statCard('MAX DRAWDOWN', s.maxDrawdown > 0 ? formatMoney(-s.maxDrawdown) : '—', 'current month', DOT.pink);

            if (calendarType === 'binary') {
                // Binary trades don't carry RR / symbol / session data — show what actually applies.
                html += statCard('TOTAL WINS', s.totalWins, 'trades', DOT.green);
                html += statCard('TOTAL LOSSES', s.totalLosses, 'trades', DOT.red);
                html += statCard('TOTAL REFUNDS', s.totalRefunds, 'trades', DOT.amber);
                html += statCard('MOST PROFITABLE DAY', s.mostProfitableDay || '—', 'day of week', DOT.green);
            } else {
                html += statCard('AVG RR', s.avgRR !== null ? (s.avgRR >= 0 ? '+' : '') + s.avgRR.toFixed(2) + 'R' : '—', 'current month');
                html += statCard('TOTAL RR', s.totalRR !== null ? (s.totalRR >= 0 ? '+' : '') + s.totalRR.toFixed(2) + 'R' : '—', 'current month');

                // Trade-based totals (TP/SL/BE and RF variants)
                html += statCard("TOTAL TP'S", s.tpCount, 'trades', DOT.green);
                html += statCard("TOTAL SL'S", s.slCount, 'trades', DOT.red);
                html += statCard("TOTAL BE'S", s.beCount, 'trades', DOT.amber);
                html += statCard("TOTAL TP+RF'S", s.tpRfCount, 'trades', DOT.green);
                html += statCard("TOTAL BE+RF'S", s.beRfCount, 'trades', DOT.green);
                html += statCard("TOTAL SL+RF'S", s.slRfCount, 'trades', DOT.amberRed);

                html += statCard('MOST TRADED SYMBOL', s.mostTradedSymbol || '—', 'current month');
                html += statCard('MOSTLY USED RR', s.mostlyUsedRR || '—', 'current month');
                html += statCard('MOST TRADED SESSION', s.mostTradedSession || '—', 'current month');
                html += statCard('MOST PROFITABLE SESSION', s.mostProfitableSession || '—', 'current month', DOT.green);
                html += statCard('MOST LOSS SESSION', s.mostLossSession || '—', 'current month', DOT.red);
                html += statCard('MOST PROFITABLE DAY', s.mostProfitableDay || '—', 'day of week', DOT.green);
            }

            body.innerHTML = html;
            renderIcons();
        }

        function toggleStatsPanel() {
            if (isCalendarLocked()) return;
            const panel = document.getElementById('stats-panel');
            const label = document.getElementById('show-stats-btn-label');
            const btn = document.getElementById('show-stats-btn');
            if (!panel) return;
            const isOpen = panel.classList.contains('stats-panel-open');
            if (!isOpen) {
                renderStatsPanel();
                // Open on next frame so the max-height/opacity transition animates smoothly
                requestAnimationFrame(() => panel.classList.add('stats-panel-open'));
                if (label) label.textContent = 'Hide Stats';
                if (btn) btn.classList.add('stats-active');
            } else {
                panel.classList.remove('stats-panel-open');
                if (label) label.textContent = 'Show Stats';
                if (btn) btn.classList.remove('stats-active');
            }
        }

        // ==================== RIGHT-SIDE SLIDING PANEL ====================
        let sidePanelTab = 'days';
