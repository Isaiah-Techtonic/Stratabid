import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { LotsService } from './lots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('lots')
@UseGuards(JwtAuthGuard)
export class LotsController {
  constructor(private readonly lots: LotsService) {}

  @Get()
  list(@Req() req: Request, @Query('auction_id') auctionId: string) {
    if (!auctionId) throw new BadRequestException('auction_id is required');
    return this.lots.listForAuction((req as any).user, auctionId);
  }

  @Get('unassigned')
  unassigned(@Req() req: Request, @Query('auction_id') auctionId: string) {
    if (!auctionId) throw new BadRequestException('auction_id is required');
    return this.lots.unassignedItems((req as any).user, auctionId);
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    if (!body?.auction_id) throw new BadRequestException('auction_id is required');
    return this.lots.createLot((req as any).user, body.auction_id, body);
  }

  @Post(':id/items')
  assign(@Req() req: Request, @Param('id') id: string, @Body() body: { item_ids?: string[] }) {
    return this.lots.assignItems((req as any).user, id, body?.item_ids || []);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Req() req: Request, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.lots.removeItem((req as any).user, id, itemId);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.lots.updateLot((req as any).user, id, body);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.lots.deleteLot((req as any).user, id);
  }
}
