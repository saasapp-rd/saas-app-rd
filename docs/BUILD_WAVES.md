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

## Wave 1 — Database + Period Logic
**Size: M (1–2 days)**
**Depends on: Wave 0**

**Delivers:** Supabase connected to the app. The app knows what block it is right now.
All subsequent waves read/write from a real database.

### Tasks
- [ ] Create Supabase project (US region, free tier to start)
- [ ] Add env vars to Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add env vars locally: `.env.local` for dev
- [ ] Write and run schema migration SQL:
  - `users` (id, email, name, role, display_name, created_at)
  - `students` (id, first_name, last_name, grade, veracross_id, created_at)
  - `courses` (id, name, teacher_id, block_number, room, academic_year)
  - `student_enrollments` (student_id, course_id, block_number)
  - `school_calendar` (date, day_type 1–4, is_school_day)
  - `coordinator_assignments` (block_number, coordinator_id, academic_year)
  - `incidents` (full model per ARCHITECTURE.md)
  - `incident_updates` (id, incident_id, author_id, note, is_private, created_at)
  - `incident_search_logs` (id, incident_id, location, checked_by, found, checked_at)
  - `student_concern_flags` (student_id, flag_level, public_note, private_note, flagged_by, updated_at)
  - `pattern_alerts` (id, student_id, trigger_type, detected_at, acknowledged_by)
  - `imperfect_attendance` (id, student_id, block_id, date, source, resolved, resolution)
- [ ] Enable Row Level Security on all tables (open policies for now — locked in Wave 6)
- [ ] Create `lib/supabase.ts` — server client + browser client
- [ ] Create `lib/schedule.ts`:
  - `getCurrentDayType(date)` → looks up school_calendar table
  - `getCurrentBlocks(dayType)` → returns block numbers for that day
  - `getCurrentPeriod(time)` → returns `{type: 'block'|'lunch'|'community', blockPosition: 1–4|null}`
  - `getBlockNumber(dayType, position)` → maps day+position → actual block number
- [ ] Wire login: on session create, look up user by email in `users` table → attach role
- [ ] Seed 5 test users in DB (admin, dean, coordinator, counselor, teacher) matching test accounts
- [ ] Smoke test: API route that returns current period + block number

### Wave 1 Check ✓
- App connects to Supabase without error
- `/api/debug/period` returns correct period and block number for current time
- Seeded users appear in Supabase dashboard
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
- [ ] `/teacher` — replace hardcoded roster with Supabase query:
  - Detect current period using `lib/schedule.ts`
  - Query student enrollments for teacher's courses in current block
  - Show "No class right now" if between blocks or lunch/community
- [ ] Report Missing form → `POST /api/incidents` → creates `incident` row
  - Auto-assigns: period_type, block_id, level (based on escalation logic)
  - Auto-escalation: context tag + period → routine/elevated/emergency
  - Deduplication: if student already has open incident this block → surface existing
- [ ] Confirmation screen pulls real incident data from DB
- [ ] Welfare Concern form (lunch/community time) → creates elevated incident
- [ ] `/missing` page — replace hardcoded incidents with live Supabase query

### Wave 3 Check ✓
- Teacher logs in, sees real students (from CSV import) in current block
- Selects a student, picks context tag → incident created in Supabase
- Coordinator logs in → sees the new incident in `/missing` and `/coordinator`
- Duplicate report for same student → shown "already open" message
- Block 1 absence: incident created, email-home flag = false

---

## Wave 4 — Coordinator Core Workflow
**Size: L (3–5 days)**
**Depends on: Wave 3**

**Delivers:** The full 6-step coordinator workflow runs with real data. Coordinators can triage,
work incidents, log search steps, add updates, and resolve. All actions persist to the database.

### Tasks

**Imperfect Attendance Triage**
- [ ] Manual triage entry: coordinator selects block + inputs student names (Axiom auto-pull in Wave 10)
- [ ] Triage actions: dismiss (sports / off-campus trip / accommodations / parent update / sub glitch) or confirm missing
- [ ] Dismissed records saved with reason (audit trail)
- [ ] "Pull Final Report" button (20-min mark) pulls all unresolved for the block

**Incident Feed**
- [ ] Live incident list from Supabase — sorted elevated-first, then by age
- [ ] Incident card: level badge, name, grade, time open, detail, step status
- [ ] Filter: all / elevated only / my block

**Incident Detail + 6-Step Workflow**
- [ ] Steps 1, 2, 6 recorded as auto (timestamp set when triggered — comms in Wave 5)
- [ ] Step 3: countdown timer UI — reads `step_3_expires_at` from DB, counts down live
- [ ] Step 4: physical search log — tap location to check off, saved to `incident_search_logs`
- [ ] Step 5: intercom page — one-tap log with timestamp
- [ ] Add shared update → saved to `incident_updates` (is_private: false)
- [ ] Add private update → saved to `incident_updates` (is_private: true, coordinator/admin only)

**Resolution**
- [ ] "Student With Me" → incident status = located, who/where logged
- [ ] "Found" → prompts for location + excused/unexcused → status = resolved
- [ ] On found: auto-set all open steps to N/A, log step_found_at
- [ ] Escalate to Emergency → level updated, notification sent (Wave 5/7)

### Wave 4 Check ✓
- Coordinator triages 2 students (1 dismissed, 1 confirmed) — both save to DB
- Opens incident → runs all 6 steps → resolves as Found at Step 4
- Step 3 countdown timer shows live and expires correctly
- Physical search log shows checked locations with timestamps
- Private update invisible to teacher/staff role

---

## Wave 5 — Communications
**Size: M (2–3 days)**
**Depends on: Wave 4**

**Delivers:** The app sends real emails and texts. Steps 1, 2, and 6 fire automatically.
The 10-minute counselor verification timer escalates if no response.

### Tasks

**Email (via Resend or SendGrid)**
- [ ] Add email provider env vars to Vercel
- [ ] Step 1: auto-send to `missingstudents@seattleacademy.org` when incident confirmed
- [ ] Step 6: auto-send to parent + teacher + dean when step 6 triggered
- [ ] Block 1 suppression: skip Step 6 email if block_number == first block of day
- [ ] Email templates match spec (no student name in subject line)
- [ ] Sent emails logged in DB with timestamp

**Text (via Twilio)**
- [ ] Add Twilio env vars to Vercel
- [ ] Step 2: auto-text student when step 2 triggered
- [ ] Text template matches spec
- [ ] Sent texts logged in DB

**Counselor Auto-Ping**
- [ ] On incident with context_tag = counselor: ping counseling office (email/text)
- [ ] Set `counselor_pinged_at` timestamp
- [ ] Background job: if no `counselor_confirmed_at` within 10 min → escalate to elevated
- [ ] Counselor "confirm" button in their view → sets `counselor_confirmed_at`

### Wave 5 Check ✓
- Submit report → missingstudents@ receives Step 1 email within 30 seconds
- Step 2 fires → student phone receives text
- Step 6 fires → parent/teacher/dean receive email
- Block 1 incident → Step 6 suppressed (no email home)
- Counselor destination incident → counseling pinged → if no confirm in 10 min → level escalates

---

## Wave 6 — Patterns + Counselor/Dean + RLS
**Size: L (3–5 days)**
**Depends on: Wave 4**

**Delivers:** Counselor and dean views show real data. Concern flags are saved to the database.
Pattern auto-surface triggers fire. Row Level Security locks down who can see what.

### Tasks

**Concern Flags**
- [ ] Flag CRUD: create, update, remove flag (counselor/dean/admin only)
- [ ] Public note: visible to all staff in student detail
- [ ] Private note: visible to counselor/dean/admin only — enforced at DB level (RLS)
- [ ] Flag level changes incident escalation (elevated flag → elevated default)

**Counselor View (real data)**
- [ ] Caseload dashboard: query `student_concern_flags` + incident history for counselor's students
- [ ] Toggle: My Caseload vs. All Students
- [ ] Active incidents for caseload students surfaced at top
- [ ] Claim student: "With Me" with private/shared note option
- [ ] Student detail: full incident history + flag management

**Dean / Admin Pattern Dashboard (real data)**
- [ ] Query incident history, aggregate by student
- [ ] Rank students by incident count (week / month / semester filter)
- [ ] Auto-surface triggers (cron or on-query):
  - Same block 3× in 2 weeks → PatternAlert
  - 2+ blocks same day → PatternAlert
  - 4+ incidents in 5 days → PatternAlert
  - 0 text responses in last 4 incidents → PatternAlert
  - Any incident open 24h+ → PatternAlert
- [ ] Pattern alerts surfaced at top of dashboard
- [ ] Student detail: history, pattern stats, consequences log (dean can add notes)

**Row Level Security**
- [ ] `incidents`: teacher sees only incidents where they are `reported_by` OR student is in their block
- [ ] `incidents`: staff sees all open, no level field
- [ ] `incidents`: coordinator/dean/counselor/admin sees all + level
- [ ] `incident_updates`: is_private=true → only author + admin/dean/counselor
- [ ] `student_concern_flags`: private_note → only counselor/dean/admin
- [ ] All tables: unauthenticated = no access

### Wave 6 Check ✓
- Counselor flags student → public note visible to teacher, private note invisible
- Dean sees ranked student list with real incident counts
- Pattern alert fires for student with 4+ incidents this week
- RLS: teacher cannot query incidents they have no access to
- Private update: staff role cannot read it via direct Supabase query

---

## Wave 7 — Realtime + Welfare Concern
**Size: S–M (1–2 days)**
**Depends on: Wave 4**

**Delivers:** The missing students list updates live for everyone — no refresh needed.
Elevated and emergency incidents push browser notifications. Welfare concern form works end-to-end.

### Tasks
- [ ] Supabase Realtime subscription on `incidents` table in `/missing` page
- [ ] New incident created → all connected clients see it appear instantly
- [ ] Incident resolved → disappears from list for everyone
- [ ] Browser notifications: permission prompt on first login (coordinator/dean)
- [ ] Push notification on elevated incident: coordinator + dean
- [ ] Push notification on emergency: coordinator + dean + counselor
- [ ] Welfare concern form (staff / lunch / community time):
  - Student search by name
  - Context tag selection
  - Submits → elevated incident created
  - Coordinator sees it immediately via Realtime

### Wave 7 Check ✓
- Open `/missing` in two browsers → submit incident in one → other updates in <2 seconds
- Elevated incident → browser notification fires on coordinator's device
- Staff submits welfare concern during lunch → coordinator sees it without refreshing

---

## Wave 8 — Google SSO (Replace Test Auth)
**Size: S (half day — once tech team provides credentials)**
**Depends on: Wave 1 (users table must exist)**
**Blocked on: Tech team providing GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET**

**Delivers:** Real @seattleacademy.org Google accounts sign in. Test auth removed.
First login auto-assigns role from the users table.

### Tasks
- [ ] Tech team: create Google Cloud Console OAuth app, add redirect URI, provide credentials
- [ ] Add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to Vercel env vars
- [ ] Add Google provider to `lib/auth.ts`
- [ ] Remove CredentialsProvider
- [ ] Domain check in `signIn` callback: reject non-@seattleacademy.org emails
- [ ] First-login: look up email in `users` table → assign role; if not found → deny access
- [ ] Pre-seed admin/dean/coordinator/counselor users in DB before go-live
- [ ] Remove yellow test mode banner from all pages
- [ ] Update Coming Soon page: remove "Staff Sign In" button (or keep, now goes to Google)
- [ ] Test: real SAAS Google account logs in, gets correct role

### Wave 8 Check ✓
- Real @seattleacademy.org account signs in → lands on /missing with correct role
- Non-SAAS Google account → rejected at login
- Pre-seeded admin account → gets admin role on first login
- Test credentials no longer work

---

## Wave 9 — Activity Tracker
**Size: L (3–5 days)**
**Depends on: Wave 2 (students + users in DB)**
**Blocked on: Activity Tracker spec (not yet designed)**

**Delivers:** After-school and Community Time activity attendance tracking.
Teachers create activities, manage rosters, take attendance.

### Tasks (to be detailed after spec is written)
- [ ] Write Activity Tracker product spec (`docs/ACTIVITY_TRACKER_SPEC.md`)
- [ ] DB schema: activities, activity_rosters, activity_attendance
- [ ] Activity creation (teacher: name, type, schedule — community/after-school)
- [ ] Roster management (add/remove students)
- [ ] Attendance taking UI (mark present/absent per session)
- [ ] Admin overview: all activities, attendance summary
- [ ] Absence notifications (email to parent if student no-show)

### Wave 9 Check ✓
- Teacher creates "Chess Club" activity
- Adds 5 students to roster
- Takes attendance for today → 1 absent → parent email fires

---

## Wave 10 — Axiom / Veracross Integration
**Size: M–L (2–4 days)**
**Depends on: Wave 4**
**Blocked on: Veracross API access being granted**

**Delivers:** Imperfect attendance pulls automatically from Axiom/Veracross at the start
of each block. No manual coordinator entry needed. CSV bridge replaced by live sync.

### Tasks
- [ ] Veracross OAuth connector
- [ ] Scheduled job: query Axiom imperfect attendance at block start + 5 min mark
- [ ] Auto-populate triage queue with real Axiom data
- [ ] Replace `school_calendar.csv` import with API calendar endpoint
- [ ] Replace `student_roster.csv` import with API roster endpoint
- [ ] Replace `course_schedule.csv` import with API schedule endpoint
- [ ] Veracross write-back (mark resolved / attendance updated) — decision pending

### Wave 10 Check ✓
- At start of Block 3, imperfect attendance queue auto-populates from Axiom (no manual entry)
- Calendar is pulled from Veracross — no CSV needed
- Resolved incident status reflects back in Veracross (if write-back enabled)

---

## Summary Table

| Wave | Name | Size | Depends On | Status |
|---|---|---|---|---|
| 0 | Foundation | — | — | ✅ Complete |
| 1 | Database + Period Logic | M | 0 | 🔴 Not started |
| 2 | Admin Data Layer | L | 1 | 🔴 Not started |
| 3 | Teacher Report Flow | M | 2 | 🔴 Not started |
| 4 | Coordinator Core Workflow | L | 3 | 🔴 Not started |
| 5 | Communications | M | 4 | 🔴 Not started |
| 6 | Patterns + Counselor/Dean + RLS | L | 4 | 🔴 Not started |
| 7 | Realtime + Welfare Concern | S–M | 4 | 🔴 Not started |
| 8 | Google SSO | S | 1 | 🔴 Blocked (need credentials) |
| 9 | Activity Tracker | L | 2 | 🔴 Blocked (need spec) |
| 10 | Axiom/Veracross API | M–L | 4 | 🔴 Blocked (need API access) |

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

**Fastest path to a usable app for coordinators:**
Wave 1 → 2 → 3 → 4. That's the Missing Students core loop working end-to-end.
Add Wave 5 for real communications. Add Wave 8 to go live with real Google logins.
