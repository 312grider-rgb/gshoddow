-- 020_incentive_system_phase2.sql
-- Additive follow-up to 019. Run after 019.

-- Prevent the same person from spam-clicking "Mark Helpful" on the same
-- comment/post to farm community_contributions rows. NULL reference_id
-- rows (manual/freeform recognition) are unaffected — Postgres treats
-- NULLs as distinct for uniqueness, so those can still repeat.
create unique index if not exists uq_contribution_per_recognizer
  on community_contributions (recognized_by, reference_table, reference_id);

-- Starter challenge catalog (subject-agnostic — this platform spans many
-- subjects, so these are phrased generically; teachers can add their own
-- via the "Teachers can create challenges" policy from 019). Seeded by
-- title match rather than ON CONFLICT, since challenges has no unique
-- column to use as a conflict target — this keeps the migration safe to
-- run more than once without duplicating rows.
insert into challenges (type, title, description, difficulty)
select v.type, v.title, v.description, v.difficulty
from (values
  ('daily',   'Explain It in Your Own Words',
              'Pick something you learned recently and explain it in your own words, as if teaching a friend.',
              'easy'),
  ('weekly',  'Teach Someone Something New',
              'Teach another learner something you understand — in a course discussion, a message, or in person.',
              'normal'),
  ('skill',   'Apply It to Something Real',
              'Take a skill you are building and use it to solve one small, real problem — not just a practice exercise.',
              'hard'),
  ('project', 'Real-World Project',
              'Take on a small project that combines several things you have learned into one finished piece of work.',
              'hard')
) as v(type, title, description, difficulty)
where not exists (select 1 from challenges c where c.title = v.title);
