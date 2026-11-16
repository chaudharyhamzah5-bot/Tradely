# Tradely Accounts (standalone)

Pages: Overview, Accounts, Calendar, Stats, Monthly Summary, Journal, Sessions, Strategies & Rules,
Psychology, Notes, Certificates, Settings (AI API, Data & Backup, Preferences, About).

Run: `npm install` then `npm start`. Build installer: `npm run build`.

Separate app = separate storage. AI keys, Twelve Data key and backups are NOT shared with Tradely Terminal (the cloud sync below only connects this app's own devices).
To move data between the two apps use Settings -> Data & Backup (export / import).
Details of the code layout are in app/README.md.


## Cloud sync (Supabase) and accounts
First start shows **Fresh start** and **Login**. Fresh start: paste your own Supabase URL + anon key, press Copy SQL, run it in Supabase, wait for the green light, then create an account (Name, Email, Password, no verification). Login works on any device with the same project URL + key (once) and email + password. Details: `supabase/SETUP.md`.
- Settings -> Account: name, email, Log out, Delete account (deletes the login and all data from Supabase and this device).
- Profile delete removes the profile's cloud rows (checked) and local data, with confirmations.
- All app data is mirrored to your Supabase project automatically (local storage stays the fast working copy). `pages` in `app/js/supabase-config.js` lists the synced pages.
- Sync status chip (top bar): Synced / Syncing / Offline / Pending; click it for Sync now, Re-download, Log out.
- Each profile syncs into its own cloud namespace; the profile list is merged across devices.
- After editing `supabase/setup.sql` run `npm run sql` (regenerates `app/js/cloud-sql.js`, used by the Copy SQL button).


## Several Supabase projects in one app (v1.2)
- **Log out** now asks: **Save & log out** (give it a nickname) or **Log out without saving**. Saved accounts stay in a list on this device; only a renewable login token is kept, never the password.
- After a log out (or on a fresh start) the first screen is **Choose an account**: tap a saved account and you are in, no email or password. **Use another account** opens Fresh start / Login for a new Supabase project or login.
- **Settings -> Account** shows nickname, name, email and cloud project, **Saved accounts** (Switch, Nickname, Remove) and **Add another account**. The sync chip panel also has **Switch account**.
- Each account keeps its own cloud project. Switching uploads pending changes, replaces the local copy with the other account's data from its project, and signs in by itself.
- If a saved login has expired, the app opens Login with the project and email already filled in.
- Saved accounts live under `tradely_sync_saved_v1` (device-only, never synced, never in backups).

## Install as an app on phone and desktop (PWA)
The `app/` folder is an installable web app (manifest, icons, service worker, offline shell).
1. **Try it here:** `npm run web`, open http://localhost:8080 (localhost allows install).
2. **Use it on your phone / other PCs:** upload the `app/` folder to any HTTPS static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages). Open the site's address.
3. **Install:** Chrome/Edge desktop - install icon in the address bar or Settings -> Preferences -> Install app. Android Chrome - menu -> Install app (or the Install banner). iPhone/iPad - Safari -> Share -> Add to Home Screen.
- Tailwind still loads from its CDN: open the app online once, after that it works offline (changes sync when the internet is back).
- The installed web app keeps its own local copy per browser/device, like any other device: log in with the same account and everything syncs.
- The Electron desktop build (`npm start`, `npm run build`) is unchanged and does not use the service worker.
