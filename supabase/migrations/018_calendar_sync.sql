-- source: 'manual' (admin override, preserved on re-sync) or 'synced' (from .ics feed)
-- is_special: flag for special-schedule days (exams, performances, modified blocks)
--             where day_type is typically NULL and the note field describes the day.
ALTER TABLE school_calendar ADD COLUMN IF NOT EXISTS source     TEXT;
ALTER TABLE school_calendar ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT FALSE;
