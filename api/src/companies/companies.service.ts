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
}
