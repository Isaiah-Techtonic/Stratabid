-- StrataBid — migration 005: backfill remaining BoltBid fields
-- Adds company branding, auction media/stream, bidder & user contact details.
-- Sensitive financial data remains isolated in settlements/auction_financials.

-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block,
-- so the 'cancelled' status addition is done first, outside the BEGIN/COMMIT.
ALTER TYPE auction_status ADD VALUE IF NOT EXISTS 'cancelled';

BEGIN;

-- New enum for company approval status
CREATE TYPE company_status AS ENUM ('pending', 'approved', 'suspended');

-- auction_companies: branding + address + status
ALTER TABLE auction_companies
    ADD COLUMN logo_url        TEXT,
    ADD COLUMN primary_color   TEXT DEFAULT '#1e3a5f',
    ADD COLUMN secondary_color TEXT DEFAULT '#d97706',
    ADD COLUMN website         TEXT,
    ADD COLUMN city            TEXT,
    ADD COLUMN state           TEXT,
    ADD COLUMN zip_code        TEXT,
    ADD COLUMN status          company_status NOT NULL DEFAULT 'pending';

-- auctions: media, stream, current lot, zip
ALTER TABLE auctions
    ADD COLUMN zip_code           TEXT,
    ADD COLUMN cover_image_url     TEXT,
    ADD COLUMN youtube_stream_url  TEXT,
    ADD COLUMN current_lot_id      UUID REFERENCES equipment_listings(id) ON DELETE SET NULL;

-- auction_registrations: bidder contact details
ALTER TABLE auction_registrations
    ADD COLUMN full_name TEXT,
    ADD COLUMN phone     TEXT,
    ADD COLUMN address   TEXT,
    ADD COLUMN city      TEXT,
    ADD COLUMN state     TEXT,
    ADD COLUMN zip_code  TEXT;

-- users: contact details + profile picture
ALTER TABLE users
    ADD COLUMN address             TEXT,
    ADD COLUMN city                TEXT,
    ADD COLUMN state               TEXT,
    ADD COLUMN zip_code            TEXT,
    ADD COLUMN profile_picture_url TEXT;

COMMIT;
