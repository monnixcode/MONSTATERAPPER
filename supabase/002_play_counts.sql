-- ระบบนับยอดฟัง — รันใน Supabase > SQL Editor (ถ้าเคยรัน schema.sql เวอร์ชันเก่าไปแล้ว)
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
