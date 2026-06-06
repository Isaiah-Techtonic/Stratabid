-- StrataBid — migration 004: auction location fields
-- Where the equipment is located / pickup happens.

BEGIN;

ALTER TABLE auctions
    ADD COLUMN location_city    TEXT,
    ADD COLUMN location_state   TEXT,
    ADD COLUMN location_address TEXT;

COMMIT;
