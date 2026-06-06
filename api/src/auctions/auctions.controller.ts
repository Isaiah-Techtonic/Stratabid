import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { AuctionsService } from './auctions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  findAll() { return this.auctionsService.findAll(); }

  // Public: auctions open for seller submissions
  @Get('open')
  open() { return this.auctionsService.openForSubmissions(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() body: any) {
    if (!body?.company_id || !body?.title) throw new BadRequestException('company_id and title are required');
    return this.auctionsService.create(body);
  }

  // Company/admin toggles open-for-submissions
  @UseGuards(JwtAuthGuard)
  @Patch(':id/submissions')
  setOpen(@Req() req: Request, @Param('id') id: string, @Body() body: { open?: boolean }) {
    return this.auctionsService.setOpenForSubmissions((req as any).user, id, !!body?.open);
  }
}
