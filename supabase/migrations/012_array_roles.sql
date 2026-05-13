-- Add 'parent' role to enum if user_role type exists; no-op if role is TEXT
DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add roles[] column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Backfill: every user gets at least their current role
UPDATE users SET roles = ARRAY[role]::TEXT[] WHERE roles IS NULL;
