import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DeployHash } from 'casper-sdk';
import {
  CreateKeyCommandInput,
  KMS,
  KeySpec,
  KeyUsageType,
  OriginType,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import { util, asn1 } from 'node-forge';

const isDebug = process.env.DEBUG === 'true';

export type KeyPair = {
  id: string;
  type: string;
  publicKeyHex: string;
};

@Injectable()
export class KeysService {
  // A specific prefix for the final signature can be used here if needed
  private casperSecpSignaturePrefix = '';

  private getKMS(sign = false): KMS {
    return new KMS({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: sign ? process.env.KMS_SIGN_ID : process.env.KMS_CREATE_ID,
        secretAccessKey: sign
          ? process.env.KMS_SIGN_KEY
          : process.env.KMS_CREATE_KEY,
      },
    });
  }

  async generateKeypair() {
    const public_key = await this.createKey();
    if (!public_key) {
      const err = 'No public_key key generated';
      console.error(err);
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const keyPair: KeyPair = {
      id: public_key, // simulate key_id with full public_key
      type: 'secp256k1',
      publicKeyHex: public_key, // Prefix added later back in api
    };
    return { result: keyPair };
  }

  async sign(
    deploy_hash: string,
    _key_id: string, // simulate key_id with public_key, unused
    public_key: string,
  ) {
    console.debug('deployHash base64 to sign', deploy_hash);
    const binaryData = Buffer.from(deploy_hash, 'base64');

    // Validate deploy hash
    const deployHashHexString = new DeployHash(
      binaryData.toString('hex'),
    ).toString();
    if (!deployHashHexString) {
      const err = `Could not validate deploy hash ${deploy_hash}`;
      console.error('bad deployHash', deploy_hash);
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const kms = this.getKMS(true);

    try {
      // Resolve the alias to get the actual key ID with public_key
      const { KeyMetadata } = await kms.describeKey({
        KeyId: `alias/${public_key}`,
      });

      // Extract the KeyId from the KeyMetadata object
      const keyId = KeyMetadata?.KeyId;

      // Sign the deploy hash asynchronously
      const signatureAsn1 = await kms.sign({
        KeyId: keyId,
        Message: binaryData,
        MessageType: 'RAW',
        SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
      });

      const signatureAsn1Base64 = Buffer.from(signatureAsn1.Signature).toString(
        'base64',
      );
      if (isDebug) {
        // Example MEQCIEC/XbpuvXoJiPNmmWOt1lZ8TQSA1Je3ETwxgJYLzTU4AiAIdkD09QCk+led1e55o5HbAefdyTb3rAV1CousZWplag==
        console.debug('signatureAsn1Base64', signatureAsn1Base64);
        const hexSignatureAsn1Base64 = Buffer.from(
          signatureAsn1.Signature,
        ).toString('hex');
        // Example 3044022040bf5dba6ebd7a0988f3669963add6567c4d0480d497b7113c3180960bcd35380220087640f4f500a4fa579dd5ee79a391db01e7ddc936f7ac05750a8bac656a656a
        console.debug('hexSignatureAsn1Base64', hexSignatureAsn1Base64);
      }
      const signatureHex =
        this.convertSignatureAsn1ToP1363(signatureAsn1Base64);
      console.debug('signatureHex', signatureHex);
      const signature = Buffer.from(signatureHex, 'hex') // Prefix added later back in api
        .toString('base64');
      return { result: signature };
    } catch (error) {
      console.error('Error signing deploy:', error);
      throw new HttpException(
        'Error signing deploy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private convertSignatureAsn1ToP1363(signatureAsn1Base64: string) {
    const length = 32;
    // Create a buffer to store the result
    const result = Buffer.alloc(length * 2);
    // Verify input
    console.debug(signatureAsn1Base64);
    const signatureAsn1 = util.decode64(signatureAsn1Base64);
    if (!signatureAsn1 || signatureAsn1.length === 0) {
      throw new Error('No signature data provided to convert.');
    }
    if (signatureAsn1.length < result.length) {
      throw new Error('The signature provided is too short.');
    }
    // Simple check if the signature length suggests it's already in the P1363 format
    if (signatureAsn1.length % length === 0) {
      return signatureAsn1;
    }
    console.debug(signatureAsn1);
    try {
      // Decode the ASN.1 sequence
      const asn1_from_der = asn1.fromDer(signatureAsn1);

      // Convert ASN.1 sequence to an array of values
      const asn1Sequence = asn1_from_der.value as asn1.Asn1[];
      if (asn1Sequence.length !== 2) {
        console.error('asn1Sequence', asn1Sequence);
        throw new Error('Invalid ASN.1 sequence length');
      }
      console.debug('asn1Sequence', asn1Sequence);

      // Extract r and s values from ASN.1 sequence
      const r = asn1Sequence[0].value as string;
      const s = asn1Sequence[1].value as string;

      // Convert r and s to byte arrays
      // Padding with leading zeros if r or s is below 32 bytes in hex to 0x00
      let rBuffer = util
        .createBuffer(r, 'raw')
        .toHex()
        .padStart(result.length, '0');
      let sBuffer = util
        .createBuffer(s, 'raw')
        .toHex()
        .padStart(result.length, '0');

      console.debug('rBuffer:', rBuffer);
      console.debug('sBuffer:', sBuffer);
      console.debug(rBuffer.length, result.length, rBuffer.startsWith('00'));
      console.debug(sBuffer.length, result.length, sBuffer.startsWith('00'));

      // Remove leading zeros if r or s is 33 bytes in hex starting with 0x00
      if (rBuffer.length > result.length && rBuffer.startsWith('00')) {
        console.debug('rBuffer before slice', rBuffer);
        rBuffer = rBuffer.slice(2);
        console.debug('rBuffer after slice', rBuffer);
      }

      console.debug('>> rBuffer:', rBuffer);

      if (sBuffer.length > result.length && sBuffer.startsWith('00')) {
        console.debug('sBuffer before slice', sBuffer);
        sBuffer = sBuffer.slice(2);
        console.debug('sBuffer before slice', sBuffer);

        // "Hi" s buffer need to be normalized as per https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki#user-content-Low_S_values_in_signatures
        sBuffer = this.normalizeS(sBuffer);
      }

      console.debug('>> sBuffer:', sBuffer);

      const concatenatedHex = rBuffer + sBuffer;

      const full33BytesHexSignature =
        this.casperSecpSignaturePrefix + concatenatedHex;
      console.debug('P1363 Signature:', full33BytesHexSignature);
      return full33BytesHexSignature;
    } catch (error) {
      throw new Error(
        'Error while trying to decode ASN.1 from signature: ' + error.message,
      );
    }
  }

  private normalizeS(sBuffer: string): string {
    const CURVE_ORDER_HEX =
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141';
    const CURVE_ORDER = BigInt('0x' + CURVE_ORDER_HEX);
    const HALF_CURVE_ORDER = CURVE_ORDER >> 1n;

    let s = BigInt('0x' + sBuffer);
    console.debug('Original s: ', s.toString(16));

    if (s > HALF_CURVE_ORDER) {
      s = CURVE_ORDER - s;
    }

    let sHex = s.toString(16);
    if (sHex.length % 2 !== 0) {
      sHex = '0' + sHex;
    }

    console.debug('Normalized s: ', sHex);
    return sHex;
  }

  private publicHexFromPem(publicPem: string): string {
    const cleanPem = publicPem
      .replace(/\n/g, '')
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '');
    const binPem = Buffer.from(cleanPem, 'base64');
    const rLength = binPem[3];
    const sLength = binPem[5 + rLength] - 1; // Adjusted length to account for ASN.1 encoding
    const rStart = 4;
    const sStart = 3 + rStart + rLength; // Adjusted start index
    const s = binPem.subarray(sStart, sStart + sLength);
    const hexString = Array.from(s, (val) =>
      val.toString(16).padStart(2, '0'),
    ).join('');
    return hexString;
  }

  private convertSecp256k1PublicKeyToCompressedForm(
    secp256k1Bytes: Uint8Array,
  ) {
    if (!secp256k1Bytes || secp256k1Bytes.length === 0) {
      throw new Error(
        'Expected secp256k1 public key, but got null/empty byte array.',
      );
    }
    if (
      secp256k1Bytes.length === 33 &&
      (secp256k1Bytes[0] === 0x02 || secp256k1Bytes[0] === 0x03)
    ) {
      // Data is already in the right format, <0x02|0x03><x_coordinate>
      return secp256k1Bytes;
    } else if (secp256k1Bytes.length === 65 && secp256k1Bytes[0] === 0x04) {
      // Data is in format <0x04><x_coordinate><y_coordinate>

      // Create space for result in format <0x02|0x03><x_coordinate>
      const secp256k1PublicKeyToCompressed = new Uint8Array(33);

      // Write the correct prefix (0x02 for even y-coordinate, 0x03 for odd y-coordinate)
      const yCoordinateIsEven = (secp256k1Bytes[64] & 1) !== 1;
      secp256k1PublicKeyToCompressed[0] = yCoordinateIsEven ? 0x02 : 0x03;

      // Copy the 32-byte x-coordinate
      secp256k1PublicKeyToCompressed.set(secp256k1Bytes.slice(1, 33), 1);

      return secp256k1PublicKeyToCompressed;
    } else {
      throw new Error(
        'Expected secp256k1 public key, but received data is of wrong format',
      );
    }
  }

  private async createKey(): Promise<string> {
    const params: CreateKeyCommandInput = {
      Description: 'Your SECP256K1 Key Description',
      KeyUsage: KeyUsageType.SIGN_VERIFY,
      Origin: OriginType.AWS_KMS,
      KeySpec: KeySpec.ECC_SECG_P256K1,
    };

    const kms = this.getKMS();

    return new Promise<string>((resolve, reject) => {
      kms.createKey(params, async (err, data) => {
        if (err) {
          console.error('Error creating key:', err);
          reject(err);
        } else {
          const keyId = data.KeyMetadata.KeyId;
          console.debug('Key created successfully:', keyId);

          const publicKeyParams = { KeyId: keyId };
          try {
            const publicKeyData = await kms.getPublicKey(publicKeyParams);
            console.debug(publicKeyData);

            const publicKeyBuffer = Buffer.from(publicKeyData.PublicKey);
            console.debug(
              'publicKeyBuffer',
              publicKeyBuffer.toString('base64'),
            );

            const secp256k1Hex = this.publicHexFromPem(
              publicKeyBuffer.toString('base64'),
            );
            console.debug('secp256k1Hex', secp256k1Hex);
            const publicKeyBytes = Buffer.from(secp256k1Hex, 'hex');

            const compressedPublicKey =
              this.convertSecp256k1PublicKeyToCompressedForm(publicKeyBytes);

            const publicKeyHex =
              this.casperSecpSignaturePrefix +
              Buffer.from(compressedPublicKey).toString('hex');

            console.debug(
              'Public key retrieved and compressed successfully:',
              publicKeyHex,
            );
            const aliasParams = {
              AliasName: `alias/${publicKeyHex}`,
              TargetKeyId: keyId,
            };
            await kms.createAlias(aliasParams);

            resolve(publicKeyHex);
          } catch (error) {
            console.error('Error creating alias:', error);
            reject(error);
          }
        }
      });
    });
  }
}
