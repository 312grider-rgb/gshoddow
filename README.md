# Paradise Of The Eternal Learners

**Learning Never Ends** — an online learning platform where anyone can learn a new skill, work through structured academic courses, or teach what they know.

Live at: [gshoddow.vercel.app](https://gshoddow.vercel.app)

> Mission: *Help everyone learn and live better.*

---

## Overview

Paradise Of The Eternal Learners is a full-stack learning platform built with a deliberately simple, no-build-step frontend (plain HTML/CSS/JS) backed by Supabase for auth and data, and Vercel for hosting and serverless AI calls. It supports two account types — **Learners** and **Teachers** — plus an admin layer for platform moderation.

The project is built and maintained entirely from a mobile device (GitHub's mobile web editor + Vercel's auto-deploy), which shapes several of the architectural decisions below.

## Features

**Core Platform**
- ✅ Email/password authentication with role selection (Learner / Teacher)
- ✅ Role-based Home hub — choose Student or Teacher view after login
- ✅ Student Dashboard — stats, continue-learning list, notifications, certificates
- ✅ Teacher Dashboard — course stats, published/draft breakdown, certificates issued
- ✅ Self-paced course builder (teacher) and learner experience (browse, search, filter, save)
- ✅ Academic level tracks: Kindergarten through University
- ✅ Progress tracking per lesson, auto-issued certificates on course completion
- ✅ Course reviews (star ratings) and per-course discussion threads
- ✅ Saved/bookmarked courses
- ✅ In-app notifications
- ✅ Admin dashboard — publish/unpublish courses, manage user roles, platform stats

**AI Features** (via a Vercel serverless function, key never exposed client-side)
- ✅ AI Tutor — explain a lesson, generate a quiz, summarize key points, or ask a question
- ✅ AI Study Recommendation — personalized "what to study next" on the dashboard
- ✅ AI Homework Helper — step-by-step guidance rather than just answers
- ✅ AI Career Coach — goal-based guidance and next steps

**Community**
- ✅ Leaderboard (lessons completed / certificates earned)
- ✅ Public Teacher Directory
- ✅ Achievement badges on learner profiles

**Product / Trust**
- ✅ Settings — dark mode (functional, in rollout), language switcher (working demo on Settings page, full site-wide translation planned), notification preferences
- ✅ Daily Inspiration quote + streak tracking
- ✅ About, FAQ, Contact, Privacy Policy, Terms of Service pages

**Planned / Not Yet Built**
- ⬜ Payments and subscriptions
- ⬜ Live classroom collaborative tools — whiteboard, screen share, raise hand, recording (requires real video infrastructure such as LiveKit or Daily.co; targeted for a future "PC phase" of development)
- ⬜ Full site-wide language translation (currently demoed on one page)
- ⬜ Dark mode rollout across all pages (currently implemented on the Settings page as a working reference implementation)

> Note: this repo may also contain earlier pages (e.g. classroom/session/calendar-related files) from prior development phases not fully covered by this README yet — see Roadmap below for a documentation cleanup pass.

## Screenshots

*Add screenshots here once available — recommended shots: Landing page, Student Dashboard, Course Player with AI Tutor, Teacher course builder.*

```md
![Landing Page](docs/screenshots/landing.png)
![Student Dashboard](docs/screenshots/dashboard.png)
```

## Technologies Used

| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS, JavaScript (no framework, no build step) |
| Backend / Database | [Supabase](https://supabase.com) (Postgres, Auth, Row-Level Security) |
| Hosting / Deploy | [Vercel](https://vercel.com) (static hosting + serverless functions) |
| AI | Anthropic Claude API, called server-side via a Vercel serverless function (`/api/ask-ai.js`) |
| Fonts | Fraunces (display), Inter (body) — via Google Fonts |

## Installation / Local Setup

This project is designed to run with **zero build step** — it's deployed as-is.

### 1. Clone the repo
```bash
git clone https://github.com/312grider-rgb/gshoddow.git
```

### 2. Set up Supabase
- Create a project at [supabase.com](https://supabase.com)
- Run the SQL migrations in `/migrations` (see below) to set up all required tables and Row-Level Security policies
- Copy your **Project URL** and **anon/publishable key** from Project Settings → API

### 3. Configure each HTML file
Every page that talks to Supabase has a config block near the top of its `<script>` tag:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```
Replace both with your real values.

### 4. Set up the AI serverless function
- The file `api/ask-ai.js` **must** live at that exact lowercase path for Vercel to recognize it as a serverless function
- In Vercel → Project Settings → Environment Variables, add:
  ```
  ANTHROPIC_API_KEY=your_key_here
  ```

### 5. Deploy
- Push to GitHub, connect the repo to Vercel, and it deploys automatically on every commit to `main`
- No build command needed — this is a static site with one serverless function

## Database Migrations

SQL migrations are tracked as plain `.sql` files. See `/migrations` — run them in order in the Supabase SQL Editor. (See Roadmap: consolidating scattered migration snippets into this folder is an active cleanup task.)

## Roadmap

- [ ] Consolidate all SQL run so far into ordered files under `/migrations`
- [ ] Roll dark mode out to every page (currently Settings-only)
- [ ] Roll full language translation out site-wide (currently Settings-only demo)
- [ ] Payments and subscription tier
- [ ] Live classroom real-time collaboration (whiteboard, screen share, recording) — PC-phase
- [ ] Review and integrate/retire legacy pages from earlier project phases
- [ ] Add automated testing

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](LICENSE).
