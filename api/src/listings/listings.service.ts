import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NumberingService } from './numbering.service';

const PUBLIC_SELECT = {
  id: true, auction_id: true, consignor_id: true, lot_number: true,
  title: true, description: true, category: true, subcategory: true, status: true,
  make: true, model: true, year: true, serial_number: true, vin: true,
  usage_value: true, usage_unit: true, horsepower: true, weight_rating_lbs: true,
  fuel_type: true, condition: true, runs: true, starting_bid: true, reserve_price: true,
  current_bid: true, photos: true, parent_listing_id: true, created_at: true,
};

type Actor = { sub: string; email: string; role: string };

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService, private numbering: NumberingService) {}

  async findByAuction(auctionId: string) {
    return this.prisma.equipment_listings.findMany({
      where: { auction_id: auctionId },
      select: PUBLIC_SELECT,
      orderBy: [{ lot_number: 'asc' }, { created_at: 'asc' }],
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.equipment_listings.findUnique({ where: { id }, select: PUBLIC_SELECT });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  // Seller submits equipment to an auction that is open for submissions.
  async submit(consignorId: string, data: any) {
    if (!data?.title) throw new BadRequestException('title is required');
    if (!data?.auction_id) throw new BadRequestException('auction_id is required');

    const photos = Array.isArray(data.photos) ? data.photos : [];
    if (photos.length < 1) throw new BadRequestException('At least one photo is required');
    if (photos.length > 10) throw new BadRequestException('A maximum of 10 photos is allowed');

    const auction = await this.prisma.auctions.findUnique({
      where: { id: data.auction_id },
      select: { id: true, open_for_submissions: true, status: true },
    });
    if (!auction) throw new BadRequestException('Unknown auction');
    if (!auction.open_for_submissions) {
      throw new BadRequestException('This auction is not currently accepting submissions');
    }

    return this.prisma.equipment_listings.create({
      data: {
        auction_id: data.auction_id,
        consignor_id: consignorId,
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? 'equipment',
        subcategory: data.subcategory ?? null,
        status: 'submitted',
        make: data.make ?? null, model: data.model ?? null,
        year: data.year ?? null, serial_number: data.serial_number ?? null, vin: data.vin ?? null,
        usage_value: data.usage_value ?? null, usage_unit: data.usage_unit ?? null,
        horsepower: data.horsepower ?? null, weight_rating_lbs: data.weight_rating_lbs ?? null,
        fuel_type: data.fuel_type ?? null, condition: data.condition ?? null,
        runs: typeof data.runs === 'boolean' ? data.runs : null,
        starting_bid: data.starting_bid ?? 0,
        reserve_price: data.reserve_price ?? null,
        photos,
      },
      select: PUBLIC_SELECT,
    });
  }

  // A seller's own listings.
  async mySubmissions(consignorId: string) {
    return this.prisma.equipment_listings.findMany({
      where: { consignor_id: consignorId },
      select: { ...PUBLIC_SELECT, auctions: { select: { id: true, title: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  // Verify the actor can review listings for the auction's company.
  private async assertCanReviewAuction(actor: Actor, auctionId: string) {
    const auction = await this.prisma.auctions.findUnique({
      where: { id: auctionId },
      select: { company_id: true },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    if (actor.role === 'admin') return;
    const membership = await this.prisma.company_users.findFirst({
      where: { company_id: auction.company_id, user_id: actor.sub },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('You cannot review listings for this auction');
  }

  // Company review queue: submitted listings for a given auction.
  async reviewQueue(actor: Actor, auctionId: string) {
    await this.assertCanReviewAuction(actor, auctionId);
    return this.prisma.equipment_listings.findMany({
      where: { auction_id: auctionId, status: 'submitted' },
      select: { ...PUBLIC_SELECT, users: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'asc' },
    });
  }

  // Approve/reject a submitted listing; approval may adjust pricing.
  async review(actor: Actor, listingId: string, decision: 'approved' | 'rejected', overrides?: any) {
    const listing = await this.prisma.equipment_listings.findUnique({
      where: { id: listingId },
      select: { id: true, auction_id: true },
    });
    if (!listing || !listing.auction_id) throw new NotFoundException('Listing not found');
    await this.assertCanReviewAuction(actor, listing.auction_id);

    const data: any = { status: decision };
    if (decision === 'approved') {
      // Reserve may be adjusted at approval; starting bid is no longer used.
      if (overrides?.reserve_price != null) data.reserve_price = overrides.reserve_price;
      // Assign an item number if it doesn't already have one.
      const existing = await this.prisma.equipment_listings.findUnique({
        where: { id: listingId }, select: { item_number: true },
      });
      if (existing && existing.item_number == null) {
        if (overrides?.item_number != null) {
          data.item_number = overrides.item_number; // manual
        } else {
          data.item_number = await this.numbering.nextItemNumber(listing.auction_id);
        }
      }
    }
    return this.prisma.equipment_listings.update({
      where: { id: listingId }, data, select: PUBLIC_SELECT,
    });
  }
}
