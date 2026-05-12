-- 008: CSV import support
-- students: add call_by (preferred name) + parent contact fields
ALTER TABLE students ADD COLUMN IF NOT EXISTS call_by      TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name  TEXT;

-- Reliable upsert key: unique index on veracross_id where not null
CREATE UNIQUE INDEX IF NOT EXISTS students_veracross_id_key
  ON students (veracross_id) WHERE veracross_id IS NOT NULL;

-- courses: add course_code for reliable upsert
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS courses_block_code_year_key
  ON courses (block_number, course_code, academic_year)
  WHERE course_code IS NOT NULL;

-- users: employee_id for teacher imports
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT;
