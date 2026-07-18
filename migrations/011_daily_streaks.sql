-- 011_daily_streaks.sql
-- Backs the Daily Inspiration streak feature on the Home page. One row
-- per user per calendar day they mark as complete.

create table if not exists challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  completed_date date not null,
  created_at timestamptz default now(),
  unique(user_id, completed_date)
);
alter table challenge_completions enable row level security;

drop policy if exists "Users manage their own challenge completions" on challenge_completions;
create policy "Users manage their own challenge completions" on challenge_completions
  for all using (auth.uid() = user_id);
