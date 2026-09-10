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

**Action:** Polish UX, fix bugs (like live-video ✅), test on real users.

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

## Tier 1D: Platform Features (Core to Phase 2)
Features from earlier phases that are now **core** to the platform.

| # | Feature | Status | Component | Why | Integration Status |
|---|---------|--------|-----------|-----|-------------------|
| 28 | **Classrooms** | 🟡 Built | `skillstream-classrooms.html` + `skillstream-classrooms.js` | **Teacher hubs** — pillar of Phase 2 | Ready for Phase 2 |
| 29 | **Calendar** | 🟡 Built | `skillstream-calendar.html` | Assignments + announcements | Linked to classrooms |
| 30 | **Session Detail** | 🟡 Built | `skillstream-session-detail.html` | Session info page | Part of classrooms |
| 31 | **Focus Mode** | 🟡 Built | `skillstream-focus.html` | Distraction-free learning | Standalone feature |
| 32 | **Messages** | 🟡 Built | `skillstream-messages.html` | DM system (teacher ↔ student) | Needs polish for Phase 2 |
| 33 | **Teachers Directory** | ✅ Built | `skillstream-teachers.html` | Browse + filter teachers | Phase 2: Social |

**Action:** Move these from "legacy review" → **Phase 2 integration**.

---

## Tier 1E: Experiments (Decide: Keep or Remove)
Features that are fun but not core to learning.

| # | Feature | Status | Component | Keep? | If Keep: Action |
|---|---------|--------|-----------|-------|-----------------|
| 34 | **Chess** | 🟠 Built | `skillstream-chess.html` | 🤔 | Gamification experiment |
| 35 | **Ludo** | 🟠 Built | `skillstream-ludo.html` | 🤔 | Gamification experiment |
| 36 | **Showcase** | 🟠 Built | `skillstream-showcase.html` | 🤔 | Teacher portfolio |

**Decision:** Run A/B test on real users → **Keep or Archive by end of Sprint 2**.

---

# 🎪 PHASE 2: COMMUNITY (v1.5)

**Goal:** Enable real-time, multi-user interactions. Pivot from solo learning → collaborative.

## Tier 2A: Live Learning (Highest ROI)

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 1 | **Live Video Classes** | ✅ Fixed | `skillstream-live-video.html` (Jitsi) | Teacher broadcasts; students join | None |
| 2 | **AI Assistant in Live Class** | ✅ Fixed | AI tutor inside live-video | Answer questions in real-time | Live video |
| 3 | **Raise Hand** | ✅ Built | Jitsi native | Students signal to teacher | Live video |
| 4 | **Class Chat** | ✅ Built | Jitsi native | Broadcast + questions | Live video |
| 5 | **Class Recordings** | 🔴 Not built | Cloud storage | Students watch later | Live video (Jitsi or LiveKit) |
| 6 | **Live Class Schedule** | ✅ Built | Dashboard + calendar | "When is the next class?" | Database schema |
| 7 | **Live Class Discovery** | 🟡 Partial | Home page | Show "Live Now" classes | Live class system |

**Effort:** Medium (Jitsi + Supabase). **Timeline:** 1 sprint. **Impact:** ⭐⭐⭐⭐⭐

---

## Tier 2B: Classrooms (Teacher Hubs) — **CORE**

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 8 | **Create/Manage Classrooms** | ✅ Built | `skillstream-classrooms.html` | Teacher organizes students | Auth roles |
| 9 | **Join Classroom** (by code) | ✅ Built | `skillstream-classrooms.js` | Students enroll | Classroom creation |
| 10 | **Announcements** (teacher → class) | ✅ Built | `skillstream-classrooms.js` | Broadcast info | Classroom |
| 11 | **Assignments** (with due dates) | ✅ Built | `skillstream-classrooms.js` | Students submit work | Classroom |
| 12 | **Grading** (teacher feedback) | ✅ Built | `skillstream-classrooms.js` | Teacher marks + feedback | Assignments |
| 13 | **Quizzes** (auto-graded) | ✅ Built | `skillstream-classrooms.js` | Instant feedback | Classroom |
| 14 | **Attendance Tracking** | 🔴 Not built | Supabase | Teacher sees who's active | Classroom |
| 15 | **Classroom Chat** | 🟡 Built | `skillstream-messages.html` | Class discussion | Messages system |
| 16 | **Invite Students** (email) | 🟡 Partial | Classrooms | Email with join code | Auth + email service |

**Effort:** Medium-High (integrate + test). **Timeline:** 1-2 sprints. **Impact:** ⭐⭐⭐⭐

---

## Tier 2C: Social Features

| # | Feature | Status | Component | Why | Dependency |
|---|---------|--------|-----------|-----|------------|
| 17 | **Teacher Directory** | ✅ Built | `skillstream-teachers.html` | Find teachers to learn from | Teacher profiles |
| 18 | **Student Profiles** (public) | ✅ Built | `skillstream-profile.html` | Showcase learning journey | Auth |
| 19 | **Follow Teacher** | 🔴 Not built | Database + UI | Get notified of new courses | Teacher profiles |
| 20 | **Discussion Threads** (per course) | ✅ Built | Comments in course | Peer Q&A | Courses |
| 21 | **Direct Messages** | ✅ Built | `skillstream-messages.html` | Teacher ↔ student | Auth |
| 22 | **Badges / Achievements** | ✅ Built | Profile page | Gamification | Courses + certificates |

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
- [x] Fix live video page (AI tutor bug) ✅
- [ ] Dark mode rollout (all pages)
- [ ] Language translation rollout (full site)
- [ ] Decide on gamification experiments (Chess/Ludo/Showcase)

## Sprint 2 (Next 2 Weeks)
- [ ] Complete classroom testing + polish
- [ ] Add attendance tracking
- [ ] Deploy live class scheduling + discovery
- [ ] Integrate Messages with Classrooms
- [ ] Fix any discovered bugs

## Sprint 3 (Week 3)
- [ ] Social features (follow teacher, badges)
- [ ] Teacher Directory polish
- [ ] Mobile UX refinements

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
| 🟡 | Built but needs polish | Complete + integrate |
| 🔴 | Not built | Plan for future phase |
| ✅ | Fully working | Monitor for bugs |

---

# 🔥 Highest-Impact Next Steps (Ranked)

1. **Complete Dark Mode + Language Rollout** — Polish baseline quality ⭐⭐⭐
2. **Test Phase 1B features** (AI, certificates, reviews on real users) — Retention ⭐⭐⭐⭐⭐
3. **Classroom + Messages Integration** — Phase 2 foundation ⭐⭐⭐⭐⭐
4. **Live Class Discovery** — Get students discovering live classes ⭐⭐⭐⭐
5. **Attendance + Calendar** — Teacher tools ⭐⭐⭐
6. **Social Features** (follow, badges) — Engagement loops ⭐⭐⭐

---

# 💾 **Features by Platform Layer**

## Frontend Pages (HTML)
**Phase 1 Complete:**
- `index.html` (landing)
- `skillstream-login.html`, `skillstream-confirm.html`, `skillstream-reset-password.html`
- `skillstream-dashboard.html`, `skillstream-home.html`
- `skillstream-self-paced.html`, `skillstream-courses.html`, `skillstream-academic.html`
- `skillstream-ai-hub.html`, `skillstream-leaderboard.html`, `skillstream-profile.html`, `skillstream-settings.html`
- `skillstream-teacher-dashboard.html`, `skillstream-admin.html`

**Phase 2 Integration (Classrooms):**
- `skillstream-classrooms.html`, `skillstream-calendar.html`, `skillstream-teachers.html`, `skillstream-teachers-directory.html`
- `skillstream-messages.html`, `skillstream-live-session.html`, `skillstream-session-detail.html`
- `skillstream-live-video.html` (fixed ✅)

**Experiments (TBD):**
- `skillstream-chess.html`, `skillstream-ludo.html`, `skillstream-showcase.html`, `skillstream-focus.html`

## Backend Modules (JS)
- `skillstream-auth.js` (core auth + profile)
- `skillstream-classrooms.js` (classroom CRUD + assignments)

## Serverless Functions (Vercel)
- `/api/ask-ai.js` (AI tutor via Groq)

---

# 📞 **Key Decisions Made**

✅ **Classrooms:** KEEP — Moving from "legacy" → **Core Phase 2 feature**  
❓ **Chess/Ludo/Showcase:** Run A/B test → Decide by end of Sprint 2  
✅ **Messages:** KEEP — Integrate with Classrooms in Phase 2  
✅ **Live Video:** FIXED ✅ — Ready for Phase 2 production  
❓ **Payments Timeline:** Decide after Phase 2 completion (Sprint 5)

---

**Last Updated:** 2026-09-10 (Post-Fix)  
**Version:** 1.1 (Phase 2 Priorities Clarified)  
**Next Review:** After Sprint 1 completion
