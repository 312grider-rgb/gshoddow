-- 022_teacher_insights.sql
-- Gives teachers real read access to their own students' progress.
-- Run after 021.
--
-- lesson_progress and certificates both currently have only one RLS
-- policy each — "for all using (auth.uid() = user_id)" — meaning a
-- teacher querying either table for their students gets zero rows back.
-- That's a pre-existing gap, not something introduced by the incentive
-- system: it's why the teacher dashboard's "Certs Issued" stat has always
-- shown 0, and it would have silently broken the student-list dropdown on
-- skillstream-recognition.html.
--
-- Fixed two ways, matching what 012_spotlights.sql already established
-- for this exact class of problem:
--   1. certificates gets one additive SELECT policy (a teacher can see
--      certs for courses they teach — no row is ever written or changed
--      by this, and students' own access is untouched).
--   2. lesson_progress stays exactly as restrictive as it is — instead,
--      three SECURITY DEFINER functions return only aggregated/scoped
--      data (never a raw cross-student table), and each one verifies the
--      caller actually owns the course before returning anything.

-- ─── CERTIFICATES: additive teacher visibility ───────────────────────────────
drop policy if exists "Teachers can view certificates for their courses" on certificates;
create policy "Teachers can view certificates for their courses" on certificates
  for select using (
    exists (select 1 from courses c where c.id = certificates.course_id and c.teacher_id = auth.uid())
  );

-- ─── STUDENTS IN A COURSE (replaces the broken direct query in
--     skillstream-recognition.html's loadStudents()) ────────────────────────
create or replace function get_students_in_course(p_course_id uuid)
returns table(user_id uuid, full_name text) as $$
begin
  if not exists (select 1 from courses c where c.id = p_course_id and c.teacher_id = auth.uid()) then
    raise exception 'Not authorized for this course';
  end if;

  return query
    select distinct p.id, p.full_name
    from lesson_progress lp
    join lessons l on l.id = lp.lesson_id
    join profiles p on p.id = lp.user_id
    where l.course_id = p_course_id
    order by p.full_name;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function get_students_in_course(uuid) to authenticated;

-- ─── PER-LESSON STATS (for "which lesson is everyone stuck on") ──────────────
create or replace function get_course_lesson_stats(p_course_id uuid)
returns table(lesson_id uuid, lesson_title text, order_index int, students_started bigint, students_completed bigint)
as $$
begin
  if not exists (select 1 from courses c where c.id = p_course_id and c.teacher_id = auth.uid()) then
    raise exception 'Not authorized for this course';
  end if;

  return query
    select
      l.id,
      l.title,
      l.order_index,
      count(lp.id)::bigint as students_started,
      count(lp.id) filter (where lp.completed)::bigint as students_completed
    from lessons l
    left join lesson_progress lp on lp.lesson_id = l.id
    where l.course_id = p_course_id
    group by l.id, l.title, l.order_index
    order by l.order_index nulls last;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function get_course_lesson_stats(uuid) to authenticated;

-- ─── PER-STUDENT STATS (for "who needs help") ────────────────────────────────
create or replace function get_course_student_stats(p_course_id uuid)
returns table(user_id uuid, full_name text, completed_count bigint, total_lessons bigint, last_activity timestamptz)
as $$
declare
  v_total_lessons bigint;
begin
  if not exists (select 1 from courses c where c.id = p_course_id and c.teacher_id = auth.uid()) then
    raise exception 'Not authorized for this course';
  end if;

  select count(*) into v_total_lessons from lessons where course_id = p_course_id;

  return query
    select
      p.id,
      p.full_name,
      count(lp.id) filter (where lp.completed)::bigint as completed_count,
      v_total_lessons,
      max(lp.completed_at) as last_activity
    from lesson_progress lp
    join lessons l on l.id = lp.lesson_id
    join profiles p on p.id = lp.user_id
    where l.course_id = p_course_id
    group by p.id, p.full_name
    order by completed_count asc;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function get_course_student_stats(uuid) to authenticated;
