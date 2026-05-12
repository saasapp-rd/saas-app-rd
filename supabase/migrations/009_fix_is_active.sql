-- 009: backfill is_active NULLs so eq("is_active", true) never silently drops users
UPDATE users SET is_active = true WHERE is_active IS NULL;
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;
