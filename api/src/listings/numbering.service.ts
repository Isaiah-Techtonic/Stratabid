import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NumberingService {
  constructor(private prisma: PrismaService) {}

  // Compute the next auto item number for an auction, honoring the company's
  // numbering_start. Numbers are sequential per auction and stable once set.
  async nextItemNumber(auctionId: string): Promise<number> {
    const auction = await this.prisma.auctions.findUnique({
      where: { id: auctionId },
      select: { auction_companies: { select: { numbering_start: true } } },
    });
    const start = auction?.auction_companies?.numbering_start ?? 1;

    const max = await this.prisma.equipment_listings.aggregate({
      where: { auction_id: auctionId, item_number: { not: null } },
      _max: { item_number: true },
    });
    const current = max._max.item_number;
    return current == null ? start : current + 1;
  }

  // Returns the company's numbering settings for an auction.
  async companyNumbering(auctionId: string) {
    const auction = await this.prisma.auctions.findUnique({
      where: { id: auctionId },
      select: {
        auction_companies: {
          select: { numbering_mode: true, numbering_start: true, numbering_prefix: true },
        },
      },
    });
    return auction?.auction_companies ?? { numbering_mode: 'auto', numbering_start: 1, numbering_prefix: false };
  }
}
