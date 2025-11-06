import { Test, TestingModule } from '@nestjs/testing';
import { InstallService, SessionArg, InstallParams } from '../install.service';
import { SDKService } from '../sdk.service';
import { MakeDeployService } from '../make_deploy.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  Bytes,
  Deploy,
  DeployProcessed,
  DeployStrParams,
  GetAccountResult,
  PaymentStrParams,
  PutDeployResult,
  SessionStrParams,
} from 'casper-sdk';

const MOCK_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_PUBLIC_KEY_ID = '1';
const MOCK_CONTRACT_NAME = 'contract_name';
const MOCK_DEPLOY_HASH =
  'b5a2c29be6e623203262b7266b7abb331a1f2e5d2b3e2c910552e08af25a5c3d';
const MOCK_CONTRACT_HASH =
  'hash-0c440decf5ea7153cafc1d92aa104fb32731af162c97bf97ac895b7b0d7eb3ed';
const MOCK_ID_OFFER = 'offer123';
const MOCK_ID_SPONSOR = 'sponsor456';

const id_offer = MOCK_ID_OFFER;
const id_sponsor = MOCK_ID_SPONSOR;
const name = MOCK_CONTRACT_NAME;
const symbol = 'MT';
const decimals = '18';
const total_supply = '1000000';
const events_mode = true;
const sessionArgs: SessionArg[] = [
  { name: 'name', type: 'String', value: name },
  { name: 'symbol', type: 'String', value: symbol },
  { name: 'decimals', type: 'U8', value: parseInt(decimals, 10) },
  { name: 'total_supply', type: 'U256', value: total_supply },
  { name: 'events_mode', type: 'U8', value: events_mode ? 1 : 0 },
];

const sessionParams = new SessionStrParams();
sessionParams.session_bytes = Bytes.fromUint8Array(new Uint8Array([1]));
sessionParams.session_args_json = JSON.stringify(sessionArgs);

const deployParams = new DeployStrParams('test', MOCK_PUBLIC_KEY);
const paymentParams = new PaymentStrParams('1');
const clonedSessionParams = Object.assign({}, sessionParams);
const clonedDeployParams = Object.assign({}, deployParams);
const clonedPaymentParams = Object.assign({}, paymentParams);

const MOCK_DEPLOY = new Deploy(
  Deploy.withPaymentAndSession(
    deployParams,
    sessionParams,
    paymentParams,
  ).toJson(),
);

export const MOCK_SECRET_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIHsems8mRsnuHcufZHYofw+RkgYkWDtaTPeEk3iCfRMU
-----END PRIVATE KEY-----`;
const MOCK_DEPLOY_SIGNED = MOCK_DEPLOY.sign(MOCK_SECRET_KEY);

describe('InstallService', () => {
  let installService: InstallService;
  let sdkService: SDKService;
  let makeDeployService: MakeDeployService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallService,
        SDKService,
        {
          provide: MakeDeployService,
          useValue: {
            signDeploy: jest.fn(),
            waitDeploy: jest.fn(),
            putDeploy: jest.fn(),
            createDeployParams: jest.fn().mockReturnValue(clonedDeployParams),
            createSessionParams: jest.fn().mockReturnValue(clonedSessionParams),
            createPaymentParams: jest.fn().mockReturnValue(clonedPaymentParams),
          },
        },
      ],
    }).compile();

    installService = module.get<InstallService>(InstallService);
    sdkService = module.get<SDKService>(SDKService);
    makeDeployService = module.get<MakeDeployService>(MakeDeployService);
  });

  describe('install', () => {
    it('should install successfully', async () => {
      const mockDeployProcessed = {
        deploy_hash: MOCK_DEPLOY_HASH,
      } as unknown as DeployProcessed;
      const mockInstallParams: InstallParams = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
        events_mode,
      };

      jest.spyOn(sdkService.sdk, 'make_deploy').mockReturnValue(MOCK_DEPLOY);

      jest
        .spyOn(makeDeployService, 'signDeploy')
        .mockResolvedValueOnce(MOCK_DEPLOY_SIGNED);

      jest.spyOn(makeDeployService, 'putDeploy').mockResolvedValueOnce({
        deploy_hash: MOCK_DEPLOY_HASH,
      } as unknown as PutDeployResult);

      jest
        .spyOn(makeDeployService, 'waitDeploy')
        .mockResolvedValueOnce(mockDeployProcessed);

      jest
        .spyOn(installService, 'getContractHash')
        .mockResolvedValueOnce(MOCK_CONTRACT_HASH);

      const result = await installService.install(
        mockInstallParams,
        MOCK_PUBLIC_KEY_ID,
        MOCK_PUBLIC_KEY,
      );

      expect(result).toEqual({
        contract_hash: MOCK_CONTRACT_HASH,
        deploy_processed: mockDeployProcessed,
      });

      expect(makeDeployService.signDeploy).toHaveBeenCalledWith(
        MOCK_DEPLOY,
        MOCK_PUBLIC_KEY_ID,
        MOCK_PUBLIC_KEY,
      );

      expect(makeDeployService.putDeploy).toHaveBeenCalledWith(
        MOCK_DEPLOY_SIGNED,
      );

      expect(makeDeployService.waitDeploy).toHaveBeenCalledWith(
        MOCK_DEPLOY_HASH,
      );

      expect(installService.getContractHash).toHaveBeenCalledWith(
        MOCK_PUBLIC_KEY,
        mockInstallParams.name,
      );
    });

    it('should raise error if wasm is not found', async () => {
      const wrong_file_path = 'wasm/non-existing.wasm';
      await expect(installService['loadFile'](wrong_file_path)).rejects.toThrow(
        `Error reading file: ENOENT: no such file or directory`,
      );
    });

    it('should raise error if wasm is not read', async () => {
      installService['loadFile'] = jest.fn().mockResolvedValueOnce(undefined);
      await expect(
        installService['createDeploy'](undefined, undefined, undefined),
      ).rejects.toThrow('Failed to read wasm file.');
    });
  });

  describe('getContractHash', () => {
    it('should get contract hash successfully', async () => {
      const mockAccountResult = {
        account: {
          named_keys: [
            {
              name: `cep18_contract_hash_${MOCK_CONTRACT_NAME}`,
              key: MOCK_CONTRACT_HASH,
            },
            { name: 'other_key', key: 'other_value' },
          ],
        },
      } as unknown as GetAccountResult;

      jest.spyOn(sdkService.sdk, 'get_account_options');

      jest
        .spyOn(sdkService.sdk, 'get_account')
        .mockResolvedValueOnce(mockAccountResult);

      const result = await installService.getContractHash(
        MOCK_PUBLIC_KEY,
        MOCK_CONTRACT_NAME,
      );

      expect(result).toEqual(MOCK_CONTRACT_HASH);

      expect(sdkService.sdk.get_account_options).toHaveBeenCalledWith({
        account_identifier_as_string: MOCK_PUBLIC_KEY,
      });
    });

    it('should throw HttpException if contract hash is not found', async () => {
      const mockAccountResult = {
        account: {
          named_keys: [{ name: 'other_key', key: 'other_value' }],
        },
      } as unknown as GetAccountResult;

      jest.spyOn(sdkService.sdk, 'get_account_options');
      jest
        .spyOn(sdkService.sdk, 'get_account')
        .mockResolvedValueOnce(mockAccountResult);

      await expect(
        installService.getContractHash(MOCK_PUBLIC_KEY, MOCK_CONTRACT_NAME),
      ).rejects.toThrow(
        new HttpException(
          `Contract hash not found for the specified collection name : ${MOCK_CONTRACT_NAME}`,
          HttpStatus.NOT_FOUND,
        ),
      );

      expect(sdkService.sdk.get_account_options).toHaveBeenCalledWith({
        account_identifier_as_string: MOCK_PUBLIC_KEY,
      });
    });
  });
});
