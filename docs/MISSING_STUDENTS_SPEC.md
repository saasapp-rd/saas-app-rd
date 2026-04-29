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
| Teacher | Block roster view | Report missing students from current class |
| Faculty/Staff | Student search | Report welfare concerns (lunch/community time) |
| Coordinator | Block incident feed + triage | Run 6-step workflow, claim, escalate, resolve |
| Counselor | Caseload dashboard | Claim students, manage concern flags, private notes |
| Dean | All-school pattern dashboard | Patterns, flags, escalations — all students |
| Admin | Full system | All of the above + configuration |

---

## Period Modes

App behavior changes automatically based on current time.
No manual switching required.

```
8:15 –  9:30   BLOCK      Missing from class flow (routine default)
9:40 – 10:55   BLOCK      Missing from class flow (routine default)
10:55 – 11:40  LUNCH      Welfare concern flow (elevated default)
11:40 – 12:55  BLOCK      Missing from class flow (routine default)
12:55 –  1:45  COMMUNITY  Welfare concern flow (elevated default)
1:45 –  3:00   BLOCK      Missing from class flow (routine default)
```

---

## Teacher View — Block Period

### Roster Screen
App auto-detects current block and shows teacher's roster for that block only.

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

- Tap to select, tap again to deselect
- Button count updates live
- Teachers do NOT see present/absent status — they take attendance in Veracross
- One submission reports all selected students

### Report Type (per student)
```
Smith, John

○  Absent from start of class
●  Left and didn't return
```

### Context — Absent from Start
```
Smith, John — Absent from start

Note (optional): [_________________________________]

[ Submit ]
```

### Context — Left and Didn't Return
```
Smith, John — Left and didn't return

Where/why did they go?
[ 🚽 Bathroom ]  [ 🏥 Nurse ]  [ 🧑 Counselor ]
[ 🏢 Office   ]  [ 😤 Upset / stormed out ]  [ ❓ Unknown ]

How long ago?
[ Just now ]  [ ~5 min ]  [ ~10 min ]  [ ~15 min+ ]

Note (optional): [_________________________________]

[ Report Missing ]
```

---

## Faculty/Staff View — Lunch & Community Time

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

- No roster — student search only
- All reports start at Elevated
- Button label reflects elevated status

---

## Auto-Escalation Logic

### By Period
| Period | Default level |
|---|---|
| Block | Routine |
| Lunch | Elevated |
| Community Time | Elevated |

### By Context Tag (overrides period default)
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

## Coordinator View

### Step 1 — Imperfect Attendance Triage
Pulled from Veracross/Axiom at 5–10 min mark. Coordinator cleans
false positives before opening incidents.

```
Block 3 — Will — 11:47am

IMPERFECT ATTENDANCE

⚠ Smith, John     [ Sports dismissal ] [ Parent update ] [ Confirm missing ]
⚠ Lee, Marcus     [ Sports dismissal ] [ Parent update ] [ Confirm missing ]
⚠ Doe, Jane       [ Sports dismissal ] [ Parent update ] [ Confirm missing ]

[ Pull Final Report — 20 min ]
```

One tap to dismiss a false positive. One tap to open a real incident.

### Step 2 — Incident Feed
```
OPEN INCIDENTS                                    11:52am

🔴 ELEVATED  Smith, John       12 min   Left Rm 204 upset
🟡 ROUTINE   Lee, Marcus        4 min   Absent from start — Block 3
🟡 ROUTINE   Doe, Jane          4 min   Left Rm 204 ~5 min → Bathroom
```

Sorted by: level first, then time (oldest at top within level).

### Step 3 — Incident Detail + 6-Step Workflow
```
Smith, John — Block 3 — Absent Unexcused
🔴 FLAGGED: "Elevated concern — check immediately"
────────────────────────────────────────────────
Opened 11:39am — reported by Ms. Jones
AP Biology — Room 204 — Left upset

STEPS                                        TIME
✓  1  Missing students email sent            11:40am  [auto]
✓  2  Text sent to student                   11:41am  [auto]
⏱  3  Waiting for response                   6 min remaining
○  4  Physical search
○  5  Intercom page
○  6  Parent / teacher / dean email

PHYSICAL SEARCH
□  Upper School (US)
□  Arts Center (AC)
□  Stream
□  Vanderbilt (VB)
□  Middle School (MS)
□  Gym
□  Other: [________]

Updates:
  11:44am [Will] — "Checked main hallway, not found"

Add update: [_________________________________]
  ● Shared   ○ Private
  [ Save ]

─────────────────────────────────────────
[ Student Checked In ]   [ Escalate to Emergency ]
```

Steps 1, 2, and 6 are auto-executed using pre-built templates.
Steps 3–5 are logged by coordinator with one tap.

---

## Communication Templates

### Step 1 — Missing Students Email
```
To: missingstudents@seattleacademy.org
Subject: Missing Student Report — Block [X] — [Date]

The following student(s) have imperfect attendance for Block [X]:

- [Student Name], [Grade], [Course], Room [X]

Please reply if you have seen this student or know their location.

[Coordinator Name], Block [X] Missing Students
```

### Step 2 — Student Text
```
Hello [First Name], this is [Coordinator] from SAAS Missing Students.
You are reported missing from class. Please check in at a Front Office
or reply to this message if you are no longer on campus. Thank you.
```

### Step 6 — Parent / Teacher / Dean Email
```
Subject: Missing Student Report — Block [X] — [Date]

Dear [Student First Name],

You were reported absent from Block [X] today at [time]. I have paged
you on the intercom and sent a text to your phone with no response.
Per our missing students protocol, I'm sending this email to you and
your parents/guardians.

Your safety and well-being are our top concern. If you are unsafe or
unwell, please let us know immediately.

If this was an oversight and you did not sign out before leaving campus,
please have your parents/guardians update your attendance in Veracross.

If this was an unexcused absence, your grade level dean (cc'd) will
follow up with you about consequences.

[Coordinator Name], Block [X] Missing Students

cc: [Teacher], [Grade Level Coordinator], [Grade Level Dean], [Parents]
```

---

## Counselor View

Counselors can see ALL students — not just their caseload.
They may be working temporarily with students not on their official caseload
and need to be able to flag or claim anyone.

### Dashboard
```
MY CASELOAD — PATTERNS             This Week ▼  [ All Students ▼ ]

Smith, John    6 incidents  🔴 Elevated flag   [ View ]
Doe, Jane      4 incidents  🟡 Watch flag       [ View ]
Lee, Marcus    3 incidents  ○  No flag          [ View ]

[ Search all students... ]

ACTIVE INCIDENTS (all)
  Smith, John — Block 3 — open 14 min           [ View ]
```

Toggle between "My Caseload" (default filter) and "All Students."
Flag and claim available on any student regardless of caseload.

### Flag Management (any student)
```
Smith, John — Concern Flag

Public note (visible to all staff):
"Elevated concern — check immediately, contact counselor"

Private note (counselors + deans + admin only):
[________________________________________________]

Flag level:
○ Watch     — surface in patterns, no urgency change
● Elevated  — coordinators notified on any absence
○ Emergency — skip routine, immediate response

[ Save ]   [ Remove Flag ]
```

### Claiming a Student (any student)
```
[ Student is with me — Counseling ]

Add note:
  ● Private (counselors + deans only)
  ○ Shared with coordinators
[________________________________________________]

[ Claim ]
```

---

## Dean / Admin View — Pattern Dashboard

```
STUDENT PATTERNS                        This Week ▼

Rank  Student          Grade  Incidents  Blocks missed    Trend
────  ───────────────  ─────  ─────────  ───────────────  ──────
1     Smith, John      11     6          1, 3, 3, 5, 7    ↑ worse
2     Doe, Jane        10     4          2, 2, 6, 8       → same
3     Lee, Marcus      9      3          1, 3, 5          ↓ better

[ This Week ]  [ This Month ]  [ This Semester ]
```

Deans see all students, all grades. No grade-level filtering.

### Student Detail
```
Smith, John — Grade 11
────────────────────────────────────────────
🔴 ELEVATED CONCERN
   Public: "Check immediately, contact counselor"
   Flagged by Dean Martinez — Nov 12

PATTERNS
  Most missed block:     Block 1 (4×)
  Avg resolution time:   18 min
  Responds to text:      2 of 6 times (33%)
  Same-day multi-block:  2 days this week  ⚠

INCIDENT HISTORY
  Thu Nov 14  Block 3  Left — upset        Resolved 12:08pm
  Thu Nov 14  Block 1  Absent from start   Resolved 9:52am
  Wed Nov 13  Block 7  Absent from start   Resolved 2:14pm
  Tue Nov 12  Block 5  Absent from start   Unresolved
  Tue Nov 12  Block 3  Absent from start   Resolved 12:22pm
  Mon Nov 11  Block 1  Absent from start   Resolved 9:41am

[ Flag / Update Concern ]   [ View Full History ]   [ Export ]
```

---

## Auto-Surface Triggers (Pattern Alerts)

| Trigger | Threshold |
|---|---|
| Same block missed repeatedly | 3× same block within 2 weeks |
| Multi-block same day | 2+ blocks missed on same day |
| Weekly threshold | 4+ incidents in rolling 5-day window |
| No text response | 0 responses in last 4 incidents |
| Unresolved incident | Any incident open 24h+ |

Auto-surfaced students appear at top of pattern dashboard with trigger reason.

---

## Out of Scope — v1

- Veracross real-time API (CSV bridge used instead)
- Veracross write-back (coordinator updates Veracross manually)
- Parent-facing portal
- Student-facing portal
- Historical analytics exports
- Activity Tracker / Community Time attendance (separate system)
- Middle School students (Upper School only)
