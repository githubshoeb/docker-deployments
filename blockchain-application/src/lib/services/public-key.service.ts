import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { KeysService } from './keys.service';
import { FundService } from './fund.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MakeDeployService } from './make_deploy.service';
import { InvestorEntity } from '../../lib/data-access/investor.entity';
import { SponsorEntity } from '../../lib/data-access/sponsor.entity';

export type KeyPair = { public_key?: string; key_id?: string; };

@Injectable()
export class PublicKeyService {
  constructor(
    private readonly keysService: KeysService,
    private readonly fundService: FundService,
    private readonly makeDeployService: MakeDeployService,
    @InjectRepository(InvestorEntity)
    private readonly InvestorRepository: Repository<InvestorEntity>,
    @InjectRepository(SponsorEntity)
    private readonly SponsorRepository: Repository<SponsorEntity>,
  ) { }

  public async getOrCreateInvestorPublicKey(
    id_investor: string,
  ): Promise<KeyPair> {
    return this.getOrCreatePublicKey(
      id_investor,
      (id) => this.getInvestorRecordById(id),
      () =>
        this.createAndFundPublicKey<InvestorEntity>(
          id_investor,
          'id_investor',
          this.InvestorRepository,
        ),
    );
  }

  public async getOrCreateSponsorPublicKey(
    id_sponsor: string,
  ): Promise<KeyPair> {
    return this.getOrCreatePublicKey(
      id_sponsor,
      (id) => this.getSponsorRecordById(id),
      () =>
        this.createAndFundPublicKey<SponsorEntity>(
          id_sponsor,
          'id_sponsor',
          this.SponsorRepository,
        ),
    );
  }

  public async getInvestorRecordById(
    id_investor: string,
  ): Promise<InvestorEntity | undefined> {
    const Data: FindManyOptions<InvestorEntity> = {
      select: ['public_key', 'key_id'],
      where: {
        id_investor,
      },
    };

    return await this.InvestorRepository.findOne(Data);
  }

  public async getSponsorRecordById(
    id_sponsor: string,
  ): Promise<SponsorEntity | undefined> {
    const Data: FindManyOptions<SponsorEntity> = {
      select: ['public_key', 'key_id'],
      where: {
        id_sponsor,
      },
    };

    return await this.SponsorRepository.findOne(Data);
  }

  public async saveSponsor(data: SponsorEntity) {
    return await this.SponsorRepository.save(data);
  }

  public async saveInvestor(data: InvestorEntity) {
    return await this.InvestorRepository.save(data);
  }

  public async getInvestorWithOffersById(
    id_investor: string,
  ): Promise<InvestorEntity | undefined> {
    return await this.getEntityWithOffersById(
      this.InvestorRepository,
      'id_investor',
      id_investor,
    );
  }

  public async getSponsorWithOffersById(
    id_sponsor: string,
  ): Promise<SponsorEntity | undefined> {
    return await this.getEntityWithOffersById(
      this.SponsorRepository,
      'id_sponsor',
      id_sponsor,
    );
  }

  private async getEntityWithOffersById<T>(
    repository: Repository<T>,
    idField: string,
    id: string,
  ): Promise<T | undefined> {
    const whereCondition: FindOptionsWhere<T>[] = [
      { [idField]: id } as FindOptionsWhere<T>,
    ];

    return await repository.findOne({
      where: whereCondition,
      relations: ['offers'],
    });
  }

  private async getOrCreatePublicKey(
    id: string,
    getRecordFunction: (id: string) => Promise<KeyPair | undefined>,
    createFunction: () => Promise<KeyPair>,
  ): Promise<KeyPair> {
    const record = await getRecordFunction(id);
    if (!record) {
      return await createFunction();
    }
    if (!record?.public_key) {
      throw new HttpException(
        `Error getting public key from db`,
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return { public_key: record.public_key, key_id: record.key_id };
  }

  private async createAndFundPublicKey<T>(
    id: string,
    idFieldName: string,
    repository: Repository<T>,
  ): Promise<KeyPair> {
    const public_key_pair = await this.keysService.generateKeypair();
    const public_key = public_key_pair?.publicKeyHex;
    const transferDeploy = await this.fundService.fund(
      this.makeDeployService.accountCreationPaymentAmount,
      public_key,
    );
    if (!transferDeploy) {
      throw new HttpException(
        `Error funding public key: ${public_key}`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const key_id = public_key_pair?.id;
    const data = {
      [idFieldName]: id,
      key_id,
      public_key,
    } as DeepPartial<T>;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const dataSaved = await repository.save(data);
      console.debug(dataSaved);
      return { public_key, key_id };
    } catch (error) {
      throw new HttpException(
        {
          message: error?.message,
          error: error?.response,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
