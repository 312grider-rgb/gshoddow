-- 015_grade_registration.sql

-- Students register their grade/class level. Same value set as the
-- education_level used on courses, so filtering lines up naturally.
alter table profiles add column if not exists grade_level text;
-- Expected values: 'kg', 'grade_1' .. 'grade_12', 'university'

-- Teachers can optionally target a live class at a specific grade level.
-- NULL means open to everyone regardless of registered grade.
alter table live_sessions add column if not exists target_grade_level text;
