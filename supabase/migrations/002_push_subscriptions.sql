-- Wave 5: push_subscriptions table + parent_email on students
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

grant all on push_subscriptions to service_role;

-- Add parent contact fields to students (nullable)
alter table students add column if not exists parent_email text;
alter table students add column if not exists parent_name  text;
