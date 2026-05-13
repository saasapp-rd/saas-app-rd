# Build Waves — SAAS RD App

**Last updated: 2026-05-13**
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

## Wave 2 — Admin Data Layer COMPLETE

**Delivered:** Real students, courses, and calendar data loadable. Admin can manage all of it.

| Item | Status |
|---|---|
| Admin UI: CSV import for students (name, grade, school ID) | done |
| Admin UI: Course builder (name, teacher, block, room) | done |
| Admin UI: Student enrollment (student to course+block) | done |
| Admin UI: School calendar editor (day type per date, holidays) | done |
| Admin UI: Coordinator block assignments | done |
| Admin UI: User management — list, edit, deactivate/reactivate | done |
| Admin UI: Per-role user detail pages | done |
| Migration 008_csv_import.sql | done |
| Migration 009_fix_is_active.sql | done |

**Wave 2 check:** Log in as admin, import students, assign a coordinator to a block, calendar shows correct day type for today.

---

## Wave 3 — Teacher Attendance Report COMPLETE

**Delivered:** Teachers report missing students. Incidents created in DB. Roster management by teacher.

| Item | Status |
|---|---|
| Teacher view: current block + enrolled students with incident status | done |
| Report Missing button creates incident in DB | done |
| Student With Me button logs context, closes teacher loop | done |
| Block 1 suppression: no email home if first block of day | done (enforced in coordinator workflow) |
| Deduplication: same student + same block = no new incident | done |
| /teacher/courses: all blocks as accordion cards, add/remove students inline | done |
| Enrollment API: POST/DELETE /api/teacher/enrollment (teacher-scoped, block uniqueness) | done |

**Wave 3 check:** Log in as teacher, report a student missing, incident appears in /missing for coordinator.

---

## Wave 4 — Coordinator Workflow COMPLETE

**Delivered:** Full 6-step coordinator workflow wired to real data.

| Item | Status |
|---|---|
| Triage queue: imperfect attendance, coordinator resolves false positives | done |
| Step timer: auto-escalate routine to elevated after threshold | done |
| Step 1-6 actions wired to DB (timestamps, status updates) | done |
| Student With Me / Found resolution | done |
| Escalate to dean button | done |
| Dean view: elevated incidents + family follow-up log | done |
| Incident notes: private + public, with timestamps | done |
| Migration 005_incident_notes.sql, 006_incident_public_note.sql | done |

**Wave 4 check:** Report missing, triage, open workflow, step through to resolved.

---

## Wave 5 — Notifications PARTIAL

**Delivered:** Web push to coordinator on new incident and dean on escalation. Email infrastructure wired (Resend). Send-home trigger not yet connected to workflow.

| Item | Status |
|---|---|
| Push provider setup (web-push + VAPID) | done |
| Migration 002_push_subscriptions.sql | done |
| New incident push to assigned coordinator | done |
| Escalation push to dean | done |
| lib/email.ts — Resend wired | done |
| Step 3: send email home to family | **not done** |
| Block 1 email suppression enforced on send | **not done** |
| SMS provider setup | **not done** |
| Counselor auto-ping + 10-min escalation | **not done** |

**Wave 5 check (partial):** Push notifications fire. Email-home still needs to be wired into Step 3.

---

## Wave 6 — Row Level Security + Counselor COMPLETE

**Delivered:** DB locked down. Counselor caseload real. RLS policies applied.

| Item | Status |
|---|---|
| RLS policies for each table x each role | done — migration 003_rls_policies.sql |
| student_concern_flags table + counselor caseload | done |
| Counselor dashboard: flagged students with live incident badges | done |
| Welfare concern form: /staff/concern → notifies counselors | done |
| Migration 007_user_phone.sql | done |

**Wave 6 check:** Counselor sees only their flagged students in analytics. RLS policies active.

---

## Wave 7 — Realtime COMPLETE

**Delivered:** /missing page updates live without refresh.

| Item | Status |
|---|---|
| Supabase Realtime subscription on incidents table | done |
| /missing (Live View): new incidents appear automatically | done |
| Live missing-count on admin + staff dashboards | done |
| Live View header: live count subtitle | done |

**Wave 7 check:** Open Live View in two browsers, report incident in one, appears in other within 2 seconds.

---

## Wave 7.5 — UI / UX Pass COMPLETE

**Delivered:** Consistent nav, unified analytics, role-appropriate dashboards, terminology aligned.

| Item | Status |
|---|---|
| Rename "Incidents" → "Missing Students" across all UI (DB unchanged) | done |
| Nav pattern: Dashboard \| Live View \| [role-links] on every page | done |
| Sub-pages: ← Dashboard as primary back link | done |
| Live missing-count widget on admin dashboard | done |
| WelfareConcernLink shared component — all non-student roles | done |
| /analytics page: Today + Patterns tabs, counselor-scoped | done |
| /teacher/courses: accordion roster management | done |
| Teacher nav: Dashboard \| Live View \| Courses | done |

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

*Update this file as waves complete.*
