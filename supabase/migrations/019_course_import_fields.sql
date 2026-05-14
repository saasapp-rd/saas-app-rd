-- Columns the Veracross course-schedule import needs:
--   class_id      — dedup key on re-import (e.g. "ACAL2001-11")
--   school_level  — "Upper School" / "Middle School"
--   grade_level   — "Grade 9" / "Grade 10" / etc.
--   meeting_times — raw string from Veracross for reference / future parsing
ALTER TABLE courses ADD COLUMN IF NOT EXISTS class_id      TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS school_level  TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS grade_level   TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS meeting_times TEXT;

-- Partial unique index so re-imports update in place (manual-add courses with
-- no class_id are unaffected).
CREATE UNIQUE INDEX IF NOT EXISTS courses_class_id_unique
  ON courses (class_id) WHERE class_id IS NOT NULL;
