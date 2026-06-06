-- StrataBid — migration 010: bidding attaches to ITEMS (not lots)
--
-- Correction: the bid unit is the item (equipment_listings). A lot is only a
-- physical-location grouping. Move bidding state onto items; point bids.item_id.
-- Items already have: reserve_price (001), current_bid + winning_bidder_id (003).
-- Add the proxy/anti-snipe state items need.

BEGIN;

ALTER TABLE equipment_listings
    ADD COLUMN current_max_bid NUMERIC(14,2),
    ADD COLUMN bid_count       INT NOT NULL DEFAULT 0,
    ADD COLUMN ends_at         TIMESTAMPTZ,
    ADD COLUMN reserve_met     BOOLEAN NOT NULL DEFAULT false;

-- Bids reference the item directly.
ALTER TABLE bids
    ADD COLUMN item_id UUID REFERENCES equipment_listings(id) ON DELETE CASCADE;

CREATE INDEX idx_bids_item_amount ON bids(item_id, amount DESC);

COMMIT;
