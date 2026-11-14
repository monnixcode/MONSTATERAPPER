-- Mon HipHop v3 metrics
-- Run once in Supabase SQL Editor after the existing ALL-IN-ONE.sql.
create table if not exists public.public_metrics (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('site_visit','music_play','video_view')),
  target_id uuid,
  created_at timestamptz not null default now()
);
alter table public.public_metrics enable row level security;
drop policy if exists "public can add metrics" on public.public_metrics;
create policy "public can add metrics" on public.public_metrics
for insert to anon, authenticated
with check (
  (event_type='site_visit' and target_id is null)
  or (event_type='music_play' and exists(select 1 from public.releases r where r.id=target_id))
  or (event_type='video_view' and exists(select 1 from public.videos v where v.id=target_id))
);
revoke all on public.public_metrics from anon, authenticated;
grant insert on public.public_metrics to anon, authenticated;

create or replace function public.get_public_stats()
returns json language sql stable security definer set search_path=public as $$
 select json_build_object(
  'artist_count',(select count(*) from public.artists),
  'user_count',(select count(*) from auth.users),
  'site_visits',(select count(*) from public.public_metrics where event_type='site_visit'),
  'video_views',(select count(*) from public.public_metrics where event_type='video_view'),
  'music_plays',(select coalesce(sum(play_count),0) from public.releases)
 );
$$;
revoke all on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated;
