import { InstallService } from '../lib/services/install.service';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SDKService } from '../lib/services/sdk.service';
import { MakeDeployService } from '../lib/services/make_deploy.service';
import { KeysService } from '../lib/services/keys.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; // Correct import
import {
  InvestorEntity,
  OfferInvestorEntity,
} from '../lib/data-access/investor.entity';
import { FundService } from '../lib/services/fund.service';
import { BalanceService } from '../lib/services/balance.service';
import {
  SponsorEntity,
  OfferSponsorEntity,
} from '../lib/data-access/sponsor.entity';
import { OfferEntity } from '../lib/data-access/offer.entity';
import { PublicKeyService } from '../lib/services/public-key.service';
import { OfferService } from '../lib/services/offer.service';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const isDebug = process.env.DEBUG === 'true';

// Override console.debug
const debug = console.debug;
console.debug = (...args) => {
  if (isDebug) {
    debug('[DEBUG]', ...args);
  }
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: +process.env.DATABASE_PORT || 5432,
      username: process.env.DATABASE_USERNAME || 'equitybrix',
      password: process.env.DATABASE_PASSWORD || 'equitybrix',
      database: process.env.DATABASE_NAME || 'equitybrix',
      entities: [
        InvestorEntity,
        SponsorEntity,
        OfferEntity,
        OfferSponsorEntity,
        OfferInvestorEntity,
      ],
      synchronize: true,
      logging: process.env.DATABASE_LOGING == 'true',
    }),
    TypeOrmModule.forFeature([InvestorEntity, SponsorEntity, OfferEntity]),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [
    InstallService,
    AppService,
    SDKService,
    MakeDeployService,
    KeysService,
    FundService,
    BalanceService,
    PublicKeyService,
    OfferService,
  ],
})
export class AppModule { }
