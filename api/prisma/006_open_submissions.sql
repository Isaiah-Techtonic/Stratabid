-- StrataBid — migration 006: open auctions for seller submissions
-- A company toggles this to let sellers submit equipment to an auction.

BEGIN;

ALTER TABLE auctions
    ADD COLUMN open_for_submissions BOOLEAN NOT NULL DEFAULT false;

COMMIT;
