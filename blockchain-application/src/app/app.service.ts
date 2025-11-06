import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  DECIMALS_DEFAULT,
  InstallService,
  TOTAL_SUPPLY_DEFAULT,
  InstallParams,
  InstallReturn,
} from '../lib/services/install.service';
import {
  MakeDeployService,
  TransferParams,
  TransferReturn,
} from '../lib/services/make_deploy.service';
import { SDKService } from '../lib/services/sdk.service';
import { FundService } from '../lib/services/fund.service';
import { BalanceService } from '../lib/services/balance.service';
import { OfferEntity } from '../lib/data-access/offer.entity';
import { KeyPair, PublicKeyService } from '../lib/services/public-key.service';
import { OfferService } from '../lib/services/offer.service';
import { DeployProcessed } from 'casper-sdk';
import { SponsorEntity } from '../lib/data-access/sponsor.entity';

export type BalanceParams = {
  id_offer;
  id_sponsor?;
  id_investor?;
};

@Injectable()
export class AppService {
  constructor(
    private readonly installService: InstallService,
    private readonly sdkService: SDKService,
    private readonly makeDeployService: MakeDeployService,
    private readonly publicKeyService: PublicKeyService,
    private readonly fundService: FundService,
    private readonly balanceService: BalanceService,
    private readonly offerService: OfferService,
  ) { }

  public get_hello(): string {
    return 'Hello Casper!';
  }

  public async install(params: InstallParams): Promise<InstallReturn> {
    this.validateInstallArgs(params);
    const { id_offer, id_sponsor, name, symbol, decimals, total_supply } =
      params;

    await this.checkIfOfferExists(id_offer, name, symbol);
    try {
      const sponsor_public_key_pair =
        await this.getOrCreateSponsorPublicKey(id_sponsor);
      if (!sponsor_public_key_pair?.public_key) {
        throw new HttpException(
          `Sponsor public key not found during install: ${id_sponsor}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      await this.fundKey(
        sponsor_public_key_pair.public_key,
        this.installService.installPaymentAmount,
      );

      const { contract_hash, deploy_processed } = await this.installOffer(
        params,
        sponsor_public_key_pair.key_id,
        sponsor_public_key_pair.public_key,
      );

      if (!contract_hash) {
        throw new HttpException(
          `Contract Hash not found after install: ${JSON.stringify(
            deploy_processed,
          )}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const decimalsNumber: number = Number(decimals || DECIMALS_DEFAULT);
      const totalSupplyNumber: number = Number(
        total_supply || TOTAL_SUPPLY_DEFAULT,
      );
      const offer_to_save: OfferEntity = {
        name,
        symbol,
        decimals: decimalsNumber,
        total_supply: totalSupplyNumber,
        contract_hash,
        id_offer,
      };
      const { offer, sponsor } = await this.saveOffer(
        offer_to_save,
        id_sponsor,
      );

      return {
        id_offer: offer.id_offer,
        id_sponsor: sponsor.id_sponsor,
        sponsor_public_key: sponsor_public_key_pair.public_key,
        contract_hash,
        deploy_processed,
      };
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

  private validateInstallArgs(params: InstallParams): void {
    const requiredParams = [
      'name',
      'symbol',
      'total_supply',
      'decimals',
      'id_sponsor',
      'id_offer',
    ];
    const missingParam = requiredParams.find((param) => !params[param]);

    if (missingParam) {
      throw new HttpException(
        `Error missing ${missingParam} in install parameters: ${JSON.stringify(
          params,
        )}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async checkIfOfferExists(
    id_offer: string,
    name: string,
    symbol: string,
  ): Promise<void> {
    let offer =
      id_offer && (await this.offerService.getOfferRecordByIdOffer(id_offer));
    if (offer) {
      throw new HttpException(
        `Offer id already created: ${offer.id_offer}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    offer = await this.offerService.getOfferRecordByNameOrSymbol(name, symbol);
    if (offer) {
      throw new HttpException(
        `Offer name or symbol already created: ${offer.name} ${offer.symbol}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async getOrCreateSponsorPublicKey(
    id_sponsor: string,
  ): Promise<KeyPair> {
    return this.publicKeyService.getOrCreateSponsorPublicKey(id_sponsor);
  }

  private async fundKey(publicKey: string, amount: string): Promise<void> {
    const transferDeploy = await this.fundService.fund(amount, publicKey);

    if (!transferDeploy) {
      throw new HttpException(
        `Error funding public key: ${publicKey}`,
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
  }

  private async installOffer(
    params: InstallParams,
    key_id: string,
    sponsor_public_key: string,
  ): Promise<{
    contract_hash: string;
    deploy_processed: DeployProcessed;
  }> {
    return this.installService.install(params, key_id, sponsor_public_key);
  }

  private async saveOffer(
    offer: OfferEntity,
    id_sponsor: string,
  ): Promise<{
    offer: OfferEntity;
    sponsor: SponsorEntity;
  }> {
    const offer_saved = await this.offerService.saveOffer(offer);
    if (!offer_saved) {
      throw new HttpException(
        `Offer not saved: ${offer.id_offer}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const sponsor = await this.getSponsorWithOffers(id_sponsor);

    if (!sponsor) {
      throw new HttpException(
        `Sponsor not found during saveOffer: ${id_sponsor}`,
        HttpStatus.CONFLICT,
      );
    }

    this.updateSponsor(sponsor, offer);
    await this.publicKeyService.saveSponsor(sponsor);

    return { offer, sponsor };
  }

  private async getSponsorWithOffers(
    id_sponsor: string,
  ): Promise<SponsorEntity> {
    return this.publicKeyService.getSponsorWithOffersById(id_sponsor);
  }

  private async updateSponsor(
    sponsor: SponsorEntity,
    offer: OfferEntity,
  ): Promise<void> {
    sponsor.offers.push(offer);
    await this.publicKeyService.saveSponsor(sponsor);
  }

  public async transfer(params: TransferParams) {
    this.validateTransferParams(params);

    const { id_offer, id_sponsor, id_investor, redeem } = params;
    try {
      const offer = id_offer && (await this.getOffer(id_offer));

      const sponsor_public_key_pair =
        id_sponsor && (await this.getSponsorPublicKey(id_sponsor));

      let investor_public_key_pair;
      if (!redeem) {
        // this is invest, get from db or create a public key
        investor_public_key_pair =
          await this.getOrCreateInvestorPublicKey(id_investor);
      } else {
        // this is redeem, get from db only
        investor_public_key_pair =
          id_investor && (await this.getInvestorPublicKey(id_investor));
      }

      const contract_hash = offer && offer.contract_hash;

      if (!contract_hash) {
        throw new HttpException(
          `Error getting offer contract-hash: ${JSON.stringify(params)}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const key_id = redeem
        ? investor_public_key_pair.key_id
        : sponsor_public_key_pair.key_id;
      const sender_public_key = redeem
        ? investor_public_key_pair.public_key
        : sponsor_public_key_pair.public_key;
      const recipient_public_key = redeem
        ? sponsor_public_key_pair.public_key
        : investor_public_key_pair.public_key;

      const balance =
        await this.balanceService.getCSPRBalance(sender_public_key);

      // Check account has a minimum of 2.5 CSPR or fund it with 2.5 CSPR
      if (
        BigInt(balance) <
        BigInt(this.makeDeployService.accountCreationPaymentAmount)
      ) {
        await this.fundKey(
          sender_public_key,
          this.makeDeployService.accountCreationPaymentAmount,
        );
      }

      const transfer: TransferReturn = await this.makeTransfer(
        params,
        key_id,
        contract_hash,
        sender_public_key,
        recipient_public_key,
      );

      if (transfer?.deploy_processed?.execution_result?.Success) {
        if (!redeem) {
          await this.processSuccessfulTransfer(id_investor, offer);
        }
      } else {
        throw new HttpException(
          `Error during deploy transfer: ${JSON.stringify(
            transfer?.deploy_processed?.execution_result?.Failure
              ?.error_message,
          )}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      return transfer;
    } catch (error) {
      throw new HttpException(
        {
          message: error?.message,
          error: error?.response,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getSponsorPublicKey(id_sponsor: string): Promise<KeyPair> {
    const sponsorRecord =
      await this.publicKeyService.getSponsorRecordById(id_sponsor);
    if (!sponsorRecord?.public_key) {
      throw new HttpException(
        `Error getting public_key for id_sponsor ${id_sponsor}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }
    return {
      public_key: sponsorRecord.public_key,
      key_id: sponsorRecord.key_id,
    };
  }

  private async getInvestorPublicKey(id_investor: string): Promise<KeyPair> {
    const investorRecord =
      await this.publicKeyService.getInvestorRecordById(id_investor);
    if (!investorRecord?.public_key) {
      throw new HttpException(
        `Error getting public_key for id_investor ${id_investor}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }
    return {
      public_key: investorRecord.public_key,
      key_id: investorRecord.key_id,
    };
  }

  private async getOrCreateInvestorPublicKey(id_investor: string): Promise<{
    public_key?: string;
    key_id?: string;
  }> {
    const public_key_pair =
      await this.publicKeyService.getOrCreateInvestorPublicKey(id_investor);
    if (!public_key_pair?.public_key) {
      throw new HttpException(
        `Error getting or creating public_key for id_investor ${id_investor}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }
    return public_key_pair;
  }

  private async getOffer(id_offer: string): Promise<OfferEntity> {
    const offer = await this.offerService.getOfferRecordByIdOffer(id_offer);
    if (!offer) {
      throw new HttpException(
        `Offer not found: ${id_offer}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return offer;
  }

  private async makeTransfer(
    params: TransferParams,
    key_id: string,
    contract_hash: string,
    from: string,
    to: string,
  ): Promise<TransferReturn> {
    return this.makeDeployService.transfer(
      params,
      contract_hash,
      key_id,
      from,
      to,
    );
  }

  private async processSuccessfulTransfer(
    id_investor: string,
    offer: OfferEntity,
  ): Promise<void> {
    const investor =
      await this.publicKeyService.getInvestorWithOffersById(id_investor);
    if (!investor) {
      throw new HttpException(
        `Investor not found: ${id_investor}`,
        HttpStatus.CONFLICT,
      );
    }

    investor.offers.push(offer);
    await this.publicKeyService.saveInvestor(investor);
  }

  private validateTransferParams(params: TransferParams): void {
    const missingParam = [
      'id_offer',
      'amount',
      'id_investor',
      'id_sponsor',
    ].find((param) => !params[param]);

    if (missingParam) {
      throw new HttpException(
        `Error missing ${missingParam} in transfer parameters: ${JSON.stringify(
          params,
        )}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async get_balance(params: BalanceParams) {
    this.validateGetBalanceArgs(params);
    let { id_sponsor } = params; // id_sponsor is not mandatory, retrieve the offer in that case
    const { id_offer, id_investor } = params;
    const offer = await this.offerService.getOfferContractHash(id_offer);
    const contract_hash = offer.contract_hash;
    let public_key = '';

    if (id_offer && !id_investor && !id_sponsor) {
      const with_sponsor = true;
      const offer = await this.offerService.getOfferRecordByIdOffer(
        id_offer,
        undefined,
        with_sponsor,
      );
      offer && (id_sponsor = offer.sponsors[0].id_sponsor);
    }

    if (id_investor) {
      const investorRecord =
        await this.publicKeyService.getInvestorRecordById(id_investor);
      if (!investorRecord) {
        throw new HttpException(
          `Error getting public_key for id_investor ${id_investor}`,
          HttpStatus.PRECONDITION_REQUIRED,
        );
      }
      public_key = investorRecord?.public_key || '';
    } else if (id_sponsor) {
      const sponsorRecord =
        await this.publicKeyService.getSponsorRecordById(id_sponsor);
      if (!sponsorRecord) {
        throw new HttpException(
          `Error getting public_key for id_sponsor ${id_sponsor}`,
          HttpStatus.PRECONDITION_REQUIRED,
        );
      }
      public_key = sponsorRecord?.public_key || '';
    }
    if (!public_key) {
      throw new HttpException(
        `Error getting public_key for params ${JSON.stringify(params)}`,
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }
    return await this.balanceService.getBalance(contract_hash, public_key);
  }

  private validateGetBalanceArgs(params: BalanceParams): void {
    if (!params.id_offer) {
      throw new HttpException(
        `Error missing id_offer in balance parameters: ${JSON.stringify(
          params,
        )}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (params.id_investor && params.id_sponsor) {
      throw new HttpException(
        `Error id_sponsor or id_investor in balance parameters: ${JSON.stringify(
          params,
        )}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async get_peers() {
    const get_peers = await this.sdkService.sdk.get_peers();
    return get_peers.peers;
  }

  public async get_node_status() {
    const get_node_status = await this.sdkService.sdk.get_node_status();
    return get_node_status.toJson();
  }
}
