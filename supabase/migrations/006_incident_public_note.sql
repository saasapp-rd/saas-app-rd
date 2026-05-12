-- Wave 11: add public_note to incidents for coordinator pull reason
alter table incidents add column if not exists public_note text;
