import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { BiddingService } from './bidding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bidding')
export class BiddingController {
  constructor(private readonly bidding: BiddingService) {}

  // Public: current bidding state of a lot (no hidden max revealed).
  @Get('items/:id')
  itemState(@Param('id') id: string) {
    return this.bidding.itemState(id);
  }

  // Place a proxy/max bid (any logged-in user).
  @UseGuards(JwtAuthGuard)
  @Post('items/:id')
  placeBid(@Req() req: Request, @Param('id') id: string, @Body() body: { max_amount?: number }) {
    if (body?.max_amount == null) throw new BadRequestException('max_amount is required');
    return this.bidding.placeBid((req as any).user, id, Number(body.max_amount));
  }

  // The current user's own bids on a lot.
  @UseGuards(JwtAuthGuard)
  @Get('items/:id/mine')
  myBids(@Req() req: Request, @Param('id') id: string) {
    return this.bidding.myBids((req as any).user, id);
  }
}
