import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { KeysService } from '../lib/services/keys.service';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, KeysService],
})
export class AppModule { }
