# Architecture, Security & Database Design

**Last updated: 2026-04-28**

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Deployed on Vercel |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS v3 | SAAS brand tokens configured |
| Auth | Clerk | Google Workspace SSO, MFA |
| Database | Supabase (Postgres) | RLS, storage, US-based, SOC2 |
| Hosting | Vercel | Auto-deploy from GitHub `main` |
| Source control | GitHub | `saasapp-rd/saas-app-rd` |
| Reporting layer | Axiom (view layer on Veracross) | Read-only; source of attendance data |

---

## Repository Structure

```
saas-app-rd/
├── app/                  # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx          # Coming Soon
│   ├── icon.png          # Cardinal favicon
│   └── globals.css
├── public/images/        # Logo assets
├── docs/                 # All spec & design documents
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Systems Being Built

### System 1 — Missing Students Tracker
Real-time safety system replacing the 20-person email chain.
Full spec: `docs/MISSING_STUDENTS_SPEC.md`

### System 2 — Activity Tracker
Attendance for after-school programs and Community Time activities.
Spec: TBD

---

## Veracross / Axiom Integration

Veracross is the school SIS. Axiom is a reporting/BI view layer on top of Veracross.
All student, schedule, and attendance data originates in Veracross.

### Phase 0 (No API — CSV Bridge)
Admin exports CSVs from Veracross/Axiom and imports into the app at the
start of each semester. App uses this data for all schedule and roster logic.

**Required CSVs:**
```
school_calendar.csv     date → day_type (1–4), accounts for holidays
course_schedule.csv     teacher_id, block_number, room, course_name
student_roster.csv      student_id, name, grade, block_number, teacher_id
```

### Phase 3 (API — when access granted)
Replace CSV import with Veracross REST API connector.
App logic unchanged — only the data provider layer swaps.

### Veracross Write-Back
- **v1:** Coordinators update Veracross/Axiom manually in parallel with app
- **Future:** API write-back to sync status changes (to be decided)

---

## Schedule Logic (Hardcoded)

```typescript
const DAY_SCHEDULE = {
  1: [1, 3, 5, 7],
  2: [2, 4, 6, 8],
  3: [7, 5, 3, 1],
  4: [8, 6, 4, 2],
}

const BLOCK_TIMES = [
  { position: 1, start: '08:15', end: '09:30' },
  { position: 2, start: '09:40', end: '10:55' },
  { position: 3, start: '11:40', end: '12:55' },
  { position: 4, start: '13:45', end: '15:00' },
]

const PERIOD_TYPES = [
  { type: 'block',     start: '08:15', end: '09:30' },
  { type: 'block',     start: '09:40', end: '10:55' },
  { type: 'lunch',     start: '10:55', end: '11:40' },
  { type: 'block',     start: '11:40', end: '12:55' },
  { type: 'community', start: '12:55', end: '13:45' },
  { type: 'block',     start: '13:45', end: '15:00' },
]
```

---

## Campus Buildings (Search Order for Missing Students)

```typescript
const SEARCH_LOCATIONS = [
  'Upper School (US)',      // primary — most likely
  'Arts Center (AC)',       // primary — most likely
  'Stream',                 // primary — most likely
  'Vanderbilt (VB)',        // secondary — out of the way
  'Middle School (MS)',     // unlikely but possible
  'Gym',                    // unlikely but possible
  'Other',
]
```

---

## Data Models

### CoordinatorAssignment
```
block_number      int
coordinator_id    uuid → User
academic_year     string
```

### Incident
```
id                uuid
student_id        uuid → Student
reported_by       uuid → User
reported_at       timestamp
initiated_by      enum: teacher | coordinator_pull | welfare_concern
period_type       enum: block | lunch | community
report_type       enum: absent_from_start | left_and_missing | welfare_concern
level             enum: routine | elevated | emergency
block_id          int? (null during lunch/community)
course_id         uuid?
room              string?
context_tag       enum: bathroom | nurse | counselor | office | upset |
                        unknown | emotional | physical | left_campus | general
departed_at       timestamp?
stated_destination string?
counselor_pinged_at     timestamp?
counselor_confirmed_at  timestamp?
step_1_sent_at    timestamp?
step_2_sent_at    timestamp?
step_3_expires_at timestamp?
step_4_logged_at  timestamp?
step_5_logged_at  timestamp?
step_6_sent_at    timestamp?
status            enum: open | located | resolved
located_at        timestamp?
resolved_at       timestamp?
```

### IncidentUpdate
```
id            uuid
incident_id   uuid → Incident
author_id     uuid → User
note          text
is_private    boolean
created_at    timestamp
```

### IncidentSearchLog (Step 4)
```
id            uuid
incident_id   uuid → Incident
location      string (from SEARCH_LOCATIONS)
checked_by    uuid → User
checked_at    timestamp
found         boolean
```

### StudentConcernFlag
```
student_id        uuid → Student
is_flagged        boolean
flag_level        enum: watch | elevated | emergency
public_note       text   (visible to all staff)
private_note      text   (counselors + deans + admin only)
flagged_by        uuid → User
flagged_at        timestamp
updated_by        uuid → User
updated_at        timestamp
```

### PatternAlert
```
id              uuid
student_id      uuid → Student
trigger_type    enum: same_block_repeat | multi_block_day |
                      weekly_threshold | no_text_response | unresolved
detected_at     timestamp
acknowledged_by uuid? → User
acknowledged_at timestamp?
```

### ImperfectAttendanceEntry
```
id          uuid
student_id  uuid → Student
block_id    int
date        date
source      enum: veracross_api | manual_entry | csv_import
resolved    boolean
resolution  enum: false_positive_sports | false_positive_parent |
                  false_positive_error | confirmed_missing
created_at  timestamp
```

---

## Roles & Permissions

| Action | Teacher | Staff | Coordinator | Counselor | Dean | Admin |
|---|---|---|---|---|---|---|
| Report missing (roster) | ✓ | — | — | — | — | — |
| Report welfare concern | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| View block incident feed | — | — | ✓ | — | — | ✓ |
| Triage imperfect attendance | — | — | ✓ | — | — | ✓ |
| Run 6-step workflow | — | — | ✓ | — | — | ✓ |
| Claim "student is with me" | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add shared update | — | — | ✓ | ✓ | ✓ | ✓ |
| Add private update | — | — | — | ✓ | ✓ | ✓ |
| Escalate incident | — | — | ✓ | — | ✓ | ✓ |
| Resolve incident | — | — | ✓ | — | ✓ | ✓ |
| View public concern flag | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View private concern note | — | — | — | ✓ | ✓ | ✓ |
| Set / update / remove flag | — | — | — | ✓ | ✓ | ✓ |
| View all-student patterns | — | — | — | ✓ | ✓ | ✓ |
| System configuration | — | — | — | — | — | ✓ |

---

## Notification Routing

| Level | Notified |
|---|---|
| Routine | Assigned coordinator for that block |
| Elevated | Coordinator + Division Leadership |
| Emergency | Coordinator + Division Leadership + Counseling |
| Counselor destination | Auto-ping counseling office; escalate if no confirm in 10 min |

---

## Security Posture

- [ ] Environment variables: Vercel dashboard only, never committed
- [ ] Clerk + Google Workspace SSO — no passwords stored
- [ ] Supabase Row Level Security on all tables
- [ ] HTTPS enforced by Vercel
- [ ] No student PII in URL parameters
- [ ] No student names in email subject lines
- [ ] Private notes isolated at DB level (RLS policy)
- [ ] Audit log: every data change logged with user + timestamp
- [ ] Rate limiting: Vercel Edge middleware on API routes
- [ ] Input validation: Zod schemas on all inputs
- [ ] npm audit via GitHub Actions on every PR
- [ ] FERPA: US-based servers (Supabase), no PII in external services
- [ ] Veracross write-back: manual in v1, API in future (decision pending)

---

## Data Management

### Import (Bulk / Semester Setup)
CSV upload via admin UI at start of each semester:
```
school_calendar.csv     date → day_type
course_schedule.csv     teacher_id, block_number, room, course_name
student_roster.csv      student_id, name, grade, block_number, teacher_id
```

### Manual CRUD (In-App Admin UI)
Required for mid-year changes — schedule adjustments happen throughout the year.

**Users**
- Add / edit / delete staff accounts
- Assign or change role (Teacher, Coordinator, Counselor, Dean, Admin)
- Assign coordinator to block(s)

**Students**
- Add / edit / delete individual students
- Move student between classes (block + teacher reassignment)
- Update grade level

**Classes & Blocks**
- Add / edit / delete courses
- Reassign teacher to a course/block
- Update room number

**Coordinator Assignments**
- Reassign which coordinator covers which block
- Update per academic year

All manual changes are logged with user + timestamp for audit trail.

---

## Pattern Auto-Surface Triggers

| Trigger | Threshold |
|---|---|
| Same block missed repeatedly | 3× same block within 2 weeks |
| Multi-block same day | 2+ blocks on same day |
| Weekly threshold | 4+ incidents in rolling 5-day window |
| No text response | 0 responses in last 4 incidents |
| Unresolved incident | Any incident open 24h+ |
