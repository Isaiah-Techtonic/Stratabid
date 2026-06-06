import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { NumberingService } from './numbering.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, NumberingService, PrismaService],
})
export class ListingsModule {}
