import { Test, TestingModule } from '@nestjs/testing';
import { MakeDeployService, TransferParams } from '../make_deploy.service';
import { SDKService } from '../sdk.service';
import { KeysService } from '../keys.service';
import {
  Deploy,
  DeployHash,
  DeployStrParams,
  EventParseResult,
  Key,
  PaymentStrParams,
  PublicKey,
  SessionStrParams,
} from 'casper-sdk';
import { PutDeployResult } from 'casper-sdk';
import { SessionArg } from '../install.service';

const MOCK_TRANSFER_PARAMS: TransferParams = {
  amount: '100',
  id_offer: 'offer123',
  id_sponsor: 'sponsor456',
  id_investor: 'investor789',
};

const MOCK_DEPLOY_HASH =
  'b5a2c29be6e623203262b7266b7abb331a1f2e5d2b3e2c910552e08af25a5c3d';
const MOCK_CONTRACT_HASH =
  'hash-0c440decf5ea7153cafc1d92aa104fb32731af162c97bf97ac895b7b0d7eb3ed';
const MOCK_FROM_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_TO_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_TO_PUBLIC_KEY_ID = '1';
const MOCK_DEPLOY = new Deploy(
  Deploy.withTransfer(
    '1',
    MOCK_FROM_PUBLIC_KEY,
    undefined,
    new DeployStrParams('test', MOCK_TO_PUBLIC_KEY),
    new PaymentStrParams('1'),
  ).toJson(),
);
const MOCK_SECRET_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIHsems8mRsnuHcufZHYofw+RkgYkWDtaTPeEk3iCfRMU
-----END PRIVATE KEY-----`;
const MOCK_DEPLOY_SIGNED = MOCK_DEPLOY.sign(MOCK_SECRET_KEY);

describe('MakeDeployService', () => {
  let makeDeployService: MakeDeployService;
  let sdkService: SDKService;
  let keysService: KeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MakeDeployService,
        {
          provide: SDKService,
          useValue: {
            sdk: {
              make_deploy: jest.fn(),
              put_deploy: jest.fn(),
              waitDeploy: jest.fn(),
            },
            chain_name: 'test_chain',
          },
        },
        {
          provide: KeysService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    makeDeployService = module.get<MakeDeployService>(MakeDeployService);
    sdkService = module.get<SDKService>(SDKService);
    keysService = module.get<KeysService>(KeysService);
  });

  describe('transfer', () => {
    it('should transfer funds successfully', async () => {
      const mockPutDeployResult = {
        deploy_hash: new DeployHash(MOCK_DEPLOY_HASH),
      } as unknown as PutDeployResult;

      const mockDeployProcessed = {
        deploy_hash: MOCK_DEPLOY_HASH,
      };

      const mockEventParseResult = {
        body: { DeployProcessed: mockDeployProcessed },
      } as EventParseResult;

      jest.spyOn(sdkService.sdk, 'make_deploy').mockReturnValue(MOCK_DEPLOY);
      jest
        .spyOn(keysService, 'sign')
        .mockResolvedValueOnce(JSON.stringify(MOCK_DEPLOY_SIGNED.toJson()));
      jest
        .spyOn(sdkService.sdk, 'put_deploy')
        .mockResolvedValueOnce(mockPutDeployResult);
      jest
        .spyOn(sdkService.sdk, 'waitDeploy')
        .mockResolvedValueOnce(Promise.resolve(mockEventParseResult));

      const result = await makeDeployService.transfer(
        MOCK_TRANSFER_PARAMS,
        MOCK_CONTRACT_HASH,
        MOCK_TO_PUBLIC_KEY_ID,
        MOCK_FROM_PUBLIC_KEY,
        MOCK_TO_PUBLIC_KEY,
      );

      expect(result).toEqual({
        id_offer: MOCK_TRANSFER_PARAMS.id_offer,
        id_sponsor: MOCK_TRANSFER_PARAMS.id_sponsor,
        id_investor: MOCK_TRANSFER_PARAMS.id_investor,
        recipient_key: MOCK_TO_PUBLIC_KEY,
        amount: MOCK_TRANSFER_PARAMS.amount,
        deploy_processed: mockDeployProcessed,
      });

      expect(sdkService.sdk.make_deploy).toHaveBeenCalled();
      expect(keysService.sign).toHaveBeenCalledWith(
        MOCK_DEPLOY,
        MOCK_TO_PUBLIC_KEY_ID,
        MOCK_FROM_PUBLIC_KEY,
      );
      expect(sdkService.sdk.put_deploy).toHaveBeenCalled();
      expect(sdkService.sdk.waitDeploy).toHaveBeenCalledWith(
        process.env.EVENT_ADDRESS || 'http://localhost:18101/events/main',
        MOCK_DEPLOY_HASH,
      );
    });

    it('should redeem funds successfully', async () => {
      const mockPutDeployResult = {
        deploy_hash: new DeployHash(MOCK_DEPLOY_HASH),
      } as unknown as PutDeployResult;

      const mockDeployProcessed = {
        deploy_hash: MOCK_DEPLOY_HASH,
      };

      const mockEventParseResult = {
        body: { DeployProcessed: mockDeployProcessed },
      } as EventParseResult;

      jest.spyOn(sdkService.sdk, 'make_deploy').mockReturnValue(MOCK_DEPLOY);
      jest
        .spyOn(keysService, 'sign')
        .mockResolvedValueOnce(JSON.stringify(MOCK_DEPLOY_SIGNED.toJson()));
      jest
        .spyOn(sdkService.sdk, 'put_deploy')
        .mockResolvedValueOnce(mockPutDeployResult);
      jest
        .spyOn(sdkService.sdk, 'waitDeploy')
        .mockResolvedValueOnce(Promise.resolve(mockEventParseResult));

      const transfer_params = { ...MOCK_TRANSFER_PARAMS, redeem: true };
      const result = await makeDeployService.transfer(
        transfer_params,
        MOCK_CONTRACT_HASH,
        MOCK_TO_PUBLIC_KEY_ID,
        MOCK_FROM_PUBLIC_KEY,
        MOCK_TO_PUBLIC_KEY,
      );

      expect(result).toEqual({
        id_offer: MOCK_TRANSFER_PARAMS.id_offer,
        id_sponsor: MOCK_TRANSFER_PARAMS.id_sponsor,
        id_investor: MOCK_TRANSFER_PARAMS.id_investor,
        recipient_key: MOCK_TO_PUBLIC_KEY,
        amount: MOCK_TRANSFER_PARAMS.amount,
        deploy_processed: mockDeployProcessed,
      });

      expect(sdkService.sdk.make_deploy).toHaveBeenCalled();
      expect(keysService.sign).toHaveBeenCalledWith(
        MOCK_DEPLOY,
        MOCK_TO_PUBLIC_KEY_ID,
        MOCK_FROM_PUBLIC_KEY,
      );
      expect(sdkService.sdk.put_deploy).toHaveBeenCalled();
      expect(sdkService.sdk.waitDeploy).toHaveBeenCalledWith(
        process.env.EVENT_ADDRESS || 'http://localhost:18101/events/main',
        MOCK_DEPLOY_HASH,
      );
    });
  });

  describe('signDeploy', () => {
    it('should sign a deploy successfully', async () => {
      const signed_deploy = JSON.stringify(MOCK_DEPLOY_SIGNED.toJson());
      jest.spyOn(keysService, 'sign').mockResolvedValueOnce(signed_deploy);

      const result = await makeDeployService.signDeploy(
        MOCK_DEPLOY,
        MOCK_TO_PUBLIC_KEY_ID,
        MOCK_FROM_PUBLIC_KEY,
      );

      expect(result.toJson()).toEqual(MOCK_DEPLOY_SIGNED.toJson());
      expect(keysService.sign).toHaveBeenCalledWith(
        MOCK_DEPLOY,
        MOCK_TO_PUBLIC_KEY_ID,
        MOCK_FROM_PUBLIC_KEY,
      );
    });
  });

  describe('putDeploy', () => {
    it('should put a deploy successfully', async () => {
      const mockPutDeployResult = {
        deploy_hash: new DeployHash(MOCK_DEPLOY_HASH),
      } as unknown as PutDeployResult;

      jest
        .spyOn(sdkService.sdk, 'put_deploy')
        .mockResolvedValueOnce(mockPutDeployResult);

      const result = await makeDeployService.putDeploy(MOCK_DEPLOY);

      expect(result).toEqual(mockPutDeployResult);
      expect(sdkService.sdk.put_deploy).toHaveBeenCalledWith(MOCK_DEPLOY);
    });
  });

  describe('waitDeploy', () => {
    it('should wait for a deploy successfully', async () => {
      process.env.EVENT_ADDRESS = 'http://custom-event:18101/events/main';
      const expectedEventAddress = process.env.EVENT_ADDRESS;
      const makeDeployService = new MakeDeployService(sdkService, keysService);
      const mockDeployProcessed = {
        deploy_hash: MOCK_DEPLOY_HASH,
      };

      const mockEventParseResult = {
        body: { DeployProcessed: mockDeployProcessed },
      } as EventParseResult;

      jest
        .spyOn(sdkService.sdk, 'waitDeploy')
        .mockResolvedValueOnce(Promise.resolve(mockEventParseResult));

      const result = await makeDeployService.waitDeploy(MOCK_DEPLOY_HASH);

      expect(result).toEqual(mockDeployProcessed);
      expect(sdkService.sdk.waitDeploy).toHaveBeenCalledWith(
        expectedEventAddress,
        MOCK_DEPLOY_HASH,
      );
    });
  });

  describe('createDeployParams', () => {
    it('should create deploy parameters successfully', () => {
      const session_account =
        makeDeployService.createDeployParams(
          MOCK_FROM_PUBLIC_KEY,
        ).session_account;

      expect(session_account).toEqual(
        new DeployStrParams(sdkService.chain_name, MOCK_FROM_PUBLIC_KEY)
          .session_account,
      );
    });
  });

  describe('createSessionParams', () => {
    it('should create session parameters successfully', () => {
      const recipient = new PublicKey(MOCK_TO_PUBLIC_KEY);
      const recipient_account_hash = recipient.toAccountHash();
      const recipient_key = Key.fromAccount(
        recipient_account_hash,
      ).toFormattedString();
      const mockSessionArgs: SessionArg[] = [
        { name: 'amount', type: 'U256', value: MOCK_TRANSFER_PARAMS.amount },
        { name: 'recipient', type: 'Key', value: recipient_key },
        {
          name: 'id_investor',
          type: 'String',
          value: MOCK_TRANSFER_PARAMS.id_investor,
        },
      ];

      const session_args_json =
        makeDeployService.createSessionParams(
          mockSessionArgs,
        ).session_args_json;

      const expectedSessionParams = new SessionStrParams();
      expectedSessionParams.session_args_json = JSON.stringify(mockSessionArgs);
      expect(session_args_json).toEqual(
        expectedSessionParams.session_args_json,
      );
    });
  });

  describe('createPaymentParams', () => {
    it('should create payment parameters successfully', () => {
      const payment_amount = makeDeployService.createPaymentParams(
        makeDeployService.transferPaymentAmount,
      ).payment_amount;

      expect(payment_amount).toEqual(
        new PaymentStrParams(makeDeployService.transferPaymentAmount)
          .payment_amount,
      );
    });
  });
});
