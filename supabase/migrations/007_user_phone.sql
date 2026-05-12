-- 007_user_phone.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
