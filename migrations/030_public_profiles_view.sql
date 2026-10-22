-- ALREADY RUN manually in Supabase on 2026-10-19 (kept here so the repo matches the database).
-- FIX 2, PART A: a safe public view of profiles (PostgreSQL / Supabase)
-- ADDITIVE ONLY: creates a view. Does NOT change the profiles table or its policies.
-- NOT RUN YET: review, then run in the Supabase SQL editor.
--
-- Purpose: let the app show leaderboards and public profiles WITHOUT exposing
-- email, phone, country, timezone or notification settings.
-- Part B (later, after the app code reads from this view): restrict direct access
-- to the profiles table so only the owner (and admins) can read email/phone.
--
-- ASSUMPTION: the columns below are what the leaderboard and public profile pages need.
-- Tell me if the app shows others' country, grade level or anything else.

create or replace view public.public_profiles as
select
  id,
  name,
  full_name,
  username,
  avatar_url,
  bio,
  skills,
  role,
  lessons_completed_count,
  certificates_count,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- TEST: select * from public.public_profiles limit 2;
--       (expect no email, phone, country or timezone columns)
-- ROLLBACK: drop view if exists public.public_profiles;
