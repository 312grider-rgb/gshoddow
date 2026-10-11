-- 027_classroom_content.sql
-- Announcements, assignments, submissions, quizzes, quiz results and class chat.
-- Makes sure the tables exist with the columns the Classrooms page uses, then
-- REPLACES every access rule on them (old rules referred to a classroom_members
-- column your database does not have, so reads failed). Safe to run more than once.
-- Run after 026. Stands on its own: it recreates the two helper functions it needs.

create or replace function lne_is_class_teacher(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from classrooms where id = cid and teacher_id = auth.uid());
$$;
create or replace function lne_is_class_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from classroom_members where classroom_id = cid and student_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Tables (created only if missing) + any missing columns
-- ---------------------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references classrooms(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null,
  title text, body text,
  created_at timestamptz default now()
);
alter table announcements add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table announcements add column if not exists title text;
alter table announcements add column if not exists body text;
alter table announcements add column if not exists created_at timestamptz default now();

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references classrooms(id) on delete cascade not null,
  title text not null, description text,
  due_date date, points int default 100, file_url text,
  created_at timestamptz default now()
);
alter table assignments add column if not exists description text;
alter table assignments add column if not exists due_date date;
alter table assignments add column if not exists points int default 100;
alter table assignments add column if not exists file_url text;
alter table assignments add column if not exists created_at timestamptz default now();

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text, file_url text,
  submitted_at timestamptz default now(),
  grade numeric, feedback text, graded_at timestamptz
);
alter table submissions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table submissions add column if not exists content text;
alter table submissions add column if not exists file_url text;
alter table submissions add column if not exists submitted_at timestamptz default now();
alter table submissions add column if not exists grade numeric;
alter table submissions add column if not exists feedback text;
alter table submissions add column if not exists graded_at timestamptz;

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references classrooms(id) on delete cascade not null,
  title text not null, questions jsonb not null default '[]',
  created_at timestamptz default now()
);
alter table quizzes add column if not exists questions jsonb not null default '[]';
alter table quizzes add column if not exists created_at timestamptz default now();

create table if not exists quiz_results (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  score numeric, answers jsonb,
  submitted_at timestamptz default now()
);
alter table quiz_results add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table quiz_results add column if not exists score numeric;
alter table quiz_results add column if not exists answers jsonb;
alter table quiz_results add column if not exists submitted_at timestamptz default now();

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references classrooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now()
);
alter table messages add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table messages add column if not exists body text;
alter table messages add column if not exists created_at timestamptz default now();

-- If an older version of these tables used student_id / author_id for the person,
-- copy it into user_id so existing rows stay visible.
do $$
declare t text; alt text;
begin
  foreach t in array array['submissions','quiz_results','messages'] loop
    foreach alt in array array['student_id','author_id','sender_id'] loop
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=alt) then
        execute format('update public.%I set user_id = %I where user_id is null', t, alt);
      end if;
    end loop;
  end loop;
end $$;

-- One submission / one result per person (the page upserts on these).
create unique index if not exists submissions_one_per_student on submissions (assignment_id, user_id);
create unique index if not exists quiz_results_one_per_student on quiz_results (quiz_id, user_id);
create index if not exists announcements_class_idx on announcements (classroom_id, created_at desc);
create index if not exists assignments_class_idx on assignments (classroom_id, due_date);
create index if not exists messages_class_idx on messages (classroom_id, created_at);

-- Look up the classroom of an assignment / quiz without tripping other rules.
create or replace function lne_assignment_class(aid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select classroom_id from assignments where id = aid;
$$;
create or replace function lne_quiz_class(qid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select classroom_id from quizzes where id = qid;
$$;

-- ---------------------------------------------------------------------------
-- Replace ALL existing rules on these tables
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public'
             and tablename in ('announcements','assignments','submissions','quizzes','quiz_results','messages')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table announcements enable row level security;
alter table assignments   enable row level security;
alter table submissions   enable row level security;
alter table quizzes       enable row level security;
alter table quiz_results  enable row level security;
alter table messages      enable row level security;

-- announcements: class members read; the teacher posts and removes
create policy "Class reads announcements" on announcements for select
  using (lne_is_class_teacher(classroom_id) or lne_is_class_member(classroom_id));
create policy "Teacher posts announcements" on announcements for insert
  with check (lne_is_class_teacher(classroom_id) and author_id = auth.uid());
create policy "Teacher removes announcements" on announcements for delete
  using (lne_is_class_teacher(classroom_id));

-- assignments: class members read; the teacher manages
create policy "Class reads assignments" on assignments for select
  using (lne_is_class_teacher(classroom_id) or lne_is_class_member(classroom_id));
create policy "Teacher adds assignments" on assignments for insert
  with check (lne_is_class_teacher(classroom_id));
create policy "Teacher edits assignments" on assignments for update
  using (lne_is_class_teacher(classroom_id)) with check (lne_is_class_teacher(classroom_id));
create policy "Teacher deletes assignments" on assignments for delete
  using (lne_is_class_teacher(classroom_id));

-- submissions: a student sees and sends their own; the teacher sees all and grades
create policy "Read submissions" on submissions for select
  using (user_id = auth.uid() or lne_is_class_teacher(lne_assignment_class(assignment_id)));
create policy "Student submits work" on submissions for insert
  with check (user_id = auth.uid() and lne_is_class_member(lne_assignment_class(assignment_id))
              and grade is null and feedback is null and graded_at is null);
create policy "Student updates own work" on submissions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Teacher grades work" on submissions for update
  using (lne_is_class_teacher(lne_assignment_class(assignment_id)))
  with check (lne_is_class_teacher(lne_assignment_class(assignment_id)));

-- A student can change their answer, never their grade.
create or replace function lne_protect_grades() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not lne_is_class_teacher(lne_assignment_class(new.assignment_id))
     and (new.grade is distinct from old.grade
          or new.feedback is distinct from old.feedback
          or new.graded_at is distinct from old.graded_at) then
    raise exception 'Only the teacher can grade work';
  end if;
  return new;
end $$;
drop trigger if exists lne_protect_grades_trg on submissions;
create trigger lne_protect_grades_trg before update on submissions
  for each row execute function lne_protect_grades();

-- quizzes: class members read; the teacher manages
create policy "Class reads quizzes" on quizzes for select
  using (lne_is_class_teacher(classroom_id) or lne_is_class_member(classroom_id));
create policy "Teacher adds quizzes" on quizzes for insert
  with check (lne_is_class_teacher(classroom_id));
create policy "Teacher deletes quizzes" on quizzes for delete
  using (lne_is_class_teacher(classroom_id));

-- quiz results: a student sees and saves their own; the teacher sees all
create policy "Read quiz results" on quiz_results for select
  using (user_id = auth.uid() or lne_is_class_teacher(lne_quiz_class(quiz_id)));
create policy "Student saves quiz result" on quiz_results for insert
  with check (user_id = auth.uid() and lne_is_class_member(lne_quiz_class(quiz_id)));
create policy "Student updates own quiz result" on quiz_results for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- class chat: everyone in the class reads and writes as themselves
create policy "Class reads chat" on messages for select
  using (lne_is_class_teacher(classroom_id) or lne_is_class_member(classroom_id));
create policy "Class posts chat" on messages for insert
  with check (user_id = auth.uid() and (lne_is_class_teacher(classroom_id) or lne_is_class_member(classroom_id)));
