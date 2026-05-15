-- Generic queue for data-quality issues admin needs to review and resolve.
-- Used today by the enrollment importer (unknown courses, block overlays)
-- and the course importer (unmatched teachers, unparseable blocks); scales
-- to any future check that should surface a row admin needs to look at.
--
-- status:
--   open      — needs admin attention
--   resolved  — admin fixed the underlying issue
--   dismissed — admin reviewed and decided no fix is needed (e.g. legit
--               overlay like Jazz + Algebra block conflict)
CREATE TABLE IF NOT EXISTS data_issues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source      TEXT NOT NULL,
  kind        TEXT NOT NULL,
  ref_type    TEXT,
  ref_id      UUID,
  title       TEXT NOT NULL,
  details     JSONB,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  CHECK (status IN ('open','resolved','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_data_issues_status ON data_issues(status);
CREATE INDEX IF NOT EXISTS idx_data_issues_source ON data_issues(source);
CREATE INDEX IF NOT EXISTS idx_data_issues_kind   ON data_issues(kind);
