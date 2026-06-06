import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

// Default increment tiers if an auction hasn't configured its own.
const DEFAULT_TIERS = [
  { min: 0, inc: 10 },
  { min: 100, inc: 25 },
  { min: 500, inc: 50 },
  { min: 1000, inc: 100 },
  { min: 5000, inc: 250 },
  { min: 25000, inc: 1000 },
];

type Actor = { sub: string; email: string; role: string };

@Injectable()
export class BiddingService {
  constructor(private prisma: PrismaService) {}

  // Determine the bid increment that applies at a given price, per the auction's tiers.
  private incrementFor(price: number, tiers: { min: number; inc: number }[]): number {
    const applicable = tiers
      .filter((t) => price >= t.min)
      .sort((a, b) => b.min - a.min)[0];
    return applicable ? applicable.inc : tiers[0].inc;
  }

  private async tiersForAuction(auctionId: string): Promise<{ min: number; inc: number }[]> {
    const rows = await this.prisma.bid_increments.findMany({
      where: { auction_id: auctionId },
      orderBy: { min_amount: 'asc' },
    });
    if (!rows.length) return DEFAULT_TIERS;
    return rows.map((r) => ({ min: Number(r.min_amount), inc: Number(r.increment) }));
  }

  // Public lot bidding state (no hidden max revealed).
  async itemState(itemId: string) {
    const item = await this.prisma.equipment_listings.findUnique({
      where: { id: itemId },
      select: {
        id: true, item_number: true, title: true, status: true, current_bid: true,
        reserve_price: true, reserve_met: true, bid_count: true, ends_at: true,
        winning_bidder_id: true, auction_id: true,
        auctions: { select: { id: true, status: true } },
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  /**
   * Place a proxy (max) bid. Transaction-safe: locks the lot row so concurrent
   * bids resolve one at a time, preventing two winners or stale high bids.
   *
   * Proxy logic:
   *  - bidder submits maxAmount (the most they'll pay)
   *  - if there's no current bid, price = max(start, current) and bidder leads
   *  - if bidder's max <= current price, reject (must beat current price)
   *  - if bidder's max beats the leader's hidden max: bidder leads, price =
   *    one increment above the leader's max (capped at bidder's max)
   *  - if leader's max still >= bidder's max: leader stays, price = one increment
   *    above bidder's max (capped at leader's max)
   */
  async placeBid(actor: Actor, itemId: string, maxAmount: number) {
    if (!(maxAmount > 0)) throw new BadRequestException('Bid amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      // Lock the lot row for the duration of this transaction.
      const locked = await tx.$queryRaw<any[]>(
        Prisma.sql`SELECT id, auction_id, status, current_bid, current_max_bid,
                          winning_bidder_id, reserve_price, ends_at, bid_count
                   FROM equipment_listings WHERE id = ${itemId}::uuid FOR UPDATE`,
      );
      if (!locked.length) throw new NotFoundException('Item not found');
      const lot = locked[0];

      // Auction/lot must be live to accept bids.
      const auction = await tx.auctions.findUnique({
        where: { id: lot.auction_id }, select: { status: true, anti_snipe_secs: true },
      });
      if (!auction || auction.status !== 'live') {
        throw new BadRequestException('This auction is not currently live');
      }
      if (lot.ends_at && new Date(lot.ends_at) < new Date()) {
        throw new BadRequestException('Bidding on this lot has closed');
      }
      if (lot.winning_bidder_id === actor.sub && Number(lot.current_max_bid) >= maxAmount) {
        throw new BadRequestException('You are already the high bidder at or above that amount');
      }

      const tiers = await this.tiersForAuction(lot.auction_id);
      const currentPrice = lot.current_bid != null ? Number(lot.current_bid) : 0;
      const leaderMax = lot.current_max_bid != null ? Number(lot.current_max_bid) : null;
      const hasLeader = lot.winning_bidder_id != null && leaderMax != null;

      let newPrice: number;
      let newLeader: string;
      let newMax: number;

      if (!hasLeader) {
        // First bid: price starts at the lot's effective minimum (current price or 0).
        newPrice = currentPrice > 0 ? currentPrice : 0;
        // First bid sets price at the opening level; bidder leads with their max.
        if (maxAmount <= newPrice) {
          throw new BadRequestException(`Bid must be at least ${newPrice}`);
        }
        newPrice = newPrice === 0 ? this.incrementFor(0, tiers) : newPrice;
        // If somehow max is below the opening increment, reject.
        if (maxAmount < newPrice) newPrice = maxAmount;
        newLeader = actor.sub;
        newMax = maxAmount;
      } else if (actor.sub === lot.winning_bidder_id) {
        // Current leader raising their own max — price unchanged, max increases.
        newPrice = currentPrice;
        newLeader = actor.sub;
        newMax = maxAmount;
      } else {
        // Challenger vs leader.
        const minToBid = currentPrice + this.incrementFor(currentPrice, tiers);
        if (maxAmount < minToBid) {
          throw new BadRequestException(`Bid must be at least ${minToBid}`);
        }
        if (maxAmount > leaderMax!) {
          // Challenger wins the lead. Price = one increment over leader's max, capped at challenger max.
          const step = this.incrementFor(leaderMax!, tiers);
          newPrice = Math.min(leaderMax! + step, maxAmount);
          newLeader = actor.sub;
          newMax = maxAmount;
        } else {
          // Leader holds. Price rises to one increment over challenger's max, capped at leader's max.
          const step = this.incrementFor(maxAmount, tiers);
          newPrice = Math.min(maxAmount + step, leaderMax!);
          newLeader = lot.winning_bidder_id;
          newMax = leaderMax!;
        }
      }

      const reserveMet = lot.reserve_price == null || newPrice >= Number(lot.reserve_price);

      // Anti-snipe: if within the window, push ends_at out.
      let endsAt = lot.ends_at ? new Date(lot.ends_at) : null;
      const snipeSecs = auction.anti_snipe_secs || 0;
      if (endsAt && snipeSecs > 0) {
        const remaining = (endsAt.getTime() - Date.now()) / 1000;
        if (remaining < snipeSecs) endsAt = new Date(Date.now() + snipeSecs * 1000);
      }

      // Record the bid (the actor's own max).
      await tx.bids.create({
        data: {
          item_id: itemId, bidder_id: actor.sub,
          amount: new Prisma.Decimal(newPrice),
          max_amount: new Prisma.Decimal(maxAmount),
          origin: 'online',
        },
      });

      // Update the lot's authoritative state.
      await tx.equipment_listings.update({
        where: { id: itemId },
        data: {
          current_bid: new Prisma.Decimal(newPrice),
          current_max_bid: new Prisma.Decimal(newMax),
          winning_bidder_id: newLeader,
          reserve_met: reserveMet,
          bid_count: { increment: 1 },
          ends_at: endsAt ?? undefined,
        },
      });

      return {
        item_id: itemId,
        current_bid: newPrice,
        you_are_winning: newLeader === actor.sub,
        reserve_met: reserveMet,
        ends_at: endsAt,
      };
    });
  }

  // A bidder's bid history on a lot (their own bids only).
  async myBids(actor: Actor, itemId: string) {
    return this.prisma.bids.findMany({
      where: { item_id: itemId, bidder_id: actor.sub },
      select: { id: true, amount: true, max_amount: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
