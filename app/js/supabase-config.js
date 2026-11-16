/* supabase-config.js - page-by-page sync rollout only.
   The Supabase URL and anon key are NOT stored here any more: each user enters their own on the welcome screen
   (Fresh start / Login) and they are kept on that device. */
window.TRADELY_SUPABASE = {
    /* A page listed here is synced to Supabase automatically. */
    pages: ['overview', 'accounts', 'journal', 'notes', 'certificates', 'monthly', 'strategies', 'psychology', 'settings', 'apikeys']
};
