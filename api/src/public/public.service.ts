import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const ITEM_PUBLIC = {
  id: true, title: true, description: true, category: true, subcategory: true,
  make: true, model: true, year: true, serial_number: true,
  usage_value: true, usage_unit: true, horsepower: true, weight_rating_lbs: true,
  fuel_type: true, condition: true, runs: true, photos: true,
};

const LOT_PUBLIC = {
  id: true, lot_number: true, title: true, description: true, status: true,
  starting_bid: true, current_bid: true,
  equipment_listings: { select: ITEM_PUBLIC },
};

const PUBLIC_AUCTION = {
  id: true, title: true, description: true, format: true, status: true,
  starts_at: true, ends_at: true, location_city: true, location_state: true,
  cover_image_url: true, created_at: true,
  auction_companies: { select: { id: true, name: true } },
};

// Derive a display title + cover photo for a lot from its items.
function decorateLot(lot: any) {
  const items = lot.equipment_listings || [];
  const first = items[0];
  const displayTitle = lot.title
    || (items.length === 1 && first ? first.title
        : items.length > 1 ? `${items.length} items` : `Lot ${lot.lot_number}`);
  const cover = (first?.photos && first.photos[0]) || null;
  return { ...lot, display_title: displayTitle, cover_photo: cover, item_count: items.length };
}

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

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

  async featured() {
    return this.prisma.auctions.findMany({
      where: { status: { in: ['scheduled', 'live'] } },
      select: PUBLIC_AUCTION, orderBy: { starts_at: 'asc' }, take: 6,
    });
  }

  // Auction + its public lots (lots that are not draft), each decorated from items.
  async auctionDetail(id: string) {
    const auction = await this.prisma.auctions.findUnique({ where: { id }, select: PUBLIC_AUCTION });
    if (!auction || auction.status === 'draft') throw new NotFoundException('Auction not found');
    const lots = await this.prisma.lots.findMany({
      where: { auction_id: id, status: { not: 'draft' } },
      select: LOT_PUBLIC,
      orderBy: [{ sort_order: 'asc' }, { lot_number: 'asc' }],
    });
    return { auction, lots: lots.map(decorateLot) };
  }

  // One lot's public detail (with all its items) + parent auction.
  async lotDetail(id: string) {
    const lot = await this.prisma.lots.findUnique({
      where: { id },
      select: { ...LOT_PUBLIC, auctions: { select: PUBLIC_AUCTION } },
    });
    if (!lot || (lot.status as string) === 'draft') throw new NotFoundException('Lot not found');
    return decorateLot(lot);
  }

  async searchLots(q: string) {
    if (!q) return [];
    const items = await this.prisma.equipment_listings.findMany({
      where: {
        status: 'approved',
        lot_id: { not: null },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { make: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { lot_id: true },
      take: 100,
    });
    const lotIds = [...new Set(items.map((i) => i.lot_id).filter(Boolean))] as string[];
    if (!lotIds.length) return [];
    const lots = await this.prisma.lots.findMany({
      where: { id: { in: lotIds }, status: { not: 'draft' } },
      select: { ...LOT_PUBLIC, auctions: { select: { id: true, title: true } } },
    });
    return lots.map(decorateLot);
  }
}
