# QA / QC Checklist — SAASApp School Admin

A page-by-page walkthrough organized by role. Each section assumes the QA tester is logged in as that role. Work through the role sections in order; some checks (e.g. "deactivated student is hidden") rely on data set up in earlier sections.

---

## Prep — before you start

- [ ] Test accounts exist for every role: `super_admin`, `admin`, `dean`, `coordinator`, `counselor`, `teacher`, `staff`, `student`
- [ ] Seed data includes at least one of each: active student with open incident, active student with resolved incident, **inactive** student with historical incidents, student with a counselor flag
- [ ] At least one course with a teacher, room, and 3+ enrolled students
- [ ] At least one coordinator assigned to a block
- [ ] Browser: Chrome on desktop (primary); spot-check Safari on iPhone for mobile

## Known gaps to flag, not fail

- `/admin/daily/print` and `/design-lab` have no role guard in the page body — any authenticated user with the URL can reach them. Note in bug tracker, do not block.
- `advisor` and `parent` roles exist in the CSV importer but have no dashboard views yet — students with those roles in `users` table will redirect to `/dashboard` and bounce.

---

## Public — not logged in

### `/` (root landing)
- [ ] Logo and brand colors render
- [ ] "Staff Sign In" button navigates to `/login`
- [ ] Responsive: header stays readable on mobile

### `/login`
- [ ] Google SSO button visible
- [ ] Dev test-account quick buttons pre-fill credentials (if dev mode)
- [ ] Wrong-domain Google account triggers redirect to `/login/error?error=AccessDenied`
- [ ] Unregistered Google account triggers redirect to `/login/error?error=Verification`

### `/login/error`
- [ ] Error message matches the `?error=` query param
- [ ] "Back to Sign In" link returns to `/login`

---

## Super Admin (`super_admin`)

Log in as a super_admin. Super admin sees the full app — every route below.

### `/dashboard`
- [ ] Redirects immediately to `/admin` (no flash of content)

### `/admin`
- [ ] Live missing widget: red if >0 missing, green if 0
- [ ] Missing student names listed under widget, each linking to that student's profile
- [ ] Quick Actions panel renders with student picker
- [ ] Daily Tools grid shows 4 tiles (Calendar, Daily Report, Analytics, Welfare Concerns) — all navigate correctly
- [ ] Elevated incidents show "Elevated" badge

### `/admin/config`
- [ ] All 9 management tiles render (users, courses, calendar, coordinators, import, daily, analytics, welfare, settings)
- [ ] Each tile navigates correctly
- [ ] Back link returns to `/admin`

### `/admin/calendar`
- [ ] Current month displayed with day-type colors (D1–D4)
- [ ] Today is highlighted with a red border
- [ ] Weekends styled differently from school days
- [ ] Day-type legend matches the calendar shading

### `/admin/coordinators`
- [ ] All 8 blocks listed with their assigned coordinator (or "Unassigned")
- [ ] Header counter shows "X of 8 blocks assigned"
- [ ] Assignment form lets you pick a coordinator and block, then saves
- [ ] After save, the page reflects the new assignment

### `/admin/courses`
- [ ] Active course count in header
- [ ] Courses sorted by block then name; teacher names render
- [ ] Add-course form includes teacher dropdown (only teachers/advisors listed)
- [ ] Inline edit on a course: change block, room, teacher, save — verify update
- [ ] Inline delete: deactivate vs permanent delete distinct; confirmation required

### `/admin/students`
- [ ] **Active** student count in header (inactive students excluded)
- [ ] Students sorted by last name
- [ ] Add-student form includes grade picker and Veracross ID field
- [ ] Grade badge on each row

### `/admin/users`
- [ ] 8 role tiles render (Students, Teachers, Staff, Coordinators, Counselors, Deans, Admins, Super Admins)
- [ ] Each tile shows active count and "+N inactive" badge when applicable
- [ ] Clicking a tile navigates to `/admin/users/[role]`

### `/admin/users/[role]` — repeat for each role
QA each sub-route: `student`, `teacher`, `staff`, `coordinator`, `counselor`, `dean`, `admin`, `super_admin`.
- [ ] Top nav says **"← Manage Users"** (NOT "← Admin" or "← Dashboard")
- [ ] Active count and total count in header
- [ ] Add form at top: for students uses AddStudentForm (first name, last name, grade), for others uses AddUserForm (email, display_name)
- [ ] Student list: sort pills (Last Name / First Name / Grade) toggle direction
- [ ] Student list: grade filter chips work; advisor filter chips work; combine
- [ ] Student list: search input filters by name, grade, or Veracross ID
- [ ] Student list: pagination at 50 per page
- [ ] "+N inactive" toggle in student list shows withdrawn students with strikethrough/dim styling
- [ ] Non-student list: edit row expands inline panel with name/email/phone/role
- [ ] Deactivate: confirm dialog, then user moves to inactive
- [ ] Delete permanently: only available within the deactivate expanded panel; confirms twice; all related records (incidents, enrollments, flags, push subs) are removed
- [ ] You cannot deactivate or delete your own account (button hidden or disabled)
- [ ] Only super_admin can create or promote to `super_admin` role

### `/admin/import`
- [ ] Three import cards render in order: Faculty & Staff → Students → Parents
- [ ] No schedule/courses import card (deferred)
- [ ] **Faculty & Staff** — upload Veracross faculty CSV: roles map (Faculty → teacher, Staff → staff); existing coordinator/counselor/dean/admin roles preserved on re-import
- [ ] **Students** — upload Veracross student CSV: "Grade 9" parses correctly; re-uploading by Person ID updates not duplicates; advisor field populates
- [ ] **Parents** — upload Veracross parent CSV: links to students by Person ID; up to 4 parents per student; students-not-found reported in result
- [ ] Bad CSV: missing required columns shows error message, not a crash
- [ ] Each card collapses/expands; back link to `/admin/config`

### `/admin/daily`
- [ ] Stats cards: Total / Open / Elevated / Resolved match the list
- [ ] Incident list sorted newest first
- [ ] Each row: student name, grade, block, level badge, status badge, reporter, duration
- [ ] Located incidents show "Found: [location]" with excused tag if applicable
- [ ] **Inactive students' incidents from today still appear here** (historical view)
- [ ] Print/Export link opens `/admin/daily/print` in new tab

### `/admin/daily/print`
- [ ] Browser print preview shows clean tabular layout
- [ ] Header has full date
- [ ] Stats row visible
- [ ] Table columns: Student, Gr, Time, Blk, Level, Status, Found At, Duration, Reported By
- [ ] Color coding: elevated red, resolved green, located blue, open amber

### `/admin/welfare-concerns`
- [ ] Open section (top, red background): incidents with `report_type=welfare_concern` and `status=open`, last 90 days
- [ ] Resolved section: same incidents but resolved
- [ ] Empty state if no welfare concerns
- [ ] Each row links to `/coordinator/[id]` for follow-up
- [ ] **Inactive students' welfare history still appears** (historical view)

### `/admin/settings`
- [ ] Live stats: active student count, course count, staff count match other pages
- [ ] Config items: academic year, school name, block rotation, coordinator coverage, email/push/SSO/Veracross status
- [ ] "Configure" buttons link to `/admin/calendar` and `/admin/coordinators`
- [ ] Read-only config items show a badge

### `/analytics`
- [ ] **Today tab**: stats match `/admin/daily`
- [ ] **Patterns tab**: 90-day total, elevated, high-frequency counts
- [ ] Day-of-week bar chart renders with weekends grayed
- [ ] Block bar chart renders for blocks 1–8
- [ ] High-frequency students list (3+ in 30 days) sorted by recent count
- [ ] Clicking a student in high-freq list navigates to their profile
- [ ] **Inactive students included in historical stats**

### `/coordinator`
- [ ] Stats cards: Active / Elevated / Routine
- [ ] Elevated incidents listed first (red), then routine (gray)
- [ ] Each row shows time elapsed, block, reporter
- [ ] "Pull" button visible top-right
- [ ] Click an incident → `/coordinator/[id]`
- [ ] Empty queue shows "Queue clear" with Pull CTA
- [ ] **Inactive students are excluded** from this live queue

### `/coordinator/[id]`
- [ ] Student info: name, grade, Veracross ID, parent email
- [ ] Status banner: green if resolved, blue if located, none if open
- [ ] 6-step workflow rendered with timestamps for completed steps
- [ ] Notes thread loads existing notes; add-note form appends
- [ ] After step 4 (3-min timer expired), Locate form appears
- [ ] After locate, Resolve button appears with "excused" toggle
- [ ] Test on a resolved incident: form is read-only, all steps complete

### `/counselor`
- [ ] Stats cards: Flagged / Active Now / Open Total
- [ ] Flagged students sorted: emergency > elevated > watch, then newest flag
- [ ] Each flagged row: initials avatar, name, grade, 30-day incident count, public note, "● Missing now" if active
- [ ] All open incidents section below
- [ ] **Inactive flagged students hidden** (operational caseload view)
- [ ] Empty state if no flags

### `/dean`
- [ ] Open elevated incidents section (red) if any
- [ ] Stats cards: 90-day total, elevated, high-frequency
- [ ] Day-of-week chart, block chart render
- [ ] High-frequency students (3+ in 30 days) list with last-30 count
- [ ] **Inactive students included in 90-day stats** (historical)

### `/design-lab`
- [ ] All brand asset sections render
- [ ] Color swatches match brand hex values
- [ ] Typography examples display correct fonts
- [ ] Button variants: solid, outlined, ghost
- [ ] Status badge variants visible

### `/missing`
- [ ] Hero count: red if >0, green if 0
- [ ] Missing Now section: elevated incidents at top with red left border, routine with orange
- [ ] Located section appears only if located incidents exist (blue)
- [ ] All-clear state shows checkmark
- [ ] Role-based nav: super_admin sees "My Queue" link
- [ ] **Inactive students excluded** from live view

### `/staff`
- [ ] Open incidents listed; "With Me" button on each
- [ ] Click "With Me" → status updates to located/resolved
- [ ] All-clear state if no missing students
- [ ] **Inactive students excluded**

### `/staff/concern`
- [ ] Search by student name returns active students only
- [ ] Select a student → card shows name + grade
- [ ] Note textarea optional
- [ ] Submit creates an incident with `report_type=welfare_concern`
- [ ] Success page shows student name; back link to `/staff`

### `/student`
- [ ] Placeholder "Coming in a future phase" page renders
- [ ] Sign-out button works

### `/students/[id]` — student profile
Open a student profile (any role can navigate here from incident lists).
- [ ] Header: name, grade, Veracross ID, parent email
- [ ] Schedule: enrollments shown by block
- [ ] Stats: total incidents, last 30 days, elevated count
- [ ] Flags section: shows current flags; FlagManager visible to super_admin
- [ ] Incident history (last 50): newest first, link to each incident
- [ ] **Inactive student profile shows full history** (no filtering)

### `/teacher`
- [ ] Header: current period (block N or Lunch/Community/Outside hours)
- [ ] Each course: block header, "NOW" badge on active block, room
- [ ] StudentRoster: students sorted by last name
- [ ] Active-block roster lets you mark students reported/with-me/found
- [ ] **Inactive students do not appear in the roster**

### `/teacher/courses`
- [ ] All teacher's courses listed (admin sees their own; super_admin technically sees their own only via teacher_id match)
- [ ] Each course card: block, room, student count, student names
- [ ] **Inactive students do not appear**

---

## Admin (`admin`)

Log in as admin. Same surface as super_admin **except**:

- [ ] On `/admin/users/super_admin`, the page renders but admin **cannot** create or promote to super_admin role (the option is hidden or returns 403)
- [ ] All super_admin checks above pass for admin role as well — repeat the walkthrough

(Skip listing individual pages — admin's coverage is identical to super_admin except the super-admin role gate.)

---

## Dean (`dean`)

Log in as dean.

### `/dashboard`
- [ ] Redirects to `/dean`

### `/dean`
- [ ] Open elevated incidents section (red) if any
- [ ] 90-day stats and charts render
- [ ] High-frequency students list

### `/coordinator`
- [ ] Queue visible (dean is in the ALLOWED list)
- [ ] **Pull button is NOT visible** to dean (coordinator-only)

### `/coordinator/[id]`
- [ ] Can view incident detail
- [ ] Can add notes
- [ ] Can resolve and locate (if workflow conditions met)

### `/missing`
- [ ] Live view visible
- [ ] Nav shows "Patterns" link (to `/dean`)

### `/analytics`
- [ ] Both tabs accessible; historical stats include inactive students

### `/admin/daily`
- [ ] Today's incident log visible

### `/students/[id]`
- [ ] Profile accessible from incident links

### `/staff/concern`
- [ ] Can submit welfare concern

### Forbidden — verify dean is redirected
- [ ] `/admin` → redirects to `/dashboard` then `/dean`
- [ ] `/admin/config`, `/admin/users`, `/admin/courses`, `/admin/students` → redirect
- [ ] `/admin/settings`, `/admin/import` → redirect
- [ ] `/staff`, `/teacher`, `/counselor` → redirect or 403

---

## Coordinator (`coordinator`)

Log in as coordinator.

### `/dashboard`
- [ ] Redirects to `/coordinator`

### `/coordinator`
- [ ] Queue visible
- [ ] **Pull button visible** in nav (top-right) — coordinator-only
- [ ] Clicking Pull opens the pull-student flow
- [ ] Empty queue: inline Pull CTA visible

### `/coordinator/[id]`
- [ ] Full incident workflow accessible
- [ ] Can locate, resolve, add notes

### `/missing`
- [ ] Live view; nav shows "My Queue" link

### `/dean`
- [ ] Coordinator is in ALLOWED — can view patterns

### `/analytics`
- [ ] Both tabs accessible

### `/admin/daily`
- [ ] Visible (coordinator is in ALLOWED)

### `/students/[id]`
- [ ] Profile accessible

### `/staff/concern`
- [ ] Can submit welfare concern

### Forbidden — verify redirects
- [ ] `/admin`, `/admin/config`, `/admin/users`, `/admin/courses` → redirect
- [ ] `/admin/settings`, `/admin/import`, `/admin/welfare-concerns` → redirect
- [ ] `/staff`, `/teacher`, `/counselor` → redirect or 403

---

## Counselor (`counselor`)

Log in as counselor.

### `/dashboard`
- [ ] Redirects to `/counselor`

### `/counselor`
- [ ] Flagged caseload + open incidents
- [ ] **Inactive flagged students do not appear**
- [ ] Can navigate to flagged student's profile

### `/coordinator`
- [ ] Visible (counselor is in ALLOWED)
- [ ] **Pull button NOT visible** (coordinator-only)

### `/coordinator/[id]`
- [ ] Can view, add notes
- [ ] Can resolve

### `/missing`
- [ ] Live view; nav shows "Counselor View" link

### `/analytics`
- [ ] Today + patterns tabs
- [ ] **Scoped to counselor's flagged students only** — both tabs limited to flagged caseload
- [ ] If counselor has no flags: "No flagged students" empty state

### `/students/[id]`
- [ ] Profile accessible from incident or flag

### `/staff/concern`
- [ ] Can submit welfare concern

### Forbidden — verify redirects
- [ ] `/admin/*` (except daily not in counselor ALLOWED) → redirect
- [ ] `/admin/daily` → redirect (counselor NOT in ALLOWED)
- [ ] `/dean` → redirect (counselor NOT in dean's ALLOWED)
- [ ] `/staff`, `/teacher` → redirect

---

## Teacher (`teacher`)

Log in as teacher with at least one assigned course.

### `/dashboard`
- [ ] Redirects to `/teacher`

### `/teacher`
- [ ] Current period header (block N or Lunch/Community)
- [ ] Each assigned course rendered; active block highlighted "NOW"
- [ ] Mark a student "reported missing" — verify incident created and visible at `/missing`
- [ ] Mark "with me" — verify status updates
- [ ] Mark "found" — verify resolved
- [ ] No-courses-assigned state if teacher has no courses
- [ ] **Inactive students do not appear** in any course roster

### `/teacher/courses`
- [ ] All teacher's courses listed
- [ ] Roster counts match `/teacher`

### `/missing`
- [ ] Live view; nav shows "My Roster" link
- [ ] Can view but not act on incidents (teacher does not coordinate)

### `/students/[id]`
- [ ] Profile accessible from missing student row
- [ ] Flag editor: NOT visible to teacher

### `/staff/concern`
- [ ] Can submit welfare concern

### Forbidden — verify redirects
- [ ] `/admin/*` → redirect
- [ ] `/coordinator`, `/coordinator/[id]` → redirect (teacher NOT in ALLOWED)
- [ ] `/counselor`, `/dean`, `/staff`, `/analytics` → redirect

---

## Staff (`staff`)

Log in as staff.

### `/dashboard`
- [ ] Redirects to `/staff`

### `/staff`
- [ ] Open incidents list with "With Me" buttons
- [ ] All-clear state if no missing students
- [ ] **Inactive students excluded**

### `/missing`
- [ ] Live view; nav shows "Staff Actions" link and welfare concern CTA

### `/staff/concern`
- [ ] Search active students
- [ ] Submit creates welfare concern incident
- [ ] Success page → back to `/staff`

### `/students/[id]`
- [ ] Profile accessible (read-only for staff — flag editor not visible)

### Forbidden — verify redirects
- [ ] `/admin/*` → redirect
- [ ] `/coordinator`, `/coordinator/[id]`, `/counselor`, `/dean`, `/teacher`, `/analytics` → redirect

---

## Student (`student`)

Log in as a student.

### `/dashboard`
- [ ] Redirects to `/missing` (per dashboard router)

### `/student`
- [ ] Placeholder page renders
- [ ] Sign-out works

### `/missing`
- [ ] Read-only live view accessible
- [ ] No action buttons (student is not staff/coordinator)

### Forbidden — verify redirects
- [ ] `/admin/*`, `/coordinator`, `/counselor`, `/dean`, `/teacher`, `/staff`, `/analytics`, `/students/[id]` → redirect

---

## Cross-cutting checks (final pass)

- [ ] Sign Out from any header returns to `/login`
- [ ] Browser refresh on any deep route does not log you out
- [ ] Live feed indicator updates on `/missing`, `/coordinator`, `/admin` within ~30 seconds of a new incident
- [ ] Push notification fires on elevated incident (if subscribed)
- [ ] No console errors on any page (open DevTools → Console)
- [ ] Mobile viewport (iPhone width): no horizontal scroll on any page

---

## Sign-off

| Tester | Date | Build / commit | Notes |
|--------|------|----------------|-------|
|        |      |                |       |

Pages with bugs / open issues:

|        |      |                |       |
|        |      |                |       |
|        |      |                |       |
