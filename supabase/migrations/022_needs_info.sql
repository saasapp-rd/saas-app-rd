-- Users auto-created by CSV imports (e.g. a teacher referenced in a course
-- file who isn't in the faculty roster yet) start with needs_info = true.
-- The Manage Users hub shows a banner with a count, and a dedicated page
-- lists them so admin can fill in email + contact info.
-- Flag clears automatically when the admin saves an email in the edit panel.
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_info BOOLEAN NOT NULL DEFAULT FALSE;
