-- Two columns to support the user-edit flow:
--   business_phone — for faculty/staff who have both mobile and business
--   dean_grades    — grade-level responsibility for deans (Heads of School,
--                    Dean of Grade 9, etc.). Empty array = no specific grades.
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dean_grades    INTEGER[];
