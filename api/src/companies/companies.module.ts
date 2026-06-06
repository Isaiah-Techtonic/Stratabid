import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CompaniesController, MembershipController],
  providers: [CompaniesService, MembershipService, PrismaService],
})
export class CompaniesModule {}
