import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  // GET /api/listings?auction_id=...  — public, browse a catalog
  @Get()
  findByAuction(@Query('auction_id') auctionId: string) {
    if (!auctionId) throw new BadRequestException('auction_id query param is required');
    return this.listings.findByAuction(auctionId);
  }

  // GET /api/listings/:id — public detail
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listings.findOne(id);
  }

  // POST /api/listings — any authenticated user (a consignor submits an item)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const user = (req as any).user; // { sub, email, role }
    return this.listings.create(user.sub, body);
  }

  // PATCH /api/listings/:id/status — admin approves/rejects (for now)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    if (body?.status !== 'approved' && body?.status !== 'rejected') {
      throw new BadRequestException('status must be "approved" or "rejected"');
    }
    return this.listings.setStatus(id, body.status);
  }
}
