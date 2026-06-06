import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';

// All endpoints here are PUBLIC — no auth guard. Only published content.
@Controller('public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('auctions')
  auctions(@Query('status') status?: string, @Query('q') q?: string) {
    return this.pub.auctions({ status, q });
  }

  @Get('featured')
  featured() {
    return this.pub.featured();
  }

  @Get('auctions/:id')
  auctionDetail(@Param('id') id: string) {
    return this.pub.auctionDetail(id);
  }

  @Get('listings/:id')
  listingDetail(@Param('id') id: string) {
    return this.pub.listingDetail(id);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.pub.searchListings(q);
  }
}
