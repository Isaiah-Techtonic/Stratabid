import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Columns safe for fully public display — no financial/settlement data.
const PUBLIC_LISTING = {
  id: true, auction_id: true, lot_number: true, title: true, description: true,
  category: true, subcategory: true, status: true,
  make: true, model: true, year: true, serial_number: true,
  usage_value: true, usage_unit: true, horsepower: true, weight_rating_lbs: true,
  fuel_type: true, condition: true, runs: true,
  starting_bid: true, current_bid: true, photos: true, created_at: true,
};

const PUBLIC_AUCTION = {
  id: true, title: true, description: true, format: true, status: true,
  starts_at: true, ends_at: true, location_city: true, location_state: true,
  cover_image_url: true, created_at: true,
  auction_companies: { select: { id: true, name: true } },
};

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  // Auctions visible to the public: anything not in draft (scheduled/live/paused/completed).
  async auctions(opts: { status?: string; q?: string } = {}) {
    const where: any = { status: { not: 'draft' } };
    if (opts.status) where.status = opts.status;
    if (opts.q) {
      where.OR = [
        { title: { contains: opts.q, mode: 'insensitive' } },
        { description: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.auctions.findMany({
      where, select: PUBLIC_AUCTION,
      orderBy: [{ status: 'asc' }, { starts_at: 'asc' }, { created_at: 'desc' }],
    });
  }

  // Featured = a few of the soonest upcoming/live auctions, for the homepage.
  async featured() {
    return this.prisma.auctions.findMany({
      where: { status: { in: ['scheduled', 'live'] } },
      select: PUBLIC_AUCTION,
      orderBy: { starts_at: 'asc' },
      take: 6,
    });
  }

  // One auction + its APPROVED lots (never submitted/rejected).
  async auctionDetail(id: string) {
    const auction = await this.prisma.auctions.findUnique({ where: { id }, select: PUBLIC_AUCTION });
    if (!auction || auction.status === 'draft') throw new NotFoundException('Auction not found');
    const lots = await this.prisma.equipment_listings.findMany({
      where: { auction_id: id, status: { in: ['approved', 'sold'] } },
      select: PUBLIC_LISTING,
      orderBy: [{ lot_number: 'asc' }, { created_at: 'asc' }],
    });
    return { auction, lots };
  }

  // A single approved lot's public detail.
  async listingDetail(id: string) {
    const lot = await this.prisma.equipment_listings.findUnique({
      where: { id },
      select: { ...PUBLIC_LISTING, auctions: { select: PUBLIC_AUCTION } },
    });
    if (!lot || !['approved', 'sold'].includes(lot.status as string)) {
      throw new NotFoundException('Listing not found');
    }
    return lot;
  }

  // Public search across approved lots.
  async searchListings(q: string) {
    if (!q) return [];
    return this.prisma.equipment_listings.findMany({
      where: {
        status: { in: ['approved', 'sold'] },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { make: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: PUBLIC_LISTING,
      take: 50,
      orderBy: { created_at: 'desc' },
    });
  }
}
