import { Test, TestingModule } from '@nestjs/testing';
import { FundService } from '../fund.service';
import { SDKService } from '../sdk.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { EventParseResult, PutDeployResult } from 'casper-sdk';
import { MOCK_SECRET_KEY } from './install.service.spec';

const MOCK_TARGET_ACCOUNT =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_DEPLOY_HASH =
  'b5a2c29be6e623203262b7266b7abb331a1f2e5d2b3e2c910552e08af25a5c3d';

describe('FundService', () => {
  process.env.FAUCET_PRIVATE_KEY = MOCK_SECRET_KEY;
  let fundService: FundService;
  let sdkService: SDKService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundService,
        {
          provide: SDKService,
          useValue: {
            chain_name: 'test_chain',
            sdk: {
              transfer: jest.fn(),
              waitDeploy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    fundService = module.get<FundService>(FundService);
    sdkService = module.get<SDKService>(SDKService);
  });

  it('should create fund service', async () => {
    expect(fundService).toBeDefined();
  });

  it('should error to create fund service without FAUCET_PRIVATE_KEY env var', async () => {
    const backup = process.env.FAUCET_PRIVATE_KEY;
    const message = 'Error no faucet key';
    let error: { message: any; getStatus: () => any; };
    try {
      delete process.env.FAUCET_PRIVATE_KEY;
      new FundService(sdkService);
    } catch (e) {
      error = e;
    } finally {
      process.env.FAUCET_PRIVATE_KEY = backup;
    }
    expect(error).toBeDefined();
    expect(error.message).toEqual(message);
    expect(error instanceof HttpException).toBeTruthy();
    expect(error.getStatus()).toEqual(HttpStatus.EXPECTATION_FAILED);
  });

  it('should fund an account successfully', async () => {
    const mockDeployResult = {
      deploy_hash: MOCK_DEPLOY_HASH,
    } as unknown as PutDeployResult;

    const mockEventParseResult = {
      body: { DeployProcessed: {} },
    } as unknown as EventParseResult;

    jest
      .spyOn(sdkService.sdk, 'transfer')
      .mockResolvedValueOnce(mockDeployResult);
    jest
      .spyOn(sdkService.sdk, 'waitDeploy')
      .mockResolvedValueOnce(Promise.resolve(mockEventParseResult));

    const result = await fundService.fund(
      fundService.payment_amount,
      MOCK_TARGET_ACCOUNT,
    );

    expect(result.deploy_processed).toEqual(
      mockEventParseResult.body?.DeployProcessed,
    );
    expect(result.target_account).toEqual(MOCK_TARGET_ACCOUNT);
  });

  it('should handle funding failure with an error in event parsing', async () => {
    const mockDeployResult = {
      deploy_hash: MOCK_DEPLOY_HASH,
    } as unknown as PutDeployResult;
    const mockEventParseResult = {
      err: new Error('Event parsing error'),
    } as unknown as EventParseResult;

    jest
      .spyOn(sdkService.sdk, 'transfer')
      .mockResolvedValueOnce(mockDeployResult);
    jest
      .spyOn(sdkService.sdk, 'waitDeploy')
      .mockResolvedValueOnce(Promise.resolve(mockEventParseResult));

    await expect(
      fundService.fund(fundService.payment_amount, MOCK_TARGET_ACCOUNT),
    ).rejects.toThrow(
      new HttpException(
        `Error funding public key ${MOCK_TARGET_ACCOUNT} ${mockEventParseResult.err.toString()}`,
        HttpStatus.EXPECTATION_FAILED,
      ),
    );
  });

  it('should handle funding failure with no body in event parsing result', async () => {
    const mockDeployResult = {
      deploy_hash: MOCK_DEPLOY_HASH,
    } as unknown as PutDeployResult;
    const mockEventParseResult = {
      body: null,
    };

    jest
      .spyOn(sdkService.sdk, 'transfer')
      .mockResolvedValueOnce(mockDeployResult);
    jest
      .spyOn(sdkService.sdk, 'waitDeploy')
      .mockResolvedValueOnce(Promise.resolve(mockEventParseResult));

    await expect(
      fundService.fund(fundService.payment_amount, MOCK_TARGET_ACCOUNT),
    ).rejects.toThrow(
      new HttpException(
        `Error no result body while funding public key ${MOCK_TARGET_ACCOUNT}`,
        HttpStatus.EXPECTATION_FAILED,
      ),
    );
  });
});
