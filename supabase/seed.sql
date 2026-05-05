-- ============================================================
-- SAAS RD App — Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- Inserts test users + sample calendar days for dev/testing
-- ============================================================

-- ── Test users (match next-auth test accounts) ────────────────
INSERT INTO users (id, email, name, display_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'superadmin@test.saas', 'Super Admin',         'Super Admin',          'super_admin'),
  ('00000000-0000-0000-0000-000000000002', 'admin@test.saas',      'Admin User',          'Admin User',           'admin'),
  ('00000000-0000-0000-0000-000000000003', 'dean@test.saas',       'Dean Martinez',       'Dean Martinez',        'dean'),
  ('00000000-0000-0000-0000-000000000004', 'coordinator@test.saas','Will Thomas',         'Will (Coordinator)',   'coordinator'),
  ('00000000-0000-0000-0000-000000000005', 'counselor@test.saas',  'Dr. Park',            'Dr. Park (Counselor)', 'counselor'),
  ('00000000-0000-0000-0000-000000000006', 'teacher@test.saas',    'Ms. Jones',           'Ms. Jones (Teacher)',  'teacher'),
  ('00000000-0000-0000-0000-000000000007', 'staff@test.saas',      'Staff Member',        'Staff Member',         'staff'),
  ('00000000-0000-0000-0000-000000000008', 'student@test.saas',    'Test Student',        'Test Student',         'student')
ON CONFLICT (email) DO UPDATE SET
  name         = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  role         = EXCLUDED.role;

-- ── Sample school calendar (adjust dates to match real schedule) ──
-- Day types rotate 1→2→3→4→1→2→3→4...
-- Fill in a few weeks for dev testing — admin will upload real CSV in Wave 2
INSERT INTO school_calendar (date, day_type, is_school_day) VALUES
  ('2026-05-05', 1, true),
  ('2026-05-06', 2, true),
  ('2026-05-07', 3, true),
  ('2026-05-08', 4, true),
  ('2026-05-09', 1, true),
  ('2026-05-12', 2, true),
  ('2026-05-13', 3, true),
  ('2026-05-14', 4, true),
  ('2026-05-15', 1, true),
  ('2026-05-16', 2, true),
  ('2026-05-19', 3, true),
  ('2026-05-20', 4, true),
  ('2026-05-21', 1, true),
  ('2026-05-22', 2, true),
  ('2026-05-23', 3, true),
  ('2026-05-26', null, false),  -- Memorial Day
  ('2026-05-27', 4, true),
  ('2026-05-28', 1, true),
  ('2026-05-29', 2, true),
  ('2026-05-30', 3, true)
ON CONFLICT (date) DO UPDATE SET
  day_type      = EXCLUDED.day_type,
  is_school_day = EXCLUDED.is_school_day;

-- ── Sample teacher course + coordinator assignment ────────────────
-- Teacher (Ms. Jones) teaches AP Biology in Block 3
INSERT INTO courses (id, name, teacher_id, block_number, room, academic_year)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'AP Biology',
  '00000000-0000-0000-0000-000000000006',  -- Ms. Jones
  3,
  'Room 204',
  '2025-26'
) ON CONFLICT DO NOTHING;

-- Coordinator (Will) covers Block 3
INSERT INTO coordinator_assignments (block_number, coordinator_id, academic_year)
VALUES (3, '00000000-0000-0000-0000-000000000004', '2025-26')
ON CONFLICT (block_number, academic_year) DO UPDATE SET
  coordinator_id = EXCLUDED.coordinator_id;

-- ── Sample students enrolled in AP Biology Block 3 ────────────────
INSERT INTO students (id, first_name, last_name, grade) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Jane',   'Doe',    10),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Alex',   'Kim',    10),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Marcus', 'Lee',    10),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'John',   'Smith',  11),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'Maya',   'Torres', 10),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'Chris',  'Walsh',  11)
ON CONFLICT DO NOTHING;

INSERT INTO student_enrollments (student_id, course_id, block_number, academic_year) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 3, '2025-26'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 3, '2025-26'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 3, '2025-26'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 3, '2025-26'),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 3, '2025-26'),
  ('bbbbbbbb-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 3, '2025-26')
ON CONFLICT DO NOTHING;

SELECT 'Seed complete. Users, calendar, course, students all loaded.' AS status;
