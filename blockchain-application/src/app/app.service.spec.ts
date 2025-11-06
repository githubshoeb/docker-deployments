import { Test, TestingModule } from '@nestjs/testing';
import { AppService, BalanceParams } from './app.service';
import { BalanceService } from '../lib/services/balance.service';
import { OfferService } from '../lib/services/offer.service';
import { OfferEntity } from '../lib/data-access/offer.entity';
import { PublicKeyService } from '../lib/services/public-key.service';
import {
  DECIMALS_DEFAULT,
  InstallService,
  TOTAL_SUPPLY_DEFAULT,
  InstallParams,
} from '../lib/services/install.service';
import { SDKService } from '../lib/services/sdk.service';
import {
  MakeDeployService,
  TransferParams,
  TransferReturn,
} from '../lib/services/make_deploy.service';
import { FundService, FundReturn } from '../lib/services/fund.service';
import { InvestorEntity } from 'lib/data-access/investor.entity';
import { SponsorEntity } from 'lib/data-access/sponsor.entity';
import { GetNodeStatusResult, GetPeersResult } from 'casper-sdk';
import { HttpException, HttpStatus } from '@nestjs/common';

const MOCK_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_PUBLIC_KEY_ID = '1';
const MOCK_PUBLIC_KEY_PAIR = {
  public_key: MOCK_PUBLIC_KEY,
  key_id: MOCK_PUBLIC_KEY_ID,
};
const MOCK_CONTRACT_HASH =
  'hash-0c440decf5ea7153cafc1d92aa104fb32731af162c97bf97ac895b7b0d7eb3ed';
const MOCK_CONTRACT_NAME = 'MyToken';
const MOCK_CONTRACT_SYMBOL = 'MT';
const MOCK_BALANCE =
  '{"CLValue":{"cl_type":"U256","bytes":"010a","parsed":"10"}}';
const MOCK_ID_OFFER = 'offer123';
const MOCK_ID_SPONSOR = 'sponsor456';
const MOCK_ID_INVESTOR = 'investor789';
const MOCK_DEPLOY_HASH =
  'b5a2c29be6e623203262b7266b7abb331a1f2e5d2b3e2c910552e08af25a5c3d';
const MOCK_OFFER = {
  id_offer: MOCK_ID_OFFER,
  name: MOCK_CONTRACT_NAME,
  symbol: MOCK_CONTRACT_SYMBOL,
  contract_hash: MOCK_CONTRACT_HASH,
} as unknown as OfferEntity;
const MOCK_BALANCE_CSPR = '10000000000';
const MOCK_ACCOUNT_CREATION_PAYMENT_AMOUNT = '2500000000';

const hello_casper = 'Hello Casper!';
const id_offer = MOCK_ID_OFFER;
const id_sponsor = MOCK_ID_SPONSOR;
const id_investor = MOCK_ID_INVESTOR;
const name = MOCK_CONTRACT_NAME;
const symbol = MOCK_CONTRACT_SYMBOL;
const decimals = DECIMALS_DEFAULT;
const total_supply = TOTAL_SUPPLY_DEFAULT;
const amount = '100';

const mockBalanceService = {
  getBalance: jest.fn().mockResolvedValue(MOCK_BALANCE),
  getCSPRBalance: jest.fn().mockResolvedValue(MOCK_BALANCE_CSPR),
};

const mockOfferService = {
  getOfferContractHash: jest.fn().mockResolvedValue({
    contract_hash: MOCK_CONTRACT_HASH,
  } as OfferEntity),
  saveOffer: jest.fn().mockResolvedValue(MOCK_OFFER),
  getOfferRecordByIdOffer: jest.fn(),
  getOfferRecordByNameOrSymbol: jest.fn(),
};

const mockSDKService = {
  sdk: {
    get_peers: jest.fn(),
    get_node_status: jest.fn(),
  },
};

const mockfundResult = {
  DeployProcessed: {},
  target_account: MOCK_PUBLIC_KEY,
} as unknown as FundReturn;

const mockFundService = {
  fund: jest.fn().mockResolvedValue(mockfundResult),
};

const mockDeployProcessed = {
  deploy_hash: MOCK_DEPLOY_HASH,
  account: MOCK_PUBLIC_KEY,
  execution_result: {
    Success: { cost: '239915762831' },
  },
};

const mockInstallService = {
  install: jest.fn().mockResolvedValue({
    contract_hash: MOCK_CONTRACT_HASH,
    deploy_processed: mockDeployProcessed,
  }),
};

const sponsorEntity = {
  id_sponsor,
  public_key: MOCK_PUBLIC_KEY,
  key_id: MOCK_PUBLIC_KEY_ID,
} as unknown as SponsorEntity;

const investorEntity = {
  id_investor,
  public_key: MOCK_PUBLIC_KEY,
  key_id: MOCK_PUBLIC_KEY_ID,
} as unknown as InvestorEntity;

const publicKeyServiceMock = {
  getInvestorRecordById: jest.fn().mockResolvedValue({
    public_key: MOCK_PUBLIC_KEY,
    key_id: MOCK_PUBLIC_KEY_ID,
  } as unknown as InvestorEntity),
  getSponsorRecordById: jest.fn().mockResolvedValue(sponsorEntity),
  getOrCreateSponsorPublicKey: jest
    .fn()
    .mockResolvedValue(MOCK_PUBLIC_KEY_PAIR),
  getOrCreateInvestorPublicKey: jest
    .fn()
    .mockResolvedValue(MOCK_PUBLIC_KEY_PAIR),
  getSponsorWithOffersById: jest.fn().mockResolvedValue({
    ...sponsorEntity,
    offers: [],
  } as unknown as SponsorEntity),
  getInvestorWithOffersById: jest.fn().mockResolvedValue({
    ...investorEntity,
    offers: [],
  } as unknown as InvestorEntity),
  saveSponsor: jest.fn().mockResolvedValue(sponsorEntity),
  saveInvestor: jest.fn().mockResolvedValue(investorEntity),
};

const mockMakeDeployService = {
  transfer: jest.fn(),
  accountCreationPaymentAmount: MOCK_ACCOUNT_CREATION_PAYMENT_AMOUNT,
};

describe('AppService', () => {
  let appService: AppService;
  let sdkService: SDKService;
  let offerService: OfferService;
  let publicKeyService: PublicKeyService;
  let fundService: FundService;
  let installService: InstallService;
  let makeDeployService: MakeDeployService;
  let balanceService: BalanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: SDKService, useValue: mockSDKService },
        { provide: InstallService, useValue: mockInstallService },
        { provide: MakeDeployService, useValue: mockMakeDeployService },
        { provide: FundService, useValue: mockFundService },
        { provide: OfferService, useValue: mockOfferService },
        { provide: PublicKeyService, useValue: publicKeyServiceMock },
        { provide: BalanceService, useValue: mockBalanceService },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
    sdkService = module.get<SDKService>(SDKService);
    offerService = module.get<OfferService>(OfferService);
    publicKeyService = module.get<PublicKeyService>(PublicKeyService);
    fundService = module.get<FundService>(FundService);
    installService = module.get<InstallService>(InstallService);
    makeDeployService = module.get<MakeDeployService>(MakeDeployService);
    balanceService = module.get<BalanceService>(BalanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return "Hello Casper!"', () => {
    const result = appService.get_hello();
    expect(result).toEqual(hello_casper);
  });

  describe('Installation', () => {
    describe('validateInstallArgs', () => {
      it('should throw an error for missing contract name', () => {
        const invalidParams: InstallParams = {
          name: undefined,
          symbol: 'SYM',
          total_supply: '100',
          decimals: '2',
          id_sponsor: 'sponsorId',
          id_offer: 'offerId',
        };

        expect(() => appService['validateInstallArgs'](invalidParams)).toThrow(
          new HttpException(
            `Error missing name in install parameters: {\"symbol\":\"SYM\",\"total_supply\":\"100\",\"decimals\":\"2\",\"id_sponsor\":\"sponsorId\",\"id_offer\":\"offerId\"}`,
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw an error for missing contract symbol', () => {
        const invalidParams: InstallParams = {
          name: 'TestContract',
          symbol: undefined,
          total_supply: '100',
          decimals: '2',
          id_sponsor: 'sponsorId',
          id_offer: 'offerId',
        };

        expect(() => appService['validateInstallArgs'](invalidParams)).toThrow(
          new HttpException(
            `Error missing symbol in install parameters: {\"name\":\"TestContract\",\"total_supply\":\"100\",\"decimals\":\"2\",\"id_sponsor\":\"sponsorId\",\"id_offer\":\"offerId\"}`,
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw an error for missing total_supply', () => {
        const invalidParams: InstallParams = {
          name: 'TestContract',
          symbol: 'SYM',
          total_supply: undefined,
          decimals: '2',
          id_sponsor: 'sponsorId',
          id_offer: 'offerId',
        };

        expect(() => appService['validateInstallArgs'](invalidParams)).toThrow(
          new HttpException(
            `Error missing total_supply in install parameters: {\"name\":\"TestContract\",\"symbol\":\"SYM\",\"decimals\":\"2\",\"id_sponsor\":\"sponsorId\",\"id_offer\":\"offerId\"}`,
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw an error for missing decimals', () => {
        const invalidParams: InstallParams = {
          name: 'TestContract',
          symbol: 'SYM',
          total_supply: '100',
          decimals: undefined,
          id_sponsor: 'sponsorId',
          id_offer: 'offerId',
        };

        expect(() => appService['validateInstallArgs'](invalidParams)).toThrow(
          new HttpException(
            `Error missing decimals in install parameters: {\"name\":\"TestContract\",\"symbol\":\"SYM\",\"total_supply\":\"100\",\"id_sponsor\":\"sponsorId\",\"id_offer\":\"offerId\"}`,
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw an error for missing id_sponsor', () => {
        const invalidParams: InstallParams = {
          name: 'TestContract',
          symbol: 'SYM',
          total_supply: '100',
          decimals: '2',
          id_sponsor: undefined,
          id_offer: 'offerId',
        };

        expect(() => appService['validateInstallArgs'](invalidParams)).toThrow(
          new HttpException(
            `Error missing id_sponsor in install parameters: {\"name\":\"TestContract\",\"symbol\":\"SYM\",\"total_supply\":\"100\",\"decimals\":\"2\",\"id_offer\":\"offerId\"}`,
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw an error for missing id_offer', () => {
        const invalidParams: InstallParams = {
          name: 'TestContract',
          symbol: 'SYM',
          total_supply: '100',
          decimals: '2',
          id_sponsor: 'sponsorId',
          id_offer: undefined,
        };

        expect(() => appService['validateInstallArgs'](invalidParams)).toThrow(
          new HttpException(
            `Error missing id_offer in install parameters: {\"name\":\"TestContract\",\"symbol\":\"SYM\",\"total_supply\":\"100\",\"decimals\":\"2\",\"id_sponsor\":\"sponsorId\"}`,
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should not throw an error for valid parameters', () => {
        const validParams: InstallParams = {
          name: 'TestContract',
          symbol: 'SYM',
          total_supply: '100',
          decimals: '2',
          id_sponsor: 'sponsorId',
          id_offer: 'offerId',
        };

        expect(() =>
          appService['validateInstallArgs'](validParams),
        ).not.toThrow();
      });
    });

    it('should install offer', async () => {
      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };

      const result = await appService.install(params);
      expect(result).toHaveProperty('id_offer', MOCK_ID_OFFER);
      expect(result).toHaveProperty('id_sponsor', MOCK_ID_SPONSOR);
      expect(result).toHaveProperty('sponsor_public_key', MOCK_PUBLIC_KEY);
      expect(result).toHaveProperty('contract_hash', MOCK_CONTRACT_HASH);
      expect(result).toHaveProperty(
        'deploy_processed.deploy_hash',
        MOCK_DEPLOY_HASH,
      );
      expect(result).toHaveProperty(
        'deploy_processed.account',
        MOCK_PUBLIC_KEY,
      );
    });

    it('should error on installing an existig offer id', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Offer id already created: ${params.id_offer}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on installing an existig offer name', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByNameOrSymbol')
        .mockResolvedValueOnce(MOCK_OFFER);
      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Offer name or symbol already created: ${name} ${symbol}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on installing an existig offer symbol', async () => {
      const new_name = name + 'test';
      jest
        .spyOn(offerService, 'getOfferRecordByNameOrSymbol')
        .mockResolvedValueOnce(MOCK_OFFER);
      const params = {
        id_offer,
        id_sponsor,
        name: new_name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Offer name or symbol already created: ${name} ${symbol}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on empty sponsor public key', async () => {
      jest
        .spyOn(publicKeyService, 'getOrCreateSponsorPublicKey')
        .mockResolvedValueOnce(undefined);
      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Sponsor public key not found during install: ${id_sponsor}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on not funding a new sponsor', async () => {
      jest.spyOn(fundService, 'fund').mockResolvedValueOnce(undefined);

      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Error funding public key: ${MOCK_PUBLIC_KEY}`,
        HttpStatus.FAILED_DEPENDENCY,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to install contract', async () => {
      jest.spyOn(installService, 'install').mockResolvedValueOnce({
        deploy_processed: mockDeployProcessed,
      } as any);

      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Contract Hash not found after install: ${JSON.stringify(
          mockDeployProcessed,
        )}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to save a an offer', async () => {
      jest.spyOn(offerService, 'saveOffer').mockResolvedValueOnce(undefined);

      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Offer not saved: ${params.id_offer}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to save a sponsor offer', async () => {
      jest
        .spyOn(publicKeyService, 'getSponsorWithOffersById')
        .mockResolvedValueOnce(undefined);

      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      const mockHttpException = new HttpException(
        `Sponsor not found during saveOffer: ${params.id_sponsor}`,
        HttpStatus.CONFLICT,
      );
      await expect(appService.install(params)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should raise exception on error', async () => {
      const errorResponse = 'Some db error';
      const message = 'Save Error';

      const error = {
        message,
        response: {
          data: errorResponse,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      };

      jest.spyOn(offerService, 'saveOffer').mockRejectedValueOnce(error);
      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
      };
      try {
        await appService.install(params);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toEqual(message);
        expect(error.response.error.data).toEqual(errorResponse);
        expect(error.getStatus()).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });

    it('should install offer without decimals and total_supply to default', async () => {
      const params = {
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals: undefined,
        total_supply: undefined,
      };
      const backup = appService['validateInstallArgs'];
      appService['validateInstallArgs'] = jest.fn().mockReturnValueOnce(true);

      const result = await appService.install(params);
      expect(result).toHaveProperty('id_offer', MOCK_ID_OFFER);
      expect(result).toHaveProperty('id_sponsor', MOCK_ID_SPONSOR);
      expect(result).toHaveProperty('sponsor_public_key', MOCK_PUBLIC_KEY);
      expect(result).toHaveProperty('contract_hash', MOCK_CONTRACT_HASH);
      expect(result).toHaveProperty(
        'deploy_processed.deploy_hash',
        MOCK_DEPLOY_HASH,
      );
      expect(result).toHaveProperty(
        'deploy_processed.account',
        MOCK_PUBLIC_KEY,
      );
      appService['validateInstallArgs'] = backup;
    });
  });

  describe('Invest', () => {
    it('should invest successfully', async () => {
      const mockTransferResult = {
        deploy_processed: mockDeployProcessed,
        id_offer,
        id_sponsor,
        id_investor,
        recipient_key: MOCK_PUBLIC_KEY,
        amount,
      } as TransferReturn;
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest
        .spyOn(publicKeyService, 'getOrCreateInvestorPublicKey')
        .mockResolvedValueOnce(MOCK_PUBLIC_KEY_PAIR);
      jest
        .spyOn(makeDeployService, 'transfer')
        .mockResolvedValueOnce(mockTransferResult);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const result = await appService.transfer(transferParams);
      expect(result).toEqual(mockTransferResult);
      expect(balanceService.getCSPRBalance).toHaveBeenCalledWith(
        MOCK_PUBLIC_KEY,
      );
      expect(fundService.fund).not.toHaveBeenCalled();
    });

    it('should fund sponsor on invest if CSPR balance is below 2.5 CSPR', async () => {
      const mockTransferResult = {
        deploy_processed: mockDeployProcessed,
        id_offer,
        id_sponsor,
        id_investor,
        recipient_key: MOCK_PUBLIC_KEY,
        amount,
      } as TransferReturn;
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest
        .spyOn(publicKeyService, 'getOrCreateInvestorPublicKey')
        .mockResolvedValueOnce(MOCK_PUBLIC_KEY_PAIR);
      jest
        .spyOn(makeDeployService, 'transfer')
        .mockResolvedValueOnce(mockTransferResult);

      jest
        .spyOn(balanceService, 'getCSPRBalance')
        .mockResolvedValueOnce('2000000000');

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const result = await appService.transfer(transferParams);
      expect(result).toEqual(mockTransferResult);
      expect(balanceService.getCSPRBalance).toHaveBeenCalledWith(
        MOCK_PUBLIC_KEY,
      );
      expect(fundService.fund).toHaveBeenCalledWith(
        mockMakeDeployService.accountCreationPaymentAmount,
        MOCK_PUBLIC_KEY,
      );
    });

    it('should validate transfer params', async () => {
      let transferParams = {
        id_offer: undefined,
        id_sponsor,
        id_investor,
        amount,
      } as TransferParams;
      const mockHttpException = new HttpException(
        `Error missing id_offer in transfer parameters: ${JSON.stringify(
          transferParams,
        )}`,
        HttpStatus.BAD_REQUEST,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );

      transferParams = {
        id_offer,
        id_sponsor: undefined,
        id_investor,
        amount,
      };
      mockHttpException.message = `Error missing id_sponsor in transfer parameters: ${JSON.stringify(
        transferParams,
      )}`;
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );

      transferParams = {
        id_offer,
        id_sponsor,
        id_investor: undefined,
        amount,
      };
      mockHttpException.message = `Error missing id_investor in transfer parameters: ${JSON.stringify(
        transferParams,
      )}`;
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );

      transferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount: undefined,
      };
      mockHttpException.message = `Error missing amount in transfer parameters: ${JSON.stringify(
        transferParams,
      )}`;
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to get an offer', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(undefined);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const mockHttpException = new HttpException(
        `Offer not found: ${id_offer}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to get a sponsor public key', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(undefined);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const mockHttpException = new HttpException(
        `Error getting public_key for id_sponsor ${id_sponsor}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to get an investor public key', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest
        .spyOn(publicKeyService, 'getOrCreateInvestorPublicKey')
        .mockResolvedValueOnce(undefined);
      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const mockHttpException = new HttpException(
        `Error getting or creating public_key for id_investor ${id_investor}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to get an offer contract-hash', async () => {
      const offer_with_empty_contract = {
        contract_hash: undefined,
      } as OfferEntity;
      const mock_offer = {
        ...MOCK_OFFER,
        ...offer_with_empty_contract,
      };
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(mock_offer);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest
        .spyOn(publicKeyService, 'getOrCreateInvestorPublicKey')
        .mockResolvedValueOnce(MOCK_PUBLIC_KEY_PAIR);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const mockHttpException = new HttpException(
        `Error getting offer contract-hash: ${JSON.stringify(transferParams)}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to get transfer execution result success', async () => {
      const failing_deploy_processed: {
        deploy_hash: string;
        account: string;
        execution_result: {
          Success?: {
            cost: string;
          };
          Failure?: any;
        };
      } = {
        ...mockDeployProcessed,
        execution_result: {
          ...mockDeployProcessed.execution_result,
          Success: undefined,
          Failure: { error_message: 'error message' },
        },
      };
      const mockTransferResult = {
        deploy_processed: failing_deploy_processed,
        id_offer,
        id_sponsor,
        id_investor,
        recipient_key: MOCK_PUBLIC_KEY,
        amount,
      } as TransferReturn;
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest
        .spyOn(publicKeyService, 'getOrCreateInvestorPublicKey')
        .mockResolvedValueOnce(MOCK_PUBLIC_KEY_PAIR);
      jest
        .spyOn(makeDeployService, 'transfer')
        .mockResolvedValueOnce(mockTransferResult);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const mockHttpException = new HttpException(
        `Error during deploy transfer: ${JSON.stringify(
          failing_deploy_processed?.execution_result.Failure.error_message,
        )}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should error on failing to process investor offer', async () => {
      const mockTransferResult = {
        deploy_processed: mockDeployProcessed,
        id_offer,
        id_sponsor,
        id_investor,
        recipient_key: MOCK_PUBLIC_KEY,
        amount,
      } as TransferReturn;
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest
        .spyOn(publicKeyService, 'getOrCreateInvestorPublicKey')
        .mockResolvedValueOnce(MOCK_PUBLIC_KEY_PAIR);
      jest
        .spyOn(makeDeployService, 'transfer')
        .mockResolvedValueOnce(mockTransferResult);
      jest
        .spyOn(publicKeyService, 'getInvestorWithOffersById')
        .mockResolvedValueOnce(undefined);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      const mockHttpException = new HttpException(
        `Investor not found: ${id_investor}`,
        HttpStatus.CONFLICT,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
      expect(publicKeyServiceMock.saveInvestor).not.toHaveBeenCalled();
    });

    it('should raise exception on error', async () => {
      const errorResponse = 'Some db error';
      const message = 'Save Error';

      const error = {
        message,
        response: {
          data: errorResponse,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      };

      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockRejectedValueOnce(error);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
      };
      try {
        await appService.transfer(transferParams);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toEqual(message);
        expect(error.response.error.data).toEqual(errorResponse);
        expect(error.getStatus()).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe('Redeem', () => {
    it('should redeem successfully', async () => {
      const mockTransferResult = {
        deploy_processed: mockDeployProcessed,
        id_offer,
        id_sponsor,
        id_investor,
        recipient_key: MOCK_PUBLIC_KEY,
        amount,
      } as TransferReturn;
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest.spyOn(publicKeyService, 'getOrCreateInvestorPublicKey');
      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(investorEntity);
      jest
        .spyOn(makeDeployService, 'transfer')
        .mockResolvedValueOnce(mockTransferResult);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
        redeem: true,
      };
      const result = await appService.transfer(transferParams);
      expect(result).toEqual(mockTransferResult);
      expect(
        publicKeyService.getOrCreateInvestorPublicKey,
      ).not.toHaveBeenCalled();
      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith(
        id_investor,
      );
      expect(balanceService.getCSPRBalance).toHaveBeenCalledWith(
        MOCK_PUBLIC_KEY,
      );
      expect(fundService.fund).not.toHaveBeenCalled();
    });

    it('should error on failing to get an investor public key', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(undefined);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
        redeem: true,
      };
      const mockHttpException = new HttpException(
        `Error getting public_key for id_investor ${id_investor}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
      await expect(appService.transfer(transferParams)).rejects.toThrow(
        mockHttpException,
      );
    });

    it('should fund investor on redeem if CSPR balance is below 2.5 CSPR', async () => {
      const mockTransferResult = {
        deploy_processed: mockDeployProcessed,
        id_offer,
        id_sponsor,
        id_investor,
        recipient_key: MOCK_PUBLIC_KEY,
        amount,
      } as TransferReturn;
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(sponsorEntity);
      jest.spyOn(publicKeyService, 'getOrCreateInvestorPublicKey');
      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(investorEntity);

      jest
        .spyOn(balanceService, 'getCSPRBalance')
        .mockResolvedValueOnce('2000000000');

      jest
        .spyOn(makeDeployService, 'transfer')
        .mockResolvedValueOnce(mockTransferResult);

      const transferParams: TransferParams = {
        id_offer,
        id_sponsor,
        id_investor,
        amount,
        redeem: true,
      };
      const result = await appService.transfer(transferParams);
      expect(result).toEqual(mockTransferResult);
      expect(
        publicKeyService.getOrCreateInvestorPublicKey,
      ).not.toHaveBeenCalled();
      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith(
        id_investor,
      );
      expect(balanceService.getCSPRBalance).toHaveBeenCalledWith(
        MOCK_PUBLIC_KEY,
      );
      expect(fundService.fund).toHaveBeenCalledWith(
        mockMakeDeployService.accountCreationPaymentAmount,
        MOCK_PUBLIC_KEY,
      );
    });
  });

  describe('Get Balance', () => {
    it('should get balance for investor', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        // Provide either id_investor or id_sponsor
        id_investor: MOCK_ID_INVESTOR,
      };

      const spyGetInvestorRecordById = jest.spyOn(
        publicKeyService,
        'getInvestorRecordById',
      );

      const result = await appService.get_balance(params);
      expect(result).toEqual(MOCK_BALANCE);
      expect(spyGetInvestorRecordById).toHaveBeenCalledWith(MOCK_ID_INVESTOR);
    });

    it('should get balance for sponsor', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        // Provide either id_investor or id_sponsor
        id_sponsor: MOCK_ID_SPONSOR,
      };

      const spyGetSponsorRecordById = jest.spyOn(
        publicKeyService,
        'getSponsorRecordById',
      );

      const result = await appService.get_balance(params);
      expect(result).toEqual(MOCK_BALANCE);
      expect(spyGetSponsorRecordById).toHaveBeenCalledWith(MOCK_ID_SPONSOR);
    });

    it('should error on get balance when sponsor and investor', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        id_sponsor: MOCK_ID_SPONSOR,
        id_investor: MOCK_ID_INVESTOR,
      };

      await expect(appService.get_balance(params)).rejects.toThrow(
        new HttpException(
          `Error id_sponsor or id_investor in balance parameters: {\"id_offer\":\"${MOCK_ID_OFFER}\",\"id_sponsor\":\"${MOCK_ID_SPONSOR}\",\"id_investor\":\"${MOCK_ID_INVESTOR}\"}`,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should error on get balance when no offer', async () => {
      const params: BalanceParams = {
        id_offer: undefined,
        id_sponsor: MOCK_ID_SPONSOR,
      };

      await expect(appService.get_balance(params)).rejects.toThrow(
        new HttpException(
          `Error missing id_offer in balance parameters: {\"id_sponsor\":\"${MOCK_ID_SPONSOR}\"}`,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should error get balance for investor not found', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        id_investor: MOCK_ID_INVESTOR,
      };

      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(undefined);

      await expect(appService.get_balance(params)).rejects.toThrow(
        new HttpException(
          `Error getting public_key for id_investor ${MOCK_ID_INVESTOR}`,
          HttpStatus.PRECONDITION_REQUIRED,
        ),
      );
    });

    it('should error get balance for sponsor not found', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        // Provide either id_investor or id_sponsor
        id_sponsor: MOCK_ID_SPONSOR,
      };

      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(undefined);

      await expect(appService.get_balance(params)).rejects.toThrow(
        new HttpException(
          `Error getting public_key for id_sponsor ${MOCK_ID_SPONSOR}`,
          HttpStatus.PRECONDITION_REQUIRED,
        ),
      );
    });

    it('should error get balance for investor public key is empty', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        id_investor: MOCK_ID_SPONSOR,
      };

      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce({
          publick_key: '',
        } as unknown as InvestorEntity);

      await expect(appService.get_balance(params)).rejects.toThrow(
        new HttpException(
          `Error getting public_key for params ${JSON.stringify(params)}`,
          HttpStatus.PRECONDITION_REQUIRED,
        ),
      );
    });

    it('should error get balance for sponsor public key is empty', async () => {
      const params: BalanceParams = {
        id_offer: MOCK_ID_OFFER,
        id_sponsor: MOCK_ID_SPONSOR,
      };

      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce({ publick_key: '' } as unknown as SponsorEntity);

      await expect(appService.get_balance(params)).rejects.toThrow(
        new HttpException(
          `Error getting public_key for params ${JSON.stringify(params)}`,
          HttpStatus.PRECONDITION_REQUIRED,
        ),
      );
    });
  });
  describe('Endpoints connectivity', () => {
    it('should get peers', async () => {
      const mockPeers = {
        peers: JSON.parse(
          '[{"node_id":"tls:0e8a..4a6b","address":"127.0.0.1:22104"},{"node_id":"tls:30cf..3239","address":"127.0.0.1:22102"},{"node_id":"tls:421c..3730","address":"127.0.0.1:22105"},{"node_id":"tls:47c4..b1b2","address":"127.0.0.1:22103"}]',
        ),
      } as GetPeersResult;
      jest.spyOn(sdkService.sdk, 'get_peers').mockResolvedValueOnce(mockPeers);

      const result = await appService.get_peers();
      expect(result).toEqual(mockPeers.peers);
    });

    it('should get node status', async () => {
      const mockNodeStatus = {
        toJson: () =>
          JSON.parse(
            '{"api_version":"1.0.0","chainspec_name":"casper-net-1","starting_state_root_hash":"acbfbb07d5aa37b3ab0ec80c6ba0e16286579bf426120af8a04617cca4d1ed90","peers":[{"node_id":"tls:0e8a..4a6b","address":"127.0.0.1:22104"},{"node_id":"tls:30cf..3239","address":"127.0.0.1:22102"},{"node_id":"tls:421c..3730","address":"127.0.0.1:22105"},{"node_id":"tls:47c4..b1b2","address":"127.0.0.1:22103"}],"last_added_block_info":{"hash":"f52c66b8506c984fc23ec183f8d04cba0f4ad818f1dd3be8e43d33f929a14155","timestamp":"2024-02-27T23:00:37.504Z","era_id":27049,"height":280079,"state_root_hash":"ecbeacf50688feedccd636aa884623693f1ffaed9d11dea99d22deeb4b163f85","creator":"016063f95e2af93ff35540123a140f81649efe60023d5d9ca88e2859755a6a00bf"},"our_public_signing_key":"017983732b4d887d35105b66f421eb5df8c2f2d3fedd7e0854f9861597b1413766","round_length":"4s 96ms","next_upgrade":null,"build_version":"1.5.6","uptime":"14days 2h 31m 58s 8ms","reactor_state":"Validate","last_progress":"2024-02-13T20:28:46.062Z","available_block_range":{"low":0,"high":280079},"block_sync":{"historical":null,"forward":null}}',
          ),
      } as GetNodeStatusResult;

      jest
        .spyOn(sdkService.sdk, 'get_node_status')
        .mockResolvedValueOnce(mockNodeStatus);

      const result = await appService.get_node_status();
      expect(result).toEqual(mockNodeStatus.toJson());
    });
  });
});
