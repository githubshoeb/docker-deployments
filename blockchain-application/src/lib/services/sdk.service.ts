import { Injectable } from '@nestjs/common';
import { SDK } from 'casper-sdk';

@Injectable()
export class SDKService {
  public readonly node_address: string;
  public readonly chain_name: string;
  public readonly sdk: SDK;

  constructor() {
    this.node_address = process.env.NODE_ADDRESS || 'http://localhost:11101';
    this.chain_name = process.env.CHAIN_NAME || 'casper-net-1';
    this.sdk = new SDK(this.node_address);
  }
}
