-- Tradely cloud storage. Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- One generic table keeps every page's data (as text/JSON blobs). Large values are split into
-- parts automatically by the app. Row Level Security: each user can only see their own rows.

create table if not exists public.app_data (
    user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
    ns         text        not null,               -- 'ls:<profileId>' | 'idb:<profileId>' | 'meta'
    key        text        not null,               -- the storage key, e.g. tradely_accounts
    part       int         not null default 0,     -- 0 for normal values, 1..n for chunks of large values
    parts      int         not null default 1,     -- how many parts this value has (stored on part 0)
    value      text,                               -- the blob (JSON / raw string)
    deleted    boolean     not null default false, -- tombstone so deletions reach other devices
    device     text,
    updated_at timestamptz not null default now(),
    primary key (user_id, ns, key, part)
);

create index if not exists app_data_user_updated_idx on public.app_data (user_id, updated_at);

create or replace function public.app_data_touch() returns trigger
language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end $$;

drop trigger if exists app_data_touch_trg on public.app_data;
create trigger app_data_touch_trg before insert or update on public.app_data
    for each row execute function public.app_data_touch();

alter table public.app_data enable row level security;

drop policy if exists "app_data select own" on public.app_data;
drop policy if exists "app_data insert own" on public.app_data;
drop policy if exists "app_data update own" on public.app_data;
drop policy if exists "app_data delete own" on public.app_data;

create policy "app_data select own" on public.app_data for select to authenticated using (user_id = auth.uid());
create policy "app_data insert own" on public.app_data for insert to authenticated with check (user_id = auth.uid());
create policy "app_data update own" on public.app_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "app_data delete own" on public.app_data for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 1) No email verification: every new user is confirmed automatically.
-- ---------------------------------------------------------------------------
create or replace function public.tradely_auto_confirm() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if new.email_confirmed_at is null then
        new.email_confirmed_at := now();
    end if;
    return new;
end $$;

drop trigger if exists tradely_auto_confirm_trg on auth.users;
create trigger tradely_auto_confirm_trg before insert on auth.users
    for each row execute function public.tradely_auto_confirm();

-- ---------------------------------------------------------------------------
-- 2) Delete my account A to Z: all rows in app_data + the login itself.
--    Only the signed-in user can run it, and only for their own id.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
    if uid is null then raise exception 'not signed in'; end if;
    delete from public.app_data where user_id = uid;
    delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- make the new table / function visible to the API right away
notify pgrst, 'reload schema';
