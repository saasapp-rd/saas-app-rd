-- =================================================================
-- Wave 6: Row Level Security Policies
-- Run in Supabase SQL Editor
-- =================================================================
--
-- Architecture note:
--   service_role key (used by all Next.js API routes) BYPASSES RLS.
--   No existing API functionality is affected by this migration.
--
--   These policies protect the database against:
--     1. Direct anon-key access (e.g. leaked SUPABASE_ANON_KEY)
--     2. Future client-side queries (Wave 7 Realtime)
--
--   Policies use app.user_role / app.user_id Postgres config vars
--   which can be set per-transaction from server code if needed.
-- =================================================================


-- ── Helper functions ──────────────────────────────────────────────────────────

-- Returns the current user's role from transaction config.
-- Falls back to 'anon' if not set (blocks access by default).
create or replace function app_user_role()
returns text language sql stable security definer as $$
  select coalesce(nullif(current_setting('app.user_role', true), ''), 'anon')
$$;

-- Returns the current user's UUID from transaction config.
create or replace function app_user_id()
returns uuid language sql stable security definer as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- Returns true if app_user_role() is at or above the minimum role level.
-- Hierarchy: teacher < coordinator < counselor < dean < admin < super_admin
create or replace function has_role(minimum text)
returns boolean language sql stable security definer as $$
  select app_user_role() = any(
    case minimum
      when 'teacher'     then array['teacher','staff','counselor','coordinator','dean','admin','super_admin']
      when 'staff'       then array['staff','counselor','coordinator','dean','admin','super_admin']
      when 'counselor'   then array['counselor','coordinator','dean','admin','super_admin']
      when 'coordinator' then array['coordinator','dean','admin','super_admin']
      when 'dean'        then array['dean','admin','super_admin']
      when 'admin'       then array['admin','super_admin']
      when 'super_admin' then array['super_admin']
      else                     array[minimum]
    end
  )
$$;

-- Grant helper functions to both Postgres roles used by Supabase
grant execute on function app_user_role() to anon, authenticated;
grant execute on function app_user_id()   to anon, authenticated;
grant execute on function has_role(text)  to anon, authenticated;


-- ── push_subscriptions: enable RLS (missed in migration 002) ─────────────────
alter table push_subscriptions enable row level security;


-- =================================================================
-- TABLE POLICIES
-- =================================================================
-- Each table gets SELECT/INSERT/UPDATE/DELETE policies as appropriate.
-- Multiple permissive policies on the same operation are OR'd.
-- =================================================================


-- ── school_calendar ───────────────────────────────────────────────────────────
-- Public read: day type / schedule detection is non-sensitive.
-- Anon key is safe to read this table (used by period detection API).

create policy "calendar_anon_select" on school_calendar
  for select to anon, authenticated
  using (true);

create policy "calendar_admin_write" on school_calendar
  for all
  using (has_role('admin'))
  with check (has_role('admin'));


-- ── users ─────────────────────────────────────────────────────────────────────
-- Any staff can read user records (needed for display names throughout the app).
-- Only admins can create/modify users.

create policy "users_staff_select" on users
  for select
  using (has_role('teacher'));

create policy "users_admin_insert" on users
  for insert
  with check (has_role('admin'));

create policy "users_admin_update" on users
  for update
  using (has_role('admin'));

create policy "users_superadmin_delete" on users
  for delete
  using (has_role('super_admin'));


-- ── students ─────────────────────────────────────────────────────────────────
-- All staff can view students. Only admins can add/edit/remove them.

create policy "students_staff_select" on students
  for select
  using (has_role('teacher'));

create policy "students_admin_insert" on students
  for insert
  with check (has_role('admin'));

create policy "students_admin_update" on students
  for update
  using (has_role('admin'));

create policy "students_superadmin_delete" on students
  for delete
  using (has_role('super_admin'));


-- ── courses ───────────────────────────────────────────────────────────────────
-- All staff can view courses.
-- Teachers can update their own courses. Admins can do everything.

create policy "courses_staff_select" on courses
  for select
  using (has_role('teacher'));

create policy "courses_teacher_update_own" on courses
  for update
  using (
    has_role('teacher') and (
      teacher_id = app_user_id()
      or has_role('admin')
    )
  );

create policy "courses_admin_insert" on courses
  for insert
  with check (has_role('admin'));

create policy "courses_superadmin_delete" on courses
  for delete
  using (has_role('super_admin'));


-- ── student_enrollments ───────────────────────────────────────────────────────
-- All staff can view enrollments. Only admins can manage them.

create policy "enrollments_staff_select" on student_enrollments
  for select
  using (has_role('teacher'));

create policy "enrollments_admin_write" on student_enrollments
  for insert
  with check (has_role('admin'));

create policy "enrollments_admin_update" on student_enrollments
  for update
  using (has_role('admin'));

create policy "enrollments_superadmin_delete" on student_enrollments
  for delete
  using (has_role('super_admin'));


-- ── coordinator_assignments ───────────────────────────────────────────────────
-- All staff can read assignments. Only admins can manage them.

create policy "coord_assign_staff_select" on coordinator_assignments
  for select
  using (has_role('teacher'));

create policy "coord_assign_admin_write" on coordinator_assignments
  for insert
  with check (has_role('admin'));

create policy "coord_assign_admin_update" on coordinator_assignments
  for update
  using (has_role('admin'));

create policy "coord_assign_superadmin_delete" on coordinator_assignments
  for delete
  using (has_role('super_admin'));


-- ── incidents ─────────────────────────────────────────────────────────────────
-- Teachers: can see incidents they reported.
-- Counselors, coordinators, deans, admins: can see all incidents.
-- Teachers + staff: can insert new incidents.
-- Coordinators+: can update incidents (workflow steps, resolution).
-- Super admin only: can hard-delete (should be rare).

create policy "incidents_reporter_select" on incidents
  for select
  using (
    reported_by = app_user_id()
    or has_role('counselor')
  );

create policy "incidents_insert" on incidents
  for insert
  with check (has_role('teacher'));

create policy "incidents_coord_update" on incidents
  for update
  using (has_role('coordinator'));

create policy "incidents_superadmin_delete" on incidents
  for delete
  using (has_role('super_admin'));


-- ── incident_updates ──────────────────────────────────────────────────────────
-- All staff can read and add notes on incidents they have access to.
-- Private notes restricted to coordinator+.

create policy "incident_updates_staff_select" on incident_updates
  for select
  using (
    has_role('teacher') and (
      not is_private
      or has_role('coordinator')
    )
  );

create policy "incident_updates_insert" on incident_updates
  for insert
  with check (has_role('teacher'));

create policy "incident_updates_coord_update" on incident_updates
  for update
  using (has_role('coordinator'));


-- ── incident_search_logs ──────────────────────────────────────────────────────
-- Coordinators and above can read and write search logs.

create policy "search_logs_coord_select" on incident_search_logs
  for select
  using (has_role('coordinator'));

create policy "search_logs_coord_insert" on incident_search_logs
  for insert
  with check (has_role('coordinator'));


-- ── student_concern_flags ─────────────────────────────────────────────────────
-- Counselors and above can read/manage concern flags.
-- Private notes are counselor-only; coordinators+ see public notes.

create policy "flags_coord_select" on student_concern_flags
  for select
  using (
    has_role('coordinator') and (
      private_note is null
      or has_role('counselor')
    )
  );

create policy "flags_counselor_write" on student_concern_flags
  for insert
  with check (has_role('counselor'));

create policy "flags_counselor_update" on student_concern_flags
  for update
  using (has_role('counselor'));


-- ── pattern_alerts ────────────────────────────────────────────────────────────
-- Coordinators and above can view and acknowledge pattern alerts.

create policy "alerts_coord_select" on pattern_alerts
  for select
  using (has_role('coordinator'));

create policy "alerts_coord_update" on pattern_alerts
  for update
  using (has_role('coordinator'));


-- ── imperfect_attendance ──────────────────────────────────────────────────────
-- Coordinators and above can view. Admins can write.

create policy "attendance_coord_select" on imperfect_attendance
  for select
  using (has_role('coordinator'));

create policy "attendance_admin_write" on imperfect_attendance
  for insert
  with check (has_role('admin'));

create policy "attendance_admin_update" on imperfect_attendance
  for update
  using (has_role('admin'));


-- ── push_subscriptions ────────────────────────────────────────────────────────
-- Each user can only read and manage their own push subscriptions.

create policy "push_own_select" on push_subscriptions
  for select
  using (user_id = app_user_id());

create policy "push_own_insert" on push_subscriptions
  for insert
  with check (user_id = app_user_id());

create policy "push_own_delete" on push_subscriptions
  for delete
  using (user_id = app_user_id());


-- =================================================================
-- Done.
-- To verify: run SELECT * FROM pg_policies WHERE schemaname = 'public'
--            in the Supabase SQL Editor.
-- =================================================================
