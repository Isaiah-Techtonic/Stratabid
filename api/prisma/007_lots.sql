-- StrataBid — migration 007: lots layer
--
-- Model: an auction contains LOTS (the sellable, bid-on unit). A lot holds
-- 1+ ITEMS (the existing equipment_listings rows — physical things with specs).
-- A lot is a numbered container; its display derives from its items, but it may
-- optionally carry its own title/description for grouped lots.
--
-- equipment_listings stays as the "items" table (renaming in code/UI only, not
-- the physical table, to avoid breaking existing data + introspection churn).
-- We add lot_id (nullable: an item may be submitted but not yet placed in a lot).

BEGIN;

CREATE TYPE lot_status AS ENUM ('draft', 'open', 'live', 'sold', 'passed', 'closed');

CREATE TABLE lots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id      UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    lot_number      INT,                       -- auto-assigned in order; reorderable
    title           TEXT,                      -- optional; for grouped/named lots
    description     TEXT,                      -- optional
    status          lot_status NOT NULL DEFAULT 'draft',
    starting_bid    NUMERIC(14,2) NOT NULL DEFAULT 0,
    reserve_price   NUMERIC(14,2),
    current_bid     NUMERIC(14,2),
    winning_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sort_order      INT NOT NULL DEFAULT 0,     -- for manual reordering
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (auction_id, lot_number)
);

CREATE INDEX idx_lots_auction ON lots(auction_id);
CREATE INDEX idx_lots_status  ON lots(status);

-- Link items to a lot (nullable until the company places the item into a lot)
ALTER TABLE equipment_listings
    ADD COLUMN lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
    -- allow a company user (not just an outside seller) to be the creator
    ADD COLUMN created_by_company BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_listings_lot ON equipment_listings(lot_id);

COMMIT;
