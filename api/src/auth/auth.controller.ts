import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.auth.login(body.email, body.password);
  }

  // Public self-registration → creates a customer account, returns a token.
  @Post('register')
  async register(@Body() body: { email?: string; full_name?: string; password?: string }) {
    return this.auth.register(body?.email, body?.full_name, body?.password);
  }

  // Authenticated password change.
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() body: { current_password?: string; new_password?: string },
  ) {
    const user = (req as any).user;
    return this.auth.changePassword(user.sub, body?.current_password, body?.new_password);
  }
}
