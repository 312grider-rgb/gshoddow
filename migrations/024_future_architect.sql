-- 024_future_architect.sql
-- Future Architect: each learner's saved foresight projects (understand change,
-- opportunities, possible futures, plan, tests). One row per project; the whole
-- project lives in `data` so the page can evolve without new migrations.
-- Run after 023.

create table if not exists future_projects (
  user_id uuid references auth.users(id) on delete cascade not null,
  id text not null,
  title text not null default 'Untitled project',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, id)
);
create index if not exists future_projects_user_idx on future_projects (user_id, created_at);
alter table future_projects enable row level security;

drop policy if exists "Users manage their own future projects" on future_projects;
create policy "Users manage their own future projects" on future_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
