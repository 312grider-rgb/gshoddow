# Learning Never Ends: Inspection report and safe plan

Based on the Supabase `public` schema (45 tables). Not yet seen: security policies (RLS), the application code, and the values stored in `profiles.role`.

## 1. What exists today

| Area | Tables |
|---|---|
| Users and roles | `profiles` (has `role text`), `lne_classroom_students` (teacher_id, student_id) |
| Classrooms | `classrooms` (teacher_id), `classroom_members`, `announcements`, `assignments`, `submissions`, `quizzes`, `quiz_results`, `messages` |
| Courses | `courses` (teacher_id), `lessons`, `lesson_progress`, `saved_courses`, `course_reviews`, `course_comments`, `certificates` |
| Challenges and growth | `challenges`, `challenge_progress`, `challenge_completions`, `learning_goals`, `reflections`, `achievements`, `user_achievements` |
| AI-related | `classroom_programs`, `classroom_progress`, `ai_learning_profile`, `future_projects` |
| Community and sharing | `projects`, `project_comments`, `project_likes`, `shared_items`, `shared_comments`, `shared_reports`, `shared_requests`, `community_contributions`, `library_books`, `live_sessions`, `chess_games`, `direct_messages`, `notifications`, `teacher_feedback`, `contact_messages` |

**Nothing exists yet** for plans, subscriptions, usage, credits, schools, orders or payments. So the monetization work is **additive**: new tables only, and no existing table needs to change in Stage 1.

## 2. Risks I noticed (not changing them, but they matter)

- **Duplicate columns, probably legacy.** `courses` has both `published` and `is_published`, and both `cover_image_url` and `thumbnail_url`. `messages` has `text` and `body`, and `author_id` and `user_id`. `submissions` and `quiz_results` have both `student_id` and `user_id`. Policies and code may rely on either column, so I will not rename or merge anything without approval.
- **Three teacher-student links:** `classrooms` + `classroom_members`, `lne_classroom_students`, and `shared_items`. The school layer must sit above these without replacing them.
- **Roles are plain text in `profiles.role`.** Any admin check depends on the exact stored values, which I still need.
- **Unknown location of AI calls.** AI content is stored in `classroom_programs` and `classroom_progress`, but I haven't seen where the provider is called. This must be a server-side route so usage can be metered and keys stay private.
- **`future_projects.id` is `text`**, not uuid. Don't assume uuid when linking it to anything.

## 3. Plan, in stages (each is tested before the next)

| Stage | Adds (new tables only) | Existing tables touched |
|---|---|---|
| 0. Verify | Nothing. Check RLS policies, role values, where AI is called | None |
| 1. Plans and subscriptions | `plans`, `plan_features`, `subscriptions`, `is_admin()`, `get_my_plan()` | None |
| 2. AI usage and credits | `ai_usage_events`, `credit_accounts`, `credit_ledger` (append-only), server-only functions | None |
| 3. Schools | `schools`, `school_members`; later a nullable `school_id` on `classrooms` | `classrooms` (nullable column only, with approval) |
| 4. Payment readiness | `orders`, `payment_events`, `refunds`, provider-neutral server interface | None |
| 5. Admin | Admin pages reading the above | Existing app navigation (one new entry) |

**Security rules for every stage**
- RLS enabled on every new table.
- Clients can only read their own rows. No client write access to subscriptions, balances, orders or usage.
- All sensitive writes happen in server code or `security definer` functions, never from the browser.
- Entitlements (what a user may use) are separate from payments (what was paid). Payment code only ever creates or updates a subscription through one server function.

## 4. What is real vs. still needs a payment provider

- **Real after Stage 1:** plans, configurable benefits, subscription records, free-by-default logic.
- **Real after Stage 2:** usage tracking, limits, credit ledger.
- **Real after Stage 3:** school structure and roles.
- **Not real until a provider is integrated:** taking money, verifying payments, refunds. Stage 4 only builds the safe structure.

## 5. Security findings from the existing policies (nothing changed yet)

Read from the 117 policies. I propose fixes only after your approval, because they change current behavior.

1. **Users may be able to change their own `role` (high priority).**
   `profiles` UPDATE policy: `using auth.uid() = id`, with no column limit and no `with_check`. A logged-in user can probably update any column of their own row, including `role`, `lessons_completed_count` and `certificates_count`. The INSERT policy only checks `id`, so a new profile could also be created with any role. If `is_platform_admin()` relies on `profiles.role`, this would let anyone become admin. **Check the definition of `is_platform_admin()` first.** Admin pages and plan management must not rely on it until this is confirmed safe.
2. **Profiles are readable by everyone, including anonymous visitors (high priority).**
   Two policies allow SELECT with `true`, and the table holds `email`, `phone`, `country` and `timezone`. Anyone can read every user's contact details, which matters even more with school and student accounts. Safer design: a public view with only the leaderboard fields (id, name, username, avatar, counts), and the base table readable only by its owner.
3. **All lessons are public, which blocks Premium content later.**
   `lessons` has a SELECT policy with `true`. Policies are combined with OR, so the stricter "visible courses" policy does nothing. Any future plan-based access to lesson content needs this policy replaced (with approval).
4. **Students can grade themselves.**
   `submissions` insert blocks grade and feedback, but "Student updates own work" lets a student UPDATE their own row without limiting columns, so grade, feedback and graded_at are probably editable. Similarly `quiz_results` (score) can be updated by the student.
5. **Certificates can be self-issued.**
   Two policies let a user insert or manage their own certificates without completing the course. Fine today; a problem if certificates become a paid or verified feature.
6. **Duplicate-column mismatch confirmed.**
   `courses` policy uses `is_published`, but the `lessons` policy uses `published`. They can disagree.
7. **Anyone can become a classroom teacher.**
   `classrooms` insert only checks `teacher_id = auth.uid()`, with no role check. Relevant for school plans and teacher limits.

Existing helper functions to reuse: `is_platform_admin()`, `lne_is_class_teacher()`, `lne_is_class_member()`, `teaches_student()`.

## 6. Needed before Stage 2 and beyond

1. Result of `select role, count(*) from profiles group by role;`
2. Result of the RLS policies query.
3. The file(s) that call your AI provider.
4. Your approval to run each migration.
