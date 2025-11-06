import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FindManyOptions } from 'typeorm';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OfferEntity } from '../../lib/data-access/offer.entity';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(OfferEntity)
    private readonly offerRepository: Repository<OfferEntity>,
  ) { }

  public async getOfferRecordByIdOffer(
    id_offer: string,
    select?: keyof OfferEntity,
    with_sponsor?: boolean,
  ): Promise<OfferEntity | undefined> {
    const Data: FindManyOptions<OfferEntity> = {
      where: {
        id_offer,
      },
    };
    if (select) {
      Data.select = [select];
    }
    if (with_sponsor) {
      Data.relations = ['sponsors'];
    }
    return await this.offerRepository.findOne(Data);
  }

  public async getOfferRecordByNameOrSymbol(name: string, symbol: string) {
    const Data: FindManyOptions<OfferEntity> = {
      select: ['id_offer', 'name', 'symbol'],
      where: [{ name }, { symbol }],
    };
    return await this.offerRepository.findOne(Data);
  }

  public async getOfferContractHash(id_offer: string): Promise<OfferEntity> {
    const offerRecord = await this.getOfferRecordByIdOffer(
      id_offer,
      'contract_hash',
    );

    if (!offerRecord) {
      throw new HttpException(
        `Error getting offer for id_offer ${id_offer}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }

    return offerRecord;
  }

  async saveOffer(data: OfferEntity) {
    return await this.offerRepository.save(data);
  }
}
