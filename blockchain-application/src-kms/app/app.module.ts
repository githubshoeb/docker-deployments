import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { KeysService } from '../lib/services/keys.service';
import { AppService } from './app.service';
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
  imports: [],
  controllers: [AppController],
  providers: [AppService, KeysService],
})
export class AppModule { }
