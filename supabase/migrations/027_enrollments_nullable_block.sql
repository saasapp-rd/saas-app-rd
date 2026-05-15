-- Allow student_enrollments.block_number to be null. Placeholder courses
-- (auto-created by the enrollment importer when the Class ID isn't in the
-- course schedule) have a null block_number until admin assigns one, but
-- we still want to attach students to them on import so the connection
-- isn't lost. Block syncs to enrollments when admin sets the course block.
ALTER TABLE student_enrollments ALTER COLUMN block_number DROP NOT NULL;
