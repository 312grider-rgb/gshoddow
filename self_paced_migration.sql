-- Self-Paced Learning — course structure, progress tracking, certificates.
-- Run this in Supabase Dashboard → SQL Editor.

-- A self-paced course, created by a teacher.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  cover_image_url text,
  subject text,
  published boolean default false,
  created_at timestamptz default now()
);

-- A lesson within a course. video_url stores a YouTube video ID
-- (unlisted video) — the lesson page embeds it directly.
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  video_url text,             -- YouTube video ID, e.g. "dQw4w9WgXcQ"
  reading_content text,       -- optional article/notes text for the lesson
  file_url text,              -- optional downloadable file (Supabase Storage URL)
  order_index int not null default 0,
  created_at timestamptz default now()
);

-- Tracks which lessons a student has completed.
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique(user_id, lesson_id)
);

-- Issued once a student completes every lesson in a course.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  issued_at timestamptz default now(),
  unique(user_id, course_id)
);

-- ── Row Level Security ──

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.certificates enable row level security;

-- Courses: anyone can view published courses; only the teacher can manage their own.
drop policy if exists "Anyone can view published courses" on public.courses;
create policy "Anyone can view published courses"
  on public.courses for select
  using (published = true or teacher_id = auth.uid());

drop policy if exists "Teachers manage their own courses" on public.courses;
create policy "Teachers manage their own courses"
  on public.courses for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Lessons: viewable if the parent course is viewable.
drop policy if exists "Anyone can view lessons of visible courses" on public.lessons;
create policy "Anyone can view lessons of visible courses"
  on public.lessons for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
      and (c.published = true or c.teacher_id = auth.uid())
    )
  );

drop policy if exists "Teachers manage lessons of their own courses" on public.lessons;
create policy "Teachers manage lessons of their own courses"
  on public.lessons for all
  using (
    exists (select 1 from public.courses c where c.id = lessons.course_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.courses c where c.id = lessons.course_id and c.teacher_id = auth.uid())
  );

-- Lesson progress: users manage only their own rows.
drop policy if exists "Users manage their own lesson progress" on public.lesson_progress;
create policy "Users manage their own lesson progress"
  on public.lesson_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Certificates: users view their own; only earned via the app logic (insert
-- happens server-side/client-side once all lessons are complete).
drop policy if exists "Users view their own certificates" on public.certificates;
create policy "Users view their own certificates"
  on public.certificates for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own certificate" on public.certificates;
create policy "Users can insert their own certificate"
  on public.certificates for insert
  with check (user_id = auth.uid());

create index if not exists idx_lessons_course on public.lessons(course_id, order_index);
create index if not exists idx_progress_user_lesson on public.lesson_progress(user_id, lesson_id);
