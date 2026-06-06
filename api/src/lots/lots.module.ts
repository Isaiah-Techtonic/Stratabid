import { Module } from '@nestjs/common';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LotsController],
  providers: [LotsService, PrismaService],
})
export class LotsModule {}
