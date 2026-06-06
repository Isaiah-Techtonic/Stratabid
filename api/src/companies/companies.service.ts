import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; owner_email: string; phone?: string; address?: string }) {
    return this.prisma.auction_companies.create({
      data: {
        name: data.name,
        owner_email: data.owner_email,
        phone: data.phone ?? null,
        address: data.address ?? null,
      },
      select: { id: true, name: true, owner_email: true, created_at: true },
    });
  }

  async findAll() {
    return this.prisma.auction_companies.findMany({
      select: { id: true, name: true, owner_email: true, phone: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSettings(id: string) {
    const c = await this.prisma.auction_companies.findUnique({
      where: { id },
      select: { id: true, name: true, numbering_mode: true, numbering_start: true, numbering_prefix: true },
    });
    return c;
  }

  async updateNumbering(id: string, data: { numbering_mode?: string; numbering_start?: number; numbering_prefix?: boolean }) {
    return this.prisma.auction_companies.update({
      where: { id },
      data: {
        numbering_mode: data.numbering_mode === 'manual' ? 'manual' : (data.numbering_mode === 'auto' ? 'auto' : undefined),
        numbering_start: data.numbering_start ?? undefined,
        numbering_prefix: typeof data.numbering_prefix === 'boolean' ? data.numbering_prefix : undefined,
      },
      select: { id: true, numbering_mode: true, numbering_start: true, numbering_prefix: true },
    });
  }

}
