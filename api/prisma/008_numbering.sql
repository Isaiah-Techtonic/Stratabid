-- StrataBid — migration 008: lot sale mode + item numbering
--
-- Implements the corrected item/lot model:
--  * lots get a sale_mode (individual = bid per item; bulk = sell whole lot at once)
--  * items get a stable item_number (auto-sequential per auction by default)
--  * companies get numbering settings (auto/manual, start number, lot-prefix display)
--  * reserve already exists on items (reserve_price, migration 001) and lots
--    (reserve_price, migration 007). No new reserve columns needed.
--  * "starting bid" is abandoned (columns remain but unused).

-- ADD VALUE on an enum cannot run in a transaction; do it first if needed.
-- sale_mode is a new enum, created fresh below (no ALTER TYPE issue).

BEGIN;

CREATE TYPE lot_sale_mode AS ENUM ('individual', 'bulk');

ALTER TABLE lots
    ADD COLUMN sale_mode lot_sale_mode NOT NULL DEFAULT 'individual';

-- Per-item stable number (assigned auto or manually). Unique within an auction.
ALTER TABLE equipment_listings
    ADD COLUMN item_number INT;

CREATE UNIQUE INDEX idx_items_auction_number
    ON equipment_listings(auction_id, item_number)
    WHERE item_number IS NOT NULL;

-- Per-company numbering settings.
ALTER TABLE auction_companies
    ADD COLUMN numbering_mode   TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
    ADD COLUMN numbering_start  INT  NOT NULL DEFAULT 1,       -- first auto number
    ADD COLUMN numbering_prefix BOOLEAN NOT NULL DEFAULT false; -- show lot prefix in display

COMMIT;
