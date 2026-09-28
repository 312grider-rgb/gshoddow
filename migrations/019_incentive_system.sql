-- 019_incentive_system.sql
-- Learning Incentive System (additive). Run after 018.
--
-- Reuses existing tables instead of duplicating them:
--   - lesson_progress        -> lessons completed
--   - certificates           -> certificates earned
--   - challenge_completions  -> daily streak (already backs Home's Daily Inspiration)
--   - profiles.lessons_completed_count / certificates_count -> already-public counters
--   - courses.category       -> used as "skills learned" (no new skills catalog table;
--                                a skill map is just the distinct categories of a
--                                learner's completed courses)
--
-- New tables are only for things nothing existing tracks:
--   achievements, user_achievements, learning_goals,
--   challenges, challenge_progress, community_contributions, teacher_feedback.

-- ─── ACHIEVEMENTS (catalog) ──────────────────────────────────────────────────
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text not null,
  icon text not null default '🏅',
  category text not null default 'progress', -- progress | mastery | community | teaching | streak
  criteria_type text,   -- lessons_completed | certificates | streak_days | challenges_completed | community_contributions | goals_completed | null (manual/teacher-awarded)
  criteria_value int,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table achievements enable row level security;

drop policy if exists "Anyone can view achievements" on achievements;
create policy "Anyone can view achievements" on achievements for select using (true);
-- No insert/update/delete policy for regular users — the catalog is managed by migrations/admin only.

insert into achievements (code, title, description, icon, category, criteria_type, criteria_value, sort_order)
values
  ('first_lesson',        'First Lesson',          'Completed your very first lesson.',                 '🌱', 'progress',  'lessons_completed', 1,   10),
  ('ten_lessons',         '10 Lessons Completed',  'Completed 10 lessons.',                              '📚', 'progress',  'lessons_completed', 10,  20),
  ('twentyfive_lessons',  'Skill Builder',          'Completed 25 lessons.',                              '🛠️', 'mastery',   'lessons_completed', 25,  30),
  ('first_certificate',   'First Certificate',     'Earned your first certificate.',                     '🏅', 'mastery',   'certificates',      1,   40),
  ('three_certificates',  'Well Rounded',           'Earned 3 certificates across different courses.',    '🎓', 'mastery',   'certificates',      3,   50),
  ('five_certificates',   'Knowledge Builder',     'Earned 5 certificates.',                             '👑', 'mastery',   'certificates',      5,   60),
  ('first_week',          'First Week',            'Kept a 7-day learning streak.',                      '🔥', 'streak',    'streak_days',       7,   70),
  ('consistent_learner',  'Consistent Learner',    'Kept a 30-day learning streak.',                     '📆', 'streak',    'streak_days',       30,  80),
  ('problem_solver',      'Problem Solver',         'Completed a difficult challenge.',                   '🧩', 'mastery',   'challenges_completed', 1,  90),
  ('challenge_regular',   'Challenge Completed',   'Completed 5 learning challenges.',                   '🎯', 'mastery',   'challenges_completed', 5, 100),
  ('helpful_learner',     'Helpful Learner',       'Helped another learner and it was recognized.',      '🤝', 'community', 'community_contributions', 1, 110),
  ('knowledge_sharer',    'Knowledge Sharer',      'Recognized 5 times for helping the community.',      '💡', 'community', 'community_contributions', 5, 120),
  ('goal_setter',         'Goal Setter',            'Completed a personal learning goal.',                '🎯', 'progress',  'goals_completed',   1,   130)
on conflict (code) do nothing;

-- Manually/teacher-awarded, no automatic criteria (kept for future use by teacher tooling):
insert into achievements (code, title, description, icon, category, sort_order)
values
  ('curious_mind',        'Curious Mind',          'Asked a genuinely good question.',                   '❓', 'community', 140),
  ('question_master',     'Question Master',       'Consistently asks questions that help others learn.', '❔', 'community', 150),
  ('community_mentor',    'Community Mentor',      'Recognized as a mentor by the community.',            '🌟', 'community', 160),
  ('teacher_of_community','Teacher of the Community', 'Taught or explained something to help another learner.', '🧑‍🏫', 'teaching', 170)
on conflict (code) do nothing;

-- ─── USER ACHIEVEMENTS (earned) ──────────────────────────────────────────────
create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  achievement_id uuid references achievements(id) not null,
  earned_at timestamptz default now(),
  unique(user_id, achievement_id)
);
alter table user_achievements enable row level security;

drop policy if exists "Anyone can view earned achievements" on user_achievements;
create policy "Anyone can view earned achievements" on user_achievements for select using (true);
-- Intentionally no insert policy for regular users: achievements are only ever
-- written by the security-definer function below, so they can't be self-awarded.

-- ─── LEARNING GOALS ───────────────────────────────────────────────────────────
create table if not exists learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  subject text not null,          -- e.g. "Learn Python", "Improve mathematics"
  target text,                    -- what "done" looks like
  deadline date,
  status text not null default 'active', -- active | completed | abandoned
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table learning_goals enable row level security;

drop policy if exists "Users manage their own goals" on learning_goals;
create policy "Users manage their own goals" on learning_goals for all using (auth.uid() = user_id);

-- ─── CHALLENGES (catalog) + PROGRESS ─────────────────────────────────────────
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'daily', -- daily | weekly | skill | project
  title text not null,
  description text not null,
  difficulty text default 'normal',   -- easy | normal | hard
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table challenges enable row level security;

drop policy if exists "Anyone can view challenges" on challenges;
create policy "Anyone can view challenges" on challenges for select using (true);

drop policy if exists "Teachers can create challenges" on challenges;
create policy "Teachers can create challenges" on challenges for insert
  with check (
    auth.uid() = created_by
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

create table if not exists challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  challenge_id uuid references challenges(id) not null,
  status text not null default 'in_progress', -- in_progress | completed
  response text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, challenge_id)
);
alter table challenge_progress enable row level security;

drop policy if exists "Users manage their own challenge progress" on challenge_progress;
create policy "Users manage their own challenge progress" on challenge_progress for all using (auth.uid() = user_id);

-- ─── COMMUNITY CONTRIBUTIONS (peer/teacher recognition) ──────────────────────
create table if not exists community_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,       -- who gets the recognition
  recognized_by uuid references auth.users(id) not null, -- who gave it
  type text not null default 'helpful_answer',            -- helpful_answer | good_question | resource_share | mentoring
  reference_table text,   -- e.g. 'course_comments'
  reference_id uuid,
  note text,
  created_at timestamptz default now()
);
alter table community_contributions enable row level security;

drop policy if exists "Anyone can view community contributions" on community_contributions;
create policy "Anyone can view community contributions" on community_contributions for select using (true);

drop policy if exists "Users can recognize others, not themselves" on community_contributions;
create policy "Users can recognize others, not themselves" on community_contributions for insert
  with check (auth.uid() = recognized_by and user_id <> auth.uid());

-- ─── TEACHER FEEDBACK (recognition/feedback to a specific student) ───────────
create table if not exists teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) not null,
  student_id uuid references auth.users(id) not null,
  course_id uuid references courses(id),
  message text not null,
  created_at timestamptz default now()
);
alter table teacher_feedback enable row level security;

drop policy if exists "Students view their own feedback" on teacher_feedback;
create policy "Students view their own feedback" on teacher_feedback for select
  using (auth.uid() = student_id or auth.uid() = teacher_id);

drop policy if exists "Teachers write feedback for their students" on teacher_feedback;
create policy "Teachers write feedback for their students" on teacher_feedback for insert
  with check (auth.uid() = teacher_id);

-- ─── STREAK HELPER (mirrors the existing JS streak calc in skillstream-dashboard.html) ──
create or replace function current_streak_days(p_user uuid)
returns int as $$
declare
  v_streak int := 0;
  v_cursor date := current_date;
  v_today_done boolean;
begin
  select exists(
    select 1 from challenge_completions
    where user_id = p_user and completed_date = current_date
  ) into v_today_done;

  if not v_today_done then
    v_cursor := current_date - 1;
  end if;

  loop
    if exists (
      select 1 from challenge_completions
      where user_id = p_user and completed_date = v_cursor
    ) then
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    else
      exit;
    end if;
  end loop;

  return v_streak;
end;
$$ language plpgsql stable;

-- ─── AWARD ENGINE ─────────────────────────────────────────────────────────────
-- Evaluates the calling user's own stats against the achievements catalog and
-- awards anything newly earned. Security definer so it can write to
-- user_achievements (which has no direct insert policy) without letting
-- anyone self-award or award someone else. Always acts on auth.uid() only.
create or replace function check_and_award_achievements()
returns table(code text, title text, icon text) as $$
declare
  v_user uuid := auth.uid();
  v_lessons int;
  v_certs int;
  v_streak int;
  v_challenges int;
  v_contrib int;
  v_goals int;
begin
  if v_user is null then
    return;
  end if;

  select count(*) into v_lessons from lesson_progress where user_id = v_user and completed = true;
  select count(*) into v_certs from certificates where user_id = v_user;
  select coalesce(current_streak_days(v_user), 0) into v_streak;
  select count(*) into v_challenges from challenge_progress where user_id = v_user and status = 'completed';
  select count(*) into v_contrib from community_contributions where user_id = v_user;
  select count(*) into v_goals from learning_goals where user_id = v_user and status = 'completed';

  return query
  with newly as (
    insert into user_achievements (user_id, achievement_id)
    select v_user, a.id
    from achievements a
    where not exists (
      select 1 from user_achievements ua where ua.user_id = v_user and ua.achievement_id = a.id
    )
    and (
      (a.criteria_type = 'lessons_completed' and v_lessons >= a.criteria_value) or
      (a.criteria_type = 'certificates' and v_certs >= a.criteria_value) or
      (a.criteria_type = 'streak_days' and v_streak >= a.criteria_value) or
      (a.criteria_type = 'challenges_completed' and v_challenges >= a.criteria_value) or
      (a.criteria_type = 'community_contributions' and v_contrib >= a.criteria_value) or
      (a.criteria_type = 'goals_completed' and v_goals >= a.criteria_value)
    )
    returning achievement_id
  )
  select a.code, a.title, a.icon
  from achievements a
  join newly n on n.achievement_id = a.id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function check_and_award_achievements() to authenticated;
grant execute on function current_streak_days(uuid) to authenticated;
