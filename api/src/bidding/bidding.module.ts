import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BiddingController],
  providers: [
    BiddingService,
    PrismaService,
    {
      // Dedicated publisher connection for bid-update fanout (see realtime service).
      provide: 'REDIS_PUB',
      useFactory: () => new Redis(process.env.REDIS_URL || 'redis://redis:6379'),
    },
  ],
})
export class BiddingModule {}
