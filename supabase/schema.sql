-- ============================================================
-- SAAS RD App — Full Database Schema
-- Wave 1 — Run this once in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enum types ────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'super_admin','admin','dean','coordinator','counselor','teacher','staff','student'
);
CREATE TYPE incident_level  AS ENUM ('routine','elevated','emergency');
CREATE TYPE incident_status AS ENUM ('open','located','resolved');
CREATE TYPE period_type     AS ENUM ('block','lunch','community');
CREATE TYPE report_type     AS ENUM ('absent_from_start','left_and_missing','welfare_concern');
CREATE TYPE initiated_by    AS ENUM ('teacher','coordinator_pull','welfare_concern');
CREATE TYPE context_tag     AS ENUM (
  'bathroom','nurse','counselor','office','upset',
  'unknown','emotional','physical','left_campus','general'
);
CREATE TYPE flag_level       AS ENUM ('watch','elevated','emergency');
CREATE TYPE pattern_trigger  AS ENUM (
  'same_block_repeat','multi_block_day','weekly_threshold',
  'no_text_response','unresolved'
);
CREATE TYPE attendance_source AS ENUM ('veracross_api','manual_entry','csv_import');
CREATE TYPE attendance_resolution AS ENUM (
  'false_positive_sports','false_positive_offcampus','false_positive_accommodations',
  'false_positive_parent','false_positive_sub','false_positive_error','confirmed_missing'
);

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  display_name TEXT,
  role         user_role NOT NULL DEFAULT 'teacher',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Students ──────────────────────────────────────────────────
CREATE TABLE students (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  grade          INTEGER NOT NULL CHECK (grade BETWEEN 9 AND 12),
  veracross_id   TEXT,
  phone          TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Courses ───────────────────────────────────────────────────
CREATE TABLE courses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  teacher_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  block_number   INTEGER NOT NULL CHECK (block_number BETWEEN 1 AND 8),
  room           TEXT,
  academic_year  TEXT NOT NULL DEFAULT '2025-26',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Student Enrollments ───────────────────────────────────────
CREATE TABLE student_enrollments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  block_number   INTEGER NOT NULL,
  academic_year  TEXT NOT NULL DEFAULT '2025-26',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, block_number, academic_year)
);

-- ── School Calendar ───────────────────────────────────────────
CREATE TABLE school_calendar (
  date           DATE PRIMARY KEY,
  day_type       INTEGER CHECK (day_type BETWEEN 1 AND 4),
  is_school_day  BOOLEAN NOT NULL DEFAULT TRUE,
  note           TEXT
);

-- ── Coordinator Assignments ───────────────────────────────────
CREATE TABLE coordinator_assignments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_number   INTEGER NOT NULL CHECK (block_number BETWEEN 1 AND 8),
  coordinator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_year  TEXT NOT NULL DEFAULT '2025-26',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(block_number, academic_year)
);

-- ── Incidents ─────────────────────────────────────────────────
CREATE TABLE incidents (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id             UUID NOT NULL REFERENCES students(id),
  reported_by            UUID NOT NULL REFERENCES users(id),
  reported_at            TIMESTAMPTZ DEFAULT NOW(),
  initiated_by           initiated_by NOT NULL DEFAULT 'teacher',
  period_type            period_type NOT NULL,
  report_type            report_type NOT NULL,
  level                  incident_level NOT NULL DEFAULT 'routine',
  block_id               INTEGER,
  course_id              UUID REFERENCES courses(id),
  room                   TEXT,
  context_tag            context_tag,
  departed_at            TIMESTAMPTZ,
  stated_destination     TEXT,
  -- Step timestamps
  step_1_sent_at         TIMESTAMPTZ,
  step_2_sent_at         TIMESTAMPTZ,
  step_3_expires_at      TIMESTAMPTZ,
  step_4_logged_at       TIMESTAMPTZ,
  step_5_logged_at       TIMESTAMPTZ,
  step_6_sent_at         TIMESTAMPTZ,
  -- Counselor ping
  counselor_pinged_at    TIMESTAMPTZ,
  counselor_confirmed_at TIMESTAMPTZ,
  -- Resolution
  status                 incident_status NOT NULL DEFAULT 'open',
  located_at             TIMESTAMPTZ,
  located_by             UUID REFERENCES users(id),
  located_location       TEXT,
  located_excused        BOOLEAN,
  step_found_at          INTEGER,
  resolved_at            TIMESTAMPTZ,
  resolved_by            UUID REFERENCES users(id),
  -- Flags
  suppress_email_home    BOOLEAN DEFAULT FALSE,
  is_duplicate           BOOLEAN DEFAULT FALSE,
  duplicate_of           UUID REFERENCES incidents(id),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── Incident Updates (shared + private notes) ─────────────────
CREATE TABLE incident_updates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id),
  note        TEXT NOT NULL,
  is_private  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Physical Search Log (Step 4) ──────────────────────────────
CREATE TABLE incident_search_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  location    TEXT NOT NULL,
  checked_by  UUID NOT NULL REFERENCES users(id),
  checked_at  TIMESTAMPTZ DEFAULT NOW(),
  found       BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Student Concern Flags ─────────────────────────────────────
CREATE TABLE student_concern_flags (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  flag_level   flag_level NOT NULL DEFAULT 'watch',
  public_note  TEXT,
  private_note TEXT,
  flagged_by   UUID NOT NULL REFERENCES users(id),
  flagged_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pattern Alerts ────────────────────────────────────────────
CREATE TABLE pattern_alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trigger_type     pattern_trigger NOT NULL,
  detected_at      TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by  UUID REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ
);

-- ── Imperfect Attendance ──────────────────────────────────────
CREATE TABLE imperfect_attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES students(id),
  block_id    INTEGER NOT NULL,
  date        DATE NOT NULL,
  source      attendance_source NOT NULL DEFAULT 'manual_entry',
  resolved    BOOLEAN DEFAULT FALSE,
  resolution  attendance_resolution,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, block_id, date)
);

-- ── Enable RLS on all tables ──────────────────────────────────
-- (Policies added in Wave 6 — service role bypasses RLS server-side)
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_calendar        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_search_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_concern_flags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE imperfect_attendance   ENABLE ROW LEVEL SECURITY;

-- ── Useful indexes ────────────────────────────────────────────
CREATE INDEX idx_incidents_status      ON incidents(status);
CREATE INDEX idx_incidents_student     ON incidents(student_id);
CREATE INDEX idx_incidents_block       ON incidents(block_id);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at DESC);
CREATE INDEX idx_enrollments_student   ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_block     ON student_enrollments(block_number);
CREATE INDEX idx_calendar_date         ON school_calendar(date);
CREATE INDEX idx_updates_incident      ON incident_updates(incident_id);
CREATE INDEX idx_search_incident       ON incident_search_logs(incident_id);
