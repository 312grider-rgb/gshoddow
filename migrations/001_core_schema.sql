-- 001_core_schema.sql
-- Core tables: courses, lessons, certificates
-- Run this first — everything else depends on these existing.

-- courses
alter table courses add column if not exists title text;
alter table courses add column if not exists description text;
alter table courses add column if not exists category text;
alter table courses add column if not exists thumbnail_url text;
alter table courses add column if not exists teacher_id uuid references auth.users(id);
alter table courses add column if not exists is_published boolean default false;
alter table courses add column if not exists created_at timestamptz default now();
alter table courses enable row level security;

drop policy if exists "Anyone can view published courses" on courses;
create policy "Anyone can view published courses" on courses
  for select using (is_published = true or teacher_id = auth.uid());

drop policy if exists "Teachers manage their own courses" on courses;
create policy "Teachers manage their own courses" on courses
  for all using (auth.uid() = teacher_id);

-- lessons
alter table lessons add column if not exists course_id uuid references courses(id);
alter table lessons add column if not exists title text;
alter table lessons add column if not exists video_url text;
alter table lessons add column if not exists content text;
alter table lessons add column if not exists duration_minutes int;
alter table lessons add column if not exists order_index int;
alter table lessons enable row level security;

drop policy if exists "Anyone can view lessons" on lessons;
create policy "Anyone can view lessons" on lessons for select using (true);

drop policy if exists "Teachers manage lessons in their courses" on lessons;
create policy "Teachers manage lessons in their courses" on lessons for all
  using (exists (select 1 from courses where courses.id = lessons.course_id and courses.teacher_id = auth.uid()));

-- certificates
alter table certificates add column if not exists user_id uuid references auth.users(id);
alter table certificates add column if not exists course_id uuid references courses(id);
alter table certificates add column if not exists issued_at timestamptz default now();
alter table certificates enable row level security;

drop policy if exists "Users manage their own certificates" on certificates;
create policy "Users manage their own certificates" on certificates for all using (auth.uid() = user_id);
