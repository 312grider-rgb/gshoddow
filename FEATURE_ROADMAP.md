# Paradise Of The Eternal Learners — Feature Roadmap

**Organized by Priority, User Value & Dependencies**

---

## 🎯 North Star
Help everyone learn and live better by providing a **free**, **accessible**, **no-barriers** learning platform with AI guidance and real human teaching.

---

## 📊 Phase Structure

### **PHASE 1: Foundation (Current — v1.0)**
Core platform that works, is mobile-friendly, and requires zero maintenance.

### **PHASE 2: Community (v1.5)**
Multi-user experiences (live classes, classrooms, social features).

### **PHASE 3: Monetization (v2.0)**
Revenue model without paywalls for core learning.

### **PHASE 4: Professional (v2.5+)**
Advanced tools, API access, white-label options.

---

# 🚀 PHASE 1: FOUNDATION (Current)

## Tier 1A: Critical (Ship Today)
These features **must work** for the platform to function.

| # | Feature | Status | Component | Why |
|---|---------|--------|-----------|-----|
| 1 | **Auth (Email/Password)** | ✅ Built | `skillstream-auth.js` | Foundation—can't use anything without login |
| 2 | **Role Selection** (Learner/Teacher) | ✅ Built | `skillstream-login.html` | Gate to role-specific dashboards |
| 3 | **Student Dashboard** | ✅ Built | `skillstream-dashboard.html` | Home base after login; shows progress, next steps, notifications |
| 4 | **Self-Paced Courses** (Browse → Learn) | ✅ Built | `skillstream-self-paced.html`, `skillstream-courses.html` | Primary user journey: find course → start learning |
| 5 | **Course Player** | ✅ Built | Embedded in pages | Where actual learning happens |
| 6 | **Progress Tracking** | ✅ Built | Supabase tables | Learners know where they are |
| 7 | **Email Confirmation** | ✅ Built | `skillstream-confirm.html` | Verify users are real |
| 8 | **Session Persistence** | ✅ Built | `skillstream-auth.js` + RLS | Users stay logged in across sessions |

**Next Step:** Test all flows end-to-end on mobile. ✅

---

## Tier 1B: High Value (Next Sprint)
Features that dramatically improve user experience and retention.

| # | Feature | Status | Component | Why | Priority |
|---|---------|--------|-----------|-----|----------|
| 9 | **AI Tutor** (Ask questions in course) | ✅ Built | `skillstream-ai-hub.html` | Personalized help; huge retention boost |
| 10 | **Certificates** (Auto-issued on completion) | ✅ Built | Supabase + email | Motivation to finish; shareable proof of learning |
| 11 | **Course Reviews** (Star ratings + comments) | ✅ Built | Discussion threads | Social proof; feedback for course creators |
| 12 | **Saved/Bookmarked Courses** | ✅ Built | `skillstream-dashboard.html` | "Come back later" → revisit rate ↑ |
| 13 | **Leaderboard** (Lessons completed / certificates) | ✅ Built | `skillstream-leaderboard.html` | Gamification; drives engagement |
| 14 | **Teacher Dashboard** | ✅ Built | `skillstream-teacher-dashboard.html` | Teachers see student progress, manage courses |
| 15 | **Admin Dashboard** | ✅ Built | `skillstream-admin.html` | Platform health: publish/unpublish, manage roles |
| 16 | **In-App Notifications** | ✅ Built | Database + badge | "Your course is ready", "New review", etc. |

**Action:** Polish UX, fix bugs (like live-video), test on real users. ✅

---

## Tier 1C: Hygiene (Quality Baseline)
Features that aren't flashy but make the platform feel professional.

| # | Feature | Status | Component | Why | Effort |
|---|---------|--------|-----------|-----|--------|
| 17 | **Dark Mode** (Site-wide) | 🟡 Partial | Settings page done; rollout needed | Accessibility + preference | Low |
| 18 | **Multi-Language Support** | 🟡 Partial | Settings demo done; needs rollout | Reach non-English speakers | Medium |
| 19 | **About / FAQ / Contact** | ✅ Built | Static pages | Trust building |
| 20 | **Privacy Policy / Terms** | ✅ Built | Static pages | Legal requirement |
| 21 | **Mobile Responsiveness** | ✅ Built | All pages | Primary use case |
| 22 | **Settings Page** | ✅ Built | `skillstream-settings.html` | User preferences, logout |
| 23 | **Profile Page** | ✅ Built | `skillstream-profile.html` | Edit name, bio, avatar, public profile |
| 24 | **Password Reset** | ✅ Built | `skillstream-forgot-password.html`, `skillstream-reset-password.html` | Account recovery |
| 25 | **Academic Levels** (K–University) | ✅ Built | `skillstream-academic.html` | Organize by grade; filtering |
| 26 | **Daily Inspiration Quote** | ✅ Built | Dashboard | Motivation |
| 27 | **Streak Tracking** | ✅ Built | Dashboard | Habit formation |

**Action:** Complete dark mode rollout + full language translation (next sprint).

---

## Tier 1D: Legacy / Review (Post-MVP)
Features from earlier phases; decide keep/retire/fix.

| # | Feature | Status | Component | Notes |
|---|---------|--------|-----------|-------|
| 28 | **Classrooms** | 🟠 Legacy | `skillstream-classrooms.html` + `skillstream-classrooms.js` | Pre-built; needs QA + integration decision |
| 29 | **Calendar** | 🟠 Legacy | `skillstream-calendar.html` | Shows assignments due; needs linked to classrooms |
| 30 | **Session Detail** | 🟠 Legacy | `skillstream-session-detail.html` | Pre-built; needs testing |
| 31 | **Chess** | 🟠 Legacy | `skillstream-chess.html` | Gamification experiment; keep or remove? |
| 32 | **Ludo** | 🟠 Legacy | `skillstream-ludo.html` | Gamification experiment; keep or remove? |
| 33 | **Focus Mode** | 🟠 Legacy | `skillstream-focus.html` | Distraction-free learning; working? |
| 34 | **Messages** | 🟠 Legacy | `skillstream-messages.html` | DM system between users; half-built |
| 35 | **Teachers Directory** | ✅ Built | `skillstream-teachers.html` | Browse teacher profiles |
| 36 | **Showcase** | 🟠 Legacy | `skillstream-showcase.html` | Portfolio for teachers; status? |
| 37 | **Live Session** | 🟠 Legacy | `skillstream-live-session.html` | Older UI; replaced by live-video |

**Action:** Audit each; decide: **Keep + Polish**, **Remove**, or **Archive**.

---

# 🎪 PHASE 2: COMMUNITY (v1.5)

**Goal:** Enable real-time, multi-user interactions. Pivot from solo learning → collaborative.

## Tier 2A: Live Learning (Highest ROI)

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 1 | **Live Video Classes** | 🟢 Fixed | `skillstream-live-video.html` (Jitsi) | Teacher broadcasts; students join | None |
| 2 | **AI Assistant in Live Class** | 🟢 Fixed | AI tutor inside live-video | Answer questions in real-time | Live video |
| 3 | **Raise Hand** | ✅ Built | Jitsi native | Students signal to teacher | Live video |
| 4 | **Class Chat** | ✅ Built | Jitsi native | Broadcast + questions | Live video |
| 5 | **Class Recordings** | 🔴 Not built | Cloud storage | Students watch later | Live video (Jitsi or LiveKit) |
| 6 | **Live Class Schedule** | ✅ Built | Dashboard + calendar | "When is the next class?" | Database schema |

**Effort:** Medium (Jitsi + Supabase). **Timeline:** 1 sprint. **Impact:** ⭐⭐⭐⭐⭐

---

## Tier 2B: Classrooms (Teacher Hubs)

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 7 | **Create/Manage Classrooms** | 🟡 Partial | `skillstream-classrooms.html` | Teacher organizes students | Auth roles |
| 8 | **Join Classroom** (by code) | ✅ Built | `skillstream-classrooms.js` | Students enroll | Classroom creation |
| 9 | **Announcements** (teacher → class) | ✅ Built | `skillstream-classrooms.js` | Broadcast info | Classroom |
| 10 | **Assignments** (with due dates) | ✅ Built | `skillstream-classrooms.js` | Students submit work | Classroom |
| 11 | **Grading** (teacher feedback) | ✅ Built | `skillstream-classrooms.js` | Teacher marks + feedback | Assignments |
| 12 | **Quizzes** (auto-graded) | ✅ Built | `skillstream-classrooms.js` | Instant feedback | Classroom |
| 13 | **Attendance Tracking** | 🔴 Not built | Supabase | Teacher sees who's active | Classroom |

**Effort:** Medium-High (integrate + test). **Timeline:** 1-2 sprints. **Impact:** ⭐⭐⭐⭐

---

## Tier 2C: Social Features

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 14 | **Teacher Directory** | ✅ Built | `skillstream-teachers.html` | Find teachers to learn from | Teacher profiles |
| 15 | **Student Profiles** (public) | ✅ Built | `skillstream-profile.html` | Showcase learning journey | Auth |
| 16 | **Follow Teacher** | 🔴 Not built | Database + UI | Get notified of new courses | Teacher profiles |
| 17 | **Discussion Threads** (per course) | ✅ Built | Comments in course | Peer Q&A | Courses |
| 18 | **Direct Messages** | 🟡 Partial | `skillstream-messages.html` | Teacher ↔ student | Auth |
| 19 | **Badges / Achievements** | ✅ Built | Profile page | Gamification | Courses + certificates |

**Effort:** Low-Medium (mostly DB + UI). **Timeline:** 1 sprint. **Impact:** ⭐⭐⭐

---

# 💰 PHASE 3: MONETIZATION (v2.0)

**Goal:** Enable earning without paywalls. Freemium model.

## Tier 3A: Payment Infrastructure

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 1 | **Stripe Integration** | 🔴 Not built | `/api/stripe-*` serverless | Accept payments | Backend ready |
| 2 | **Teacher Payouts** | 🔴 Not built | Dashboard | Teachers withdraw earnings | Stripe |
| 3 | **Paid Sessions** (hourly rate) | 🔴 Not built | Live class booking | 1-on-1 tutoring | Payments + live video |
| 4 | **Course Pricing** | 🔴 Not built | Metadata | Sell self-paced courses | Stripe |
| 5 | **Subscription Tiers** | 🔴 Not built | Plans | Premium features (unlimited AI, etc.) | Stripe |
| 6 | **Payment History** | ✅ Partial | `skillstream-payments.html` (UI only) | Transparency | Stripe |

**Effort:** High (complex state machine). **Timeline:** 2-3 sprints. **Impact:** ⭐⭐⭐⭐⭐ (Revenue!)

---

## Tier 3B: Freemium Model

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 7 | **Free Tier** (Limited AI queries) | 🔴 Not built | Database + limits | Get hooked for free | Accounts |
| 8 | **Premium Tier** (Unlimited AI) | 🔴 Not built | Stripe subscriptions | Upsell path | Payments |
| 9 | **Teacher Revenue Share** | 🔴 Not built | Dashboard analytics | Incentivize course creation | Payments |
| 10 | **Course Affiliate Program** | 🔴 Not built | Referral links | Spread the word | Courses + payments |

**Effort:** Medium. **Timeline:** 1 sprint (after Stripe). **Impact:** ⭐⭐⭐⭐

---

# 🚀 PHASE 4: PROFESSIONAL (v2.5+)

**Goal:** Enterprise readiness. API, white-label, advanced analytics.

| # | Feature | Status | Effort | Why | Impact |
|---|---------|--------|--------|-----|--------|
| 1 | **Public API** | 🔴 Not built | High | Integrations (LMS, SIS) | ⭐⭐⭐⭐ |
| 2 | **White-Label** | 🔴 Not built | High | Sell to schools/orgs | ⭐⭐⭐⭐ |
| 3 | **Advanced Analytics** (teacher dashboard) | 🔴 Not built | Medium | Heatmaps, engagement trends | ⭐⭐⭐ |
| 4 | **Video Recording** (on-demand) | 🔴 Not built | High | Use LiveKit or Mux | ⭐⭐⭐ |
| 5 | **Whiteboard Collaboration** | 🔴 Not built | Very High | Real-time drawing (WebGL) | ⭐⭐ |
| 6 | **Screen Sharing** (teacher) | 🔴 Not built | Medium | WebRTC implementation | ⭐⭐⭐ |
| 7 | **Breakout Rooms** | 🔴 Not built | High | Small-group sessions | ⭐⭐ |
| 8 | **Learning Analytics** (detailed progress) | 🔴 Not built | Medium | Time spent, mastery, gaps | ⭐⭐⭐⭐ |

---

# 📋 ROADMAP TIMELINE

## Sprint 1 (This Week) ✅
- [x] Fix live video page (AI tutor bug)
- [ ] Dark mode rollout (all pages)
- [ ] Language translation rollout (full site)
- [ ] Audit legacy features (Chess, Ludo, Messages, etc.)

## Sprint 2 (Next 2 Weeks)
- [ ] Complete classroom testing + polish
- [ ] Add attendance tracking
- [ ] Deploy live class scheduling
- [ ] Fix any discovered bugs

## Sprint 3 (Week 3)
- [ ] Social features (follow teacher, badges)
- [ ] Direct messaging fix/completion
- [ ] Mobile UX polish

## Sprint 4–5 (Weeks 4–5) — Phase 2 Complete
- [ ] Full community testing
- [ ] Performance optimization
- [ ] Prepare for Phase 3 (payments)

## Sprint 6–8 (Weeks 6–8) — Phase 3: Stripe Setup
- [ ] Stripe integration
- [ ] Payment dashboard
- [ ] Payout system

## Sprint 9–10 (Weeks 9–10) — Freemium Model
- [ ] Tier limits + enforcement
- [ ] Upsell flows
- [ ] Revenue tracking

---

# 🎯 Quick Priority Legend

| Icon | Meaning | Action |
|------|---------|--------|
| 🟢 | Ready to use | Test on real users |
| 🟡 | Partial / needs polish | Complete + integrate |
| 🟠 | Legacy / uncertain | Audit + decide |
| 🔴 | Not built | Plan for future phase |
| ✅ | Fully working | Monitor for bugs |

---

# 🔥 Highest-Impact Next Steps (Ranked)

1. **Fix + test all Phase 1B features** (AI, certificates, reviews) — These drive retention ⭐⭐⭐⭐⭐
2. **Complete dark mode + language rollout** — Polish baseline ⭐⭐⭐
3. **Audit legacy features** (classrooms, chess, etc.) — Decide keep/remove ⭐⭐⭐
4. **Live classrooms + scheduling** — Community pillar ⭐⭐⭐⭐⭐
5. **Stripe integration** — Revenue engine ⭐⭐⭐⭐⭐

---

# 📞 Questions to Answer Now

1. **Classrooms:** Keep? Integrate into Phase 2 or deprecate?
2. **Games (Chess/Ludo):** Marketing gimmick or core feature? Keep or remove?
3. **Messages:** Finish or remove?
4. **Payments:** Timeline? (Blocks Phase 3)
5. **Mobile-first:** Commit to no desktop version, or support both?

---

**Last Updated:** 2026-09-10  
**Version:** 1.0 (Phase 1 Foundation)  
**Next Review:** After Sprint 1 completion
