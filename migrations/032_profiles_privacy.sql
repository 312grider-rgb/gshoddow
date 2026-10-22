-- 032: make profiles private (hide email, phone, country, timezone from other users)
-- PostgreSQL / Supabase. NOT RUN YET.
--
-- !! RUN THIS ONLY AFTER the updated website files are deployed on Vercel and you have
-- !! checked the pages listed in "AFTER RUNNING" below. Older pages read other people's
-- !! names straight from the profiles table; after this change they would show blanks.
--
-- What changes
--   * Before: anyone, including logged-out visitors, could read EVERY column of EVERY profile.
--   * After : a user reads only their own row. Admins read all rows.
--             Other people's name / avatar / bio / role / counts come from the
--             public_profiles view (migration 030), which has no email or phone.
-- Not changed: insert/update policies, the role-guard trigger (029), any data.

-- 1) The role guard (029) also accepts the legacy role 'both' that some pages still read.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;                                   -- server code or SQL editor
  end if;
  if public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is not null and new.role not in ('student', 'teacher', 'both') then
      raise exception 'This role cannot be set from the app';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      if (old.role is not null and old.role not in ('student', 'teacher', 'both'))
         or (new.role is not null and new.role not in ('student', 'teacher', 'both')) then
        raise exception 'This role change is not allowed from the app';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- 2) Replace the two "everyone can read everything" policies
drop policy if exists "Anyone can view profiles for leaderboard" on public.profiles;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users read own profile or admin" on public.profiles;

create policy "Users read own profile or admin" on public.profiles
  for select
  using (auth.uid() = id or public.is_platform_admin());

-- 3) OPTIONAL, separate decision: lets the Admin page change OTHER users' roles.
--    Today that button silently does nothing for other users because the only update
--    policy is "own row". Uncomment only if you want admins to manage roles.
-- drop policy if exists "Admins update any profile" on public.profiles;
-- create policy "Admins update any profile" on public.profiles
--   for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ---------------------------------------------------------------
-- AFTER RUNNING, check in the app (logged in AND logged out where the page is public):
--   Leaderboard, Teachers directory, Messages (list of people), Classrooms, Shared with
--   teachers, Recognition, Showcase, Dashboard (live sessions + teacher names), Home
--   (live sessions), Self-paced (discussion + reviews show names), your own Profile page.
-- SQL check, as a logged-in user (replace USER_ID with a real id; expect: only 1 row, your own):
--   begin; set local role authenticated;
--   select set_config('request.jwt.claims','{"sub":"USER_ID","role":"authenticated"}',true);
--   select count(*) from profiles;                -- expect 1
--   select count(*) from public_profiles;         -- expect all users
--   rollback;
-- ---------------------------------------------------------------
-- ROLLBACK (restores the old behaviour exactly):
-- drop policy if exists "Users read own profile or admin" on public.profiles;
-- create policy "Anyone can view profiles for leaderboard" on public.profiles for select using (true);
-- create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
