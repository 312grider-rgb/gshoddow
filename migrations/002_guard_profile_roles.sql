-- FIX 1: stop users from giving themselves a privileged role (PostgreSQL / Supabase)
-- ADDITIVE: adds one function and one trigger. Changes no existing data, policy or column.
-- NOT RUN YET: review, then run in the Supabase SQL editor.
--
-- What it does for requests coming from the app (a logged-in browser user):
--   * a profile may only be created or changed to role 'student' or 'teacher'
--   * a user cannot change a privileged role (admin or anything else) on their own row
-- Not affected: server-side code with the service key, the SQL editor, and database triggers
-- (they have no auth.uid()), and platform admins (is_platform_admin()).
--
-- ASSUMPTION: people may still choose 'student' or 'teacher' themselves, as today.
-- If teachers should be approved by an admin instead, tell me and I'll tighten it.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Server-side or SQL editor session: allow
  if auth.uid() is null then
    return new;
  end if;

  -- Platform admins may set any role
  if public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is not null and new.role not in ('student', 'teacher') then
      raise exception 'This role cannot be set from the app';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      if (old.role is not null and old.role not in ('student', 'teacher'))
         or (new.role is not null and new.role not in ('student', 'teacher')) then
        raise exception 'This role change is not allowed from the app';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------
-- TEST (replace <USER_UUID> with the id of one of your two test users).
-- Run everything together; it is rolled back at the end, so nothing is saved.
--
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims', '{"sub":"<USER_UUID>","role":"authenticated"}', true);
-- update profiles set role = 'admin' where id = '<USER_UUID>';   -- expect: ERROR
-- rollback;
--
-- Also confirm in the app that a normal profile edit (name, bio, avatar) still works.
-- ---------------------------------------------------------------
-- ROLLBACK:
-- drop trigger if exists guard_profile_role on public.profiles;
-- drop function if exists public.guard_profile_role();
