import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService, PrismaService],
})
export class AuctionsModule {}
