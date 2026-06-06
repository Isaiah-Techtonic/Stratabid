import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Actor = { sub: string; email: string; role: string };

const ITEM_PUBLIC = {
  id: true, title: true, description: true, category: true, subcategory: true,
  make: true, model: true, year: true, serial_number: true,
  usage_value: true, usage_unit: true, horsepower: true, weight_rating_lbs: true,
  fuel_type: true, condition: true, runs: true, photos: true, status: true,
};

@Injectable()
export class LotsService {
  constructor(private prisma: PrismaService) {}

  private async auctionCompany(auctionId: string) {
    const a = await this.prisma.auctions.findUnique({ where: { id: auctionId }, select: { company_id: true } });
    if (!a) throw new NotFoundException('Auction not found');
    return a.company_id;
  }

  private async assertManages(actor: Actor, auctionId: string) {
    if (actor.role === 'admin') return;
    const companyId = await this.auctionCompany(auctionId);
    const m = await this.prisma.company_users.findFirst({
      where: { company_id: companyId, user_id: actor.sub }, select: { role: true },
    });
    if (!m) throw new ForbiddenException('You cannot manage lots for this auction');
  }

  // List lots for an auction (company view), each with its items.
  async listForAuction(actor: Actor, auctionId: string) {
    await this.assertManages(actor, auctionId);
    return this.prisma.lots.findMany({
      where: { auction_id: auctionId },
      orderBy: [{ sort_order: 'asc' }, { lot_number: 'asc' }],
      select: {
        id: true, lot_number: true, title: true, description: true, status: true,
        starting_bid: true, reserve_price: true, sort_order: true,
        equipment_listings: { select: ITEM_PUBLIC },
      },
    });
  }

  // Next lot number for an auction.
  private async nextLotNumber(auctionId: string) {
    const max = await this.prisma.lots.aggregate({
      where: { auction_id: auctionId }, _max: { lot_number: true },
    });
    return (max._max.lot_number || 0) + 1;
  }

  // Create a lot (optionally with a title/desc + initial item ids to place in it).
  async createLot(actor: Actor, auctionId: string, data: { title?: string; description?: string; starting_bid?: number; reserve_price?: number; item_ids?: string[] }) {
    await this.assertManages(actor, auctionId);
    const lot_number = await this.nextLotNumber(auctionId);
    const lot = await this.prisma.lots.create({
      data: {
        auction_id: auctionId, lot_number, sort_order: lot_number,
        title: data.title ?? null, description: data.description ?? null,
        starting_bid: data.starting_bid ?? 0, reserve_price: data.reserve_price ?? null,
      },
      select: { id: true, lot_number: true },
    });
    if (data.item_ids?.length) {
      await this.assignItems(actor, lot.id, data.item_ids);
    }
    return lot;
  }

  // Assign (move) items into a lot. Items must belong to the same auction.
  async assignItems(actor: Actor, lotId: string, itemIds: string[]) {
    const lot = await this.prisma.lots.findUnique({ where: { id: lotId }, select: { id: true, auction_id: true } });
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertManages(actor, lot.auction_id);
    if (!itemIds?.length) throw new BadRequestException('No items provided');

    // Only move items that belong to this auction.
    await this.prisma.equipment_listings.updateMany({
      where: { id: { in: itemIds }, auction_id: lot.auction_id },
      data: { lot_id: lotId },
    });
    return { ok: true, assigned: itemIds.length };
  }

  // Remove an item from its lot (back to unassigned).
  async removeItem(actor: Actor, lotId: string, itemId: string) {
    const lot = await this.prisma.lots.findUnique({ where: { id: lotId }, select: { auction_id: true } });
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertManages(actor, lot.auction_id);
    await this.prisma.equipment_listings.updateMany({
      where: { id: itemId, lot_id: lotId }, data: { lot_id: null },
    });
    return { ok: true };
  }

  // Items in an auction not yet placed in any lot (approved only).
  async unassignedItems(actor: Actor, auctionId: string) {
    await this.assertManages(actor, auctionId);
    return this.prisma.equipment_listings.findMany({
      where: { auction_id: auctionId, lot_id: null, status: 'approved' },
      select: ITEM_PUBLIC,
      orderBy: { created_at: 'asc' },
    });
  }

  async updateLot(actor: Actor, lotId: string, data: any) {
    const lot = await this.prisma.lots.findUnique({ where: { id: lotId }, select: { auction_id: true } });
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertManages(actor, lot.auction_id);
    return this.prisma.lots.update({
      where: { id: lotId },
      data: {
        title: data.title ?? undefined, description: data.description ?? undefined,
        starting_bid: data.starting_bid ?? undefined, reserve_price: data.reserve_price ?? undefined,
        sort_order: data.sort_order ?? undefined,
      },
      select: { id: true, lot_number: true, title: true, starting_bid: true, sort_order: true },
    });
  }

  async deleteLot(actor: Actor, lotId: string) {
    const lot = await this.prisma.lots.findUnique({ where: { id: lotId }, select: { auction_id: true } });
    if (!lot) throw new NotFoundException('Lot not found');
    await this.assertManages(actor, lot.auction_id);
    // Items revert to unassigned (FK is ON DELETE SET NULL), then remove the lot.
    await this.prisma.lots.delete({ where: { id: lotId } });
    return { ok: true };
  }
}
