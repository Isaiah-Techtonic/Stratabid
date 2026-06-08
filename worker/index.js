// StrataBid worker — timed-bidding auto-close.
//
// On a fixed interval, finds approved items whose ends_at has passed (in a live
// auction) and closes each one, then completes auctions whose items have all
// closed. Mirrors the bid engine's transaction discipline (api/src/bidding):
// the item row is locked FOR UPDATE so a close can never interleave with an
// in-flight bid (or an anti-snipe ends_at extension), and every close is guarded
// by `status = 'approved'` so an item can never be double-closed — including
// across multiple worker replicas.
//
// After each close commits, we publish a `closed` update to the Redis
// `bid-updates` channel; the realtime service fans it out to everyone watching
// the item's room (it keys on `item_id`). A publish failure never undoes an
// already-committed close — same post-commit, best-effort pattern as the api.

const { Pool } = require('pg');
const Redis = require('ioredis');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://stratabid:stratabid@db:5432/stratabid';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = 'bid-updates';

// How often to sweep for due items. Kept short (timed auctions close to the
// second, modulo anti-snipe) but not so tight that ticks pile up.
const INTERVAL_MS = Number(process.env.CLOSE_INTERVAL_MS) || 20000;

const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
pool.on('error', (e) => console.error('[worker] pg pool error:', e.message));

// Dedicated publisher connection (matches the api's REDIS_PUB provider).
const pub = new Redis(REDIS_URL);
pub.on('error', (e) => console.error('[worker] redis pub error:', e.message));
pub.on('connect', () => console.log('[worker] redis connected'));

const log = (msg) => console.log(`[worker] ${new Date().toISOString()} ${msg}`);

// Publish a closed item's final bid-state. Required field for realtime is
// `item_id`; `type: 'closed'` lets clients distinguish a close from a live bid.
async function publishClosed(item) {
  try {
    await pub.publish(
      CHANNEL,
      JSON.stringify({
        item_id: item.id,
        type: 'closed',
        status: item.status,
        current_bid: item.current_bid,
        bid_count: item.bid_count,
        reserve_met: item.reserve_met,
        winning_bidder_id: item.winning_bidder_id,
        ends_at: item.ends_at,
      }),
    );
  } catch (e) {
    console.error('[worker] bid-updates publish failed:', e.message);
  }
}

// Close a single item inside its own transaction. Returns the closed item row
// (for the post-commit publish) or null if there was nothing to do.
async function closeItem(itemId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row; re-read state under the lock. now() is the DB clock, so the
    // worker and the bid engine agree on whether the lot is past due.
    const { rows } = await client.query(
      `SELECT id, auction_id, status, current_bid, current_max_bid,
              winning_bidder_id, reserve_price, reserve_met, bid_count, ends_at,
              (ends_at IS NOT NULL AND ends_at <= now()) AS is_due
       FROM equipment_listings
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    const item = rows[0];
    // Re-check under the lock: a concurrent bid may have closed it already,
    // changed its status, or pushed ends_at out via anti-snipe. All idempotent.
    if (!item || item.status !== 'approved' || !item.is_due) {
      await client.query('ROLLBACK');
      return null;
    }

    const hasWinner = item.winning_bidder_id != null;
    const reserveMet =
      item.reserve_price == null ||
      (item.current_bid != null && Number(item.current_bid) >= Number(item.reserve_price));
    const newStatus = hasWinner && reserveMet ? 'sold' : 'passed';

    // The `status = 'approved'` guard is the idempotency backstop: if another
    // worker won the race between our SELECT and UPDATE, this matches 0 rows.
    const upd = await client.query(
      `UPDATE equipment_listings
       SET status = $2::listing_status, reserve_met = $3, updated_at = now()
       WHERE id = $1 AND status = 'approved'`,
      [itemId, newStatus, reserveMet],
    );

    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('COMMIT');
    return { ...item, status: newStatus, reserve_met: reserveMet };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* connection already broken */ }
    console.error(`[worker] close failed for item ${itemId}:`, e.message);
    return null;
  } finally {
    client.release();
  }
}

// If every item in the auction has left 'approved', the auction is done. One
// atomic guarded statement → idempotent, and the live→completed guard means it
// only ever flips once even if several items close in the same tick.
async function maybeCompleteAuction(auctionId) {
  try {
    const res = await pool.query(
      `UPDATE auctions
       SET status = 'completed', updated_at = now()
       WHERE id = $1
         AND status = 'live'
         AND NOT EXISTS (
           SELECT 1 FROM equipment_listings
           WHERE auction_id = $1 AND status = 'approved'
         )`,
      [auctionId],
    );
    if (res.rowCount > 0) log(`auction ${auctionId} → completed (all items closed)`);
  } catch (e) {
    console.error(`[worker] auction-complete failed for ${auctionId}:`, e.message);
  }
}

async function tick() {
  // Candidate due items: approved, past their close time, in a live auction.
  // (We don't auto-close items in paused/draft auctions.) Each is then
  // re-validated under a row lock inside closeItem().
  const { rows } = await pool.query(
    `SELECT e.id
     FROM equipment_listings e
     JOIN auctions a ON a.id = e.auction_id
     WHERE e.status = 'approved'
       AND e.ends_at IS NOT NULL
       AND e.ends_at <= now()
       AND a.status = 'live'
     ORDER BY e.ends_at ASC`,
  );
  if (rows.length === 0) return;

  log(`found ${rows.length} due item(s) to close`);
  const touchedAuctions = new Set();

  for (const { id } of rows) {
    const closed = await closeItem(id);
    if (!closed) continue;
    log(`item ${id} → ${closed.status}` +
      (closed.status === 'sold' ? ` (winner ${closed.winning_bidder_id})` : ''));
    await publishClosed(closed);
    if (closed.auction_id) touchedAuctions.add(closed.auction_id);
  }

  for (const auctionId of touchedAuctions) {
    await maybeCompleteAuction(auctionId);
  }
}

// Single-flight: never let a slow sweep overlap the next interval.
let running = false;
async function safeTick() {
  if (running) return;
  running = true;
  try {
    await tick();
  } catch (e) {
    console.error('[worker] tick error:', e.message);
  } finally {
    running = false;
  }
}

log(`auto-close worker started (interval ${INTERVAL_MS}ms)`);
safeTick();
const timer = setInterval(safeTick, INTERVAL_MS);

// Graceful shutdown so an in-flight close commits before we exit.
async function shutdown(sig) {
  log(`received ${sig}, shutting down`);
  clearInterval(timer);
  try { await pool.end(); } catch { /* ignore */ }
  try { pub.disconnect(); } catch { /* ignore */ }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
