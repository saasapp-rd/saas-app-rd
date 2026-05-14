-- Migration 008 made (block_number, course_code, academic_year) unique. That
-- worked when course_code was the only dedup key, but it blocks multi-section
-- courses (two sections of ACAL2001 both in block 3 with different teachers).
-- Class ID (added in migration 019) is now the dedup key, so the old
-- constraint is over-tight.
DROP INDEX IF EXISTS courses_block_code_year_key;
