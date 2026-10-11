-- 025_teacher_student_sharing.sql
-- "Shared with teachers": a private space for ONE student and ONE teacher to
-- share documents, PDFs, audio (songs, recordings), video, links and notes.
--
-- Safety rules enforced here in the database (not just in the page):
--   * A space only works between a teacher and a student who are in the same
--     classroom (classrooms.teacher_id + classroom_members.role = 'student').
--   * Only those two people can see or add to their space. Other students,
--     other teachers and strangers cannot.
--   * Files live in a PRIVATE storage bucket and are opened through short-lived
--     signed links. There are no public file URLs.
--   * Only safe file types are accepted, with a 40 MB size limit per file.
--   * Items are never hard-deleted by the page; they are marked 'removed'.
--   * Either person can report an item. Reports are readable by admins only.
-- Run after 024. Needs the existing classrooms and classroom_members tables
-- (column names are detected automatically).

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Your classroom tables may name their columns differently from what this file
-- assumes, so we look at the real columns and build a small private view
-- (lne_classroom_students: teacher_id, student_id) that everything below uses.
-- Nobody but the database itself can read this view.
do $$
declare
  t_col text; link_col text; stu_col text; role_col text; cond text := 'true';
begin
  select column_name into t_col from information_schema.columns
   where table_schema='public' and table_name='classrooms'
     and column_name in ('teacher_id','owner_id','created_by','instructor_id','user_id')
   order by array_position(array['teacher_id','owner_id','created_by','instructor_id','user_id'], column_name::text) limit 1;

  select column_name into link_col from information_schema.columns
   where table_schema='public' and table_name='classroom_members'
     and column_name in ('classroom_id','class_id','classroom')
   order by array_position(array['classroom_id','class_id','classroom'], column_name::text) limit 1;

  select column_name into stu_col from information_schema.columns
   where table_schema='public' and table_name='classroom_members'
     and column_name in ('user_id','student_id','profile_id','member_id')
   order by array_position(array['user_id','student_id','profile_id','member_id'], column_name::text) limit 1;

  select column_name into role_col from information_schema.columns
   where table_schema='public' and table_name='classroom_members' and column_name = 'role';

  if t_col is null or link_col is null or stu_col is null then
    raise exception 'Could not find the classroom columns. classrooms teacher column: %, classroom_members class column: %, student column: %. Columns found in classroom_members: %',
      t_col, link_col, stu_col,
      (select string_agg(column_name, ', ') from information_schema.columns where table_schema='public' and table_name='classroom_members');
  end if;

  if role_col is not null then
    cond := format('(m.%I::text = ''student'' or m.%I is null)', role_col, role_col);
  end if;

  execute format(
    'create or replace view public.lne_classroom_students as
       select distinct c.%I::uuid as teacher_id, m.%I::uuid as student_id
       from public.classrooms c
       join public.classroom_members m on m.%I = c.id
       where %s',
    t_col, stu_col, link_col, cond);
  execute 'revoke all on public.lne_classroom_students from anon, authenticated';
end $$;

-- True when the signed-in user is the teacher or the student in the pair AND
-- the teacher currently teaches a classroom the student belongs to.
create or replace function teaches_student(t uuid, s uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() in (t, s)
    and exists (
      select 1 from public.lne_classroom_students v
      where v.teacher_id = t and v.student_id = s
    );
$$;

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

-- Storage object names look like  <teacher_uuid>/<student_uuid>/<file>.
-- These two functions read that path safely (the regex guard runs before any
-- cast, so a malformed name returns false instead of raising an error).
create or replace function shared_path_member(name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+'
      then auth.uid() in (split_part(name, '/', 1)::uuid, split_part(name, '/', 2)::uuid)
    else false
  end;
$$;

create or replace function shared_path_connected(name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+'
      then teaches_student(split_part(name, '/', 1)::uuid, split_part(name, '/', 2)::uuid)
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Shared items (files, links, notes)
-- ---------------------------------------------------------------------------
create table if not exists shared_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  uploader_id uuid references auth.users(id) on delete cascade not null,
  kind text not null check (kind in ('document','pdf','audio','video','image','link','note')),
  title text not null check (char_length(title) between 1 and 200),
  note text check (note is null or char_length(note) <= 2000),
  storage_path text,
  link_url text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 41943040),
  status text not null default 'active' check (status in ('active','removed')),
  created_at timestamptz default now(),
  check (uploader_id in (teacher_id, student_id)),
  check (kind in ('link','note') or storage_path is not null),
  check (kind <> 'link' or (link_url is not null and link_url ~ '^https://')),
  check (storage_path is null or storage_path like teacher_id::text || '/' || student_id::text || '/%')
);
create index if not exists shared_items_pair_idx on shared_items (teacher_id, student_id, created_at desc);
create index if not exists shared_items_student_idx on shared_items (student_id, created_at desc);
alter table shared_items enable row level security;

drop policy if exists "Pair members read shared items" on shared_items;
create policy "Pair members read shared items" on shared_items
  for select using (
    auth.uid() = uploader_id
    or (auth.uid() in (teacher_id, student_id) and teaches_student(teacher_id, student_id))
  );

drop policy if exists "Pair members add shared items" on shared_items;
create policy "Pair members add shared items" on shared_items
  for insert with check (
    uploader_id = auth.uid()
    and auth.uid() in (teacher_id, student_id)
    and teaches_student(teacher_id, student_id)
  );

-- The uploader, or the teacher of the space, may mark an item removed.
drop policy if exists "Uploader or teacher can remove items" on shared_items;
create policy "Uploader or teacher can remove items" on shared_items
  for update using (auth.uid() = uploader_id or auth.uid() = teacher_id)
  with check (auth.uid() = uploader_id or auth.uid() = teacher_id);
-- Only the status column can ever change after an item is created.
revoke update on shared_items from authenticated, anon;
grant update (status) on shared_items to authenticated;

-- ---------------------------------------------------------------------------
-- Comments on an item
-- ---------------------------------------------------------------------------
create table if not exists shared_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references shared_items(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz default now()
);
create index if not exists shared_comments_item_idx on shared_comments (item_id, created_at);
alter table shared_comments enable row level security;

-- The sub-selects below run under the shared_items policies, so a person can
-- only read comments on items they are allowed to see.
drop policy if exists "Read comments on visible items" on shared_comments;
create policy "Read comments on visible items" on shared_comments
  for select using (exists (select 1 from shared_items i where i.id = item_id));

drop policy if exists "Comment on active items in your space" on shared_comments;
create policy "Comment on active items in your space" on shared_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from shared_items i
      where i.id = item_id
        and i.status = 'active'
        and auth.uid() in (i.teacher_id, i.student_id)
        and teaches_student(i.teacher_id, i.student_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Requests ("please upload your recording of the poem")
-- ---------------------------------------------------------------------------
create table if not exists shared_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete cascade not null,
  student_id uuid references auth.users(id) on delete cascade not null,
  text text not null check (char_length(text) between 1 and 500),
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists shared_requests_pair_idx on shared_requests (teacher_id, student_id, created_at desc);
alter table shared_requests enable row level security;

drop policy if exists "Pair members read requests" on shared_requests;
create policy "Pair members read requests" on shared_requests
  for select using (auth.uid() in (teacher_id, student_id) and teaches_student(teacher_id, student_id));

drop policy if exists "Teacher creates requests" on shared_requests;
create policy "Teacher creates requests" on shared_requests
  for insert with check (auth.uid() = teacher_id and teaches_student(teacher_id, student_id));

drop policy if exists "Pair members tick requests" on shared_requests;
create policy "Pair members tick requests" on shared_requests
  for update using (auth.uid() in (teacher_id, student_id) and teaches_student(teacher_id, student_id))
  with check (auth.uid() in (teacher_id, student_id));
revoke update on shared_requests from authenticated, anon;
grant update (done, done_at) on shared_requests to authenticated;

drop policy if exists "Teacher deletes requests" on shared_requests;
create policy "Teacher deletes requests" on shared_requests
  for delete using (auth.uid() = teacher_id);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists shared_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references shared_items(id) on delete cascade not null,
  reporter_id uuid references auth.users(id) on delete cascade not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz default now(),
  unique (item_id, reporter_id)
);
alter table shared_reports enable row level security;

drop policy if exists "Report items you can see" on shared_reports;
create policy "Report items you can see" on shared_reports
  for insert with check (
    reporter_id = auth.uid()
    and exists (select 1 from shared_items i where i.id = item_id)
  );

drop policy if exists "Reporter or admin reads reports" on shared_reports;
create policy "Reporter or admin reads reports" on shared_reports
  for select using (reporter_id = auth.uid() or is_platform_admin());

-- A ready-made list for admins reviewing reports (run in the SQL editor):
--   select r.created_at, r.reason, i.kind, i.title, i.uploader_id, i.teacher_id, i.student_id
--   from shared_reports r join shared_items i on i.id = r.item_id order by r.created_at desc;

-- ---------------------------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-shared', 'teacher-shared', false, 41943040,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/png', 'image/jpeg', 'image/webp',
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Shared files: pair reads" on storage.objects;
create policy "Shared files: pair reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'teacher-shared' and shared_path_member(name));

drop policy if exists "Shared files: connected pair uploads" on storage.objects;
create policy "Shared files: connected pair uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'teacher-shared' and shared_path_connected(name));

drop policy if exists "Shared files: pair deletes" on storage.objects;
create policy "Shared files: pair deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'teacher-shared' and shared_path_member(name));
