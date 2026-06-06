import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuctionsService {
  constructor(private prisma: PrismaService) {}

  // Public-safe list: only non-sensitive columns; includes the company name.
  async findAll() {
    return this.prisma.auctions.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        format: true,
        status: true,
        starts_at: true,
        ends_at: true,
        location_city: true,
        location_state: true,
        created_at: true,
        auction_companies: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: {
    company_id: string;
    title: string;
    description?: string;
    format?: string;
    starts_at?: string;
    ends_at?: string;
    location_city?: string;
    location_state?: string;
    location_address?: string;
  }) {
    const company = await this.prisma.auction_companies.findUnique({
      where: { id: data.company_id },
      select: { id: true },
    });
    if (!company) throw new BadRequestException('Unknown company_id');

    return this.prisma.auctions.create({
      data: {
        company_id: data.company_id,
        title: data.title,
        description: data.description ?? null,
        format: data.format === 'live_webcast' ? 'live_webcast' : 'timed',
        status: 'draft',
        starts_at: data.starts_at ? new Date(data.starts_at) : null,
        ends_at: data.ends_at ? new Date(data.ends_at) : null,
        location_city: data.location_city ?? null,
        location_state: data.location_state ?? null,
        location_address: data.location_address ?? null,
      },
      select: {
        id: true,
        title: true,
        format: true,
        status: true,
        starts_at: true,
        ends_at: true,
        location_city: true,
        location_state: true,
        company_id: true,
      },
    });
  }
}
