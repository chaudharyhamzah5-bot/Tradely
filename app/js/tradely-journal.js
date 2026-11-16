        function openSidePanel() {
            if (isCalendarLocked()) return;
            const panel = document.getElementById('side-panel');
            if (!panel) return;
            switchSidePanelTab(sidePanelTab);
            requestAnimationFrame(() => {
                panel.classList.add('side-panel-open');
            });
        }

        function closeSidePanel() {
            const panel = document.getElementById('side-panel');
            if (!panel) return;
            panel.classList.remove('side-panel-open');
        }

        function switchSidePanelTab(tab) {
            sidePanelTab = tab;
            const daysBtn = document.getElementById('side-panel-tab-days');
            const weeksBtn = document.getElementById('side-panel-tab-weeks');
            if (daysBtn) daysBtn.classList.toggle('active', tab === 'days');
            if (weeksBtn) weeksBtn.classList.toggle('active', tab === 'weeks');
            if (tab === 'days') renderSidePanelDays();
            else renderSidePanelWeeks();
        }

        function sidePanelPnlColor(pnl) {
            return pnl > 2 ? 'text-aura-green' : (pnl < -2 ? 'text-aura-red' : 'text-aura-amber');
        }
        function sidePanelBorderColor(pnl) {
            return pnl > 2 ? 'border-aura-green/40' : (pnl < -2 ? 'border-aura-red/40' : 'border-aura-amber/40');
        }

        // Which day/week rows are expanded in the side panel (accordion state, same pattern as
        // the "Traded Days" accordion on the Accounts page).
        let sidePanelExpandedDays = new Set();
        let sidePanelExpandedWeeks = new Set();

        // List of days in the currently-viewed month that have logged entries, rendered as an
        // accordion: click a row to expand it in place (no page/panel navigation) and see the
        // full day breakdown, exactly like the "Traded Days" list on the Accounts page.
        function renderSidePanelDays() {
            const body = document.getElementById('side-panel-body');
            if (!body) return;
            const year = calendarViewDate.getFullYear();
            const month = calendarViewDate.getMonth();
            const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
            const keys = Object.keys(calendarEntries).filter(k => k.startsWith(monthPrefix)).sort().reverse();

            const typeLabel = calendarType === 'binary' ? 'Binary' : 'Forex';
            let html = `<div class="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">${typeLabel} • ${CALENDAR_MONTH_NAMES[month]} ${year} • ${keys.length} traded day${keys.length === 1 ? '' : 's'}</div>`;

            if (keys.length === 0) {
                html += `<div class="text-xs text-gray-500 text-center py-10 border border-dashed border-aura-border rounded-lg">No logged days this month yet.</div>`;
            } else {
                html += keys.map(key => sidePanelDayRowHTML(key, calendarEntries[key])).join('');
            }
            body.innerHTML = html;
            renderIcons();
        }

        function sidePanelToggleDay(dateKey) {
            if (sidePanelExpandedDays.has(dateKey)) sidePanelExpandedDays.delete(dateKey);
            else sidePanelExpandedDays.add(dateKey);
            renderSidePanelDays();
        }

        // One accordion row (collapsed summary) + its adjacent detail panel — same
        // row+sibling-panel markup/CSS as the Accounts "Traded Days" accordion.
        function sidePanelDayRowHTML(key, e) {
            const pnl = Number(e.pnl) || 0;
            const d = new Date(key + 'T00:00:00');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const mon = CALENDAR_MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase();
            const wd = d.toLocaleDateString(undefined, { weekday: 'short' });
            const wr = e.trades > 0 ? Math.round((e.wins / e.trades) * 100) : 0;
            const isExpanded = sidePanelExpandedDays.has(key);
            return `<div class="ba-day-row ${isExpanded ? 'expanded' : ''} flex items-center gap-3 bg-aura-bg hover:bg-aura-hover px-3 py-2 rounded-lg border ${sidePanelBorderColor(pnl)} cursor-pointer transition" onclick="sidePanelToggleDay('${key}')">
                    <div class="w-11 text-center shrink-0">
                        <div class="text-[9px] text-gray-500 font-mono">${mon}</div>
                        <div class="text-sm font-bold text-white font-mono">${dayNum}</div>
                        <div class="text-[9px] text-gray-500">${wd}</div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-white">${e.trades || 0} Trade${(e.trades || 0) === 1 ? '' : 's'}</div>
                        <div class="text-[10px] text-gray-500">${wr}% WR${e.note ? ' · <span class="text-gray-500">' + escapeHtml(e.note.slice(0, 40)) + (e.note.length > 40 ? '…' : '') + '</span>' : ''}</div>
                    </div>
                    <div class="text-sm font-bold font-mono ${sidePanelPnlColor(pnl)} shrink-0">${formatMoney(pnl)}</div>
                    <button onclick="event.stopPropagation(); openDayModal('${key}')" class="shrink-0 text-gray-500 hover:text-white p-1" title="Edit day"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                    <i data-lucide="chevron-down" class="ba-day-chevron w-4 h-4 text-gray-500 shrink-0"></i>
                </div>
                <div class="ba-day-trades-panel">${sidePanelDayDetailHTML(key, e)}</div>`;
        }

        // Full stat breakdown for one day, shown inline inside the expanded accordion panel.
        function sidePanelDayDetailHTML(key, e) {
            const pnl = Number(e.pnl) || 0;
            const wr = e.trades > 0 ? Math.round((e.wins / e.trades) * 100) : 0;
            const losses = Math.max(0, e.trades - e.wins);
            return `<div class="mt-1.5 mb-2 ml-2 pl-3 border-l-2 border-aura-border/60">
                <div class="glass-card rounded-lg border ${sidePanelBorderColor(pnl)} p-3 space-y-2.5" onclick="event.stopPropagation()">
                    <div class="grid grid-cols-3 gap-2 text-center">
                        <div class="bg-aura-card/60 rounded-lg border border-aura-border py-2">
                            <div class="text-[10px] text-gray-500">Win Rate</div>
                            <div class="text-sm font-bold text-white mt-0.5">${wr}%</div>
                        </div>
                        <div class="bg-aura-card/60 rounded-lg border border-aura-border py-2">
                            <div class="text-[10px] text-gray-500">Trades</div>
                            <div class="text-sm font-bold text-white mt-0.5">${e.trades || 0}</div>
                        </div>
                        <div class="bg-aura-card/60 rounded-lg border border-aura-border py-2">
                            <div class="text-[10px] text-gray-500">Accuracy</div>
                            <div class="text-sm font-bold text-white mt-0.5">${wr}%</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-center">
                        <div class="bg-aura-card/60 rounded-lg border border-aura-border py-2">
                            <div class="text-[10px] text-gray-500">Wins</div>
                            <div class="text-sm font-bold text-aura-green mt-0.5">${e.wins || 0}</div>
                        </div>
                        <div class="bg-aura-card/60 rounded-lg border border-aura-border py-2">
                            <div class="text-[10px] text-gray-500">Losses</div>
                            <div class="text-sm font-bold text-aura-red mt-0.5">${losses}</div>
                        </div>
                    </div>
                    ${calendarType === 'forex' ? `
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between bg-aura-card/60 rounded-lg border border-aura-border px-3 py-1.5">
                            <span class="flex items-center gap-2 text-[11px] text-gray-300"><span class="stat-dot stat-dot-green"></span> Take Profit</span>
                            <span class="text-xs font-mono font-bold text-aura-green">${e.tp || 0}</span>
                        </div>
                        <div class="flex items-center justify-between bg-aura-card/60 rounded-lg border border-aura-border px-3 py-1.5">
                            <span class="flex items-center gap-2 text-[11px] text-gray-300"><span class="stat-dot stat-dot-red"></span> Stop Loss</span>
                            <span class="text-xs font-mono font-bold text-aura-red">${e.sl || 0}</span>
                        </div>
                        <div class="flex items-center justify-between bg-aura-card/60 rounded-lg border border-aura-border px-3 py-1.5">
                            <span class="flex items-center gap-2 text-[11px] text-gray-300"><span class="stat-dot stat-dot-amber"></span> Break Even</span>
                            <span class="text-xs font-mono font-bold text-aura-amber">${e.be || 0}</span>
                        </div>
                    </div>` : ''}
                    ${e.note || e.mistakes ? `
                    <div class="bg-aura-card/60 rounded-lg border border-aura-border p-2.5 text-[11px] text-gray-300 leading-relaxed space-y-1">
                        ${e.note ? `<div><span class="text-gray-500">Note:</span> ${escapeHtml(e.note)}</div>` : ''}
                        ${e.mistakes ? `<div><span class="text-gray-500">Mistakes:</span> ${escapeHtml(e.mistakes)}</div>` : ''}
                    </div>` : ''}
                </div>
            </div>`;
        }

        // Recompute week boundaries exactly the same way renderCalendar() lays out the grid,
        // so week numbers/stats match what's shown on the calendar.
        function getSidePanelWeeks() {
            const year = calendarViewDate.getFullYear();
            const month = calendarViewDate.getMonth();
            const firstOfMonth = new Date(year, month, 1);
            const startWeekday = (firstOfMonth.getDay() + 6) % 7;
            const gridStart = new Date(year, month, 1 - startWeekday);
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const totalWeeks = Math.ceil((startWeekday + daysInMonth) / 7);

            const weeks = [];
            for (let w = 0; w < totalWeeks; w++) {
                let weekPnl = 0, weekTrades = 0, weekWins = 0, weekNote = [];
                const weekStart = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7);
                const weekEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + 6);
                const days = [];
                for (let d = 0; d < 7; d++) {
                    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d);
                    const key = toDateKey(cellDate);
                    const entry = calendarEntries[key];
                    days.push({ date: cellDate, key, entry: entry || null, inMonth: cellDate.getMonth() === month });
                    if (entry) {
                        weekPnl += entry.pnl;
                        weekTrades += entry.trades;
                        weekWins += entry.wins;
                        if (entry.note) weekNote.push(entry.note);
                    }
                }
                weeks.push({
                    index: w,
                    start: weekStart,
                    end: weekEnd,
                    pnl: weekPnl,
                    trades: weekTrades,
                    wins: weekWins,
                    notes: weekNote,
                    days
                });
            }
            return weeks;
        }

        // Weeks tab — same accordion pattern as the Days tab: each week is a row that expands
        // in place to reveal that week's 7 days (and their own stats) laid out day-by-day.
        function renderSidePanelWeeks() {
            const body = document.getElementById('side-panel-body');
            if (!body) return;
            const weeks = getSidePanelWeeks();
            const typeLabel = calendarType === 'binary' ? 'Binary' : 'Forex';
            const tradedWeeks = weeks.filter(w => w.trades > 0).length;
            let html = `<div class="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">${typeLabel} • ${CALENDAR_MONTH_NAMES[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()} • ${tradedWeeks} traded week${tradedWeeks === 1 ? '' : 's'}</div>`;
            html += weeks.map(w => sidePanelWeekRowHTML(w)).join('');
            body.innerHTML = html;
            renderIcons();
        }

        function sidePanelToggleWeek(weekIndex) {
            if (sidePanelExpandedWeeks.has(weekIndex)) sidePanelExpandedWeeks.delete(weekIndex);
            else sidePanelExpandedWeeks.add(weekIndex);
            renderSidePanelWeeks();
        }

        function sidePanelWeekRowHTML(w) {
            const wr = w.trades > 0 ? Math.round((w.wins / w.trades) * 100) : 0;
            const hasTrades = w.trades > 0;
            const rangeLabel = `${w.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${w.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
            const isExpanded = sidePanelExpandedWeeks.has(w.index);
            return `<div class="ba-day-row ${isExpanded ? 'expanded' : ''} flex items-center gap-3 bg-aura-bg hover:bg-aura-hover px-3 py-2.5 rounded-lg border ${hasTrades ? sidePanelBorderColor(w.pnl) : 'border-aura-border/40'} cursor-pointer transition" onclick="sidePanelToggleWeek(${w.index})">
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-white">Week ${w.index + 1}</div>
                        <div class="text-[10px] text-gray-500">${rangeLabel}${hasTrades ? ` • ${w.trades} Trade${w.trades === 1 ? '' : 's'} • ${wr}% WR` : ' • No trades'}</div>
                    </div>
                    <div class="font-mono font-bold text-sm ${hasTrades ? sidePanelPnlColor(w.pnl) : 'text-gray-500'} shrink-0">${hasTrades ? formatMoney(w.pnl) : '—'}</div>
                    <i data-lucide="chevron-down" class="ba-day-chevron w-4 h-4 text-gray-500 shrink-0"></i>
                </div>
                <div class="ba-day-trades-panel">${sidePanelWeekDaysHTML(w)}</div>`;
        }

        // Day-by-day breakdown shown inside an expanded week row.
        function sidePanelWeekDaysHTML(w) {
            const dayRows = w.days.map(day => {
                const wd = day.date.toLocaleDateString(undefined, { weekday: 'short' });
                const dayNum = String(day.date.getDate()).padStart(2, '0');
                const dimmed = !day.inMonth ? 'opacity-40' : '';
                if (!day.entry) {
                    return `<div class="flex items-center gap-2.5 bg-aura-card/40 px-2.5 py-2 rounded-md border border-dashed border-aura-border/60 ${dimmed}">
                            <div class="w-9 text-center shrink-0">
                                <div class="text-[9px] text-gray-500 font-mono">${wd}</div>
                                <div class="text-xs font-bold text-gray-500 font-mono">${dayNum}</div>
                            </div>
                            <div class="flex-1 text-[11px] text-gray-600">No trades logged</div>
                        </div>`;
                }
                const e = day.entry;
                const pnl = Number(e.pnl) || 0;
                const wr = e.trades > 0 ? Math.round((e.wins / e.trades) * 100) : 0;
                return `<div class="flex items-center gap-2.5 bg-aura-card/60 hover:bg-aura-hover px-2.5 py-2 rounded-md border border-aura-border/70 cursor-pointer transition ${dimmed}" onclick="event.stopPropagation(); openDayModal('${day.key}')">
                        <div class="w-9 text-center shrink-0">
                            <div class="text-[9px] text-gray-500 font-mono">${wd}</div>
                            <div class="text-xs font-bold text-white font-mono">${dayNum}</div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-[11px] text-gray-300 font-mono">${e.trades || 0} trade${(e.trades || 0) === 1 ? '' : 's'} · ${wr}% WR</div>
                            ${e.note ? `<div class="text-[10px] text-gray-600 truncate mt-0.5">${escapeHtml(e.note.slice(0, 44))}${e.note.length > 44 ? '…' : ''}</div>` : ''}
                        </div>
                        <div class="text-xs font-bold font-mono ${sidePanelPnlColor(pnl)} shrink-0">${formatMoney(pnl)}</div>
                    </div>`;
            }).join('');

            const notesBlock = w.notes.length ? `<div class="bg-aura-card/60 rounded-lg border border-aura-border p-2.5 text-[11px] text-gray-300 leading-relaxed space-y-1">
                    <div class="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Notes this week</div>
                    ${w.notes.map(n => `<div>• ${escapeHtml(n)}</div>`).join('')}
                </div>` : '';

            return `<div class="mt-1.5 mb-2 ml-2 pl-3 border-l-2 border-aura-border/60 space-y-1.5" onclick="event.stopPropagation()">
                    ${dayRows}
                    ${notesBlock}
                </div>`;
        }

        // ==================== DAY ENTRY MODAL ROUTER ====================
        // Forex accounts get the full per-trade logging system (see below).
        // Binary accounts keep the original quick day-summary form.
        function openDayModal(dateKey) {
            if (isCalendarLocked()) return;
            if (calendarType === 'binary') { openBinaryDayModal(dateKey); return; }
            openForexDayModal(dateKey);
        }

        // --- Binary Day Entry Modal (unchanged quick form) ---
        // Screenshots attached to a Binary day entry: [{ id, dataUrl }]
        let bdScreenshots = [];

        function openBinaryDayModal(dateKey) {
            calendarModalDateKey = dateKey;
            const entry = calendarEntries[dateKey];
            const dateObj = new Date(dateKey + 'T00:00:00');

            document.getElementById('calendar-day-modal-title').innerText = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
            document.getElementById('calendar-pnl-input').value = entry ? entry.pnl : '';
            document.getElementById('calendar-trades-input').value = entry ? entry.trades : '';
            document.getElementById('calendar-wins-input').value = entry ? entry.wins : '';
            document.getElementById('calendar-loss-input').value = entry ? (entry.losses ?? '') : '';
            document.getElementById('calendar-refund-input').value = entry ? (entry.refunds ?? '') : '';
            const forexFieldsEl = document.getElementById('calendar-forex-extra-fields');
            if (forexFieldsEl) forexFieldsEl.classList.add('hidden');
            document.getElementById('calendar-note-input').value = entry ? (entry.note || '') : '';
            document.getElementById('calendar-mistakes-input').value = entry ? (entry.mistakes || '') : '';
            document.getElementById('calendar-day-form-error').classList.add('hidden');
            document.getElementById('calendar-day-delete-btn').classList.toggle('hidden', !entry);

            const rulesBtn = document.getElementById('bd-toggle-rules');
            rulesBtn.dataset.on = entry && entry.rulesFollowed === false ? 'false' : 'true';
            const emoBtn = document.getElementById('bd-toggle-emotional');
            emoBtn.dataset.on = entry && entry.emotionalTrade ? 'true' : 'false';

            bdScreenshots = entry && entry.screenshots ? entry.screenshots.slice() : [];
            renderBinaryScreenshots();

            const modal = document.getElementById('calendar-day-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
            activeScreenshotPasteTarget = 'binary';
        }

        function closeDayModal() {
            const modal = document.getElementById('calendar-day-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            calendarModalDateKey = null;
            bdScreenshots = [];
            if (activeScreenshotPasteTarget === 'binary') activeScreenshotPasteTarget = null;
        }

        // ---- Binary day screenshots ----
        function handleBinaryScreenshotSelect(event) {
            const files = Array.from(event.target.files || []);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    bdScreenshots.push({ id: 'shot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), dataUrl: reader.result });
                    renderBinaryScreenshots();
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }
        function removeBinaryScreenshot(index) {
            bdScreenshots.splice(index, 1);
            renderBinaryScreenshots();
        }
        function renderBinaryScreenshots() {
            const list = document.getElementById('bd-screenshots-list');
            if (!list) return;
            list.innerHTML = bdScreenshots.map((s, i) => `
                <div class="tf-screenshot-thumb">
                    <img src="${escapeHtml(safeImgSrc(s.dataUrl))}" alt="screenshot">
                    <div class="tf-shot-actions">
                        <button type="button" onclick="removeBinaryScreenshot(${i})" title="Remove"><i data-lucide="trash-2" class="w-3.5 h-3.5 text-white"></i></button>
                    </div>
                </div>
            `).join('');
            renderIcons();
        }

        function saveDayEntry() {
            if (blockIfReadOnly()) return;
            const errorEl = document.getElementById('calendar-day-form-error');
            const pnlRaw = document.getElementById('calendar-pnl-input').value;
            const tradesRaw = document.getElementById('calendar-trades-input').value;
            const winsRaw = document.getElementById('calendar-wins-input').value;
            const lossRaw = document.getElementById('calendar-loss-input').value;
            const refundRaw = document.getElementById('calendar-refund-input').value;
            const tpRaw = document.getElementById('calendar-tp-input').value;
            const slRaw = document.getElementById('calendar-sl-input').value;
            const beRaw = document.getElementById('calendar-be-input').value;
            const note = document.getElementById('calendar-note-input').value.trim();
            const mistakes = document.getElementById('calendar-mistakes-input').value.trim();

            const pnl = pnlRaw === '' ? 0 : parseFloat(pnlRaw);
            const trades = tradesRaw === '' ? 0 : parseInt(tradesRaw, 10);
            const wins = winsRaw === '' ? 0 : parseInt(winsRaw, 10);
            const losses = calendarType === 'binary' ? (lossRaw === '' ? 0 : parseInt(lossRaw, 10)) : 0;
            const refunds = calendarType === 'binary' ? (refundRaw === '' ? 0 : parseInt(refundRaw, 10)) : 0;
            const tp = calendarType === 'forex' ? (tpRaw === '' ? 0 : parseInt(tpRaw, 10)) : 0;
            const sl = calendarType === 'forex' ? (slRaw === '' ? 0 : parseInt(slRaw, 10)) : 0;
            const be = calendarType === 'forex' ? (beRaw === '' ? 0 : parseInt(beRaw, 10)) : 0;

            if (Number.isNaN(pnl) || Number.isNaN(trades) || Number.isNaN(wins) || Number.isNaN(losses) || Number.isNaN(refunds) || Number.isNaN(tp) || Number.isNaN(sl) || Number.isNaN(be)) {
                errorEl.innerText = 'Please enter valid numbers.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (trades < 0 || wins < 0 || losses < 0 || refunds < 0 || tp < 0 || sl < 0 || be < 0) {
                errorEl.innerText = 'Trades and wins can\'t be negative.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (wins > trades) {
                errorEl.innerText = 'Winning trades can\'t exceed total trades.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (calendarType === 'binary' && (wins + losses + refunds) > trades) {
                errorEl.innerText = 'Win + Loss + Refund can\'t exceed total trades.';
                errorEl.classList.remove('hidden');
                return;
            }
            errorEl.classList.add('hidden');

            const entryData = calendarType === 'binary'
                ? {
                    pnl, trades, wins, losses, refunds, note, mistakes,
                    screenshots: bdScreenshots,
                    rulesFollowed: document.getElementById('bd-toggle-rules').dataset.on === 'true',
                    emotionalTrade: document.getElementById('bd-toggle-emotional').dataset.on === 'true'
                }
                : { pnl, trades, wins, tp, sl, be, note };

            const updated = { ...calendarEntries, [calendarModalDateKey]: entryData };
            const result = setCalendarEntries(updated);
            renderCalendar();
            closeDayModal();
            syncLinkedAccountStatsViews();

            if (!result.ok && !result.blocked) {
                showAppToast('Day saved for this session, but browser storage is full — it won\'t survive a reload.', 'error');
            }
        }

        function deleteDayEntry() {
            if (blockIfReadOnly()) return;
            if (!calendarModalDateKey) return;
            const updated = { ...calendarEntries };
            delete updated[calendarModalDateKey];
            setCalendarEntries(updated);
            renderCalendar();
            closeDayModal();
            syncLinkedAccountStatsViews();
        }

        // A trade logged/edited/deleted from the Calendar shares the same storage as the linked
        // account's own Stats page (see baDaysKey). This just re-renders whichever account views
        // are currently visible so the numbers update immediately, everywhere, without a reload.
        function syncLinkedAccountStatsViews() {
            if (calendarType !== 'binary' || !calendarLinkedAccountId) return;
            if (typeof renderAccounts === 'function') renderAccounts();
            if (baState.accountId === calendarLinkedAccountId && typeof renderBinaryAccountPage === 'function') {
                renderBinaryAccountPage();
            }
        }

        // ==================== FOREX: PER-TRADE LOGGING SYSTEM ====================
        const TF_PAIR_LIST = [
            'XAUUSD','XAGUSD','EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD',
            'EURJPY','EURGBP','EURAUD','EURCHF','EURCAD','GBPJPY','GBPAUD','GBPCHF','GBPCAD',
            'AUDJPY','AUDCAD','AUDNZD','NZDJPY','CADJPY','CHFJPY',
            'NAS100','US30','SPX500','GER40','UK100',
            'BTCUSD','ETHUSD'
        ];

        // Session windows in UTC hours [open, close) — overnight wrap handled below. Mirrors the Sessions tab.
        const TF_SESSION_WINDOWS = [
            { name: 'Sydney',   open: 22, close: 7 },
            { name: 'Tokyo',    open: 0,  close: 9 },
            { name: 'London',   open: 7,  close: 16 },
            { name: 'New York', open: 12, close: 21 }
        ];
        // Default account timezone: Asia/Karachi (UTC+5, no DST). Wire this to a real settings/timezone
        // picker later — for now every trade's session is auto-detected against this offset.
        const TF_TIMEZONE_OFFSET_HOURS = 5;

        let forexDayModalDateKey = null;
        let tfState = {
            dateKey: null,
            editId: null,
            outcome: null,
            screenshots: [],   // [{ id, dataUrl }]
            tags: [],
            editingScreenshotIndex: null
        };
        let markupState = { tool: 'pen', drawing: false, startX: 0, startY: 0, snapshot: null, history: [] };

        // ---- data helpers ----
        function computeDayAggregatesFromTrades(tradeLogs) {
            let pnl = 0, wins = 0, tp = 0, sl = 0, be = 0;
            (tradeLogs || []).forEach(t => {
                pnl += Number(t.pnl) || 0;
                if (t.outcome === 'tp') { wins++; tp++; }
                else if (t.outcome === 'sl') sl++;
                else if (t.outcome === 'be') be++;
            });
            const notes = (tradeLogs || [])
                .map(t => (t.notes || t.mistakes) ? `${t.pair || 'Trade'}: ${[t.notes, t.mistakes].filter(Boolean).join(' — ')}` : '')
                .filter(Boolean);
            return { pnl, trades: (tradeLogs || []).length, wins, tp, sl, be, note: notes.join('\n') };
        }

        function getDayTradeLogs(dateKey) {
            const entry = calendarEntries[dateKey];
            return entry && entry.tradeLogs ? entry.tradeLogs : [];
        }

        function persistDayTrades(dateKey, tradeLogs) {
            const agg = computeDayAggregatesFromTrades(tradeLogs);
            const updated = { ...calendarEntries };
            if (tradeLogs.length === 0) {
                delete updated[dateKey];
            } else {
                updated[dateKey] = { ...agg, tradeLogs };
            }
            const result = setCalendarEntries(updated);
            renderCalendar();
            if (!result.ok && !result.blocked) {
                showAppToast('Trade saved for this session, but browser storage is full — it won\'t survive a reload.', 'error');
            }
        }

        // ---- Day trades popup ----
        function openForexDayModal(dateKey) {
            forexDayModalDateKey = dateKey;
            const dateObj = new Date(dateKey + 'T00:00:00');
            document.getElementById('forex-day-modal-title').innerText = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
            renderForexDayModalBody(dateKey);
            const modal = document.getElementById('forex-day-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderIcons();
        }

        function closeForexDayModal() {
            const modal = document.getElementById('forex-day-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function renderForexDayModalBody(dateKey) {
            const tradeLogs = getDayTradeLogs(dateKey);
            const agg = computeDayAggregatesFromTrades(tradeLogs);
            document.getElementById('forex-day-modal-sub').innerText = `${agg.trades} trade${agg.trades === 1 ? '' : 's'} logged`;

            const pnlColor = agg.pnl > 0 ? 'text-aura-green' : (agg.pnl < 0 ? 'text-aura-red' : 'text-gray-300');
            const wr = agg.trades > 0 ? Math.round((agg.wins / agg.trades) * 100) : 0;
            document.getElementById('forex-day-summary').innerHTML = `
                <div><div class="text-[10px] text-gray-500">Net PNL</div><div class="text-sm font-mono font-bold ${pnlColor}">${formatMoney(agg.pnl)}</div></div>
                <div><div class="text-[10px] text-gray-500">Trades</div><div class="text-sm font-mono font-bold text-white">${agg.trades}</div></div>
                <div><div class="text-[10px] text-gray-500">Win Rate</div><div class="text-sm font-mono font-bold text-white">${wr}%</div></div>
            `;

            const listEl = document.getElementById('forex-day-trades-list');
            if (tradeLogs.length === 0) {
                listEl.innerHTML = `<div class="text-xs text-gray-500 text-center py-8">No trades logged yet for this day.</div>`;
                renderIcons();
                return;
            }
            const outcomeColor = { tp: 'text-aura-green border-aura-green/30 bg-aura-green/10', sl: 'text-aura-red border-aura-red/30 bg-aura-red/10', be: 'text-aura-amber border-aura-amber/30 bg-aura-amber/10' };
            listEl.innerHTML = tradeLogs.map(t => `
                <div class="forex-day-trade-row glass-card rounded-lg border border-aura-border px-3 py-2.5 flex items-center justify-between hover:border-blue-500/40" onclick="openAddTradeModal('${dateKey}','${t.id}')">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${outcomeColor[t.outcome] || 'text-gray-400 border-aura-border'}">${(t.outcome || '-').toUpperCase()}</span>
                        <div class="min-w-0">
                            <div class="text-xs font-semibold text-white truncate">${t.pair || 'Unknown pair'}</div>
                            <div class="text-[10px] text-gray-500 font-mono">${t.timeLabel || ''}${t.session ? ' • ' + t.session : ''}</div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs font-mono font-bold ${Number(t.pnl) > 0 ? 'text-aura-green' : (Number(t.pnl) < 0 ? 'text-aura-red' : 'text-gray-300')}">${formatMoney(Number(t.pnl) || 0)}</div>
                        ${t.rr && t.rr.enabled ? `<div class="text-[10px] font-mono ${t.rr.achieved >= 0 ? 'text-aura-green' : 'text-aura-red'}">${t.rr.achieved >= 0 ? '+' : ''}${t.rr.achieved.toFixed(2)}R</div>` : ''}
                    </div>
                </div>
            `).join('');
            renderIcons();
        }

        // ---- Time picker ----
        function tfPopulateTimeSelectors() {
            const hourEl = document.getElementById('tf-hour');
            const minEl = document.getElementById('tf-min');
            if (hourEl.options.length === 0) {
                for (let h = 1; h <= 12; h++) hourEl.innerHTML += `<option value="${h}">${String(h).padStart(2, '0')}</option>`;
            }
            if (minEl.options.length === 0) {
                for (let m = 0; m < 60; m++) minEl.innerHTML += `<option value="${m}">${String(m).padStart(2, '0')}</option>`;
            }
        }

        function tfWheelSelect(event, id) {
            event.preventDefault();
            const el = document.getElementById(id);
            const dir = event.deltaY > 0 ? 1 : -1;
            let idx = el.selectedIndex + dir;
            if (idx < 0) idx = el.options.length - 1;
            if (idx >= el.options.length) idx = 0;
            el.selectedIndex = idx;
            onTradeTimeChange();
        }

        function tfGetSelectedTime24() {
            const hour12 = parseInt(document.getElementById('tf-hour').value, 10);
            const min = parseInt(document.getElementById('tf-min').value, 10);
            const ampm = document.getElementById('tf-ampm').value;
            let hour24 = hour12 % 12;
            if (ampm === 'PM') hour24 += 12;
            return { hour24, min };
        }

        function computeSessionLabel(hour24Local, tzOffset) {
            // Convert account-local hour to UTC hour (fractional), then check against session windows.
            let utcHour = hour24Local - tzOffset;
            utcHour = ((utcHour % 24) + 24) % 24;
            const openSessions = TF_SESSION_WINDOWS.filter(s => {
                return s.open < s.close ? (utcHour >= s.open && utcHour < s.close) : (utcHour >= s.open || utcHour < s.close);
            });
            return openSessions.length ? openSessions.map(s => s.name).join(' / ') : 'No major session open';
        }

        function onTradeTimeChange() {
            const { hour24, min } = tfGetSelectedTime24();
            const label = computeSessionLabel(hour24 + min / 60, TF_TIMEZONE_OFFSET_HOURS);
            document.getElementById('tf-session-label').innerText = label;
        }

        // ---- Pair dropdown ----
        function renderPairMenu(query) {
            const menu = document.getElementById('tf-pair-menu');
            const q = (query || '').trim().toUpperCase();
            const matches = TF_PAIR_LIST.filter(p => p.includes(q)).slice(0, 30);
            if (matches.length === 0) {
                menu.innerHTML = `<div class="px-3 py-2 text-[11px] text-gray-500">No matching pair — you can still type a custom one and it'll be used as-is.</div>`;
            } else {
                menu.innerHTML = matches.map(p => `<button type="button" onclick="selectPair('${p}')" class="w-full text-left px-3 py-1.5 text-xs font-mono text-gray-300 hover:bg-aura-hover hover:text-white transition">${p}</button>`).join('');
            }
            menu.classList.remove('hidden');
        }
        function selectPair(pair) {
            document.getElementById('tf-pair-search').value = pair;
            document.getElementById('tf-pair-menu').classList.add('hidden');
        }
        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('tf-pair-search');
            const menu = document.getElementById('tf-pair-menu');
            if (wrap && menu && !wrap.contains(e.target) && !menu.contains(e.target)) menu.classList.add('hidden');
        });

        // ---- Outcome ----
        function setTradeOutcome(outcome) {
            tfState.outcome = outcome;
            ['tp', 'sl', 'be'].forEach(o => {
                const btn = document.getElementById('tf-outcome-' + o);
                btn.classList.toggle('active-tp', o === 'tp' && o === outcome);
                btn.classList.toggle('active-sl', o === 'sl' && o === outcome);
                btn.classList.toggle('active-be', o === 'be' && o === outcome);
            });
            updateRRPreview();
        }

        // ---- R:R Tracker ----
        function toggleRRPanel() {
            const enabled = document.getElementById('tf-rr-enabled').checked;
            document.getElementById('tf-rr-panel').classList.toggle('hidden', !enabled);
            updateRRPreview();
        }
        function toggleRFFields() {
            const enabled = document.getElementById('tf-rf-enabled').checked;
            document.getElementById('tf-rf-fields').classList.toggle('hidden', !enabled);
            updateRRPreview();
        }
        function pickRRTarget(v) {
            document.getElementById('tf-rr-target').value = v;
            document.querySelectorAll('.tf-rr-preset').forEach(b => b.classList.toggle('active', parseFloat(b.innerText.split(':')[1]) === v));
            updateRRPreview();
        }
        function onRRTargetInput(val) {
            document.querySelectorAll('.tf-rr-preset').forEach(b => b.classList.toggle('active', b.innerText === `1:${val}`));
        }
        function setRFField(id, val) {
            document.getElementById(id).value = val;
            updateRRPreview();
        }

        // achievedRR = weighted average R across the RF-closed lot fraction and the remaining lots.
        // Example: 3 lots, target 1:3, RF at 50% of target with 50% lots closed, final outcome TP ->
        // (0.5 * 0.5*3) + (0.5 * 3) = 0.75 + 1.5 = 2.25R — matches the reference screenshot.
        function computeAchievedRR(targetRR, rfEnabled, rfTargetPct, rfLotsPct, outcome) {
            if (!targetRR || targetRR <= 0) return 0;
            const remainingR = outcome === 'tp' ? targetRR : (outcome === 'sl' ? -1 : 0);
            if (!rfEnabled || !rfLotsPct) return remainingR;
            const closedFraction = Math.min(Math.max(rfLotsPct / 100, 0), 1);
            const closedR = (rfTargetPct / 100) * targetRR;
            return (closedFraction * closedR) + ((1 - closedFraction) * remainingR);
        }

        function updateRRPreview() {
            const previewEl = document.getElementById('tf-rr-preview');
            const enabled = document.getElementById('tf-rr-enabled').checked;
            if (!enabled) { previewEl.classList.add('hidden'); return; }
            const targetRR = parseFloat(document.getElementById('tf-rr-target').value) || 0;
            const rfEnabled = document.getElementById('tf-rf-enabled').checked;
            const rfTargetPct = parseFloat(document.getElementById('tf-rf-target-pct').value) || 0;
            const rfLotsPct = parseFloat(document.getElementById('tf-rf-lots-pct').value) || 0;
            const achieved = computeAchievedRR(targetRR, rfEnabled, rfTargetPct, rfLotsPct, tfState.outcome);
            previewEl.classList.remove('hidden');
            previewEl.innerText = (achieved >= 0 ? '+' : '') + achieved.toFixed(2) + 'R';
            previewEl.className = 'font-mono font-bold text-sm ' + (achieved > 0 ? 'text-aura-green' : (achieved < 0 ? 'text-aura-red' : 'text-aura-amber'));
        }

        // ---- Screenshots ----
        function handleTradeScreenshotSelect(event) {
            const files = Array.from(event.target.files || []);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    compressImage(e.target.result, 1280, 0.72).then(compressed => {
                        tfState.screenshots.push({ id: 'shot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), dataUrl: compressed });
                        renderTradeScreenshots();
                    });
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }
        function renderTradeScreenshots() {
            const list = document.getElementById('tf-screenshots-list');
            list.innerHTML = tfState.screenshots.map((s, i) => `
                <div class="tf-screenshot-thumb">
                    <img src="${escapeHtml(safeImgSrc(s.dataUrl))}" alt="Screenshot">
                    <div class="tf-shot-actions">
                        <button type="button" onclick="openMarkupModal(${i})" class="w-6 h-6 rounded bg-aura-bg/90 border border-aura-border flex items-center justify-center text-gray-300 hover:text-white"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                        <button type="button" onclick="removeTradeScreenshot(${i})" class="w-6 h-6 rounded bg-aura-bg/90 border border-aura-border flex items-center justify-center text-gray-300 hover:text-aura-red"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                    </div>
                </div>
            `).join('');
            renderIcons();
        }
        function removeTradeScreenshot(index) {
            tfState.screenshots.splice(index, 1);
            renderTradeScreenshots();
        }

        // ---- Screenshot markup (canvas) ----
        function openMarkupModal(index) {
            tfState.editingScreenshotIndex = index;
            const img = new Image();
            img.onload = () => {
                const canvas = document.getElementById('markup-canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                markupState.history = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
                setMarkupTool('pen');
                const modal = document.getElementById('markup-modal');
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                renderIcons();
            };
            img.src = tfState.screenshots[index].dataUrl;
        }
        function closeMarkupModal() {
            const modal = document.getElementById('markup-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        function setMarkupTool(tool) {
            markupState.tool = tool;
            document.querySelectorAll('.markup-tool-btn').forEach(b => b.classList.remove('active'));
            const btn = document.getElementById('markup-tool-' + tool);
            if (btn) btn.classList.add('active');
        }
        function markupPointerPos(canvas, e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const point = e.touches ? e.touches[0] : e;
            return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
        }
        function markupStart(e) {
            e.preventDefault();
            const canvas = document.getElementById('markup-canvas');
            const ctx = canvas.getContext('2d');
            const pos = markupPointerPos(canvas, e);
            markupState.drawing = true;
            markupState.startX = pos.x;
            markupState.startY = pos.y;
            markupState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (markupState.tool === 'pen') {
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            }
        }
        function markupMove(e) {
            if (!markupState.drawing) return;
            e.preventDefault();
            const canvas = document.getElementById('markup-canvas');
            const ctx = canvas.getContext('2d');
            const pos = markupPointerPos(canvas, e);
            const color = document.getElementById('markup-color').value;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = Math.max(2, canvas.width / 300);
            ctx.lineCap = 'round';
            if (markupState.tool === 'pen') {
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            } else {
                ctx.putImageData(markupState.snapshot, 0, 0);
                if (markupState.tool === 'rect') {
                    ctx.strokeRect(markupState.startX, markupState.startY, pos.x - markupState.startX, pos.y - markupState.startY);
                } else if (markupState.tool === 'arrow') {
                    drawArrow(ctx, markupState.startX, markupState.startY, pos.x, pos.y);
                }
            }
        }
        function markupEnd() {
            if (!markupState.drawing) return;
            markupState.drawing = false;
            const canvas = document.getElementById('markup-canvas');
            const ctx = canvas.getContext('2d');
            markupState.history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
        function drawArrow(ctx, x1, y1, x2, y2) {
            const headLen = Math.max(10, ctx.lineWidth * 4);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
        }
        function markupUndo() {
            if (markupState.history.length <= 1) return;
            markupState.history.pop();
            const canvas = document.getElementById('markup-canvas');
            const ctx = canvas.getContext('2d');
            ctx.putImageData(markupState.history[markupState.history.length - 1], 0, 0);
        }
        function markupClear() {
            if (markupState.history.length === 0) return;
            const canvas = document.getElementById('markup-canvas');
            const ctx = canvas.getContext('2d');
            ctx.putImageData(markupState.history[0], 0, 0);
            markupState.history = [markupState.history[0]];
        }
        function saveMarkup() {
            const canvas = document.getElementById('markup-canvas');
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            if (tfState.editingScreenshotIndex !== null) {
                tfState.screenshots[tfState.editingScreenshotIndex].dataUrl = dataUrl;
                renderTradeScreenshots();
            }
            closeMarkupModal();
        }
        (function initMarkupCanvasEvents() {
            document.addEventListener('DOMContentLoaded', () => {
                const canvas = document.getElementById('markup-canvas');
                if (!canvas) return;
                canvas.addEventListener('mousedown', markupStart);
                canvas.addEventListener('mousemove', markupMove);
                window.addEventListener('mouseup', markupEnd);
                canvas.addEventListener('touchstart', markupStart, { passive: false });
                canvas.addEventListener('touchmove', markupMove, { passive: false });
                canvas.addEventListener('touchend', markupEnd);
            });
        })();

        // ---- Tags ----
        function renderTradeTags() {
            document.getElementById('tf-tags-list').innerHTML = tfState.tags.map((t, i) => `
                <span class="tf-tag-chip">#${t} <button type="button" onclick="removeTradeTag(${i})">&times;</button></span>
            `).join('');
        }
        function onTagInputKeydown(e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const input = e.target;
            const val = input.value.trim().replace(/^#/, '');
            if (val && !tfState.tags.includes(val)) {
                tfState.tags.push(val);
                renderTradeTags();
            }
            input.value = '';
        }
        function removeTradeTag(i) {
            tfState.tags.splice(i, 1);
            renderTradeTags();
        }

        // ---- Toggles ----
        function tfToggleFlip(id) {
            const btn = document.getElementById(id);
            const on = btn.dataset.on === 'true';
            btn.dataset.on = (!on).toString();
        }

        // ---- Setup quality (My Setup + A+/A/B+/B) ----
        let tfGrade = null;
        function tfSetGrade(g) {
            tfGrade = (tfGrade === g) ? null : g;
            document.querySelectorAll('#tf-setup-grades .tf-grade-btn').forEach(b => {
                const on = b.dataset.g === tfGrade;
                const good = b.dataset.g.charAt(0) === 'A';
                b.className = 'tf-grade-btn px-2 py-2 rounded-md border text-xs font-mono font-bold transition ' + (on
                    ? (good ? 'border-aura-green/50 bg-aura-green/10 text-aura-green' : 'border-aura-amber/50 bg-aura-amber/10 text-aura-amber')
                    : 'border-aura-border bg-aura-bg text-gray-400');
            });
        }
        function tfSetupToggle() {
            const on = document.getElementById('tf-my-setup').checked;
            document.getElementById('tf-setup-wrap').classList.toggle('hidden', !on);
            if (!on) tfSetGrade(null), (tfGrade = null);
        }

        // ---- Add / Edit Trade modal ----
        function openAddTradeModal(dateKey, tradeId) {
            if (blockIfReadOnly()) return;
            tfPopulateTimeSelectors();
            tfState = { dateKey, editId: tradeId || null, outcome: null, screenshots: [], tags: [], editingScreenshotIndex: null };

            const existing = tradeId ? getDayTradeLogs(dateKey).find(t => t.id === tradeId) : null;

            document.getElementById('tf-modal-title').innerHTML = `<i data-lucide="${existing ? 'pencil' : 'plus'}" class="w-4 h-4 text-blue-400"></i> ${existing ? 'Edit Trade' : 'Add Trade'}`;
            document.getElementById('tf-form-error').classList.add('hidden');
            document.getElementById('tf-delete-btn').classList.toggle('hidden', !existing);
            document.getElementById('tf-pnl').value = existing ? existing.pnl : '';
            document.getElementById('tf-pair-search').value = existing ? existing.pair : '';
            document.getElementById('tf-notes').value = existing ? (existing.notes || '') : '';
            document.getElementById('tf-mistakes').value = existing ? (existing.mistakes || '') : '';
            document.getElementById('tf-reason').value = existing ? (existing.reason || '') : '';
            document.getElementById('tf-entry').value = existing && existing.entry != null ? existing.entry : '';
            document.getElementById('tf-sl').value = existing && existing.sl != null ? existing.sl : '';
            document.getElementById('tf-tp').value = existing && existing.tp != null ? existing.tp : '';
            document.getElementById('tf-tag-input').value = '';

            // Time
            const now = new Date();
            let hour24 = existing ? existing.hour24 : now.getHours();
            let min = existing ? existing.min : now.getMinutes();
            if (hour24 === undefined || hour24 === null) hour24 = now.getHours();
            if (min === undefined || min === null) min = now.getMinutes();
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            const hour12 = ((hour24 % 12) || 12);
            document.getElementById('tf-hour').value = hour12;
            document.getElementById('tf-min').value = min;
            document.getElementById('tf-ampm').value = ampm;
            onTradeTimeChange();

            // Outcome
            setTradeOutcome(existing ? existing.outcome : null);

            // R:R
            const rr = existing && existing.rr ? existing.rr : null;
            document.getElementById('tf-rr-enabled').checked = !!(rr && rr.enabled);
            document.getElementById('tf-rr-target').value = rr ? (rr.targetRR || '') : '';
            document.getElementById('tf-lot-size').value = rr ? (rr.lotSize || '') : '';
            document.getElementById('tf-rf-enabled').checked = !!(rr && rr.rfEnabled);
            document.getElementById('tf-rf-target-pct').value = rr ? (rr.rfTargetPct || '') : '';
            document.getElementById('tf-rf-lots-pct').value = rr ? (rr.rfLotsPct || '') : '';
            document.getElementById('tf-be-moved').checked = !!(rr && rr.beMoved);
            document.querySelectorAll('.tf-rr-preset').forEach(b => b.classList.remove('active'));
            toggleRRPanel();
            toggleRFFields();

            // Setup
            document.getElementById('tf-my-setup').checked = !!(existing && existing.isMySetup);
            tfGrade = null;
            document.getElementById('tf-setup-wrap').classList.toggle('hidden', !(existing && existing.isMySetup));
            if (existing && existing.isMySetup && existing.setupGrade) { tfSetGrade(existing.setupGrade); } else { tfSetGrade(null); tfGrade = null; }

            // Toggles
            document.getElementById('tf-toggle-rules').dataset.on = existing ? String(existing.rulesFollowed !== false) : 'true';
            document.getElementById('tf-toggle-emotional').dataset.on = existing ? String(!!existing.emotionalTrade) : 'false';

            // Screenshots + tags
            tfState.screenshots = existing && existing.screenshots ? existing.screenshots.map(s => ({ ...s })) : [];
            tfState.tags = existing && existing.tags ? [...existing.tags] : [];
            renderTradeScreenshots();
            renderTradeTags();

            updateRRPreview();

            // Swap from the day popup to the trade form
            closeForexDayModal();
            const modal = document.getElementById('log-trade-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            requestAnimationFrame(() => modal.classList.add('log-trade-open'));
            renderIcons();
            activeScreenshotPasteTarget = 'forex';
        }

        function closeAddTradeModal() {
            const modal = document.getElementById('log-trade-modal');
            if (!modal) return;
            modal.classList.remove('log-trade-open');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 250);
            if (activeScreenshotPasteTarget === 'forex') activeScreenshotPasteTarget = null;
        }

        // Kept for the "Log Trades" header button — jumps straight into Add Trade for today.
        function openLogTradeModal() {
            openAddTradeModal(toDateKey(new Date()));
        }
        function closeLogTradeModal() { closeAddTradeModal(); }

        function saveTradeForm() {
            if (blockIfReadOnly()) return;
            const errorEl = document.getElementById('tf-form-error');
            const pnlRaw = document.getElementById('tf-pnl').value;
            const pair = document.getElementById('tf-pair-search').value.trim().toUpperCase();

            if (pnlRaw === '' || Number.isNaN(parseFloat(pnlRaw))) {
                errorEl.innerText = 'Enter the PNL / change in balance for this trade.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (!pair) {
                errorEl.innerText = 'Select or type a pair.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (!tfState.outcome) {
                errorEl.innerText = 'Select an outcome — TP, SL or BE.';
                errorEl.classList.remove('hidden');
                return;
            }
            errorEl.classList.add('hidden');

            const { hour24, min } = tfGetSelectedTime24();
            const ampm = document.getElementById('tf-ampm').value;
            const hour12 = document.getElementById('tf-hour').value;
            const timeLabel = `${String(hour12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`;
            const session = computeSessionLabel(hour24 + min / 60, TF_TIMEZONE_OFFSET_HOURS);

            const rrEnabled = document.getElementById('tf-rr-enabled').checked;
            let rr = null;
            if (rrEnabled) {
                const targetRR = parseFloat(document.getElementById('tf-rr-target').value) || 0;
                const rfEnabled = document.getElementById('tf-rf-enabled').checked;
                const rfTargetPct = parseFloat(document.getElementById('tf-rf-target-pct').value) || 0;
                const rfLotsPct = parseFloat(document.getElementById('tf-rf-lots-pct').value) || 0;
                const lotSize = parseFloat(document.getElementById('tf-lot-size').value) || 0;
                const achieved = computeAchievedRR(targetRR, rfEnabled, rfTargetPct, rfLotsPct, tfState.outcome);
                rr = {
                    enabled: true,
                    targetRR, lotSize,
                    rfEnabled, rfTargetPct, rfLotsPct,
                    beMoved: document.getElementById('tf-be-moved').checked,
                    achieved
                };
            }

            if (document.getElementById('tf-my-setup').checked && !tfGrade) {
                const errEl = document.getElementById('tf-form-error');
                errEl.textContent = 'Pick the setup quality (A+, A, B+ or B).'; errEl.classList.remove('hidden'); return;
            }
            const levelOrNull = id => { const v = document.getElementById(id).value; return v === '' || Number.isNaN(parseFloat(v)) ? null : parseFloat(v); };
            const trade = {
                id: tfState.editId || ('trade-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
                pnl: parseFloat(pnlRaw),
                hour24, min, timeLabel, session,
                pair,
                screenshots: tfState.screenshots,
                outcome: tfState.outcome,
                rr,
                notes: document.getElementById('tf-notes').value.trim(),
                mistakes: document.getElementById('tf-mistakes').value.trim(),
                reason: document.getElementById('tf-reason').value.trim(),
                entry: levelOrNull('tf-entry'), sl: levelOrNull('tf-sl'), tp: levelOrNull('tf-tp'),
                rulesFollowed: document.getElementById('tf-toggle-rules').dataset.on === 'true',
                emotionalTrade: document.getElementById('tf-toggle-emotional').dataset.on === 'true',
                isMySetup: document.getElementById('tf-my-setup').checked,
                setupGrade: document.getElementById('tf-my-setup').checked ? tfGrade : null,
                tags: tfState.tags,
                createdAt: tfState.editId ? undefined : Date.now()
            };

            const tradeLogs = getDayTradeLogs(tfState.dateKey).slice();
            const existingIndex = tfState.editId ? tradeLogs.findIndex(t => t.id === tfState.editId) : -1;
            if (existingIndex >= 0) {
                trade.createdAt = tradeLogs[existingIndex].createdAt;
                tradeLogs[existingIndex] = trade;
            } else {
                tradeLogs.push(trade);
            }
            persistDayTrades(tfState.dateKey, tradeLogs);
            closeAddTradeModal();
            openForexDayModal(tfState.dateKey);
        }

        function deleteTradeFromForm() {
            if (blockIfReadOnly()) return;
            if (!tfState.editId) return;
            const tradeLogs = getDayTradeLogs(tfState.dateKey).filter(t => t.id !== tfState.editId);
            persistDayTrades(tfState.dateKey, tradeLogs);
            closeAddTradeModal();
            if (tradeLogs.length > 0) openForexDayModal(tfState.dateKey);
        }

        // KEYBOARD SHORTCUT (CMD/CTRL + K)
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommandPalette();
            }
        });

        // LIVE CLOCK SIMULATION
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0] + ' EST';
            const clockEl = document.getElementById('live-clock');
            if (clockEl) clockEl.innerText = timeStr;
        }, 1000);

        // ==================== OVERVIEW DASHBOARD (live data from every account's journal) ====================
        const ovState = { acc: 'all', days: 30, from: '', to: '' };
        let ovEqChart = null, ovDailyChart = null;
        function ovSetAcc(v) { ovState.acc = v; renderOverview(); }
        function ovSetRange(d) { ovState.days = d; ovState.from = ovState.to = ''; renderOverview(); }
        function ovOpen(accId) { jrState.accountIds = [accId]; jrState.selectedKey = null; switchTab('accounts-journal'); }
        function ovMoney(n) { return (n < 0 ? '-$' : '+$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        function ovTone(n) { return n > 0 ? 'text-aura-green' : (n < 0 ? 'text-aura-red' : 'text-gray-300'); }
        function ovCollect() {
            const accs = jrAllAccounts();
            const sel = ovState.acc === 'all' ? accs : accs.filter(a => a.id === ovState.acc);
            let cut = '', end = '';
            if (rgActive(ovState)) { cut = ovState.from; end = ovState.to; }
            else if (ovState.days) { const d = new Date(); d.setDate(d.getDate() - ovState.days + 1); cut = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
            const rows = [];
            sel.forEach(a => { const nm = jrAccMeta(a).name; jrBuildRows(a).forEach(r => { if ((!cut || r.dateKey >= cut) && (!end || r.dateKey <= end)) rows.push(Object.assign({}, r, { accId: a.id, accName: nm })); }); });
            rows.sort((a, b) => (b.ts - a.ts) || (b.created - a.created));
            return { accs, rows };
        }
        function ovKpi(label, value, sub, tone) {
            return `<div class="glass-card p-3.5 rounded-lg border border-aura-border"><div class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">${label}</div><div class="text-lg font-bold font-mono mt-1 ${tone || 'text-white'}">${value}</div><div class="text-[10px] text-gray-500 mt-0.5 truncate">${sub}</div></div>`;
        }
        function ovBar(pct, cls) { return `<div class="w-full bg-aura-border h-1.5 rounded-full overflow-hidden"><div class="${cls} h-full" style="width:${Math.max(2, Math.min(100, pct))}%"></div></div>`; }
        function renderOverview() {
            const root = document.getElementById('ov-body');
            if (!root) return;
            const { accs, rows } = ovCollect();
            // toolbar
            const sel = document.getElementById('ov-acc');
            if (ovState.acc !== 'all' && !accs.some(a => a.id === ovState.acc)) ovState.acc = 'all';
            sel.innerHTML = `<option value="all">All accounts (${accs.length})</option>` + accs.map(a => `<option value="${a.id}" ${a.id === ovState.acc ? 'selected' : ''}>${escapeHtml(jrAccMeta(a).name)}</option>`).join('');
            document.getElementById('ov-ranges').innerHTML = [[7, '7D'], [30, '30D'], [90, '90D'], [0, 'All']].map(([d, l]) =>
                `<button onclick="ovSetRange(${d})" class="px-2.5 py-1 text-xs rounded ${ovState.days === d && !rgActive(ovState) ? 'bg-aura-hover text-white border border-aura-border' : 'text-gray-400 hover:text-white'}">${l}</button>`).join('') + rgBtn('ov', 'px-2.5 py-1 text-xs rounded', 'bg-blue-600 text-white', 'text-gray-400 hover:text-white', 'Custom');
            document.getElementById('ov-sub').innerText = (rgActive(ovState) ? rgLabel(ovState.from, ovState.to) : (ovState.days ? 'Last ' + ovState.days + ' days' : 'All time')) + ' · ' + (ovState.acc === 'all' ? accs.length + ' account' + (accs.length === 1 ? '' : 's') : jrAccMeta(accs.find(a => a.id === ovState.acc)).name);
            const empty = document.getElementById('ov-empty');
            empty.classList.toggle('hidden', rows.length > 0); root.classList.toggle('hidden', rows.length === 0);
            document.getElementById('ov-kpis').classList.toggle('hidden', rows.length === 0);
            if (!rows.length) return;

            // ---- stats ----
            const daily = {}; let net = 0, gw = 0, gl = 0, wins = 0, losses = 0, be = 0, trades = 0, rulesOk = 0, emo = 0, mistakes = 0;
            const byAcc = {}, byPair = {};
            rows.forEach(r => {
                net += r.pnl; if (r.pnl > 0) gw += r.pnl; else if (r.pnl < 0) gl += -r.pnl;
                daily[r.dateKey] = (daily[r.dateKey] || 0) + r.pnl;
                let w, l, n;
                if (r.kind === 'trade') { n = 1; w = r.result === 'win' ? 1 : 0; l = r.result === 'loss' ? 1 : 0; }
                else { const d = r.day || {}; n = r.count || 0; w = d.wins || d.tp || 0; l = d.losses || d.sl || 0; }
                trades += n; wins += w; losses += l; be += Math.max(0, n - w - l);
                if (r.rules) rulesOk++; if (r.emotional) emo++; if (r.mistakes) mistakes++;
                const a = byAcc[r.accId] || (byAcc[r.accId] = { name: r.accName, id: r.accId, pnl: 0, n: 0, w: 0, l: 0 });
                a.pnl += r.pnl; a.n += n; a.w += w; a.l += l;
                if (r.kind === 'trade' && r.pair) { const p = byPair[r.pair] || (byPair[r.pair] = { pnl: 0, n: 0 }); p.pnl += r.pnl; p.n++; }
            });
            const dates = Object.keys(daily).sort();
            let cum = 0, peak = 0, maxDD = 0; const cumSeries = [];
            dates.forEach(d => { cum += daily[d]; peak = Math.max(peak, cum); maxDD = Math.max(maxDD, peak - cum); cumSeries.push(+cum.toFixed(2)); });
            const decided = wins + losses, wr = decided ? wins / decided * 100 : 0;
            const pf = gl > 0 ? (gw / gl) : (gw > 0 ? Infinity : 0);
            const avgW = wins ? gw / wins : 0, avgL = losses ? gl / losses : 0;
            const bestDay = dates.reduce((b, d) => daily[d] > (b ? daily[b] : -Infinity) ? d : b, null);
            const worstDay = dates.reduce((b, d) => daily[d] < (b ? daily[b] : Infinity) ? d : b, null);
            let streak = 0, sType = null;
            for (const r of rows) { if (r.result === 'be') break; if (sType === null) sType = r.result; if (r.result !== sType) break; streak++; }

            document.getElementById('ov-kpis').innerHTML =
                ovKpi('Net P&L', ovMoney(net), dates.length + ' active day' + (dates.length === 1 ? '' : 's'), ovTone(net)) +
                ovKpi('Win rate', decided ? wr.toFixed(1) + '%' : '—', wins + 'W · ' + losses + 'L' + (be ? ' · ' + be + ' BE' : '')) +
                ovKpi('Profit factor', pf === Infinity ? '∞' : (gl || gw ? pf.toFixed(2) : '—'), pf >= 2 ? 'Excellent' : pf >= 1.3 ? 'Healthy' : pf >= 1 ? 'Marginal' : 'Losing', pf >= 1.3 ? 'text-aura-green' : (pf < 1 ? 'text-aura-red' : 'text-white')) +
                ovKpi('Trades', trades, rows.length + ' journal entries') +
                ovKpi('Max drawdown', maxDD ? '-$' + maxDD.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '$0', 'Peak-to-trough P&L', maxDD ? 'text-aura-red' : 'text-white') +
                ovKpi('Current streak', streak ? streak + (sType === 'win' ? ' W' : ' L') : '—', 'Latest entries', sType === 'win' ? 'text-aura-green' : (sType === 'loss' ? 'text-aura-red' : 'text-white'));

            // ---- side stats ----
            const line = (k, v, t) => `<div class="flex justify-between items-center py-2 border-b border-aura-border last:border-0 text-xs"><span class="text-gray-400">${k}</span><span class="font-mono font-semibold ${t || 'text-white'}">${v}</span></div>`;
            const tot = Math.max(1, wins + losses + be);
            document.getElementById('ov-side').innerHTML = `<h3 class="text-sm font-bold text-white mb-3">Edge Snapshot</h3>
                <div class="flex h-2 rounded-full overflow-hidden bg-aura-border mb-1"><div class="bg-aura-green" style="width:${wins / tot * 100}%"></div><div class="bg-gray-500" style="width:${be / tot * 100}%"></div><div class="bg-aura-red" style="width:${losses / tot * 100}%"></div></div>
                <div class="flex justify-between text-[10px] text-gray-500 mb-2"><span>${wins} wins</span><span>${losses} losses</span></div>` +
                line('Avg win', wins ? ovMoney(avgW) : '—', 'text-aura-green') + line('Avg loss', losses ? ovMoney(-avgL) : '—', 'text-aura-red') +
                line('Payoff ratio', avgL ? (avgW / avgL).toFixed(2) : '—') + line('Avg per day', ovMoney(net / dates.length), ovTone(net)) +
                line('Best day', bestDay ? ovMoney(daily[bestDay]) + ' · ' + bestDay.slice(5) : '—', 'text-aura-green') +
                line('Worst day', worstDay ? ovMoney(daily[worstDay]) + ' · ' + worstDay.slice(5) : '—', 'text-aura-red');

            // ---- accounts + extras ----
            const aList = Object.values(byAcc).sort((a, b) => b.pnl - a.pnl); const aMax = Math.max(1, ...aList.map(a => Math.abs(a.pnl)));
            document.getElementById('ov-accounts').innerHTML = `<h3 class="text-sm font-bold text-white mb-3">By Account</h3><div class="space-y-3">` + aList.map(a =>
                `<button onclick="ovOpen('${a.id}')" class="w-full text-left group"><div class="flex justify-between text-xs mb-1"><span class="text-gray-300 truncate group-hover:text-white">${escapeHtml(a.name)}</span><span class="font-mono ${ovTone(a.pnl)}">${ovMoney(a.pnl)}</span></div>${ovBar(Math.abs(a.pnl) / aMax * 100, a.pnl >= 0 ? 'bg-aura-green' : 'bg-aura-red')}<div class="text-[10px] text-gray-500 mt-1">${a.n} trades · ${(a.w + a.l) ? Math.round(a.w / (a.w + a.l) * 100) + '% win rate' : 'no win/loss data'}</div></button>`).join('') + `</div>`;
            const pairs = Object.entries(byPair).sort((a, b) => b[1].pnl - a[1].pnl).slice(0, 5); const pMax = Math.max(1, ...pairs.map(p => Math.abs(p[1].pnl)));
            document.getElementById('ov-extra').innerHTML = `<h3 class="text-sm font-bold text-white mb-3">Top Pairs</h3>` + (pairs.length ? `<div class="space-y-2.5 mb-4">` + pairs.map(([p, v]) =>
                `<div><div class="flex justify-between text-xs mb-1"><span class="text-gray-300">${escapeHtml(p)} <span class="text-gray-600">×${v.n}</span></span><span class="font-mono ${ovTone(v.pnl)}">${ovMoney(v.pnl)}</span></div>${ovBar(Math.abs(v.pnl) / pMax * 100, v.pnl >= 0 ? 'bg-aura-green' : 'bg-aura-red')}</div>`).join('') + `</div>` : `<p class="text-xs text-gray-500 mb-4">Pair stats appear once you log individual trades.</p>`) +
                `<h3 class="text-sm font-bold text-white mb-1 pt-3 border-t border-aura-border">Discipline</h3>` +
                line('Rules followed', Math.round(rulesOk / rows.length * 100) + '%', rulesOk / rows.length >= 0.8 ? 'text-aura-green' : 'text-amber-400') + line('Emotional entries', emo, emo ? 'text-amber-400' : 'text-white') + line('Entries with mistakes', mistakes, mistakes ? 'text-aura-red' : 'text-white');

            // ---- recent table ----
            document.getElementById('ov-recent').innerHTML = rows.slice(0, 8).map(r =>
                `<tr class="hover:bg-aura-hover/50 cursor-pointer transition" onclick="ovOpen('${r.accId}')"><td class="p-3 text-gray-400">${r.dateKey}</td><td class="p-3 text-gray-300 truncate max-w-[140px]">${escapeHtml(r.accName)}</td><td class="p-3 text-white font-semibold">${escapeHtml(r.pair)}</td><td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] border ${r.result === 'win' ? 'bg-aura-green/10 text-aura-green border-aura-green/20' : r.result === 'loss' ? 'bg-aura-red/10 text-aura-red border-aura-red/20' : 'bg-aura-bg text-gray-400 border-aura-border'}">${escapeHtml(String(r.resultLabel).toUpperCase())}</span></td><td class="p-3 text-right font-bold ${ovTone(r.pnl)}">${ovMoney(r.pnl)}</td></tr>`).join('');

            // ---- charts ----
            const tEl = document.getElementById('ov-eq-total'); tEl.innerText = ovMoney(net); tEl.className = 'text-xs font-mono font-bold ' + ovTone(net);
            if (typeof Chart === 'undefined') return;
            if (ovEqChart) ovEqChart.destroy(); if (ovDailyChart) ovDailyChart.destroy();
            const col = net >= 0 ? '16,185,129' : '239,68,68';
            const ctx = document.getElementById('ov-eq').getContext('2d'); const g = ctx.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, `rgba(${col},0.28)`); g.addColorStop(1, `rgba(${col},0)`);
            const axis = { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 8 } };
            const tip = { backgroundColor: '#11131a', borderColor: '#1f2430', borderWidth: 1, callbacks: { label: c => ovMoney(c.parsed.y) } };
            ovEqChart = new Chart(ctx, { type: 'line', data: { labels: dates, datasets: [{ data: cumSeries, borderColor: `rgb(${col})`, backgroundColor: g, fill: true, borderWidth: 2, tension: 0.25, pointRadius: dates.length > 40 ? 0 : 3 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: Object.assign({ mode: 'index', intersect: false }, tip) }, scales: { x: axis, y: axis } } });
            const dd = dates.slice(-45);
            ovDailyChart = new Chart(document.getElementById('ov-daily'), { type: 'bar', data: { labels: dd.map(d => d.slice(5)), datasets: [{ data: dd.map(d => +daily[d].toFixed(2)), backgroundColor: dd.map(d => daily[d] >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)'), borderRadius: 3 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tip }, scales: { x: axis, y: axis } } });
        }
        window.onload = function() { renderAccounts(); renderOverview(); };

        // ==================== TRADING SESSIONS (live clock + per-session trade dots) ====================
        const SES_DEF = [
            { name: 'Sydney', open: 22, close: 7, color: '#8b5cf6' },
            { name: 'Tokyo', open: 0, close: 9, color: '#ec4899' },
            { name: 'London', open: 7, close: 16, color: '#3b82f6' },
            { name: 'New York', open: 12, close: 21, color: '#06b6d4' },
            { name: 'Off-hours', open: null, close: null, color: '#6b7280' }
        ];
        const sesState = { ids: null, days: 0, from: '', to: '' }; // ids: null = all accounts
        function sesHours(def) { // 24 booleans in account-local hours
            const a = []; for (let h = 0; h < 24; h++) {
                const u = ((h - TF_TIMEZONE_OFFSET_HOURS) % 24 + 24) % 24;
                a.push(def.open === null ? !SES_DEF.slice(0, 4).some(d => sesHours(d)[h]) : (def.open < def.close ? (u >= def.open && u < def.close) : (u >= def.open || u < def.close)));
            } return a;
        }
        function sesRuns(arr) { const r = []; let st = null; for (let h = 0; h <= 24; h++) { if (h < 24 && arr[h]) { if (st === null) st = h; } else if (st !== null) { r.push([st, h]); st = null; } } return r; }
        function sesFmtHour(h) { h = ((Math.round(h) % 24) + 24) % 24; return (h % 12 || 12) + ':00 ' + (h >= 12 ? 'PM' : 'AM'); }
        function sesFmtHourShort(h) { return sesFmtHour(h).replace(':00 ', ' '); }
        function sesLocalLabel(def, withTz) { return def.open === null ? 'Outside the 4 majors' : sesFmtHour(def.open + TF_TIMEZONE_OFFSET_HOURS) + ' – ' + sesFmtHour(def.close + TF_TIMEZONE_OFFSET_HOURS) + (withTz ? ' PKT' : ''); }
        function sesSelected() { const all = jrAllAccounts(); if (sesState.ids === null) return all; return all.filter(a => sesState.ids.includes(a.id)); }
        function sesRange(d) { sesState.days = d; sesState.from = sesState.to = ''; renderSessions(); }
        function sesRenderAccButton(accs) {
            const el = document.getElementById('ses-acc-label'); if (!el) return;
            if (!accs.length) { el.innerHTML = '<span class="text-gray-200">Select account(s)</span>'; return; }
            if (accs.length === 1) {
                const m = jrAccMeta(accs[0]);
                el.innerHTML = `<span class="font-semibold text-white truncate">${escapeHtml(m.name)}</span><span class="text-gray-300 text-xs mono truncate hidden sm:inline">${escapeHtml(m.sub)}</span><span class="text-[11px] mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${m.tagCls}">${m.tag}</span>`;
                return;
            }
            const total = jrAllAccounts().length;
            el.innerHTML = `<span class="font-semibold text-white">${accs.length === total ? 'All accounts' : accs.length + ' accounts'}</span><span class="text-gray-300 text-xs truncate hidden sm:inline max-w-[220px]">${escapeHtml(accs.map(a => jrAccMeta(a).name).join(', '))}</span>`;
        }
        function sesRenderAccMenu() {
            const menu = document.getElementById('ses-acc-menu'); if (!menu) return;
            const keep = menu.scrollTop;
            const { forex, binary } = jrAccountList();
            if (!forex.length && !binary.length) { menu.innerHTML = '<div class="px-3 py-3 text-xs text-gray-300 leading-relaxed">No MT5 or Binary accounts yet.</div>'; return; }
            const sel = sesSelected().map(a => a.id);
            const head = `<div class="flex items-center justify-between px-3 py-2 border-b border-aura-border sticky top-0" style="background:#14161f;"><span class="text-xs text-gray-300">${sel.length} selected</span><span class="flex gap-3 text-xs"><button type="button" onclick="sesAll()" class="text-blue-400 hover:underline">Select all</button><button type="button" onclick="sesNone()" class="text-gray-200 hover:underline">Clear</button></span></div>`;
            const group = (title, list) => !list.length ? '' : `<div class="px-3 pt-2.5 pb-1 text-xs font-semibold text-gray-300">${title}</div>` + list.map(acc => {
                const m = jrAccMeta(acc), on = sel.includes(acc.id);
                return `<button type="button" onclick="sesToggle('${acc.id}')" class="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-aura-hover transition ${on ? 'bg-aura-hover' : ''}">
                    <span class="w-4 h-4 rounded border shrink-0 flex items-center justify-center ${on ? 'bg-blue-600 border-blue-500' : 'border-gray-600'}">${on ? '<svg viewBox="0 0 12 12" class="w-3 h-3"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>
                    <span class="flex flex-col min-w-0 flex-1"><span class="text-white font-semibold truncate">${escapeHtml(m.name)}</span><span class="text-gray-300 text-xs mono truncate">${escapeHtml(m.sub)}</span></span>
                    <span class="text-[11px] mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${m.tagCls}">${m.tag}</span></button>`; }).join('');
            menu.innerHTML = head + group('Forex · MT5 accounts', forex) + group('Binary accounts', binary);
            menu.scrollTop = keep;
        }
        function sesToggleAccMenu(e) {
            if (e) e.stopPropagation();
            const menu = document.getElementById('ses-acc-menu');
            if (menu.classList.contains('hidden')) { sesRenderAccMenu(); menu.classList.remove('hidden'); } else menu.classList.add('hidden');
        }
        function sesSetAccs(ids) { sesState.ids = ids; renderSessions(); }
        function sesToggle(id) { const cur = sesSelected().map(a => a.id); const i = cur.indexOf(id); if (i >= 0) cur.splice(i, 1); else cur.push(id); sesSetAccs(cur); }
        function sesAll() { sesSetAccs(null); }
        function sesNone() { sesSetAccs([]); }
        document.addEventListener('click', e => {
            const menu = document.getElementById('ses-acc-menu');
            if (menu && !menu.classList.contains('hidden') && !e.target.closest('#ses-acc-wrap')) menu.classList.add('hidden');
        });
        function sesNowHour() { const n = new Date(); return (((n.getUTCHours() + n.getUTCMinutes() / 60 + TF_TIMEZONE_OFFSET_HOURS) % 24) + 24) % 24; }
        function sesIsOpen(def) { return sesHours(def)[Math.floor(sesNowHour())]; }
        function sesTradeHour(t) { return Math.max(0, Math.min(23.999, (t.ts - (Date.parse(t.dateKey + 'T00:00:00') || 0)) / 3600000)); }
        function sesDot(t, h, idx, sessNames) {
            const c = t.result === 'win' ? '#10b981' : (t.result === 'loss' ? '#ef4444' : '#fbbf24');
            const tip = `${t.dateKey} ${t.timeLabel || ''} PKT · ${t.pair} · ${t.resultLabel} · ${jrMoney(t.pnl)} · ${t.accName} · ${sessNames}`;
            return `<span class="absolute w-3.5 h-3.5 rounded-full ring-1 ring-black/50 -translate-x-1/2 -translate-y-1/2 hover:scale-150 hover:z-10 transition cursor-pointer" style="left:${h / 24 * 100}%;top:${12 + idx * 17}px;background:${c}" title="${escapeHtml(tip)}" onclick="ovOpen('${t.accId}')"></span>`;
        }
        function sesStat(list) {
            const w = list.filter(t => t.result === 'win'), l = list.filter(t => t.result === 'loss'), be = list.length - w.length - l.length;
            const pnl = list.reduce((x, t) => x + t.pnl, 0);
            const gw = w.reduce((x, t) => x + t.pnl, 0), gl = Math.abs(l.reduce((x, t) => x + t.pnl, 0));
            const pnls = list.map(t => t.pnl);
            return { n: list.length, w: w.length, l: l.length, b: be, pnl,
                wr: (w.length + l.length) ? w.length / (w.length + l.length) * 100 : null,
                avg: list.length ? pnl / list.length : null,
                best: pnls.length ? Math.max.apply(null, pnls) : null, worst: pnls.length ? Math.min.apply(null, pnls) : null,
                avgW: w.length ? gw / w.length : null, avgL: l.length ? -gl / l.length : null,
                pf: gl > 0 ? gw / gl : (gw > 0 ? Infinity : null) };
        }
        function renderSessions() {
            const chart = document.getElementById('ses-chart'); if (!chart) return;
            document.getElementById('ses-tz').innerText = 'Pakistan Time (PKT, UTC' + (TF_TIMEZONE_OFFSET_HOURS >= 0 ? '+' : '') + TF_TIMEZONE_OFFSET_HOURS + ') in 12-hour format';
            const all = jrAllAccounts(), sel = sesSelected();
            sesRenderAccButton(sel); sesRenderAccMenu();
            document.getElementById('ses-ranges').innerHTML = [[7, '7D'], [30, '30D'], [90, '90D'], [0, 'All']].map(([d, l]) => `<button onclick="sesRange(${d})" class="px-2.5 py-1 text-sm rounded ${sesState.days === d && !rgActive(sesState) ? 'bg-aura-hover text-white border border-aura-border' : 'text-gray-200 hover:text-white'}">${l}</button>`).join('') + rgBtn('ses', 'px-2.5 py-1 text-sm rounded', 'bg-blue-600 text-white', 'text-gray-200 hover:text-white', 'Custom');

            let cut = '', end = ''; if (rgActive(sesState)) { cut = sesState.from; end = sesState.to; } else if (sesState.days) { const d = new Date(); d.setDate(d.getDate() - sesState.days + 1); cut = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
            const trades = []; let untimed = 0;
            sel.forEach(a => jrBuildRows(a).forEach(r => { if ((cut && r.dateKey < cut) || (end && r.dateKey > end)) return; if (r.kind === 'trade' && r.timeLabel) trades.push(Object.assign({}, r, { accId: a.id, accName: jrAccMeta(a).name })); else untimed++; }));
            trades.sort((a, b) => a.ts - b.ts);

            const stats = SES_DEF.map(def => { const hrs = sesHours(def); const list = trades.filter(t => hrs[Math.floor(sesTradeHour(t))]); return Object.assign({ def, hrs, list }, sesStat(list)); });
            const major = stats.slice(0, 4).filter(s => s.n);
            const best = major.slice().sort((a, b) => b.pnl - a.pnl)[0], worst = major.slice().sort((a, b) => a.pnl - b.pnl)[0], busiest = major.slice().sort((a, b) => b.n - a.n)[0];

            // ---- summary cards ----
            const card = (k, v, sub, c) => `<div class="glass-card p-3.5 rounded-lg border border-aura-border"><div class="text-xs text-gray-300 uppercase tracking-wide">${k}</div><div class="text-xl font-bold font-mono mt-1 ${c || 'text-white'}">${v}</div><div class="text-xs text-gray-300 mt-0.5 truncate">${sub}</div></div>`;
            document.getElementById('ses-summary').innerHTML = card('Trades plotted', trades.length, untimed ? untimed + ' entries have no trade time' : 'all entries have a time') +
                card('Busiest session', busiest ? busiest.def.name : '—', busiest ? busiest.n + ' trades' : 'no data') +
                card('Most profitable', best && best.pnl > 0 ? best.def.name : '—', best ? jrMoney(best.pnl) : 'no data', best && best.pnl > 0 ? 'text-aura-green' : 'text-white') +
                card('Weakest session', worst && worst.pnl < 0 ? worst.def.name : '—', worst ? jrMoney(worst.pnl) : 'no data', worst && worst.pnl < 0 ? 'text-aura-red' : 'text-white');

            // ---- the single chart ----
            const LBL = 'width:170px;flex-shrink:0;';
            const grid = 'background-image:linear-gradient(to right,rgba(255,255,255,.06) 1px,transparent 1px);background-size:' + (100 / 24) + '% 100%;';
            const ruler = `<div class="flex"><div style="${LBL}"></div><div class="relative flex-1 h-5 text-xs font-mono text-gray-200">` + [0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => `<span class="absolute ${h === 0 ? '' : (h === 24 ? '-translate-x-full' : '-translate-x-1/2')}" style="left:${h / 24 * 100}%">${sesFmtHourShort(h)}</span>`).join('') + '</div></div>';
            const barRows = stats.map(S => {
                const open = sesIsOpen(S.def), c = S.def.color;
                const segs = sesRuns(S.hrs).map(([x, y]) => `<div class="absolute rounded-sm" style="left:${x / 24 * 100}%;width:${(y - x) / 24 * 100}%;top:7px;bottom:7px;background:${c}${S.def.open === null ? '55' : 'cc'};border:1px solid ${c}"></div>`).join('');
                return `<div class="flex items-center" data-ses="${S.def.name}">
                    <div style="${LBL}" class="pr-2"><div class="flex items-center gap-1.5"><span class="text-sm font-bold text-white truncate">${S.def.name}</span>${S.def.open !== null ? `<span data-ses-badge="${S.def.name}" class="px-1 rounded text-[10px] font-mono border ${open ? 'bg-aura-green/10 text-aura-green border-aura-green/30' : 'bg-aura-bg text-gray-300 border-aura-border'}">${open ? 'OPEN' : 'CLOSED'}</span>` : ''}</div><div class="text-[11px] font-mono text-gray-300 truncate">${sesLocalLabel(S.def)}</div></div>
                    <div class="relative flex-1 h-10 bg-aura-bg border-y border-aura-border" style="${grid}">${segs}</div></div>`;
            }).join('');

            // stack dots that land within the same 20-minute slot so none hide each other
            const slots = {}, placed = trades.map(t => { const h = sesTradeHour(t), k = Math.floor(h * 3); const idx = slots[k] || 0; slots[k] = idx + 1; return { t, h, idx }; });
            const maxStack = placed.reduce((m, p) => Math.max(m, p.idx + 1), 1), laneH = Math.max(60, maxStack * 17 + 14);
            const dots = placed.map(p => { const names = SES_DEF.slice(0, 4).filter(d => sesHours(d)[Math.floor(p.h)]).map(d => d.name).join(' / ') || 'Off-hours'; return sesDot(p.t, p.h, p.idx, names); }).join('');
            const tradeRow = `<div class="flex items-stretch mt-2"><div style="${LBL}" class="pr-2 pt-2"><div class="text-sm font-bold text-white">Trades</div><div class="text-[11px] font-mono text-gray-300">${trades.length} plotted</div></div>
                <div class="relative flex-1 rounded-md bg-aura-bg border border-aura-border overflow-hidden" style="height:${laneH}px;${grid}">${dots}${trades.length ? '' : '<div class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No timed trades for this selection</div>'}</div></div>`;
            const legend = `<div class="flex flex-wrap items-center gap-4 text-xs text-gray-200 mb-3">
                <span class="text-sm font-bold text-white mr-1">Session timeline</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-aura-green"></span>Win (TP)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Breakeven</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-aura-red"></span>Loss (SL)</span>
                <span class="text-gray-400">Each dot = one trade at the time you took it. Hover for details, click to open the account.</span></div>`;
            const nowLine = `<div class="absolute pointer-events-none" style="top:0;bottom:0;left:170px;right:0;"><div class="ses-now absolute top-0 bottom-0 w-px bg-white/70" style="left:${sesNowHour() / 24 * 100}%"></div></div>`;
            chart.innerHTML = legend + `<div class="relative overflow-x-auto"><div class="relative" style="min-width:780px;">${ruler}<div class="space-y-1">${barRows}</div>${tradeRow}${nowLine}</div></div>`;

            // ---- per-session stats (below the chart) ----
            document.getElementById('ses-stats-sub').innerText = (sel.length === 0 ? 'No account selected' : (sel.length === all.length && all.length > 1 ? 'All accounts' : sel.map(a => jrAccMeta(a).name).join(', '))) + (rgActive(sesState) ? ' · ' + rgLabel(sesState.from, sesState.to) : (sesState.days ? ' · last ' + sesState.days + ' days' : ' · all time'));
            const fmt = v => v === null ? '—' : jrMoney(v), kv = (k, v, c) => `<div><div class="text-xs text-gray-300">${k}</div><div class="text-sm font-mono font-semibold ${c || 'text-gray-200'}">${v}</div></div>`;
            document.getElementById('ses-stats').innerHTML = stats.map(S => {
                const c = S.def.color, n = S.n || 1, share = trades.length ? (S.n / trades.length * 100).toFixed(0) + '%' : '—';
                const pf = S.pf === null ? '—' : (S.pf === Infinity ? '∞' : S.pf.toFixed(2));
                return `<div class="glass-card rounded-xl border border-aura-border p-4">
                    <div class="flex items-start justify-between gap-3 mb-3"><div class="flex items-center gap-2.5"><span class="w-1.5 h-8 rounded-sm" style="background:${c}"></span><div><div class="text-base font-bold text-white">${S.def.name}</div><div class="text-xs font-mono text-gray-300">${sesLocalLabel(S.def, true)}</div></div></div>
                        <div class="text-right"><div class="text-base font-bold font-mono ${ovTone(S.pnl)}">${S.n ? jrMoney(S.pnl) : '—'}</div><div class="text-xs text-gray-300">net P&amp;L</div></div></div>
                    <div class="grid grid-cols-3 gap-x-3 gap-y-2.5">
                        ${kv('Trades', S.n + ' <span class="text-gray-300 font-normal">(' + share + ')</span>')}
                        ${kv('Win rate', S.wr === null ? '—' : S.wr.toFixed(0) + '%')}
                        ${kv('Profit factor', pf)}
                        ${kv('Avg / trade', fmt(S.avg), S.avg === null ? '' : ovTone(S.avg))}
                        ${kv('Avg win', fmt(S.avgW), 'text-aura-green')}
                        ${kv('Avg loss', fmt(S.avgL), 'text-aura-red')}
                        ${kv('Best trade', fmt(S.best), S.best === null ? '' : ovTone(S.best))}
                        ${kv('Worst trade', fmt(S.worst), S.worst === null ? '' : ovTone(S.worst))}
                        ${kv('W / BE / L', S.w + ' / ' + S.b + ' / ' + S.l)}
                    </div>
                    <div class="flex h-1.5 rounded-full overflow-hidden bg-aura-border mt-3"><div class="bg-aura-green" style="width:${S.w / n * 100}%"></div><div class="bg-amber-400" style="width:${S.b / n * 100}%"></div><div class="bg-aura-red" style="width:${S.l / n * 100}%"></div></div>
                    ${S.n ? '' : '<div class="text-xs text-gray-400 mt-2">No trades in this session</div>'}</div>`;
            }).join('');

            // ---- insights ----
            const ins = []; const ranked = major.filter(s => s.wr !== null && s.w + s.l >= 3).sort((a, b) => b.wr - a.wr);
            if (ranked.length) ins.push(`Highest win rate: <b class="text-white">${ranked[0].def.name}</b> (${ranked[0].wr.toFixed(0)}% over ${ranked[0].w + ranked[0].l} decided trades).`);
            if (ranked.length > 1) ins.push(`Lowest win rate: <b class="text-white">${ranked[ranked.length - 1].def.name}</b> (${ranked[ranked.length - 1].wr.toFixed(0)}%).`);
            const off = stats[4]; if (off.n) ins.push(`<b class="text-amber-400">${off.n}</b> trade${off.n > 1 ? 's were' : ' was'} taken outside the four major sessions (${jrMoney(off.pnl)}).`);
            const ov = trades.filter(t => SES_DEF.slice(0, 4).filter(d => sesHours(d)[Math.floor(sesTradeHour(t))]).length > 1).length;
            if (ov) ins.push(`${ov} trade${ov > 1 ? 's' : ''} fell in an overlap between two sessions, so ${ov > 1 ? 'they are' : 'it is'} counted in each of them in the stats above.`);
            document.getElementById('ses-insights').innerHTML = '<h3 class="text-base font-bold text-white mb-2">Insights</h3>' + (ins.length ? '<ul class="space-y-1.5 text-sm text-gray-200 list-disc pl-4">' + ins.map(i => '<li>' + i + '</li>').join('') + '</ul>' : '<p class="text-sm text-gray-300">Log at least a few trades with a time (from the Calendar) to see which session suits you best. Binary accounts and day summaries have no trade time, so they are not plotted.</p>');
        }
        function updateSessionClock() {
            const now = new Date();
            const el = document.getElementById('session-local-time');
            if (el) { const t = new Date(now.getTime() + TF_TIMEZONE_OFFSET_HOURS * 3600000), hh = t.getUTCHours(); el.innerText = String(hh % 12 || 12).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0') + ':' + String(t.getUTCSeconds()).padStart(2, '0') + ' ' + (hh >= 12 ? 'PM' : 'AM'); }
            const p = (sesNowHour() / 24 * 100) + '%';
            document.querySelectorAll('.ses-now').forEach(m => { m.style.left = p; });
            SES_DEF.slice(0, 4).forEach(def => {
                const b = document.querySelector(`[data-ses-badge="${def.name}"]`); if (!b) return;
                const open = sesIsOpen(def);
                b.innerText = open ? 'OPEN' : 'CLOSED';
                b.className = 'px-2 py-0.5 rounded text-xs font-mono border ' + (open ? 'bg-aura-green/10 text-aura-green border-aura-green/30' : 'bg-aura-bg text-gray-300 border-aura-border');
            });
        }
        // Keep the clock ticking every second, even when the tab isn't visible yet
        setInterval(() => {
            const tab = document.getElementById('tab-accounts-sessions');
            if (tab && !tab.classList.contains('hidden')) updateSessionClock();
        }, 1000);
    
        /* ==================== JOURNAL: pick an MT5 / Binary account -> list of its entries -> full detail below ==================== */
        let jrState = { accountIds: null, rows: [], visible: [], selectedKey: null, query: '', result: 'all', from: '', to: '' };

        function jrNum(v) { if (v === '' || v === null || v === undefined) return null; const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
        function jrMoney(n) { return (n < 0 ? '-$' : '+$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        function jrTone(n) { return n > 0 ? 'text-aura-green' : (n < 0 ? 'text-aura-red' : 'text-gray-300'); }
        function jrFmtDate(k) { const d = new Date(k + 'T00:00:00'); return isNaN(d) ? k : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
        function jrFmtDateLong(k) { const d = new Date(k + 'T00:00:00'); return isNaN(d) ? k : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
        function jrShots(list) {
            return (Array.isArray(list) ? list : []).map(s => typeof s === 'string' ? { dataUrl: s } : s).filter(s => s && s.dataUrl);
        }

        // ---- accounts ----
        function jrAccountList() { return { forex: calendarAccountsForType('forex'), binary: calendarAccountsForType('binary') }; }
        function jrAllAccounts() { const { forex, binary } = jrAccountList(); return forex.concat(binary); }
        function jrResolveAccounts() {
            const all = jrAllAccounts();
            if (jrState.accountIds === null) {
                const pref = calendarLinkedAccountId ? all.find(a => a.id === calendarLinkedAccountId) : null;
                const pick = pref || all[0];
                jrState.accountIds = pick ? [pick.id] : [];
            }
            jrState.accountIds = jrState.accountIds.filter(id => all.some(a => a.id === id));
            return jrState.accountIds.map(id => all.find(a => a.id === id));
        }
        function jrAccMeta(acc) {
            const name = acc.nickname || acc.name || 'Account';
            if (acc.category === 'binary') {
                const real = acc.mode === 'real';
                const bal = (acc.startingBalance !== undefined && acc.startingBalance !== null && acc.startingBalance !== '') ? ' · ' + Number(acc.startingBalance).toLocaleString() + '$' : '';
                return { name, sub: (acc.provider ? acc.provider.name : 'Binary') + bal, tag: real ? 'Real' : 'Demo', tagCls: real ? 'text-aura-green border-aura-green/20 bg-aura-green/10' : 'text-gray-400 border-aura-border bg-aura-hover' };
            }
            const funded = acc.phase ? acc.phase === 'Funded' : acc.subtype === 'funded';
            const parentName = acc.parent ? (acc.parent.nickname || acc.parent.name || 'Account') : '';
            return { name, sub: [parentName, acc.provider ? acc.provider.name : '', mt5FmtSize(acc.mt5 ? acc.mt5.size : acc.startingBalance)].filter(Boolean).join(' · '), tag: acc.phase || (funded ? 'Funded' : 'Personal'), tagCls: funded ? 'text-aura-green border-aura-green/20 bg-aura-green/10' : 'text-blue-400 border-blue-500/20 bg-blue-500/10' };
        }
        function jrRenderAccountButton(accs) {
            const el = document.getElementById('jr-acc-label');
            if (!accs.length) { el.innerHTML = '<span class="text-gray-400">Select account(s)</span>'; return; }
            if (accs.length === 1) {
                const m = jrAccMeta(accs[0]);
                el.innerHTML = `<span class="font-semibold text-white truncate">${escapeHtml(m.name)}</span>` +
                    `<span class="text-gray-500 text-[11px] mono truncate hidden sm:inline">${escapeHtml(m.sub)}</span>` +
                    `<span class="text-[9px] mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${m.tagCls}">${m.tag}</span>`;
                return;
            }
            const total = jrAllAccounts().length;
            el.innerHTML = `<span class="font-semibold text-white">${accs.length === total ? 'All accounts' : accs.length + ' accounts'}</span>` +
                `<span class="text-gray-500 text-[11px] truncate hidden sm:inline max-w-[220px]">${escapeHtml(accs.map(a => jrAccMeta(a).name).join(', '))}</span>`;
        }
        function jrRenderAccMenu() {
            const menu = document.getElementById('jr-acc-menu');
            const keep = menu.scrollTop;
            const { forex, binary } = jrAccountList();
            if (!forex.length && !binary.length) {
                menu.innerHTML = '<div class="px-3 py-3 text-[11px] text-gray-500 leading-relaxed">No MT5 or Binary accounts yet.</div>';
                return;
            }
            const sel = jrState.accountIds || [];
            const head = `<div class="flex items-center justify-between px-3 py-2 border-b border-aura-border sticky top-0" style="background:#14161f;">
                <span class="text-[11px] text-gray-500">${sel.length} selected</span>
                <span class="flex gap-3 text-[11px]"><button type="button" onclick="jrSelectAllAcc()" class="text-blue-400 hover:underline">Select all</button><button type="button" onclick="jrClearAcc()" class="text-gray-400 hover:underline">Clear</button></span></div>`;
            const group = (title, list) => !list.length ? '' :
                `<div class="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-gray-500">${title}</div>` +
                list.map(acc => {
                    const m = jrAccMeta(acc);
                    const on = sel.includes(acc.id);
                    return `<button type="button" onclick="jrToggleAcc('${acc.id}')" class="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-aura-hover transition ${on ? 'bg-aura-hover' : ''}">
                        <span class="w-4 h-4 rounded border shrink-0 flex items-center justify-center ${on ? 'bg-blue-600 border-blue-500' : 'border-gray-600'}">${on ? '<svg viewBox="0 0 12 12" class="w-3 h-3"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>
                        <span class="flex flex-col min-w-0 flex-1"><span class="text-white font-semibold truncate">${escapeHtml(m.name)}</span><span class="text-gray-500 text-[10px] mono truncate">${escapeHtml(m.sub)}</span></span>
                        <span class="text-[9px] mono font-bold shrink-0 px-1.5 py-0.5 rounded border ${m.tagCls}">${m.tag}</span></button>`;
                }).join('');
            menu.innerHTML = head + group('Forex · MT5 accounts', forex) + group('Binary accounts', binary);
            menu.scrollTop = keep;
        }
        function jrToggleAccMenu(e) {
            if (e) e.stopPropagation();
            const menu = document.getElementById('jr-acc-menu');
            if (menu.classList.contains('hidden')) { jrRenderAccMenu(); menu.classList.remove('hidden'); } else menu.classList.add('hidden');
        }
        function jrSetAccs(ids) { jrState.accountIds = ids; jrState.selectedKey = null; jrRenderAccMenu(); renderJournal(); }
        function jrToggleAcc(id) {
            const cur = (jrState.accountIds || []).slice();
            const i = cur.indexOf(id);
            if (i >= 0) cur.splice(i, 1); else cur.push(id);
            jrSetAccs(cur);
        }
        function jrSelectAllAcc() { jrSetAccs(jrAllAccounts().map(a => a.id)); }
        function jrClearAcc() { jrSetAccs([]); }
        document.addEventListener('click', e => {
            const menu = document.getElementById('jr-acc-menu');
            if (menu && !menu.classList.contains('hidden') && !e.target.closest('#jr-acc-wrap')) menu.classList.add('hidden');
        });

        // ---- data ----
        // Reads the same per-account storage the Calendar writes to, so the journal is always the same data.
        function jrLoadEntries(acc, isBin) {
            const type = isBin ? 'binary' : 'forex';
            if (calendarLinkedAccountId === acc.id && calendarType === type) return calendarEntries || {};
            try {
                const raw = localStorage.getItem(CALENDAR_STORAGE_KEYS[type] + '_' + acc.id);
                return raw ? (JSON.parse(raw) || {}) : {};
            } catch (e) { return {}; }
        }
        function jrBuildRows(acc) {
            const isBin = acc.category === 'binary';
            const entries = jrLoadEntries(acc, isBin);
            const rows = [];
            Object.keys(entries).forEach(dateKey => {
                const e = entries[dateKey];
                if (!e) return;
                const dayStart = Date.parse(dateKey + 'T00:00:00') || 0;
                if (!isBin && Array.isArray(e.tradeLogs) && e.tradeLogs.length) {
                    e.tradeLogs.forEach(t => {
                        const entry = jrNum(t.entry), sl = jrNum(t.sl), tp = jrNum(t.tp);
                        const rr = t.rr && t.rr.enabled ? t.rr : null;
                        const result = t.outcome === 'tp' ? 'win' : (t.outcome === 'sl' ? 'loss' : 'be');
                        rows.push({
                            key: 't:' + t.id, kind: 'trade', dateKey, pair: t.pair || 'Trade',
                            timeLabel: t.timeLabel || '', session: t.session || '',
                            ts: dayStart + (((Number(t.hour24) || 0) * 60 + (Number(t.min) || 0)) * 60000), created: t.createdAt || 0,
                            result, resultLabel: (t.outcome || 'be').toUpperCase(), pnl: Number(t.pnl) || 0,
                            rr, achieved: rr ? (Number(rr.achieved) || 0) : null,
                            entry, sl, tp,
                            planned: (entry !== null && sl !== null && tp !== null && entry !== sl) ? Math.abs(tp - entry) / Math.abs(entry - sl) : null,
                            notes: t.notes || '', mistakes: t.mistakes || '', reason: t.reason || '',
                            rules: t.rulesFollowed !== false, emotional: !!t.emotionalTrade,
                            tags: Array.isArray(t.tags) ? t.tags : [], shots: jrShots(t.screenshots),
                            count: 1, wins: result === 'win' ? 1 : 0, day: null
                        });
                    });
                } else {
                    const pnl = Number(e.pnl) || 0;
                    const result = pnl > 0 ? 'win' : (pnl < 0 ? 'loss' : 'be');
                    const w = Number(e.wins) || 0, l = Number(e.losses) || 0, rf = Number(e.refunds) || 0;
                    rows.push({
                        key: 'd:' + dateKey, kind: 'day', dateKey, pair: isBin ? 'Binary day' : 'Day summary',
                        timeLabel: '', session: '', ts: dayStart, created: 0,
                        result, resultLabel: result === 'win' ? 'Win' : (result === 'loss' ? 'Loss' : 'Flat'), pnl,
                        rr: null, achieved: null, entry: null, sl: null, tp: null, planned: null,
                        notes: e.note || '', mistakes: e.mistakes || '', reason: '',
                        rules: e.rulesFollowed !== false, emotional: !!e.emotionalTrade,
                        tags: [], shots: jrShots(e.screenshots),
                        count: Number(e.trades) || 0, wins: w,
                        day: { isBin, trades: Number(e.trades) || 0, wins: w, losses: l, refunds: rf, tp: Number(e.tp) || 0, sl: Number(e.sl) || 0, be: Number(e.be) || 0 }
                    });
                }
            });
            rows.sort((a, b) => (b.ts - a.ts) || (b.created - a.created));
            return rows;
        }
        function jrApplyFilters() {
            const q = jrState.query.trim().toLowerCase();
            jrState.visible = jrState.rows.filter(r => {
                if (jrState.result !== 'all' && r.result !== jrState.result) return false;
                if (jrState.from && r.dateKey < jrState.from) return false;
                if (jrState.to && r.dateKey > jrState.to) return false;
                if (!q) return true;
                return [r.accName, r.pair, r.notes, r.mistakes, r.reason, r.session, r.dateKey, r.tags.join(' ')].join(' ').toLowerCase().includes(q);
            });
            if (!jrState.visible.some(r => r.key === jrState.selectedKey)) jrState.selectedKey = null;
        }
        function jrSelectedRow() { return jrState.visible.find(r => r.key === jrState.selectedKey) || null; }

        // ---- rendering ----
        function renderJournal() {
            jrCloseModal();
            const jrRg = document.getElementById('jr-range'); if (jrRg) jrRg.innerHTML = rgBtn('jr', 'px-2.5 py-1.5 text-xs rounded-md border', 'bg-blue-600 border-blue-500/40 text-white', 'bg-aura-bg border-aura-border text-gray-300 hover:text-white', 'Date range');
            const accs = jrResolveAccounts();
            jrRenderAccountButton(accs);
            const emptyEl = document.getElementById('jr-empty');
            const bodyEl = document.getElementById('jr-body');
            const showEmpty = (html) => { emptyEl.innerHTML = html; emptyEl.classList.remove('hidden'); bodyEl.classList.add('hidden'); };
            document.getElementById('jr-table').classList.toggle('jr-multi', accs.length > 1);

            if (!accs.length) {
                jrState.rows = []; jrState.visible = [];
                document.getElementById('jr-count').innerText = '';
                const any = jrAllAccounts().length > 0;
                showEmpty(`<i data-lucide="book-open" class="w-8 h-8 text-gray-600 mx-auto mb-3"></i>
                    <p class="text-sm text-white font-semibold">${any ? 'Select one or more accounts' : 'No accounts to journal yet'}</p>
                    <p class="text-xs text-gray-500 mt-1">${any ? 'Use the account picker above to view their journal together.' : 'Add an MT5 or Binary account, then log your trades to see them here.'}</p>
                    ${any ? '<button type="button" onclick="jrSelectAllAcc()" class="mt-4 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition">Select all accounts</button>' : `<button type="button" onclick="switchTab('accounts-list')" class="mt-4 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition">Go to accounts</button>`}`);
                document.getElementById('page-subtitle').innerText = any ? 'No account selected' : 'No accounts';
                renderIcons();
                return;
            }

            let rows = [];
            accs.forEach(acc => {
                const nm = jrAccMeta(acc).name;
                jrBuildRows(acc).forEach(r => rows.push(Object.assign(r, { key: acc.id + '|' + r.key, accId: acc.id, accName: nm })));
            });
            rows.sort((a, b) => (b.ts - a.ts) || (b.created - a.created));
            jrState.rows = rows;
            const label = accs.length === 1 ? jrAccMeta(accs[0]).name : accs.length + ' accounts';
            document.getElementById('page-subtitle').innerText = `${label} · ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`;

            if (!rows.length) {
                jrState.visible = [];
                document.getElementById('jr-count').innerText = '';
                showEmpty(`<i data-lucide="book-open" class="w-8 h-8 text-gray-600 mx-auto mb-3"></i>
                    <p class="text-sm text-white font-semibold">Nothing logged for ${escapeHtml(label)} yet</p>
                    <p class="text-xs text-gray-500 mt-1">Trades you log in the calendar show up here with their screenshots, levels and mistakes.</p>
                    <button type="button" onclick="selectCalendarAccount('${accs[0].id}'); switchTab('accounts-calendar')" class="mt-4 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition">Open calendar</button>`);
                renderIcons();
                return;
            }

            emptyEl.classList.add('hidden');
            bodyEl.classList.remove('hidden');
            jrApplyFilters();
            jrRenderRows();
            renderIcons();
        }

        function jrRRText(r) {
            if (r.kind === 'trade') return r.achieved === null ? '—' : (r.achieved >= 0 ? '+' : '') + r.achieved.toFixed(2) + 'R';
            const d = r.day;
            if (d.isBin) return `${d.wins}W ${d.losses}L` + (d.refunds ? ` ${d.refunds}RF` : '');
            return d.tp || d.sl || d.be ? `${d.tp}TP ${d.sl}SL` + (d.be ? ` ${d.be}BE` : '') : `${d.wins}W / ${d.trades}`;
        }
        function jrRenderRows() {
            const tbody = document.getElementById('jr-rows');
            const vis = jrState.visible;
            document.getElementById('jr-count').innerText = vis.length === jrState.rows.length ? `${vis.length} entries` : `${vis.length} of ${jrState.rows.length}`;
            if (!vis.length) {
                tbody.innerHTML = `<tr><td colspan="17" style="padding:40px 12px;text-align:center;color:#6b7280;white-space:normal;background:transparent;">No entries match these filters. <button type="button" onclick="jrClearFilters()" class="text-blue-400 hover:underline">Clear filters</button></td></tr>`;
                return;
            }
            const dash = '<span class="jr-dash">—</span>';
            const txt = (s, cls) => s ? `<span class="jr-txt ${cls || ''}" title="${escapeHtml(s)}">${escapeHtml(String(s).replace(/\s+/g, ' '))}</span>` : dash;
            const num = v => v === null || v === undefined ? dash : escapeHtml(String(v));
            tbody.innerHTML = vis.map((r, i) => {
                const flags = [];
                if (!r.rules) flags.push('<span class="text-aura-red">Rules broken</span>');
                if (r.emotional) flags.push('<span class="text-aura-amber">Emotional</span>');
                const disc = flags.length ? flags.join(' · ') : '<span class="text-gray-600">Clean</span>';
                const lot = r.rr && r.rr.lotSize ? r.rr.lotSize : null;
                const tags = r.tags.length ? r.tags.map(t => `<span class="jr-tag">${escapeHtml(t)}</span>`).join(' ') : dash;
                const thumb = r.shots.length
                    ? `<span class="jr-thumb"><img src="${escapeHtml(safeImgSrc(r.shots[0].dataUrl))}" alt="" loading="lazy" decoding="async">${r.shots.length > 1 ? `<span class="jr-thumb-count">${r.shots.length}</span>` : ''}</span>`
                    : '<span class="block text-right jr-dash">—</span>';
                return `<tr class="jr-row ${r.key === jrState.selectedKey ? 'is-active' : ''}" data-i="${i}" tabindex="0" onclick="jrOpen(${i})" onkeydown="if(event.key==='Enter'){jrOpen(${i})}">
                    <td class="jr-c1"><div class="text-white">${escapeHtml(jrFmtDate(r.dateKey))}</div><div class="text-[11px] text-gray-500 mono">${escapeHtml(r.timeLabel || '')}</div></td>
                    <td class="jr-c2 font-semibold text-white">${escapeHtml(r.pair)}</td>
                    <td class="jr-acc-col text-gray-300"><span class="jr-txt" title="${escapeHtml(r.accName)}">${escapeHtml(r.accName)}</span></td>
                    <td><span class="jr-badge ${r.result}">${r.resultLabel}</span></td>
                    <td class="text-right mono font-semibold ${jrTone(r.pnl)}">${jrMoney(r.pnl)}</td>
                    <td class="mono">${jrRRText(r)}</td>
                    <td class="text-right mono">${num(r.entry)}</td>
                    <td class="text-right mono ${r.sl !== null ? 'text-aura-red' : ''}">${num(r.sl)}</td>
                    <td class="text-right mono ${r.tp !== null ? 'text-aura-green' : ''}">${num(r.tp)}</td>
                    <td class="text-right mono">${num(lot)}</td>
                    <td class="text-gray-400">${escapeHtml(r.session || '') || dash}</td>
                    <td class="text-[11px]">${disc}</td>
                    <td>${txt(r.mistakes, 'mistake')}</td>
                    <td>${txt(r.reason)}</td>
                    <td>${txt(r.notes)}</td>
                    <td>${tags}</td>
                    <td class="text-right">${thumb}</td>
                </tr>`;
            }).join('');
        }

        // ---- filters ----
        function jrSetQuery(v) { jrState.query = v || ''; jrApplyFilters(); jrRenderRows(); }
        function jrSetResult(v) { jrState.result = v || 'all'; jrApplyFilters(); jrRenderRows(); }
        function jrClearFilters() {
            jrState.query = ''; jrState.result = 'all';
            document.getElementById('jr-search').value = '';
            document.getElementById('jr-result').value = 'all';
            jrApplyFilters(); jrRenderRows();
        }

        // ==================== ENTRY POPUP (60% screenshot + annotation / 40% info) ====================
        const JR_ANN_KEY = 'tradely_journal_annotations_v1';
        const JR_SIZES = [0.0025, 0.0045, 0.008];      // stroke width as a fraction of image width
        const JR_TEXT_SIZES = [0.016, 0.024, 0.036];   // text height as a fraction of image width
        let jrAnnMap = null;
        let jrM = { idx: -1, shot: 0, tool: 'pen', color: '#ef4444', size: 1, shapes: [], undo: [], redo: [], draft: null, zoom: 1, key: '', nw: 0, nh: 0, textEl: null, erasing: false, erasePushed: false, drawing: false, statusTimer: null };

        function jrHash(s) {
            let h = 5381; const n = s.length; const step = Math.max(1, Math.floor(n / 4000));
            for (let i = 0; i < n; i += step) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
            return n + '_' + (h >>> 0).toString(36);
        }
        function jrAnnAll() {
            if (jrAnnMap) return jrAnnMap;
            try { jrAnnMap = JSON.parse(localStorage.getItem(JR_ANN_KEY) || '{}') || {}; } catch (e) { jrAnnMap = {}; }
            return jrAnnMap;
        }
        function jrStatus(msg, bad) {
            const el = document.getElementById('jr-m-status');
            if (!el) return;
            el.textContent = msg; el.style.color = bad ? '#f87171' : '#6b7280';
            clearTimeout(jrM.statusTimer);
            if (msg && !bad) jrM.statusTimer = setTimeout(() => { el.textContent = ''; }, 1800);
        }
        function jrSaveMarks() {
            if (!jrM.key) return;
            const all = jrAnnAll();
            if (jrM.shapes.length) all[jrM.key] = jrM.shapes; else delete all[jrM.key];
            try { localStorage.setItem(JR_ANN_KEY, JSON.stringify(all)); jrStatus('Marks saved'); }
            catch (e) { jrStatus('Could not save marks (storage full)', true); }
        }
        function jrCurRow() { return jrState.visible[jrM.idx] || null; }
        function jrModalOpen() { return document.getElementById('jr-modal').classList.contains('open'); }

        function jrOpen(i, shotIdx) {
            const r = jrState.visible[i];
            if (!r) return;
            jrM.idx = i; jrM.zoom = 1;
            jrState.selectedKey = r.key;
            document.querySelectorAll('#jr-rows .jr-row').forEach(tr => tr.classList.toggle('is-active', Number(tr.dataset.i) === i));
            document.getElementById('jr-modal').classList.add('open');
            jrRenderInfo(r);
            jrLoadShot(shotIdx || 0);
            renderIcons();
        }
        function jrCloseModal() {
            const modal = document.getElementById('jr-modal');
            if (!modal || !modal.classList.contains('open')) return;
            jrCancelText();
            modal.classList.remove('open');
            document.getElementById('jr-m-img').removeAttribute('src');
            const row = document.querySelector(`#jr-rows .jr-row[data-i="${jrM.idx}"]`);
            if (row) row.focus({ preventScroll: true });
        }
        function jrStepEntry(d) {
            const next = jrM.idx + d;
            if (next < 0 || next >= jrState.visible.length) return;
            jrOpen(next);
            const row = document.querySelector(`#jr-rows .jr-row[data-i="${next}"]`);
            if (row) row.scrollIntoView({ block: 'nearest' });
        }
        function jrStepShot(d) {
            const r = jrCurRow(); if (!r || r.shots.length < 2) return;
            jrLoadShot((jrM.shot + d + r.shots.length) % r.shots.length);
        }

        // ---- right pane: info ----
        function jrTile(label, value, tone) {
            return `<div class="jr-tile"><div class="jr-tile-label">${label}</div><div class="jr-tile-value mono ${tone || 'text-white'}">${value}</div></div>`;
        }
        function jrText(text) {
            return text ? `<div class="jr-text">${escapeHtml(text)}</div>` : '<div class="jr-text is-empty">Nothing noted.</div>';
        }
        function jrRenderInfo(r) {
            document.getElementById('jr-m-pos').textContent = `${jrM.idx + 1} of ${jrState.visible.length}`;
            document.getElementById('jr-m-prev').disabled = jrM.idx <= 0;
            document.getElementById('jr-m-next').disabled = jrM.idx >= jrState.visible.length - 1;
            const price = v => v === null ? '<span class="text-gray-600">—</span>' : escapeHtml(String(v));
            let tiles = '';
            if (r.kind === 'trade') {
                const rr = r.rr;
                if (rr) {
                    tiles += jrTile('R achieved', (r.achieved >= 0 ? '+' : '') + r.achieved.toFixed(2) + 'R', jrTone(r.achieved));
                    tiles += jrTile('Target R:R', '1:' + (Number(rr.targetRR) || 0));
                }
                tiles += jrTile('Entry', price(r.entry));
                tiles += jrTile('Stop loss', price(r.sl), r.sl !== null ? 'text-aura-red' : '');
                tiles += jrTile('Take profit', price(r.tp), r.tp !== null ? 'text-aura-green' : '');
                if (r.planned !== null) tiles += jrTile('Planned R:R', '1:' + r.planned.toFixed(2));
                if (rr && rr.lotSize) tiles += jrTile('Lot size', escapeHtml(String(rr.lotSize)));
                if (rr && rr.rfEnabled) tiles += jrTile('Partial close', `${Number(rr.rfLotsPct) || 0}% at ${Number(rr.rfTargetPct) || 0}% of target`);
                if (rr) tiles += jrTile('Moved to breakeven', rr.beMoved ? 'Yes' : 'No');
            } else {
                const d = r.day;
                tiles += jrTile('Trades', d.trades) + jrTile('Wins', d.wins, 'text-aura-green');
                if (d.isBin) tiles += jrTile('Losses', d.losses, 'text-aura-red') + jrTile('Refunds', d.refunds);
                else tiles += jrTile('TP', d.tp) + jrTile('SL', d.sl) + jrTile('BE', d.be);
            }
            const flag = (icon, text, cls) => `<span class="jr-flag ${cls}"><i data-lucide="${icon}" class="w-3 h-3"></i>${text}</span>`;
            const discipline = flag(r.rules ? 'check' : 'x', r.rules ? 'Followed rules' : 'Broke rules', r.rules ? 'text-aura-green' : 'text-aura-red') +
                flag(r.emotional ? 'flame' : 'check', r.emotional ? 'Emotional trade' : 'Not emotional', r.emotional ? 'text-aura-amber' : 'text-gray-400');
            const tags = r.tags.length ? `<div><div class="jr-section-title">Tags</div><div class="flex flex-wrap gap-1.5">${r.tags.map(t => `<span class="jr-tag">${escapeHtml(t)}</span>`).join('')}</div></div>` : '';
            const body = document.getElementById('jr-m-info');
            body.innerHTML = `<div class="space-y-5">
                <div>
                    <div class="flex items-center gap-2.5"><h3 class="text-xl font-bold text-white">${escapeHtml(r.pair)}</h3><span class="jr-badge ${r.result}">${r.resultLabel}</span></div>
                    <div class="text-xs text-gray-500 mt-1">${escapeHtml(jrFmtDateLong(r.dateKey))}${r.timeLabel ? ' at ' + escapeHtml(r.timeLabel) : ''}${r.session ? ' · ' + escapeHtml(r.session) + ' session' : ''}</div>
                    <div class="mono font-bold mt-3 ${jrTone(r.pnl)}" style="font-size:28px;line-height:1;">${jrMoney(r.pnl)}</div>
                </div>
                <div class="grid grid-cols-2 gap-2">${tiles}</div>
                <div><div class="jr-section-title">Mistakes</div><div class="${r.mistakes ? 'jr-mistake-box' : 'jr-note-box'}">${jrText(r.mistakes)}</div></div>
                ${r.kind === 'trade' ? `<div><div class="jr-section-title">Why I took this trade</div><div class="jr-note-box">${jrText(r.reason)}</div></div>` : ''}
                <div><div class="jr-section-title">Notes</div><div class="jr-note-box">${jrText(r.notes)}</div></div>
                <div><div class="jr-section-title">Discipline</div><div class="flex flex-wrap gap-2">${discipline}</div></div>
                ${tags}
                <button type="button" onclick="jrCloseModal(); selectCalendarAccount('${r.accId}'); switchTab('accounts-calendar')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-aura-hover border border-aura-border text-xs text-gray-300 hover:text-white hover:border-blue-500/40 transition"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>Open calendar</button>
            </div>`;
            body.scrollTop = 0;
            renderIcons();
        }

        // ---- left pane: screenshot ----
        function jrLoadShot(si) {
            const r = jrCurRow(); if (!r) return;
            jrCancelText();
            const tools = document.getElementById('jr-m-tools');
            const wrap = document.getElementById('jr-m-wrap');
            const noShot = document.getElementById('jr-m-noshot');
            const film = document.getElementById('jr-m-film');
            const multi = r.shots.length > 1;
            document.getElementById('jr-m-prevshot').style.display = multi ? 'flex' : 'none';
            document.getElementById('jr-m-nextshot').style.display = multi ? 'flex' : 'none';
            if (!r.shots.length) {
                jrM.key = ''; jrM.shapes = []; jrM.undo = []; jrM.redo = [];
                tools.classList.add('is-off'); wrap.style.display = 'none'; film.style.display = 'none'; noShot.style.display = 'flex';
                return;
            }
            tools.classList.remove('is-off'); noShot.style.display = 'none';
            jrM.shot = Math.min(Math.max(si, 0), r.shots.length - 1);
            const src = r.shots[jrM.shot].dataUrl;
            jrM.key = jrHash(src);
            jrM.shapes = (jrAnnAll()[jrM.key] || []).slice();
            jrM.undo = []; jrM.redo = []; jrM.draft = null; jrM.zoom = 1;
            jrSyncUndo();
            if (multi) {
                film.style.display = 'flex';
                film.innerHTML = r.shots.map((s, k) => `<button type="button" class="${k === jrM.shot ? 'active' : ''}" onclick="jrLoadShot(${k})" aria-label="Screenshot ${k + 1}"><img src="${escapeHtml(safeImgSrc(s.dataUrl))}" alt=""></button>`).join('');
            } else film.style.display = 'none';
            const img = document.getElementById('jr-m-img');
            wrap.style.display = 'none';
            img.onload = () => { jrM.nw = img.naturalWidth || 1600; jrM.nh = img.naturalHeight || 900; wrap.style.display = 'block'; jrFit(); };
            img.src = src;
            if (img.complete && img.naturalWidth) img.onload();
            jrUpdateCursor();
        }
        function jrFit() {
            if (!jrModalOpen() || !jrM.nw) return;
            const stage = document.getElementById('jr-m-stage');
            const wrap = document.getElementById('jr-m-wrap');
            const canvas = document.getElementById('jr-m-canvas');
            const fit = Math.min((stage.clientWidth - 24) / jrM.nw, (stage.clientHeight - 24) / jrM.nh, 2);
            const sc = Math.max(0.05, fit * jrM.zoom);
            const w = Math.max(40, Math.round(jrM.nw * sc)), h = Math.max(30, Math.round(jrM.nh * sc));
            wrap.style.width = w + 'px'; wrap.style.height = h + 'px';
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            document.getElementById('jr-m-zoom').textContent = Math.round(jrM.zoom * 100) + '%';
            jrDraw();
        }
        function jrZoom(f) {
            jrM.zoom = f === 0 ? 1 : Math.min(4, Math.max(1, jrM.zoom * f));
            jrCancelText();
            jrFit();
        }
        if (typeof ResizeObserver !== 'undefined') {
            const st = document.getElementById('jr-m-stage');
            if (st) new ResizeObserver(() => jrFit()).observe(st);
        }
        window.addEventListener('resize', () => jrFit());

        // ---- drawing ----
        function jrDrawShape(ctx, s, W, H) {
            ctx.save();
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = s.c; ctx.fillStyle = s.c;
            const lw = Math.max(1, (s.s || 0.0045) * W);
            if (s.t === 'pen') {
                ctx.lineWidth = s.hl ? lw * 5 : lw;
                if (s.hl) { ctx.globalAlpha = 0.32; ctx.lineCap = 'butt'; }
                ctx.beginPath();
                s.p.forEach((p, k) => k ? ctx.lineTo(p[0] * W, p[1] * H) : ctx.moveTo(p[0] * W, p[1] * H));
                if (s.p.length === 1) ctx.lineTo(s.p[0][0] * W + 0.01, s.p[0][1] * H);
                ctx.stroke();
            } else if (s.t === 'rect') {
                ctx.lineWidth = lw;
                ctx.strokeRect(s.a[0] * W, s.a[1] * H, (s.b[0] - s.a[0]) * W, (s.b[1] - s.a[1]) * H);
            } else if (s.t === 'ellipse') {
                ctx.lineWidth = lw;
                const cx = (s.a[0] + s.b[0]) / 2 * W, cy = (s.a[1] + s.b[1]) / 2 * H;
                const rx = Math.abs(s.b[0] - s.a[0]) / 2 * W, ry = Math.abs(s.b[1] - s.a[1]) / 2 * H;
                ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2); ctx.stroke();
            } else if (s.t === 'arrow') {
                ctx.lineWidth = lw;
                const ax = s.a[0] * W, ay = s.a[1] * H, bx = s.b[0] * W, by = s.b[1] * H;
                const ang = Math.atan2(by - ay, bx - ax), head = Math.max(lw * 4.5, W * 0.013);
                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(bx, by); ctx.lineTo(bx - head * Math.cos(ang - 0.45), by - head * Math.sin(ang - 0.45));
                ctx.moveTo(bx, by); ctx.lineTo(bx - head * Math.cos(ang + 0.45), by - head * Math.sin(ang + 0.45));
                ctx.stroke();
            } else if (s.t === 'text') {
                const fs = s.fs * W;
                ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
                ctx.textBaseline = 'top';
                ctx.lineWidth = Math.max(2, fs * 0.2); ctx.strokeStyle = 'rgba(0,0,0,.8)';
                ctx.strokeText(s.text, s.a[0] * W, s.a[1] * H);
                ctx.fillText(s.text, s.a[0] * W, s.a[1] * H);
            }
            ctx.restore();
        }
        function jrDraw() {
            const canvas = document.getElementById('jr-m-canvas');
            if (!canvas || !canvas.width) return;
            const ctx = canvas.getContext('2d');
            const dpr = canvas.width / (canvas.clientWidth || canvas.width);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const W = canvas.width, H = canvas.height;
            jrM.shapes.forEach(s => jrDrawShape(ctx, s, W, H));
            if (jrM.draft) jrDrawShape(ctx, jrM.draft, W, H);
        }

        // ---- tools ----
        function jrSetTool(t) {
            jrCancelText();
            jrM.tool = t;
            document.querySelectorAll('#jr-m-tools [data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
            jrUpdateCursor();
        }
        function jrSetColor(c) {
            jrM.color = c;
            document.querySelectorAll('#jr-m-colors [data-color]').forEach(b => b.classList.toggle('active', b.dataset.color === c));
            if (jrM.textEl) { jrM.textEl.style.color = c; jrM.textEl.focus(); }
        }
        function jrSetSize(i) {
            jrM.size = i;
            document.querySelectorAll('#jr-m-sizes [data-size]').forEach(b => b.classList.toggle('active', Number(b.dataset.size) === i));
        }
        function jrUpdateCursor() {
            const c = document.getElementById('jr-m-canvas');
            if (c) c.style.cursor = jrM.tool === 'text' ? 'text' : (jrM.tool === 'eraser' ? 'cell' : 'crosshair');
        }
        function jrSyncUndo() {
            const u = document.getElementById('jr-m-undo'), r = document.getElementById('jr-m-redo'), c = document.getElementById('jr-m-clear');
            if (u) u.disabled = !jrM.undo.length;
            if (r) r.disabled = !jrM.redo.length;
            if (c) c.disabled = !jrM.shapes.length;
        }
        function jrCommit(next) {
            jrM.undo.push(jrM.shapes); if (jrM.undo.length > 100) jrM.undo.shift();
            jrM.shapes = next; jrM.redo = [];
            jrSyncUndo(); jrDraw(); jrSaveMarks();
        }
        function jrUndo() { if (!jrM.undo.length) return; jrCancelText(); jrM.redo.push(jrM.shapes); jrM.shapes = jrM.undo.pop(); jrSyncUndo(); jrDraw(); jrSaveMarks(); }
        function jrRedo() { if (!jrM.redo.length) return; jrCancelText(); jrM.undo.push(jrM.shapes); jrM.shapes = jrM.redo.pop(); jrSyncUndo(); jrDraw(); jrSaveMarks(); }
        function jrClearMarks() { if (!jrM.shapes.length) return; jrCancelText(); jrCommit([]); }

        // ---- text tool ----
        function jrOpenText(x, y) {
            const wrap = document.getElementById('jr-m-wrap');
            const canvas = document.getElementById('jr-m-canvas');
            const input = document.createElement('input');
            input.type = 'text'; input.className = 'jr-text-input'; input.maxLength = 140; input.placeholder = 'Type, press Enter';
            const fsPx = JR_TEXT_SIZES[jrM.size] * canvas.clientWidth;
            input.style.left = (x * 100) + '%'; input.style.top = (y * 100) + '%';
            input.style.fontSize = Math.max(11, fsPx) + 'px'; input.style.color = jrM.color;
            input.dataset.x = x; input.dataset.y = y;
            input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); jrCommitText(); } else if (e.key === 'Escape') { e.stopPropagation(); jrCancelText(); } });
            input.addEventListener('blur', () => setTimeout(jrCommitText, 0));
            wrap.appendChild(input);
            jrM.textEl = input;
            input.focus();
            setTimeout(() => { if (jrM.textEl === input) input.focus(); }, 0);
        }
        function jrCommitText() {
            const el = jrM.textEl; if (!el) return;
            jrM.textEl = null;
            const text = el.value.trim();
            const x = Number(el.dataset.x), y = Number(el.dataset.y), color = el.style.color;
            el.remove();
            if (!text) return;
            jrCommit(jrM.shapes.concat([{ t: 'text', c: jrColorHex(color), fs: JR_TEXT_SIZES[jrM.size], a: [x, y], text }]));
        }
        function jrColorHex(c) { return jrM.color; }
        function jrCancelText() { const el = jrM.textEl; if (!el) return; jrM.textEl = null; el.remove(); }

        // ---- pointer handling ----
        function jrPt(e) {
            const c = document.getElementById('jr-m-canvas'); const b = c.getBoundingClientRect();
            return [Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))];
        }
        function jrHit(s, px, py, W, H, tol) {
            const P = p => [p[0] * W, p[1] * H];
            const dseg = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)); };
            if (s.t === 'pen') {
                const t2 = tol + (s.hl ? (s.s || 0.0045) * W * 2.5 : 0);
                if (s.p.length === 1) return Math.hypot(px - s.p[0][0] * W, py - s.p[0][1] * H) <= t2;
                for (let i = 1; i < s.p.length; i++) if (dseg(P(s.p[i - 1]), P(s.p[i])) <= t2) return true;
                return false;
            }
            if (s.t === 'arrow') return dseg(P(s.a), P(s.b)) <= tol;
            if (s.t === 'rect') {
                const a = P(s.a), b = P(s.b), c1 = [b[0], a[1]], c2 = [a[0], b[1]];
                return [[a, c1], [c1, b], [b, c2], [c2, a]].some(([m, n]) => dseg(m, n) <= tol);
            }
            if (s.t === 'ellipse') {
                const cx = (s.a[0] + s.b[0]) / 2 * W, cy = (s.a[1] + s.b[1]) / 2 * H;
                const rx = Math.max(1, Math.abs(s.b[0] - s.a[0]) / 2 * W), ry = Math.max(1, Math.abs(s.b[1] - s.a[1]) / 2 * H);
                const d = Math.abs(Math.hypot((px - cx) / rx, (py - cy) / ry) - 1) * Math.min(rx, ry);
                return d <= tol;
            }
            if (s.t === 'text') {
                const ctx = document.getElementById('jr-m-canvas').getContext('2d');
                const fs = s.fs * W; ctx.save(); ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
                const w = ctx.measureText(s.text).width; ctx.restore();
                const x0 = s.a[0] * W, y0 = s.a[1] * H;
                return px >= x0 - tol && px <= x0 + w + tol && py >= y0 - tol && py <= y0 + fs * 1.25 + tol;
            }
            return false;
        }
        function jrEraseAt(e) {
            const c = document.getElementById('jr-m-canvas'); const b = c.getBoundingClientRect();
            const px = (e.clientX - b.left) * (c.width / b.width), py = (e.clientY - b.top) * (c.height / b.height);
            const tol = c.width * 0.012;
            for (let i = jrM.shapes.length - 1; i >= 0; i--) {
                if (jrHit(jrM.shapes[i], px, py, c.width, c.height, tol)) {
                    if (!jrM.erasePushed) { jrM.undo.push(jrM.shapes); jrM.redo = []; jrM.erasePushed = true; }
                    jrM.shapes = jrM.shapes.filter((_, k) => k !== i);
                    jrSyncUndo(); jrDraw();
                    return;
                }
            }
        }
        (function jrBindCanvas() {
            const c = document.getElementById('jr-m-canvas'); if (!c) return;
            c.addEventListener('pointerdown', e => {
                if (e.button !== undefined && e.button !== 0) return;
                if (jrM.textEl) { jrCommitText(); return; }
                const [x, y] = jrPt(e);
                if (jrM.tool === 'text') { e.preventDefault(); jrOpenText(x, y); return; }
                c.setPointerCapture(e.pointerId);
                jrM.drawing = true;
                if (jrM.tool === 'eraser') { jrM.erasing = true; jrM.erasePushed = false; jrEraseAt(e); return; }
                const base = { c: jrM.color, s: JR_SIZES[jrM.size] };
                if (jrM.tool === 'pen') jrM.draft = Object.assign({ t: 'pen', p: [[x, y]] }, base);
                else if (jrM.tool === 'hl') jrM.draft = Object.assign({ t: 'pen', hl: true, p: [[x, y]] }, base);
                else jrM.draft = Object.assign({ t: jrM.tool, a: [x, y], b: [x, y] }, base);
                jrDraw();
            });
            c.addEventListener('pointermove', e => {
                if (!jrM.drawing) return;
                if (jrM.erasing) { jrEraseAt(e); return; }
                if (!jrM.draft) return;
                const p = jrPt(e);
                if (jrM.draft.t === 'pen') jrM.draft.p.push(p); else jrM.draft.b = p;
                jrDraw();
            });
            const end = e => {
                if (!jrM.drawing) return;
                jrM.drawing = false;
                if (jrM.erasing) { jrM.erasing = false; if (jrM.erasePushed) jrSaveMarks(); return; }
                const d = jrM.draft; jrM.draft = null;
                if (!d) return;
                if (d.t !== 'pen') {
                    const w = Math.abs(d.b[0] - d.a[0]) * c.width, h = Math.abs(d.b[1] - d.a[1]) * c.height;
                    if (Math.hypot(w, h) < c.width * 0.008) { jrDraw(); return; }
                }
                jrCommit(jrM.shapes.concat([d]));
            };
            c.addEventListener('pointerup', end);
            c.addEventListener('pointercancel', end);
        })();

        // ---- download with marks ----
        function jrDownload() {
            const r = jrCurRow(); if (!r || !r.shots.length) return;
            const img = document.getElementById('jr-m-img');
            if (!img.naturalWidth) return;
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            const ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0);
            jrM.shapes.forEach(s => jrDrawShape(ctx, s, cv.width, cv.height));
            const a = document.createElement('a');
            a.download = `${(r.pair || 'trade').replace(/[^\w-]+/g, '_')}_${r.dateKey}.png`;
            a.href = cv.toDataURL('image/png');
            document.body.appendChild(a); a.click(); a.remove();
        }

        // ---- keyboard ----
        document.addEventListener('keydown', e => {
            if (!jrModalOpen()) return;
            const typing = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ''));
            if (e.key === 'Escape') { if (jrM.textEl) jrCancelText(); else jrCloseModal(); return; }
            if (typing) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? jrRedo() : jrUndo(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); jrStepEntry(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); jrStepEntry(-1); }
            else if (e.key === 'ArrowLeft') { jrStepShot(-1); }
            else if (e.key === 'ArrowRight') { jrStepShot(1); }
        });

        // ==================== CROSS-FILE TAB ROUTER ====================
        // Chooses which tab to show on load: the URL hash if present (e.g. tradely.html#accounts-journal),
        // otherwise this file's default tab. Keeps deep-links working across the split files.

        // ==================== PAGE LOADER ====================
        // Shown instantly on boot (inline style avoids a flash before Tailwind parses classes),
        // faded out once this page's default/deep-linked tab has rendered.


        /* ==================== SHARED DATE-RANGE PICKER (Stats, Overview, Journal, Sessions, Forex stats) ==================== */
        // Every page keeps its own { from, to } ('YYYY-MM-DD' or '') on its state object; a range is active when either is set.
        function rgScope(id) {
            switch (id) {
                case 'ov':  return { s: ovState, render: () => renderOverview() };
                case 'ses': return { s: sesState, render: () => renderSessions() };
                case 'st':  return { s: statsState, render: () => renderStats() };
                case 'jr':  return { s: jrState, render: () => renderJournal() };
                case 'fx':  return { s: fxAcc, render: () => renderFxStats() };
            }
            return null;
        }
        function rgActive(st) { return !!(st && (st.from || st.to)); }
        function rgLabel(from, to) {
            if (from && to) return from === to ? jrFmtDate(from) : jrFmtDate(from) + ' – ' + jrFmtDate(to);
            if (from) return 'From ' + jrFmtDate(from);
            if (to) return 'Until ' + jrFmtDate(to);
            return '';
        }
        // Returns {from,to} ('' = open ended) when a custom range is on, otherwise null
        function rgBounds(st) { return rgActive(st) ? { from: st.from || '', to: st.to || '' } : null; }
        const RG_ICON = '<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
        // sizeCls: padding/font classes · onCls / offCls: colours when the custom range is on / off · offText: label when no range
        function rgBtn(scope, sizeCls, onCls, offCls, offText) {
            const st = rgScope(scope).s, on = rgActive(st);
            return `<button type="button" data-rg-btn="${scope}" onclick="rgOpen('${scope}', this)" title="Pick any From / To date" class="inline-flex items-center gap-1.5 whitespace-nowrap transition ${sizeCls} ${on ? onCls : offCls}">${RG_ICON}<span>${on ? escapeHtml(rgLabel(st.from, st.to)) : (offText || 'Custom')}</span>${on ? `<span onclick="event.stopPropagation(); rgClear('${scope}')" title="Clear date range" class="ml-0.5 px-1 rounded hover:bg-white/20 leading-none">✕</span>` : ''}</button>`;
        }
        let _rgScope = null;
        function rgEl() {
            let el = document.getElementById('rg-pop');
            if (!el) { el = document.createElement('div'); el.id = 'rg-pop'; el.className = 'fixed hidden'; el.style.zIndex = '80'; document.body.appendChild(el); }
            return el;
        }
        function rgPresets() {
            const k = toDateKey, now = new Date(), ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
            return [
                ['Today', k(now), k(now)], ['Yesterday', k(ago(1)), k(ago(1))],
                ['Last 7 days', k(ago(6)), k(now)], ['Last 30 days', k(ago(29)), k(now)],
                ['This month', k(new Date(now.getFullYear(), now.getMonth(), 1)), k(now)],
                ['Last month', k(new Date(now.getFullYear(), now.getMonth() - 1, 1)), k(new Date(now.getFullYear(), now.getMonth(), 0))],
                ['This year', now.getFullYear() + '-01-01', k(now)]
            ];
        }
        function rgOpen(scope, btn) {
            const pop = rgEl();
            if (_rgScope === scope && !pop.classList.contains('hidden')) { rgClose(); return; }
            _rgScope = scope;
            const st = rgScope(scope).s;
            const inp = 'mt-1 w-full bg-aura-bg border border-aura-border rounded-md px-2.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60';
            pop.innerHTML = `<div class="rounded-xl border border-aura-border shadow-2xl p-4 space-y-3" style="background:#14161f;width:310px;max-width:calc(100vw - 16px);">
                <div class="flex items-center justify-between"><div class="text-sm font-bold text-white">Select date range</div><button type="button" onclick="rgClose()" class="text-gray-300 hover:text-white text-sm leading-none px-1">✕</button></div>
                <div class="flex flex-wrap gap-1.5">${rgPresets().map(([l, f, t]) => `<button type="button" onclick="rgApply('${scope}','${f}','${t}')" class="px-2.5 py-1 rounded-md text-xs font-medium border border-aura-border bg-aura-bg text-gray-200 hover:text-white hover:border-blue-500/50 transition">${l}</button>`).join('')}</div>
                <div class="grid grid-cols-2 gap-2.5">
                    <label class="block"><span class="text-xs font-semibold text-gray-300">From</span><input id="rg-from" type="date" value="${st.from || ''}" class="${inp}" style="color-scheme:dark;"></label>
                    <label class="block"><span class="text-xs font-semibold text-gray-300">To</span><input id="rg-to" type="date" value="${st.to || ''}" class="${inp}" style="color-scheme:dark;"></label>
                </div>
                <div id="rg-err" class="hidden text-xs text-aura-red"></div>
                <div class="flex items-center justify-between pt-1">
                    <button type="button" onclick="rgClear('${scope}')" class="px-3 py-1.5 rounded-md text-xs font-medium text-gray-300 hover:bg-aura-hover transition">Clear range</button>
                    <button type="button" onclick="rgApplyInputs()" class="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-600/20">Apply</button>
                </div></div>`;
            pop.classList.remove('hidden');
            const r = btn.getBoundingClientRect(), w = pop.firstElementChild.offsetWidth, vw = window.innerWidth, vh = window.innerHeight;
            let left = Math.min(Math.max(8, r.right - w), Math.max(8, vw - w - 8));
            let top = r.bottom + 6; if (top + pop.offsetHeight > vh - 8) top = Math.max(8, r.top - pop.offsetHeight - 6);
            pop.style.left = left + 'px'; pop.style.top = top + 'px';
            pop.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); rgApplyInputs(); } };
            setTimeout(() => { const f = document.getElementById('rg-from'); if (f) f.focus(); }, 30);
        }
        function rgClose() { const pop = document.getElementById('rg-pop'); if (pop) pop.classList.add('hidden'); _rgScope = null; }
        function rgApply(scope, from, to) {
            const sc = rgScope(scope); if (!sc) return;
            sc.s.from = from || ''; sc.s.to = to || '';
            rgClose(); sc.render();
        }
        function rgApplyInputs() {
            const f = (document.getElementById('rg-from') || {}).value || '', t = (document.getElementById('rg-to') || {}).value || '';
            const err = document.getElementById('rg-err');
            const bad = !f && !t ? 'Pick at least one date.' : (f && t && f > t ? '"From" date must be on or before the "To" date.' : '');
            if (bad) { err.textContent = bad; err.classList.remove('hidden'); return; }
            rgApply(_rgScope, f, t);
        }
        function rgClear(scope) { rgApply(scope, '', ''); }
        document.addEventListener('mousedown', e => {
            const pop = document.getElementById('rg-pop');
            if (pop && !pop.classList.contains('hidden') && !pop.contains(e.target) && !e.target.closest('[data-rg-btn]')) rgClose();
        });
        window.addEventListener('keydown', e => { if (e.key === 'Escape' && _rgScope) { e.stopPropagation(); rgClose(); } }, true);
        window.addEventListener('resize', () => rgClose());

        /* ==================== STATS: combined view of any mix of Forex + Binary accounts ==================== */
        let statsState = { ids: null, period: 'all', from: '', to: '', month: new Date(), selDay: null, eq: null, bar: null };
        const ST_PERIODS = [['all', 'All time'], ['month', 'This month'], ['30d', '30 days'], ['7d', '7 days']];
        const stMoney = n => (n > 0 ? '+' : '') + formatMoney(n);
        const stTone = n => n > 0 ? 'text-aura-green' : (n < 0 ? 'text-aura-red' : 'text-white');
        function stAccs() {
            const all = jrAllAccounts();
            if (statsState.ids === null) statsState.ids = all.map(a => a.id);
            statsState.ids = statsState.ids.filter(id => all.some(a => a.id === id));
            return statsState.ids.map(id => all.find(a => a.id === id));
        }
        function stSet(ids) { statsState.ids = ids; statsState.selDay = null; stRenderMenu(); renderStats(); }
        function stToggle(id) { const c = statsState.ids.slice(); const i = c.indexOf(id); if (i >= 0) c.splice(i, 1); else c.push(id); stSet(c); }
        function stQuick(kind) { const all = jrAllAccounts(); stSet(all.filter(a => kind === 'all' || (kind === 'binary') === (a.category === 'binary')).map(a => a.id)); }
        function stSetPeriod(p) { statsState.period = p; statsState.from = statsState.to = ''; renderStats(); }
        function stPeriodLabel() { return rgActive(statsState) ? rgLabel(statsState.from, statsState.to) : ST_PERIODS.find(p => p[0] === statsState.period)[1]; }
        function stToggleMenu(e) { if (e) e.stopPropagation(); const m = document.getElementById('st-acc-menu'); if (m.classList.contains('hidden')) { stRenderMenu(); m.classList.remove('hidden'); } else m.classList.add('hidden'); }
        document.addEventListener('click', e => { const m = document.getElementById('st-acc-menu'); if (m && !m.classList.contains('hidden') && !e.target.closest('#st-acc-wrap')) m.classList.add('hidden'); });
        function stRenderMenu() {
            const menu = document.getElementById('st-acc-menu'), keep = menu.scrollTop, sel = statsState.ids || [];
            const { forex, binary } = jrAccountList();
            const grp = (t, l) => !l.length ? '' : `<div class="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-gray-500">${t}</div>` + l.map(a => {
                const m = jrAccMeta(a), on = sel.includes(a.id);
                return `<button type="button" onclick="stToggle('${a.id}')" class="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-aura-hover ${on ? 'bg-aura-hover' : ''}">
                    <span class="w-4 h-4 rounded border shrink-0 flex items-center justify-center ${on ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600'}">${on ? '✓' : ''}</span>
                    <span class="flex flex-col min-w-0 flex-1"><span class="text-white font-semibold truncate">${escapeHtml(m.name)}</span><span class="text-gray-500 text-[10px] mono truncate">${escapeHtml(m.sub)}</span></span>
                    <span class="text-[9px] mono font-bold px-1.5 py-0.5 rounded border ${m.tagCls}">${m.tag}</span></button>`;
            }).join('');
            menu.innerHTML = (forex.length || binary.length ? grp('Forex · MT5 accounts', forex) + grp('Binary accounts', binary) : '<div class="px-3 py-3 text-[11px] text-gray-500">No accounts yet.</div>');
            menu.scrollTop = keep;
        }
        function stDay(e, isBin) {
            let trades = Number(e.trades) || 0, wins = Number(e.wins) || 0;
            if (!isBin && Array.isArray(e.tradeLogs) && e.tradeLogs.length) { trades = e.tradeLogs.length; wins = e.tradeLogs.filter(t => t.outcome === 'tp').length; }
            return { pnl: Number(e.pnl) || 0, trades, wins };
        }
        function stRange() {
            const now = new Date(), p = statsState.period;
            if (rgActive(statsState)) return [statsState.from || '0000', statsState.to || '9999'];
            if (p === 'month') return [toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), '9999'];
            if (p === '30d' || p === '7d') { const d = new Date(); d.setDate(d.getDate() - (p === '30d' ? 29 : 6)); return [toDateKey(d), '9999']; }
            return ['0000', '9999'];
        }
        function stCompute(accs) {
            const [from, to] = stRange();
            const per = [], days = {}, seen = new Set();
            let start = 0, dep = 0, wd = 0, allPnl = 0;
            accs.forEach(a => {
                const isBin = a.category === 'binary', ent = jrLoadEntries(a, isBin), meta = jrAccMeta(a);
                const sb = Number(isBin ? a.startingBalance : (a.mt5 ? a.mt5.size : a.startingBalance)) || 0;
                const sid = isBin ? a.id : (a.mt5Id || a.id);
                if (!seen.has(sid)) { seen.add(sid); start += sb; }
                let pnlAll = 0, pnl = 0, trades = 0, wins = 0;
                Object.keys(ent).forEach(k => {
                    if (!ent[k]) return;
                    const d = stDay(ent[k], isBin); pnlAll += d.pnl;
                    const x = days[k] || (days[k] = { pnl: 0, trades: 0, wins: 0, by: [] });
                    x.pnl += d.pnl; x.trades += d.trades; x.wins += d.wins; x.by.push({ name: meta.name, pnl: d.pnl, trades: d.trades });
                    if (k >= from && k <= to) { pnl += d.pnl; trades += d.trades; wins += d.wins; }
                });
                if (isBin) baLoadFunds(a.id).forEach(f => { if (f.type === 'deposit') dep += Number(f.amount) || 0; else if (f.type === 'withdraw') wd += Number(f.amount) || 0; });
                allPnl += pnlAll;
                per.push({ a, meta, isBin, sb, pnlAll, pnl, trades, wins });
            });
            const keys = Object.keys(days).sort(), inR = keys.filter(k => k >= from && k <= to);
            let pnl = 0, trades = 0, wins = 0, winD = 0, lossD = 0, gp = 0, gl = 0, best = null, worst = null;
            inR.forEach(k => {
                const d = days[k]; pnl += d.pnl; trades += d.trades; wins += d.wins;
                if (d.pnl > 2) { winD++; gp += d.pnl; } else if (d.pnl < -2) { lossD++; gl += d.pnl; }
                if (!best || d.pnl > best.pnl) best = { k, pnl: d.pnl };
                if (!worst || d.pnl < worst.pnl) worst = { k, pnl: d.pnl };
            });
            let run = start, peak = start, mdd = 0; const curve = [{ k: 'Start', v: start }];
            keys.forEach(k => { run += days[k].pnl; peak = Math.max(peak, run); mdd = Math.max(mdd, peak - run); curve.push({ k, v: run }); });
            let streak = 0, type = null;
            for (let i = inR.length - 1; i >= 0; i--) { const b = getPnlBand(days[inR[i]].pnl); if (b === 'be') break; if (!type) { type = b; streak = 1; } else if (b === type) streak++; else break; }
            return { per, days, keys, inR, start, current: start + allPnl, allPnl, dep, wd, pnl, trades, wins, winD, lossD, gp, gl, best, worst, curve, mdd, streak, type,
                     pf: gl < 0 ? gp / Math.abs(gl) : (gp > 0 ? Infinity : 0) };
        }
        function stCard(label, value, sub, tone) {
            return `<div class="glass-card rounded-xl border border-aura-border p-4"><div class="text-[11px] text-gray-500">${label}</div>
                <div class="text-lg font-bold mono mt-1 ${tone || 'text-white'}">${value}</div>${sub ? `<div class="text-[10px] text-gray-500 mt-0.5">${sub}</div>` : ''}</div>`;
        }
        function renderStats() {
            const accs = stAccs();
            document.getElementById('st-acc-label').innerText = !accs.length ? 'Select accounts' : (accs.length === jrAllAccounts().length ? 'All accounts' : accs.length + ' account' + (accs.length > 1 ? 's' : ''));
            const qb = (k, t) => `<button type="button" onclick="stQuick('${k}')" class="px-2 py-1 rounded text-[11px] text-gray-400 hover:text-white hover:bg-aura-hover transition">${t}</button>`;
            document.getElementById('st-quick').innerHTML = qb('all', 'All') + qb('forex', 'Forex only') + qb('binary', 'Binary only');
            document.getElementById('st-periods').innerHTML = ST_PERIODS.map(([k, t]) => `<button type="button" onclick="stSetPeriod('${k}')" class="px-2.5 py-1 rounded text-[11px] font-semibold transition ${statsState.period === k && !rgActive(statsState) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}">${t}</button>`).join('') + rgBtn('st', 'px-2.5 py-1 rounded text-[11px] font-semibold', 'bg-blue-600 text-white', 'text-gray-400 hover:text-white', 'Custom');
            const body = document.getElementById('st-body');
            if (statsState.eq) { statsState.eq.destroy(); statsState.eq = null; }
            if (statsState.bar) { statsState.bar.destroy(); statsState.bar = null; }
            document.getElementById('page-subtitle').innerText = accs.length ? `${accs.length} account${accs.length > 1 ? 's' : ''} · combined` : 'No account selected';
            if (!accs.length) {
                body.innerHTML = `<div class="glass-card rounded-xl border border-aura-border p-10 text-center"><i data-lucide="bar-chart-3" class="w-8 h-8 text-gray-600 mx-auto mb-3"></i><p class="text-sm text-white font-semibold">Select accounts to see combined stats</p><p class="text-xs text-gray-500 mt-1">Mix Forex (MT5) and Binary accounts freely.</p></div>`;
                renderIcons(); return;
            }
            const S = stCompute(accs), ret = S.start ? (S.allPnl / S.start) * 100 : 0;
            const wr = S.trades ? (S.wins / S.trades) * 100 : null;
            const fx = S.per.filter(p => !p.isBin).reduce((s, p) => s + p.pnl, 0), bn = S.per.filter(p => p.isBin).reduce((s, p) => s + p.pnl, 0);
            const hero = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="glass-card rounded-xl border border-aura-border p-5"><div class="text-[11px] text-gray-500">Current balance (all accounts)</div><div class="text-3xl font-bold mono mt-2 text-white">${formatMoney(S.current)}</div><div class="text-[11px] mt-1 ${stTone(ret)} mono">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}% since start</div></div>
                <div class="glass-card rounded-xl border border-aura-border p-5"><div class="text-[11px] text-gray-500">Starting balance (sum)</div><div class="text-3xl font-bold mono mt-2 text-white">${formatMoney(S.start)}</div><div class="text-[11px] mt-1 text-gray-500">${accs.length} account${accs.length > 1 ? 's' : ''} combined</div></div>
                <div class="glass-card rounded-xl border border-aura-border p-5"><div class="text-[11px] text-gray-500">Net P&amp;L · ${stPeriodLabel()}</div><div class="text-3xl font-bold mono mt-2 ${stTone(S.pnl)}">${stMoney(S.pnl)}</div><div class="text-[11px] mt-1 text-gray-500 mono">Forex <span class="${stTone(fx)}">${stMoney(fx)}</span> · Binary <span class="${stTone(bn)}">${stMoney(bn)}</span></div></div></div>`;
            const cards = `<div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                ${stCard('Win rate', wr === null ? '—' : wr.toFixed(1) + '%', `${S.wins} wins / ${S.trades} trades`)}
                ${stCard('Profit factor', S.pf === Infinity ? '∞' : S.pf.toFixed(2), 'Day-based')}
                ${stCard('Traded days', S.inR.length, `${S.winD} green · ${S.lossD} red`)}
                ${stCard('Avg daily P&L', S.inR.length ? stMoney(S.pnl / S.inR.length) : '—', '', S.inR.length ? stTone(S.pnl) : '')}
                ${stCard('Best day', S.best ? stMoney(S.best.pnl) : '—', S.best ? jrFmtDate(S.best.k) : '', 'text-aura-green')}
                ${stCard('Worst day', S.worst ? stMoney(S.worst.pnl) : '—', S.worst ? jrFmtDate(S.worst.k) : '', 'text-aura-red')}
                ${stCard('Max drawdown', S.mdd ? '-' + formatMoney(S.mdd) : '—', 'Combined equity', S.mdd ? 'text-aura-red' : '')}
                ${stCard('Current streak', S.streak ? S.streak + (S.type === 'profit' ? ' green' : ' red') : '—', 'Combined days', S.type === 'profit' ? 'text-aura-green' : (S.type === 'loss' ? 'text-aura-red' : ''))}
                ${stCard('Total trades', S.trades, 'In period')}
                ${stCard('Deposits', S.dep ? formatMoney(S.dep) : '—', 'Binary accounts')}
                ${stCard('Withdrawals', S.wd ? formatMoney(S.wd) : '—', 'Binary accounts')}
                ${stCard('All-time P&L', stMoney(S.allPnl), '', stTone(S.allPnl))}</div>`;
            const charts = `<div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div class="glass-card rounded-xl border border-aura-border p-4 xl:col-span-2"><div class="text-xs font-semibold text-white mb-3">Combined equity curve</div><div style="height:240px"><canvas id="st-eq"></canvas></div></div>
                <div class="glass-card rounded-xl border border-aura-border p-4"><div class="text-xs font-semibold text-white mb-3">P&amp;L by account</div><div style="height:240px"><canvas id="st-bar"></canvas></div></div></div>`;
            const rows = S.per.map(p => `<tr class="border-t border-aura-border"><td class="px-3 py-2 text-white font-semibold">${escapeHtml(p.meta.name)}</td>
                <td class="px-3 py-2"><span class="text-[9px] mono font-bold px-1.5 py-0.5 rounded border ${p.meta.tagCls}">${p.meta.tag}</span></td>
                <td class="px-3 py-2 text-right mono">${formatMoney(p.sb)}</td><td class="px-3 py-2 text-right mono ${stTone(p.pnlAll)}">${stMoney(p.pnlAll)}</td>
                <td class="px-3 py-2 text-right mono text-white">${formatMoney(p.sb + p.pnlAll)}</td><td class="px-3 py-2 text-right mono">${p.trades ? ((p.wins / p.trades) * 100).toFixed(0) + '%' : '—'}</td></tr>`).join('');
            const table = `<div class="glass-card rounded-xl border border-aura-border overflow-hidden"><div class="px-4 py-3 text-xs font-semibold text-white">Accounts breakdown</div><div class="overflow-x-auto"><table class="w-full text-xs">
                <thead><tr class="text-gray-500 text-left"><th class="px-3 py-2 font-semibold">Account</th><th class="px-3 py-2 font-semibold">Type</th><th class="px-3 py-2 font-semibold text-right">Starting</th><th class="px-3 py-2 font-semibold text-right">P&amp;L</th><th class="px-3 py-2 font-semibold text-right">Balance</th><th class="px-3 py-2 font-semibold text-right">Win rate</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
            body.innerHTML = hero + cards + charts + `<div id="st-cal"></div>` + table;
            stRenderCalendar(S);
            const grid = '#1f2430', tick = '#6b7280';
            statsState.eq = new Chart(document.getElementById('st-eq'), { type: 'line', data: { labels: S.curve.map(c => c.k === 'Start' ? 'Start' : jrFmtDate(c.k)), datasets: [{ data: S.curve.map(c => c.v), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.12)', fill: true, tension: .25, pointRadius: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tick, maxTicksLimit: 8 }, grid: { color: grid } }, y: { ticks: { color: tick }, grid: { color: grid } } } } });
            statsState.bar = new Chart(document.getElementById('st-bar'), { type: 'bar', data: { labels: S.per.map(p => p.meta.name), datasets: [{ data: S.per.map(p => p.pnlAll), backgroundColor: S.per.map(p => p.pnlAll >= 0 ? '#10b981' : '#ef4444'), borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tick }, grid: { display: false } }, y: { ticks: { color: tick }, grid: { color: grid } } } } });
            renderIcons();
        }
        function stShiftMonth(d) { statsState.month = new Date(statsState.month.getFullYear(), statsState.month.getMonth() + d, 1); statsState.selDay = null; renderStats(); }
        function stPickDay(k) { statsState.selDay = statsState.selDay === k ? null : k; renderStats(); }
        function stRenderCalendar(S) {
            const y = statsState.month.getFullYear(), m = statsState.month.getMonth(), dim = new Date(y, m + 1, 0).getDate();
            const lead = (new Date(y, m, 1).getDay() + 6) % 7, today = toDateKey(new Date());
            let mPnl = 0, mDays = 0, cells = '', wk = 0, wkT = 0, count = 0;
            const flush = () => { cells += `<div class="rounded-lg p-2 text-right mono ${wkT ? '' : 'opacity-40'}" style="background:#0d0f16;"><div class="text-[9px] text-gray-500">Week</div><div class="text-[11px] font-semibold ${stTone(wk)}">${wkT ? stMoney(wk) : '—'}</div></div>`; wk = 0; wkT = 0; };
            for (let i = 0; i < lead; i++) { cells += '<div></div>'; count++; }
            for (let d = 1; d <= dim; d++) {
                const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, x = S.days[k];
                if (x) { mPnl += x.pnl; mDays++; wk += x.pnl; wkT++; }
                const band = x ? getPnlBand(x.pnl) : null;
                const bg = band === 'profit' ? 'rgba(16,185,129,.14)' : band === 'loss' ? 'rgba(239,68,68,.14)' : x ? 'rgba(107,114,128,.14)' : '#0d0f16';
                const bd = statsState.selDay === k ? '#3b82f6' : (k === today ? '#4b5563' : '#1f2430');
                cells += `<button type="button" ${x ? `onclick="stPickDay('${k}')"` : 'disabled'} class="st-cell rounded-lg p-2 text-left border min-h-[64px]" style="background:${bg};border-color:${bd};">
                    <div class="text-[10px] text-gray-400">${d}</div>${x ? `<div class="text-[12px] font-semibold mono mt-1 ${stTone(x.pnl)}">${stMoney(x.pnl)}</div><div class="text-[9px] text-gray-500">${x.trades} trade${x.trades === 1 ? '' : 's'}</div>` : ''}</button>`;
                count++;
                if (count % 8 === 7) { flush(); count++; }
            }
            if (wkT || count % 8 !== 0) { while (count % 8 !== 7) { cells += '<div></div>'; count++; } flush(); }
            const sel = statsState.selDay && S.days[statsState.selDay];
            const detail = sel ? `<div class="mt-4 rounded-lg border border-aura-border p-3"><div class="flex justify-between text-xs mb-2"><span class="text-white font-semibold">${escapeHtml(jrFmtDateLong(statsState.selDay))}</span><span class="mono font-semibold ${stTone(sel.pnl)}">${stMoney(sel.pnl)}</span></div>
                ${sel.by.map(b => `<div class="flex justify-between text-[11px] py-1 border-t border-aura-border"><span class="text-gray-300">${escapeHtml(b.name)} <span class="text-gray-600">· ${b.trades} trades</span></span><span class="mono ${stTone(b.pnl)}">${stMoney(b.pnl)}</span></div>`).join('')}</div>` : '';
            document.getElementById('st-cal').innerHTML = `<div class="glass-card rounded-xl border border-aura-border p-4">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2"><div class="flex items-center gap-2"><button type="button" onclick="stShiftMonth(-1)" class="w-7 h-7 rounded-md border border-aura-border text-gray-400 hover:text-white">‹</button>
                <div class="text-sm font-bold text-white w-36 text-center">${CALENDAR_MONTH_NAMES[m]} ${y}</div><button type="button" onclick="stShiftMonth(1)" class="w-7 h-7 rounded-md border border-aura-border text-gray-400 hover:text-white">›</button></div>
                <div class="text-xs mono text-gray-500">Combined month P&amp;L <span class="font-bold ${stTone(mPnl)}">${stMoney(mPnl)}</span> · ${mDays} traded day${mDays === 1 ? '' : 's'}</div></div>
                <div class="grid gap-1.5" style="grid-template-columns:repeat(7,minmax(0,1fr)) 78px;">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', ''].map(h => `<div class="text-[10px] text-gray-500 text-center pb-1">${h}</div>`).join('')}${cells}</div>${detail}</div>`;
        }

        function hidePageLoader() {
            const loader = document.getElementById('page-loader');
            if (!loader) return;
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none';
            setTimeout(() => { loader.style.display = 'none'; }, 320);
        }
        // Used by cross-section nav links (Accounts / Charts / Terminal) so switching feels like
        // one smooth app transition instead of an abrupt reload flash.


        function goTo(url, label) {
            // If the link points at the file we're already on, just switch tabs locally
            // instead of reloading — re-navigating to the exact same file:// URL is blocked
            // by some browsers as an "unsafe navigation" and would otherwise throw a console error.
            const [targetFile, targetHash] = url.split('#');
            const currentFile = location.pathname.split('/').pop();
            if (!targetFile || targetFile === currentFile) {
                if (targetHash) {
                    history.replaceState(null, '', '#' + targetHash);
                    switchTab(targetHash);
                }
                return;
            }
            const loader = document.getElementById('page-loader');
            if (loader) {
                const labelEl = document.getElementById('page-loader-label');
                if (labelEl && label) labelEl.innerText = label;
                loader.style.display = 'flex';
                requestAnimationFrame(() => { loader.style.opacity = '1'; loader.style.pointerEvents = 'auto'; });
            }
            setTimeout(() => { window.location.href = url; }, 180);
        }
        window.addEventListener('load', function() {
            var hashTab = location.hash ? location.hash.substring(1) : '';
            switchTab(hashTab || 'accounts-overview');
            requestAnimationFrame(() => requestAnimationFrame(hidePageLoader));
        });
    
