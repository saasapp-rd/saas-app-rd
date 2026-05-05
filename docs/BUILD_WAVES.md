# Build Waves — SAAS RD App

**Last updated: 2026-05-05**
> Build in waves so every wave is independently testable and shippable.
> No wave starts until the previous wave passes its check.

---

## Wave 0 — Foundation COMPLETE

**Delivered:** Repo, deploy pipeline, design system, test auth, skeleton role views, all spec docs.

| Item | Status |
|---|---|
| GitHub repo saasapp-rd/saas-app-rd | done |
| Vercel auto-deploy from main | done |
| Coming Soon page + SAAS logo + favicon | done |
| Design system locked (colors, type, buttons) | done |
| next-auth test login (8 roles, pw: saas2026) | done |
| /missing shared landing page (all staff roles) | done |
| Skeleton role views - teacher, coordinator, counselor, dean, admin, staff | done |
| docs/ - DESIGN, ARCHITECTURE, SPEC, UI_MAP, PRIORITIES, IDEAS | done |
| docs/mockups/ - 7 HTML print-to-PDF role mockups + flowchart | done |

**Wave 0 check:** Login works, all roles route correctly, mockups print cleanly.

---

## Wave 1 — Database + Period Logic COMPLETE

**Delivered:** Supabase connected. App knows what block it is. All subsequent waves read/write real data.

| Item | Status |
|---|---|
| Supabase project created (US region) | done |
| @supabase/supabase-js added to package.json | done |
| lib/supabase.ts - server (service role) + browser (anon) clients | done |
| lib/schedule.ts - getCurrentPeriod(), block rotation, Block 1 detection | done |
| lib/auth.ts - DB role lookup on login, upsert with fixed UUIDs | done |
| types/next-auth.d.ts - userId, email added to session | done |
| supabase/schema.sql - 12 tables, enums, RLS enabled, indexes | done |
| supabase/seed.sql - 8 test users, May calendar, AP Bio course, 6 students | done |
| Vercel env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY | done |
| Postgres grants for service_role on all public tables | done |
| /api/debug/period returns connected: true, user_count: 8, correct calendar row | done |

**Wave 1 check:** /api/debug/period returns connected: true, user_count: 8, today_calendar with correct day_type.

---

## Wave 2 — Admin Data Layer  NEXT

**Size: M (1-2 days)**
**Depends on: Wave 1**

**Delivers:** Real students, courses, and calendar data loaded into the DB. Coordinators assigned to blocks. Admin can import/manage this data.

### Tasks
- [ ] Admin UI: CSV import for students (name, grade, ID)
- [ ] Admin UI: Course builder (name, teacher, block, room)
- [ ] Admin UI: Student enrollment (student to course+block)
- [ ] Admin UI: School calendar editor (day type per date, holidays)
- [ ] Admin UI: Coordinator block assignments

**Wave 2 check:** Log in as admin, import 10 students, assign a coordinator to Block 3, calendar shows correct day type for today.

---

## Wave 3 — Teacher Attendance Report

**Size: M**
**Depends on: Wave 2**

**Delivers:** Teachers can report a missing student from their class. Incident created in DB.

### Tasks
- [ ] Teacher view: shows their current block + enrolled students
- [ ] Report Missing button creates incident in DB
- [ ] Student With Me button logs context, closes teacher loop
- [ ] Block 1 suppression: no email home if first block of day
- [ ] Deduplication: same student + same block = no new incident

**Wave 3 check:** Log in as teacher, report a student missing, incident appears in /missing for coordinator.

---

## Wave 4 — Coordinator Workflow

**Size: L**
**Depends on: Wave 3**

**Delivers:** Full 6-step coordinator workflow wired to real data. Triage, escalation, found/resolved.

### Tasks
- [ ] Triage queue: imperfect attendance, coordinator resolves false positives
- [ ] Step timer: auto-escalate routine to elevated after threshold
- [ ] Step 1-6 actions wired to DB (timestamps, status updates)
- [ ] Student With Me / Found resolution
- [ ] Escalate to dean button
- [ ] Dean view: elevated incidents only + family follow-up log

**Wave 4 check:** Report missing, triage, open workflow, step through to resolved.

---

## Wave 5 — Notifications

**Size: M**
**Depends on: Wave 4**

**Delivers:** Email home at Step 3. Coordinator gets SMS/push on new incident. Dean gets alert on escalation.

### Tasks
- [ ] Email provider setup (Resend or SendGrid - decision pending)
- [ ] SMS provider setup (Twilio - decision pending)
- [ ] Step 3: send email home to family
- [ ] Block 1 suppression enforced on send
- [ ] New incident SMS/push to assigned coordinator
- [ ] Escalation SMS/push to dean

**Wave 5 check:** Report missing, reach Step 3, email arrives in test inbox.

---

## Wave 6 — Row Level Security

**Size: S**
**Depends on: Wave 5**

**Delivers:** Database locked down. Each role can only read/write what they should.

### Tasks
- [ ] RLS policies for each table x each role
- [ ] Teacher: can only see their own incidents
- [ ] Coordinator: can see incidents for their assigned blocks
- [ ] Dean: elevated incidents only
- [ ] Admin/super_admin: all rows

**Wave 6 check:** Log in as teacher via anon key, can only see own rows. Service role still sees all.

---

## Wave 7 — Realtime

**Size: S**
**Depends on: Wave 6**

**Delivers:** /missing page updates live without refresh. Timer ticks in real time.

### Tasks
- [ ] Supabase Realtime subscription on incidents table
- [ ] /missing page: new incidents appear automatically
- [ ] Incident timer: live countdown on coordinator view
- [ ] Optimistic UI updates on action buttons

**Wave 7 check:** Open /missing in two browsers, report incident in one, appears in other within 2 seconds.

---

## Wave 8 — Google SSO

**Size: S**
**Depends on: Wave 0 (auth)**
**Blocked on: Google OAuth credentials from tech team**

**Delivers:** Real staff log in with their @seattleacademy.org Google account.

### Tasks
- [ ] Google OAuth provider added to next-auth
- [ ] Redirect URI registered: https://saas-app-rd.vercel.app/api/auth/callback/google
- [ ] Role assigned from DB on first login (admin seeds initial roles)
- [ ] Test login removed from production build

**Wave 8 check:** Log in with real @seattleacademy.org account, routed to correct role view.

---

## Wave 9 — Activity Tracker

**Size: L**
**Depends on: Wave 4**
**Blocked on: Activity Tracker spec not yet written**

**Delivers:** Coordinators can log where they physically searched during an incident.

### Tasks
- [ ] Spec to be written first
- [ ] Location log UI (mobile-optimized)
- [ ] Search log saved to incident_search_logs table
- [ ] Visible in incident timeline

---

## Wave 10 — Veracross Integration

**Size: XL**
**Depends on: Wave 3**
**Blocked on: Veracross API credentials + IT approval**

**Delivers:** Attendance data flows in from Veracross automatically.

### Tasks
- [ ] Veracross API credentials obtained
- [ ] Webhook or polling: pull attendance marks into imperfect_attendance table
- [ ] Replace manual teacher report with Veracross-triggered incidents
- [ ] Axiom glitch detection (present to absent same block)

---

*Generated by Claude. Update this file as waves complete.*
