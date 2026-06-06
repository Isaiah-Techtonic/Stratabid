import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  // Public catalog of a given auction
  @Get()
  findByAuction(@Query('auction_id') auctionId: string) {
    if (!auctionId) throw new BadRequestException('auction_id query param is required');
    return this.listings.findByAuction(auctionId);
  }

  // Seller's own submissions — must come before :id route
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Req() req: Request) {
    return this.listings.mySubmissions((req as any).user.sub);
  }

  // Company review queue for an auction
  @UseGuards(JwtAuthGuard)
  @Get('review-queue')
  reviewQueue(@Req() req: Request, @Query('auction_id') auctionId: string) {
    if (!auctionId) throw new BadRequestException('auction_id is required');
    return this.listings.reviewQueue((req as any).user, auctionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listings.findOne(id);
  }

  // Seller submits equipment to an open auction
  @UseGuards(JwtAuthGuard)
  @Post()
  submit(@Req() req: Request, @Body() body: any) {
    return this.listings.submit((req as any).user.sub, body);
  }

  // Company approves/rejects (with optional pricing overrides)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/review')
  review(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { decision?: string; starting_bid?: number; reserve_price?: number; lot_number?: number },
  ) {
    if (body?.decision !== 'approved' && body?.decision !== 'rejected') {
      throw new BadRequestException('decision must be "approved" or "rejected"');
    }
    return this.listings.review((req as any).user, id, body.decision, body);
  }
}
