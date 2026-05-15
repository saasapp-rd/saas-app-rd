-- Migration 008 was supposed to add course_code, but at least one Supabase
-- instance came up without it (probably ran the base schema.sql which is
-- pre-008 and then skipped to 014+). The course importer needs this column
-- to write the Veracross Course code (e.g. "ACAL2001") that groups sections.
-- Idempotent guard so this is safe to re-run.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code TEXT;
