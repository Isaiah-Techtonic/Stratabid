import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Actor = { sub: string; email: string; role: string };

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  // Resolve a user's role within a specific company.
  // Returns 'master_admin' | 'owner' | 'manager' | 'staff' | null
  async roleInCompany(actor: Actor, companyId: string): Promise<string | null> {
    if (actor.role === 'admin') return 'master_admin';
    const membership = await this.prisma.company_users.findFirst({
      where: { company_id: companyId, user_id: actor.sub },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  // Can the actor manage this company's team? (master admin, owner, or manager)
  private async assertCanManage(actor: Actor, companyId: string) {
    const role = await this.roleInCompany(actor, companyId);
    if (role === 'master_admin' || role === 'owner' || role === 'manager') return role;
    throw new ForbiddenException("You don't have permission to manage this company's team");
  }

  // Can the actor at least view this company's team? (any member or master admin)
  private async assertCanView(actor: Actor, companyId: string) {
    const role = await this.roleInCompany(actor, companyId);
    if (!role) throw new ForbiddenException('You are not a member of this company');
    return role;
  }

  private async companyOrThrow(companyId: string) {
    const c = await this.prisma.auction_companies.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Company not found');
  }

  private async userByEmailOrThrow(email: string) {
    const u = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, full_name: true },
    });
    if (!u) {
      throw new BadRequestException(
        'No registered user with that email. They must create an account first.',
      );
    }
    return u;
  }

  // Master admin assigns a company's owner (by email).
  async assignOwner(actor: Actor, companyId: string, email: string) {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Only the master admin can assign a company owner');
    }
    await this.companyOrThrow(companyId);
    const user = await this.userByEmailOrThrow(email);

    // Upsert membership as owner
    const existing = await this.prisma.company_users.findFirst({
      where: { company_id: companyId, user_id: user.id },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.company_users.update({
        where: { id: existing.id },
        data: { role: 'owner' as any },
      });
    } else {
      await this.prisma.company_users.create({
        data: { company_id: companyId, user_id: user.id, role: 'owner' as any },
      });
    }
    return { ok: true, user: { id: user.id, email: user.email, full_name: user.full_name }, role: 'owner' };
  }

  async listTeam(actor: Actor, companyId: string) {
    await this.assertCanView(actor, companyId);
    const rows = await this.prisma.company_users.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        role: true,
        created_at: true,
        users: { select: { id: true, email: true, full_name: true } },
      },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((r) => ({
      membership_id: r.id,
      role: r.role,
      joined_at: r.created_at,
      user: r.users,
    }));
  }

  async addMember(actor: Actor, companyId: string, email: string, role: string) {
    await this.assertCanManage(actor, companyId);
    if (!['manager', 'staff'].includes(role)) {
      throw new BadRequestException('role must be "manager" or "staff"');
    }
    await this.companyOrThrow(companyId);
    const user = await this.userByEmailOrThrow(email);

    const existing = await this.prisma.company_users.findFirst({
      where: { company_id: companyId, user_id: user.id },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('That user is already on the team');

    const created = await this.prisma.company_users.create({
      data: { company_id: companyId, user_id: user.id, role: role as any },
      select: { id: true, role: true },
    });
    return { membership_id: created.id, role: created.role, user };
  }

  async changeRole(actor: Actor, companyId: string, membershipId: string, role: string) {
    const actorRole = await this.assertCanManage(actor, companyId);
    if (!['owner', 'manager', 'staff'].includes(role)) {
      throw new BadRequestException('invalid role');
    }
    // Only master admin or owner may create/alter an owner
    if (role === 'owner' && actorRole !== 'master_admin' && actorRole !== 'owner') {
      throw new ForbiddenException('Only an owner or master admin can grant owner role');
    }
    const membership = await this.prisma.company_users.findFirst({
      where: { id: membershipId, company_id: companyId },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Membership not found in this company');

    await this.prisma.company_users.update({ where: { id: membershipId }, data: { role: role as any } });
    return { ok: true };
  }

  async removeMember(actor: Actor, companyId: string, membershipId: string) {
    await this.assertCanManage(actor, companyId);
    const membership = await this.prisma.company_users.findFirst({
      where: { id: membershipId, company_id: companyId },
      select: { id: true, role: true },
    });
    if (!membership) throw new NotFoundException('Membership not found in this company');
    await this.prisma.company_users.delete({ where: { id: membershipId } });
    return { ok: true };
  }

  // Which companies does the actor belong to (and as what)?
  async myCompanies(actor: Actor) {
    if (actor.role === 'admin') {
      // Master admin: return all companies, role master_admin
      const all = await this.prisma.auction_companies.findMany({
        select: { id: true, name: true },
        orderBy: { created_at: 'desc' },
      });
      return all.map((c) => ({ company: c, role: 'master_admin' }));
    }
    const rows = await this.prisma.company_users.findMany({
      where: { user_id: actor.sub },
      select: { role: true, auction_companies: { select: { id: true, name: true } } },
    });
    return rows.map((r) => ({ company: r.auction_companies, role: r.role }));
  }
}
