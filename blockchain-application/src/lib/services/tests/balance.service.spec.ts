import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from '../balance.service';
import { SDKService } from '../sdk.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  DictionaryItemStrParams,
  GetDictionaryItemResult,
  PublicKey,
  PurseIdentifier,
  QueryBalanceResult,
  accountHashToBase64,
  queryBalanceOptions,
} from 'casper-sdk';

const MOCK_PUBLIC_KEY =
  '02038af56ef09ae2f2643032d4507a8c34686381024f4b2bcb13f1f5cc4d3b29d907';
const MOCK_CONTRACT_HASH =
  'hash-0c440decf5ea7153cafc1d92aa104fb32731af162c97bf97ac895b7b0d7eb3ed';
const MOCK_CSPR_BALANCE = '1000000000';

describe('BalanceService', () => {
  let balanceService: BalanceService;
  let sdkService: SDKService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        {
          provide: SDKService,
          useValue: {
            sdk: {
              query_contract_dict_options: jest.fn(),
              query_contract_dict: jest.fn(),
              query_balance_options: jest.fn(),
              query_balance: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    balanceService = module.get<BalanceService>(BalanceService);
    sdkService = module.get<SDKService>(SDKService);
  });

  it('should get balance successfully', async () => {
    const account = new PublicKey(MOCK_PUBLIC_KEY);
    const accountHash = account.toAccountHash();
    const dictionaryItemKey = accountHashToBase64(
      accountHash.toFormattedString(),
    );

    const dictionary_item_params = new DictionaryItemStrParams();
    dictionary_item_params.setContractNamedKey(
      MOCK_CONTRACT_HASH,
      'balances',
      dictionaryItemKey,
    );

    const mockQueryContractDictResult = {
      stored_value:
        '{"CLValue":{"cl_type":"U256","bytes":"010a","parsed":"10"}}',
    } as unknown as GetDictionaryItemResult;

    jest
      .spyOn(sdkService.sdk, 'query_contract_dict_options')
      .mockReturnValue(dictionary_item_params);
    jest
      .spyOn(sdkService.sdk, 'query_contract_dict')
      .mockResolvedValueOnce(mockQueryContractDictResult);

    const result = await balanceService.getBalance(
      MOCK_CONTRACT_HASH,
      MOCK_PUBLIC_KEY,
    );

    expect(result).toEqual(mockQueryContractDictResult.stored_value);
    expect(sdkService.sdk.query_contract_dict_options).toHaveBeenCalledWith({
      dictionary_item_params: dictionary_item_params.toJson(),
    });
    expect(sdkService.sdk.query_contract_dict).toHaveBeenCalledWith(
      dictionary_item_params,
    );
  });

  it('should handle query failure with an error', async () => {
    const errorResponse = { message: 'Some onchain error' };
    const message = 'Query Error';

    const error = {
      message,
      response: {
        data: errorResponse,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    };

    jest.spyOn(sdkService.sdk, 'query_contract_dict').mockRejectedValue(error);

    await expect(
      balanceService.getBalance(MOCK_CONTRACT_HASH, MOCK_PUBLIC_KEY),
    ).rejects.toThrow(
      new HttpException(
        {
          message,
          error: error?.response,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );
  });

  it('should get CSPR balance successfully', async () => {
    const account = new PublicKey(MOCK_PUBLIC_KEY);
    const accountHash = account.toAccountHash();
    const purse_identifier = PurseIdentifier.fromAccountHash(accountHash);
    const mock_purse_identifier = {
      purse_identifier: purse_identifier.toJson(),
    };
    const queryBalanceOptions: queryBalanceOptions = {
      ...mock_purse_identifier,
    } as queryBalanceOptions;

    const mockQueryBalanceResult: QueryBalanceResult = {
      balance: MOCK_CSPR_BALANCE,
    } as QueryBalanceResult;

    jest
      .spyOn(sdkService.sdk, 'query_balance_options')
      .mockReturnValue(queryBalanceOptions);
    jest
      .spyOn(sdkService.sdk, 'query_balance')
      .mockResolvedValueOnce(mockQueryBalanceResult);

    const result = await balanceService.getCSPRBalance(MOCK_PUBLIC_KEY);

    expect(result).toEqual(mockQueryBalanceResult.balance);
    expect(sdkService.sdk.query_balance_options).toHaveBeenCalledWith(
      mock_purse_identifier,
    );
    expect(sdkService.sdk.query_balance).toHaveBeenCalledWith(
      queryBalanceOptions,
    );
  });

  it('should get 0 CSPR balance on query_balance error', async () => {
    const account = new PublicKey(MOCK_PUBLIC_KEY);
    const accountHash = account.toAccountHash();
    const purse_identifier = PurseIdentifier.fromAccountHash(accountHash);
    const mock_purse_identifier = {
      purse_identifier: purse_identifier.toJson(),
    };
    const queryBalanceOptions: queryBalanceOptions = {
      ...mock_purse_identifier,
    } as queryBalanceOptions;

    const mockQueryBalanceResult: QueryBalanceResult = {
      balance: undefined,
    } as QueryBalanceResult;

    jest
      .spyOn(sdkService.sdk, 'query_balance_options')
      .mockReturnValue(queryBalanceOptions);
    jest
      .spyOn(sdkService.sdk, 'query_balance')
      .mockResolvedValueOnce(mockQueryBalanceResult);

    const result = await balanceService.getCSPRBalance(MOCK_PUBLIC_KEY);

    expect(result).toEqual('0');
    expect(sdkService.sdk.query_balance_options).toHaveBeenCalledWith(
      mock_purse_identifier,
    );
    expect(sdkService.sdk.query_balance).toHaveBeenCalledWith(
      queryBalanceOptions,
    );
  });
});
