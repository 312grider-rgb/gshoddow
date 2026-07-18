-- 004_saved_courses.sql
-- Lets learners bookmark courses for later. Run after 001.

create table if not exists saved_courses (
  user_id uuid references auth.users(id) not null,
  course_id uuid references courses(id) not null,
  created_at timestamptz default now(),
  primary key (user_id, course_id)
);
alter table saved_courses enable row level security;

drop policy if exists "Users manage their own saved courses" on saved_courses;
create policy "Users manage their own saved courses" on saved_courses for all using (auth.uid() = user_id);
