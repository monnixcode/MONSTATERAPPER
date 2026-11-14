-- ==========================================================
-- Mon HipHop — 004: Activity log (เก็บ log การใช้งาน)
-- Run ONCE in Supabase > SQL Editor, AFTER 003. Safe to re-run.
--
-- Records automatically (by database triggers, so it cannot be skipped
-- or faked from the browser):
--   * artists / releases / news / settings : insert, update (only changed
--     columns, old -> new) and delete — who did it (admin / artist / visitor)
--   * messages : a new contact message (name only, NOT the text) and deletes
--   * auth     : account created, email confirmed, signed in
-- Play counting (log_play) is NOT logged here (it already has play_events).
--
-- Only admins can read the log. Nobody can edit or delete single rows;
-- the admin can purge old rows with admin_purge_logs(days).
-- ==========================================================

begin;

-- 1. TABLE --------------------------------------------------
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

commit;

-- CHECK: edit anything in the panel, then run:
select created_at, actor_role, actor_email, action, table_name, summary
from public.activity_log
order by id desc
limit 20;
