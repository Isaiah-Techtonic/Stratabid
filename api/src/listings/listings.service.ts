import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Public-safe columns for a listing — never settlement/financial data.
const PUBLIC_SELECT = {
  id: true,
  auction_id: true,
  consignor_id: true,
  lot_number: true,
  title: true,
  description: true,
  category: true,
  subcategory: true,
  status: true,
  make: true,
  model: true,
  year: true,
  serial_number: true,
  vin: true,
  usage_value: true,
  usage_unit: true,
  horsepower: true,
  weight_rating_lbs: true,
  fuel_type: true,
  condition: true,
  runs: true,
  starting_bid: true,
  current_bid: true,
  photos: true,
  parent_listing_id: true,
  created_at: true,
};

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async findByAuction(auctionId: string) {
    return this.prisma.equipment_listings.findMany({
      where: { auction_id: auctionId },
      select: PUBLIC_SELECT,
      orderBy: [{ lot_number: 'asc' }, { created_at: 'asc' }],
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.equipment_listings.findUnique({
      where: { id },
      select: PUBLIC_SELECT,
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async create(consignorId: string, data: any) {
    if (!data?.title) throw new BadRequestException('title is required');

    // If this is an attachment, validate the parent listing exists.
    if (data.parent_listing_id) {
      const parent = await this.prisma.equipment_listings.findUnique({
        where: { id: data.parent_listing_id },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException('Unknown parent_listing_id');
    }

    return this.prisma.equipment_listings.create({
      data: {
        auction_id: data.auction_id ?? null,
        consignor_id: consignorId,
        lot_number: data.lot_number ?? null,
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? 'equipment',
        subcategory: data.subcategory ?? null,
        status: 'submitted',
        make: data.make ?? null,
        model: data.model ?? null,
        year: data.year ?? null,
        serial_number: data.serial_number ?? null,
        vin: data.vin ?? null,
        usage_value: data.usage_value ?? null,
        usage_unit: data.usage_unit ?? null,
        horsepower: data.horsepower ?? null,
        weight_rating_lbs: data.weight_rating_lbs ?? null,
        fuel_type: data.fuel_type ?? null,
        condition: data.condition ?? null,
        runs: typeof data.runs === 'boolean' ? data.runs : null,
        starting_bid: data.starting_bid ?? 0,
        reserve_price: data.reserve_price ?? null,
        parent_listing_id: data.parent_listing_id ?? null,
        photos: data.photos ?? [],
      },
      select: PUBLIC_SELECT,
    });
  }

  // Approve or reject a submitted listing (admin / company side).
  async setStatus(id: string, status: 'approved' | 'rejected') {
    const listing = await this.prisma.equipment_listings.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.equipment_listings.update({
      where: { id },
      data: { status },
      select: PUBLIC_SELECT,
    });
  }
}
