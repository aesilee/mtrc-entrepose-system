-- Patch 004: fixes the ICT Admin dashboard's "online users" query,
-- which references a last_active column that wasn't in the schema yet.

ALTER TABLE users
  ADD COLUMN last_active DATETIME NULL;