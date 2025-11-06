import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  privateToPublicKey,
  generatePrivateKey_secp256k1,
  Deploy,
  SDK,
  DeployStrParams,
  PaymentStrParams
} from 'casper-sdk';

export type KeyPair = {
  id: string;
  type: string;
  publicKeyHex: string;
  private_key: string;
};

// ##### Fake kms for CI/CD ##########

@Injectable()
export class KeysService {
  private keys: KeyPair[] = [];

  private readonly sdk: SDK = new SDK();

  async generateKeypair() {
    const private_key: string = generatePrivateKey_secp256k1();
    if (!private_key) {
      const err = 'No private key generated';
      console.error(err);
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const public_key: string = privateToPublicKey(private_key);
    if (!public_key) {
      const err = 'No public_key key generated';
      console.error(err);
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const keyPair: KeyPair = {
      id: public_key, // simulate _key_id with public_key
      type: 'secp256k1',
      publicKeyHex: public_key.slice(2),
      private_key
    };
    if (!this.keys[public_key]) {
      this.keys[public_key] = keyPair;
    }
    return { result: keyPair };
  }

  private getPrivateKey(key_id: string): KeyPair {
    if (this.keys[key_id]) {
      return this.keys[key_id];
    } else {
      const err = `No private key for this public key ${key_id}`;
      console.error(err);
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async sign(
    deploy_hash: string,
    key_id: string, // simulate _key_id with public_key
    public_key: string,) {
    const deployBuffer = Buffer.from(deploy_hash, 'base64');
    const deploy_hash_hex = deployBuffer.toString('hex');
    const payment_amount = '100000000';
    const transfer_amount = '2500000000';
    const target_account =
      '0187adb3e0f60a983ecc2ddb48d32b3deaa09388ad3bc41e14aeb19959ecc60b54';
    const deploy_params = new DeployStrParams('test', public_key, undefined);
    const payment_params = new PaymentStrParams(payment_amount);
    const transfer_deploy = Deploy.withTransfer(
      transfer_amount,
      target_account,
      undefined, // transfer_id
      deploy_params,
      payment_params
    );
    let deploy_to_sign_string = JSON.stringify(transfer_deploy.toJson());
    deploy_to_sign_string = deploy_to_sign_string.replace(/"hash":\s*"[^"]+"/, `"hash": "${deploy_hash_hex}"`);
    const deploy_to_sign = new Deploy(JSON.parse(deploy_to_sign_string));
    const err = `Could not validate deploy ${deploy_hash_hex}`;
    if (!deploy_to_sign.validateDeploySize()) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const private_key_pair = this.getPrivateKey(key_id);
    const signed_deploy = this.sdk.sign_deploy(deploy_to_sign, private_key_pair.private_key);
    const signature_hex = signed_deploy.toJson()?.approvals[0]?.signature.slice(2);
    const signature = Buffer.from(signature_hex, 'hex').toString('base64');
    return { result: signature };
  }
}
