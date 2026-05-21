-- Counselor caseload: many-to-many between counselors (users w/ role='counselor')
-- and students (users w/ role='student'). A student can be on multiple
-- counselors' caseloads; a counselor's caseload is the set of students
-- they're personally responsible for.
--
-- This is separate from student_concern_flags — flags surface anyone the
-- counseling team is watching; the caseload narrows that to who's
-- assigned to which counselor for follow-up.
CREATE TABLE IF NOT EXISTS counselor_caseload (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  notes         TEXT,
  UNIQUE(counselor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_counselor_caseload_counselor ON counselor_caseload(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counselor_caseload_student   ON counselor_caseload(student_id);
