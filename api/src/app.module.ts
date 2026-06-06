import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuctionsModule } from './auctions/auctions.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { ListingsModule } from './listings/listings.module';

@Module({
  imports: [AuctionsModule, AuthModule, CompaniesModule, ListingsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
