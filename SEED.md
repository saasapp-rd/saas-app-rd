# SEED — Working Ledger

A shared coordination ledger so collaborators don't overwrite each other.
**Update this file BEFORE you start work AND BEFORE you merge to `main`.**

---

## How to use

1. **Before you start** → add a row to **Active work** with your name, branch, the files/areas you'll touch, and a one-line scope.
2. **Before you merge** → re-read this file. If anyone else has overlapping files in flight, coordinate first.
3. **After you merge** → move your row from **Active work** down to **Recently merged**, then ping the other person so they know to `git pull origin main`.
4. **If you hit a conflict** → stop. Don't force through it. Talk first, then resolve together.

---

## Active work

| Who | Branch | Area / files | Started | PR / status |
|---|---|---|---|---|
| Scott | `chore/gitignore-and-lockfile` | `.gitignore`, `package-lock.json` | 2026-05-13 | [#1](https://github.com/saasapp-rd/saas-app-rd/pull/1) — in review |
| Scott | `docs/seed-coordination` | `SEED.md` (this file) | 2026-05-13 | this PR |

---

## Recently merged (rolling 14 days)

| Who | PR / commit | What | Merged |
|---|---|---|---|
| Intern | [`5bf0658`](https://github.com/saasapp-rd/saas-app-rd/commit/5bf0658) | `fix: use select(*) on role page so missing migration columns never break the query` — `app/admin/users/[role]/page.tsx` | 2026-05-13 |

---

## Conventions

- **Branch names:** `feat/<topic>`, `fix/<topic>`, `chore/<topic>`, `docs/<topic>`
- **Pull main first:** always `git checkout main && git pull origin main` before creating a new branch
- **Push WIP early:** even an empty branch + ledger row is enough to broadcast intent — beats finding out at merge time
- **High-conflict areas — coordinate explicitly before touching:**
  - `supabase/migrations/` — sequence-numbered, hard to merge if both add files
  - `supabase/schema.sql`, `supabase/seed.sql` — full-file rewrites collide easily
  - `lib/auth.ts`, `app/api/auth/**` — auth flows
  - `package.json` / `package-lock.json` — dep churn produces painful three-way merges
  - `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts` — global config

---

## If you hit a conflict at merge time

Don't force through. The usual flow:

```bash
git fetch origin
git status                       # working tree should be clean; otherwise git stash
git pull origin main             # may surface conflicts
# Talk to the other person about intent BEFORE picking sides
# Resolve the conflict in your editor
git add <resolved-files>
git commit                       # default merge-commit message is fine
git push
```

If your local `main` is significantly behind and you haven't started new work yet:

```bash
git fetch origin
git checkout main
git pull origin main
```

If you're mid-branch and main moved under you, rebase rather than merge to keep history linear:

```bash
git fetch origin
git rebase origin/main           # resolve conflicts as they appear
git push --force-with-lease      # safer than --force; refuses if remote moved
```

---

## Notes / shared decisions

_(Use this section for short context the other person needs to know: deferred work, broken-on-purpose state, env var changes that need to be pulled from Vercel manually, etc.)_

- 2026-05-13 — Local dev now works against the shared Supabase. Required env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. `NEXTAUTH_SECRET` and VAPID keys can be generated fresh per environment; Supabase keys come from Vercel.
