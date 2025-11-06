import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { KeysService } from '../keys.service';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Deploy, DeployStrParams, PaymentStrParams } from 'casper-sdk';
import { AxiosResponse } from 'axios';

const MOCK_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_PUBLIC_KEY_ID = '1';
const mockGenerateKeypair = {
  publicKeyHex: MOCK_PUBLIC_KEY.slice(2),
  id: MOCK_PUBLIC_KEY_ID,
};
const MOCK_DEPLOY = new Deploy(
  Deploy.withTransfer(
    '1',
    MOCK_PUBLIC_KEY,
    undefined,
    new DeployStrParams('test', MOCK_PUBLIC_KEY),
    new PaymentStrParams('1'),
  ).toJson(),
);

describe('KeysService', () => {
  let keysService: KeysService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [KeysService],
    }).compile();

    keysService = module.get<KeysService>(KeysService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(keysService).toBeDefined();
  });

  it('should have default kms_address if environment variable is not set', () => {
    const expectedKmsAddress = 'http://localhost:8080';
    expect(keysService.kms_address).toEqual(expectedKmsAddress);
  });

  it('should use kms_address from environment variable if set', () => {
    process.env.KMS_ADDRESS = 'http://custom-kms:8080';
    const expectedKmsAddress = process.env.KMS_ADDRESS;
    const newKeysService = new KeysService(httpService);
    expect(newKeysService.kms_address).toEqual(expectedKmsAddress);
  });

  it('should get a new public key successfully', async () => {
    const getSpy = jest.spyOn(httpService, 'post').mockReturnValueOnce(
      of({
        data: { result: mockGenerateKeypair },
      } as unknown as AxiosResponse<string>),
    );

    const publicKeyPair = await keysService.generateKeypair();

    expect(publicKeyPair.publicKeyHex).toEqual(MOCK_PUBLIC_KEY);
    const id = expect.any(Number);
    expect(getSpy).toHaveBeenCalledWith(
      `${keysService.kms_address}`,
      {
        jsonrpc: '2.0',
        id,
        method: 'generateKeypair',
        params: { type: 'secp256k1' },
      },
      { headers: { 'Content-Type': 'application/json' } },
    );
  });

  it('should handle get new public key failure', async () => {
    const error = {
      message: 'Error',
      response: { status: HttpStatus.INTERNAL_SERVER_ERROR },
    };

    jest
      .spyOn(httpService, 'post')
      .mockReturnValueOnce(throwError(() => error));

    await expect(
      async () => await keysService.generateKeypair(),
    ).rejects.toThrow(
      new HttpException(
        {
          message: error?.message,
          error: error.response,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );
  });

  it('should sign a deploy successfully', async () => {
    const signature_base64 =
      'JyKSX1RU7F3ABdBfXBCtNCmV2Zn255EfVDvHKJ/NexlmXCTI0RuPtGLznUTJ9JbrgqzXNuhKvzKynA/+BNoZDA==';
    const buffer = Buffer.from(signature_base64, 'base64');
    const signature = buffer.toString('hex');

    const binaryData = Buffer.from(MOCK_DEPLOY.hash.toString(), 'hex');
    const base64String = binaryData.toString('base64');

    const deploy_json_string: string = JSON.stringify(MOCK_DEPLOY.toJson());
    const expectedResult = deploy_json_string.replace(
      '"approvals":[]',
      `"approvals":[{"signer":"${MOCK_PUBLIC_KEY}","signature":"02${signature}"}]`,
    );
    const getSpy = jest.spyOn(httpService, 'post').mockReturnValueOnce(
      of({
        data: { result: signature_base64 },
      } as unknown as AxiosResponse<string>),
    );

    const result = await keysService.sign(
      MOCK_DEPLOY,
      MOCK_PUBLIC_KEY_ID,
      MOCK_PUBLIC_KEY,
    );
    expect(result).toEqual(expectedResult);
    const id = expect.any(Number);
    expect(getSpy).toHaveBeenCalledWith(
      `${keysService.kms_address}`,
      {
        method: 'sign',
        jsonrpc: '2.0',
        id,
        params: {
          data: base64String,
          kid: MOCK_PUBLIC_KEY_ID,
        },
      },
      { headers: { 'Content-Type': 'application/json' } },
    );
  });

  it('should handle sign failure', async () => {
    const error = {
      message: 'Error',
      response: { status: HttpStatus.INTERNAL_SERVER_ERROR },
    };

    jest
      .spyOn(httpService, 'post')
      .mockReturnValueOnce(throwError(() => error));

    await expect(
      async () =>
        await keysService.sign(
          MOCK_DEPLOY,
          MOCK_PUBLIC_KEY_ID,
          MOCK_PUBLIC_KEY,
        ),
    ).rejects.toThrow(
      new HttpException(
        {
          message: error?.message,
          error: error.response,
        },
        error.response.status,
      ),
    );
  });

  it('should handle sign failure with response data', async () => {
    const errorResponse = { error: 'Some kms error' };
    const message = 'Error';

    jest.spyOn(httpService, 'post').mockReturnValueOnce(
      throwError(() => ({
        response: {
          data: errorResponse,
        },
        message,
      })),
    );

    try {
      await keysService.sign(MOCK_DEPLOY, MOCK_PUBLIC_KEY_ID, MOCK_PUBLIC_KEY);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.message).toEqual(message);
      expect(error.response.error).toEqual(errorResponse.error);
      expect(error.getStatus()).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  });
});
