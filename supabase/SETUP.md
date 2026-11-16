# Supabase setup (about 3 minutes, one time per user)

Every user connects **their own** Supabase project. Nothing is hard-coded in the app.

1. Create a free project at supabase.com.
2. Dashboard -> **Project Settings -> API**: copy the **Project URL** and the **anon public** key.
3. Start the app and choose **Fresh start**:
   - paste the URL and the key,
   - press the square **Copy SQL** button,
   - Supabase -> **SQL Editor -> New query** -> paste -> **Run**,
   - come back to the app: the light turns **green** ("Project is live") by itself.
4. **Continue**, then **Create account** (Name, Email, Password). There is no email verification.
5. On any other device choose **Login** and enter the project URL + key once, then email + password. Everything syncs.

Never use the `service_role` key in the app.

## What the SQL does (supabase/setup.sql)
- Creates the `app_data` table (Row Level Security: only your login can read or write your rows).
- Turns email confirmation off for new users (a trigger confirms every new user), so sign up works straight away.
- Creates `delete_my_account()`: lets a signed-in user delete their own login and all their rows (Settings -> Account -> Delete account).

If you ever change `setup.sql`, run `npm run sql` so the app's Copy SQL button copies the new text (it writes `app/js/cloud-sql.js`).
Run the SQL again whenever the app asks for it (for example "the delete function is missing"). It is safe to run more than once.

## Account
- **Settings -> Account** shows your name and email, **Log out**, and **Delete account**.
- **Log out** uploads pending changes first, then removes the data copy on this device (it comes back at the next login). The project URL and key stay on the device.
- **Delete account** asks for confirmation, your password and typing DELETE. It deletes the login and every profile with all its data in Supabase (A to Z), and wipes this device. Other devices are logged out and cannot log in again.
- **Delete profile** (profile menu -> Edit -> Delete profile) asks for confirmation and typing DELETE, deletes the profile's cloud rows first and checks that none are left, then removes it on this device. If you are offline you can choose "Delete here anyway": the cloud copy is then removed automatically as soon as possible.

## Notes
- Data is stored in one table, `app_data`, as text/JSON blobs. Last write wins per item.
- API keys (AI providers, Groq, Twelve Data) ARE synced, per profile, as plain text. Only your login can read them, but anyone with your Supabase dashboard access can see them. To keep keys on each device only, remove `'apikeys'` from `pages` in `app/js/supabase-config.js`.
- Backup files exported from Settings never contain API keys.

## Profiles and cloud sync
- One login holds all your profiles; each profile's data lives under its own namespace (`ls:<profileId>` / `idb:<profileId>`).
- The profile list (name, username, PIN lock) is synced too. A deleted profile leaves only an id tombstone in the list.
- A profile PIN is a lock on the screen, not encryption.
- Check it yourself: Table editor -> `app_data`.

## Automatic tests (optional)
`npm install` then `npm run test:sync`. They run the sync and account code against a fake Supabase server (no real project is touched).

## Several projects / accounts on one device
Each saved account remembers its own project URL + anon key, so different accounts can live in different Supabase projects. Run the SQL once in every project you use. See README -> "Several Supabase projects in one app".
