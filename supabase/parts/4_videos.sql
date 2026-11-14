-- ==========================================================
-- Mon HipHop — 005: Music videos
-- Run ONCE in Supabase > SQL Editor, AFTER 003 and 004. Safe to re-run.
--
-- Adds:
--   * table "videos": an uploaded video file (mp4/webm/mov) and/or a YouTube link
--   * artists manage ONLY their own videos (max 20 per artist); admin manages all
--   * storage bucket "media" now also accepts video files (still 50 MB / file
--     on the Supabase free plan — for bigger videos use the YouTube link)
--   * every change is written to the activity log (004)
-- ==========================================================

begin;

-- 1. TABLE --------------------------------------------------
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

-- CHECK
select count(*) as videos from public.videos;
