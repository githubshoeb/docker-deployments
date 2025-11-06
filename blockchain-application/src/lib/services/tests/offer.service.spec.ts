import { Test, TestingModule } from '@nestjs/testing';
import { OfferService } from '../offer.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OfferEntity } from '../../../lib/data-access/offer.entity';

const MOCK_ID_OFFER = 'offer123';
const MOCK_CONTRACT_HASH =
  'hash-0c440decf5ea7153cafc1d92aa104fb32731af162c97bf97ac895b7b0d7eb3ed';
const MOCK_OFFER = {
  id_offer: MOCK_ID_OFFER,
  contract_hash: MOCK_CONTRACT_HASH,
} as unknown as OfferEntity;

describe('OfferService', () => {
  let offerService: OfferService;
  let offerRepository: Repository<OfferEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        {
          provide: getRepositoryToken(OfferEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    offerService = module.get<OfferService>(OfferService);
    offerRepository = module.get<Repository<OfferEntity>>(
      getRepositoryToken(OfferEntity),
    );
  });

  describe('getOfferRecordByIdOffer', () => {
    it('should get offer record by ID successfully', async () => {
      jest.spyOn(offerRepository, 'findOne').mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.getOfferRecordByIdOffer(MOCK_ID_OFFER);

      expect(result).toEqual(MOCK_OFFER);
      expect(offerRepository.findOne).toHaveBeenCalledWith({
        where: { id_offer: MOCK_ID_OFFER },
      });
    });

    it('should get offer record by ID with selected fields successfully', async () => {
      jest.spyOn(offerRepository, 'findOne').mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.getOfferRecordByIdOffer(
        MOCK_ID_OFFER,
        'contract_hash',
      );

      expect(result).toEqual(MOCK_OFFER);
      expect(offerRepository.findOne).toHaveBeenCalledWith({
        where: { id_offer: MOCK_ID_OFFER },
        select: ['contract_hash'],
      });
    });
  });

  describe('getOfferRecordByNameOrSymbol', () => {
    it('should get offer record by name successfully', async () => {
      jest.spyOn(offerRepository, 'findOne').mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.getOfferRecordByNameOrSymbol(
        'TestOffer',
        '',
      );

      expect(result).toEqual(MOCK_OFFER);
      expect(offerRepository.findOne).toHaveBeenCalledWith({
        select: ['id_offer', 'name', 'symbol'],
        where: [{ name: 'TestOffer' }, { symbol: '' }],
      });
    });

    it('should get offer record by symbol successfully', async () => {
      jest.spyOn(offerRepository, 'findOne').mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.getOfferRecordByNameOrSymbol('', 'TO');

      expect(result).toEqual(MOCK_OFFER);
      expect(offerRepository.findOne).toHaveBeenCalledWith({
        select: ['id_offer', 'name', 'symbol'],
        where: [{ name: '' }, { symbol: 'TO' }],
      });
    });

    it('should get offer record by name or symbol successfully', async () => {
      jest.spyOn(offerRepository, 'findOne').mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.getOfferRecordByNameOrSymbol(
        'TestOffer',
        'TO',
      );

      expect(result).toEqual(MOCK_OFFER);
      expect(offerRepository.findOne).toHaveBeenCalledWith({
        select: ['id_offer', 'name', 'symbol'],
        where: [{ name: 'TestOffer' }, { symbol: 'TO' }],
      });
    });
  });

  describe('getOfferContractHash', () => {
    it('should get offer contract hash successfully', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.getOfferContractHash(MOCK_ID_OFFER);

      expect(result.contract_hash).toEqual(MOCK_CONTRACT_HASH);
      expect(offerService.getOfferRecordByIdOffer).toHaveBeenCalledWith(
        MOCK_ID_OFFER,
        'contract_hash',
      );
    });

    it('should throw HttpException if offer record is not found', async () => {
      jest
        .spyOn(offerService, 'getOfferRecordByIdOffer')
        .mockResolvedValueOnce(undefined);

      await expect(() =>
        offerService.getOfferContractHash('nonexistent_offer'),
      ).rejects.toThrow(
        new HttpException(
          'Error getting offer for id_offer nonexistent_offer',
          HttpStatus.PRECONDITION_REQUIRED,
        ),
      );
    });
  });

  describe('saveOffer', () => {
    it('should save an offer successfully', async () => {
      jest.spyOn(offerRepository, 'save').mockResolvedValueOnce(MOCK_OFFER);

      const result = await offerService.saveOffer(MOCK_OFFER);

      expect(result).toEqual(MOCK_OFFER);
      expect(offerRepository.save).toHaveBeenCalledWith(MOCK_OFFER);
    });
  });
});
