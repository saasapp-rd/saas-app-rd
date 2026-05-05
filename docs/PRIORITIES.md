# Priorities & Build Status

**Last updated: 2026-04-30**
> Detailed wave plan: `docs/BUILD_WAVES.md`

---

## What's Built ✅

| Item | Notes |
|---|---|
| GitHub + Vercel connected | Auto-deploy from `main` |
| Coming Soon page | SAAS logo, cardinal favicon, "Staff Sign In" button |
| Design system | Locked in `DESIGN.md` — colors, type, buttons |
| Test auth (8 roles) | next-auth CredentialsProvider, all pw: `saas2026` |
| `/login` page | Quick-select role buttons + manual username/password |
| `/missing` landing | Shared active incidents list — all staff land here on login |
| `/teacher` view | Block roster, report missing flow (placeholder data) |
| `/coordinator` view | Triage + 6-step workflow (placeholder data) |
| `/counselor` view | Caseload dashboard + flag management (placeholder data) |
| `/dean` view | Pattern dashboard + student detail (placeholder data) |
| `/admin` view | System menu (placeholder data) |
| `/staff` view | Welfare concern form (placeholder data) |
| `/student` view | Placeholder — future phase |
| Role mockups | 7 print-to-PDF HTML files in `docs/mockups/` |
| Spec documents | DESIGN, ARCHITECTURE, SPEC, UI_MAP, IDEAS, PRIORITIES, BUILD_WAVES |

---

## What's Not Built 🔴

**Everything currently uses hardcoded/placeholder data. No real database exists.**

| Item | Wave |
|---|---|
| Supabase schema + connection | Wave 1 |
| Period / block detection (real-time) | Wave 1 |
| Session → DB user lookup | Wave 1 |
| CSV import pipeline | Wave 2 |
| Admin user CRUD | Wave 2 |
| Admin student CRUD | Wave 2 |
| Coordinator block assignments | Wave 2 |
| Real teacher roster (from DB) | Wave 3 |
| Report missing → creates real incident | Wave 3 |
| Auto-escalation logic (context + period) | Wave 3 |
| Incident deduplication | Wave 3 |
| Imperfect attendance triage (real) | Wave 4 |
| 6-step workflow (real, persisted) | Wave 4 |
| Physical search log (real) | Wave 4 |
| With Me / Found actions (real) | Wave 4 |
| Private + shared updates (real) | Wave 4 |
| Step 1: auto-email to missingstudents@ | Wave 5 |
| Step 2: auto-text to student | Wave 5 |
| Step 6: auto-email home (parent/teacher/dean) | Wave 5 |
| Block 1 email suppression | Wave 5 |
| Counselor auto-ping + 10-min escalation | Wave 5 |
| Concern flags (real, DB-backed) | Wave 6 |
| Counselor caseload (real data) | Wave 6 |
| Dean pattern dashboard (real data) | Wave 6 |
| Auto-surface pattern alerts | Wave 6 |
| Row Level Security (RLS) | Wave 6 |
| Supabase Realtime (live updates) | Wave 7 |
| Push notifications (elevated/emergency) | Wave 7 |
| Welfare concern form (real submission) | Wave 7 |
| Google SSO (replace test auth) | Wave 8 |
| Activity Tracker | Wave 9 |
| Axiom / Veracross API | Wave 10 |

---

## Blocked On (External) 🟡

| Blocker | Needed For | Who |
|---|---|---|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` from Google Cloud Console | Wave 8 — Google SSO | Tech team |
| Redirect URI registered: `https://saas-app-rd.vercel.app/api/auth/callback/google` | Wave 8 | Tech team |
| Veracross API access granted | Wave 10 — Axiom integration | School admin |
| Activity Tracker spec written | Wave 9 | Us — next design session |

---

## Open Decisions

| Decision | Status |
|---|---|
| Veracross write-back | v1 = manual. API TBD. |
| Email provider (Resend vs SendGrid) | Not decided — needed for Wave 5 |
| SMS provider (Twilio) | Not decided — needed for Wave 5 |
| MS building in physical search | In scope, low priority |
| Activity Tracker scope | Not specced yet |

---

## What's Next

**Start Wave 1 — Supabase Foundation.**

1. Create Supabase project at supabase.com
2. Get `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Add to Vercel env vars
4. Claude writes + runs schema SQL, connects Next.js, builds period detection

See `docs/BUILD_WAVES.md` for the full task list per wave.
