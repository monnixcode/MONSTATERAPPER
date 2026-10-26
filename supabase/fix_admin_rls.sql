-- Mon HipHop: fix admin RLS for profile edits, releases, news, settings, and media uploads.
-- Run once in Supabase > SQL Editor AFTER replacing the email below.
-- Do NOT disable RLS and do NOT put a service_role/secret key in the website.

begin;

-- 1) Set the exact email used by your Supabase Auth account.
insert into public.admins (email)
values (lower(trim('monnixcode@gmail.com')))
on conflict (email) do nothing;

-- 2) Secure admin check. SECURITY DEFINER lets the function read admins without
-- exposing the admins table to public clients. Keep this function owned by postgres.
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
    where lower(trim(a.email)) = lower(trim(auth.jwt() ->> 'email'))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 3) Ensure RLS is enabled.
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.news enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;
alter table public.admins enable row level security;
alter table public.play_events enable row level security;

-- 4) Replace policies idempotently. Public can read published site data;
-- only authenticated admins can mutate admin-managed tables.
drop policy if exists "read" on public.artists;
drop policy if exists "admin write" on public.artists;
create policy "artists public read" on public.artists for select to anon, authenticated using (true);
create policy "artists admin write" on public.artists for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read" on public.releases;
drop policy if exists "admin write" on public.releases;
create policy "releases public read" on public.releases for select to anon, authenticated using (true);
create policy "releases admin write" on public.releases for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read" on public.news;
drop policy if exists "admin write" on public.news;
create policy "news public read" on public.news for select to anon, authenticated using (true);
create policy "news admin write" on public.news for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read" on public.settings;
drop policy if exists "admin write" on public.settings;
create policy "settings public read" on public.settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone can send" on public.messages;
drop policy if exists "admin read" on public.messages;
drop policy if exists "admin delete" on public.messages;
create policy "messages public insert" on public.messages for insert to anon, authenticated with check (length(message) < 5000);
create policy "messages admin read" on public.messages for select to authenticated using (public.is_admin());
create policy "messages admin delete" on public.messages for delete to authenticated using (public.is_admin());

-- Admin list is never directly readable/writable by browser clients.
-- The SECURITY DEFINER function above is the only client-facing check.
revoke all on table public.admins from anon, authenticated;

-- 5) Storage bucket and policies for profile photos, covers, and audio.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media read" on storage.objects;
drop policy if exists "media admin write" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
create policy "media public read" on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- Ensure browser roles have table privileges; RLS still controls which rows they can change.
grant usage on schema public to anon, authenticated;
grant select on public.artists, public.releases, public.news, public.settings to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant select, insert, update, delete on public.artists, public.releases, public.news, public.settings to authenticated;
grant select, delete on public.messages to authenticated;

commit;

-- Verify admin setup (this should return your email):
-- select email from public.admins;
-- Verify current logged-in JWT is_admin from the browser by calling RPC only if you expose it separately;
