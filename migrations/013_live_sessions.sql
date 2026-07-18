-- 013_live_sessions.sql
-- Tracks real live video sessions (backed by Daily.co rooms). A teacher
-- starting a session inserts a row here; it's what "Live Classes
-- Happening Now" on the landing/home pages actually queries.

create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) not null,
  course_id uuid references courses(id),
  title text not null,
  room_url text not null,
  room_name text not null,
  status text not null default 'live', -- 'live' or 'ended'
  started_at timestamptz default now(),
  ended_at timestamptz
);
alter table live_sessions enable row level security;

drop policy if exists "Anyone can view live sessions" on live_sessions;
create policy "Anyone can view live sessions" on live_sessions for select using (true);

drop policy if exists "Teachers manage their own sessions" on live_sessions;
create policy "Teachers manage their own sessions" on live_sessions for all using (auth.uid() = teacher_id);
