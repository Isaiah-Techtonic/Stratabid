import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Actor = { sub: string; email: string; role: string };

@Injectable()
export class AuctionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.auctions.findMany({
      select: {
        id: true, title: true, description: true, format: true, status: true,
        starts_at: true, ends_at: true, location_city: true, location_state: true,
        open_for_submissions: true, created_at: true,
        auction_companies: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Public list of auctions currently open for submissions (for sellers).
  async openForSubmissions() {
    return this.prisma.auctions.findMany({
      where: { open_for_submissions: true },
      select: {
        id: true, title: true, description: true, starts_at: true, ends_at: true,
        location_city: true, location_state: true,
        auction_companies: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: any) {
    const company = await this.prisma.auction_companies.findUnique({
      where: { id: data.company_id }, select: { id: true },
    });
    if (!company) throw new BadRequestException('Unknown company_id');
    return this.prisma.auctions.create({
      data: {
        company_id: data.company_id, title: data.title, description: data.description ?? null,
        format: data.format === 'live_webcast' ? 'live_webcast' : 'timed', status: 'draft',
        starts_at: data.starts_at ? new Date(data.starts_at) : null,
        ends_at: data.ends_at ? new Date(data.ends_at) : null,
        location_city: data.location_city ?? null, location_state: data.location_state ?? null,
      },
      select: { id: true, title: true, status: true, company_id: true },
    });
  }

  // Toggle whether an auction accepts seller submissions. Company staff or admin only.
  async setOpenForSubmissions(actor: Actor, auctionId: string, open: boolean) {
    const auction = await this.prisma.auctions.findUnique({
      where: { id: auctionId }, select: { company_id: true },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    if (actor.role !== 'admin') {
      const membership = await this.prisma.company_users.findFirst({
        where: { company_id: auction.company_id, user_id: actor.sub }, select: { role: true },
      });
      if (!membership) throw new ForbiddenException('You cannot modify this auction');
    }
    return this.prisma.auctions.update({
      where: { id: auctionId }, data: { open_for_submissions: open },
      select: { id: true, open_for_submissions: true },
    });
  }

  // Advance auction lifecycle. When going live, stamp each lot's ends_at from the auction.
  async setStatus(actor: Actor, auctionId: string, status: string) {
    const valid = ['draft','scheduled','live','paused','completed','cancelled'];
    if (!valid.includes(status)) throw new BadRequestException('Invalid status');
    const auction = await this.prisma.auctions.findUnique({
      where: { id: auctionId }, select: { company_id: true, ends_at: true },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    if (actor.role !== 'admin') {
      const m = await this.prisma.company_users.findFirst({
        where: { company_id: auction.company_id, user_id: actor.sub }, select: { role: true },
      });
      if (!m || (m.role !== 'owner' && m.role !== 'manager')) {
        throw new ForbiddenException('Only an owner or manager can change auction status');
      }
    }
    await this.prisma.auctions.update({ where: { id: auctionId }, data: { status: status as any } });
    // Going live: set ends_at on any lot that doesn't have one yet, from the auction end.
    if (status === 'live' && auction.ends_at) {
      await this.prisma.equipment_listings.updateMany({
        where: { auction_id: auctionId, ends_at: null, status: 'approved' },
        data: { ends_at: auction.ends_at },
      });
    }
    return { id: auctionId, status };
  }

}
