# Tradely Suite

Pages: `tradely.html` (Accounts) and `terminal.html` (Terminal, Settings). The Charts page was removed.

## Important: keep everything in one folder, one origin
- Keep all three HTML files **and** the `css/`, `js/`, `vendor/` folders together in the **same folder**.
- The pages link to each other (`goTo('tradely.html#...')`) and share data through the browser's
  `localStorage`. This only works when every page is opened from the same folder and the same origin
  (for example all via `file://` in one browser, or all served from one local server such as
  `python3 -m http.server`). Opening a page in a different browser or from a different address
  will show different (empty) data.
- Tailwind is still loaded from its CDN, so an internet connection is needed on first load.

## Structure
- `vendor/` - lucide, Chart.js (no longer loaded from a CDN)
- `css/` - page styles and the shared calculator
- `js/shared.js` - Tailwind config, `escapeHtml`, `safeImgSrc`, `TradelyStore` (safe storage layer)
- `js/*-app.js`, `tradely-*.js`, `terminal-*.js` - page code, split by feature

## Security notes
- All user-written text (account name, nickname, owner, email, ID, notes, provider names, API errors)
  goes through the single `escapeHtml` in `shared.js` before it is placed in `innerHTML`.
- Image `src` values (screenshots, certificates) go through `safeImgSrc`, which only allows
  `data:image/`, `blob:` and `http(s)` URLs.

## Payout features (Phase 2)
- Payout history list per funded account: date, amount, cycle length, total paid, and an undo for the last payout.
- Dashboard alerts on the Accounts page: payout ready, and an inactivity warning once 70% of the limit has passed (plus one toast per account per day).
- Payout planner compares the same payout over 7, 14 and 30 days.
- Eligibility now also checks the consistency rule (best day share of the cycle's profit) and the minimum payout amount ($, your share).
- New account setting: Min Payout Amount ($), also shown on the Rules page and in compare mode.

## Rules page and templates (Phase 3)
- Compare mode has a "Show only differences" toggle. The first column stays sticky when the table scrolls sideways.
- Rule templates: in the Add MT5 account window (funded accounts) use "Rule templates" to apply a saved template, which fills the phase type, size and every rule field, or save the current fields as a new template. The Rules window also has "Save as template" for an existing account. Templates are your own: the app ships none, because firm rules change.

## Settings (Phase 3) - terminal.html, Settings
- **Data & Backup**: export everything to one `.json` file (localStorage and the IndexedDB certificates/screenshots). API keys are left out unless you tick the box. Import shows a summary first, then either Merge (keeps what is already here) or Replace everything. A safety backup of the current data can be downloaded automatically before importing. Storage usage by group, and "Erase all app data" (type DELETE).
- **Preferences**: calculator keyboard typing on or off, clear calculator history, reset calculator position.
- **About**: where the data lives and the same-folder / same-origin note.
- Calculator keyboard: while the calculator is open, type numbers and `+ - * / x ( ) %`, Enter or `=` for equals, Backspace, Delete or `C` to clear, Esc to close, Ctrl+V to paste a sum. It never types while you are in another input field.

## Status
Phases 1, 2 and 3 complete.
Next: Phase 4 (accessibility + mobile polish).

## Accessibility and mobile (Phase 4)
- Every icon-only button now has an `aria-label` and every image has `alt` (static in the HTML; `js/a11y.js` also names buttons and images that are built later by scripts).
- Modals trap keyboard focus: Tab and Shift+Tab stay inside the open window, Esc closes it, and focus returns to the button that opened it. The calculator window is excluded so it stays free to type into.
- Visible keyboard focus ring, smaller tables and touch-friendly scrolling on phones. The Rules compare table keeps its first column sticky.

## Profiles and notifications (Phase 4+)
- **Profiles** (sidebar, bottom left): name, username and an optional 4 to 8 digit PIN. The first start asks you to create one; data that existed before profiles belongs to the first profile. Add more profiles and switch between them from the pop-up. Every profile has its own accounts, calendars, journal, notes, settings, certificates and screenshots, and its own export/import and erase (Settings always acts on the current profile). Deleting a profile removes only that profile's data.
- The PIN is a lock on this device, not encryption. Anyone who can open your browser's developer tools can still read the stored data. Use Export for backups.
- **Notifications** (bell, top right): every in-app message (payout ready, inactivity warning, account passed or failed, saves) is kept in a per-profile list with an unread badge, "Mark all read" and "Clear all".
- **Failed accounts** are greyed out and view-only: stats, calendar and journal stay readable, but trades cannot be added, edited or deleted, and payouts cannot be changed.
- Monthly Summary now picks accounts from a dropdown, like Stats and Journal.

## Electron notes
- Load `tradely.html` with `win.loadFile(...)` and keep the folder structure as is. Data (localStorage and IndexedDB) lives in Electron's user-data folder, so it survives app updates as long as the app name and `userData` path do not change.
- Tailwind still loads from its CDN, so the first start needs internet. For a fully offline app, replace the Tailwind script with a built CSS file before packaging.
- News, AI and X feeds call external websites from `file://`. Some of those services may block requests that come from a `file://` origin; test each feed inside Electron.
