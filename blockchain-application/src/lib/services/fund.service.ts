import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SDKService } from './sdk.service';
import {
  DeployProcessed,
  DeployStrParams,
  EventParseResult,
  PaymentStrParams,
  privateToPublicKey,
  PutDeployResult,
} from 'casper-sdk';

export type FundReturn = {
  deploy_processed: DeployProcessed;
  target_account: string;
};

@Injectable()
export class FundService {
  public readonly payment_amount = '100000000';
  private readonly faucet_private_key?: string;
  private readonly public_key: string;
  private readonly events_url: string;

  constructor(private readonly sdkService: SDKService) {
    this.faucet_private_key = process.env.FAUCET_PRIVATE_KEY || '';
    if (!this.faucet_private_key) {
      throw new HttpException(
        `Error no faucet key`,
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    this.public_key =
      this.faucet_private_key && privateToPublicKey(this.faucet_private_key);
    this.events_url =
      process.env.EVENT_ADDRESS || 'http://localhost:18101/events/main';
  }

  public async fund(
    amount: string,
    target_account: string,
  ): Promise<FundReturn> {
    const deploy_params = new DeployStrParams(
      this.sdkService.chain_name,
      this.public_key,
      this.faucet_private_key,
    );
    const payment_params = new PaymentStrParams(this.payment_amount);
    const transfer_result: PutDeployResult = await this.sdkService.sdk.transfer(
      amount,
      target_account,
      undefined,
      deploy_params,
      payment_params,
    );
    const deploy_hash = transfer_result.deploy_hash.toString();
    const eventParseResult: EventParseResult =
      await this.sdkService.sdk.waitDeploy(this.events_url, deploy_hash);
    if (eventParseResult.err) {
      console.error(eventParseResult.err);
      throw new HttpException(
        `Error funding public key ${target_account} ${eventParseResult.err.toString()}`,
        HttpStatus.EXPECTATION_FAILED,
      );
    } else if (!eventParseResult.body) {
      console.error(eventParseResult);
      throw new HttpException(
        `Error no result body while funding public key ${target_account}`,
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    const deploy_processed: DeployProcessed =
      eventParseResult.body?.DeployProcessed;
    return {
      deploy_processed,
      target_account,
    };
  }
}
