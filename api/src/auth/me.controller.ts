import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

// GET /api/me  (requires Bearer token) -> current user profile.
// Proves the JWT guard works end to end.
@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  me(@Req() req: Request) {
    const user = (req as any).user; // { sub, email, role } from the token
    return this.auth.findById(user.sub);
  }
}
