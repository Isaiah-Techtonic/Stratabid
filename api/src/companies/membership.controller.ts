import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  // Companies the current user belongs to (drives portal navigation)
  @Get('my-companies')
  myCompanies(@Req() req: Request) {
    return this.membership.myCompanies((req as any).user);
  }

  // Master admin assigns a company owner
  @Post('companies/:id/owner')
  assignOwner(@Req() req: Request, @Param('id') id: string, @Body() body: { email?: string }) {
    if (!body?.email) throw new BadRequestException('email is required');
    return this.membership.assignOwner((req as any).user, id, body.email);
  }

  @Get('companies/:id/users')
  listTeam(@Req() req: Request, @Param('id') id: string) {
    return this.membership.listTeam((req as any).user, id);
  }

  @Post('companies/:id/users')
  addMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { email?: string; role?: string },
  ) {
    if (!body?.email) throw new BadRequestException('email is required');
    return this.membership.addMember((req as any).user, id, body.email, body.role || 'staff');
  }

  @Patch('companies/:id/users/:membershipId')
  changeRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() body: { role?: string },
  ) {
    if (!body?.role) throw new BadRequestException('role is required');
    return this.membership.changeRole((req as any).user, id, membershipId, body.role);
  }

  @Delete('companies/:id/users/:membershipId')
  removeMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.membership.removeMember((req as any).user, id, membershipId);
  }
}
