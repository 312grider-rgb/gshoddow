-- 009_leaderboard_and_discussion.sql
-- Public counters on profiles (needed because RLS blocks reading other
-- users' private lesson_progress rows directly — the Leaderboard reads
-- these instead), plus safe increment functions, plus course discussion
-- threads. Run after 001 and 002.

alter table profiles add column if not exists lessons_completed_count int default 0;
alter table profiles add column if not exists certificates_count int default 0;

create or replace function adjust_lessons_completed_count(delta int)
returns void as $$
begin
  update profiles set lessons_completed_count = greatest(0, coalesce(lessons_completed_count,0) + delta)
  where id = auth.uid();
end;
$$ language plpgsql security definer;

create or replace function adjust_certificates_count(delta int)
returns void as $$
begin
  update profiles set certificates_count = greatest(0, coalesce(certificates_count,0) + delta)
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- Course discussion rooms
create table if not exists course_comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  user_id uuid references auth.users(id) not null,
  message text not null,
  created_at timestamptz default now()
);
alter table course_comments enable row level security;

drop policy if exists "Anyone can read course comments" on course_comments;
create policy "Anyone can read course comments" on course_comments for select using (true);

drop policy if exists "Users can post their own comments" on course_comments;
create policy "Users can post their own comments" on course_comments for insert with check (auth.uid() = user_id);
