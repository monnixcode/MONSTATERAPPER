-- รันทั้งไฟล์นี้ใน Supabase > SQL Editor (ครั้งเดียว)
create table artists(id uuid primary key default gen_random_uuid(),name text not null,role text default 'Rapper · Mon State',bio text,avatar_url text,cover_url text,links jsonb default '{}',sort int default 0,created_at timestamptz default now());
create table releases(id uuid primary key default gen_random_uuid(),title text not null,artist_id uuid references artists(id) on delete set null,type text default 'Single',release_date date,cover_url text,audio_url text,links jsonb default '{}',created_at timestamptz default now());
create table news(id uuid primary key default gen_random_uuid(),title text not null,body text,image_url text,published_at timestamptz default now());
create table messages(id uuid primary key default gen_random_uuid(),name text not null,email text not null,message text not null,created_at timestamptz default now());
create table settings(key text primary key,value text);
create table admins(email text primary key);

create function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from admins where email = auth.jwt()->>'email') $$;

alter table artists enable row level security; alter table releases enable row level security;
alter table news enable row level security; alter table messages enable row level security;
alter table settings enable row level security; alter table admins enable row level security;

create policy "read" on artists for select using (true);
create policy "read" on releases for select using (true);
create policy "read" on news for select using (true);
create policy "read" on settings for select using (true);
create policy "admin write" on artists for all using (is_admin()) with check (is_admin());
create policy "admin write" on releases for all using (is_admin()) with check (is_admin());
create policy "admin write" on news for all using (is_admin()) with check (is_admin());
create policy "admin write" on settings for all using (is_admin()) with check (is_admin());
create policy "anyone can send" on messages for insert with check (length(message) < 5000);
create policy "admin read" on messages for select using (is_admin());
create policy "admin delete" on messages for delete using (is_admin());

-- ที่เก็บไฟล์ (รูป/เพลง) แบบสาธารณะ
insert into storage.buckets(id,name,public) values('media','media',true) on conflict do nothing;
create policy "media read" on storage.objects for select using (bucket_id='media');
create policy "media admin write" on storage.objects for insert with check (bucket_id='media' and is_admin());
create policy "media admin update" on storage.objects for update using (bucket_id='media' and is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id='media' and is_admin());

-- ===== ระบบนับยอดฟัง (เหมือน 002_play_counts.sql) =====
alter table releases add column if not exists play_count integer not null default 0;

create table if not exists play_events(
  release_id uuid references releases(id) on delete cascade,
  visitor text not null check (length(visitor) <= 64),
  day date not null default current_date,
  primary key (release_id, visitor, day)
);
alter table play_events enable row level security;  -- ไม่มี policy: เขียนได้ผ่านฟังก์ชันด้านล่างเท่านั้น

-- นับ 1 ครั้งต่อผู้เข้าชม/เพลง/วัน (คืน true ถ้านับ, false ถ้านับไปแล้ว)
create or replace function log_play(rid uuid, vid text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into play_events(release_id, visitor) values (rid, left(vid, 64)) on conflict do nothing;
  if not found then return false; end if;
  update releases set play_count = play_count + 1 where id = rid;
  return true;
end $$;
revoke all on function log_play(uuid, text) from public;
grant execute on function log_play(uuid, text) to anon, authenticated;

-- ★ ใส่อีเมลของคุณเป็นแอดมิน (แก้ก่อนรัน) แล้วสร้าง user ที่ Authentication > Users
insert into admins values ('monnixcode@gmail.com');
  
