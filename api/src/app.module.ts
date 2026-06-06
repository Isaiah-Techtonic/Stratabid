import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuctionsModule } from './auctions/auctions.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { ListingsModule } from './listings/listings.module';
import { UploadsModule } from './uploads/uploads.module';
import { PublicModule } from './public/public.module';
import { LotsModule } from './lots/lots.module';
import { BiddingModule } from './bidding/bidding.module';

@Module({
  imports: [AuctionsModule, AuthModule, CompaniesModule, ListingsModule, UploadsModule, PublicModule, LotsModule, BiddingModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
