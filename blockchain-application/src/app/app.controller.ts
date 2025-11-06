import { Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { InstallParams, InstallReturn } from '../lib/services/install.service';
import {
  TransferParams,
  TransferReturn,
} from '../lib/services/make_deploy.service';
import { ApiQuery, ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstallReturnDto } from './dto/install-return.dto';
import { TransferDto } from './dto/transfer.dto';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @ApiOperation({ summary: 'Get Hello Message' })
  get_hello(): string {
    return this.appService.get_hello();
  }

  /// install?name=MyToken&symbol=MT&decimals=18&total_supply=1000000&events_mode=true&id_offer=1&id_sponsor=1
  @Post('install')
  @ApiOperation({ summary: 'Install Token Contract' })
  @ApiResponse({
    status: 201,
    description: 'Successful Installation',
    type: InstallReturnDto,
  })
  @ApiQuery({
    name: 'id_offer',
    required: true,
    example: 'id_offer_test',
    description: 'Offer id from db',
  })
  @ApiQuery({
    name: 'id_sponsor',
    required: true,
    example: 'id_sponsor_test',
    description: 'Sponsor id from db',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    example: 'VillaDubai',
    description: 'Contract Name on chain',
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    example: 'VDB',
    description: 'Contract Symbol on chain',
  })
  @ApiQuery({
    name: 'decimals',
    required: true,
    example: '18',
    description: 'Number of decimals of the token',
  })
  @ApiQuery({
    name: 'total_supply',
    required: true,
    example: '100000',
    description: 'Total supply of the token',
  })
  @ApiQuery({
    name: 'events_mode',
    required: false,
    example: true,
    description: 'Optional Events Mode to emit on chain events',
  })
  @ApiQuery({
    name: 'enable_mint_burn',
    required: false,
    example: false,
    description: 'Optional Enable mint & burn mode',
  })
  @ApiQuery({
    name: 'admin_list',
    required: false,
    example: [],
    description: 'Optional Contract Admins key list [account-hash-0x, ...]',
  })
  @ApiQuery({
    name: 'minter_list',
    required: false,
    example: [],
    description: 'Optional Contract Minters key list  [account-hash-0x, ...]',
  })
  async install(
    @Query('id_offer') id_offer: string,
    @Query('id_sponsor') id_sponsor: string,
    @Query('name') name: string,
    @Query('symbol') symbol: string,
    @Query('decimals') decimals: string,
    @Query('total_supply') total_supply: string,
    @Query('events_mode') events_mode?: boolean,
    @Query('enable_mint_burn') enable_mint_burn?: boolean,
    @Query('admin_list') admin_list?: string[],
    @Query('minter_list') minter_list?: string[],
  ): Promise<InstallReturn> {
    const params: InstallParams = {
      id_offer,
      id_sponsor,
      name,
      symbol,
      decimals,
      total_supply,
      events_mode,
      enable_mint_burn,
      admin_list,
      minter_list,
    };
    return await this.appService.install(params);
  }

  /// invest?amount=10&id_offer=1&id_sponsor=1&id_investor=1
  @Post('invest')
  @ApiOperation({ summary: 'Transfer token amount from sponsor to investor' })
  @ApiResponse({
    status: 201,
    description: 'Successful transfer',
    type: TransferDto,
  })
  @ApiQuery({ name: 'id_offer', required: true, example: 'id_offer_test' })
  @ApiQuery({ name: 'amount', required: true, example: '10' })
  @ApiQuery({ name: 'id_sponsor', required: true, example: 'id_sponsor_test' })
  @ApiQuery({
    name: 'id_investor',
    required: true,
    example: 'id_investor_test',
  })
  async invest(
    @Query('id_offer') id_offer: string,
    @Query('amount') amount: string,
    @Query('id_sponsor') id_sponsor: string,
    @Query('id_investor') id_investor: string,
  ): Promise<TransferReturn> {
    const params: TransferParams = {
      amount,
      id_offer,
      id_sponsor,
      id_investor,
    };
    return await this.appService.transfer(params);
  }

  /// redeem?amount=10&id_offer=1&id_investor=1&id_sponsor=1
  @Post('redeem')
  @ApiOperation({ summary: 'Transfer token amount from investor to sponsor' })
  @ApiResponse({
    status: 201,
    description: 'Successful transfer',
    type: TransferDto,
  })
  @ApiQuery({ name: 'id_offer', required: true, example: 'id_offer_test' })
  @ApiQuery({ name: 'amount', required: true, example: '5' })
  @ApiQuery({
    name: 'id_investor',
    required: true,
    example: 'id_investor_test',
  })
  @ApiQuery({ name: 'id_sponsor', required: true, example: 'id_sponsor_test' })
  async redeem(
    @Query('id_offer') id_offer: string,
    @Query('amount') amount: string,
    @Query('id_investor') id_investor: string,
    @Query('id_sponsor') id_sponsor: string,
  ): Promise<TransferReturn> {
    const params: TransferParams = {
      amount,
      id_offer,
      id_sponsor,
      id_investor,
      redeem: true,
    };
    return await this.appService.transfer(params);
  }

  /// balance?id_offer=1&id_sponsor=1
  /// balance?id_offer=1&id_investor=1
  @Get('balance')
  @Get('get_sponsor_balance')
  @Get('get_investor_balance')
  @ApiOperation({ summary: 'Get Balance' })
  @ApiQuery({ name: 'id_offer', required: true, example: 'id_offer_test' })
  @ApiQuery({ name: 'id_sponsor', required: false, example: 'id_sponsor_test' })
  @ApiQuery({ name: 'id_investor', required: false })
  async get_balance(
    @Query('id_offer') id_offer: string,
    @Query('id_sponsor') id_sponsor?: string,
    @Query('id_investor') id_investor?: string,
  ) {
    return await this.appService.get_balance({
      id_offer,
      id_sponsor,
      id_investor,
    });
  }

  @Get('peers')
  @ApiOperation({ summary: 'Get Peers' })
  async get_peers() {
    return await this.appService.get_peers();
  }

  @Get('node_status')
  @ApiOperation({ summary: 'Get Node Status' })
  async get_node_status() {
    return await this.appService.get_node_status();
  }
}
