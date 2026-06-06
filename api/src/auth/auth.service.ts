import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async signFor(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.signAsync(payload);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.signFor(user);
    return {
      access_token: token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    };
  }

  // Public self-registration. Always creates a 'user' (customer) role —
  // never admin, never a company role. Company roles are assigned separately.
  async register(email: string, fullName: string, password: string) {
    if (!email || !fullName || !password) {
      throw new BadRequestException('email, full_name, and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }
    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.users.create({
      data: { email, full_name: fullName, role: 'user', password_hash },
      select: { id: true, email: true, full_name: true, role: true },
    });
    const token = await this.signFor(user);
    return { access_token: token, user };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('current and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || !user.password_hash) throw new UnauthorizedException();

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const password_hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.users.update({ where: { id: userId }, data: { password_hash } });
    return { ok: true };
  }

  async findById(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, full_name: true, role: true, phone: true, created_at: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
