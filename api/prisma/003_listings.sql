-- StrataBid — migration 003: equipment listing detail fields
-- Adds make/model/year/serial, usage, power/weight, fuel, condition,
-- subcategory, attachment parent reference, and live-bid tracking.
-- Sensitive money fields stay in settlements/auction_financials — NOT here.

BEGIN;

-- New enums
CREATE TYPE fuel_type        AS ENUM ('diesel', 'gas', 'kerosene', 'natural_gas', 'electric', 'other', 'none');
CREATE TYPE listing_condition AS ENUM ('excellent', 'good', 'fair', 'poor');
CREATE TYPE usage_unit       AS ENUM ('hours', 'miles');

ALTER TABLE equipment_listings
    ADD COLUMN make              TEXT,
    ADD COLUMN model             TEXT,
    ADD COLUMN year              INT,
    ADD COLUMN serial_number     TEXT,
    ADD COLUMN vin               TEXT,
    ADD COLUMN subcategory       TEXT,
    ADD COLUMN usage_value       NUMERIC(12,1),
    ADD COLUMN usage_unit        usage_unit,
    ADD COLUMN horsepower        INT,
    ADD COLUMN weight_rating_lbs INT,
    ADD COLUMN fuel_type         fuel_type,
    ADD COLUMN condition         listing_condition,
    ADD COLUMN runs              BOOLEAN,
    ADD COLUMN current_bid       NUMERIC(14,2),
    ADD COLUMN winning_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN parent_listing_id UUID REFERENCES equipment_listings(id) ON DELETE SET NULL;

-- Index for looking up attachments by their parent equipment
CREATE INDEX idx_listings_parent ON equipment_listings(parent_listing_id);

COMMIT;
