import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SDKService } from './sdk.service';
import {
  DictionaryItemStrParams,
  GetDictionaryItemResult,
  PublicKey,
  PurseIdentifier,
  QueryBalanceResult,
  accountHashToBase64,
  motesToCSPR,
  queryBalanceOptions,
} from 'casper-sdk';

@Injectable()
export class BalanceService {
  constructor(private readonly sdkService: SDKService) { }

  async getBalance(contract_hash: string, public_key: string) {
    const account_hash = new PublicKey(public_key).toAccountHash();
    const dictionary_item_key = accountHashToBase64(
      account_hash.toFormattedString(),
    );
    const dictionary_item_params = new DictionaryItemStrParams();
    dictionary_item_params.setContractNamedKey(
      contract_hash,
      'balances',
      dictionary_item_key,
    );
    const options = this.sdkService.sdk.query_contract_dict_options({
      dictionary_item_params: dictionary_item_params.toJson(),
    });
    try {
      const query_contract_dict: GetDictionaryItemResult =
        await this.sdkService.sdk.query_contract_dict(options);
      return query_contract_dict.stored_value;
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

  async getCSPRBalance(public_key) {
    const account_hash = new PublicKey(public_key).toAccountHash();
    const purse_identifier = PurseIdentifier.fromAccountHash(account_hash);
    const options: queryBalanceOptions =
      this.sdkService.sdk.query_balance_options({
        purse_identifier: purse_identifier.toJson(),
      });
    const query_balance: QueryBalanceResult =
      await this.sdkService.sdk.query_balance(options);
    const balance = query_balance?.balance || '0';
    console.debug(`Balance CSPR for  ${public_key} ${motesToCSPR(balance)}`);
    return balance;
  }
}
