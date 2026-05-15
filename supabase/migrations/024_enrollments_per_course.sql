-- The old UNIQUE(student_id, block_number, academic_year) assumed one course
-- per block per student, but real Veracross data has legitimate overlaps:
-- jazz/honors overlays, online courses doubled up with their regular
-- counterpart, independent study, etc.
-- Replace with UNIQUE(student_id, course_id, academic_year) — prevents the
-- same student being enrolled in the same course twice (the actual bug we
-- want to catch) while allowing multiple courses to share a block.

ALTER TABLE student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_student_id_block_number_academic_year_key;
ALTER TABLE student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_student_course_year_key;
ALTER TABLE student_enrollments
  ADD CONSTRAINT student_enrollments_student_course_year_key
  UNIQUE (student_id, course_id, academic_year);
