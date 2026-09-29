/**
 * Learning Incentive System — shared engine
 * ------------------------------------------------------------------
 * Plain script, no build step — include after config.js/supabase and
 * after you have an authenticated `sb` client, same pattern as the
 * rest of the site. Uses the existing --ink/--gold/--cream/--sage/--line
 * theme variables already defined on every page, so it never fights
 * the visual identity.
 *
 * Reuses existing tables:
 *   lesson_progress, certificates, challenge_completions (streak)
 * New tables (see migrations/019_incentive_system.sql):
 *   achievements, user_achievements, learning_goals,
 *   challenges, challenge_progress, community_contributions, teacher_feedback
 *
 * Achievements are only ever awarded server-side via the
 * check_and_award_achievements() RPC (security definer) — this file
 * never inserts into user_achievements directly.
 */
const Incentives = (function () {
  const LESSONS_PER_LEVEL = 5; // tune freely — level is just a friendly framing of lessons completed

  function levelInfo(lessonsDone) {
    const level = Math.floor(lessonsDone / LESSONS_PER_LEVEL) + 1;
    const intoLevel = lessonsDone % LESSONS_PER_LEVEL;
    const remaining = LESSONS_PER_LEVEL - intoLevel;
    return {
      level,
      lessonsIntoLevel: intoLevel,
      lessonsPerLevel: LESSONS_PER_LEVEL,
      lessonsToNextLevel: remaining,
      milestoneText: remaining === 1
        ? '1 more lesson to unlock your next level.'
        : `${remaining} more lessons to unlock your next level.`
    };
  }

  /** Distinct course categories from a learner's completed courses — used as
   *  the "skills learned" map instead of a separate skills catalog table. */
  function skillsFromCourses(courses) {
    const set = new Set();
    (courses || []).forEach(c => { if (c && c.category) set.add(c.category); });
    return Array.from(set);
  }

  const feedback = {
    lessonComplete() {
      return 'Lesson completed. You are building your understanding step by step.';
    },
    improvement(oldPct, newPct) {
      return `Your performance improved from ${oldPct}% to ${newPct}%. Keep building on this progress.`;
    },
    difficultChallenge() {
      return 'You solved a difficult challenge. That is evidence of growing mastery.';
    },
    returning() {
      return 'Welcome back. Your learning journey continues.';
    },
    streakKept(days) {
      return `Your progress is saved. ${days} day${days === 1 ? '' : 's'} strong — ready to continue?`;
    }
  };

  /** Pulls the numbers the journey card and achievement engine both need. */
  async function loadStats(sb, userId) {
    const [
      { data: doneRows },
      { data: myCerts },
      { data: streakRows },
      { data: goal },
      { data: earned }
    ] = await Promise.all([
      sb.from('lesson_progress').select('lesson_id').eq('user_id', userId).eq('completed', true),
      sb.from('certificates').select('id').eq('user_id', userId),
      sb.from('challenge_completions').select('completed_date').eq('user_id', userId)
        .order('completed_date', { ascending: false }).limit(60),
      sb.from('learning_goals').select('*').eq('user_id', userId).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('user_achievements').select('earned_at, achievements(code, title, description, icon, category)')
        .eq('user_id', userId).order('earned_at', { ascending: false })
    ]);

    const lessonsDone = (doneRows || []).length;
    const certsCount = (myCerts || []).length;
    const streak = computeStreakFromRows(streakRows || []);

    return {
      lessonsDone,
      certsCount,
      streak,
      goal: goal || null,
      achievements: earned || [],
      level: levelInfo(lessonsDone)
    };
  }

  function todayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function computeStreakFromRows(rows) {
    const dates = new Set(rows.map(r => r.completed_date));
    const today = new Date();
    const doneToday = dates.has(todayKey(today));
    let cursor = new Date();
    if (!doneToday) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (dates.has(todayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /** Calls the award engine and returns any newly-earned achievements
   *  ({code, title, icon}[]) so the caller can toast them. Safe to call
   *  often (e.g. after any lesson/challenge/goal completion) — it's a
   *  no-op if nothing new was earned. */
  async function checkAchievements(sb) {
    const { data, error } = await sb.rpc('check_and_award_achievements');
    if (error) { console.warn('check_and_award_achievements failed:', error.message); return []; }
    return data || [];
  }

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .incentive-toast{
        position:fixed; left:50%; bottom:90px; transform:translateX(-50%) translateY(20px);
        background:var(--ink); color:#fff; padding:12px 18px; border-radius:12px;
        display:flex; align-items:center; gap:10px; font-size:13.5px; font-weight:600;
        box-shadow:0 8px 24px rgba(20,31,56,0.25); z-index:200; opacity:0;
        transition:opacity 0.25s ease, transform 0.25s ease; max-width:88%;
      }
      .incentive-toast.show{opacity:1; transform:translateX(-50%) translateY(0);}
      .incentive-toast .icon{font-size:20px;}
      .incentive-toast .title{color:var(--gold-light,var(--gold));}
      .journey-card{background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:16px;}
      .journey-top{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;}
      .journey-level{font-family:'Syne',sans-serif; font-weight:700; color:var(--ink); font-size:16px;}
      .journey-milestone{font-size:12px; color:#777;}
      .journey-track{height:8px; background:var(--line); border-radius:5px; overflow:hidden; margin-bottom:12px;}
      .journey-fill{height:100%; background:var(--sage,var(--gold));}
      .journey-row{display:flex; justify-content:space-between; font-size:12.5px; color:#666; margin-bottom:6px;}
      .journey-row strong{color:var(--ink);}
      .journey-goal{margin-top:10px; padding-top:10px; border-top:1px dashed var(--line); font-size:13px; color:var(--charcoal,#2B2B2B);}
      .journey-goal .g-label{font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--gold); font-weight:700; margin-bottom:3px;}
      .journey-badges{display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;}
      .journey-badge{font-size:18px; background:var(--paper,#F3ECDA); border-radius:8px; padding:5px 7px;}
      .journey-cta{display:block; margin-top:12px; text-align:center; background:var(--ink); color:#fff;
        padding:11px; border-radius:9px; font-size:13.5px; font-weight:600; text-decoration:none;}
      .journey-secondary{display:block; margin-top:8px; text-align:center; color:var(--ink);
        font-size:12.5px; font-weight:600; text-decoration:underline;}
    `;
    document.head.appendChild(style);
  }

  function showToast(achievement) {
    injectStyles();
    const el = document.createElement('div');
    el.className = 'incentive-toast';
    el.innerHTML = `<span class="icon">${achievement.icon || '🏅'}</span><span>Achievement unlocked — <span class="title">${escapeHtml(achievement.title)}</span></span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function showToasts(achievements) {
    (achievements || []).forEach((a, i) => setTimeout(() => showToast(a), i * 3500));
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  /** Renders the "My Learning Journey" card into containerEl.
   *  opts: { nextLessonText, continueHref } */
  async function renderJourney(containerEl, sb, userId, opts) {
    injectStyles();
    opts = opts || {};
    const stats = await loadStats(sb, userId);
    const lvl = stats.level;
    const pct = Math.round((lvl.lessonsIntoLevel / lvl.lessonsPerLevel) * 100);
    const recentBadges = stats.achievements.slice(0, 6);

    containerEl.innerHTML = `
      <div class="journey-card">
        <div class="journey-top">
          <div class="journey-level">Level ${lvl.level}</div>
          <div class="journey-milestone">${escapeHtml(lvl.milestoneText)}</div>
        </div>
        <div class="journey-track"><div class="journey-fill" style="width:${pct}%;"></div></div>
        <div class="journey-row"><span>Lessons completed</span><strong>${stats.lessonsDone}</strong></div>
        <div class="journey-row"><span>Certificates</span><strong>${stats.certsCount}</strong></div>
        <div class="journey-row"><span>Learning streak</span><strong>${stats.streak} day${stats.streak === 1 ? '' : 's'}</strong></div>
        ${stats.goal ? `
          <div class="journey-goal">
            <div class="g-label">Current Goal</div>
            <div>${escapeHtml(stats.goal.subject)}${stats.goal.target ? ' — ' + escapeHtml(stats.goal.target) : ''}</div>
          </div>` : ''}
        ${recentBadges.length ? `
          <div class="journey-badges">
            ${recentBadges.map(b => `<span class="journey-badge" title="${escapeHtml(b.achievements.title)}">${b.achievements.icon}</span>`).join('')}
          </div>` : ''}
        ${opts.continueHref ? `<a class="journey-cta" href="${opts.continueHref}">Continue Learning</a>` : ''}
        ${opts.challengesHref ? `<a class="journey-secondary" href="${opts.challengesHref}">View Learning Challenges &rarr;</a>` : ''}
      </div>
    `;
    return stats;
  }

  return {
    levelInfo,
    skillsFromCourses,
    feedback,
    loadStats,
    checkAchievements,
    showToast,
    showToasts,
    renderJourney
  };
})();
