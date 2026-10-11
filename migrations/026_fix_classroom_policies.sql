-- 026_fix_classroom_policies.sql
-- Your classroom_members table has the columns: classroom_id, student_id, joined_at
-- (no user_id, no role). The access rules on classrooms / classroom_members were
-- written for a user_id column, so every query on classrooms failed with
--   column classroom_members.user_id does not exist
-- This rebuilds exactly those 7 rules against student_id. Safe to run more than once.
-- Run this BEFORE 025 (or again after it, it does not matter).

-- Helpers read the tables without triggering each other's rules (avoids
-- "infinite recursion detected in policy").
create or replace function lne_is_class_teacher(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from classrooms where id = cid and teacher_id = auth.uid());
$$;

create or replace function lne_is_class_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from classroom_members where classroom_id = cid and student_id = auth.uid());
$$;

alter table classrooms enable row level security;
alter table classroom_members enable row level security;

-- classrooms
drop policy if exists "Members and teacher can view classroom" on classrooms;
create policy "Members and teacher can view classroom" on classrooms
  for select using (teacher_id = auth.uid() or lne_is_class_member(id));

drop policy if exists "Teachers can create classrooms" on classrooms;
create policy "Teachers can create classrooms" on classrooms
  for insert with check (
    teacher_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('teacher','both','admin'))
  );

drop policy if exists "Teacher can update own classroom" on classrooms;
create policy "Teacher can update own classroom" on classrooms
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "Teacher can delete own classroom" on classrooms;
create policy "Teacher can delete own classroom" on classrooms
  for delete using (teacher_id = auth.uid());

-- classroom_members
drop policy if exists "Members visible to classroom teacher and members" on classroom_members;
create policy "Members visible to classroom teacher and members" on classroom_members
  for select using (
    student_id = auth.uid()
    or lne_is_class_teacher(classroom_id)
    or lne_is_class_member(classroom_id)
  );

drop policy if exists "Students can join classrooms" on classroom_members;
create policy "Students can join classrooms" on classroom_members
  for insert with check (student_id = auth.uid());

drop policy if exists "Students can leave classrooms" on classroom_members;
create policy "Students can leave classrooms" on classroom_members
  for delete using (student_id = auth.uid());

-- Joining with a class code. A student cannot read a classroom before they are a
-- member, so the lookup-by-code happens inside this function instead. It only
-- ever adds the CALLING user, and returns the classroom id.
create or replace function join_classroom(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; tid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id, teacher_id into cid, tid from classrooms where upper(code) = upper(btrim(p_code)) limit 1;
  if cid is null then raise exception 'No class found with that code.'; end if;
  if tid = auth.uid() then raise exception 'You are the teacher of this class.'; end if;
  insert into classroom_members (classroom_id, student_id)
  select cid, auth.uid()
  where not exists (select 1 from classroom_members where classroom_id = cid and student_id = auth.uid());
  return cid;
end $$;
revoke all on function join_classroom(text) from public, anon;
grant execute on function join_classroom(text) to authenticated;
