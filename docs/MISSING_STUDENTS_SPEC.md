# Missing Students Tracker — Product Spec

**Status: LOCKED — 2026-04-28**
**Replaces:** 20-person email chain to missingstudents@seattleacademy.org

---

## Purpose

Replace the manual, email-based missing students process with a fast,
context-aware safety system that:
- Automates the 6-step coordinator workflow
- Surfaces student patterns across blocks and over time
- Routes urgency automatically without requiring staff judgment calls
- Centralizes the "students of concern" list that currently isn't used
- Adds a welfare concern channel for lunch and community time

---

## Actors

| Role | Primary surface | Key responsibilities |
|---|---|---|
| Teacher | Block roster / welfare form | Report missing from roster; welfare concern during lunch/community |
| Faculty/Staff | Student search | Report welfare concerns; view and claim active missing students |
| Coordinator | Block triage + active missing | Run 6-step workflow, triage, escalate, resolve |
| Counselor | Caseload + all-student view | Claim, flag management, private notes, view all active missing |
| Dean | Pattern dashboard + active missing | Full workflow, triage, patterns, all students (grade default) |
| Admin | Full system | All of the above + user/schedule management |
| Super Admin | Full system + configuration | All of the above + templates + audit log |

---

## Period Modes

App behavior changes automatically based on current time. No manual switching.

```
8:15 –  9:30   BLOCK      Missing from class flow (routine default)
9:40 – 10:55   BLOCK      Missing from class flow (routine default)
10:55 – 11:40  LUNCH      Welfare concern flow (elevated default)
11:40 – 12:55  BLOCK      Missing from class flow (routine default)
12:55 –  1:45  COMMUNITY  Welfare concern flow (elevated default)
1:45 –  3:00   BLOCK      Missing from class flow (routine default)
```

---

## Active Missing Students — Visibility Tiers

| Tier | Who | Sees | Level shown |
|---|---|---|---|
| 1 | Teacher | Own block students + own reports only | No — shows "Missing" only |
| 2 | Staff | All active missing students | No — shows "Missing" only |
| 3 | Coordinator+ | All active missing students | Yes — Routine / Elevated / Emergency |

### Teacher/Staff Detail View
When Teacher or Staff taps View → on a missing student they see:
- Student name, block, time reported
- Shared updates only
- With Me / Found actions
No severity level, no escalation status, no private notes visible.

---

## Reporting — All Roles

**Any logged-in user can report a missing student at any time.**

### Teacher — Block Period (Roster Flow)
App auto-detects current block and shows teacher's roster.

```
Block 3 — 11:40am
AP Biology — Room 204

Who is missing?

○  Doe, Jane
○  Kim, Alex
○  Lee, Marcus
○  Smith, John

[ Report Missing (0) ]
```

Tap to select, tap again to deselect. One submit reports all selected students.
Teachers do NOT see present/absent — they take attendance in Veracross.

### Report Type (per student)
```
Smith, John

○  Absent from start of class
●  Left and didn't return
```

### Context — Absent from Start
```
Note (optional): [_________________________________]
[ Submit ]
```

### Context — Left and Didn't Return
```
Where/why did they go?
[ 🚽 Bathroom ]  [ 🏥 Nurse ]  [ 🧑 Counselor ]
[ 🏢 Office   ]  [ 😤 Upset / stormed out ]  [ ❓ Unknown ]

How long ago?
[ Just now ]  [ ~5 min ]  [ ~10 min ]  [ ~15 min+ ]

Note (optional): [_________________________________]
[ Report Missing ]
```

### Everyone — Lunch & Community Time (Welfare Concern Form)
Teachers also see this form during lunch and community time.

```
Lunch — 11:08am
⚠ Report Student Concern

Search student: [________________]

Context:
[ 😤 Emotional / distressed ]  [ 🤕 Physical concern ]
[ 🚶 Left campus ]  [ ❓ General concern ]

Note (optional): [_________________________________]
[ Report Elevated Concern ]
```

All lunch/community reports start at Elevated automatically.

### Non-Roster Report (all roles, any time)
Any user can search for a student and report them missing outside of
the roster flow — e.g. reporting for a teacher, or reporting based on
something they heard.

```
Search student: [________________]
Report Type: Absent from start / Left and didn't return / Welfare concern
Context + note
[ Report Missing ]
```

---

## Auto-Escalation Logic

### By Period
| Period | Default level |
|---|---|
| Block | Routine |
| Lunch | Elevated |
| Community Time | Elevated |

### By Context Tag
| Tag | Level | Notes |
|---|---|---|
| Bathroom | Routine | |
| Nurse | Routine | |
| Counselor | Routine + verification | Auto-ping counseling; escalate if no confirm in 10 min |
| Office | Routine | |
| Upset / stormed out | Elevated | Skips routine entirely |
| Unknown | Routine | |
| Emotional / distressed | Elevated | |
| Physical concern | Elevated | |
| Left campus | Elevated | |
| General concern | Routine | |

---

## Active Missing Students List

All roles who can see the list get three quick actions per row:

```
🔴 Smith, John   12m   Left Rm 204 upset   [ With Me ]  [ Found ]  [ View → ]
🟡 Lee, Marcus    4m   Absent — Block 3    [ With Me ]  [ Found ]  [ View → ]
```

(Teachers and staff see same layout but without 🔴🟡 indicators — just "Missing")

### With Me — Bottom Sheet
```
Smith, John is with you?

Status:
○ Excused (counseling, office, nurse, etc.)
○ Unexcused

Note (optional): [________________________]
● Private   ○ Shared

[ Confirm — With Me ]  [ Cancel ]
```

### Found — Bottom Sheet
```
Found: Smith, John

Where?
[ US ]  [ AC ]  [ Stream ]  [ VB ]  [ MS ]  [ Gym ]
[ Other: _________________ ]

Status:
○ Excused
  · With counselor  · Dean's office  · Nurse
  · In class — late  · Appointment  · Other: ______
○ Unexcused
  · Wandering / hallway  · Skipping  · Other: ______

Note (optional): [_________________________________]
[ Confirm Found ]  [ Cancel ]
```

Both With Me and Found:
- Move incident to Located → Resolved
- Auto-close all remaining open steps as "N/A — student found before this step"
- Log step number at which student was found
- Log location + excused/unexcused status

---

## Coordinator / Dean View

### Imperfect Attendance Triage
Pulled from Veracross/Axiom at 5–10 min mark.
Coordinator or Dean cleans false positives before opening incidents.

```
Block 3 — Will — 11:47am    IMPERFECT ATTENDANCE

Active:
⚠ Smith, John   [ Sports dismissal ] [ Parent update ] [ Other: ___ ] [ Confirm Missing ]
⚠ Lee, Marcus   [ Sports dismissal ] [ Parent update ] [ Other: ___ ] [ Confirm Missing ]

──── Dismissed (tap to restore) ────
✓ Kim, Alex   Sports dismissal — dismissed by Will 11:43am   [ Restore ]

[ Pull Final Report — 20 min ]
```

Dismissed entries are logged (who, why, when) and undoable.
Confirmed missing entries open an incident and enter the 6-step workflow.

### Missing Student Detail + 6-Step Workflow

```
Smith, John — Block 3
🔴 FLAGGED: "Elevated concern — check immediately"
────────────────────────────────────────────────────
Opened 11:39am — Ms. Jones — AP Biology — Room 204
Left class upset

⚡ FIND HISTORY: Usually found via physical search — Stream (3 of 5 times)

STEPS
✓  1  Missing students email         11:40am   [auto-sent]
✓  2  Text sent to student           11:41am   [auto-sent]
⏱  3  Waiting for response           6 min remaining     [ Skip ]
○  4  Physical search
       □ US    □ AC    □ Stream
       □ VB    □ MS    □ Gym
       □ Other: [________]
                                      [ Mark Addressed ▼ ]
○  5  Intercom page                   [ Log ]  [ Mark Addressed ▼ ]
○  6  Parent / teacher / dean email   [ Send Email ]  [ Mark Addressed ▼ ]

Mark Addressed options per step:
  Step 1: Emailed separately · N/A
  Step 2: Texted from personal phone · Student already responded · N/A
  Step 3: Student already located
  Step 4: (building checkboxes)
  Step 5: Announced manually · N/A — student found
  Step 6: Called parent instead · Emailed separately · N/A — student found

UPDATES (shared)
  11:44am [Will] — "Checked main hallway, not found"

Add update:
  [_________________________________]
  ● Shared   ○ Private
  [ Save ]

─────────────────────────────────────────
[ Student Checked In ]   [ Escalate → Elevated / Emergency ]
```

### Step Found Tracking
Every incident records:
- Which step the student was found at
- How they were found (With Me / Found / self check-in / step workflow)
- Location
- Excused or unexcused

This builds the per-student find history shown as ⚡ tips on future incidents.

### Auto-Close on Found
When student is marked Found or With Me from anywhere:
- All remaining open steps instantly close as "N/A — student found before this step"
- Step found at is recorded
- No coordinator action required

---

## Communication Templates

All templates managed by Super Admin only.
Variables available: {student_name} {block} {time} {room} {teacher}
{coordinator} {date} {grade}

### Step 1 — Missing Students Email
```
To: missingstudents@seattleacademy.org
Subject: Missing Student Report — Block {block} — {date}

The following student(s) have imperfect attendance for Block {block}:
- {student_name}, Grade {grade}, {course}, Room {room}

Please reply if you have seen this student or know their location.

{coordinator}, Block {block} Missing Students
```

### Step 2 — Student Text
```
Hello {student_first_name}, this is {coordinator} from SAAS Missing
Students. You are reported missing from class. Please check in at a
Front Office or reply to this message if you are no longer on campus.
Thank you.
```

### Step 6 — Parent / Teacher / Dean Email
```
Subject: Missing Student Report — Block {block} — {date}

Dear {student_first_name},

You were reported absent from Block {block} today at {time}. I have
paged you on the intercom and sent a text to your phone with no
response. Per our missing students protocol, I am sending this email
to you and your parents/guardians.

Your safety and well-being are our top concern. If you are unsafe or
unwell, please let us know immediately.

If this was an oversight and you did not sign out before leaving
campus, please have your parents/guardians update your attendance
in Veracross.

If this was an unexcused absence, your grade level dean (cc'd) will
follow up with you about consequences.

{coordinator}, Block {block} Missing Students

cc: {teacher}, {grade_coordinator}, {grade_dean}, {parent_emails}
```

Note: Student names never appear in email subject lines.

---

## Counselor View

Counselors see ALL students — not just their caseload.
Caseload is a default filter only, not a permission boundary.

```
MY CASELOAD ▼ / All Students          [ Search all students... ]

Smith, John    6 incidents   🔴 Elevated   [ View ]
Doe, Jane      4 incidents   🟡 Watch      [ View ]
Lee, Marcus    3 incidents   ○  None       [ View ]

ACTIVE MISSING STUDENTS (Elevated + Emergency)
  🔴 Smith, John — Block 3 — open 14 min   [ With Me ]  [ Found ]  [ View → ]
```

### Concern Flag (any student)
```
Public note (all staff):
"Elevated concern — check immediately, contact counselor"

Private note (author + admin only):
[________________________________________________]

Flag level:
○ Watch     ● Elevated     ○ Emergency

[ Save ]   [ Remove Flag ]
```

---

## Dean View

Pattern dashboard defaults to dean's assigned grade.
Can switch to any grade or all students.

```
STUDENT PATTERNS     [ Grade 11 ▼ ]   [ This Week ▼ ]

⚠ AUTO-SURFACED
  Smith, John   6 incidents   Same-day multi-block 2× this week

ALL PATTERNS
  1. Smith, John    6   🔴 ↑   [ View ]
  2. Doe, Jane      4   🟡 →   [ View ]
  3. Lee, Marcus    3   ○  ↓   [ View ]

ACTIVE MISSING STUDENTS (Elevated + Emergency)
  🔴 Smith, John — Block 3 — 12 min   [ With Me ]  [ Found ]  [ View → ]
```

Deans can also run full 6-step workflow and imperfect attendance triage.

---

## Pattern List

| Setting | Value | Configurable |
|---|---|---|
| Minimum incidents to surface | 2 | Admin |
| Lookback window | 14 days rolling | Admin |
| Decay / fall-off | Auto when count drops below threshold | — |
| Reset | Never — safety data is continuous | — |

### Auto-Surface Triggers
| Trigger | Threshold |
|---|---|
| Same block missed repeatedly | 3× same block within 2 weeks |
| Multi-block same day | 2+ blocks on same day |
| Weekly threshold | 4+ incidents in rolling 5-day window |
| No text response | 0 responses in last 4 incidents |
| Unresolved incident | Any incident open 24h+ |

---

## Student Detail View (Coordinator+)

```
Smith, John — Grade 11
────────────────────────────────────────────
🔴 ELEVATED CONCERN
   Public: "Check immediately — contact counselor"
   Flagged by: Dean Martinez — Nov 12

PATTERNS
  Most missed block:      Block 1 (4×)
  Avg step found at:      Step 4
  Usually found:          Stream building (3 of 5 times)
  Avg resolution time:    18 min
  Responds to text:       2 of 6 times (33%)
  Excused / unexcused:    2 excused / 4 unexcused
  Same-day multi-block:   2 days this week  ⚠

MISSING STUDENT HISTORY
  Thu Nov 14  Block 3  Left — upset    Found: Stream (unexcused)  Step 4
  Thu Nov 14  Block 1  Absent start    Found: Via text (excused)   Step 2
  Wed Nov 13  Block 7  Absent start    Unresolved
  ...

[ Flag / Update Concern ]   [ View Full History ]   [ Export ]
```

---

## Privacy Model

### Active Missing Student Severity
- Routine level visible to: Coordinator, Admin, Super Admin
- Elevated/Emergency visible to: Coordinator, Counselor, Dean, Admin, Super Admin
- Teachers: see own block + own reports — "Missing" label only
- Staff: see all — "Missing" label only, no severity

### Notes
- Shared updates: visible to Coordinator, Counselor, Dean, Admin, Super Admin
- Private notes: visible to author + Admin/Super Admin only
- Concern flag public note: visible to all staff
- Concern flag private note: visible to author + Admin/Super Admin only

### Student Detail
- Teachers/Staff tapping View →: name, block, time, shared updates only
- No severity level, no escalation status, no private notes for Teacher/Staff

---

## Permissions

| Capability | Teacher | Staff | Coord. | Counselor | Dean | Admin | Super Admin |
|---|---|---|---|---|---|---|---|
| Report missing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Welfare concern form | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View active missing — own block/reports, no level | ✓ | — | — | — | — | — | — |
| View active missing — all, no level | — | ✓ | — | — | — | — | — |
| View active missing — all, with level | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Claim With Me / Found | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add shared update | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add private update | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own private notes | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all private notes | — | — | — | — | — | ✓ | ✓ |
| Run 6-step workflow | — | — | ✓ | — | ✓ | ✓ | ✓ |
| Escalate | — | — | ✓ | — | ✓ | ✓ | ✓ |
| Resolve | — | — | ✓ | — | ✓ | ✓ | ✓ |
| Imperfect attendance triage | — | — | ✓ | — | ✓ | ✓ | ✓ |
| View/set concern flags | — | — | — | ✓ | ✓ | ✓ | ✓ |
| Pattern dashboard | — | — | — | ✓ | ✓ | ✓ | ✓ |
| User/student/schedule mgmt | — | — | — | — | — | ✓ | ✓ |
| Edit templates | — | — | — | — | — | — | ✓ |
| System settings + audit log | — | — | — | — | — | — | ✓ |

*Teachers see Welfare Concern Form during lunch/community time only

---

## Data Models

### Incident
```
id, student_id, reported_by, reported_at
initiated_by:       teacher | coordinator_pull | welfare_concern
period_type:        block | lunch | community
report_type:        absent_from_start | left_and_missing | welfare_concern
level:              routine | elevated | emergency
block_id, course_id, room
context_tag:        bathroom | nurse | counselor | office | upset |
                    unknown | emotional | physical | left_campus | general
departed_at, stated_destination
counselor_pinged_at, counselor_confirmed_at
step_1_sent_at, step_2_sent_at, step_3_expires_at
step_4_logged_at, step_5_logged_at, step_6_sent_at
step_1_method, step_2_method, step_6_method   (auto | addressed | skipped)
status:             open | located | resolved
located_at, resolved_at
```

### IncidentResolution
```
incident_id
resolved_via:       with_me | found | self_checkin | step_workflow
found_at_step:      int 1–6 (null if outside workflow)
found_by:           uuid → User
found_location:     string
found_status:       excused | unexcused
excused_reason:     counselor | dean | nurse | in_class | appointment | other
unexcused_reason:   wandering | skipping | other
notes:              text
```

### IncidentUpdate
```
id, incident_id, author_id
note: text
is_private: boolean
created_at: timestamp
```

### IncidentSearchLog
```
id, incident_id
location:   string (from SEARCH_LOCATIONS)
checked_by: uuid → User
checked_at: timestamp
found:      boolean
```

### StudentConcernFlag
```
student_id
is_flagged: boolean
flag_level: watch | elevated | emergency
public_note: text
private_note: text
flagged_by, flagged_at, updated_by, updated_at
```

### PatternAlert
```
id, student_id
trigger_type: same_block_repeat | multi_block_day |
              weekly_threshold | no_text_response | unresolved
detected_at
acknowledged_by, acknowledged_at
```

### ImperfectAttendanceEntry
```
id, student_id, block_id, date
source:     veracross_api | manual_entry | csv_import
resolved:   boolean
resolution: false_positive_sports | false_positive_parent |
            false_positive_error | confirmed_missing
dismissed_by, dismissed_at
created_at
```

---

## Campus Search Locations (Priority Order)
```
1. Upper School (US)    — primary, most likely
2. Arts Center (AC)     — primary, most likely
3. Stream               — primary, most likely
4. Vanderbilt (VB)      — secondary, out of the way
5. Middle School (MS)   — unlikely but possible
6. Gym                  — unlikely but possible
7. Other (free text)
```

---

## Out of Scope — v1
- Veracross real-time API (CSV bridge used instead)
- Veracross write-back (manual in v1)
- Parent-facing portal
- Student-facing portal
- Historical analytics exports
- Activity Tracker (separate system)
