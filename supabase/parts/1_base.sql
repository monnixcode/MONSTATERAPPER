-- ==========================================
-- Mon HipHop — Complete Database Setup
-- Admin Email: monnixcode@gmail.com
-- ==========================================

begin;

-- 1. ARTISTS
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

commit;

-- 20. VERIFY ADMIN EMAIL
select email
from public.admins;
