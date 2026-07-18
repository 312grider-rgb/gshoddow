-- 003_lesson_progress.sql
-- Tracks per-user, per-lesson completion. Run after 001.

alter table lesson_progress add column if not exists user_id uuid references auth.users(id);
alter table lesson_progress add column if not exists lesson_id uuid references lessons(id);
alter table lesson_progress add column if not exists completed boolean default false;
alter table lesson_progress add column if not exists completed_at timestamptz;
alter table lesson_progress enable row level security;

drop policy if exists "Users manage their own progress" on lesson_progress;
create policy "Users manage their own progress" on lesson_progress for all using (auth.uid() = user_id);
