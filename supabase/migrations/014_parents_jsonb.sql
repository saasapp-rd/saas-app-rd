-- Add JSONB column to store all parent contacts (up to 4) per student.
-- parent_email / parent_name remain as the primary contact shortcut for display.
ALTER TABLE users ADD COLUMN IF NOT EXISTS parents JSONB;
