-- 012_spotlights.sql
-- Secure, read-only aggregation functions powering "Student/Teacher of the
-- Day/Week/Month" on the Home page. These are SECURITY DEFINER so they can
-- read across all users' activity internally (bypassing RLS) but only ever
-- return the single winner's public info + a count — never raw rows from
-- other users' private tables. Run after 001, 002, 003.

create or replace function get_top_student(p_period text)
returns table(user_id uuid, full_name text, avatar_url text, lessons_done bigint)
as $$
declare
  cutoff timestamptz;
begin
  cutoff := case p_period
    when 'day' then date_trunc('day', now())
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '30 days'
    else now() - interval '1 day'
  end;

  return query
    select p.id, p.full_name, p.avatar_url, count(lp.id)::bigint as lessons_done
    from lesson_progress lp
    join profiles p on p.id = lp.user_id
    where lp.completed = true and lp.completed_at >= cutoff
    group by p.id, p.full_name, p.avatar_url
    order by lessons_done desc
    limit 1;
end;
$$ language plpgsql security definer;

create or replace function get_top_teacher(p_period text)
returns table(user_id uuid, full_name text, avatar_url text, certs_issued bigint)
as $$
declare
  cutoff timestamptz;
begin
  cutoff := case p_period
    when 'day' then date_trunc('day', now())
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '30 days'
    else now() - interval '1 day'
  end;

  return query
    select p.id, p.full_name, p.avatar_url, count(c.id)::bigint as certs_issued
    from certificates c
    join courses co on co.id = c.course_id
    join profiles p on p.id = co.teacher_id
    where c.issued_at >= cutoff
    group by p.id, p.full_name, p.avatar_url
    order by certs_issued desc
    limit 1;
end;
$$ language plpgsql security definer;

-- Allow any authenticated user to call these (they only ever return a
-- winner + count, never raw per-user rows).
grant execute on function get_top_student(text) to authenticated;
grant execute on function get_top_teacher(text) to authenticated;
