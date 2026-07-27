-- 017_library_and_showcase.sql

-- LIBRARY: books organized by academic grade or general skill subject.
-- Either external_url (legal free source like Project Gutenberg/OpenStax)
-- or pdf_url (teacher-uploaded original material) should be set.
create table if not exists library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  subject text,                  -- e.g. 'Math', 'Science', matches course categories
  grade_level text,               -- 'kg', 'grade_1'..'grade_12', 'university', or NULL for general skill
  is_academic boolean default true, -- true = academic grade shelf, false = general skill shelf
  cover_url text,
  external_url text,              -- legal free external source (Gutenberg, OpenStax, Internet Archive, etc.)
  pdf_url text,                   -- teacher-uploaded original PDF (Supabase Storage)
  description text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table library_books enable row level security;

drop policy if exists "Anyone can view library books" on library_books;
create policy "Anyone can view library books" on library_books for select using (true);

drop policy if exists "Teachers can upload their own books" on library_books;
create policy "Teachers can upload their own books" on library_books for insert with check (auth.uid() = uploaded_by);

drop policy if exists "Teachers manage their own uploads" on library_books;
create policy "Teachers manage their own uploads" on library_books for update using (auth.uid() = uploaded_by);

drop policy if exists "Teachers can delete their own uploads" on library_books;
create policy "Teachers can delete their own uploads" on library_books for delete using (auth.uid() = uploaded_by);


-- PROJECT SHOWCASE: public gallery of student/teacher projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  subject text,
  image_url text,
  link_url text,
  is_teachers_pick boolean default false,
  created_at timestamptz default now()
);
alter table projects enable row level security;

drop policy if exists "Anyone can view projects" on projects;
create policy "Anyone can view projects" on projects for select using (true);

drop policy if exists "Users manage their own projects" on projects;
create policy "Users manage their own projects" on projects for all using (auth.uid() = user_id);

-- Teachers need to be able to pin ANY project as a "Teacher's Pick", not
-- just their own -- a separate, narrower policy just for that one column
-- via a function, since a blanket "teachers can update any project" policy
-- would let them edit titles/descriptions too, which we don't want.
create or replace function set_teachers_pick(p_project_id uuid, p_value boolean)
returns void as $$
declare
  caller_role text;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role != 'teacher' and caller_role != 'admin' then
    raise exception 'Only teachers can set a Teacher''s Pick.';
  end if;
  update projects set is_teachers_pick = p_value where id = p_project_id;
end;
$$ language plpgsql security definer;

grant execute on function set_teachers_pick(uuid, boolean) to authenticated;

create table if not exists project_likes (
  project_id uuid references projects(id) not null,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);
alter table project_likes enable row level security;

drop policy if exists "Anyone can view likes" on project_likes;
create policy "Anyone can view likes" on project_likes for select using (true);

drop policy if exists "Users manage their own likes" on project_likes;
create policy "Users manage their own likes" on project_likes for all using (auth.uid() = user_id);

create table if not exists project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) not null,
  user_id uuid references auth.users(id) not null,
  body text not null,
  created_at timestamptz default now()
);
alter table project_comments enable row level security;

drop policy if exists "Anyone can read project comments" on project_comments;
create policy "Anyone can read project comments" on project_comments for select using (true);

drop policy if exists "Users can post their own project comments" on project_comments;
create policy "Users can post their own project comments" on project_comments for insert with check (auth.uid() = user_id);
