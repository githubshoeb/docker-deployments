import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Bytes,
  DeployStrParams,
  SessionStrParams,
  Deploy,
  PaymentStrParams,
  DeployProcessed
} from 'casper-sdk';
import { SDKService } from './sdk.service';
import * as fs from 'fs/promises';
import { MakeDeployService } from './make_deploy.service';
import * as path from 'path';

const WASM_FILE_PATH = './wasm/cep18.wasm';
export const TOTAL_SUPPLY_DEFAULT = '1';
export const DECIMALS_DEFAULT = '18';

export type InstallParams = {
  id_offer: string;
  id_sponsor: string;
  name: string;
  symbol: string;
  decimals: string;
  total_supply: string;
  events_mode?: boolean;
  enable_mint_burn?: boolean;
  admin_list?: string[];
  minter_list?: string[];
};

export type InstallReturn = {
  id_offer: string;
  id_sponsor: string;
  sponsor_public_key: string;
  contract_hash: string;
  deploy_processed: DeployProcessed;
};

export interface SessionArg {
  name: string;
  type: string | { List: string; };
  value: string | number | boolean | string[];
}

@Injectable()
export class InstallService {
  installPaymentAmount = process.env.INSTALL_PAYMENT_AMOUNT || '250000000000';

  constructor(
    private readonly sdkService: SDKService,
    private readonly makeDeployService: MakeDeployService,
  ) { }

  public async install(
    params: InstallParams,
    key_id: string,
    publicKey: string,
  ): Promise<{
    contract_hash: string;
    deploy_processed: DeployProcessed;
  }> {
    console.debug(`install ${params.name}`);

    const deployParams = this.makeDeployService.createDeployParams(publicKey);

    const sessionArgs = this.createSessionArgs(params);
    const sessionParams =
      this.makeDeployService.createSessionParams(sessionArgs);
    const paymentParams = this.makeDeployService.createPaymentParams(
      this.installPaymentAmount,
    );

    const deploy = await this.createDeploy(
      deployParams,
      sessionParams,
      paymentParams,
    );
    const signedDeploy = await this.makeDeployService.signDeploy(
      deploy,
      key_id,
      publicKey,
    );
    const installResult = await this.makeDeployService.putDeploy(signedDeploy);

    const deployHash = installResult.deploy_hash;
    const deployProcessed = await this.makeDeployService.waitDeploy(
      deployHash.toString(),
    );
    const contractHash = await this.getContractHash(publicKey, params.name);

    return {
      contract_hash: contractHash,
      deploy_processed: deployProcessed,
    };
  }

  public async getContractHash(
    publicKey: string,
    collectionName: string,
  ): Promise<string> {
    const options = this.sdkService.sdk.get_account_options({
      account_identifier_as_string: publicKey,
    });
    const accountResult = await this.sdkService.sdk.get_account(options);

    const contract_hash = accountResult.account.named_keys.find(
      (namedKey) => namedKey.name === `cep18_contract_hash_${collectionName}`,
    )?.key;
    if (!contract_hash) {
      throw new HttpException(
        `Contract hash not found for the specified collection name : ${collectionName}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return contract_hash;
  }

  private async loadFile(file_path = WASM_FILE_PATH): Promise<ArrayBuffer> {
    try {
      const filePath = path.resolve(process.cwd(), file_path);
      const fileBuffer = await fs.readFile(filePath);
      return fileBuffer.buffer; // Returns an ArrayBuffer
    } catch (error) {
      throw new HttpException(
        'Error reading file: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private createSessionArgs(params: InstallParams): SessionArg[] {
    const sessionArgs: SessionArg[] = [
      { name: 'name', type: 'String', value: params.name },
      { name: 'symbol', type: 'String', value: params.symbol },
      {
        name: 'decimals',
        type: 'U8',
        value: parseInt(params.decimals || DECIMALS_DEFAULT, 10),
      },
      {
        name: 'total_supply',
        type: 'U256',
        value: params.total_supply || TOTAL_SUPPLY_DEFAULT,
      },
      { name: 'events_mode', type: 'U8', value: params.events_mode ? 1 : 0 },
      {
        name: 'enable_mint_burn',
        type: 'U8',
        value: params.enable_mint_burn ? 1 : 0,
      },
      {
        name: 'id_offer',
        type: 'String',
        value: params.id_offer,
      },
      {
        name: 'id_sponsor',
        type: 'String',
        value: params.id_sponsor,
      },
    ];

    if (params.admin_list) {
      sessionArgs.push({
        name: 'admin_list',
        type: { List: 'Key' },
        value: params.admin_list.map((admin) => admin),
      });
    }

    if (params.minter_list) {
      sessionArgs.push({
        name: 'minter_list',
        type: { List: 'Key' },
        value: params.minter_list.map((minter) => minter),
      });
    }

    return sessionArgs;
  }

  private async createDeploy(
    deployParams: DeployStrParams,
    sessionParams: SessionStrParams,
    paymentParams: PaymentStrParams,
  ): Promise<Deploy> {
    const buffer = await this.loadFile();
    const wasm = buffer && new Uint8Array(buffer);
    const wasmBuffer = wasm?.buffer;
    if (!wasmBuffer) {
      throw new HttpException(
        'Failed to read wasm file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    sessionParams.session_bytes = wasm && Bytes.fromUint8Array(wasm);
    return this.sdkService.sdk.make_deploy(
      deployParams,
      sessionParams,
      paymentParams,
    );
  }
}
