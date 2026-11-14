-- ==========================================================
-- Mon HipHop — 003: Artist accounts (sign up / sign in)
-- Run ONCE in Supabase > SQL Editor, AFTER the base setup.
-- Safe to re-run (idempotent).
--
-- Adds:
--   * artists.user_id / username / verified (red mark)
--   * automatic artist profile on sign-up (trigger on auth.users)
--   * artists can edit ONLY their own profile and their own releases
--   * artists can upload files ONLY into their own folder media/u/<user id>/
--   * admin tools: link an account to an existing artist, list account emails
-- ==========================================================

begin;

-- 1. COLUMNS ------------------------------------------------
alter table public.artists
    add column if not exists user_id  uuid references auth.users(id) on delete set null,
    add column if not exists username text;

-- "verified" = red mark. Every artist that already exists on the site
-- gets the red mark the first time this script runs.
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'artists' and column_name = 'verified'
    ) then
        alter table public.artists add column verified boolean not null default false;
        update public.artists set verified = true;
    end if;
end $$;

create unique index if not exists artists_user_id_key  on public.artists (user_id) where user_id is not null;
create unique index if not exists artists_username_key on public.artists (lower(username)) where username is not null;

-- 2. SIGN-UP CHECK (used by the sign-up form before creating the account) ----
create or replace function public.check_signup(nm text, un text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    n text := trim(coalesce(nm, ''));
    u text := lower(trim(coalesce(un, '')));
begin
    if n = '' or length(n) > 60 then
        return 'Enter your artist name (max 60 characters).';
    end if;
    if u !~ '^[a-z0-9_]{3,24}$' then
        return 'Username must be 3-24 characters: letters, numbers or underscore.';
    end if;
    if u = any (array['admin','administrator','monhiphop','mon_hiphop','support','root','staff','official']) then
        return 'That username is reserved.';
    end if;
    if exists (select 1 from public.artists where lower(name) = lower(n)) then
        return 'That artist name is already on Mon HipHop. If this is you, contact us to claim your profile.';
    end if;
    if exists (select 1 from public.artists where lower(username) = u) then
        return 'That username is already taken.';
    end if;
    return null;
end;
$$;

revoke all on function public.check_signup(text, text) from public;
grant execute on function public.check_signup(text, text) to anon, authenticated;

-- 3. CREATE THE ARTIST PROFILE ------------------------------
-- The public profile is created only once the email address is CONFIRMED
-- (so bots cannot fill the artist list with fake profiles).
-- Users created by hand in the dashboard (e.g. the admin) carry no
-- artist_name metadata and are simply skipped.
create or replace function public.make_profile(uid uuid, nm text, un text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    msg text;
begin
    if exists (select 1 from public.artists where user_id = uid) then
        return;
    end if;
    msg := public.check_signup(nm, un);
    if msg is not null then
        raise exception '%', msg;
    end if;
    insert into public.artists (name, username, user_id, role, verified, sort)
    values (trim(nm), lower(trim(un)), uid, 'Artist', false, 1000);
end;
$$;
revoke all on function public.make_profile(uuid, text, text) from public, anon, authenticated;

-- (a) project with "Confirm email" OFF: the user is confirmed at sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.email_confirmed_at is not null
       and coalesce(trim(new.raw_user_meta_data ->> 'artist_name'), '') <> '' then
        perform public.make_profile(new.id, new.raw_user_meta_data ->> 'artist_name', new.raw_user_meta_data ->> 'username');
    end if;
    return new;
end;
$$;

-- (b) project with "Confirm email" ON: create the profile when the link is clicked
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.email_confirmed_at is null and new.email_confirmed_at is not null
       and coalesce(trim(new.raw_user_meta_data ->> 'artist_name'), '') <> '' then
        begin
            perform public.make_profile(new.id, new.raw_user_meta_data ->> 'artist_name', new.raw_user_meta_data ->> 'username');
        exception when others then
            null;  -- name/username taken in the meantime: never block the confirmation;
                   -- the user can pick another name from the dashboard (create_my_artist)
        end;
    end if;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created   on auth.users;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
create trigger on_auth_user_confirmed
    after update of email_confirmed_at on auth.users
    for each row execute function public.handle_user_confirmed();

-- Signed-in user without a profile (name was taken in the meantime) creates one
create or replace function public.create_my_artist(nm text, un text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'Please sign in first.';
    end if;
    if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
        raise exception 'Please confirm your email first.';
    end if;
    if exists (select 1 from public.artists where user_id = uid) then
        raise exception 'You already have an artist profile.';
    end if;
    perform public.make_profile(uid, nm, un);
end;
$$;
revoke all on function public.create_my_artist(text, text) from public, anon;
grant execute on function public.create_my_artist(text, text) to authenticated;

-- 4. GUARDS: what an artist (non-admin) may change -----------
create or replace function public.is_own_media(url text)
returns boolean
language sql
stable
set search_path = public
as $$
    select url is null
        or position('/storage/v1/object/public/media/u/' || auth.uid()::text || '/' in url) > 0;
$$;

create or replace function public.guard_artist()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.username := nullif(lower(trim(coalesce(new.username, ''))), '');

    if public.is_admin() then
        return new;
    end if;

    if tg_op = 'UPDATE' then
        -- these can only be changed by the admin
        new.user_id    := old.user_id;
        new.verified   := old.verified;
        new.sort       := old.sort;
        new.username   := old.username;
        new.created_at := old.created_at;
    end if;

    new.name := left(trim(coalesce(new.name, '')), 60);
    if new.name = '' then
        raise exception 'Artist name is required.';
    end if;

    if tg_op = 'UPDATE' then
        if new.name is distinct from old.name
           and exists (select 1 from public.artists a where lower(a.name) = lower(new.name) and a.id <> new.id) then
            raise exception 'That artist name is already taken.';
        end if;
        if new.avatar_url is distinct from old.avatar_url and not public.is_own_media(new.avatar_url) then
            raise exception 'Invalid profile image.';
        end if;
        if new.cover_url is distinct from old.cover_url and not public.is_own_media(new.cover_url) then
            raise exception 'Invalid cover image.';
        end if;
    end if;

    new.role := left(trim(coalesce(new.role, '')), 40);
    new.bio  := left(new.bio, 600);
    return new;
end;
$$;

drop trigger if exists artists_guard on public.artists;
create trigger artists_guard
    before insert or update on public.artists
    for each row execute function public.guard_artist();

create or replace function public.guard_release()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if public.is_admin() then
        return new;
    end if;

    -- (play-count updates from log_play() change none of these columns, so they pass untouched)
    if tg_op = 'INSERT' or new.title is distinct from old.title then
        new.title := left(trim(coalesce(new.title, '')), 100);
        if new.title = '' then
            raise exception 'Track title is required.';
        end if;
    end if;
    if tg_op = 'INSERT' or new.type is distinct from old.type then
        if new.type is null or new.type not in ('Single', 'EP', 'Album', 'Mixtape') then
            new.type := 'Single';
        end if;
    end if;
    if tg_op = 'INSERT' or new.cover_url is distinct from old.cover_url then
        if not public.is_own_media(new.cover_url) then
            raise exception 'Invalid cover image.';
        end if;
    end if;
    if tg_op = 'INSERT' or new.audio_url is distinct from old.audio_url then
        if not public.is_own_media(new.audio_url) then
            raise exception 'Invalid audio file.';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists releases_guard on public.releases;
create trigger releases_guard
    before insert or update on public.releases
    for each row execute function public.guard_release();

-- 5. ROW LEVEL SECURITY: artists manage their own stuff ------
drop policy if exists "artists owner update"  on public.artists;
drop policy if exists "releases owner insert" on public.releases;
drop policy if exists "releases owner update" on public.releases;
drop policy if exists "releases owner delete" on public.releases;

create policy "artists owner update"
on public.artists
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "releases owner insert"
on public.releases
for insert to authenticated
with check (
    artist_id in (select a.id from public.artists a where a.user_id = auth.uid())
    and (select count(*) from public.releases r where r.artist_id = releases.artist_id) < 60
);

create policy "releases owner update"
on public.releases
for update to authenticated
using      (artist_id in (select a.id from public.artists a where a.user_id = auth.uid()))
with check (artist_id in (select a.id from public.artists a where a.user_id = auth.uid()));

create policy "releases owner delete"
on public.releases
for delete to authenticated
using (artist_id in (select a.id from public.artists a where a.user_id = auth.uid()));

-- play_count may only be changed by log_play() (security definer), never directly
revoke insert, update on public.releases from authenticated;
grant insert (title, artist_id, type, release_date, cover_url, audio_url, links)
    on public.releases to authenticated;
grant update (title, artist_id, type, release_date, cover_url, audio_url, links)
    on public.releases to authenticated;

-- 6. STORAGE: artists upload only into media/u/<their user id>/ ----
update storage.buckets
set file_size_limit = 52428800,   -- 50 MB (Supabase free plan maximum)
    allowed_mime_types = array[
        'image/jpeg','image/png','image/webp','image/gif',
        'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/x-m4a',
        'audio/aac','audio/ogg','audio/flac','audio/x-flac','audio/webm'
    ]
where id = 'media';

drop policy if exists "media owner insert" on storage.objects;
drop policy if exists "media owner update" on storage.objects;
drop policy if exists "media owner delete" on storage.objects;

create policy "media owner insert"
on storage.objects
for insert to authenticated
with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
        select count(*) from storage.objects o
        where o.bucket_id = 'media'
          and (storage.foldername(o.name))[1] = 'u'
          and (storage.foldername(o.name))[2] = auth.uid()::text
    ) < 150
);

create policy "media owner update"
on storage.objects
for update to authenticated
using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "media owner delete"
on storage.objects
for delete to authenticated
using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
);

-- 7. ADMIN TOOLS ---------------------------------------------
-- Link a signed-up account (by email) to an EXISTING artist profile.
-- Leave the email empty to unlink. The account's own empty profile is
-- merged into the existing one (its tracks move over, username carries over).
create or replace function public.admin_link_artist(aid uuid, em text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid;
    old_username text;
begin
    if not public.is_admin() then
        raise exception 'Admins only.';
    end if;

    if coalesce(trim(em), '') = '' then
        update public.artists set user_id = null where id = aid;
        return;
    end if;

    select id into uid from auth.users where lower(email) = lower(trim(em)) limit 1;
    if uid is null then
        raise exception 'No account found with that email. The artist must sign up first.';
    end if;

    -- merge the account's auto-created profile (if any) into the target
    select username into old_username from public.artists where user_id = uid and id <> aid;
    update public.releases set artist_id = aid
        where artist_id in (select id from public.artists where user_id = uid and id <> aid);
    delete from public.artists where user_id = uid and id <> aid;

    update public.artists
        set user_id  = uid,
            username = coalesce(username, old_username)
        where id = aid;
end;
$$;

create or replace function public.admin_artist_emails()
returns table (artist_id uuid, email text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then
        raise exception 'Admins only.';
    end if;
    return query
        select a.id, u.email::text
        from public.artists a
        join auth.users u on u.id = a.user_id;
end;
$$;

revoke all on function public.admin_link_artist(uuid, text) from public;
revoke all on function public.admin_artist_emails()         from public;
grant execute on function public.admin_link_artist(uuid, text) to authenticated;
grant execute on function public.admin_artist_emails()         to authenticated;

commit;

-- CHECK: every pre-existing artist should show verified = true
select name, username, verified, user_id is not null as has_account
from public.artists
order by verified desc, sort, created_at;
