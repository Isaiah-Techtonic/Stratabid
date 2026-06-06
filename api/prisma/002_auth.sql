-- StrataBid — migration 002: authentication
-- Adds password storage to the users table.
-- bcrypt hashes are safe to store alongside the profile; they are one-way.

BEGIN;

ALTER TABLE users
    ADD COLUMN password_hash TEXT;

-- Existing rows (none yet) would have NULL; new accounts always set this.
-- We don't make it NOT NULL because OAuth (Google) users — added later —
-- won't have a password at all.

COMMIT;
