-- 010: backfill is_active NULLs on students (mirrors 009 which only fixed users)
UPDATE students SET is_active = true WHERE is_active IS NULL;
ALTER TABLE students ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE students ALTER COLUMN is_active SET NOT NULL;
