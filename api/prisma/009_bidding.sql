-- StrataBid — migration 009: timed bidding engine
--
-- Bidding happens on LOTS (the sellable unit). The original bids table (001)
-- referenced listing_id (an item) speculatively; we add lot_id for real bids.
-- Proxy/max bids: a bid carries max_amount (already exists); the lot tracks the
-- current price + current winner. Tiered increments are configured per auction.

BEGIN;

-- Point bids at lots (the real bid target). Keep listing_id nullable for back-compat.
ALTER TABLE bids
    ADD COLUMN lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
    ALTER COLUMN listing_id DROP NOT NULL;

CREATE INDEX idx_bids_lot_amount ON bids(lot_id, amount DESC);

-- Lot bidding state: current price, current winner, the winner's hidden max.
ALTER TABLE lots
    ADD COLUMN current_max_bid   NUMERIC(14,2),     -- the leading bidder's hidden max
    ADD COLUMN bid_count         INT NOT NULL DEFAULT 0,
    ADD COLUMN ends_at           TIMESTAMPTZ,        -- per-lot close time (defaults from auction)
    ADD COLUMN reserve_met       BOOLEAN NOT NULL DEFAULT false;

-- Tiered bid increments, configured per auction.
-- Each row: at/above `min_amount`, the bid step is `increment`.
CREATE TABLE bid_increments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    min_amount  NUMERIC(14,2) NOT NULL,   -- price threshold
    increment   NUMERIC(14,2) NOT NULL,   -- step size at/above this threshold
    UNIQUE (auction_id, min_amount)
);

CREATE INDEX idx_increments_auction ON bid_increments(auction_id, min_amount);

COMMIT;
