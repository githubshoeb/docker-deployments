import { Test, TestingModule } from '@nestjs/testing';
import { PublicKeyService } from '../public-key.service';
import { KeysService } from '../keys.service';
import { FundService, FundReturn } from '../fund.service';
import { MakeDeployService } from '../make_deploy.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvestorEntity } from '../../../lib/data-access/investor.entity';
import { SponsorEntity } from '../../../lib/data-access/sponsor.entity';
import { SDKService } from '../sdk.service';
import { HttpException, HttpStatus } from '@nestjs/common';

const MOCK_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_PUBLIC_KEY_ID = '1';
const MOCK_PUBLIC_KEY_PAIR = {
  public_key: MOCK_PUBLIC_KEY,
  key_id: MOCK_PUBLIC_KEY_ID,
};
const mockGenerateKeypair = {
  publicKeyHex: MOCK_PUBLIC_KEY,
  id: MOCK_PUBLIC_KEY_ID,
};

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

const mockfundResult = {
  DeployProcessed: {},
  target_account: MOCK_PUBLIC_KEY,
} as unknown as FundReturn;

describe('PublicKeyService', () => {
  let publicKeyService: PublicKeyService;
  let investorRepository: Repository<InvestorEntity>;
  let sponsorRepository: Repository<SponsorEntity>;
  let fundService: FundService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicKeyService,
        FundService,
        MakeDeployService,
        {
          provide: SDKService,
          useValue: jest.fn(),
        },
        {
          provide: FundService,
          useValue: {
            fund: jest.fn().mockResolvedValue(mockfundResult),
          },
        },
        {
          provide: KeysService,
          useValue: {
            generateKeypair: jest
              .fn()
              .mockResolvedValueOnce(mockGenerateKeypair),
          },
        },
        {
          provide: getRepositoryToken(InvestorEntity),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(SponsorEntity),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    publicKeyService = module.get<PublicKeyService>(PublicKeyService);
    fundService = module.get<FundService>(FundService);
    investorRepository = module.get<Repository<InvestorEntity>>(
      getRepositoryToken(InvestorEntity),
    );
    sponsorRepository = module.get<Repository<SponsorEntity>>(
      getRepositoryToken(SponsorEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateInvestorPublicKey', () => {
    it('should return public key when record exists', async () => {
      const mockInvestorRecord = MOCK_PUBLIC_KEY_PAIR as InvestorEntity;

      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(mockInvestorRecord);

      const result = await publicKeyService.getOrCreateInvestorPublicKey('1');
      expect(result.public_key).toEqual(MOCK_PUBLIC_KEY);
      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith('1');
    });

    it('should return error key when investor record exists without public key', async () => {
      const mockInvestorRecord = {
        public_key: undefined,
      } as unknown as InvestorEntity;

      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(mockInvestorRecord);

      await expect(
        publicKeyService.getOrCreateInvestorPublicKey('1'),
      ).rejects.toThrow(
        new HttpException(
          `Error getting public key from db`,
          HttpStatus.FAILED_DEPENDENCY,
        ),
      );
      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith('1');
    });

    it('should create and return public key when record does not exist', async () => {
      const id_investor = '1';
      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(undefined);

      jest.spyOn(investorRepository, 'save').mockResolvedValueOnce({
        id_investor,
        public_key: MOCK_PUBLIC_KEY,
        key_id: MOCK_PUBLIC_KEY_ID,
      } as unknown as InvestorEntity);

      const result = await publicKeyService.getOrCreateInvestorPublicKey('1');

      expect(result.public_key).toEqual(MOCK_PUBLIC_KEY);
      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith('1');
      expect(investorRepository.save).toHaveBeenCalledWith({
        id_investor,
        key_id: MOCK_PUBLIC_KEY_ID,
        public_key: MOCK_PUBLIC_KEY,
      });
    });

    it('should return error key when investor can not be funded', async () => {
      jest.spyOn(fundService, 'fund').mockResolvedValueOnce(undefined);
      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(undefined);

      await expect(
        publicKeyService.getOrCreateInvestorPublicKey('1'),
      ).rejects.toThrow(
        new HttpException(
          `Error funding public key: ${MOCK_PUBLIC_KEY}`,
          HttpStatus.PAYMENT_REQUIRED,
        ),
      );

      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith('1');
    });

    it('should return error key when investor record can not be saved', async () => {
      const errorResponse = { message: 'Some db error' };
      const message = 'Save Error';

      const error = {
        message,
        response: {
          data: errorResponse,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      };
      jest
        .spyOn(publicKeyService, 'getInvestorRecordById')
        .mockResolvedValueOnce(undefined);
      jest.spyOn(investorRepository, 'save').mockRejectedValue(error);

      await expect(
        publicKeyService.getOrCreateInvestorPublicKey('1'),
      ).rejects.toThrow(
        new HttpException(
          {
            message: error?.message,
            error: error?.response,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );

      expect(publicKeyService.getInvestorRecordById).toHaveBeenCalledWith('1');
    });
  });

  describe('getOrCreateSponsorPublicKey', () => {
    it('should return public key when record exists', async () => {
      const mockSponsorRecord = MOCK_PUBLIC_KEY_PAIR as SponsorEntity;

      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(mockSponsorRecord);

      const result = await publicKeyService.getOrCreateSponsorPublicKey('1');

      expect(result.public_key).toEqual(mockSponsorRecord.public_key);
      expect(publicKeyService.getSponsorRecordById).toHaveBeenCalledWith('1');
    });

    it('should create and return public key when record does not exist', async () => {
      const id_sponsor = '1';
      jest
        .spyOn(publicKeyService, 'getSponsorRecordById')
        .mockResolvedValueOnce(undefined);

      jest.spyOn(sponsorRepository, 'save').mockResolvedValueOnce({
        id_sponsor,
        public_key: MOCK_PUBLIC_KEY,
        key_id: MOCK_PUBLIC_KEY_ID,
      } as unknown as SponsorEntity);

      const result = await publicKeyService.getOrCreateSponsorPublicKey('1');

      expect(result.public_key).toEqual(MOCK_PUBLIC_KEY);
      expect(publicKeyService.getSponsorRecordById).toHaveBeenCalledWith('1');
      expect(sponsorRepository.save).toHaveBeenCalledWith({
        id_sponsor,
        key_id: MOCK_PUBLIC_KEY_ID,
        public_key: MOCK_PUBLIC_KEY,
      });
    });
  });

  describe('getInvestorRecordById', () => {
    it('should return investor record when it exists', async () => {
      const mockInvestorRecord = {
        id_investor: '1',
        public_key: MOCK_PUBLIC_KEY,
      } as unknown as InvestorEntity;

      jest
        .spyOn(investorRepository, 'findOne')
        .mockResolvedValueOnce(mockInvestorRecord);

      const result = await publicKeyService.getInvestorRecordById('1');

      expect(result).toEqual(mockInvestorRecord);
      expect(investorRepository.findOne).toHaveBeenCalledWith({
        select: ['public_key', 'key_id'],
        where: {
          id_investor: '1',
        },
      });
    });

    it('should return undefined when investor record does not exist', async () => {
      jest
        .spyOn(investorRepository, 'findOne')
        .mockResolvedValueOnce(undefined);

      const result = await publicKeyService.getInvestorRecordById('1');

      expect(result).toBeUndefined();
      expect(investorRepository.findOne).toHaveBeenCalledWith({
        select: ['public_key', 'key_id'],
        where: {
          id_investor: '1',
        },
      });
    });
  });

  describe('getSponsorRecordById', () => {
    it('should return sponsor record when it exists', async () => {
      const mockSponsorRecord = {
        id_Sponsor: '1',
        public_key: MOCK_PUBLIC_KEY,
      } as unknown as SponsorEntity;

      jest
        .spyOn(sponsorRepository, 'findOne')
        .mockResolvedValueOnce(mockSponsorRecord);

      const result = await publicKeyService.getSponsorRecordById('1');

      expect(result).toEqual(mockSponsorRecord);
      expect(sponsorRepository.findOne).toHaveBeenCalledWith({
        select: ['public_key', 'key_id'],
        where: {
          id_sponsor: '1',
        },
      });
    });

    it('should return undefined when sponsor record does not exist', async () => {
      jest.spyOn(sponsorRepository, 'findOne').mockResolvedValueOnce(undefined);

      const result = await publicKeyService.getSponsorRecordById('1');

      expect(result).toBeUndefined();
      expect(sponsorRepository.findOne).toHaveBeenCalledWith({
        select: ['public_key', 'key_id'],
        where: {
          id_sponsor: '1',
        },
      });
    });
  });

  describe('saveInvestor', () => {
    it('should save investor data successfully', async () => {
      const mockInvestorData = {
        id_investor: '1',
        public_key: MOCK_PUBLIC_KEY,
      } as unknown as InvestorEntity;

      const savedInvestor = {
        id_investor: '1',
        public_key: MOCK_PUBLIC_KEY,
      } as unknown as InvestorEntity;

      jest
        .spyOn(investorRepository, 'save')
        .mockResolvedValueOnce(savedInvestor);

      const result = await publicKeyService.saveInvestor(mockInvestorData);

      expect(result).toEqual(savedInvestor);
      expect(investorRepository.save).toHaveBeenCalledWith(mockInvestorData);
    });
  });

  describe('saveSponsor', () => {
    it('should save sponsor data successfully', async () => {
      const mockSponsorData = {
        id_Sponsor: '1',
        public_key: MOCK_PUBLIC_KEY,
      } as unknown as SponsorEntity;

      const savedSponsor = {
        id_Sponsor: '1',
        public_key: MOCK_PUBLIC_KEY,
      } as unknown as SponsorEntity;

      jest.spyOn(sponsorRepository, 'save').mockResolvedValueOnce(savedSponsor);

      const result = await publicKeyService.saveSponsor(mockSponsorData);

      expect(result).toEqual(savedSponsor);
      expect(sponsorRepository.save).toHaveBeenCalledWith(mockSponsorData);
    });
  });

  describe('getInvestorWithOffersById', () => {
    it('should get investor with offers successfully', async () => {
      const mockInvestorData = {
        id_investor: '1',
        public_key: MOCK_PUBLIC_KEY,
        offers: [{ id_offer: 'offer1' }, { id_offer: 'offer2' }],
      } as unknown as InvestorEntity;

      jest
        .spyOn(investorRepository, 'findOne')
        .mockResolvedValueOnce(mockInvestorData);

      const result = await publicKeyService.getInvestorWithOffersById('1');

      expect(result).toEqual(mockInvestorData);
      expect(investorRepository.findOne).toHaveBeenCalledWith({
        where: [{ id_investor: '1' }],
        relations: ['offers'],
      });
    });
  });

  describe('getSponsorWithOffersById', () => {
    it('should get sponsor with offers successfully', async () => {
      const mockSponsorData = {
        id_Sponsor: '1',
        public_key: MOCK_PUBLIC_KEY,
        offers: [{ id_offer: 'offer1' }, { id_offer: 'offer2' }],
      } as unknown as SponsorEntity;

      jest
        .spyOn(sponsorRepository, 'findOne')
        .mockResolvedValueOnce(mockSponsorData);

      const result = await publicKeyService.getSponsorWithOffersById('1');

      expect(result).toEqual(mockSponsorData);
      expect(sponsorRepository.findOne).toHaveBeenCalledWith({
        where: [{ id_sponsor: '1' }],
        relations: ['offers'],
      });
    });
  });
});
