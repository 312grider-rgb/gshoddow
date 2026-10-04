-- 023_reflections.sql
-- Lightweight, optional reflection prompts after a lesson or challenge.
-- Deliberately NOT scored or tied to achievements/incentives — this is
-- for building a genuine learning profile over time (what was hard, what
-- clicked), not another thing to optimize. Run after 022.

create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  context_type text not null, -- 'lesson' | 'challenge'
  context_id uuid,
  prompt text not null,
  response text not null,
  created_at timestamptz default now()
);
alter table reflections enable row level security;

drop policy if exists "Users manage their own reflections" on reflections;
create policy "Users manage their own reflections" on reflections for all using (auth.uid() = user_id);
