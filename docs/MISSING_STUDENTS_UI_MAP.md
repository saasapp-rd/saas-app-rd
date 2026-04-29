# Missing Students Tracker — UI Map

**Status: LOCKED — 2026-04-28**
**Companion to:** `docs/MISSING_STUDENTS_SPEC.md`

---

## Core Design Principle

> "Everyone in the building can help find a missing student.
> Privacy tiers determine who needs to know the severity —
> not who can act."

---

## Visibility Tiers

| Role | Sees | Level shown |
|---|---|---|
| Teacher | Own block + own reports only | "Missing" — no severity |
| Staff | All active missing students | "Missing" — no severity |
| Coordinator+ | All active missing students | Full — 🔴 Elevated / 🟡 Routine |

**Teacher/Staff View →** shows: name, block, time, shared updates only.
No severity level, no escalation status, no private notes.

---

## Login & Routing

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  LOGIN — Google SSO (Clerk)                                                      ║
║  → Role detected → Period detected → Route to correct starting view              ║
╚══════════════════════╤═══════════════════════════════════════════════════════════╝
                       │
         ┌─────────────┴──────────────────────────────────────────────┐
         │                                                             │
         ▼                                                             ▼
  BLOCK PERIOD                                               LUNCH / COMMUNITY TIME
  ──────────────                                             ──────────────────────
  Teacher → Roster View                                      ALL ROLES →
  All others → Report Missing (search)                       Welfare Concern Form
```

---

## Teacher — Block Period

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  TEACHER — BLOCK PERIOD                                                          ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌─────────────────────────────────────┐                                         ║
║  │ ROSTER VIEW                          │                                         ║
║  │ Block 3 — 11:40am                   │                                         ║
║  │ AP Biology — Room 204               │                                         ║
║  │                                     │                                         ║
║  │ Who is missing?                     │                                         ║
║  │ ○ Doe, Jane                         │                                         ║
║  │ ○ Kim, Alex                         │                                         ║
║  │ ○ Lee, Marcus         Tap to select │                                         ║
║  │ ○ Smith, John                       │                                         ║
║  │                                     │                                         ║
║  │ [ Report Missing (0) ]              │                                         ║
║  └──────────────┬──────────────────────┘                                         ║
║                 │                                                                 ║
║                 ▼                                                                 ║
║  ┌─────────────────────────────────────┐                                         ║
║  │ REPORT TYPE (per student)           │                                         ║
║  │                                     │                                         ║
║  │ Smith, John                         │                                         ║
║  │ ○ Absent from start                 │                                         ║
║  │ ● Left and didn't return            │                                         ║
║  └──────────────┬──────────────────────┘                                         ║
║                 │                                                                 ║
║        ┌────────┴────────┐                                                        ║
║        ▼                 ▼                                                        ║
║  ┌───────────────┐ ┌─────────────────────────────────────┐                       ║
║  │ ABSENT START  │ │ LEFT & DIDN'T RETURN                │                       ║
║  │               │ │                                     │                       ║
║  │ Note          │ │ Destination:                        │                       ║
║  │ (optional)    │ │ [Bathroom][Nurse][Counselor]        │                       ║
║  │               │ │ [Office][😤 Upset][Unknown]         │                       ║
║  │ [ Submit ]    │ │                                     │                       ║
║  └───────────────┘ │ How long ago:                       │                       ║
║                    │ [Now][~5m][~10m][~15m+]             │                       ║
║                    │                                     │                       ║
║                    │ Note (optional)                     │                       ║
║                    │ [ Report Missing ]                  │                       ║
║                    └─────────────────────────────────────┘                       ║
║                                                                                  ║
║  TEACHER ALSO SEES (limited):                                                    ║
║  Active Missing — own block + own reports only — "Missing" label, no level      ║
║  [ With Me ]  [ Found ]  [ View → ] (basic detail only)                         ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## All Roles — Welfare Concern Form

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  ALL ROLES — WELFARE CONCERN FORM (Lunch / Community Time)                       ║
║  Also shown to Teachers during these periods                                     ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌─────────────────────────────────────────┐                                     ║
║  │ Lunch — 11:08am                         │                                     ║
║  │ ⚠ Report Student Concern               │                                     ║
║  │                                         │                                     ║
║  │ Search student: [________________]      │                                     ║
║  │                                         │                                     ║
║  │ Context:                                │                                     ║
║  │ [😤 Emotional]  [🤕 Physical]          │                                     ║
║  │ [🚶 Left campus] [❓ General]           │                                     ║
║  │                                         │                                     ║
║  │ Note (optional): [________________]     │                                     ║
║  │                                         │                                     ║
║  │ [ Report Elevated Concern ]             │                                     ║
║  └─────────────────────────────────────────┘                                     ║
║  All lunch/community reports → Elevated by default                               ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Staff View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  STAFF VIEW                                                                      ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ACTIVE MISSING STUDENTS (all — no severity level)                               ║
║                                                                                  ║
║  Smith, John    Block 3    Missing    [ With Me ]  [ Found ]  [ View → ]        ║
║  Lee, Marcus    Block 5    Missing    [ With Me ]  [ Found ]  [ View → ]        ║
║  Doe, Jane      Block 1    Missing    [ With Me ]  [ Found ]  [ View → ]        ║
║                                                                                  ║
║  View → shows: name, block, time, shared updates only                           ║
║                no severity, no escalation, no private notes                     ║
║                                                                                  ║
║  [ + Report Missing Student ]  ← search any student, any time                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Shared Quick Actions

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  SHARED QUICK ACTIONS (bottom sheet — all roles)                                 ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌─────────────────────────┐   ┌─────────────────────────────────────────────┐  ║
║  │ WITH ME                 │   │ FOUND                                        │  ║
║  │ ─────────────────────── │   │ ──────────────────────────────────────────── │  ║
║  │ Smith, John is with you?│   │ Found: Smith, John                          │  ║
║  │                         │   │                                             │  ║
║  │ Status:                 │   │ Where?                                      │  ║
║  │ ○ Excused               │   │ [US] [AC] [Stream] [VB] [MS] [Gym] [Other] │  ║
║  │ ○ Unexcused             │   │                                             │  ║
║  │                         │   │ Status:                                     │  ║
║  │ Note (optional):        │   │ ○ Excused                                   │  ║
║  │ [___________________]   │   │   · Counselor · Dean · Nurse                │  ║
║  │ ● Private  ○ Shared     │   │   · In class · Appointment · Other          │  ║
║  │                         │   │ ○ Unexcused                                 │  ║
║  │ [ Confirm — With Me ]   │   │   · Wandering · Skipping · Other            │  ║
║  │ [ Cancel ]              │   │                                             │  ║
║  └─────────────────────────┘   │ Note (optional): [___________________]      │  ║
║                                │ [ Confirm Found ]  [ Cancel ]               │  ║
║                                └─────────────────────────────────────────────┘  ║
║  Both actions:                                                                   ║
║  · Auto-close remaining steps as "N/A — student found before this step"         ║
║  · Log step number found at                                                      ║
║  · Log location + excused/unexcused status                                       ║
║  · Move incident to Located → Resolved                                           ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Coordinator View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  COORDINATOR VIEW                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌──────────────────────────────┐  ┌──────────────────────────────────────────┐ ║
║  │ IMPERFECT ATTENDANCE TRIAGE  │  │ ACTIVE MISSING STUDENTS                  │ ║
║  │ (5–10 min mark)              │  │                                          │ ║
║  │ ────────────────────────────-│  │ 🔴 Smith    12m  Left upset              │ ║
║  │ Active:                      │  │    [With Me] [Found] [View →]            │ ║
║  │ ⚠ Smith  [Sports][Parent]   │  │ 🟡 Lee       4m  Absent start            │ ║
║  │          [Other] [Confirm ✓]─┼─►│    [With Me] [Found] [View →]            │ ║
║  │ ⚠ Lee    [Sports][Parent]   │  │ 🟡 Doe       2m  Left → Bathroom         │ ║
║  │          [Other] [Confirm ✓] │  │    [With Me] [Found] [View →]            │ ║
║  │                              │  │                                          │ ║
║  │ Dismissed (tap to restore):  │  │ [ + Report Missing Student ]             │ ║
║  │ ✓ Kim — Sports — 11:43am    │  └──────────────┬───────────────────────────┘ ║
║  │   [Restore]                  │                 │ tap View →                  ║
║  │                              │                 ▼                             ║
║  │ [ Pull Final Report — 20m ]  │  ┌──────────────────────────────────────────┐ ║
║  └──────────────────────────────┘  │ MISSING STUDENT DETAIL                   │ ║
║                                    │ ──────────────────────────────────────── │ ║
║                                    │ Smith, John — Block 3                    │ ║
║                                    │ 🔴 FLAGGED: "Check immediately"          │ ║
║                                    │ Opened 11:39am — Ms. Jones               │ ║
║                                    │ AP Biology — Rm 204 — Left upset         │ ║
║                                    │                                          │ ║
║                                    │ ⚡ Usually found: Stream (3 of 5×)       │ ║
║                                    │                                          │ ║
║                                    │ 6-STEP WORKFLOW                          │ ║
║                                    │ ✓ 1. Email sent      11:40  [auto]       │ ║
║                                    │ ✓ 2. Text sent       11:41  [auto]       │ ║
║                                    │ ⏱ 3. Timer           6 min  [Skip]       │ ║
║                                    │ ○ 4. Physical search                     │ ║
║                                    │      □US □AC □Stream □VB □MS □Gym □Other │ ║
║                                    │      [Mark Addressed ▼]                  │ ║
║                                    │ ○ 5. Intercom  [Log] [Mark Addressed ▼]  │ ║
║                                    │ ○ 6. Parent email                        │ ║
║                                    │      [Send Email] [Mark Addressed ▼]     │ ║
║                                    │                                          │ ║
║                                    │ Mark Addressed options (per step):       │ ║
║                                    │   1: Emailed separately · N/A            │ ║
║                                    │   2: Texted personally · Already replied │ ║
║                                    │   3: Already located                     │ ║
║                                    │   5: Announced manually · N/A            │ ║
║                                    │   6: Called parent · Emailed · N/A       │ ║
║                                    │                                          │ ║
║                                    │ UPDATES                                  │ ║
║                                    │ 11:44 [Will] "Checked hallway"           │ ║
║                                    │ Add: [___________] ●Shared ○Private      │ ║
║                                    │                                          │ ║
║                                    │ [ Student Checked In ]                   │ ║
║                                    │ [ Escalate → Elevated / Emergency ]      │ ║
║                                    └──────────────────────────────────────────┘ ║
║                                                                                  ║
║  When Found/With Me tapped anywhere:                                             ║
║  All remaining steps auto-close as "N/A — student found before this step"       ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Counselor View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  COUNSELOR VIEW                                                                  ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  [ My Caseload ▼ / All Students ]    [ Search all students... ]                 ║
║                                                                                  ║
║  ┌─────────────────────────────────┐  ┌──────────────────────────────────────┐  ║
║  │ PATTERN LIST                    │  │ STUDENT DETAIL                        │  ║
║  │ ─────────────────────────────── │  │ ──────────────────────────────────── │  ║
║  │ Smith, John  6  🔴  [ View → ] ├─►│ Smith, John — Grade 11               │  ║
║  │ Doe, Jane    4  🟡  [ View → ] │  │ 🔴 ELEVATED CONCERN                  │  ║
║  │ Lee, Marcus  3  ○   [ View → ] │  │   Public: "Check immediately"        │  ║
║  └─────────────────────────────────┘  │   Private: [author + admin only]     │  ║
║                                       │                                      │  ║
║  ACTIVE MISSING STUDENTS              │ CONCERN FLAG PANEL                   │  ║
║  (Elevated + Emergency only)          │   Public note: [_______________]     │  ║
║  ──────────────────────────────       │   Private note: [_______________]    │  ║
║  🔴 Smith  Block 3  14m              │   ○ Watch  ● Elevated  ○ Emergency   │  ║
║     [With Me] [Found] [View →]        │   [ Save ]  [ Remove Flag ]          │  ║
║  🔴 Doe    Lunch   8m                │                                      │  ║
║     [With Me] [Found] [View →]        │ PATTERNS                             │  ║
║                                       │   Most missed: Block 1 (4×)          │  ║
║  [ + Report Missing Student ]         │   Avg step found: Step 4             │  ║
║                                       │   Usually found: Stream (3 of 5)     │  ║
║                                       │   Responds to text: 33%              │  ║
║                                       │   Excused / Unexcused: 2 / 4        │  ║
║                                       │                                      │  ║
║                                       │ MISSING STUDENT HISTORY              │  ║
║                                       │   Nov 14  Blk 3  Left upset          │  ║
║                                       │           Stream (unexcused) Step 4  │  ║
║                                       │   Nov 14  Blk 1  Absent start        │  ║
║                                       │           Text (excused) Step 2      │  ║
║                                       │   ...                                │  ║
║                                       │ [ Flag / Update ]  [ Export ]        │  ║
║                                       └──────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Dean View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  DEAN VIEW                                                                       ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  [ Grade 11 ▼ ]  [ This Week ▼ ]     Grade dropdown: 9/10/11/12/All Students   ║
║                                                                                  ║
║  ┌──────────────────────────────────────┐                                        ║
║  │ AUTO-SURFACED ⚠                      │                                        ║
║  │ Smith, John — Same-day multi-block   │                                        ║
║  │ Doe, Jane   — Same block 3× / 2 wks  │                                        ║
║  └──────────────────────────────────────┘                                        ║
║                                                                                  ║
║  ┌──────────────────────────────────────┐  ┌──────────────────────────────────┐ ║
║  │ PATTERN LIST                         │  │ ACTIVE MISSING STUDENTS          │ ║
║  │ ──────────────────────────────────── │  │ (Elevated + Emergency)           │ ║
║  │ 1. Smith  6  🔴 ↑  [ View → ]      ├─►│ 🔴 Smith  Blk3  12m              │ ║
║  │ 2. Doe    4  🟡 →  [ View → ]      │  │    [With Me] [Found] [View →]    │ ║
║  │ 3. Lee    3  ○  ↓  [ View → ]      │  │ 🔴 Doe    Lunch  8m              │ ║
║  └──────────────────────────────────────┘  │    [With Me] [Found] [View →]    │ ║
║                                            └──────────────────────────────────┘ ║
║                                                                                  ║
║  Dean can also access:                                                           ║
║  · Imperfect Attendance Triage                                                   ║
║  · Full 6-step workflow (same as coordinator detail view)                        ║
║  · Escalate / Resolve                                                            ║
║  · [ + Report Missing Student ]                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Admin View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  ADMIN VIEW                                                                      ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  All Coordinator + Counselor + Dean capabilities, plus:                          ║
║                                                                                  ║
║  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────────────────┐  ║
║  │ USER MANAGEMENT  │  │ STUDENT MANAGEMENT │  │ SCHEDULE MANAGEMENT        │  ║
║  │ ──────────────── │  │ ────────────────── │  │ ──────────────────────────-│  ║
║  │ · Add user       │  │ · Add student      │  │ · CSV import               │  ║
║  │ · Edit role      │  │ · Edit student     │  │   (calendar / courses /    │  ║
║  │ · Assign blocks  │  │ · Move classes     │  │    rosters)                │  ║
║  │   (coordinator)  │  │ · Delete student   │  │ · Edit block times         │  ║
║  │ · Deactivate     │  │                    │  │ · Coordinator assignments   │  ║
║  │                  │  │                    │  │ · School calendar           │  ║
║  │ All user types   │  │                    │  │   (Day 1/2/3/4 map)         │  ║
║  │ incl. teachers   │  │                    │  │                            │  ║
║  └──────────────────┘  └────────────────────┘  └────────────────────────────┘  ║
║                                                                                  ║
║  Views all private notes across all users                                        ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Super Admin View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  SUPER ADMIN VIEW                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  All Admin capabilities, plus:                                                   ║
║                                                                                  ║
║  ┌────────────────────────────────┐  ┌───────────────────────────────────────┐  ║
║  │ TEMPLATE EDITOR                │  │ SYSTEM SETTINGS + AUDIT LOG           │  ║
║  │ ────────────────────────────── │  │ ─────────────────────────────────────-│  ║
║  │ · Missing Students Email       │  │ · Pattern alert thresholds            │  ║
║  │ · Student Text Message         │  │   (min incidents, lookback window)    │  ║
║  │ · Parent/Teacher/Dean Email    │  │ · Counselor auto-ping timeout         │  ║
║  │                                │  │ · System-wide audit log               │  ║
║  │ Rich text editor               │  │   (all actions, all users)            │  ║
║  │ Variable tokens:               │  │                                       │  ║
║  │ {student_name} {block}         │  └───────────────────────────────────────┘  ║
║  │ {time} {room} {teacher}        │                                              ║
║  │ {coordinator} {date} {grade}   │                                              ║
║  └────────────────────────────────┘                                              ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Shared Design Principles

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  SHARED DESIGN PRINCIPLES                                                        ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  "Everyone can help find a missing student.                                      ║
║   Privacy tiers determine who needs to know the severity —                       ║
║   not who can act."                                                              ║
║                                                                                  ║
║  VISIBILITY TIERS                                                                ║
║  ─────────────────────────────────────────────────────────────────────────────  ║
║  Teacher    Own block + own reports only    "Missing" label    No level          ║
║  Staff      All active missing              "Missing" label    No level          ║
║  Coord+     All active missing              Full level         🔴🟡              ║
║                                                                                  ║
║  PRIVATE NOTES                                                                   ║
║  ─────────────────────────────────────────────────────────────────────────────  ║
║  Visible to: author who wrote them + Admin + Super Admin only                   ║
║                                                                                  ║
║  FOUND / RESOLVED                                                                ║
║  ─────────────────────────────────────────────────────────────────────────────  ║
║  Any Found or With Me action from anywhere →                                    ║
║  · Auto-closes all remaining steps as "N/A — student found before this step"   ║
║  · Logs: step found at + location + excused/unexcused                           ║
║  · Builds per-student ⚡ find history for future incidents                      ║
║                                                                                  ║
║  AUTO-ESCALATION                                                                 ║
║  ─────────────────────────────────────────────────────────────────────────────  ║
║  Counselor destination selected → auto-ping counseling office                   ║
║  No confirmation in 10 min → Routine escalates to Elevated automatically        ║
║  Upset / stormed out selected → Elevated immediately, skip Routine              ║
║  Lunch / Community Time report → Elevated by default                            ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```
