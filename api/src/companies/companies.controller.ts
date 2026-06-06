import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  // Any authenticated user can list companies (needed to populate dropdowns).
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.companies.findAll();
  }

  // Only master admin can create companies (for now).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() body: { name?: string; owner_email?: string; phone?: string; address?: string }) {
    if (!body?.name || !body?.owner_email) {
      throw new BadRequestException('name and owner_email are required');
    }
    return this.companies.create({
      name: body.name,
      owner_email: body.owner_email,
      phone: body.phone,
      address: body.address,
    });
  }
}
