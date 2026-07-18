-- 002_profiles.sql
-- Profile fields and access policies. Run after 001.

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists role text default 'student';
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;

alter table profiles enable row level security;

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

-- Note: this select policy is intentionally public (not restricted to
-- auth.uid() = id) because the Leaderboard and Teacher Directory pages
-- need to read other users' name/role/avatar/bio. No sensitive fields
-- (like email or password) are stored in this table.
drop policy if exists "Anyone can view profiles for leaderboard" on profiles;
create policy "Anyone can view profiles for leaderboard" on profiles for select using (true);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);
