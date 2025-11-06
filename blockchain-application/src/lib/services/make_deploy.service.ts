import { Injectable } from '@nestjs/common';
import {
  Deploy,
  DeployProcessed,
  DeployStrParams,
  EventParseResult,
  Key,
  PaymentStrParams,
  PublicKey,
  PutDeployResult,
  SessionStrParams,
} from 'casper-sdk';
import { SDKService } from './sdk.service';
import { SessionArg } from './install.service';
import { KeysService } from './keys.service';

export type TransferParams = {
  amount: string;
  id_offer: string;
  id_sponsor: string;
  id_investor: string;
  redeem?: boolean;
};

export type TransferReturn = {
  id_offer: string;
  id_sponsor: string;
  id_investor: string;
  recipient_key: string;
  amount: string;
  deploy_processed: DeployProcessed;
};

@Injectable()
export class MakeDeployService {
  accountCreationPaymentAmount =
    process.env.ACCOUNT_CREATION_PAYMENT_AMOUNT || '2500000000';
  transferPaymentAmount = process.env.TRANSFER_PAYMENT_AMOUNT || '600000000';
  private readonly events_url: string;

  constructor(
    private readonly sdkService: SDKService,
    private readonly keysService: KeysService,
  ) {
    this.events_url =
      process.env.EVENT_ADDRESS || 'http://localhost:18101/events/main';
  }

  public async transfer(
    params: TransferParams,
    contract_hash: string,
    key_id: string,
    from_public_key: string,
    to_public_key: string,
  ): Promise<TransferReturn> {
    console.debug(`transfer ${params.id_offer}`);
    const deployParams = this.createDeployParams(from_public_key);
    const sessionArgs = this.createTransferSessionArgs(to_public_key, params);
    const sessionParams = this.createSessionParams(sessionArgs);
    sessionParams.session_hash = contract_hash;
    sessionParams.session_entry_point = 'transfer';

    const paymentParams = this.createPaymentParams(this.transferPaymentAmount);

    const deploy = this.sdkService.sdk.make_deploy(
      deployParams,
      sessionParams,
      paymentParams,
    );

    const signedDeploy = await this.signDeploy(deploy, key_id, from_public_key);
    const result: PutDeployResult = await this.putDeploy(signedDeploy);
    const deployHash = result && result.deploy_hash.toString();
    const deployProcessed = deployHash && (await this.waitDeploy(deployHash));

    return {
      id_offer: params.id_offer,
      id_sponsor: params.id_sponsor,
      id_investor: params.id_investor,
      recipient_key: to_public_key,
      amount: params.amount,
      deploy_processed: deployProcessed,
    };
  }

  public async signDeploy(
    deploy: Deploy,
    key_id: string,
    public_key: string,
  ): Promise<Deploy> {
    const signedDeployString = await this.keysService.sign(
      deploy,
      key_id,
      public_key,
    );
    return new Deploy(JSON.parse(signedDeployString));
  }

  public async putDeploy(signedDeploy: Deploy): Promise<PutDeployResult> {
    return this.sdkService.sdk.put_deploy(signedDeploy);
  }

  public async waitDeploy(deployHash: string): Promise<DeployProcessed> {
    const eventParseResult: EventParseResult =
      await this.sdkService.sdk.waitDeploy(this.events_url, deployHash);
    return eventParseResult.body.DeployProcessed;
  }

  public createDeployParams(publicKey: string): DeployStrParams {
    return new DeployStrParams(this.sdkService.chain_name, publicKey);
  }

  public createSessionParams(sessionArgs: SessionArg[]): SessionStrParams {
    const sessionParams = new SessionStrParams();
    sessionParams.session_args_json = JSON.stringify(sessionArgs);
    return sessionParams;
  }

  public createPaymentParams(paymentAmount): PaymentStrParams {
    return new PaymentStrParams(paymentAmount);
  }

  private createTransferSessionArgs(
    to_public_key: string,
    params: TransferParams,
  ): SessionArg[] {
    const recipient = new PublicKey(to_public_key);
    const recipient_account_hash = recipient.toAccountHash();
    const recipient_key = Key.fromAccount(
      recipient_account_hash,
    ).toFormattedString();
    const sessionArgs: SessionArg[] = [
      { name: 'amount', type: 'U256', value: params.amount },
      { name: 'recipient', type: 'Key', value: recipient_key },
      {
        name: 'id_investor',
        type: 'String',
        value: params.id_investor,
      },
      {
        name: 'id_sponsor',
        type: 'String',
        value: params.id_sponsor,
      },
    ];
    if (params.redeem) {
      sessionArgs.push({
        name: 'redeem',
        type: 'Bool',
        value: params.redeem,
      });
    }
    return sessionArgs;
  }
}
