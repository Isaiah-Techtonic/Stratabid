-- StrataBid — initial schema (migration 001)
-- PostgreSQL 16+
--
-- Design notes:
--  * Master Admin = users.role = 'admin'. Everyone else = 'user'; their
--    in-company power comes from a company_users row (owner/manager/staff).
--  * Sensitive money data (commission, premium, tax, overrides, settlement
--    amounts) lives in auction_financials + settlements, NOT on the public
--    tables. Bidder-facing queries never join these, so the data can't leak.
--  * All ids are UUIDs. All money is NUMERIC(14,2) — never float.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive email matching

-- ---------------------------------------------------------------------------
-- Enumerated types (status fields)
-- ---------------------------------------------------------------------------

CREATE TYPE user_role           AS ENUM ('admin', 'user');
CREATE TYPE company_user_role   AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE auction_status       AS ENUM ('draft', 'scheduled', 'live', 'paused', 'completed');
CREATE TYPE auction_format       AS ENUM ('timed', 'live_webcast');
CREATE TYPE listing_category     AS ENUM ('vehicle', 'trailer', 'equipment', 'other');
CREATE TYPE listing_status       AS ENUM ('submitted', 'approved', 'rejected', 'withdrawn', 'sold', 'passed');
CREATE TYPE registration_status  AS ENUM ('pending', 'approved', 'denied', 'suspended');
CREATE TYPE bid_origin           AS ENUM ('online', 'floor', 'absentee', 'proxy');
CREATE TYPE commission_type      AS ENUM ('percentage', 'flat');
CREATE TYPE settlement_status    AS ENUM ('draft', 'finalized', 'paid');

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    full_name       TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'user',
    phone           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auction_companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    owner_email     CITEXT NOT NULL,
    phone           TEXT,
    address         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join: which users work for which company, and in what role
CREATE TABLE company_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES auction_companies(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            company_user_role NOT NULL DEFAULT 'staff',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

CREATE TABLE auctions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES auction_companies(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    format          auction_format NOT NULL DEFAULT 'timed',
    status          auction_status NOT NULL DEFAULT 'draft',
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,        -- timed auctions: scheduled close
    anti_snipe_secs INT NOT NULL DEFAULT 120,  -- extend on late bids
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE equipment_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id      UUID REFERENCES auctions(id) ON DELETE SET NULL,
    consignor_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    lot_number      INT,
    title           TEXT NOT NULL,
    description     TEXT,
    category        listing_category NOT NULL DEFAULT 'equipment',
    status          listing_status NOT NULL DEFAULT 'submitted',
    starting_bid    NUMERIC(14,2) NOT NULL DEFAULT 0,
    reserve_price   NUMERIC(14,2),       -- nullable; visible to company only
    photos          JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (auction_id, lot_number)
);

CREATE TABLE auction_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id      UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          registration_status NOT NULL DEFAULT 'pending',
    bidder_number   INT,                 -- assigned on approval
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (auction_id, user_id),
    UNIQUE (auction_id, bidder_number)
);

CREATE TABLE bids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
    bidder_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    origin          bid_origin NOT NULL DEFAULT 'online',
    max_amount      NUMERIC(14,2),       -- proxy/absentee ceiling, nullable
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auction_notification_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id      UUID REFERENCES auctions(id) ON DELETE CASCADE,
    notify_outbid   BOOLEAN NOT NULL DEFAULT true,
    notify_starting BOOLEAN NOT NULL DEFAULT true,
    notify_won      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, auction_id)
);

-- ---------------------------------------------------------------------------
-- Sensitive financial data — ISOLATED.
-- Only Master Admin + Company Admin queries ever touch these tables.
-- Bidder/seller-facing endpoints must never join them.
-- ---------------------------------------------------------------------------

-- Per-auction commission / premium / tax configuration
CREATE TABLE auction_financials (
    auction_id          UUID PRIMARY KEY REFERENCES auctions(id) ON DELETE CASCADE,
    commission_type     commission_type NOT NULL DEFAULT 'percentage',
    commission_rate     NUMERIC(6,4),     -- e.g. 0.1000 = 10%
    commission_flat     NUMERIC(14,2),
    buyer_premium_pct   NUMERIC(6,4) NOT NULL DEFAULT 0,  -- e.g. 0.1000 = 10%
    tax_pct             NUMERIC(6,4) NOT NULL DEFAULT 0,
    internal_notes      TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-sold-lot settlement record (winner, final price, computed + overrides)
CREATE TABLE settlements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id          UUID NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
    winning_bid_id      UUID REFERENCES bids(id) ON DELETE SET NULL,
    final_sale_price    NUMERIC(14,2),
    buyer_premium       NUMERIC(14,2),
    tax_amount          NUMERIC(14,2),
    commission_amount   NUMERIC(14,2),
    commission_override NUMERIC(14,2),    -- nullable; admin override
    net_to_consignor    NUMERIC(14,2),
    net_override        NUMERIC(14,2),    -- nullable; admin override
    settlement_notes    TEXT,
    status              settlement_status NOT NULL DEFAULT 'draft',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for the hot paths
-- ---------------------------------------------------------------------------

CREATE INDEX idx_company_users_user       ON company_users(user_id);
CREATE INDEX idx_company_users_company    ON company_users(company_id);
CREATE INDEX idx_auctions_company         ON auctions(company_id);
CREATE INDEX idx_auctions_status          ON auctions(status);
CREATE INDEX idx_listings_auction         ON equipment_listings(auction_id);
CREATE INDEX idx_listings_consignor       ON equipment_listings(consignor_id);
CREATE INDEX idx_listings_status          ON equipment_listings(status);
CREATE INDEX idx_registrations_auction    ON auction_registrations(auction_id);
CREATE INDEX idx_registrations_user       ON auction_registrations(user_id);
-- Bids: the live-auction hot path. Find the high bid on a lot fast.
CREATE INDEX idx_bids_listing_amount      ON bids(listing_id, amount DESC);
CREATE INDEX idx_bids_bidder              ON bids(bidder_id);

COMMIT;
