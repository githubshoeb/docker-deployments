import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { KeysService } from '../lib/services/keys.service';

export class SignDto {
  id: number;
  method: string;
  params: {
    kid: string;
    data: string;
  };
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly keysService: KeysService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  async entrypoint(@Body() signDto: any) {
    if (signDto.params?.kid) {
      return this.keysService.sign(
        signDto?.params?.data,
        undefined,
        signDto?.params?.kid,
      );
    } else {
      return this.keysService.generateKeypair();
    }
  }
}
