import { Test, TestingModule } from '@nestjs/testing';
import { SDKService } from '../sdk.service';
import { SDK } from 'casper-sdk';

describe('SDKService without dotenv', () => {
  let sdkService: SDKService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SDKService],
    }).compile();

    sdkService = module.get<SDKService>(SDKService);
  });

  it('should be defined', () => {
    expect(sdkService).toBeDefined();
  });

  it('should create an instance of SDK', () => {
    expect(sdkService.sdk).toBeInstanceOf(SDK);
  });

  it('should have default values if environment variables are not set', () => {
    const expectedNodeAddress =
      process.env.NODE_ADDRESS || 'http://localhost:11101';
    const expectedChainName = 'casper-net-1';

    expect(sdkService.node_address).toEqual(expectedNodeAddress);
    expect(sdkService.chain_name).toEqual(expectedChainName);
  });

  it('should create an instance of SDK with the correct node address', () => {
    const expectedNodeAddress =
      process.env.NODE_ADDRESS || 'http://localhost:11101';
    expect(sdkService.sdk.getNodeAddress()).toEqual(expectedNodeAddress);
  });
});

describe('SDKService with dotenv', () => {
  let sdkService: SDKService;

  beforeAll(async () => {
    process.env.NODE_ADDRESS = 'http://custom:11101';
    process.env.CHAIN_NAME = 'chainename';
    const module: TestingModule = await Test.createTestingModule({
      providers: [SDKService],
    }).compile();

    sdkService = module.get<SDKService>(SDKService);
  });

  it('should have default values if environment variables are set', () => {
    const expectedNodeAddress = process.env.NODE_ADDRESS;
    const expectedChainName = process.env.CHAIN_NAME;
    expect(sdkService.node_address).toEqual(expectedNodeAddress);
    expect(sdkService.chain_name).toEqual(expectedChainName);
  });
});
