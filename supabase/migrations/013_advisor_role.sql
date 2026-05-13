-- Add advisor and parent roles to user_role enum
DO $$ BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'advisor'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student profile fields from Veracross CSV
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS advisor_name TEXT;  -- advisor's display name, copied from CSV

-- Advisory groups are courses with is_advisory = true
-- They use teacher_id = advisor's user id, block_number = 0 (advisory)
-- Student enrollments work identically to regular courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_advisory BOOLEAN NOT NULL DEFAULT false;
