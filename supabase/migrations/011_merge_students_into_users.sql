-- 011: Merge students table into users
-- One record per person. students table is dropped.
-- All student_id FKs are re-pointed to users(id).
-- UUIDs are preserved so no data references break.

-- ── 1. Extend users with student-specific columns ─────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS last_name    TEXT,
  ADD COLUMN IF NOT EXISTS grade        INTEGER CHECK (grade IS NULL OR grade BETWEEN 9 AND 12),
  ADD COLUMN IF NOT EXISTS veracross_id TEXT,
  ADD COLUMN IF NOT EXISTS call_by      TEXT,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS parent_name  TEXT;

-- ── 2. Make email and name nullable (students may have no email at import time) ─
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN name  DROP NOT NULL;

-- ── 3. Unique index for veracross_id ─────────────────────────
DROP INDEX IF EXISTS students_veracross_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_veracross_id_key
  ON users (veracross_id) WHERE veracross_id IS NOT NULL;

-- ── 4. Migrate all students → users (preserve UUIDs) ─────────
INSERT INTO users (
  id, role, is_active,
  first_name, last_name, name, display_name,
  phone, grade, veracross_id, call_by, parent_email, parent_name,
  created_at, updated_at
)
SELECT
  s.id,
  'student',
  COALESCE(s.is_active, true),
  s.first_name,
  s.last_name,
  s.first_name || ' ' || s.last_name,
  COALESCE(s.call_by, s.first_name) || ' ' || s.last_name,
  s.phone,
  s.grade,
  s.veracross_id,
  s.call_by,
  s.parent_email,
  s.parent_name,
  s.created_at,
  s.updated_at
FROM students s
ON CONFLICT (id) DO UPDATE SET
  role         = 'student',
  first_name   = EXCLUDED.first_name,
  last_name    = EXCLUDED.last_name,
  grade        = EXCLUDED.grade,
  veracross_id = EXCLUDED.veracross_id,
  call_by      = EXCLUDED.call_by,
  parent_email = EXCLUDED.parent_email,
  parent_name  = EXCLUDED.parent_name,
  phone        = EXCLUDED.phone;

-- ── 5. Re-point student_id FKs from students → users ─────────
-- incidents
ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_student_id_fkey,
  ADD  CONSTRAINT incidents_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL;

-- student_enrollments
ALTER TABLE student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_student_id_fkey,
  ADD  CONSTRAINT student_enrollments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- student_concern_flags
ALTER TABLE student_concern_flags
  DROP CONSTRAINT IF EXISTS student_concern_flags_student_id_fkey,
  ADD  CONSTRAINT student_concern_flags_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- pattern_alerts
ALTER TABLE pattern_alerts
  DROP CONSTRAINT IF EXISTS pattern_alerts_student_id_fkey,
  ADD  CONSTRAINT pattern_alerts_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- imperfect_attendance
ALTER TABLE imperfect_attendance
  DROP CONSTRAINT IF EXISTS imperfect_attendance_student_id_fkey,
  ADD  CONSTRAINT imperfect_attendance_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- ── 6. Drop students table ────────────────────────────────────
DROP TABLE students;

-- ── 7. Backfill staff first_name / last_name from display_name (best-effort) ──
-- Split on last space: "Ms. Jones" → first_name="Ms.", last_name="Jones"
-- Staff can update their own records later.
UPDATE users
SET
  last_name  = CASE WHEN position(' ' in name) > 0
                 THEN trim(substring(name from position(' ' in name) + 1))
                 ELSE name END,
  first_name = CASE WHEN position(' ' in name) > 0
                 THEN trim(substring(name for position(' ' in name) - 1))
                 ELSE '' END
WHERE role != 'student' AND first_name IS NULL AND name IS NOT NULL;
