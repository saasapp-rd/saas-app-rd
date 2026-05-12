-- Wave improvements: incident notes log
create table if not exists incident_notes (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz default now()
);

grant all on incident_notes to service_role;
create index if not exists incident_notes_incident_id_idx on incident_notes(incident_id, created_at);

-- Allow realtime on notes too
alter publication supabase_realtime add table incident_notes;
