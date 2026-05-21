-- Single-row config table for the SAAS-app's runtime settings.
-- Read by admins (UI) and super_admins (edit). The single-row pattern
-- keeps reads cheap (no joins) and writes simple (always update where
-- id = 1).
CREATE TABLE IF NOT EXISTS system_settings (
  id                       INTEGER PRIMARY KEY DEFAULT 1,
  academic_year            TEXT    NOT NULL DEFAULT '2025-26',
  school_name              TEXT    NOT NULL DEFAULT 'Seattle Academy',

  -- Notification policy. When false, the corresponding push/email send
  -- is suppressed school-wide. Useful for testing, snow days, etc.
  push_on_missing          BOOLEAN NOT NULL DEFAULT TRUE,
  push_on_elevated         BOOLEAN NOT NULL DEFAULT TRUE,
  push_on_welfare_concern  BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_step3           BOOLEAN NOT NULL DEFAULT FALSE,

  -- Google SSO config. Empty strings = not configured. Storing these
  -- in the DB lets super_admin paste them in from the UI without needing
  -- a code redeploy; they're considered secrets but no more sensitive
  -- than what's already in env vars.
  google_client_id         TEXT    NOT NULL DEFAULT '',
  google_client_secret     TEXT    NOT NULL DEFAULT '',

  -- Veracross API integration.
  veracross_api_url        TEXT    NOT NULL DEFAULT '',
  veracross_api_key        TEXT    NOT NULL DEFAULT '',

  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by               UUID REFERENCES users(id) ON DELETE SET NULL,

  CHECK (id = 1)
);

-- Seed the singleton row.
INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
