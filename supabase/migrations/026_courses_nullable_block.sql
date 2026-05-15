-- Allow courses to exist without a block number assigned. Used by the
-- enrollment importer to silently create placeholder rows for class IDs
-- referenced by students but missing from the course schedule export.
-- These placeholders surface red on /admin/courses for admin review;
-- once a block is assigned, the next enrollment import can attach
-- students to them.
ALTER TABLE courses ALTER COLUMN block_number DROP NOT NULL;
