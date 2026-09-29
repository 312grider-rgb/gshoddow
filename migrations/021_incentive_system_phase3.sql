-- 021_incentive_system_phase3.sql
-- Additive follow-up to 019 and 020. Run after 020.
--
-- notifications' existing RLS ("for all using (auth.uid() = user_id)")
-- means a client can only insert a notification for itself — it can't
-- notify someone else directly. The functions below are security-definer
-- so the app can notify the right *other* person (an achievement, a
-- recognition, a piece of teacher feedback) without weakening that policy
-- for everyone else.

-- ─── GENERIC NOTIFY (used for plain teacher-feedback notices) ───────────────
create or replace function notify_user(p_user uuid, p_title text, p_body text)
returns void as $$
begin
  insert into notifications (user_id, title, body, is_read)
  values (p_user, p_title, p_body, false);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function notify_user(uuid, text, text) to authenticated;

-- ─── RECOGNIZE (wraps the community_contributions insert + notifies) ───────
-- Replaces direct client inserts into community_contributions so the
-- recipient gets notified. The self-recognition check mirrors the table's
-- own RLS policy (kept as-is, defense in depth) since this function runs
-- as security definer and bypasses it.
create or replace function recognize_contribution(
  p_user uuid,
  p_type text,
  p_reference_table text default null,
  p_reference_id uuid default null,
  p_note text default null
)
returns void as $$
declare
  v_recognizer uuid := auth.uid();
  v_recognizer_name text;
begin
  if v_recognizer is null then
    raise exception 'Not signed in';
  end if;
  if v_recognizer = p_user then
    raise exception 'You cannot recognize yourself';
  end if;

  insert into community_contributions (user_id, recognized_by, type, reference_table, reference_id, note)
  values (p_user, v_recognizer, p_type, p_reference_table, p_reference_id, p_note);

  select full_name into v_recognizer_name from profiles where id = v_recognizer;

  insert into notifications (user_id, title, body, is_read)
  values (
    p_user,
    'You were recognized!',
    coalesce(v_recognizer_name, 'Someone') || ' recognized you: ' || replace(p_type, '_', ' '),
    false
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function recognize_contribution(uuid, text, text, uuid, text) to authenticated;

-- ─── ACHIEVEMENT NOTIFICATIONS ───────────────────────────────────────────────
-- Re-defines check_and_award_achievements() from 019 to also drop a
-- notification for each newly-earned achievement (always self-targeted,
-- so this doesn't need the cross-user care above — kept here rather than
-- in 019 to keep each migration's diff self-contained).
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
  r record;
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

  for r in
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
  loop
    select a2.code, a2.title, a2.icon into code, title, icon
    from achievements a2 where a2.id = r.achievement_id;

    insert into notifications (user_id, title, body, is_read)
    values (v_user, 'Achievement unlocked: ' || title, icon || ' ' || title, false);

    return next;
  end loop;

  return;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function check_and_award_achievements() to authenticated;
