-- Migration 013 introduced is_advisory but left the original 1-8 CHECK on
-- block_number, so advisory courses (block 9) can't be inserted from the
-- Veracross course import. Widen the check.
ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_block_number_check;
ALTER TABLE courses
  ADD CONSTRAINT courses_block_number_check
  CHECK (block_number BETWEEN 1 AND 9);
