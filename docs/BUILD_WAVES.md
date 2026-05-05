# Build Waves — SAAS RD App

**Last updated: 2026-04-30**
> Build in waves so every wave is independently testable and shippable.
> No wave starts until the previous wave passes its check.

---

## Wave 0 — Foundation ✅ COMPLETE

**Delivered:** Repo, deploy pipeline, design system, test auth, skeleton role views, all spec docs.

| Item | Status |
|---|---|
| GitHub repo `saasapp-rd/saas-app-rd` | ✅ |
| Vercel auto-deploy from `main` | ✅ |
| Coming Soon page + SAAS logo + favicon | ✅ |
| Design system locked (colors, type, buttons) | ✅ |
| next-auth test login (8 roles, pw: saas2026) | ✅ |
| `/missing` shared landing page (all staff roles) | ✅ |
| Skeleton role views — teacher, coordinator, counselor, dean, admin, staff | ✅ |
| docs/ — DESIGN, ARCHITECTURE, SPEC, UI_MAP, PRIORITIES, IDEAS | ✅ |
| docs/mockups/ — 7 HTML print-to-PDF role mockups + flowchart | ✅ |

**Wave 0 check:** ✅ Login works, all roles route correctly, mockups print cleanly.

---

## Wave 1 — Database + Period Logic 🔄 IN PROGRESS

**Size: M (1–2 days)**
**Depends on: Wave 0**

**Delivers:** Supabase connected to the app. The app knows what block it is right now.
All subsequent waves read/write from a real database.

### Tasks
- [x] Create Supabase project (US region)
- [x] Add env vars to Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] `lib/supabase.ts` — server client (service role) + browser client (anon)
- [x] `lib/schedule.ts` — `getCurrentPeriod()`, `getBlockNumber()`, `isFirstBlockOfDay()`
- [x] `lib/auth.ts` — on login, upsert user into `users` table, attach DB role to session
- [x] `supabase/schema.sql` — all 12 tables, enums, indexes, RLS enabled
- [x] `supabase/seed.sql` — 8 test users, sample calendar, sample course + 6 students
- [x] `/api/debug/period` — smoke-test route (DB connection + period detection)
- [ ] **Run `schema.sql` in Supabase SQL Editor** ← user action required
- [ ] **Run `seed.sql` in Supabase SQL Editor** ← user action required
- [ ] Verify `/api/debug/period` returns correct data after deploy

### Wave 1 Check ✓
- `/api/debug/period` returns `{ connected: true, user_count: 8 }` from Supabase
- `period` field shows correct type and block number for current time
- `today_calendar` shows today's day_type from seed data
- Vercel production build passes

---

## Wave 2 — Admin Data Layer
**Size: L (3–5 days)**
**Depends on: Wave 1**

**Delivers:** Admin can load real data into the system — via CSV upload or manual entry.
After this wave, the app has real students, schedules, and users.

### Tasks

**CSV Import (`/admin/import`)**
- [ ] File upload UI (drag-and-drop + button) for each of the 3 CSVs
- [ ] `school_calendar.csv` parser → upsert into `school_calendar` table
- [ ] `course_schedule.csv` parser → upsert into `courses` table
- [ ] `student_roster.csv` parser → upsert into `students` + `student_enrollments`
- [ ] Import preview: show row count + validation errors before confirming
- [ ] Import history log (who uploaded, when, how many rows)

**User Management (`/admin/users`)**
- [ ] List all users with role + block assignments
- [ ] Add user (name, email, role)
- [ ] Edit user (change role, change name)
- [ ] Delete user (soft delete — preserve audit trail)
- [ ] Assign coordinator to blocks (multi-select block picker)
- [ ] Bulk CSV upload for teachers/staff

**Student Management (`/admin/students`)**
- [ ] List all students (searchable, filterable by grade)
- [ ] Add student manually (name, grade, assign to course/block)
- [ ] Edit student (name, grade)
- [ ] Move student to different class (reassign enrollment)
- [ ] Delete student

**Coordinator Assignments (`/admin/coordinators`)**
- [ ] View current block → coordinator mapping
- [ ] Reassign coordinator to block
- [ ] Academic year selector

### Wave 2 Check ✓
- Admin uploads all 3 CSVs → data appears in Supabase tables
- Admin adds a new teacher manually → appears in user list
- Admin moves a student from one class to another → enrollment updated
- Admin assigns coordinator to Block 3 → stored in DB

---

## Wave 3 — Teacher Report Flow (Real Data)
**Size: M (1–2 days)**
**Depends on: Wave 2 (need real students in DB)**

**Delivers:** Teachers see their real roster. Reporting a missing student creates a real incident in the database.
Coordinators can see it immediately.

### Tasks
- [ ] `/teacher` — replace hardcoded roster with Supabase query (period-aware)
- [ ] Show "No class right now" outside block hours
- [ ] Report Missing form → `POST /api/incidents` → creates `incident` row
- [ ] Auto-escalation: context tag + period → routine/elevated/emergency
- [ ] Deduplication: if student already has open incident this block → surface existing
- [ ] Confirmation screen pulls real incident data from DB
- [ ] Welfare Concern form (lunch/community) → creates elevated incident
- [ ] `/missing` page — replace hardcoded incidents with live Supabase query

### Wave 3 Check ✓
- Teacher logs in, sees real students (from CSV import) in current block
- Selects a student, picks context tag → incident created in Supabase
- Coordinator logs in → sees the new incident in `/missing` and `/coordinator`
- Duplicate report for same student → shown "already open" message
- Block 1 absence: incident created, suppress_email_home = true

---

## Wave 4 — Coordinator Core Workflow
**Size: L (3–5 days)**
**Depends on: Wave 3**

**Delivers:** The full 6-step coordinator workflow runs with real data. All actions persist.

### Tasks
- [ ] Imperfect attendance manual entry
- [ ] Triage actions (dismiss with reason / confirm → incident)
- [ ] Live incident feed from Supabase (elevated-first, oldest-first)
- [ ] Incident detail: 6 steps tracked with timestamps in DB
- [ ] Step 3: countdown timer (reads `step_3_expires_at`)
- [ ] Step 4: physical search log → `incident_search_logs`
- [ ] Step 5: intercom page — one-tap log
- [ ] Shared + private updates → `incident_updates`
- [ ] With Me / Found → resolves incident, logs location + excused/unexcused
- [ ] Auto-set open steps to N/A on found, log `step_found_at`
- [ ] Escalate to Emergency → level updated in DB

### Wave 4 Check ✓
- Coordinator triages students, confirms one missing → incident in DB
- Runs all 6 steps → resolves at Step 4 with location
- Step 3 countdown live and correct
- Private update invisible to teacher/staff role

---

## Wave 5 — Communications
**Size: M (2–3 days)**
**Depends on: Wave 4**

**Delivers:** Real emails and texts fire at Steps 1, 2, and 6.

### Tasks
- [ ] Choose + configure email provider (Resend recommended)
- [ ] Choose + configure SMS provider (Twilio)
- [ ] Step 1: auto-email to missingstudents@seattleacademy.org
- [ ] Step 2: auto-text to student phone
- [ ] Step 6: auto-email to parent + teacher + dean
- [ ] Block 1 email suppression (check `suppress_email_home` flag)
- [ ] Counselor auto-ping + 10-min escalation timer
- [ ] All comms logged in DB with timestamp

### Wave 5 Check ✓
- Submit report → missingstudents@ receives email within 30 seconds
- Student phone receives text
- Step 6 fires → parent/teacher/dean receive email
- Block 1: Step 6 email suppressed

---

## Wave 6 — Patterns + Counselor/Dean + RLS
**Size: L (3–5 days)**
**Depends on: Wave 4**

**Delivers:** Counselor and dean views show real data. RLS locks data access by role.

### Tasks
- [ ] Concern flag CRUD (DB-backed, public + private notes)
- [ ] Counselor caseload dashboard (real incident history)
- [ ] Dean pattern dashboard (real data, ranked)
- [ ] Student detail: full history + pattern stats
- [ ] Auto-surface pattern alert triggers (5 rules)
- [ ] Row Level Security policies on all tables

### Wave 6 Check ✓
- Counselor flags real student → public note visible, private note invisible to others
- Dean sees ranked student list with real incident counts
- Pattern alert fires correctly
- RLS: teacher cannot read other teachers' incidents

---

## Wave 7 — Realtime + Welfare Concern
**Size: S–M (1–2 days)**
**Depends on: Wave 4**

**Delivers:** Live updates push to all connected clients. Welfare concern form works end-to-end.

### Tasks
- [ ] Supabase Realtime on `incidents` table in `/missing`
- [ ] Browser notifications for elevated/emergency incidents
- [ ] Welfare concern form submits → elevated incident → Realtime push

### Wave 7 Check ✓
- Two browsers open → incident submitted in one → other updates in <2 seconds

---

## Wave 8 — Google SSO
**Size: S (half day once credentials arrive)**
**Depends on: Wave 1**
**Blocked on: Tech team providing GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET**

### Tasks
- [ ] Add Google provider to next-auth, remove CredentialsProvider
- [ ] Domain restriction to @seattleacademy.org
- [ ] First-login role assignment from `users` table
- [ ] Remove test mode banner
- [ ] Pre-seed real admin/dean/coordinator emails in `users` table

### Wave 8 Check ✓
- Real @seattleacademy.org account signs in → correct role → no test banner

---

## Wave 9 — Activity Tracker
**Size: L (3–5 days)**
**Depends on: Wave 2**
**Blocked on: Activity Tracker spec (not yet written)**

### Tasks
- [ ] Write Activity Tracker spec (`docs/ACTIVITY_TRACKER_SPEC.md`)
- [ ] DB schema: activities, activity_rosters, activity_attendance
- [ ] Activity creation + roster management
- [ ] Attendance taking
- [ ] Admin overview + absence notifications

---

## Wave 10 — Axiom / Veracross API
**Size: M–L (2–4 days)**
**Depends on: Wave 4**
**Blocked on: Veracross API access**

### Tasks
- [ ] Veracross OAuth connector
- [ ] Auto-pull imperfect attendance at block start
- [ ] Replace CSV imports with live API sync
- [ ] Veracross write-back (decision pending)

---

## Summary Table

| Wave | Name | Size | Status |
|---|---|---|---|
| 0 | Foundation | — | ✅ Complete |
| 1 | Database + Period Logic | M | 🔄 In Progress — needs SQL run in Supabase |
| 2 | Admin Data Layer | L | 🔴 Not started |
| 3 | Teacher Report Flow | M | 🔴 Not started |
| 4 | Coordinator Core Workflow | L | 🔴 Not started |
| 5 | Communications | M | 🔴 Not started |
| 6 | Patterns + Counselor/Dean + RLS | L | 🔴 Not started |
| 7 | Realtime + Welfare Concern | S–M | 🔴 Not started |
| 8 | Google SSO | S | 🟡 Blocked — need credentials |
| 9 | Activity Tracker | L | 🟡 Blocked — need spec |
| 10 | Axiom/Veracross API | M–L | 🟡 Blocked — need API access |

---

## Critical Path

```
Wave 1 → Wave 2 → Wave 3 → Wave 4 ─┬→ Wave 5
                                    ├→ Wave 6
                                    └→ Wave 7

Wave 1 → Wave 8 (parallel, blocked on credentials)
Wave 2 → Wave 9 (parallel, blocked on spec)
Wave 4 → Wave 10 (parallel, blocked on API access)
```
