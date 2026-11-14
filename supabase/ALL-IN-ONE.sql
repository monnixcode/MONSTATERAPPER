-- ==========================================================================
-- Mon HipHop — ALL-IN-ONE Supabase setup
--
-- ONE file = everything:
--   PART 1  base: artists / releases / news / messages / settings / admins,
--           play counts, security (RLS), storage bucket "media"
--   PART 2  artist accounts: sign up / sign in, red verified mark,
--           artists edit only their own profile, music and files
--   PART 3  activity log (Admin panel > Logs)
--   PART 4  music videos (file upload or YouTube link)
--
-- HOW TO USE
--   Supabase > SQL Editor > New query > paste this whole file > Run.
--   Works on a brand-new project AND on an existing one (safe to run again).
--   It runs as ONE transaction: if anything fails, nothing is changed.
--
-- >>> ADMIN EMAIL: PART 1 registers monnixcode@gmail.com as admin.
--     Change that address (search for "REGISTER ADMIN EMAIL") if you use another one,
--     and create the same user in Authentication > Users.
-- ==========================================================================

begin;

-- ############################################################
-- PART 1
-- ############################################################
create table if not exists public.artists (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    role text default 'Rapper · Mon State',
    bio text,
    avatar_url text,
    cover_url text,
    links jsonb default '{}',
    sort int default 0,
    created_at timestamptz default now()
);

-- 2. RELEASES
create table if not exists public.releases (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    artist_id uuid references public.artists(id) on delete set null,
    type text default 'Single',
    release_date date,
    cover_url text,
    audio_url text,
    links jsonb default '{}',
    created_at timestamptz default now()
);

-- 3. NEWS
create table if not exists public.news (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text,
    image_url text,
    published_at timestamptz default now()
);

-- 4. MESSAGES
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    message text not null,
    created_at timestamptz default now()
);

-- 5. SETTINGS
create table if not exists public.settings (
    key text primary key,
    value text
);

-- 6. ADMINS
create table if not exists public.admins (
    email text primary key
);

-- REGISTER ADMIN EMAIL
insert into public.admins (email)
values ('monnixcode@gmail.com')
on conflict (email) do nothing;

-- 7. PLAY COUNTS
alter table public.releases
add column if not exists play_count integer not null default 0;

create table if not exists public.play_events (
    release_id uuid references public.releases(id) on delete cascade,
    visitor text not null check (length(visitor) <= 64),
    day date not null default current_date,
    primary key (release_id, visitor, day)
);

-- 8. ADMIN SECURITY FUNCTION
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.admins a
        where lower(trim(a.email)) =
              lower(trim(auth.jwt() ->> 'email'))
    );
$$;

revoke all on function public.is_admin() from public;

grant execute on function public.is_admin()
to anon, authenticated;

-- 9. PLAY COUNT FUNCTION
create or replace function public.log_play(
    rid uuid,
    vid text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.play_events (release_id, visitor)
    values (rid, left(vid, 64))
    on conflict do nothing;

    if not found then
        return false;
    end if;

    update public.releases
    set play_count = play_count + 1
    where id = rid;

    return found;
end;
$$;

revoke all on function public.log_play(uuid, text)
from public;

grant execute on function public.log_play(uuid, text)
to anon, authenticated;

-- 10. ENABLE ROW LEVEL SECURITY
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.news enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;
alter table public.admins enable row level security;
alter table public.play_events enable row level security;

-- 11. REMOVE OLD POLICIES
drop policy if exists "read" on public.artists;
drop policy if exists "admin write" on public.artists;
drop policy if exists "artists public read" on public.artists;
drop policy if exists "artists admin write" on public.artists;

drop policy if exists "read" on public.releases;
drop policy if exists "admin write" on public.releases;
drop policy if exists "releases public read" on public.releases;
drop policy if exists "releases admin write" on public.releases;

drop policy if exists "read" on public.news;
drop policy if exists "admin write" on public.news;
drop policy if exists "news public read" on public.news;
drop policy if exists "news admin write" on public.news;

drop policy if exists "read" on public.settings;
drop policy if exists "admin write" on public.settings;
drop policy if exists "settings public read" on public.settings;
drop policy if exists "settings admin write" on public.settings;

drop policy if exists "anyone can send" on public.messages;
drop policy if exists "admin read" on public.messages;
drop policy if exists "admin delete" on public.messages;
drop policy if exists "messages public insert" on public.messages;
drop policy if exists "messages admin read" on public.messages;
drop policy if exists "messages admin delete" on public.messages;

-- 12. ARTISTS POLICIES
create policy "artists public read"
on public.artists
for select to anon, authenticated
using (true);

create policy "artists admin write"
on public.artists
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 13. RELEASES POLICIES
create policy "releases public read"
on public.releases
for select to anon, authenticated
using (true);

create policy "releases admin write"
on public.releases
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 14. NEWS POLICIES
create policy "news public read"
on public.news
for select to anon, authenticated
using (true);

create policy "news admin write"
on public.news
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 15. SETTINGS POLICIES
create policy "settings public read"
on public.settings
for select to anon, authenticated
using (true);

create policy "settings admin write"
on public.settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 16. MESSAGES POLICIES
create policy "messages public insert"
on public.messages
for insert to anon, authenticated
with check (length(message) < 5000);

create policy "messages admin read"
on public.messages
for select to authenticated
using (public.is_admin());

create policy "messages admin delete"
on public.messages
for delete to authenticated
using (public.is_admin());

-- 17. PROTECT ADMINS TABLE
revoke all on table public.admins
from anon, authenticated;

-- 18. STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id)
do update set public = true;

-- REMOVE OLD STORAGE POLICIES
drop policy if exists "media read" on storage.objects;
drop policy if exists "media admin write" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin insert" on storage.objects;

-- PUBLIC MEDIA READ
create policy "media public read"
on storage.objects
for select to anon, authenticated
using (bucket_id = 'media');

-- ADMIN MEDIA UPLOAD
create policy "media admin insert"
on storage.objects
for insert to authenticated
with check (
    bucket_id = 'media'
    and public.is_admin()
);

-- ADMIN MEDIA UPDATE
create policy "media admin update"
on storage.objects
for update to authenticated
using (
    bucket_id = 'media'
    and public.is_admin()
)
with check (
    bucket_id = 'media'
    and public.is_admin()
);

-- ADMIN MEDIA DELETE
create policy "media admin delete"
on storage.objects
for delete to authenticated
using (
    bucket_id = 'media'
    and public.is_admin()
);

-- 19. TABLE PERMISSIONS
grant usage on schema public to anon, authenticated;

grant select
on public.artists, public.releases, public.news, public.settings
to anon, authenticated;

grant insert
on public.messages
to anon, authenticated;

grant select, insert, update, delete
on public.artists, public.releases, public.news, public.settings
to authenticated;

grant select, delete
on public.messages
to authenticated;

-- ############################################################
-- PART 2
-- ############################################################
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
    if to_regclass('public.videos') is not null then
        execute 'update public.videos set artist_id = $1 where artist_id in (select id from public.artists where user_id = $2 and id <> $1)'
            using aid, uid;
    end if;
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

-- ############################################################
-- PART 3
-- ############################################################
create table if not exists public.activity_log (
    id          bigint generated always as identity primary key,
    created_at  timestamptz not null default now(),
    actor_id    uuid,
    actor_email text,
    actor_role  text not null default 'visitor',   -- admin | artist | visitor | system
    action      text not null,                     -- insert | update | delete | signup | confirm | signin
    table_name  text not null,
    row_id      text,
    summary     text,
    changes     jsonb
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_table_idx   on public.activity_log (table_name, created_at desc);
create index if not exists activity_log_actor_idx   on public.activity_log (actor_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_log admin read" on public.activity_log;
create policy "activity_log admin read"
on public.activity_log
for select to authenticated
using (public.is_admin());

-- no direct writes from the API: only the security-definer triggers below insert
revoke all on table public.activity_log from anon, authenticated;
grant select on table public.activity_log to authenticated;

-- 2. HELPERS ------------------------------------------------
-- long text is cut so one huge bio / news body cannot bloat the log
create or replace function public.log_trim(v jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
    select case
        when jsonb_typeof(v) = 'string' and length(v #>> '{}') > 200
            then to_jsonb(left(v #>> '{}', 200) || '…')
        else v
    end;
$$;

-- 3. GENERIC TRIGGER FOR CONTENT TABLES ---------------------
create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
    n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
    r jsonb := coalesce(n, o);
    uid uuid := auth.uid();
    mail text;
    who text;
    diff jsonb := '{}'::jsonb;
    k text;
    ttl text;
begin
    -- logging must NEVER break a real save
    begin
        if tg_op = 'UPDATE' then
            -- play_count changes come from log_play(): ignore them
            if (n - 'play_count') = (o - 'play_count') then
                return null;
            end if;
            for k in select jsonb_object_keys(n) loop
                if k <> 'play_count' and (n -> k) is distinct from (o -> k) then
                    diff := diff || jsonb_build_object(
                        k, jsonb_build_object('old', public.log_trim(o -> k), 'new', public.log_trim(n -> k)));
                end if;
            end loop;
        elsif tg_op = 'INSERT' and tg_table_name <> 'messages' then
            diff := (select coalesce(jsonb_object_agg(e.key, public.log_trim(e.value)), '{}'::jsonb)
                     from jsonb_each(n) e where e.value <> 'null'::jsonb);
        end if;

        if uid is not null then
            select email into mail from auth.users where id = uid;
        end if;

        who := case
            when uid is null then case when tg_table_name = 'messages' then 'visitor' else 'system' end
            when public.is_admin() then 'admin'
            else 'artist'
        end;

        ttl := coalesce(r ->> 'name', r ->> 'title', r ->> 'key', r ->> 'id');

        insert into public.activity_log (actor_id, actor_email, actor_role, action, table_name, row_id, summary, changes)
        values (
            uid, mail, who, lower(tg_op), tg_table_name,
            coalesce(r ->> 'id', r ->> 'key'),
            left(ttl, 120),
            case when diff = '{}'::jsonb then null else diff end
        );
    exception when others then
        null;
    end;
    return null;
end;
$$;

revoke all on function public.log_change() from public, anon, authenticated;

drop trigger if exists artists_log  on public.artists;
drop trigger if exists releases_log on public.releases;
drop trigger if exists news_log     on public.news;
drop trigger if exists settings_log on public.settings;
drop trigger if exists messages_log on public.messages;

create trigger artists_log  after insert or update or delete on public.artists  for each row execute function public.log_change();
create trigger releases_log after insert or update or delete on public.releases for each row execute function public.log_change();
create trigger news_log     after insert or update or delete on public.news     for each row execute function public.log_change();
create trigger settings_log after insert or update or delete on public.settings for each row execute function public.log_change();
-- messages: log who sent (name only) and deletes, never the message text or email
create trigger messages_log after insert or delete on public.messages           for each row execute function public.log_change();

-- 4. AUTH EVENTS (sign up / confirm / sign in) --------------
create or replace function public.log_auth_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    act text;
begin
    begin
        if tg_op = 'INSERT' then
            act := 'signup';
        elsif old.email_confirmed_at is null and new.email_confirmed_at is not null then
            act := 'confirm';
        elsif new.last_sign_in_at is distinct from old.last_sign_in_at then
            act := 'signin';
        else
            return null;
        end if;

        insert into public.activity_log (actor_id, actor_email, actor_role, action, table_name, row_id, summary)
        values (
            new.id, new.email,
            case when exists (select 1 from public.admins a where lower(trim(a.email)) = lower(trim(new.email)))
                 then 'admin' else 'artist' end,
            act, 'auth', new.id::text,
            coalesce(nullif(trim(new.raw_user_meta_data ->> 'artist_name'), ''), new.email)
        );
    exception when others then
        null;
    end;
    return null;
end;
$$;

revoke all on function public.log_auth_event() from public, anon, authenticated;

drop trigger if exists auth_log_insert on auth.users;
drop trigger if exists auth_log_update on auth.users;
create trigger auth_log_insert after insert on auth.users
    for each row execute function public.log_auth_event();
create trigger auth_log_update after update of email_confirmed_at, last_sign_in_at on auth.users
    for each row execute function public.log_auth_event();

-- 5. ADMIN: purge old rows (free plan DB is only 500 MB) ----
create or replace function public.admin_purge_logs(days int default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    n integer;
begin
    if not public.is_admin() then
        raise exception 'Admins only.';
    end if;
    if days is null or days < 1 then
        raise exception 'days must be 1 or more.';
    end if;
    delete from public.activity_log where created_at < now() - make_interval(days => days);
    get diagnostics n = row_count;
    return n;
end;
$$;

revoke all on function public.admin_purge_logs(int) from public;
grant execute on function public.admin_purge_logs(int) to authenticated;

-- ############################################################
-- PART 4
-- ############################################################
create table if not exists public.videos (
    id          uuid primary key default gen_random_uuid(),
    artist_id   uuid not null references public.artists(id) on delete cascade,
    title       text not null,
    video_url   text,      -- uploaded file in storage bucket "media"
    youtube_url text,      -- or a YouTube link
    thumb_url   text,      -- optional poster image
    created_at  timestamptz not null default now(),
    constraint videos_has_source check (video_url is not null or youtube_url is not null)
);

create index if not exists videos_artist_idx  on public.videos (artist_id, created_at desc);
create index if not exists videos_created_idx on public.videos (created_at desc);

-- 2. GUARD: what an artist (non-admin) may save -------------
create or replace function public.guard_video()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.title       := left(trim(coalesce(new.title, '')), 100);
    new.youtube_url := nullif(trim(coalesce(new.youtube_url, '')), '');

    if public.is_admin() then
        return new;
    end if;

    if new.title = '' then
        raise exception 'Video title is required.';
    end if;
    if tg_op = 'UPDATE' then
        new.artist_id  := old.artist_id;
        new.created_at := old.created_at;
    end if;
    if tg_op = 'INSERT' or new.video_url is distinct from old.video_url then
        if not public.is_own_media(new.video_url) then
            raise exception 'Invalid video file.';
        end if;
    end if;
    if tg_op = 'INSERT' or new.thumb_url is distinct from old.thumb_url then
        if not public.is_own_media(new.thumb_url) then
            raise exception 'Invalid thumbnail image.';
        end if;
    end if;
    if new.youtube_url is not null
       and new.youtube_url !~* '^https://(www\.|m\.)?(youtube\.com/(watch\?([^ ]*&)?v=|shorts/|embed/|live/)|youtu\.be/)[A-Za-z0-9_-]{11}' then
        raise exception 'Please paste a normal YouTube link (youtube.com or youtu.be).';
    end if;
    return new;
end;
$$;

drop trigger if exists videos_guard on public.videos;
create trigger videos_guard
    before insert or update on public.videos
    for each row execute function public.guard_video();

-- 3. ROW LEVEL SECURITY -------------------------------------
alter table public.videos enable row level security;

drop policy if exists "videos public read"  on public.videos;
drop policy if exists "videos admin write"  on public.videos;
drop policy if exists "videos owner insert" on public.videos;
drop policy if exists "videos owner update" on public.videos;
drop policy if exists "videos owner delete" on public.videos;

create policy "videos public read"
on public.videos
for select to anon, authenticated
using (true);

create policy "videos admin write"
on public.videos
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "videos owner insert"
on public.videos
for insert to authenticated
with check (
    artist_id in (select a.id from public.artists a where a.user_id = auth.uid())
    and (select count(*) from public.videos v where v.artist_id = videos.artist_id) < 20
);

create policy "videos owner update"
on public.videos
for update to authenticated
using      (artist_id in (select a.id from public.artists a where a.user_id = auth.uid()))
with check (artist_id in (select a.id from public.artists a where a.user_id = auth.uid()));

create policy "videos owner delete"
on public.videos
for delete to authenticated
using (artist_id in (select a.id from public.artists a where a.user_id = auth.uid()));

grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;

-- 4. STORAGE: allow video files in bucket "media" ------------
update storage.buckets
set file_size_limit = 52428800,   -- 50 MB (Supabase free plan maximum)
    allowed_mime_types = array[
        'image/jpeg','image/png','image/webp','image/gif',
        'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/x-m4a',
        'audio/aac','audio/ogg','audio/flac','audio/x-flac','audio/webm',
        'video/mp4','video/webm','video/quicktime','video/x-m4v'
    ]
where id = 'media';

-- 5. ACTIVITY LOG (needs 004) --------------------------------
do $$
begin
    if to_regprocedure('public.log_change()') is not null then
        drop trigger if exists videos_log on public.videos;
        create trigger videos_log after insert or update or delete on public.videos
            for each row execute function public.log_change();
    end if;
end $$;

commit;

-- ==========================================================================
-- CHECK (shows the result after Run)
-- ==========================================================================
select
  (select count(*) from public.admins)        as admins,
  (select count(*) from public.artists)       as artists,
  (select count(*) from public.releases)      as releases,
  (select count(*) from public.videos)        as videos,
  (select count(*) from public.activity_log)  as log_rows;
