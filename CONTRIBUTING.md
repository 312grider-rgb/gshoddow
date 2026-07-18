# Contributing to Paradise Of The Eternal Learners

Thanks for helping improve the platform! This guide covers how work gets tracked and merged.

## Reporting Bugs / Requesting Features

Use **GitHub Issues** for anything that isn't a same-session fix:
- **Bug reports**: describe what you expected, what actually happened, and steps to reproduce. Screenshots help a lot on a UI-heavy project like this.
- **Feature requests**: describe the problem it solves, not just the solution — helps prioritize.

Label issues as `bug`, `enhancement`, `documentation`, or `question` so the Projects board (below) can sort them.

## Tracking Progress: GitHub Projects

A **Projects board** (Kanban-style: Backlog → In Progress → Review → Done) is the recommended way to track larger initiatives (e.g. "Payments integration," "Live classroom infrastructure") without losing track of them in chat history. Create one under the repo's **Projects** tab and link issues to it.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) style — it makes the history scannable and could later auto-generate changelogs:

```
feat: add AI tutor chat panel to lesson player
fix: resolve login page infinite loading state
docs: update README with setup instructions
style: apply luxury palette to admin dashboard
refactor: consolidate course card markup
chore: add SQL migration for saved_courses table
```

Common prefixes: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`.

## Branching Strategy

Given this project is currently built and deployed straight from GitHub's mobile web editor (no local dev environment), a lightweight version of a standard workflow works best:

1. **Protect `main`** — in Settings → Branches, add a branch protection rule for `main` requiring at least a review (or, solo, just requiring a pull request before merging — this creates a deliberate checkpoint instead of instant live edits).
2. **For anything non-trivial**, use "Create a new branch and start a pull request" (available directly in GitHub's mobile upload flow) instead of committing straight to `main`.
3. **For small, low-risk fixes** (typo, copy change), direct-to-`main` commits are reasonable — use judgment.
4. Merge via pull request even solo, so there's a record of *why* a change was made (PR description) beyond just the commit message.

## Code Style

- Plain HTML/CSS/JS, no framework, no build step — keep it that way unless a deliberate architecture decision changes this (see README roadmap)
- Each page is self-contained (its own `<style>` and `<script>`) since there's no shared bundler — copy the existing design tokens (`--ink`, `--gold`, `--cream`, etc.) from another page rather than inventing new colors
- New Supabase-backed features need a corresponding SQL file added under `/migrations`

## Questions

Open an issue, or reach out via the [Contact page](https://gshoddow.vercel.app/skillstream-contact.html).
