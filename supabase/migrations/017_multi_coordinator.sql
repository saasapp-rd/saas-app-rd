-- Allow multiple coordinators per block (the global default).
-- Per-day calendar overrides will live in a separate table later.
ALTER TABLE coordinator_assignments
  DROP CONSTRAINT IF EXISTS coordinator_assignments_block_number_academic_year_key;
ALTER TABLE coordinator_assignments
  ADD CONSTRAINT coordinator_assignments_block_coord_year_key
  UNIQUE (block_number, coordinator_id, academic_year);
