# Priorities & Next Steps

**Last updated: 2026-04-28**

---

## Build Phases

### Phase 0 — Foundation (unblocked today)
- [ ] Auth: Clerk + Google Workspace SSO
- [ ] Database: Supabase schema (students, blocks, courses, rosters, users)
- [ ] CSV import pipeline: school_calendar, course_schedule, student_roster
- [ ] Manual CRUD admin UI: users, students, classes, coordinator assignments
- [ ] Mid-year schedule change support (move student, reassign teacher/room)
- [ ] Role system: Teacher, Faculty/Staff, Coordinator, Counselor, Dean, Admin
- [ ] Block schedule logic (hardcoded rotation + calendar lookup)
- [ ] Period detection (app knows what period it is right now)

### Phase 1 — Missing Students Tracker
Full spec: `docs/MISSING_STUDENTS_SPEC.md`

- [ ] Teacher block roster view + report flow
- [ ] Context tags + auto-escalation logic
- [ ] Imperfect attendance triage dashboard (coordinator)
- [ ] 6-step coordinator workflow with auto-generated comms
- [ ] 10-minute countdown timer (Step 3)
- [ ] Physical search log with campus buildings
- [ ] Incident feed (coordinator) — sorted by level + time
- [ ] Claim "student is with me" — all staff
- [ ] Counselor destination auto-ping + 10-min escalation
- [ ] Lunch / community time welfare concern flow
- [ ] Counselor view: caseload dashboard + flag management
- [ ] Dean/Admin view: all-student pattern dashboard
- [ ] Student detail: incident history + patterns
- [ ] Concern flag system: public note + private note
- [ ] Pattern auto-surface alerts
- [ ] Communication templates: email + text

### Phase 2 — Activity Tracker
- [ ] Activity creation (teacher builds club/program)
- [ ] In-app roster management
- [ ] Activity scheduling (Community Time + After School)
- [ ] Attendance taking (teacher marks present/absent per activity)
- [ ] Absence notifications
- [ ] Parent/student portal
- [ ] Admin activity overview

### Phase 3 — Veracross API Integration
- [ ] Veracross OAuth connector
- [ ] Replace CSV import with real-time schedule/roster sync
- [ ] Imperfect attendance pulled automatically (no manual entry)
- [ ] Veracross write-back (decision pending)

---

## Now
- [x] GitHub + Vercel connected to Claude Code
- [x] Coming Soon page deployed (Next.js 15, SAAS brand)
- [x] Design system locked (DESIGN.md)
- [x] Tracking docs created
- [x] Missing Students spec completed and locked
- [x] Architecture decisions locked
- [ ] Begin Phase 0 — Foundation

## Decisions Still Open
- Veracross write-back: Option A (manual) confirmed for v1. Option B (API) TBD.
- MS building in physical search: in scope but low priority
- Dean grade-level scoping: confirmed ALL students, no grade filter

## Completed
| Date | Item |
|---|---|
| 2026-04-27 | GitHub + Vercel connected to Claude Code |
| 2026-04-27 | Coming Soon page designed and deployed |
| 2026-04-27 | Tracking docs created |
| 2026-04-28 | SAAS brand applied, logo + favicon added |
| 2026-04-28 | Design system locked |
| 2026-04-28 | Architecture decisions locked |
| 2026-04-28 | Missing Students full spec locked |
