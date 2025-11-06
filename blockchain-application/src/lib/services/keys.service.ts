import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Deploy } from 'casper-sdk';

export type KeyPair = {
  id: string;
  type: string;
  publicKeyHex: string;
  private_key: string;
};

@Injectable()
export class KeysService {
  public readonly kms_address: string;
  private readonly keyType = 'secp256k1';
  private readonly keyPrefix = '02';

  constructor(private httpService: HttpService) {
    this.kms_address = process.env.KMS_ADDRESS || 'http://localhost:8080';
  }

  public async generateKeypair(): Promise<KeyPair> {
    const id = Math.floor(Math.random() * 1000) + 1;
    const request = {
      method: 'generateKeypair',
      jsonrpc: '2.0',
      id,
      params: { type: this.keyType },
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.kms_address, request, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      console.debug(response);
      const public_key_pair = response.data?.result as KeyPair;
      public_key_pair.publicKeyHex =
        this.keyPrefix + public_key_pair.publicKeyHex;
      console.debug(response.data?.result);
      return response.data?.result as KeyPair;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        {
          message: error?.message,
          error: error?.response?.data?.error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async sign(
    deploy: Deploy,
    key_id: string,
    public_key: string,
  ): Promise<string> {
    console.debug('key_id', key_id);
    console.debug('deploy.hash', deploy.hash.toString());
    const binaryData = Buffer.from(deploy.hash.toString(), 'hex');
    const data = binaryData.toString('base64');

    // Now data contains the Base64-encoded hash
    console.debug('data', data);

    const id = Math.floor(Math.random() * 1000) + 1;
    const request = {
      method: 'sign',
      jsonrpc: '2.0',
      id,
      params: { kid: key_id, data },
    };
    try {
      const post = this.httpService.post(this.kms_address, request, {
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await firstValueFrom(post);
      response?.data?.error && console.debug(response?.data?.error);
      const signature_base64 = response.data?.result;
      console.debug('signature_base64', signature_base64);
      const buffer = Buffer.from(signature_base64, 'base64');
      const signature = buffer.toString('hex');
      console.debug('signature', this.keyPrefix + signature);
      const deploy_signed = this.addSignatureToDeployJson(
        deploy,
        public_key,
        this.keyPrefix + signature,
      );
      // console.debug('deploy_signed', deploy_signed);
      return deploy_signed;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        {
          message: error?.message,
          error: error?.response?.data?.error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private addSignatureToDeployJson(
    deploy: Deploy,
    public_key: string,
    signature: string,
  ) {
    const deploy_json_string: string = JSON.stringify(deploy.toJson());
    return deploy_json_string.replace(
      '"approvals":[]',
      `"approvals":[{"signer":"${public_key}","signature":"${signature}"}]`,
    );
  }
}
