-- 008_academic_levels.sql
-- Adds optional grade-level tagging to courses (KG through University),
-- used by the Academic Studies page and the level filter on the
-- self-paced course browser. Run after 001.

alter table courses add column if not exists education_level text;
-- Expected values used by the frontend: 'kg', 'elementary', 'middle_school',
-- 'high_school', 'university', or NULL for general (non-academic) courses.
