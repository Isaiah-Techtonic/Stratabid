import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('auctions')
  auctions(@Query('status') status?: string, @Query('q') q?: string) {
    return this.pub.auctions({ status, q });
  }

  @Get('featured')
  featured() { return this.pub.featured(); }

  @Get('auctions/:id')
  auctionDetail(@Param('id') id: string) { return this.pub.auctionDetail(id); }

  @Get('lots/:id')
  lotDetail(@Param('id') id: string) { return this.pub.lotDetail(id); }

  @Get('search')
  search(@Query('q') q: string) { return this.pub.searchLots(q); }
}
