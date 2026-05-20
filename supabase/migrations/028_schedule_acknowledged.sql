-- Admin can mark a student's schedule oddity (missing block, advisory
-- gap, intentional overlay) as a known-OK variant. The flag turns the
-- red "schedule issue" indicator into an orange "variant acknowledged"
-- one so the admin team can see at a glance which weird schedules
-- have been reviewed and accepted.
--
-- Per-student boolean — durable across runs. If the underlying schedule
-- changes into a NEW weird shape, admin must un-acknowledge to re-flag.
ALTER TABLE users ADD COLUMN IF NOT EXISTS schedule_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;
