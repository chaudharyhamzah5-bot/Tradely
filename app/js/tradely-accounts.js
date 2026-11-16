        // Safe icon renderer - never throws even if the icon library failed to load
        function renderIcons() {
            try {
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } catch (e) {
                console.warn('Icon render skipped:', e);
            }
        }

        // Init Lucide Icons
        renderIcons();

        // ==================== ACCOUNTS MANAGEMENT ====================
        const BINARY_BROKERS = [
            { id: 'quotex', name: 'Quotex', color: '#0057FF', initials: 'QX', domain: 'quotex.io' },
            { id: 'pocketoption', name: 'Pocket Option', color: '#00C2A8', initials: 'PO', domain: 'pocketoption.com' },
            { id: 'iqoption', name: 'IQ Option', color: '#E4002B', initials: 'IQ', domain: 'iqoption.com' },
            { id: 'binomo', name: 'Binomo', color: '#2F80ED', initials: 'BN', domain: 'binomo.com' },
            { id: 'olymptrade', name: 'Olymp Trade', color: '#1FA45C', initials: 'OT', domain: 'olymptrade.com' },
            { id: 'expertoption', name: 'ExpertOption', color: '#F2994A', initials: 'EO', domain: 'expertoption.com' },
            { id: 'deriv', name: 'Deriv', color: '#FF444F', initials: 'DV', domain: 'deriv.com' },
            { id: 'binarycent', name: 'Binarycent', color: '#6C5CE7', initials: 'BC', domain: 'binarycent.com' },
            { id: 'spectre', name: 'Spectre.ai', color: '#111827', initials: 'SP', domain: 'spectre.ai' }
        ];

        const PROP_FIRMS = [
            { id: 'ftmo', name: 'FTMO', color: '#0C6B58', initials: 'FT', domain: 'ftmo.com' },
            { id: 'the5ers', name: 'The5%ers', color: '#1F3C88', initials: '5%', domain: 'the5ers.com' },
            { id: 'fundednext', name: 'FundedNext', color: '#0EA5A5', initials: 'FN', domain: 'fundednext.com' },
            { id: 'myfundedfx', name: 'MyFundedFX', color: '#7C3AED', initials: 'MF', domain: 'myfundedfutures.com' },
            { id: 'alphacapital', name: 'Alpha Capital Group', color: '#111827', initials: 'AC', domain: 'alphacapitalgroup.uk' },
            { id: 'topstep', name: 'TopStep', color: '#B7891C', initials: 'TS', domain: 'topstep.com' },
            { id: 'e8markets', name: 'E8 Markets', color: '#DC2626', initials: 'E8', domain: 'e8markets.com' },
            { id: 'cti', name: 'City Traders Imperium', color: '#374151', initials: 'CT', domain: 'citytradersimperium.com' },
            { id: 'blueguardian', name: 'Blue Guardian', color: '#2563EB', initials: 'BG', domain: 'blueguardiantrading.com' },
            { id: 'bespoke', name: 'Bespoke Funding', color: '#065F46', initials: 'BF', domain: 'bespokefunding.com' },
            { id: 'leeloo', name: 'Leeloo Trading', color: '#EA580C', initials: 'LT', domain: 'leelootrading.com' },
            { id: 'instantfunding', name: 'Instant Funding', color: '#0891B2', initials: 'IF', domain: 'instantfunding.io' },
            { id: 'fundingpips', name: 'Funding Pips', color: '#9333EA', initials: 'FP', domain: 'fundingpips.com' },
            { id: 'ftplus', name: 'Funded Trading Plus', color: '#B45309', initials: 'FT', domain: 'fundedtradingplus.com' },
            { id: 'surgetrader', name: 'SurgeTrader', color: '#1D4ED8', initials: 'ST', domain: 'surgetrader.com' },
            { id: 'fundedtraderclub', name: 'Funded Trader Club', color: '#166534', initials: 'FC', domain: 'fundedtraderclub.com' }
        ];

        const FOREX_BROKERS = [
            { id: 'exness', name: 'Exness', color: '#FFD200', initials: 'EX', domain: 'exness.com' },
            { id: 'xm', name: 'XM', color: '#DA1F26', initials: 'XM', domain: 'xm.com' },
            { id: 'icmarkets', name: 'IC Markets', color: '#0B3D91', initials: 'IC', domain: 'icmarkets.com' },
            { id: 'pepperstone', name: 'Pepperstone', color: '#4CAF50', initials: 'PS', domain: 'pepperstone.com' },
            { id: 'fbs', name: 'FBS', color: '#00A651', initials: 'FBS', domain: 'fbs.com' },
            { id: 'octafx', name: 'OctaFX', color: '#E8262A', initials: 'OC', domain: 'octafx.com' },
            { id: 'hfm', name: 'HFM', color: '#1B1464', initials: 'HF', domain: 'hfm.com' },
            { id: 'tickmill', name: 'Tickmill', color: '#001F5C', initials: 'TM', domain: 'tickmill.com' },
            { id: 'fxtm', name: 'FXTM', color: '#EE2E24', initials: 'FX', domain: 'fxtm.com' },
            { id: 'vantage', name: 'Vantage', color: '#003DA5', initials: 'VT', domain: 'vantagemarkets.com' },
            { id: 'avatrade', name: 'AvaTrade', color: '#E4032E', initials: 'AV', domain: 'avatrade.com' },
            { id: 'ig', name: 'IG', color: '#D9004C', initials: 'IG', domain: 'ig.com' },
            { id: 'oanda', name: 'OANDA', color: '#1A1A1A', initials: 'OA', domain: 'oanda.com' },
            { id: 'interactivebrokers', name: 'Interactive Brokers', color: '#B41E3C', initials: 'IB', domain: 'interactivebrokers.com' },
            { id: 'plus500', name: 'Plus500', color: '#003D6A', initials: 'P5', domain: 'plus500.com' },
            { id: 'etoro', name: 'eToro', color: '#20B26C', initials: 'ET', domain: 'etoro.com' }
        ];

        let tradelyAccounts = [];
        let aaState = { category: null, subtype: null, provider: null, mode: 'demo', currentStep: 'type', pendingAccount: null };

        function aaTextColorFor(hex) {
            hex = String(hex || '#6b7280').replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
            const yiq = (r * 299 + g * 587 + b * 114) / 1000;
            return yiq > 170 ? '#111827' : '#ffffff';
        }

        function providerFallbackHTML(p, size) {
            const textColor = aaTextColorFor(p.color);
            const fontSize = size <= 22 ? 9 : 10.5;
            return `<div style="width:${size}px;height:${size}px;background:${p.color};color:${textColor};font-size:${fontSize}px;" class="rounded-lg flex items-center justify-center font-bold shrink-0 leading-none">${p.initials}</div>`;
        }

        // Real logo icons: pulled live from the broker/prop-firm's own domain.
        // Tries a chain of free logo sources (Clearbit -> Google favicon service),
        // and falls back to the colored-initials avatar automatically if none load.
        function providerIconHTML(p, size) {
            size = size || 34;
            if (!p) return `<div style="width:${size}px;height:${size}px;" class="rounded-lg bg-aura-hover shrink-0"></div>`;
            if (!p.domain) return providerFallbackHTML(p, size);
            const pad = Math.max(2, Math.round(size * 0.12));
            const fallback = providerFallbackHTML(p, size).replace(/"/g, '&quot;');
            const clearbitUrl = `https://logo.clearbit.com/${p.domain}?size=128`;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${p.domain}&sz=128`;
            return `<div style="width:${size}px;height:${size}px;padding:${pad}px;background:#fff;" class="rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-aura-border/60">
                <img src="${clearbitUrl}" alt="${escapeHtml(p.name)}" title="${escapeHtml(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:contain;"
                     onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${faviconUrl}';}else{this.closest('div').outerHTML = decodeURIComponent('${encodeURIComponent(fallback)}');}" />
            </div>`;
        }

        function loadAccounts() {
            try {
                const raw = localStorage.getItem('tradely_accounts');
                tradelyAccounts = raw ? JSON.parse(raw) : [];
            } catch (e) { tradelyAccounts = []; }
            migrateLegacyAccountDays();
        }

        // One-time migration: this account's "own" day log used to live under a separate key
        // (tradely_acc_days_<id>) from the Calendar's per-account key (tradely_calendar_entries_binary_<id>).
        // That's why trades logged in the Calendar never used to show up in the account's Stats page.
        // On first load after the update, merge any old data into the shared key so nothing is lost.
        function migrateLegacyAccountDays() {
            try {
                tradelyAccounts.forEach(acc => {
                    if (acc.category !== 'binary') return;
                    const legacyKey = 'tradely_acc_days_' + acc.id;
                    const legacyRaw = localStorage.getItem(legacyKey);
                    if (!legacyRaw) return;
                    const legacyDays = JSON.parse(legacyRaw);
                    const currentKey = 'tradely_calendar_entries_binary_' + acc.id;
                    const currentRaw = localStorage.getItem(currentKey);
                    const currentDays = currentRaw ? JSON.parse(currentRaw) : {};
                    // Current (Calendar) data wins on conflicting dates since it's the richer entry
                    // (screenshots, mistakes, toggles); legacy only fills in dates missing from it.
                    const merged = { ...legacyDays, ...currentDays };
                    localStorage.setItem(currentKey, JSON.stringify(merged));
                    localStorage.removeItem(legacyKey);
                });
            } catch (e) {
                console.warn('Account day-log migration skipped:', e);
            }
        }

        function saveAccounts() {
            try { localStorage.setItem('tradely_accounts', JSON.stringify(tradelyAccounts)); } catch (e) {}
        }

        function openAddAccountModal() {
            aaState = { category: null, subtype: null, provider: null, mode: 'demo', currentStep: 'type', pendingAccount: null };
            document.getElementById('aa-provider-search').value = '';
            ['aa-field-name', 'aa-field-nickname', 'aa-field-id', 'aa-field-owner', 'aa-field-mail', 'aa-field-balance'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('aa-form-error').classList.add('hidden');
            aaSetMode('demo');
            aaShowStep('type');
            const modal = document.getElementById('add-account-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeAddAccountModal() {
            const modal = document.getElementById('add-account-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('aa-binary-broker-dropdown').classList.add('hidden');
        }

        function aaShowStep(stepId) {
            aaState.currentStep = stepId;
            ['type', 'cfd-subtype', 'provider', 'details', 'crypto', 'ready'].forEach(s => {
                const el = document.getElementById('aa-step-' + s);
                el.classList.add('hidden');
                el.classList.remove('flex');
            });
            const activeEl = document.getElementById('aa-step-' + stepId);
            activeEl.classList.remove('hidden');
            if (stepId === 'crypto' || stepId === 'ready') activeEl.classList.add('flex');

            const titles = {
                'type': 'Add Account',
                'cfd-subtype': 'CFD Account Type',
                'provider': aaState.subtype === 'funded' ? 'Select Prop Firm' : 'Select Broker',
                'details': aaState.category === 'binary' ? 'Binary Account' : (aaState.subtype === 'funded' ? 'Funded Account' : 'Personal Account'),
                'crypto': 'Crypto',
                'ready': 'Account Ready'
            };
            document.getElementById('add-account-title').textContent = titles[stepId];
            document.getElementById('add-account-back-btn').classList.toggle('hidden', stepId === 'type' || stepId === 'ready');

            const primaryBtn = document.getElementById('aa-create-btn');
            const showPrimary = stepId === 'details';
            primaryBtn.classList.toggle('hidden', !showPrimary);
            if (showPrimary) {
                const isFundedCfd = aaState.category === 'cfd' && aaState.subtype === 'funded';
                // Funded CFD: one click on "Done" and the account is ready (no phases/challenge setup).
                primaryBtn.textContent = isFundedCfd ? 'Done' : 'Create Account';
                primaryBtn.onclick = createAccount;
            }
            // On the "ready" screen the footer button just closes the popup.
            const cancelBtn = document.getElementById('aa-cancel-btn');
            if (cancelBtn) cancelBtn.textContent = stepId === 'ready' ? 'Close' : 'Cancel';
            renderIcons();
        }

        function addAccountGoBack() {
            const s = aaState.currentStep;
            if (s === 'cfd-subtype' || s === 'crypto') { aaShowStep('type'); return; }
            if (s === 'provider') { aaShowStep('cfd-subtype'); return; }
            if (s === 'details') {
                if (aaState.category === 'binary') aaShowStep('type');
                else aaShowStep('provider');
                return;
            }
            aaShowStep('type');
        }

        function selectAccountCategory(cat) {
            aaState.category = cat;
            if (cat === 'crypto') { aaShowStep('crypto'); return; }
            if (cat === 'binary') {
                aaState.subtype = null;
                aaState.provider = BINARY_BROKERS.find(b => b.id === 'quotex');
                aaPrepareDetailsForm();
                aaShowStep('details');
                return;
            }
            aaShowStep('cfd-subtype');
        }

        function selectCfdSubtype(subtype) {
            aaState.subtype = subtype;
            aaState.provider = null;
            document.getElementById('aa-provider-search').value = '';
            renderProviderList();
            aaShowStep('provider');
        }

        function currentProviderPool() {
            if (aaState.category === 'binary') return BINARY_BROKERS;
            if (aaState.subtype === 'funded') return PROP_FIRMS;
            return FOREX_BROKERS;
        }

        function renderProviderList() {
            const q = (document.getElementById('aa-provider-search').value || '').toLowerCase().trim();
            const pool = currentProviderPool().filter(p => p.name.toLowerCase().includes(q));
            const list = document.getElementById('aa-provider-list');
            if (pool.length === 0) {
                list.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-gray-500">No results found</div>`;
                return;
            }
            list.innerHTML = pool.map(p => `
                <button onclick="selectProvider('${p.id}')" class="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-aura-border bg-aura-bg hover:border-blue-500/50 hover:bg-aura-hover transition">
                    ${providerIconHTML(p, 32)}
                    <span class="text-[10px] text-gray-300 text-center leading-tight">${escapeHtml(p.name)}</span>
                </button>
            `).join('');
            renderIcons();
        }

        function selectProvider(id) {
            aaState.provider = currentProviderPool().find(x => x.id === id);
            aaPrepareDetailsForm();
            aaShowStep('details');
        }

        function aaPrepareDetailsForm() {
            const isBinary = aaState.category === 'binary';
            const isFunded = aaState.subtype === 'funded';

            const chip = document.getElementById('aa-selected-provider-chip');
            chip.classList.toggle('hidden', isBinary);
            chip.classList.toggle('flex', !isBinary);
            document.getElementById('aa-binary-broker-field').classList.toggle('hidden', !isBinary);

            document.getElementById('aa-field-id-wrap').classList.toggle('hidden', !isBinary);
            document.getElementById('aa-field-owner-wrap').classList.toggle('hidden', isBinary);
            document.getElementById('aa-field-balance-wrap').classList.toggle('hidden', !isBinary);
            document.getElementById('aa-field-mode-wrap').classList.toggle('hidden', !isBinary);

            if (!isBinary && aaState.provider) {
                document.getElementById('aa-selected-provider-icon').innerHTML = providerIconHTML(aaState.provider, 34);
                document.getElementById('aa-selected-provider-name').textContent = aaState.provider.name;
                document.getElementById('aa-selected-provider-type').textContent = isFunded ? 'Prop Firm' : 'Broker';
            }

            if (isBinary) renderBinaryBrokerSelect();
        }

        function aaChangeProvider() {
            renderProviderList();
            aaShowStep('provider');
        }

        function renderBinaryBrokerSelect() {
            document.getElementById('aa-binary-broker-selected').innerHTML = `${providerIconHTML(aaState.provider, 20)}<span>${escapeHtml(aaState.provider.name)}</span>`;
            const dd = document.getElementById('aa-binary-broker-dropdown');
            dd.innerHTML = BINARY_BROKERS.map(b => `
                <button type="button" onclick="selectBinaryBroker('${b.id}')" class="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-aura-hover hover:text-white transition text-left">
                    ${providerIconHTML(b, 22)}<span>${escapeHtml(b.name)}</span>
                </button>
            `).join('');
            renderIcons();
        }

        function toggleBinaryBrokerDropdown() {
            document.getElementById('aa-binary-broker-dropdown').classList.toggle('hidden');
        }

        function selectBinaryBroker(id) {
            aaState.provider = BINARY_BROKERS.find(b => b.id === id);
            renderBinaryBrokerSelect();
            document.getElementById('aa-binary-broker-dropdown').classList.add('hidden');
        }

        document.addEventListener('click', function(e) {
            const field = document.getElementById('aa-binary-broker-field');
            if (field && !field.contains(e.target)) {
                document.getElementById('aa-binary-broker-dropdown').classList.add('hidden');
            }
        });

        function aaSetMode(mode) {
            aaState.mode = mode;
            const demoBtn = document.getElementById('aa-mode-demo-btn');
            const realBtn = document.getElementById('aa-mode-real-btn');
            const base = 'px-3 py-2 rounded-md text-xs font-medium border transition';
            if (mode === 'demo') {
                demoBtn.className = base + ' border-blue-500/50 bg-blue-500/10 text-blue-400';
                realBtn.className = base + ' border-aura-border bg-aura-bg text-gray-400';
            } else {
                realBtn.className = base + ' border-aura-green/50 bg-aura-green/10 text-aura-green';
                demoBtn.className = base + ' border-aura-border bg-aura-bg text-gray-400';
            }
        }

        function createAccount() {
            const errorEl = document.getElementById('aa-form-error');
            const name = document.getElementById('aa-field-name').value.trim();
            if (!name) {
                errorEl.textContent = 'Name is required.';
                errorEl.classList.remove('hidden');
                return;
            }

            const isBinary = aaState.category === 'binary';
            const isFundedCfd = aaState.category === 'cfd' && aaState.subtype === 'funded';
            let startingBalance = null;

            if (isBinary) {
                startingBalance = parseFloat(document.getElementById('aa-field-balance').value);
                if (isNaN(startingBalance) || startingBalance <= 0) {
                    errorEl.textContent = 'Enter a valid starting balance.';
                    errorEl.classList.remove('hidden');
                    return;
                }
            }
            errorEl.classList.add('hidden');

            const account = {
                id: 'acc_' + Date.now(),
                category: aaState.category,
                subtype: aaState.category === 'cfd' ? aaState.subtype : null,
                provider: aaState.provider,
                name: name,
                nickname: document.getElementById('aa-field-nickname').value.trim(),
                accountId: isBinary ? document.getElementById('aa-field-id').value.trim() : '',
                ownerName: !isBinary ? document.getElementById('aa-field-owner').value.trim() : '',
                mail: document.getElementById('aa-field-mail').value.trim(),
                startingBalance: startingBalance,
                mode: isBinary ? aaState.mode : null,
                createdAt: Date.now()
            };

            tradelyAccounts.push(account);
            saveAccounts();

            // The initial starting balance is treated as the account's first deposit,
            // so it shows up in Funds History / Deposits automatically.
            if (isBinary && startingBalance) {
                const initialDeposit = {
                    id: 'fund_' + Date.now(),
                    type: 'deposit',
                    amount: startingBalance,
                    date: toDateKey(new Date()),
                    note: 'Initial deposit',
                    auto: true
                };
                baSaveFunds(account.id, [initialDeposit]);
            }

            renderAccounts();

            // Funded CFD: show "Account ready" and close on its own; everything else closes right away.
            if (isFundedCfd) {
                document.getElementById('aa-ready-sub').textContent = (account.nickname || account.name) + (account.provider ? ' · ' + account.provider.name : '');
                aaShowStep('ready');
                const createdId = account.id;
                setTimeout(() => {
                    const modal = document.getElementById('add-account-modal');
                    if (aaState.currentStep === 'ready' && modal && !modal.classList.contains('hidden')) closeAddAccountModal();
                }, 1600);
                return;
            }
            closeAddAccountModal();
        }

        /* ==================== FOREX ACCOUNT (opens inside the app shell): outer account -> MT5 accounts list + per-MT5 stats ==================== */
        const MT5_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];
        let mt5State = { parentId: null, editingId: null, phasesMode: '1', phases: {} };
        let fxAcc = { selectedMt5: {}, phase: {}, period: 'all', from: '', to: '', expanded: new Set(), dayMap: {}, autoCollapsed: false, charts: { equity: null, dd: null, outcome: null, monthly: null } };

        function mt5FmtSize(n) {
            n = Number(n) || 0;
            if (n >= 1000) return '$' + (n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K';
            return '$' + n;
        }
        // Every evaluation ends in Funded. Instant = Funded only (no evaluation).
        function mt5Sequence(mode) {
            if (mode === 'instant') return ['Funded'];
            if (mode === '2') return ['Phase 1', 'Phase 2', 'Funded'];
            if (mode === '3') return ['Phase 1', 'Phase 2', 'Phase 3', 'Funded'];
            return ['Phase 1', 'Funded'];
        }
        function mt5ShortLabel(l) { return l === 'Funded' ? 'Funded' : l.replace('Phase ', 'P'); }
        function mt5ModeLabel(m) { return m === 'instant' ? 'Instant' : (m === '1' ? 'Single Phase' : m + ' Phase'); }

        /* ---- MT5 <-> calendar plumbing: every MT5 account owns its own calendar ---- */
        function fxKey(mt5Id) { return 'tradely_calendar_entries_forex_' + mt5Id; }
        function fxLoadDays(mt5Id) {
            try { const r = localStorage.getItem(fxKey(mt5Id)); return r ? (JSON.parse(r) || {}) : {}; } catch (e) { return {}; }
        }
        function findMt5(id) {
            for (const a of tradelyAccounts) {
                if (a.category === 'binary') continue;
                const m = (a.mt5Accounts || []).find(x => x.id === id);
                if (m) return { parent: a, mt5: m };
            }
            return null;
        }
        /* ---- Prop-firm phases: Phase 1 / Phase 2 / Funded each own a separate calendar ----
           Calendar id for a phase = "<mt5Id>~p1" | "~p2" | "~p3" | "~funded". Personal MT5 accounts keep the plain id. */
        function fxIsProp(parent) { return !!parent && parent.subtype === 'funded'; }
        function fxSlug(label) { return label === 'Funded' ? 'funded' : 'p' + String(label).replace(/\D/g, ''); }
        // The phase the account is trading in right now (falls back to the first phase).
        function fxPhaseOf(m, parent) {
            const seq = (m && m.phaseSequence) || [];
            if (!fxIsProp(parent) || !seq.length) return null;
            return seq.includes(m.runningPhase) ? m.runningPhase : seq[0];
        }
        function fxCalId(m, parent, label) { return (fxIsProp(parent) && label) ? m.id + '~' + fxSlug(label) : m.id; }
        function fxHasDays(calId) { return Object.keys(fxLoadDays(calId)).length > 0; }
        // Phases that have a calendar worth showing: finished ones, the running one, or any phase that already has trades.
        function fxVisiblePhases(m, parent) {
            const seq = m.phaseSequence || [];
            const runIdx = seq.indexOf(fxPhaseOf(m, parent));
            return seq.filter((l, i) => i <= runIdx || fxHasDays(fxCalId(m, parent, l)));
        }
        function fxPurgeMt5Data(mt5Id) {
            ['', '~p1', '~p2', '~p3', '~funded'].forEach(sfx => { try { localStorage.removeItem(fxKey(mt5Id + sfx)); } catch (e) {} });
        }
        // Older versions kept ONE calendar per MT5 account. Move that data into the running phase's own calendar.
        function fxMigratePhaseCalendars() {
            try {
                let changed = false;
                tradelyAccounts.forEach(p => {
                    if (!fxIsProp(p)) return;
                    (p.mt5Accounts || []).forEach(m => {
                        const seq = m.phaseSequence || [];
                        if (!seq.length) return;
                        if (!seq.includes(m.runningPhase)) { m.runningPhase = seq[0]; changed = true; }
                        const legacy = localStorage.getItem(fxKey(m.id));
                        if (!legacy) return;
                        const target = fxKey(fxCalId(m, p, m.runningPhase));
                        const merged = Object.assign({}, JSON.parse(legacy) || {}, JSON.parse(localStorage.getItem(target) || '{}') || {});
                        localStorage.setItem(target, JSON.stringify(merged));
                        localStorage.removeItem(fxKey(m.id));
                    });
                });
                if (changed) saveAccounts();
            } catch (e) { console.warn('Phase calendar migration skipped:', e); }
        }
        function decorateMt5(parent, m, label) {
            const phased = fxIsProp(parent) && label;
            return { id: phased ? m.id + '~' + fxSlug(label) : m.id, category: 'cfd', subtype: parent.subtype, isMt5: true, name: m.name, nickname: m.name,
                     provider: parent.provider, startingBalance: m.size, parent, mt5: m, mt5Id: m.id, phase: phased ? label : null };
        }
        function getCalendarAccount(id) {
            if (!id) return undefined;
            const a = getAccountById(id);
            if (a) return a;
            const [baseId, slug] = String(id).split('~');
            const f = findMt5(baseId);
            if (!f) return undefined;
            if (!fxIsProp(f.parent)) return slug ? undefined : decorateMt5(f.parent, f.mt5);
            const label = slug ? (f.mt5.phaseSequence || []).find(l => fxSlug(l) === slug) : fxPhaseOf(f.mt5, f.parent);
            return label ? decorateMt5(f.parent, f.mt5, label) : undefined;
        }
        // Calendars used to be saved per outer account. Move that data onto the account's first MT5 so nothing is lost.
        function migrateLegacyForexCalendar(parent) {
            try {
                if (!parent || parent.category === 'binary' || !(parent.mt5Accounts || []).length) return;
                const raw = localStorage.getItem(fxKey(parent.id));
                if (!raw) return;
                const k = fxKey(parent.mt5Accounts[0].id);
                // Merge: days already on the MT5 account win; older per-account days are added around them.
                const merged = Object.assign({}, JSON.parse(raw) || {}, JSON.parse(localStorage.getItem(k) || '{}') || {});
                localStorage.setItem(k, JSON.stringify(merged));
                localStorage.removeItem(fxKey(parent.id));
            } catch (e) {}
        }
        // If the MT5 account the Forex calendar was showing no longer exists, fall back to the first remaining one (or lock).
        function fxEnsureCalendarLink() {
            if (typeof calendarType === 'undefined' || calendarType !== 'forex') return;
            if (calendarLinkedAccountId && getCalendarAccount(calendarLinkedAccountId)) return;
            const first = calendarAccountsForType('forex')[0];
            calendarLinkedAccountId = first ? first.id : null;
            calendarEntries = loadCalendarEntriesFromStorage();
            try { renderCalendar(); } catch (e) {}
        }
        function openMt5Calendar(mt5Id, phaseLabel) {
            const f = findMt5(mt5Id);
            const id = (f && fxIsProp(f.parent)) ? fxCalId(f.mt5, f.parent, phaseLabel || fxAcc.phase[mt5Id] || fxPhaseOf(f.mt5, f.parent)) : mt5Id;
            selectCalendarAccount(id);
            switchTab('accounts-calendar');
        }

        /* ---- Sidebar: collapse to the left while a forex account is open, restore afterwards ---- */
        function fxCollapseSidebar() {
            if (typeof isCollapsed !== 'undefined' && !isCollapsed) { toggleSidebar(); fxAcc.autoCollapsed = true; }
        }
        function fxRestoreSidebar() {
            if (!fxAcc.autoCollapsed) return;
            fxAcc.autoCollapsed = false;
            if (isCollapsed) toggleSidebar();
        }

        function openCfdAccountPage(accountId) {
            const acc = getAccountById(accountId);
            if (!acc || acc.category === 'binary') return;
            mt5State.parentId = accountId;
            fxAcc.selectedMt5[accountId] = null; // nothing selected until the user picks an MT5 account
            switchTab('forex-account');
            fxCollapseSidebar();
            renderCfdAccountPage();
            const pane = document.getElementById('fx-stats-pane');
            if (pane) pane.scrollTop = 0;
        }

        function closeCfdAccountPage() {
            closeMt5Modal();
            fxDestroyCharts();
            mt5State.parentId = null;
            switchTab('accounts-list');
            renderAccounts();
        }

        function selectMt5Account(id) {
            if (!mt5State.parentId) return;
            fxAcc.selectedMt5[mt5State.parentId] = id;
            renderCfdAccountPage();
            const pane = document.getElementById('fx-stats-pane');
            if (pane) pane.scrollTop = 0;
        }

        function renderCfdAccountPage() {
            const acc = getAccountById(mt5State.parentId);
            if (!acc) { closeCfdAccountPage(); return; }
            { const __ev = fxEvaluateParent(acc); __ev.forEach(e => { if (e.type === 'passed' || e.type === 'revived') fxAcc.phase[e.m.id] = fxPhaseOf(e.m, acc); }); if (__ev.length) setTimeout(() => fxToastEvents(__ev), 60); }
            const badge = accountTypeBadge(acc);
            document.getElementById('cfd-header-icon').innerHTML = providerIconHTML(acc.provider, 34);
            document.getElementById('cfd-header-name').textContent = acc.nickname || acc.name;
            const hb = document.getElementById('cfd-header-badge');
            hb.textContent = badge.label;
            hb.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ' + badge.cls;
            document.getElementById('cfd-header-sub').textContent = (acc.provider ? acc.provider.name : '—') + (acc.ownerName ? ' · ' + acc.ownerName : '');
            const sub = document.getElementById('page-subtitle');
            if (sub) sub.innerText = acc.nickname || acc.name;

            const list = acc.mt5Accounts || [];
            document.getElementById('cfd-mt5-count').textContent = list.length + ' account' + (list.length === 1 ? '' : 's');
            let sel = fxAcc.selectedMt5[acc.id];
            if (!list.find(m => m.id === sel)) sel = null;
            fxAcc.selectedMt5[acc.id] = sel;
            const isFunded = acc.subtype === 'funded';

            const listEl = document.getElementById('fx-mt5-list');
            if (!list.length) {
                listEl.innerHTML = `<div class="px-3 py-6 text-center text-[11px] text-gray-500 leading-relaxed">No MT5 accounts yet.<br>Add one to start tracking.</div>`;
            } else {
                listEl.innerHTML = list.map(m => {
                    const active = m.id === sel;
                    const run = isFunded ? fxPhaseOf(m, acc) : null;
                    const seq = m.phaseSequence || [];
                    const runIdx = run ? seq.indexOf(run) : -1;
                    const q = fxPhaseQuick(m, fxCalId(m, acc, run));
                    const ph = run && m.phases ? (m.phases[run] || {}) : {};
                    const pnlCls = !q.hasData ? 'text-gray-600' : (q.pnl > 0 ? 'text-aura-green' : (q.pnl < 0 ? 'text-aura-red' : 'text-gray-400'));
                    const chain = isFunded && seq.length ? seq.map((l, i) => {
                        const done = i < runIdx, cur = i === runIdx;
                        const cls = (cur && m.status === 'failed') ? 'bg-aura-red/15 text-aura-red border-aura-red/40' : cur ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' : (done ? 'bg-aura-green/10 text-aura-green border-aura-green/20' : 'bg-aura-bg text-gray-500 border-aura-border');
                        return `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border inline-flex items-center gap-1 ${cls}">${done ? '<i data-lucide="check" class="w-2.5 h-2.5"></i>' : ''}${mt5ShortLabel(l)}</span>`;
                    }).join('<i data-lucide="chevron-right" class="w-2.5 h-2.5 text-gray-600"></i>') : '';
                    const mini = (label, val, pct, color) => `<div class="space-y-1"><div class="flex items-center justify-between text-[10px] font-mono"><span class="text-gray-500">${label}</span><span class="text-gray-300">${val}</span></div>${fxBar(pct, color)}</div>`;
                    const lvl = (pct, lim) => pct >= lim ? 'bg-aura-red' : (pct >= lim * 0.8 ? 'bg-aura-amber' : 'bg-aura-green');
                    let bars = '';
                    if (isFunded && run) {
                        const profitPct = m.size ? q.pnl / m.size * 100 : 0;
                        const ddPct = fxDrawdownInfo(m.size, fxPhaseDays(m, acc, run), ph).worstDDPct;
                        const dayPct = m.size ? q.worstLoss / m.size * 100 : 0;
                        if (run !== 'Funded' && ph.profitTarget) bars += mini(run + ' profit target', `${Math.max(0, profitPct).toFixed(2)}% / ${ph.profitTarget}%`, Math.max(0, profitPct) / ph.profitTarget * 100, profitPct >= ph.profitTarget ? 'bg-aura-green' : 'bg-blue-500');
                        else if (run === 'Funded') bars += `<div class="flex items-center justify-between text-[10px] font-mono"><span class="text-gray-500">Funded profit</span><span class="${pnlCls}">${q.hasData ? (profitPct >= 0 ? '+' : '') + profitPct.toFixed(2) + '%' : '—'}${ph.profitSplit ? ' · split ' + ph.profitSplit + '%' : ''}</span></div>`;
                        if (ph.overallLoss) bars += mini('Max drawdown', `${ddPct.toFixed(2)}% / ${ph.overallLoss}%`, ddPct / ph.overallLoss * 100, lvl(ddPct, ph.overallLoss));
                        if (ph.dailyLoss) bars += mini('Worst day', `${dayPct.toFixed(2)}% / ${ph.dailyLoss}%`, dayPct / ph.dailyLoss * 100, lvl(dayPct, ph.dailyLoss));
                    }
                    return `
                    <div onclick="selectMt5Account('${m.id}')" class="group relative cursor-pointer rounded-lg border px-3 py-3 transition ${m.status === 'failed' ? 'border-aura-red/50 bg-aura-red/5 grayscale opacity-70' : (active ? 'bg-aura-hover border-blue-500/50' : 'border-aura-border/60 hover:bg-aura-hover/60')}">
                        <div class="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onclick="event.stopPropagation(); openMt5Modal('${m.id}')" title="Edit MT5 account" class="text-gray-500 hover:text-blue-400"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                            <button onclick="event.stopPropagation(); deleteMt5Account('${m.id}')" title="Delete MT5 account" class="text-gray-500 hover:text-aura-red"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                        </div>
                        <div class="flex items-center gap-2.5 pr-12">
                            <div class="w-8 h-8 rounded-md ${active ? 'bg-blue-500/20' : 'bg-blue-500/10'} flex items-center justify-center shrink-0"><i data-lucide="server" class="w-4 h-4 text-blue-400"></i></div>
                            <div class="min-w-0 flex-1">
                                <div class="text-xs font-semibold text-white truncate">${escapeHtml(m.name)}${m.status === 'failed' ? ' <span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-aura-red/15 text-aura-red border border-aura-red/40 align-middle">FAILED</span>' : ''}</div>
                                <div class="text-[10px] text-gray-500 font-mono">${mt5FmtSize(m.size)}${isFunded ? ' · ' + mt5ModeLabel(m.phasesMode) : ' · Personal'}</div>
                            </div>
                            <div class="shrink-0 text-right leading-tight">
                                <div class="text-[8px] font-mono uppercase tracking-wider text-gray-500">PNL</div>
                                <div class="text-[12px] font-mono font-bold ${pnlCls}">${q.hasData ? (q.pnl > 0 ? '+' : '') + formatMoney(q.pnl) : 'No trades'}</div>
                                <div class="text-[9px] font-mono text-gray-500 mt-0.5">Bal <span class="text-gray-300">${formatMoney((Number(m.size) || 0) + (q.hasData ? q.pnl : 0))}</span></div>
                            </div>
                        </div>
                        ${isFunded && run ? `<div class="flex items-center justify-between gap-2 mt-2.5">
                            <div class="flex items-center gap-1 flex-wrap">${chain}</div>
                            ${m.status === 'failed' ? `<span class="text-[10px] font-mono text-aura-red shrink-0 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-aura-red"></span>Failed in ${escapeHtml(run)}</span>` : `<span class="text-[10px] font-mono text-blue-300 shrink-0 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-aura-green"></span>Running ${escapeHtml(run)}</span>`}
                        </div>` : ''}
                        ${bars ? `<div class="mt-2.5 space-y-2">${bars}</div>` : ''}
                    </div>`;
                }).join('');
            }
            renderFxStats();
            renderIcons();
        }

        /* ---------- Per-MT5 stats ---------- */
        const FX_PERIODS = [
            { id: 'all', label: 'All Time' }, { id: 'year', label: 'Current Year' }, { id: 'month', label: 'Current Month' },
            { id: 'week', label: 'Current Week' }, { id: '30d', label: 'Last 30 Days' }
        ];
        // Lightweight per-phase numbers for the left-hand MT5 cards.
        function fxPhaseQuick(m, calId) {
            const d = fxLoadDays(calId), keys = Object.keys(d).sort(), size = Number(m.size) || 0;
            let pnl = 0, minEq = size, worstLoss = 0;
            keys.forEach(k => {
                const p = Number(d[k].pnl) || 0;
                pnl += p; minEq = Math.min(minEq, size + pnl);
                if (-p > worstLoss) worstLoss = -p;
            });
            return { pnl, minEq, worstLoss, days: keys.length, hasData: keys.length > 0 };
        }
        function fxPeriodRange(p) {
            const now = new Date(), today = toDateKey(now);
            if (p === 'year') return { start: now.getFullYear() + '-01-01', end: today };
            if (p === 'month') return { start: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), end: today };
            if (p === 'week') { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { start: toDateKey(d), end: today }; }
            if (p === '30d') { const d = new Date(now); d.setDate(d.getDate() - 29); return { start: toDateKey(d), end: today }; }
            return null;
        }
        function fxSetPeriod(p) { fxAcc.period = p; fxAcc.from = fxAcc.to = ''; renderFxStats(); }
        function fxSetPhase(mt5Id, label) { fxAcc.phase[mt5Id] = label; renderFxStats(); }
        // Mark which phase the account is trading in right now (shown on the left list + used as the default calendar).
        function fxSetRunningPhase(mt5Id, label) {
            const f = findMt5(mt5Id);
            if (!f || !(f.mt5.phaseSequence || []).includes(label)) return;
            f.mt5.runningPhase = label;
            saveAccounts();
            fxAcc.phase[mt5Id] = label;
            fxEnsureCalendarLink();
            renderCfdAccountPage();
            showAppToast(label + ' is now the running phase for ' + f.mt5.name, 'success');
        }

        function computeFxStats(mt5, range, calId) {
            const size = Number(mt5.size) || 0;
            const all = fxLoadDays(calId || mt5.id);
            let keys = Object.keys(all).sort();
            let startEq = size;
            if (range) {
                keys.forEach(k => { if (k < range.start) startEq += Number(all[k].pnl) || 0; });
                keys = keys.filter(k => k >= range.start && k <= range.end);
            }
            let pnl = 0, trades = 0, tp = 0, sl = 0, be = 0, winDays = 0, lossDays = 0, beDays = 0;
            let rulesYes = 0, rulesTotal = 0, emotional = 0, rrSum = 0, rrN = 0;
            let bestDay = null, worstDay = null;
            let totalRR = 0, rrCount = 0, tpRf = 0, beRf = 0, slRf = 0, hiProfit = null, hiLoss = null, tradingDays = 0;
            const rrTargets = {};
            const units = [], monthly = {}, pairs = {}, sessions = {};
            const weekday = WEEKDAY_NAMES.map(() => ({ pnl: 0, trades: 0, wins: 0, days: 0 }));
            const bump = (map, key, p, win) => { const o = map[key] || (map[key] = { trades: 0, wins: 0, pnl: 0 }); o.trades++; o.pnl += p; if (win) o.wins++; };

            keys.forEach(k => {
                const e = all[k];
                const dp = Number(e.pnl) || 0;
                const logs = Array.isArray(e.tradeLogs) ? e.tradeLogs : [];
                const dTrades = Number(e.trades) || 0;
                const dTp = Number(e.tp) || (logs.length ? 0 : (Number(e.wins) || 0));
                pnl += dp; trades += dTrades; tp += dTp; sl += Number(e.sl) || 0; be += Number(e.be) || 0;
                if (bestDay === null || dp > bestDay.pnl) bestDay = { date: k, pnl: dp };
                if (worstDay === null || dp < worstDay.pnl) worstDay = { date: k, pnl: dp };
                const band = getPnlBand(dp);
                if (band === 'profit') winDays++; else if (band === 'loss') lossDays++; else beDays++;
                if (dTrades > 0) tradingDays++;
                if (band === 'profit' && (hiProfit === null || dp > hiProfit.pnl)) hiProfit = { date: k, pnl: dp };
                if (band === 'loss' && (hiLoss === null || dp < hiLoss.pnl)) hiLoss = { date: k, pnl: dp };

                const mKey = k.slice(0, 7);
                const mo = monthly[mKey] || (monthly[mKey] = { pnl: 0, trades: 0 });
                mo.pnl += dp; mo.trades += dTrades;
                const wd = new Date(k + 'T00:00:00').getDay();
                weekday[wd].pnl += dp; weekday[wd].trades += dTrades; weekday[wd].wins += dTp; weekday[wd].days += 1;

                if (logs.length) {
                    logs.forEach(t => {
                        const p = Number(t.pnl) || 0;
                        units.push({ date: k, pnl: p, pair: t.pair });
                        if (t.pair) bump(pairs, t.pair, p, t.outcome === 'tp');
                        if (t.session) bump(sessions, t.session, p, t.outcome === 'tp');
                        if (t.rr && t.rr.enabled) {
                            totalRR += Number(t.rr.achieved) || 0; rrCount++;
                            if (t.rr.targetRR) { const lb = '1:' + t.rr.targetRR; rrTargets[lb] = (rrTargets[lb] || 0) + 1; }
                            if (t.rr.rfEnabled) { if (t.outcome === 'tp') tpRf++; else if (t.outcome === 'be') beRf++; else if (t.outcome === 'sl') slRf++; }
                        }
                        rulesTotal++; if (t.rulesFollowed) rulesYes++;
                        if (t.emotionalTrade) emotional++;
                    });
                } else if (dTrades > 0 || dp !== 0) {
                    units.push({ date: k, pnl: dp, pair: null });
                }
            });

            const gp = units.filter(u => u.pnl > 0).reduce((s, u) => s + u.pnl, 0);
            const gl = Math.abs(units.filter(u => u.pnl < 0).reduce((s, u) => s + u.pnl, 0));
            const nW = units.filter(u => u.pnl > 0).length, nL = units.filter(u => u.pnl < 0).length;
            let bestTrade = null, worstTrade = null;
            units.forEach(u => {
                if (bestTrade === null || u.pnl > bestTrade.pnl) bestTrade = u;
                if (worstTrade === null || u.pnl < worstTrade.pnl) worstTrade = u;
            });

            let run = startEq, peak = startEq, maxDD = 0, maxDDPct = 0, minEq = startEq;
            const equity = [{ date: null, equity: startEq }], ddSeries = [];
            keys.forEach(k => {
                run += Number(all[k].pnl) || 0;
                if (run > peak) peak = run;
                if (run < minEq) minEq = run;
                const dd = peak - run, ddPct = peak > 0 ? dd / peak * 100 : 0;
                if (dd > maxDD) { maxDD = dd; maxDDPct = ddPct; }
                equity.push({ date: k, equity: run });
                ddSeries.push({ date: k, ddPct: -ddPct });
            });

            let curType = null, curStreak = 0, bestWin = 0, worstLoss = 0, cw = 0, cl = 0;
            keys.forEach(k => {
                const b = getPnlBand(Number(all[k].pnl) || 0);
                if (b === 'profit') { cw++; cl = 0; bestWin = Math.max(bestWin, cw); }
                else if (b === 'loss') { cl++; cw = 0; worstLoss = Math.max(worstLoss, cl); }
                else { cw = 0; cl = 0; }
            });
            for (let i = keys.length - 1; i >= 0; i--) {
                const b = getPnlBand(Number(all[keys[i]].pnl) || 0);
                if (b === 'be') break;
                if (curType === null) { curType = b; curStreak = 1; } else if (b === curType) curStreak++; else break;
            }

            return {
                size, startEq, keys, days: all, pnl, trades, tp, sl, be, winDays, lossDays, beDays, tradedDays: keys.length,
                units, gp, gl, nW, nL, bestTrade, worstTrade, bestDay, worstDay,
                pf: gl > 0 ? gp / gl : (gp > 0 ? Infinity : 0),
                avgWin: nW ? gp / nW : 0, avgLoss: nL ? -gl / nL : 0,
                expectancy: units.length ? pnl / units.length : 0,
                avgDaily: keys.length ? pnl / keys.length : 0,
                tradeWR: trades > 0 ? tp / trades * 100 : null,
                tradeWRexBE: (tp + sl) > 0 ? tp / (tp + sl) * 100 : null,
                dayWR: keys.length ? winDays / keys.length * 100 : null,
                equity, ddSeries, maxDD, maxDDPct, minEq, curDD: peak - run, curDDPct: peak > 0 ? (peak - run) / peak * 100 : 0, endEq: run,
                curType, curStreak, bestWin, worstLoss, monthly, weekday, pairs, sessions,
                rulesPct: rulesTotal ? rulesYes / rulesTotal * 100 : null, emotional,
                avgRR: rrCount ? totalRR / rrCount : null, totalRR: rrCount ? totalRR : null, rrTargets, tpRf, beRf, slRf, hiProfit, hiLoss, tradingDays, avgTradesPerDay: keys.length ? trades / keys.length : 0
            };
        }


        // ===================== MT5 Traded Days: day cards, trade cards, popup =====================
        const FX_OUTCOME = {
            tp: { label: 'TP', cls: 'text-aura-green border-aura-green/40 bg-aura-green/10' },
            sl: { label: 'SL', cls: 'text-aura-red border-aura-red/40 bg-aura-red/10' },
            be: { label: 'BE', cls: 'text-aura-amber border-aura-amber/40 bg-aura-amber/10' }
        };
        const fxShotUrl = x => (x && typeof x === 'object') ? (x.dataUrl || x.url || '') : (x || '');
        const fxLvl = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? '—' : String(Number(v));

        function fxTradeSorted(logs) {
            return (logs || []).slice().sort((a, b) => ((a.hour24 || 0) * 60 + (a.min || 0)) - ((b.hour24 || 0) * 60 + (b.min || 0)));
        }

        function fxDayRowHTML(k, e) {
            const pnl = Number(e.pnl) || 0, band = getPnlBand(pnl);
            const d = new Date(k + 'T00:00:00');
            const pnlColor = band === 'profit' ? 'text-aura-green' : (band === 'loss' ? 'text-aura-red' : 'text-aura-amber');
            const logs = Array.isArray(e.tradeLogs) ? e.tradeLogs : [];
            const n = logs.length || Number(e.trades) || 0;
            const tp = Number(e.tp) || 0, sl = Number(e.sl) || 0, be = Number(e.be) || 0;
            const wr = n > 0 ? Math.round(tp / n * 100) : null;
            const chip = (txt, cls) => `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${cls}">${txt}</span>`;
            const open = fxAcc.expanded && fxAcc.expanded.has(k);
            const bandLbl = { profit: 'PROFIT', loss: 'LOSS', be: 'BREAKEVEN' }[band];
            return `<div class="fx-day ${open ? 'open' : ''}" data-band="${band}" data-day="${k}">
                <div class="fx-day-head flex items-center gap-3 px-3 py-2.5" onclick="fxToggleDay('${k}')">
                    <div class="w-12 text-center shrink-0">
                        <div class="text-[9px] text-gray-500 font-mono">${MONTH_NAMES[d.getMonth()].toUpperCase()} ${d.getFullYear()}</div>
                        <div class="text-lg font-bold text-white font-mono leading-tight">${String(d.getDate()).padStart(2, '0')}</div>
                        <div class="text-[9px] text-gray-500">${WEEKDAY_NAMES[d.getDay()]}</div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs text-gray-200 font-mono">${n} trade${n === 1 ? '' : 's'}</span>
                            ${tp ? chip(tp + ' TP', FX_OUTCOME.tp.cls) : ''}${sl ? chip(sl + ' SL', FX_OUTCOME.sl.cls) : ''}${be ? chip(be + ' BE', FX_OUTCOME.be.cls) : ''}
                        </div>
                        <div class="text-[10px] text-gray-500 font-mono mt-1">${bandLbl}${wr !== null ? ' · ' + wr + '% win rate' : ''}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[8px] font-mono uppercase tracking-wider text-gray-500">Day PNL</div>
                        <div class="text-sm font-bold font-mono ${pnlColor}">${fxSigned(pnl)}</div>
                    </div>
                    <i data-lucide="chevron-down" class="fx-day-chev w-4 h-4 text-gray-500 shrink-0"></i>
                </div>
                <div class="fx-day-panel"><div><div class="fx-day-body px-3 pb-3 pt-1" data-filled="0">${open ? fxDayBodyHTML(k, e) : ''}</div></div></div>
            </div>`;
        }

        function fxDayBodyHTML(k, e) {
            const logs = fxTradeSorted(e.tradeLogs);
            if (!logs.length) return `<div class="text-[11px] text-gray-500 border border-dashed border-aura-border rounded-lg px-3 py-3">${escapeHtml(e.note || 'Day-level entry — no individual trades logged for this day.')}</div>`;
            const pnls = logs.map(t => Number(t.pnl) || 0);
            const net = pnls.reduce((a, b) => a + b, 0);
            const best = Math.max(...pnls), worst = Math.min(...pnls);
            const tp = logs.filter(t => t.outcome === 'tp').length, sl = logs.filter(t => t.outcome === 'sl').length, be = logs.filter(t => t.outcome === 'be').length;
            const tile = (l, v, c) => `<div class="bg-aura-bg px-2.5 py-1.5 rounded-md border border-aura-border min-w-0"><div class="text-[9px] font-mono uppercase tracking-wider text-gray-500 truncate">${l}</div><div class="text-xs font-bold font-mono ${c || 'text-white'} mt-0.5 truncate">${v}</div></div>`;
            const seg = (n, c) => n > 0 ? `<div class="${c}" style="width:${n / logs.length * 100}%"></div>` : '';
            const summary = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                ${tile('Net PNL', fxSigned(net), fxPnlCls(net))}
                ${tile('Win rate', Math.round(tp / logs.length * 100) + '%', tp / logs.length >= 0.5 ? 'text-aura-green' : 'text-aura-red')}
                ${tile('Best trade', fxSigned(best), fxPnlCls(best))}
                ${tile('Worst trade', fxSigned(worst), fxPnlCls(worst))}
            </div>
            <div class="flex h-1 rounded-full overflow-hidden bg-aura-hover mt-2 mb-2.5">${seg(tp, 'bg-aura-green')}${seg(sl, 'bg-aura-red')}${seg(be, 'bg-aura-amber')}</div>`;
            return summary + `<div class="space-y-1.5">${logs.map(t => fxTradeCardHTML(k, t)).join('')}</div>`;
        }

        function fxTradeCardHTML(k, t) {
            const pnl = Number(t.pnl) || 0, o = FX_OUTCOME[t.outcome];
            const shots = (t.screenshots || []).map(fxShotUrl).filter(Boolean);
            const shotHtml = shots.length
                ? shots.slice(0, 2).map(u => `<div class="fx-shot"><img src="${escapeHtml(safeImgSrc(u))}" loading="lazy" alt=""></div>`).join('') + (shots.length > 2 ? `<div class="fx-shot-more">+${shots.length - 2}</div>` : '')
                : `<div class="fx-shot border-dashed flex items-center justify-center text-gray-600"><i data-lucide="image-off" class="w-3.5 h-3.5"></i></div>`;
            const meta = [];
            if (t.entry != null) meta.push(`Entry ${fxLvl(t.entry)}`);
            if (t.sl != null) meta.push(`SL ${fxLvl(t.sl)}`);
            if (t.tp != null) meta.push(`TP ${fxLvl(t.tp)}`);
            if (t.rr && t.rr.enabled && t.rr.lotSize) meta.push(`${t.rr.lotSize} lots`);
            const flags = [];
            if (t.rulesFollowed === false) flags.push(`<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border border-aura-red/30 text-aura-red bg-aura-red/10">Rules broken</span>`);
            if (t.emotionalTrade) flags.push(`<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border border-aura-amber/30 text-aura-amber bg-aura-amber/10">Emotional</span>`);
            if (t.isMySetup && t.setupGrade) flags.push(`<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${t.setupGrade.charAt(0) === 'A' ? 'border-aura-green/30 text-aura-green bg-aura-green/10' : 'border-aura-amber/30 text-aura-amber bg-aura-amber/10'}">Setup ${t.setupGrade}</span>`);
            else if (t.isMySetup === false) flags.push(`<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border border-aura-border text-gray-400">Not my setup</span>`);
            (t.tags || []).slice(0, 3).forEach(g => flags.push(`<span class="tf-tag-chip">#${escapeHtml(g)}</span>`));
            return `<div class="fx-trade flex items-center gap-3 px-3 py-2.5" data-o="${t.outcome || ''}" onclick="fxOpenTrade('${k}','${t.id}')">
                <div class="w-[62px] shrink-0 text-[10px] font-mono text-gray-400 leading-tight">${escapeHtml(t.timeLabel || '—')}<div class="text-gray-600 truncate">${escapeHtml(t.session || '')}</div></div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-xs font-semibold text-white">${escapeHtml(t.pair || '—')}</span>
                        ${o ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${o.cls}">${o.label}</span>` : ''}
                        ${t.rr && t.rr.enabled ? `<span class="text-[10px] font-mono ${t.rr.achieved >= 0 ? 'text-aura-green' : 'text-aura-red'}">${t.rr.achieved >= 0 ? '+' : ''}${Number(t.rr.achieved).toFixed(2)}R</span>` : ''}
                    </div>
                    ${meta.length ? `<div class="text-[10px] font-mono text-gray-500 mt-0.5 truncate">${meta.join(' · ')}</div>` : ''}
                    ${flags.length ? `<div class="flex items-center gap-1 mt-1 flex-wrap">${flags.join('')}</div>` : ''}
                </div>
                <div class="flex items-center gap-1 shrink-0">${shotHtml}</div>
                <div class="text-right shrink-0 w-20"><div class="text-sm font-bold font-mono ${fxPnlCls(pnl)}">${fxSigned(pnl)}</div></div>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-600 shrink-0"></i>
            </div>`;
        }

        // Expand/collapse in place (no full re-render, so charts + scroll position stay put). Body is built lazily on first open.
        function fxToggleDay(k) {
            const el = document.querySelector(`.fx-day[data-day="${k}"]`);
            if (!el) return;
            if (!fxAcc.expanded) fxAcc.expanded = new Set();
            const open = !el.classList.contains('open');
            el.classList.toggle('open', open);
            if (open) {
                fxAcc.expanded.add(k);
                const body = el.querySelector('.fx-day-body');
                if (body && body.dataset.filled !== '1') {
                    body.innerHTML = fxDayBodyHTML(k, (fxAcc.dayMap || {})[k] || {});
                    body.dataset.filled = '1';
                    renderIcons();
                }
            } else fxAcc.expanded.delete(k);
        }

        function fxFindTrade(k, id) {
            const e = (fxAcc.dayMap || {})[k];
            return e && Array.isArray(e.tradeLogs) ? e.tradeLogs.find(t => t.id === id) : null;
        }

        let fxShotState = { list: [], i: 0 };
        function fxOpenTrade(k, id) {
            const t = fxFindTrade(k, id);
            if (!t) return;
            const pnl = Number(t.pnl) || 0, o = FX_OUTCOME[t.outcome];
            const d = new Date(k + 'T00:00:00');
            const shots = (t.screenshots || []).map(fxShotUrl).filter(Boolean);
            fxShotState = { list: shots, i: 0 };
            const stat = (l, v, c) => `<div class="bg-aura-bg px-3 py-2 rounded-lg border border-aura-border min-w-0"><div class="text-[9px] font-mono uppercase tracking-wider text-gray-500">${l}</div><div class="text-sm font-bold font-mono ${c || 'text-white'} mt-0.5 truncate">${v}</div></div>`;
            const section = (title, txt) => txt ? `<div><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">${title}</div><div class="text-xs text-gray-300 bg-aura-bg border border-aura-border rounded-lg px-3 py-2.5 whitespace-pre-wrap leading-relaxed">${escapeHtml(txt)}</div></div>` : '';
            const rr = t.rr && t.rr.enabled ? t.rr : null;
            const yes = (v, good) => `<span class="${v === good ? 'text-aura-green' : 'text-aura-red'}">${v ? 'Yes' : 'No'}</span>`;

            document.getElementById('fx-trade-modal-head').innerHTML = `
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${o ? o.cls : 'border border-aura-border text-gray-400'} border"><span class="text-xs font-bold font-mono">${o ? o.label : '—'}</span></div>
                    <div class="min-w-0">
                        <div class="text-base font-bold text-white truncate">${escapeHtml(t.pair || 'Trade')}</div>
                        <div class="text-[11px] text-gray-500 font-mono">${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} · ${escapeHtml(t.timeLabel || '')}${t.session ? ' · ' + escapeHtml(t.session) : ''}</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <div class="text-right"><div class="text-[9px] font-mono uppercase tracking-wider text-gray-500">PNL</div><div class="text-lg font-bold font-mono ${fxPnlCls(pnl)}">${fxSigned(pnl)}</div></div>
                    <button onclick="fxCloseTradeModal()" class="text-gray-500 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>`;

            const grid = [
                stat('Outcome', o ? o.label : '—', o ? o.cls.split(' ')[0] : ''),
                stat('Pair', escapeHtml(t.pair || '—')),
                stat('Session', escapeHtml(t.session || '—')),
                stat('Time', escapeHtml(t.timeLabel || '—')),
                stat('Entry', fxLvl(t.entry)), stat('Stop loss', fxLvl(t.sl), t.sl != null ? 'text-aura-red' : ''), stat('Take profit', fxLvl(t.tp), t.tp != null ? 'text-aura-green' : ''),
                stat('Lot size', rr && rr.lotSize ? rr.lotSize : '—'),
                stat('Target RR', rr ? '1 : ' + rr.targetRR : '—'),
                stat('Achieved RR', rr ? (rr.achieved >= 0 ? '+' : '') + Number(rr.achieved).toFixed(2) + 'R' : '—', rr ? (rr.achieved >= 0 ? 'text-aura-green' : 'text-aura-red') : ''),
                stat('Rules followed', t.rulesFollowed === undefined ? '—' : yes(!!t.rulesFollowed, true)),
                stat('Emotional trade', t.emotionalTrade === undefined ? '—' : yes(!!t.emotionalTrade, false)),
                stat('My setup', t.isMySetup === undefined ? '—' : (t.isMySetup ? 'Yes · ' + (t.setupGrade || '—') : 'No'))
            ].join('');
            const rrExtra = rr && (rr.rfEnabled || rr.beMoved) ? `<div class="text-[11px] font-mono text-gray-400 bg-aura-bg border border-aura-border rounded-lg px-3 py-2">
                ${rr.rfEnabled ? `Partial close: ${rr.rfLotsPct}% of lots at ${rr.rfTargetPct}R` : ''}${rr.rfEnabled && rr.beMoved ? ' · ' : ''}${rr.beMoved ? 'SL moved to breakeven' : ''}</div>` : '';
            const tags = (t.tags || []).length ? `<div class="flex flex-wrap gap-1.5">${t.tags.map(g => `<span class="tf-tag-chip">#${escapeHtml(g)}</span>`).join('')}</div>` : '';
            const shotsHtml = shots.length ? `<div><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">Screenshots (${shots.length})</div>
                <div class="grid ${shots.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2">${shots.map((u, i) => `<div class="fx-modal-shot" onclick="fxOpenShot(${i})"><img src="${escapeHtml(safeImgSrc(u))}" alt="Trade screenshot ${i + 1}"></div>`).join('')}</div></div>`
                : `<div class="text-[11px] text-gray-500 border border-dashed border-aura-border rounded-lg px-3 py-4 text-center flex items-center justify-center gap-2"><i data-lucide="image-off" class="w-3.5 h-3.5"></i>No screenshot attached to this trade</div>`;

            document.getElementById('fx-trade-modal-body').innerHTML = `
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${grid}</div>
                ${rrExtra}${tags}
                ${shotsHtml}
                ${section('Reason for entry', t.reason)}
                ${section('Notes', t.notes)}
                ${section('Mistakes', t.mistakes)}`;
            const m = document.getElementById('fx-trade-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
            renderIcons();
        }
        function fxCloseTradeModal() {
            const m = document.getElementById('fx-trade-modal');
            if (!m) return; m.classList.add('hidden'); m.classList.remove('flex');
        }
        function fxOpenShot(i) {
            fxShotState.i = i;
            const m = document.getElementById('fx-shot-lightbox');
            m.classList.remove('hidden'); m.classList.add('flex');
            fxShowShot();
        }
        function fxShowShot() {
            const n = fxShotState.list.length;
            document.getElementById('fx-shot-img').src = fxShotState.list[fxShotState.i] || '';
            document.getElementById('fx-shot-count').textContent = `${fxShotState.i + 1} / ${n}`;
            ['fx-shot-prev', 'fx-shot-next', 'fx-shot-count'].forEach(id => document.getElementById(id).style.display = n > 1 ? '' : 'none');
            renderIcons();
        }
        function fxStepShot(d) {
            const n = fxShotState.list.length; if (n < 2) return;
            fxShotState.i = (fxShotState.i + d + n) % n; fxShowShot();
        }
        function fxCloseShot() {
            const m = document.getElementById('fx-shot-lightbox');
            m.classList.add('hidden'); m.classList.remove('flex');
        }
        document.addEventListener('keydown', ev => {
            const lb = document.getElementById('fx-shot-lightbox'), tm = document.getElementById('fx-trade-modal');
            if (lb && !lb.classList.contains('hidden')) {
                if (ev.key === 'Escape') fxCloseShot(); else if (ev.key === 'ArrowLeft') fxStepShot(-1); else if (ev.key === 'ArrowRight') fxStepShot(1);
            } else if (tm && !tm.classList.contains('hidden') && ev.key === 'Escape') fxCloseTradeModal();
        });

        function fxDestroyCharts() {
            Object.keys(fxAcc.charts).forEach(k => { if (fxAcc.charts[k]) { fxAcc.charts[k].destroy(); fxAcc.charts[k] = null; } });
        }
        const fxPnlCls = v => v > 0 ? 'text-aura-green' : (v < 0 ? 'text-aura-red' : 'text-white');
        const fxSigned = v => (v > 0 ? '+' : '') + formatMoney(v);
        const fxPct = (v, d) => (v === null || v === undefined || !isFinite(v)) ? '—' : v.toFixed(d === undefined ? 1 : d) + '%';
        function fxBar(pct, color) {
            const w = Math.max(0, Math.min(100, pct || 0));
            return `<div class="h-1.5 rounded-full bg-aura-hover overflow-hidden"><div class="h-full ${color} rounded-full" style="width:${w}%"></div></div>`;
        }
        function fxPanel(title, sub, inner, extra) {
            return `<div class="glass-card p-4 rounded-xl border border-aura-border ${extra || ''}">
                <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-white">${title}</h3>${sub ? `<span class="text-[11px] font-mono text-gray-500">${sub}</span>` : ''}</div>
                ${inner}</div>`;
        }
        function fxBreakdownRows(map, emptyMsg) {
            const rows = Object.keys(map).map(k => ({ k, ...map[k] })).sort((a, b) => b.trades - a.trades);
            if (!rows.length) return `<p class="text-xs text-gray-500 text-center py-6">${emptyMsg}</p>`;
            return `<div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                <div class="flex items-center gap-2 text-[10px] font-mono text-gray-500 px-1"><span class="flex-1">Name</span><span class="w-12 text-right">Trades</span><span class="w-12 text-right">Win %</span><span class="w-20 text-right">PNL</span></div>
                ${rows.map(r => `<div class="flex items-center gap-2 text-[11px] font-mono bg-aura-bg border border-aura-border rounded-md px-2.5 py-1.5">
                    <span class="flex-1 text-white truncate">${escapeHtml(r.k)}</span>
                    <span class="w-12 text-right text-gray-400">${r.trades}</span>
                    <span class="w-12 text-right text-gray-400">${Math.round(r.wins / r.trades * 100)}%</span>
                    <span class="w-20 text-right ${fxPnlCls(r.pnl)}">${fxSigned(r.pnl)}</span></div>`).join('')}</div>`;
        }
        /* ---- Drawdown engine (Static vs Trailing) — shared by Rules panel, AI Coach and (Phase 2) the Failed check ----
           Static  : floor = start balance - overall DD% of start balance (never moves).
           Trailing: floor = highest balance reached - overall DD% of start balance (moves up with new highs, never down).
           Checked at each day's close using the logged daily PNL. */
        function fxDdType(ph) { return ph && ph.drawdownType === 'trailing' ? 'trailing' : 'static'; }
        function fxRuleFlag(ph, k) { return ph && ph[k] === 'not_allowed' ? 'not_allowed' : 'allowed'; }
        function fxDrawdownInfo(size, days, ph) {
            size = Number(size) || 0; ph = ph || {};
            const type = fxDdType(ph), ovPct = Number(ph.overallLoss) || 0, dayPct = Number(ph.dailyLoss) || 0;
            const ovAmt = size * ovPct / 100, dayAmt = size * dayPct / 100;
            let eq = size, peak = size, worstDD = 0, worstDaily = 0, worstDailyDate = null, minEq = size;
            let breach = null; // first rule broken: { rule: 'daily'|'overall', date }
            (days || []).forEach(d => {
                const p = Number(d.pnl) || 0;
                const floorBefore = !ovAmt ? null : (type === 'trailing' ? peak - ovAmt : size - ovAmt);
                eq += p;
                if (p < 0 && -p > worstDaily) { worstDaily = -p; worstDailyDate = d.date; }
                if (!breach && dayAmt && p < 0 && -p >= dayAmt) breach = { rule: 'daily', date: d.date };
                if (!breach && floorBefore !== null && eq <= floorBefore) breach = { rule: 'overall', date: d.date };
                if (eq < minEq) minEq = eq;
                const dd = peak - eq; if (type === 'trailing' && dd > worstDD) worstDD = dd;
                if (type === 'static') { const sd = size - eq; if (sd > worstDD) worstDD = sd; }
                if (eq > peak) peak = eq;
            });
            const floor = !ovAmt ? null : (type === 'trailing' ? peak - ovAmt : size - ovAmt);
            return { type, size, balance: eq, peak, floor, buffer: floor === null ? null : eq - floor, ovPct, ovAmt, dayPct, dayAmt,
                     worstDD, worstDDPct: size ? worstDD / size * 100 : 0, worstDaily, worstDailyPct: size ? worstDaily / size * 100 : 0, worstDailyDate, minEq, breach };
        }
        /* ---- Phase engine: Failed + auto next phase ----
           FAILED  : daily loss limit or overall drawdown (static/trailing) hit in the running phase -> m.status = 'failed'.
           PASSED  : profit target reached AND min trading days AND min profitable days met -> running phase moves to the next one.
           Everything is derived from the logged days, so fixing a wrong trade re-evaluates the account automatically. */
        function fxPhaseDays(m, parent, label) {
            const o = fxLoadDays(fxCalId(m, parent, label));
            return Object.keys(o).sort().map(k => ({ date: k, pnl: Number(o[k].pnl) || 0 }));
        }
        function fxPassDate(size, days, ph) {
            const tgt = size * (Number(ph.profitTarget) || 0) / 100;
            if (!(tgt > 0)) return null;
            const minDays = Number(ph.minTradingDays) || 0, minProf = Number(ph.minProfitableDays) || 0, minPct = Number(ph.minProfitDayPct) || 0;
            let cum = 0, n = 0, qual = 0;
            for (const d of days) {
                cum += d.pnl; n++;
                if (d.pnl > 0 && (!minPct || d.pnl / size * 100 >= minPct)) qual++;
                if (cum >= tgt && n >= minDays && qual >= minProf) return d.date;
            }
            return null;
        }
        // Re-checks one MT5 account. Returns a list of events [{type:'passed'|'failed'|'revived', ...}] and saves if anything changed.
        function fxEvaluateMt5(m, parent) {
            const ev = [];
            if (!m || !fxIsProp(parent) || !(m.phaseSequence || []).length || !m.phases) return ev;
            let guard = 0;
            while (guard++ < 6) {
                const seq = m.phaseSequence;
                if (m.status === 'failed' && m.failInfo) {
                    const fl = m.failInfo.phase, fph = m.phases[fl] || {};
                    if (fxDrawdownInfo(m.size, fxPhaseDays(m, parent, fl), fph).breach) break;   // still failed
                    m.status = 'active'; delete m.failInfo; m.runningPhase = fl; ev.push({ type: 'revived', phase: fl });
                }
                const run = fxPhaseOf(m, parent), ph = m.phases[run] || {};
                const days = fxPhaseDays(m, parent, run);
                const info = fxDrawdownInfo(m.size, days, ph);
                const pass = run !== 'Funded' ? fxPassDate(m.size, days, ph) : null;
                if (info.breach && (!pass || info.breach.date <= pass)) {
                    m.status = 'failed';
                    m.failInfo = { phase: run, rule: info.breach.rule, date: info.breach.date, type: info.type };
                    ev.push({ type: 'failed', phase: run, rule: info.breach.rule, date: info.breach.date });
                    break;
                }
                if (pass) {
                    const next = seq[seq.indexOf(run) + 1];
                    if (!next) break;
                    m.passed = m.passed || {}; m.passed[run] = pass;
                    m.runningPhase = next;
                    ev.push({ type: 'passed', phase: run, next, date: pass });
                    continue;
                }
                break;
            }
            if (ev.length) saveAccounts();
            return ev;
        }
        function fxEvaluateParent(parent) {
            let all = [];
            if (!fxIsProp(parent)) return all;
            (parent.mt5Accounts || []).forEach(m => { fxEvaluateMt5(m, parent).forEach(e => all.push(Object.assign({ m, parent }, e))); });
            return all;
        }
        function fxEvaluateEverything() {
            try { (tradelyAccounts || []).forEach(a => { if (a.category !== 'binary') fxEvaluateParent(a); }); } catch (e) { console.warn('Phase check skipped', e); }
        }
        function fxFailText(m) {
            const f = m && m.failInfo; if (!f) return '';
            return (f.rule === 'daily' ? 'Daily loss limit hit' : (f.type === 'trailing' ? 'Trailing drawdown hit' : 'Overall drawdown hit')) + ' in ' + f.phase + ' on ' + f.date;
        }
        function fxToastEvents(evs) {
            evs.forEach(e => {
                const n = e.m ? e.m.name : '';
                if (e.type === 'passed') showAppToast(`${n}: ${e.phase} passed — moved to ${e.next}`, 'success');
                else if (e.type === 'failed') showAppToast(`${n}: FAILED — ${e.rule === 'daily' ? 'daily loss limit' : 'overall drawdown'} hit in ${e.phase}`, 'error');
                else if (e.type === 'revived') showAppToast(`${n}: ${e.phase} is active again`, 'success');
            });
        }

        /* ---- Payout engine (Funded phase) ---- */
        function fxToday() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        function fxDayDiff(a, b) { return Math.round((Date.parse(a + 'T00:00:00') - Date.parse(b + 'T00:00:00')) / 864e5); }
        function fxPayoutInfo(m, ph, A, seq) {
            const size = Number(A.size) || 0, days = A.days || {}, keys = Object.keys(days).sort();
            const prev = seq[seq.indexOf('Funded') - 1], last = m.lastPayout || null;
            const start = last || keys[0] || (prev && m.passed && m.passed[prev]) || null;
            const use = keys.filter(k => !last || k > last);
            const profit = use.reduce((t, k) => t + (Number(days[k].pnl) || 0), 0);
            const pct = size ? profit / size * 100 : 0;
            const cycle = Number(ph.payoutCycle) || 0, minP = Number(ph.minPayoutPct) || 0, inact = Number(ph.inactivityDays) || 0;
            const split = Number(ph.profitSplit) || 100, today = fxToday();
            const elapsed = start ? Math.max(0, fxDayDiff(today, start)) : 0;
            const lastTrade = keys.length ? keys[keys.length - 1] : null;
            const idle = lastTrade ? Math.max(0, fxDayDiff(today, lastTrade)) : null;
            const minAmt = Number(ph.minPayoutAmt) || 0;
            const consLim = ph.consistency === 'yes' ? (Number(ph.consistencyPct) || 0) : 0;
            const best = use.reduce((b, k) => Math.max(b, Number(days[k].pnl) || 0), 0);
            const consShare = profit > 0 ? best / profit * 100 : 0;
            const consOk = !consLim || profit <= 0 || consShare <= consLim;
            const consExtra = (!consOk && consLim) ? Math.max(0, best * 100 / consLim - profit) : 0; // extra profit (spread over other days) that fixes it
            const payoutAmt = Math.max(0, profit) * split / 100;
            const pctOk = !minP || pct >= minP, cycleOk = !cycle || elapsed >= cycle, amtOk = !minAmt || payoutAmt >= minAmt;
            return { size, profit, pct, cycle, minP, minAmt, inact, split, start, elapsed, idle, lastTrade, pctOk, cycleOk, amtOk,
                     consLim, consShare, consOk, consExtra, best,
                     eligible: profit > 0 && pctOk && cycleOk && amtOk && consOk, payoutAmt,
                     pctLeft: Math.max(0, minP - pct), amtLeft: Math.max(0, minAmt - payoutAmt), daysLeft: Math.max(0, cycle - elapsed),
                     hasRules: !!(cycle || minP || minAmt || inact || consLim) };
        }
        function fxPayoutPanel(m, ph, A, seq) {
            const P = fxPayoutInfo(m, ph, A, seq);
            window.fxPayCtx = { m, ph, A, seq, P };
            const rows = [];
            if (P.minP) rows.push(fxRuleRow('Profit this cycle', `${Math.max(0, P.pct).toFixed(2)}% / ${P.minP}%`, Math.max(0, P.pct) / P.minP * 100, P.pctOk ? 'bg-aura-green' : 'bg-blue-500', P.pctOk ? 'Minimum payout profit reached' : `${P.pctLeft.toFixed(2)}% more needed (${formatMoney(P.size * P.pctLeft / 100)})`));
            else rows.push(fxRuleRow('Profit this cycle', `${P.pct.toFixed(2)}%`, 0, 'bg-blue-500', 'No minimum payout % set'));
            if (P.minAmt) rows.push(fxRuleRow('Minimum payout amount', `${formatMoney(P.payoutAmt)} / ${formatMoney(P.minAmt)}`, P.payoutAmt / P.minAmt * 100, P.amtOk ? 'bg-aura-green' : 'bg-blue-500', P.amtOk ? 'Minimum payout amount reached' : `${formatMoney(P.amtLeft)} more of your share needed`));
            if (P.consLim) rows.push(fxRuleRow('Consistency (this cycle)', `${P.consShare.toFixed(1)}% / ${P.consLim}%`, P.consShare / P.consLim * 100, P.consOk ? 'bg-aura-green' : 'bg-aura-red', P.profit <= 0 ? 'No profit yet this cycle' : (P.consOk ? 'Best day is within the limit' : `Best day is too large. Make about ${formatMoney(P.consExtra)} more on other days`)));
            if (P.cycle) rows.push(fxRuleRow('Payout cycle', `${Math.min(P.elapsed, P.cycle)} / ${P.cycle} days`, P.elapsed / P.cycle * 100, P.cycleOk ? 'bg-aura-green' : 'bg-blue-500', P.cycleOk ? 'Cycle complete' : `${P.daysLeft} day${P.daysLeft === 1 ? '' : 's'} left${P.start ? ' · cycle started ' + P.start : ''}`));
            if (P.inact) { const ic = P.idle === null ? 0 : P.idle; rows.push(fxRuleRow('Inactivity', `${P.idle === null ? '—' : ic + ' / ' + P.inact + ' days idle'}`, ic / P.inact * 100, ic >= P.inact ? 'bg-aura-red' : (ic >= P.inact * 0.7 ? 'bg-aura-amber' : 'bg-aura-green'), P.lastTrade ? `Last trade day: ${P.lastTrade}` : 'No trade yet')); }
            const banner = P.eligible
                ? `<div class="rounded-lg border border-aura-green/40 bg-aura-green/10 p-3 mb-4 flex items-center justify-between gap-3 flex-wrap"><div><div class="text-xs font-bold text-aura-green">You can take a payout now</div><div class="text-[11px] text-gray-300 mt-0.5">Profit ${formatMoney(P.profit)} (${P.pct.toFixed(2)}%) · your share (${P.split}%) ≈ <b class="text-white">${formatMoney(P.payoutAmt)}</b></div></div><button onclick="fxMarkPayout('${m.id}')" class="px-3 py-1.5 rounded-md text-xs font-semibold bg-aura-green/20 border border-aura-green/40 text-aura-green hover:bg-aura-green/30 transition">Mark payout taken</button></div>`
                : `<div class="rounded-lg border border-aura-border bg-aura-bg/60 p-3 mb-4 text-[11px] text-gray-300">Payout not available yet: ${[(!P.pctOk ? P.pctLeft.toFixed(2) + '% more profit' : ''), (!P.amtOk ? formatMoney(P.amtLeft) + ' more to reach the minimum payout amount' : ''), (!P.consOk ? 'consistency rule not met' : ''), (!P.cycleOk ? P.daysLeft + ' more day(s) in cycle' : ''), (P.profit <= 0 ? 'no profit this cycle' : '')].filter(Boolean).join(' · ') || 'set payout rules in account settings'}.</div>`;
            const hist = fxPayoutHistoryHtml(m);
            const btn = `<button onclick="payOpen()" class="px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-500/10 border border-violet-500/40 text-violet-300 hover:bg-violet-500/20 transition flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Payout Plan</button>`;
            return fxPanel('Payout status', `${P.split}% split${m.lastPayout ? ' · last payout ' + m.lastPayout : ''}`, banner + `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">${rows.join('') || '<p class="text-xs text-gray-500">Set Payout Cycle, Min Payout % and Inactivity in the account settings.</p>'}</div><div class="mt-5 flex justify-end">${btn}</div>`) + `<div class="mt-5">${hist}</div>`;
        }
        function fxPayoutAlerts() {
            const out = [];
            (tradelyAccounts || []).forEach(parent => {
                if (!parent || parent.category === 'binary' || parent.subtype !== 'funded') return;
                (parent.mt5Accounts || []).forEach(m => {
                    try {
                        const seq = m.phaseSequence || [];
                        if (fxPhaseOf(m, parent) !== 'Funded' || !m.phases || !m.phases.Funded || m.failInfo) return;
                        const A = computeFxStats(m, null, fxCalId(m, parent, 'Funded'));
                        const P = fxPayoutInfo(m, m.phases.Funded, A, seq);
                        const name = m.name || parent.nickname || parent.name || 'Account';
                        const base = { parentId: parent.id, mt5Id: m.id, name };
                        if (P.eligible) out.push(Object.assign({ kind: 'ready', tone: 'green', text: `Payout ready: about ${formatMoney(P.payoutAmt)} is available.` }, base));
                        if (P.inact && P.idle !== null) {
                            if (P.idle >= P.inact) out.push(Object.assign({ kind: 'inactive', tone: 'red', text: `Inactivity limit reached: ${P.idle} days without a trade (limit ${P.inact}).` }, base));
                            else if (P.idle >= P.inact * 0.7) out.push(Object.assign({ kind: 'idle', tone: 'amber', text: `Inactivity warning: ${P.idle} of ${P.inact} days used. Place a trade within ${P.inact - P.idle} day(s).` }, base));
                        }
                    } catch (e) { console.warn('Payout alert skipped', e); }
                });
            });
            return out;
        }
        function renderPayoutAlerts() {
            const host = document.getElementById('payout-alerts');
            if (!host) return;
            const alerts = fxPayoutAlerts();
            host.classList.toggle('hidden', !alerts.length);
            const cls = { green: 'border-aura-green/40 bg-aura-green/10 text-aura-green', amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300', red: 'border-aura-red/40 bg-aura-red/10 text-aura-red' };
            host.innerHTML = alerts.map(a => `<div class="rounded-lg border ${cls[a.tone]} px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap" role="status">
                <div class="min-w-0 text-xs"><span class="font-bold">${escapeHtml(a.name)}</span> <span class="text-gray-200">${escapeHtml(a.text)}</span></div>
                <button onclick="fxOpenPayoutAccount('${escapeHtml(a.parentId)}','${escapeHtml(a.mt5Id)}')" class="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-current hover:bg-white/5 transition shrink-0">Open account</button></div>`).join('');
            // one toast per account and alert type per day
            try {
                const today = fxToday(), seen = TradelyStore.getJSON('tradely_payout_notified', {});
                let changed = false;
                alerts.forEach(a => {
                    const k = a.mt5Id + ':' + a.kind;
                    if (seen[k] !== today) { seen[k] = today; changed = true; if (typeof showAppToast === 'function') showAppToast(`${a.name}: ${a.text}`, a.tone === 'green' ? 'success' : 'error'); }
                });
                if (changed) TradelyStore.setJSON('tradely_payout_notified', seen);
            } catch (e) {}
        }
        function fxOpenPayoutAccount(parentId, mt5Id) {
            openCfdAccountPage(parentId);
            fxAcc.selectedMt5[parentId] = mt5Id;
            renderFxStats();
        }
        function fxMarkPayout(id) {
            { const _f = findMt5(id); if (_f && _f.mt5 && _f.mt5.status === 'failed') { showAppToast('This account has failed and is view-only.', 'error'); return; } }
            const parent = getAccountById(mt5State.parentId), m = parent && (parent.mt5Accounts || []).find(x => x.id === id);
            if (!m) return;
            const PP = (window.fxPayCtx || {}).P || {};
            m.lastPayout = fxToday();
            m.payouts = (m.payouts || []).concat({ date: m.lastPayout, amount: Math.round((PP.payoutAmt || 0) * 100) / 100, cycleDays: PP.start ? PP.elapsed : null, profit: Math.round((PP.profit || 0) * 100) / 100 });
            saveAccounts(); renderFxStats(); showAppToast('Payout saved — new cycle started.', 'success');
        }
        function fxPayoutHistoryHtml(m) {
            const list = (m.payouts || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
            if (!list.length) return fxPanel('Payout history', 'No payouts yet', '<p class="text-xs text-gray-500">When you click "Mark payout taken", the date, amount and cycle length are saved here.</p>');
            let total = 0;
            const rowsHtml = list.map((p, i) => {
                total += Number(p.amount) || 0;
                const cd = p.cycleDays != null ? p.cycleDays : (i > 0 ? Math.max(0, fxDayDiff(p.date, list[i - 1].date)) : null);
                return `<tr class="border-t border-aura-border/60"><td class="py-2 text-gray-300">${escapeHtml(p.date)}</td><td class="py-2 text-center font-bold text-aura-green">${formatMoney(Number(p.amount) || 0)}</td><td class="py-2 text-right text-gray-300">${cd == null ? '—' : cd + ' days'}</td></tr>`;
            }).reverse().join('');
            const undo = `<button onclick="fxUndoPayout('${escapeHtml(m.id)}')" class="px-2.5 py-1 rounded-md text-[11px] border border-aura-border text-gray-400 hover:text-white hover:border-aura-red/50 transition">Undo last payout</button>`;
            return fxPanel('Payout history', `${list.length} payout${list.length === 1 ? '' : 's'} · total ${formatMoney(total)}`,
                `<div class="overflow-x-auto"><table class="w-full text-[11px] font-mono table-fixed"><thead><tr class="text-gray-500 text-left"><th class="pb-2 font-medium w-1/3">Date</th><th class="pb-2 font-medium text-center w-1/3">Amount</th><th class="pb-2 font-medium text-right w-1/3">Cycle length</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><div class="mt-4 flex justify-end">${undo}</div>`);
        }
        function fxUndoPayout(id) {
            { const _f = findMt5(id); if (_f && _f.mt5 && _f.mt5.status === 'failed') { showAppToast('This account has failed and is view-only.', 'error'); return; } }
            const parent = getAccountById(mt5State.parentId), m = parent && (parent.mt5Accounts || []).find(x => x.id === id);
            if (!m || !(m.payouts || []).length) return;
            if (!confirm('Remove the most recent payout? Its cycle will be re-opened.')) return;
            const list = m.payouts.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
            list.pop();
            m.payouts = list; m.lastPayout = list.length ? list[list.length - 1].date : null;
            saveAccounts(); renderFxStats(); showAppToast('Last payout removed.', 'success');
        }
        function fxRuleRow(label, valueTxt, pct, color, note) {
            return `<div class="space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-mono"><span class="text-gray-400">${label}</span><span class="text-white font-bold">${valueTxt}</span></div>
                ${fxBar(pct, color)}${note ? `<div class="text-[10px] text-gray-500">${note}</div>` : ''}</div>`;
        }

        function renderFxStats() {
            const pane = document.getElementById('fx-stats-pane');
            if (!pane) return;
            fxDestroyCharts();
            const parent = getAccountById(mt5State.parentId);
            const m = parent ? (parent.mt5Accounts || []).find(x => x.id === fxAcc.selectedMt5[parent.id]) : null;
            if (!parent) { pane.innerHTML = ''; return; }
            if (!m) {
                pane.innerHTML = `<div class="h-full flex items-center justify-center"><div class="glass-card rounded-xl border border-dashed border-aura-border p-10 flex flex-col items-center text-center max-w-md">
                    <div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3"><i data-lucide="server" class="w-5 h-5 text-blue-400"></i></div>
                    <h3 class="text-sm font-semibold text-white">${(parent.mt5Accounts || []).length ? 'Select an account' : 'No MT5 accounts yet'}</h3>
                    <p class="text-xs text-gray-500 mt-1">${(parent.mt5Accounts || []).length ? 'Pick an MT5 account from the list to open its stats.' : 'Add an MT5 account to get its own stats and calendar.'}</p>
                    ${(parent.mt5Accounts || []).length ? '' : `<button onclick="openMt5Modal()" class="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs flex items-center gap-1.5 font-medium"><i data-lucide="plus" class="w-3.5 h-3.5"></i> New MT5 Account</button>`}
                </div></div>`;
                renderIcons();
                return;
            }

            const isFunded = parent.subtype === 'funded';
            const seq = m.phaseSequence || [];
            // Prop accounts: every phase has its own calendar, so stats + rules below only ever use the phase being viewed.
            const runPhase = isFunded ? fxPhaseOf(m, parent) : null;
            const phaseLabel = (isFunded && seq.length) ? (seq.includes(fxAcc.phase[m.id]) ? fxAcc.phase[m.id] : runPhase) : null;
            const calId = fxCalId(m, parent, phaseLabel);
            const A = computeFxStats(m, null, calId);                  // all time within this phase
            const S = (!rgActive(fxAcc) && fxAcc.period === 'all') ? A : computeFxStats(m, rgActive(fxAcc) ? { start: fxAcc.from || '0000-01-01', end: fxAcc.to || '9999-12-31' } : fxPeriodRange(fxAcc.period), calId);
            const ph = phaseLabel && m.phases ? (m.phases[phaseLabel] || {}) : {};
            window.fxConsCtx = { m, parent, phaseLabel, calId, ph, isFunded };
            const leverage = isFunded ? ((m.phases && m.phases[seq[seq.length - 1]] || {}).leverage) : m.leverage;
            const curBal = A.endEq;
            const retPct = A.size ? (curBal - A.size) / A.size * 100 : 0;

            const detail = (k, v) => v ? `<div class="flex items-center gap-1.5 text-[11px] font-mono"><span class="text-gray-500">${k}</span><span class="text-gray-200">${escapeHtml(String(v))}</span></div>` : '';
            const chain = isFunded && seq.length ? seq.map(l => `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${l === 'Funded' ? 'bg-aura-green/10 text-aura-green border-aura-green/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}">${mt5ShortLabel(l)}</span>`).join('<i data-lucide="chevron-right" class="w-3 h-3 text-gray-600"></i>') : '';

            const header = `
            <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="min-w-0">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <h2 class="text-xl font-bold text-white">${escapeHtml(m.name)}</h2>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono border bg-blue-500/10 text-blue-400 border-blue-500/20">MT5</span>
                        ${m.status === 'failed' ? '<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold border bg-aura-red/15 text-aura-red border-aura-red/40">FAILED</span>' : ''}
                        ${isFunded ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono border bg-aura-hover text-gray-300 border-aura-border">${mt5ModeLabel(m.phasesMode)}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-x-5 gap-y-1 flex-wrap mt-2">
                        ${detail('Size', mt5FmtSize(m.size))}${detail('Drawdown', (isFunded && phaseLabel) ? (fxDdType(ph) === 'trailing' ? 'Trailing' : 'Static') : '')}${detail('Login ID', m.loginId)}${detail('Leverage', leverage)}${detail('Firm', parent.provider ? parent.provider.name : '')}
                        ${chain ? `<div class="flex items-center gap-1">${chain}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="consOpen('fx')" class="px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white transition shadow-md shadow-violet-600/20 flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> AI Coach</button>
                    ${(isFunded && phaseLabel) ? `<button onclick="rulesOpen()" class="px-3 py-1.5 rounded-md text-xs font-semibold bg-aura-hover border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition flex items-center gap-1.5"><i data-lucide="scroll-text" class="w-3.5 h-3.5"></i> Rules</button>` : ''}
                    <button onclick="openMt5Modal('${m.id}')" class="px-3 py-1.5 rounded-md text-xs font-medium bg-aura-hover border border-aura-border text-gray-300 hover:text-white transition flex items-center gap-1.5"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button>
                    <button onclick="openMt5Calendar('${m.id}', '${phaseLabel || ''}')" class="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Open ${phaseLabel ? escapeHtml(phaseLabel) + ' ' : ''}calendar</button>
                </div>
            </div>`;


            const phaseBar = (isFunded && seq.length) ? `
            <div class="glass-card rounded-xl border border-aura-border p-3 flex items-center gap-3 flex-wrap">
                <span class="text-xs font-semibold text-white">Phase</span>
                <div class="flex items-center gap-1.5 flex-wrap">${seq.map(l => {
                    const viewing = l === phaseLabel, running = l === runPhase;
                    return `<button onclick="fxSetPhase('${m.id}','${l}')" class="px-3 py-1.5 rounded-md text-xs font-medium border transition flex items-center gap-1.5 ${viewing ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-aura-border bg-aura-bg text-gray-400 hover:text-white'}">${running ? '<span class="w-1.5 h-1.5 rounded-full bg-aura-green"></span>' : ''}${l}${running ? '<span class="text-[9px] text-aura-green font-mono">running</span>' : ''}</button>`;
                }).join('')}</div>
                <div class="flex-1"></div>
                ${phaseLabel !== runPhase
                    ? `<button onclick="fxSetRunningPhase('${m.id}','${phaseLabel}')" class="px-3 py-1.5 rounded-md text-xs font-medium bg-aura-hover border border-aura-border text-gray-300 hover:text-white hover:border-blue-500/40 transition">Set ${escapeHtml(phaseLabel)} as running phase</button>`
                    : `<span class="text-[11px] text-gray-500">Stats and calendar below belong to ${escapeHtml(phaseLabel)} only.</span>`}
            </div>` : '';

            const hero = `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="glass-card p-4 rounded-xl border border-aura-border"><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">Current balance</div><div class="text-2xl font-bold font-mono text-white mt-2">${formatMoney(curBal)}</div><div class="text-[11px] font-mono ${fxPnlCls(retPct)} mt-1">${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}% since start</div></div>
                <div class="glass-card p-4 rounded-xl border border-aura-border"><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">Starting balance</div><div class="text-2xl font-bold font-mono text-gray-300 mt-2">${formatMoney(A.size)}</div><div class="text-[11px] font-mono text-gray-500 mt-1">${A.tradedDays} traded day${A.tradedDays === 1 ? '' : 's'}</div></div>
                <div class="glass-card p-4 rounded-xl border border-aura-border"><div class="text-[10px] font-mono uppercase tracking-wider text-gray-500">Total PNL</div><div class="text-2xl font-bold font-mono ${fxPnlCls(A.pnl)} mt-2">${fxSigned(A.pnl)}</div><div class="text-[11px] font-mono text-gray-500 mt-1">${A.trades} trade${A.trades === 1 ? '' : 's'} logged</div></div>
            </div>`;

            const noData = A.tradedDays === 0 ? `
            <div class="rounded-xl border border-dashed border-aura-border p-4 flex items-center justify-between gap-3 flex-wrap">
                <div><div class="text-sm font-semibold text-white">No trades logged for ${escapeHtml(m.name)}${phaseLabel ? ' in ' + escapeHtml(phaseLabel) : ''} yet</div><div class="text-xs text-gray-500 mt-0.5">Log trades on this ${phaseLabel ? 'phase' : 'account'}'s own calendar and every stat below fills in automatically.</div></div>
                <button onclick="openMt5Calendar('${m.id}', '${phaseLabel || ''}')" class="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Open calendar</button>
            </div>` : '';

            let rules = '';
            if (isFunded && phaseLabel) {
                const isF = phaseLabel === 'Funded';
                const worstLoss = A.worstDay && A.worstDay.pnl < 0 ? -A.worstDay.pnl : 0;
                const dailyPct = A.size ? worstLoss / A.size * 100 : 0;
                const DDI = fxDrawdownInfo(A.size, A.keys.map(k => ({ date: k, pnl: Number(A.days[k].pnl) || 0 })), ph);
                const overallPct = DDI.worstDDPct;
                const profitPct = A.size ? A.pnl / A.size * 100 : 0;
                const lvl = (pct, lim) => !lim ? 'bg-blue-500' : (pct >= lim ? 'bg-aura-red' : (pct >= lim * 0.8 ? 'bg-aura-amber' : 'bg-aura-green'));
                const rows = [];
                if (!isF && ph.profitTarget) rows.push(fxRuleRow('Profit target', `${Math.max(0, profitPct).toFixed(2)}% / ${ph.profitTarget}%`, Math.max(0, profitPct) / ph.profitTarget * 100, profitPct >= ph.profitTarget ? 'bg-aura-green' : 'bg-blue-500', profitPct >= ph.profitTarget ? 'Target reached' : `${Math.max(0, ph.profitTarget - profitPct).toFixed(2)}% to go (${formatMoney(Math.max(0, ph.profitTarget / 100 * A.size - A.pnl))})`));
                if (ph.dailyLoss) rows.push(fxRuleRow('Worst daily loss', `${dailyPct.toFixed(2)}% / ${ph.dailyLoss}%`, dailyPct / ph.dailyLoss * 100, lvl(dailyPct, ph.dailyLoss), A.worstDay && worstLoss ? `Worst day: ${A.worstDay.date}` : 'No losing day yet'));
                if (ph.overallLoss) rows.push(fxRuleRow('Overall drawdown · ' + (DDI.type === 'trailing' ? 'Trailing' : 'Static'), `${overallPct.toFixed(2)}% / ${ph.overallLoss}%`, overallPct / ph.overallLoss * 100, lvl(overallPct, ph.overallLoss), DDI.type === 'trailing' ? `Highest balance ${formatMoney(DDI.peak)} → floor now ${formatMoney(DDI.floor)} (moves up with new highs)` : `Fixed floor ${formatMoney(DDI.floor)} · lowest balance ${formatMoney(A.minEq)}`));
                if (ph.minTradingDays) rows.push(fxRuleRow('Trading days', `${A.tradedDays} / ${ph.minTradingDays}`, A.tradedDays / ph.minTradingDays * 100, A.tradedDays >= ph.minTradingDays ? 'bg-aura-green' : 'bg-blue-500'));
                const minPct = Number(ph.minProfitDayPct) || 0;
                const qualDays = Object.keys(A.days).filter(k => (Number(A.days[k].pnl) || 0) > 0 && (!minPct || (A.size && (Number(A.days[k].pnl) || 0) / A.size * 100 >= minPct))).length;
                if (ph.minProfitableDays) rows.push(fxRuleRow('Profitable days' + (minPct ? ` (≥ ${minPct}% each)` : ''), `${qualDays} / ${ph.minProfitableDays}`, qualDays / ph.minProfitableDays * 100, qualDays >= ph.minProfitableDays ? 'bg-aura-green' : 'bg-blue-500', minPct ? `${A.winDays} green day${A.winDays === 1 ? '' : 's'} total, ${qualDays} reached ${minPct}%` : ''));
                if (ph.consistency === 'yes' && ph.consistencyPct) {
                    const totProfit = Object.keys(A.days).reduce((t, k) => t + Math.max(0, Number(A.days[k].pnl) || 0), 0);
                    const bestP = A.bestDay && A.bestDay.pnl > 0 ? A.bestDay.pnl : 0;
                    const share = totProfit > 0 ? bestP / totProfit * 100 : 0;
                    const lim = Number(ph.consistencyPct);
                    rows.push(fxRuleRow('Consistency (best day share)', `${share.toFixed(1)}% / ${lim}%`, share / lim * 100, share > lim ? 'bg-aura-red' : (share >= lim * 0.8 ? 'bg-aura-amber' : 'bg-aura-green'), bestP ? `Best day ${A.bestDay.date}: ${formatMoney(bestP)} of ${formatMoney(totProfit)} gross profit${share > lim ? ' — breaks the rule' : ''}` : 'No profitable day yet'));
                }
                const chips = seq.map(l => `<button onclick="fxSetPhase('${m.id}','${l}')" class="px-2 py-1 rounded text-[10px] font-mono border transition ${l === phaseLabel ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-aura-border bg-aura-bg text-gray-400 hover:text-white'}">${l}</button>`).join('');
                const payPanel = isF ? fxPayoutPanel(m, ph, A, seq) : '';
                rules = payPanel + fxPanel('Prop firm rules · ' + escapeHtml(phaseLabel), `${leverage ? 'Leverage ' + escapeHtml(String(ph.leverage || leverage)) : ''}${isF && ph.profitSplit ? ' · Split ' + ph.profitSplit + '%' : ''}`,
                    `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">${rows.join('') || '<p class="text-xs text-gray-500">No limits set for this phase.</p>'}</div>`);
            }

            const periodBtns = FX_PERIODS.map(p => `<button onclick="fxSetPeriod('${p.id}')" class="px-3 py-1.5 rounded-md text-xs font-medium border transition ${fxAcc.period === p.id && !rgActive(fxAcc) ? 'bg-blue-600 border-blue-500/40 text-white' : 'bg-aura-bg border-aura-border text-gray-400 hover:text-white hover:border-gray-600'}">${p.label}</button>`).join('') + rgBtn('fx', 'px-3 py-1.5 rounded-md text-xs font-medium border', 'bg-blue-600 border-blue-500/40 text-white', 'bg-aura-bg border-aura-border text-gray-400 hover:text-white hover:border-gray-600', 'Custom');
            const periodLbl = rgActive(fxAcc) ? rgLabel(fxAcc.from, fxAcc.to) : (FX_PERIODS.find(p => p.id === fxAcc.period) || {}).label;
            const streakTxt = S.curStreak ? `${S.curStreak} ${S.curType === 'profit' ? 'win' : 'loss'} day${S.curStreak > 1 ? 's' : ''}` : '—';
            const pfTxt = S.pf === Infinity ? '∞' : (S.units.length ? S.pf.toFixed(2) : '—');
            const D = DOT;
            const card = (label, value, sub, dot, cls) => { const h = statCard(label, value, sub, dot); return cls ? h.replace('text-xl font-mono font-bold text-white', 'text-xl font-mono font-bold ' + cls) : h; };
            const sgnR = v => v === null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
            const tradeCnt = {}, symPnl = {}; Object.keys(S.pairs).forEach(k => { tradeCnt[k] = S.pairs[k].trades; });
            const sesCnt = {}, sesPnl = {}; Object.keys(S.sessions).forEach(k => { sesCnt[k] = S.sessions[k].trades; sesPnl[k] = S.sessions[k].pnl; });
            const wdPnl = {}; S.weekday.forEach((w, i) => { if (w.days > 0) wdPnl[WEEKDAY_NAMES_FULL[i]] = w.pnl; });
            const top = (map, fn) => Object.keys(map).length ? fn(map) : null;
            const pl = periodLbl;
            const cards = [
                // Results
                card('PNL', fxSigned(S.pnl), pl, S.pnl >= 0 ? D.green : D.red, fxPnlCls(S.pnl)),
                card('RETURN', S.startEq ? ((S.pnl / S.startEq * 100 >= 0 ? '+' : '') + (S.pnl / S.startEq * 100).toFixed(2) + '%') : '—', 'on period start balance', null, fxPnlCls(S.pnl)),
                card('TOTAL TRADES', S.trades, `${S.tradingDays} trading days`),
                card('TOTAL TRADING DAYS', S.tradingDays, pl),
                card('WIN RATE (DAYS)', S.tradingDays ? fxPct(S.winDays / S.tradingDays * 100) : '—', 'profit days / trading days'),
                card('WIN RATE (TRADES)', fxPct(S.tradeWR), 'wins / total trades'),
                card('WIN RATE (EXCL. BE)', fxPct(S.tradeWRexBE), 'TP / (TP + SL)'),
                card('PROFIT FACTOR', pfTxt, `${formatMoney(S.gp)} / ${formatMoney(S.gl)}`, null, S.pf >= 1.5 ? 'text-aura-green' : ''),
                card('EXPECTANCY', S.units.length ? fxSigned(S.expectancy) : '—', 'per trade', null, S.units.length ? fxPnlCls(S.expectancy) : ''),
                card('AVG DAILY PNL', S.tradedDays ? fxSigned(S.avgDaily) : '—', 'per traded day', null, S.tradedDays ? fxPnlCls(S.avgDaily) : ''),
                // Days & best / worst
                card('TOTAL PROFIT DAYS', S.winDays, pl, D.green),
                card('TOTAL BE DAYS', S.beDays, pl, D.amber),
                card('TOTAL LOSS DAYS', S.lossDays, pl, D.red),
                card('HIGHEST PROFIT DAY', S.hiProfit ? fxSigned(S.hiProfit.pnl) : '—', S.hiProfit ? S.hiProfit.date : '', D.green, S.hiProfit ? 'text-aura-green' : ''),
                card('HIGHEST LOSS DAY', S.hiLoss ? fxSigned(S.hiLoss.pnl) : '—', S.hiLoss ? S.hiLoss.date : '', D.red, S.hiLoss ? 'text-aura-red' : ''),
                card('BEST TRADE', S.bestTrade ? fxSigned(S.bestTrade.pnl) : '—', S.bestTrade ? (S.bestTrade.pair ? S.bestTrade.pair + ' · ' : '') + S.bestTrade.date : '', D.green, S.bestTrade ? fxPnlCls(S.bestTrade.pnl) : ''),
                card('WORST TRADE', S.worstTrade ? fxSigned(S.worstTrade.pnl) : '—', S.worstTrade ? (S.worstTrade.pair ? S.worstTrade.pair + ' · ' : '') + S.worstTrade.date : '', D.red, S.worstTrade ? fxPnlCls(S.worstTrade.pnl) : ''),
                card('AVG WIN', S.nW ? fxSigned(S.avgWin) : '—', `${S.nW} winning`, null, S.nW ? 'text-aura-green' : ''),
                card('AVG LOSS', S.nL ? fxSigned(S.avgLoss) : '—', `${S.nL} losing`, null, S.nL ? 'text-aura-red' : ''),
                // Drawdown & streaks
                card('MAX DRAWDOWN', S.maxDD > 0 ? formatMoney(-S.maxDD) : '—', S.maxDD > 0 ? `-${S.maxDDPct.toFixed(2)}% from peak · ${pl}` : pl, D.pink),
                card('CURRENT DRAWDOWN', S.curDD > 0.005 ? formatMoney(-S.curDD) : '$0.00', `-${S.curDDPct.toFixed(2)}% from peak`, null, S.curDD > 0.005 ? 'text-aura-red' : ''),
                card('CURRENT STREAK', streakTxt, 'traded days', null, S.curType === 'profit' ? 'text-aura-green' : (S.curType === 'loss' ? 'text-aura-red' : '')),
                card('BEST WIN STREAK', S.bestWin + ' day' + (S.bestWin === 1 ? '' : 's'), 'profit days in a row', D.green),
                card('WORST LOSS STREAK', S.worstLoss + ' day' + (S.worstLoss === 1 ? '' : 's'), 'loss days in a row', D.red),
                // Trade outcomes
                card("TOTAL TP'S", S.tp, 'trades', D.green),
                card("TOTAL SL'S", S.sl, 'trades', D.red),
                card("TOTAL BE'S", S.be, 'trades', D.amber),
                card("TOTAL TP+RF'S", S.tpRf, 'trades', D.green),
                card("TOTAL BE+RF'S", S.beRf, 'trades', D.green),
                card("TOTAL SL+RF'S", S.slRf, 'trades', D.amberRed),
                card('AVG TRADES / DAY', S.tradingDays ? (S.trades / S.tradingDays).toFixed(1) : '—', 'per trading day'),
                // Risk : reward
                card('AVG RR', S.avgRR !== null ? sgnR(S.avgRR) : '—', pl),
                card('TOTAL RR', S.totalRR !== null ? sgnR(S.totalRR) : '—', pl),
                card('MOSTLY USED RR', top(S.rrTargets, pickTopKey) || '—', pl),
                // Habits
                card('MOST TRADED SYMBOL', top(tradeCnt, pickTopKey) || '—', pl),
                card('MOST TRADED SESSION', top(sesCnt, pickTopKey) || '—', pl),
                card('MOST PROFITABLE SESSION', top(sesPnl, pickTopKey) || '—', pl, D.green),
                card('MOST LOSS SESSION', top(sesPnl, pickBottomKey) || '—', pl, D.red),
                card('MOST PROFITABLE DAY', top(wdPnl, pickTopKey) || '—', 'day of week', D.green),
                card('RULES FOLLOWED', fxPct(S.rulesPct, 0), 'trades logged with rules toggle', null, S.rulesPct !== null && S.rulesPct >= 80 ? 'text-aura-green' : ''),
                card('EMOTIONAL TRADES', S.emotional, 'trades', S.emotional ? D.amber : null, S.emotional ? 'text-aura-amber' : '')
            ].join('');

            const statsPanel = `<div class="space-y-4">
                <div class="flex items-center gap-2 flex-wrap">${periodBtns}</div>
                ${fxPanel('Performance', periodLbl, `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">${cards}</div>`)}
            </div>`;

            const hasData = S.tradedDays > 0;
            const empty = '<div class="h-full flex items-center justify-center text-xs text-gray-500">No trades in this period.</div>';
            const charts = `
                ${fxPanel('Equity curve', `${S.tradedDays} traded days`, `<div class="h-72">${hasData ? '<canvas id="fx-equity-chart"></canvas>' : empty}</div>`)}
                ${fxPanel('Drawdown', `Max: -${S.maxDDPct.toFixed(2)}%`, `<div class="h-40">${hasData ? '<canvas id="fx-dd-chart"></canvas>' : empty}</div>`)}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    ${fxPanel('Outcomes', `${S.tp + S.sl + S.be} trades`, `<div class="h-52">${(S.tp + S.sl + S.be) ? '<canvas id="fx-outcome-chart"></canvas>' : empty}</div>${(S.tp + S.sl + S.be) ? `<div class="flex items-center justify-center gap-4 mt-3 text-xs font-mono"><span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-aura-green"></span>TP ${S.tp}</span><span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-aura-red"></span>SL ${S.sl}</span><span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-aura-amber"></span>BE ${S.be}</span></div>` : ''}`)}
                    ${fxPanel('Monthly PNL', '', `<div class="h-52">${hasData ? '<canvas id="fx-monthly-chart"></canvas>' : empty}</div>`)}
                </div>`;

            const maxAbs = Math.max(1, ...S.weekday.map(w => Math.abs(w.pnl)));
            const dow = S.weekday.some(w => w.days > 0) ? `<div class="space-y-2">${WEEKDAY_NAMES.map((name, i) => { const w = S.weekday[i];
                return `<div class="flex items-center gap-2 text-[11px] font-mono"><span class="w-8 text-gray-400">${name}</span><div class="flex-1 h-2 rounded-full bg-aura-hover overflow-hidden"><div class="h-full ${w.pnl >= 0 ? 'bg-aura-green' : 'bg-aura-red'} rounded-full" style="width:${Math.round(Math.abs(w.pnl) / maxAbs * 100)}%"></div></div><span class="w-20 text-right ${fxPnlCls(w.pnl)}">${fxSigned(w.pnl)}</span><span class="w-10 text-right text-gray-500">${w.trades ? Math.round(w.wins / w.trades * 100) + '%' : '—'}</span></div>`; }).join('')}</div>` : '<p class="text-xs text-gray-500 text-center py-6">No trades in this period.</p>';

            const breakdown = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${fxPanel('Day of week', 'PNL · win %', dow)}
                ${fxPanel('Sessions', '', fxBreakdownRows(S.sessions, 'No sessions logged yet.'))}
            </div>
            ${fxPanel('Pairs', `${Object.keys(S.pairs).length} traded`, fxBreakdownRows(S.pairs, 'No pairs logged yet.'))}`;

            fxAcc.dayMap = S.days;
            if (!fxAcc.expanded) fxAcc.expanded = new Set();
            const dayRows = S.keys.slice().reverse().map(k => fxDayRowHTML(k, S.days[k])).join('');
            const bandKey = { profit: 0, loss: 0, be: 0 };
            S.keys.forEach(k => { bandKey[getPnlBand(Number(S.days[k].pnl) || 0)]++; });
            const legend = `<div class="flex items-center gap-3 text-[10px] font-mono text-gray-500 mb-3 flex-wrap">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm border border-aura-green/70 bg-aura-green/20"></span>Profit ${bandKey.profit}</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm border border-aura-amber/70 bg-aura-amber/20"></span>Breakeven ${bandKey.be}</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm border border-aura-red/70 bg-aura-red/20"></span>Loss ${bandKey.loss}</span>
                <span class="ml-auto text-gray-600">Click a day to expand · click a trade for full details</span></div>`;
            const days = fxPanel('Traded days', `${S.tradedDays} in period`, dayRows ? `${legend}<div class="space-y-2 max-h-[640px] overflow-y-auto pr-1">${dayRows}</div>` : '<p class="text-xs text-gray-500 text-center py-6">No traded days in this period.</p>');

            const failBanner = (m.status === 'failed' && m.failInfo) ? `<div class="rounded-xl border border-aura-red/50 bg-aura-red/10 p-4 flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-aura-red/15 flex items-center justify-center shrink-0"><i data-lucide="octagon-x" class="w-5 h-5 text-aura-red"></i></div>
                <div class="min-w-0"><div class="text-base font-bold text-aura-red">Account FAILED</div>
                <div class="text-sm text-gray-200 mt-0.5">${escapeHtml(fxFailText(m))}${m.failInfo.type === 'trailing' && m.failInfo.rule === 'overall' ? ' (floor followed your highest balance)' : ''}.</div>
                <div class="text-xs text-gray-400 mt-1 leading-relaxed">This account is closed — new days after ${escapeHtml(m.failInfo.date)} cannot be logged. If a trade was logged wrongly, fix or delete it on the calendar and the status updates automatically.</div></div></div>` : '';
            const passedBanner = (m.passed && Object.keys(m.passed).length && m.status !== 'failed') ? `<div class="rounded-xl border border-aura-green/30 bg-aura-green/5 px-4 py-2.5 text-xs text-gray-300 flex items-center gap-2 flex-wrap"><i data-lucide="check-circle-2" class="w-4 h-4 text-aura-green"></i>${(m.phaseSequence || []).filter(l => m.passed[l]).map(l => `<span><b class="text-aura-green">${escapeHtml(l)}</b> passed on ${escapeHtml(m.passed[l])}</span>`).join('<span class="text-gray-600">→</span>')}</div>` : '';
            const rest = `${passedBanner}${phaseBar}${noData}${hero}${rules}${statsPanel}${charts}${breakdown}${days}`;
            pane.innerHTML = `${header}${failBanner}` + (m.status === 'failed' ? `<div class="fx-failed-view space-y-6" title="This account has failed. View only.">${rest}</div>` : rest);

            // ---- charts ----
            if (hasData && typeof Chart !== 'undefined') {
                fxAcc.charts.equity = new Chart(document.getElementById('fx-equity-chart'), {
                    type: 'line',
                    data: { labels: S.equity.map(p => p.date || 'Start'), datasets: [{ data: S.equity.map(p => p.equity), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#3b82f6', borderWidth: 2 }] },
                    options: baChartOpts({ plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: c => 'Balance: ' + formatMoney(c.parsed.y) } } } })
                });
                fxAcc.charts.dd = new Chart(document.getElementById('fx-dd-chart'), {
                    type: 'line',
                    data: { labels: S.ddSeries.map(p => p.date), datasets: [{ data: S.ddSeries.map(p => p.ddPct), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)', fill: true, tension: 0.15, pointRadius: 0, borderWidth: 1.5 }] },
                    options: baChartOpts()
                });
                const mk = Object.keys(S.monthly).sort();
                fxAcc.charts.monthly = new Chart(document.getElementById('fx-monthly-chart'), {
                    type: 'bar',
                    data: { labels: mk.map(k => `${MONTH_NAMES[parseInt(k.split('-')[1], 10) - 1]} '${k.split('-')[0].slice(2)}`), datasets: [{ data: mk.map(k => S.monthly[k].pnl), backgroundColor: mk.map(k => S.monthly[k].pnl >= 0 ? '#22c55e' : '#ef4444'), borderRadius: 4 }] },
                    options: baChartOpts()
                });
            }
            if ((S.tp + S.sl + S.be) > 0 && typeof Chart !== 'undefined') {
                fxAcc.charts.outcome = new Chart(document.getElementById('fx-outcome-chart'), {
                    type: 'doughnut',
                    data: { labels: ['TP', 'SL', 'BE'], datasets: [{ data: [S.tp, S.sl, S.be], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
                });
            }
            renderIcons();
        }

        function mt5HighlightSize() {
            const cur = parseFloat(document.getElementById('mt5-size').value);
            document.getElementById('mt5-size-chips').innerHTML = MT5_SIZES.map(n => {
                const on = n === cur;
                return `<button type="button" onclick="document.getElementById('mt5-size').value=${n}; mt5HighlightSize()" class="px-2 py-1 rounded text-[10px] font-mono border transition ${on ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-aura-border bg-aura-bg text-gray-400 hover:border-blue-500/50 hover:text-white'}">${mt5FmtSize(n)}</button>`;
            }).join('');
        }

        function openMt5Modal(editId) {
            const parent = getAccountById(mt5State.parentId);
            if (!parent) return;
            const isFunded = parent.subtype === 'funded';
            const m = editId ? (parent.mt5Accounts || []).find(x => x.id === editId) : null;
            mt5State.editingId = m ? m.id : null;
            mt5State.phasesMode = m ? m.phasesMode : '1';
            mt5State.phases = m && m.phases ? JSON.parse(JSON.stringify(m.phases)) : {};
            mt5State.running = m ? m.runningPhase : null;

            document.getElementById('mt5-modal-title').textContent = m ? 'Edit MT5 Account' : 'New MT5 Account';
            document.getElementById('mt5-save-btn').textContent = m ? 'Save' : 'Create';
            document.getElementById('mt5-name').value = m ? m.name : '';
            document.getElementById('mt5-size').value = m ? m.size : '';
            document.getElementById('mt5-login').value = m ? (m.loginId || '') : '';
            document.getElementById('mt5-password').value = m ? (m.password || '') : '';
            document.getElementById('mt5-password').type = 'password';
            document.getElementById('mt5-personal-leverage').value = m ? (m.leverage || '') : '';
            document.getElementById('mt5-phases-select').value = mt5State.phasesMode; if (window.mt5TplRefresh) mt5TplRefresh();
            document.getElementById('mt5-error').classList.add('hidden');
            document.getElementById('mt5-phases-wrap').classList.toggle('hidden', !isFunded); document.getElementById('mt5-tpl-wrap').classList.toggle('hidden', !isFunded);
            document.getElementById('mt5-personal-wrap').classList.toggle('hidden', isFunded);
            mt5HighlightSize();
            mt5RenderPhaseBlocks();
            const modal = document.getElementById('mt5-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeMt5Modal() {
            const modal = document.getElementById('mt5-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            mt5State.editingId = null;
        }

        // Reads whatever is currently typed in the phase blocks so nothing is lost when the phase count changes.
        function mt5CollectPhases() {
            document.querySelectorAll('#mt5-phase-blocks [data-phase-block]').forEach(block => {
                const label = block.getAttribute('data-phase-block');
                const o = {};
                block.querySelectorAll('[data-f]').forEach(inp => { o[inp.getAttribute('data-f')] = inp.value.trim(); });
                mt5State.phases[label] = o;
            });
        }

        function mt5OnPhasesChange() {
            mt5CollectPhases();
            const __rs = document.getElementById('mt5-running-select'); if (__rs && __rs.value) mt5State.running = __rs.value;
            mt5State.phasesMode = document.getElementById('mt5-phases-select').value;
            mt5RenderPhaseBlocks();
        }

        function mt5RenderPhaseBlocks() {
            const parent = getAccountById(mt5State.parentId);
            const wrap = document.getElementById('mt5-phase-blocks');
            if (!parent || parent.subtype !== 'funded') { wrap.innerHTML = ''; return; }
            const mode = mt5State.phasesMode;
            const __seq = mt5Sequence(mode), __cur = __seq.includes(mt5State.running) ? mt5State.running : __seq[0];
            document.getElementById('mt5-running-select').innerHTML = __seq.map(l => `<option value="${l}" ${l === __cur ? 'selected' : ''}>${l}</option>`).join('');
            document.getElementById('mt5-phases-hint').textContent = mode === 'instant'
                ? 'Instant: goes straight to a funded account, no evaluation.'
                : 'Profit target applies to evaluation phases only. The Funded phase comes last.';
            const inputCls = 'mt5-in mt-1.5 w-full bg-aura-bg border border-aura-border rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50';
            const lbl = (t, opt) => `<label class="text-[10px] font-mono uppercase tracking-wider text-gray-500">${t}${opt ? ' <span class="text-gray-600 normal-case">(optional)</span>' : ''}</label>`;
            wrap.innerHTML = mt5Sequence(mode).map((label, i) => {
                const isF = label === 'Funded';
                const v = (mt5State.phases[label]) || {};
                const val = k => escapeHtml(v[k] != null ? String(v[k]) : '').replace(/"/g, '&quot;');
                const inp = (k, ph, type) => `<input type="${type || 'number'}" step="any" data-f="${k}" value="${val(k)}" placeholder="${ph}" class="${inputCls}">`;
                const yn = k => `<select data-f="${k}" class="${inputCls}"><option value="allowed" ${v[k] === 'not_allowed' ? '' : 'selected'}>Allowed</option><option value="not_allowed" ${v[k] === 'not_allowed' ? 'selected' : ''}>Not allowed</option></select>`;
                return `
                <div data-phase-block="${label}" class="p-3 rounded-lg border border-aura-border bg-aura-bg/40 space-y-3">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-md ${isF ? 'bg-aura-green/10 text-aura-green' : 'bg-blue-500/10 text-blue-400'} flex items-center justify-center text-[10px] font-bold">${isF ? 'F' : (i + 1)}</div>
                        <div class="text-xs font-semibold text-white">${isF ? 'Funded Account' : label}</div>
                    </div>
                    ${isF ? `<div>${lbl('Profit Split (%)', true)}${inp('profitSplit', 'e.g. 80')}</div>`
                          : `<div>${lbl('Profit Target (%)')}${inp('profitTarget', 'e.g. 8')}</div>`}
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Daily Drawdown (%)')}${inp('dailyLoss', 'e.g. 5')}</div>
                        <div>${lbl('Overall Drawdown (%)')}${inp('overallLoss', 'e.g. 10')}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Leverage')}${inp('leverage', 'e.g. 1:100', 'text')}</div>
                        <div>${lbl('Min Trading Days', true)}${inp('minTradingDays', 'e.g. 4')}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Min Profitable Days', true)}${inp('minProfitableDays', 'e.g. 2')}</div>
                        <div>${lbl('Min Profit per Day (%)', true)}${inp('minProfitDayPct', 'e.g. 0.5')}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Inactivity Rule (days)', true)}${inp('inactivityDays', 'e.g. 30')}</div>
                        ${isF ? `<div>${lbl('Payout Cycle (days)', true)}${inp('payoutCycle', 'e.g. 14')}</div>` : '<div></div>'}
                    </div>
                    ${isF ? `<div class="grid grid-cols-2 gap-3"><div>${lbl('Min Payout Profit (% of account)', true)}${inp('minPayoutPct', 'e.g. 3')}</div><div>${lbl('Min Payout Amount ($)', true)}${inp('minPayoutAmt', 'e.g. 100')}</div></div><p class="text-[10px] text-gray-500 -mt-1">Payout opens only after the % profit is made in the current cycle and your share reaches the dollar amount. Fill in one or both, as your firm requires.</p>` : ''}
                    <p class="text-[10px] text-gray-500 -mt-1">A day counts as "profitable" only if it made at least this % of the account size. Leave empty to count any green day.</p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Consistency Rule', false)}
                            <select data-f="consistency" onchange="this.closest('[data-phase-block]').querySelector('[data-cons-wrap]').classList.toggle('hidden', this.value !== 'yes')" class="${inputCls}">
                                <option value="no" ${v.consistency === 'yes' ? '' : 'selected'}>No</option>
                                <option value="yes" ${v.consistency === 'yes' ? 'selected' : ''}>Yes</option>
                            </select></div>
                        <div data-cons-wrap class="${v.consistency === 'yes' ? '' : 'hidden'}">${lbl('Best day max (% of total profit)')}${inp('consistencyPct', 'e.g. 30')}</div>
                    </div>
                    <div class="pt-3 border-t border-aura-border space-y-3">
                        <div class="text-[10px] font-mono uppercase tracking-wider text-amber-300/80">Drawdown type &amp; trading rules</div>
                        <div>${lbl('Drawdown Type')}
                            <select data-f="drawdownType" class="${inputCls}">
                                <option value="static" ${v.drawdownType === 'trailing' ? '' : 'selected'}>Static (fixed from starting balance)</option>
                                <option value="trailing" ${v.drawdownType === 'trailing' ? 'selected' : ''}>Trailing (follows your highest balance)</option>
                            </select>
                            <p class="text-[10px] text-gray-500 mt-1">Static: the loss floor never moves. Trailing: the floor moves up as your balance reaches new highs.</p></div>
                        <div class="grid grid-cols-3 gap-3">
                            <div>${lbl('Weekend Holding')}${yn('weekendHolding')}</div>
                            <div>${lbl('Overnight Holding')}${yn('overnightHolding')}</div>
                            <div>${lbl('News Trading')}${yn('newsTrading')}</div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        function saveMt5Account() {
            const parent = getAccountById(mt5State.parentId);
            if (!parent) return;
            const err = document.getElementById('mt5-error');
            const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
            const isFunded = parent.subtype === 'funded';

            const name = document.getElementById('mt5-name').value.trim();
            const size = parseFloat(document.getElementById('mt5-size').value);
            if (!name) return fail('Name is required.');
            if (isNaN(size) || size <= 0) return fail('Enter a valid account size.');

            const m = {
                id: mt5State.editingId || ('mt5_' + Date.now()),
                name: name,
                size: size,
                loginId: document.getElementById('mt5-login').value.trim(),
                password: document.getElementById('mt5-password').value,
                createdAt: Date.now()
            };

            if (isFunded) {
                mt5CollectPhases();
                const mode = document.getElementById('mt5-phases-select').value;
                const seq = mt5Sequence(mode);
                const phases = {};
                const num = x => (x === '' || x == null) ? null : parseFloat(x);
                for (const label of seq) {
                    const v = mt5State.phases[label] || {};
                    const isF = label === 'Funded';
                    if (!isF && !v.profitTarget) return fail(label + ': enter the profit target %.');
                    if (!v.dailyLoss) return fail((isF ? 'Funded' : label) + ': enter the daily drawdown %.');
                    if (!v.overallLoss) return fail((isF ? 'Funded' : label) + ': enter the overall drawdown %.');
                    if (!v.leverage) return fail((isF ? 'Funded' : label) + ': enter the leverage.');
                    if (v.consistency === 'yes' && !(parseFloat(v.consistencyPct) > 0)) return fail(label + ': enter the consistency rule % (best day max share of total profit).');
                    phases[label] = {
                        profitTarget: isF ? null : num(v.profitTarget),
                        profitSplit: isF ? num(v.profitSplit) : null,
                        dailyLoss: num(v.dailyLoss),
                        overallLoss: num(v.overallLoss),
                        leverage: v.leverage,
                        minTradingDays: num(v.minTradingDays),
                        minProfitableDays: num(v.minProfitableDays),
                        minProfitDayPct: num(v.minProfitDayPct),
                        inactivityDays: num(v.inactivityDays),
                        payoutCycle: isF ? num(v.payoutCycle) : null,
                        minPayoutPct: isF ? num(v.minPayoutPct) : null,
                        minPayoutAmt: isF ? num(v.minPayoutAmt) : null,
                        consistency: v.consistency === 'yes' ? 'yes' : 'no',
                        consistencyPct: v.consistency === 'yes' ? num(v.consistencyPct) : null,
                        drawdownType: v.drawdownType === 'trailing' ? 'trailing' : 'static',
                        weekendHolding: v.weekendHolding === 'not_allowed' ? 'not_allowed' : 'allowed',
                        overnightHolding: v.overnightHolding === 'not_allowed' ? 'not_allowed' : 'allowed',
                        newsTrading: v.newsTrading === 'not_allowed' ? 'not_allowed' : 'allowed'
                    };
                }
                m.phasesMode = mode;
                m.phaseSequence = seq;
                m.phases = phases;
                const __run = document.getElementById('mt5-running-select').value;
                m.runningPhase = seq.includes(__run) ? __run : seq[0];
            } else {
                m.leverage = document.getElementById('mt5-personal-leverage').value.trim();
            }
            err.classList.add('hidden');

            parent.mt5Accounts = parent.mt5Accounts || [];
            if (mt5State.editingId) {
                const i = parent.mt5Accounts.findIndex(x => x.id === mt5State.editingId);
                if (i >= 0) { m.createdAt = parent.mt5Accounts[i].createdAt || m.createdAt; parent.mt5Accounts[i] = m; }
            } else {
                parent.mt5Accounts.push(m);
                fxAcc.selectedMt5[parent.id] = m.id;
                migrateLegacyForexCalendar(parent);
            }
            saveAccounts();
            fxMigratePhaseCalendars();
            closeMt5Modal();
            fxEnsureCalendarLink();
            renderCfdAccountPage();
        }

        let mt5DelId = null;
        function deleteMt5Account(id) {
            const parent = getAccountById(mt5State.parentId);
            if (!parent) return;
            const m = (parent.mt5Accounts || []).find(x => x.id === id);
            if (!m) return;
            mt5DelId = id;
            // Gather what will be lost, across every phase calendar of this account.
            let pnl = 0, trades = 0, days = 0, shots = 0;
            ['', '~p1', '~p2', '~p3', '~funded'].forEach(sfx => {
                const d = fxLoadDays(id + sfx);
                Object.keys(d).forEach(k => {
                    const e = d[k]; days++; pnl += Number(e.pnl) || 0;
                    const logs = Array.isArray(e.tradeLogs) ? e.tradeLogs : [];
                    trades += logs.length || Number(e.trades) || 0;
                    logs.forEach(t => { shots += (t.screenshots || []).length; });
                });
            });
            const isFunded = parent.subtype === 'funded';
            const run = isFunded ? fxPhaseOf(m, parent) : null;
            const name = m.name || 'this account';
            document.getElementById('mt5-del-title').textContent = 'Delete “' + name + '”?';
            document.getElementById('mt5-del-sub').textContent = mt5FmtSize(m.size) + (isFunded ? ' · ' + mt5ModeLabel(m.phasesMode) + (run ? ' · Running ' + run : '') : ' · Personal') + ' — under ' + (parent.nickname || parent.name || 'this account') + '.';
            const tile = (l, v, c) => '<div class="bg-aura-bg border border-aura-border rounded-lg px-2.5 py-2"><div class="text-[9px] font-mono uppercase tracking-wider text-gray-500">' + l + '</div><div class="text-sm font-bold font-mono ' + (c || 'text-white') + ' mt-0.5 truncate">' + v + '</div></div>';
            document.getElementById('mt5-del-stats').innerHTML = days
                ? tile('Trades', trades) + tile('Traded days', days) + tile('Net PNL', fxSigned(pnl), fxPnlCls(pnl))
                : '<div class="col-span-3 text-[11px] text-gray-500 border border-dashed border-aura-border rounded-lg px-3 py-3 text-center">No trades logged on this account yet.</div>';
            document.getElementById('mt5-del-warn').textContent = days
                ? 'You’ll lose ' + trades + ' trade' + (trades === 1 ? '' : 's') + (shots ? ', ' + shots + ' screenshot' + (shots === 1 ? '' : 's') : '') + ' and its full calendar history. This cannot be undone.'
                : 'This permanently removes the account and its settings. It cannot be undone.';
            document.getElementById('mt5-del-name-hint').textContent = '“' + name + '”';
            const inp = document.getElementById('mt5-del-input');
            inp.value = ''; inp.placeholder = name;
            mt5DeleteCheck();
            const modal = document.getElementById('mt5-delete-modal');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            renderIcons();
            setTimeout(() => inp.focus(), 50);
        }
        function mt5DeleteName() {
            const parent = getAccountById(mt5State.parentId);
            const m = parent && (parent.mt5Accounts || []).find(x => x.id === mt5DelId);
            return m ? (m.name || '') : null;
        }
        function mt5DeleteCheck() {
            const ok = (document.getElementById('mt5-del-input').value.trim().toLowerCase() === String(mt5DeleteName() || '').trim().toLowerCase());
            const b = document.getElementById('mt5-del-btn');
            b.disabled = !ok;
            b.classList.toggle('opacity-40', !ok); b.classList.toggle('cursor-not-allowed', !ok);
        }
        function closeMt5Delete() {
            const modal = document.getElementById('mt5-delete-modal');
            if (!modal) return;
            modal.classList.add('hidden'); modal.classList.remove('flex'); mt5DelId = null;
        }
        function mt5DeleteConfirm() {
            if (document.getElementById('mt5-del-btn').disabled) return;
            const parent = getAccountById(mt5State.parentId);
            const id = mt5DelId;
            if (!parent || !id) return closeMt5Delete();
            const m = (parent.mt5Accounts || []).find(x => x.id === id);
            parent.mt5Accounts = parent.mt5Accounts.filter(x => x.id !== id);
            saveAccounts();
            fxPurgeMt5Data(id);
            fxEnsureCalendarLink();
            closeMt5Delete();
            renderCfdAccountPage();
            if (typeof showAppToast === 'function') showAppToast('Deleted ' + (m ? m.name : 'MT5 account'), 'success');
        }

        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            const dm = document.getElementById('mt5-delete-modal');
            if (dm && !dm.classList.contains('hidden')) { closeMt5Delete(); return; }
            const modal = document.getElementById('mt5-modal');
            if (modal && !modal.classList.contains('hidden')) { closeMt5Modal(); return; }
            const fxTab = document.getElementById('tab-forex-account');
            if (fxTab && !fxTab.classList.contains('hidden')) closeCfdAccountPage();
        });

        function accountTypeBadge(acc) {
            if (acc.category === 'binary') return { label: 'BINARY', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
            if (acc.subtype === 'funded') return { label: 'FUNDED', cls: 'bg-aura-green/10 text-aura-green border-aura-green/20' };
            return { label: 'PERSONAL', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
        }

        function renderAccounts() {
            const grid = document.getElementById('accounts-grid');
            const empty = document.getElementById('accounts-empty');
            if (!grid || !empty) return;
            renderPayoutAlerts();

            if (!tradelyAccounts.length) {
                grid.classList.add('hidden');
                empty.classList.remove('hidden');
                return;
            }
            empty.classList.add('hidden');
            grid.classList.remove('hidden');

            grid.innerHTML = tradelyAccounts.map(acc => {
                const badge = accountTypeBadge(acc);
                const providerName = acc.provider ? acc.provider.name : '—';
                const isBinary = acc.category === 'binary';
                let pnlRowHtml = '';
                if (isBinary) {
                    const stats = computeAccountStats(acc.id, acc.startingBalance || 0);
                    const pnlColor = stats.totalPnl > 0 ? 'text-aura-green' : (stats.totalPnl < 0 ? 'text-aura-red' : 'text-gray-300');
                    pnlRowHtml = `
                        ${acc.startingBalance ? `<div class="flex justify-between gap-2"><span class="text-gray-500">Starting Balance</span><span class="text-white font-bold">$${Number(acc.startingBalance).toLocaleString()}</span></div>` : ''}
                        <div class="flex justify-between gap-2"><span class="text-gray-500">PNL</span><span class="${pnlColor} font-bold">${formatMoney(stats.totalPnl)}</span></div>`;
                }
                return `
                <div class="glass-card p-4 rounded-xl border border-aura-border space-y-3 relative cursor-pointer hover:border-blue-500/50 transition" onclick="${isBinary ? 'openBinaryAccountPage' : 'openCfdAccountPage'}('${acc.id}')">
                    <div class="absolute top-3 right-3 flex items-center gap-2.5 z-10">
                        <button onclick="event.stopPropagation(); openEditAccountModal('${acc.id}')" title="Edit account" class="text-gray-600 hover:text-blue-400 transition">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteAccount('${acc.id}')" title="Delete account" class="text-gray-600 hover:text-aura-red transition">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                    <div class="flex items-start gap-3 pr-12">
                        ${providerIconHTML(acc.provider, 38)}
                        <div class="min-w-0">
                            <div class="text-sm font-bold text-white truncate">${escapeHtml(acc.nickname || acc.name)}</div>
                            <div class="text-[11px] text-gray-500 font-mono truncate">${escapeHtml(providerName)}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${badge.cls}">${badge.label}</span>
                        ${isBinary ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${acc.mode === 'real' ? 'bg-aura-green/10 text-aura-green border-aura-green/20' : 'bg-aura-hover text-gray-400 border-aura-border'}">${acc.mode === 'real' ? 'REAL' : 'DEMO'}</span>` : ''}
                    </div>
                    <div class="space-y-1.5 font-mono text-[11px] pt-2 border-t border-aura-border/60">
                        ${acc.nickname ? `<div class="flex justify-between gap-2"><span class="text-gray-500">Name</span><span class="text-gray-300 truncate">${escapeHtml(acc.name)}</span></div>` : ''}
                        ${acc.ownerName ? `<div class="flex justify-between gap-2"><span class="text-gray-500">Owner</span><span class="text-gray-300 truncate">${escapeHtml(acc.ownerName)}</span></div>` : ''}
                        ${acc.accountId ? `<div class="flex justify-between gap-2"><span class="text-gray-500">ID</span><span class="text-gray-300 truncate">${escapeHtml(acc.accountId)}</span></div>` : ''}
                        ${acc.mail ? `<div class="flex justify-between gap-2"><span class="text-gray-500">Email</span><span class="text-gray-300 truncate">${escapeHtml(acc.mail)}</span></div>` : ''}
                        ${!isBinary && acc.startingBalance ? `<div class="flex justify-between gap-2"><span class="text-gray-500">Starting Balance</span><span class="text-white font-bold">$${Number(acc.startingBalance).toLocaleString()}</span></div>` : ''}
                        ${pnlRowHtml}
                    </div>
                    ${isBinary ? `<div class="text-[10px] text-blue-400 flex items-center gap-1 pt-1"><span>View full stats</span><i data-lucide="arrow-right" class="w-3 h-3"></i></div>` : `<div class="text-[10px] text-blue-400 flex items-center gap-1 pt-1"><span>${(acc.mt5Accounts || []).length} MT5 account${(acc.mt5Accounts || []).length === 1 ? '' : 's'}</span><i data-lucide="arrow-right" class="w-3 h-3"></i></div>`}
                </div>`;
            }).join('');
            renderIcons();
        }

        /* ---------- Delete account (with confirmation) ---------- */
        let pendingDeleteAccountId = null;

        // The trash icon only OPENS the confirmation popup; nothing is removed until "Yes, delete account".
        function deleteAccount(id) {
            const acc = getAccountById(id);
            if (!acc) return;
            pendingDeleteAccountId = id;
            document.getElementById('delete-account-name').textContent = acc.nickname || acc.name;
            const modal = document.getElementById('delete-account-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeDeleteAccountModal() {
            pendingDeleteAccountId = null;
            const modal = document.getElementById('delete-account-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function confirmDeleteAccount() {
            const id = pendingDeleteAccountId;
            if (!id) { closeDeleteAccountModal(); return; }
            const __delAcc = getAccountById(id);
            tradelyAccounts = tradelyAccounts.filter(a => a.id !== id);
            saveAccounts();
            // Remove the account's own data so nothing orphaned is left behind.
            try {
                localStorage.removeItem(baDaysKey(id));
                localStorage.removeItem(baFundsKey(id));
                localStorage.removeItem(baTargetsKey(id));
                localStorage.removeItem('tradely_acc_days_' + id);
                localStorage.removeItem('tradely_calendar_entries_forex_' + id);
                ((__delAcc && __delAcc.mt5Accounts) || []).forEach(m => fxPurgeMt5Data(m.id));
            } catch (e) {}
            if (baState.accountId === id) closeBinaryAccountPage();
            if (mt5State.parentId === id) closeCfdAccountPage();
            fxEnsureCalendarLink();
            if (typeof calendarLinkedAccountId !== 'undefined' && calendarLinkedAccountId === id) {
                calendarLinkedAccountId = null;
                try {
                    // The deleted account's trades must disappear from the calendar too (it is now "no account selected").
                    if (typeof calendarEntries !== 'undefined') calendarEntries = {};
                    if (typeof renderCalendar === 'function') renderCalendar();
                    else if (typeof renderCalendarAccountBadge === 'function') renderCalendarAccountBadge();
                } catch (e) {}
            }
            closeDeleteAccountModal();
            renderAccounts();
        }

        /* ---------- Edit account ---------- */
        let editingAccountId = null;
        let eaMode = 'demo';

        function eaSetMode(mode) {
            eaMode = mode;
            const demoBtn = document.getElementById('ea-mode-demo-btn');
            const realBtn = document.getElementById('ea-mode-real-btn');
            const base = 'px-3 py-2 rounded-md text-xs font-medium border transition';
            if (mode === 'demo') {
                demoBtn.className = base + ' border-blue-500/50 bg-blue-500/10 text-blue-400';
                realBtn.className = base + ' border-aura-border bg-aura-bg text-gray-400';
            } else {
                realBtn.className = base + ' border-aura-green/50 bg-aura-green/10 text-aura-green';
                demoBtn.className = base + ' border-aura-border bg-aura-bg text-gray-400';
            }
        }

        function openEditAccountModal(id) {
            const acc = getAccountById(id);
            if (!acc) return;
            editingAccountId = id;
            const isBinary = acc.category === 'binary';

            document.getElementById('ea-field-name').value = acc.name || '';
            document.getElementById('ea-field-nickname').value = acc.nickname || '';
            document.getElementById('ea-field-id').value = acc.accountId || '';
            document.getElementById('ea-field-owner').value = acc.ownerName || '';
            document.getElementById('ea-field-mail').value = acc.mail || '';
            document.getElementById('ea-field-balance').value = acc.startingBalance || '';
            document.getElementById('ea-form-error').classList.add('hidden');

            document.getElementById('ea-broker-wrap').classList.toggle('hidden', !isBinary);
            document.getElementById('ea-id-wrap').classList.toggle('hidden', !isBinary);
            document.getElementById('ea-owner-wrap').classList.toggle('hidden', isBinary);
            document.getElementById('ea-balance-wrap').classList.toggle('hidden', !isBinary);
            document.getElementById('ea-mode-wrap').classList.toggle('hidden', !isBinary);

            if (isBinary) {
                const sel = document.getElementById('ea-field-broker');
                sel.innerHTML = BINARY_BROKERS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                if (acc.provider && BINARY_BROKERS.some(b => b.id === acc.provider.id)) sel.value = acc.provider.id;
                eaSetMode(acc.mode === 'real' ? 'real' : 'demo');
            }

            const modal = document.getElementById('edit-account-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeEditAccountModal() {
            editingAccountId = null;
            const modal = document.getElementById('edit-account-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function saveEditedAccount() {
            const acc = getAccountById(editingAccountId);
            if (!acc) { closeEditAccountModal(); return; }
            const errorEl = document.getElementById('ea-form-error');
            const isBinary = acc.category === 'binary';

            const name = document.getElementById('ea-field-name').value.trim();
            if (!name) {
                errorEl.textContent = 'Name is required.';
                errorEl.classList.remove('hidden');
                return;
            }

            let newBalance = acc.startingBalance;
            if (isBinary) {
                newBalance = parseFloat(document.getElementById('ea-field-balance').value);
                if (isNaN(newBalance) || newBalance <= 0) {
                    errorEl.textContent = 'Enter a valid starting balance.';
                    errorEl.classList.remove('hidden');
                    return;
                }
            }
            errorEl.classList.add('hidden');

            acc.name = name;
            acc.nickname = document.getElementById('ea-field-nickname').value.trim();
            acc.mail = document.getElementById('ea-field-mail').value.trim();
            if (isBinary) {
                acc.accountId = document.getElementById('ea-field-id').value.trim();
                acc.mode = eaMode;
                const broker = BINARY_BROKERS.find(b => b.id === document.getElementById('ea-field-broker').value);
                if (broker) acc.provider = broker;
                const balanceChanged = Number(acc.startingBalance) !== newBalance;
                acc.startingBalance = newBalance;
                if (balanceChanged) {
                    // Keep Funds History in sync: the starting balance is stored as the auto "Initial deposit".
                    const funds = baLoadFunds(acc.id);
                    const initial = funds.find(f => f.auto && f.type === 'deposit');
                    if (initial) { initial.amount = newBalance; baSaveFunds(acc.id, funds); }
                }
            } else {
                acc.ownerName = document.getElementById('ea-field-owner').value.trim();
            }

            saveAccounts();
            const savedId = acc.id;
            closeEditAccountModal();
            renderAccounts();
            if (baState.accountId === savedId) renderBinaryAccountPage();
            try { if (typeof renderCalendarAccountBadge === 'function') renderCalendarAccountBadge(); } catch (e) {}
        }

        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            if (!document.getElementById('delete-account-modal').classList.contains('hidden')) closeDeleteAccountModal();
            else if (!document.getElementById('edit-account-modal').classList.contains('hidden')) closeEditAccountModal();
        });

        loadAccounts();
        fxEvaluateEverything();
