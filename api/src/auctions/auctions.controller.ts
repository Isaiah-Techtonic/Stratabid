import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  findAll() {
    return this.auctionsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(
    @Body()
    body: {
      company_id?: string;
      title?: string;
      description?: string;
      format?: string;
      starts_at?: string;
      ends_at?: string;
      location_city?: string;
      location_state?: string;
      location_address?: string;
    },
  ) {
    if (!body?.company_id || !body?.title) {
      throw new BadRequestException('company_id and title are required');
    }
    return this.auctionsService.create({
      company_id: body.company_id,
      title: body.title,
      description: body.description,
      format: body.format,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      location_city: body.location_city,
      location_state: body.location_state,
      location_address: body.location_address,
    });
  }
}
