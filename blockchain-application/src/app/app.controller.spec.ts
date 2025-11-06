import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const hello_casper = 'Hello Casper!';

const id_offer = '1';
const id_sponsor = '1';
const name = 'MyToken';
const symbol = 'MT';
const decimals = '18';
const total_supply = '1000000';
const events_mode = true;
const id_investor = '1';
const amount = '10';

const get_peers_result =
  '[{"node_id":"tls:0e8a..4a6b","address":"127.0.0.1:22104"},{"node_id":"tls:30cf..3239","address":"127.0.0.1:22102"},{"node_id":"tls:421c..3730","address":"127.0.0.1:22105"},{"node_id":"tls:47c4..b1b2","address":"127.0.0.1:22103"}]';

const get_node_status_result =
  '{"api_version":"1.0.0","chainspec_name":"casper-net-1","starting_state_root_hash":"acbfbb07d5aa37b3ab0ec80c6ba0e16286579bf426120af8a04617cca4d1ed90","peers":[{"node_id":"tls:0e8a..4a6b","address":"127.0.0.1:22104"},{"node_id":"tls:30cf..3239","address":"127.0.0.1:22102"},{"node_id":"tls:421c..3730","address":"127.0.0.1:22105"},{"node_id":"tls:47c4..b1b2","address":"127.0.0.1:22103"}],"last_added_block_info":{"hash":"f52c66b8506c984fc23ec183f8d04cba0f4ad818f1dd3be8e43d33f929a14155","timestamp":"2024-02-27T23:00:37.504Z","era_id":27049,"height":280079,"state_root_hash":"ecbeacf50688feedccd636aa884623693f1ffaed9d11dea99d22deeb4b163f85","creator":"016063f95e2af93ff35540123a140f81649efe60023d5d9ca88e2859755a6a00bf"},"our_public_signing_key":"017983732b4d887d35105b66f421eb5df8c2f2d3fedd7e0854f9861597b1413766","round_length":"4s 96ms","next_upgrade":null,"build_version":"1.5.6","uptime":"14days 2h 31m 58s 8ms","reactor_state":"Validate","last_progress":"2024-02-13T20:28:46.062Z","available_block_range":{"low":0,"high":280079},"block_sync":{"historical":null,"forward":null}}';

const install_result = `{"id_offer":"${id_offer}","id_sponsor":"${id_sponsor}","sponsor_public_key":"0199569b5b6292988546f68a9ae1737348bc4ee788c530305b0af3eb948a6d4de7","contract_hash":"hash-80fe822dce6bf14e05e815b75b1a3cdd7afbae57599aab5d69a46d693cff4e6a","deploy_processed":{"deploy_hash":"17e8fae3aacf89f69f0eb457f26ac393b307f70aa98b17045cf3023220b887a6","account":"0199569b5b6292988546f68a9ae1737348bc4ee788c530305b0af3eb948a6d4de7","timestamp":"2024-02-27T23:01:13.000Z","ttl":"30m","dependencies":[],"block_hash":"9c1ede29302886a18d57ae739398bb19a8eb49e4cd7a09cf2f0156e88e4ae5cb","execution_result":{"Success":{"cost":"239915762831"},"Failure":null}}}`;

const invest_result = `{"id_offer":"${id_offer}","id_sponsor":"${id_sponsor}","id_investor":"${id_investor}","recipient_key":"0116acc801f93dfeb391232568ee5d9ca7c1fa3c7d506693e2f0479279e8aba70f","amount":"${amount}","deploy_processed":{"deploy_hash":"24963a362e17650c455761fa104525d24055582b061fa29cf42889820dc3b511","account":"0199569b5b6292988546f68a9ae1737348bc4ee788c530305b0af3eb948a6d4de7","timestamp":"2024-02-27T23:10:05.000Z","ttl":"30m","dependencies":[],"block_hash":"d95978a1b31ee9e0d3241b2152e8bdfeddfd5c8b66879cf2b60507776e08a234","execution_result":{"Success":{"cost":"53296663"},"Failure":null}}}`;

const redeem_result = `{"id_offer":"${id_offer}","id_sponsor":"${id_sponsor}","id_investor":"${id_investor}","recipient_key":"0199569b5b6292988546f68a9ae1737348bc4ee788c530305b0af3eb948a6d4de7","amount":"${amount}","deploy_processed":{"deploy_hash":"24963a362e17650c455761fa104525d24055582b061fa29cf42889820dc3b511","account":"0116acc801f93dfeb391232568ee5d9ca7c1fa3c7d506693e2f0479279e8aba70f","timestamp":"2024-02-27T23:10:05.000Z","ttl":"30m","dependencies":[],"block_hash":"d95978a1b31ee9e0d3241b2152e8bdfeddfd5c8b66879cf2b60507776e08a234","execution_result":{"Success":{"cost":"532966634"},"Failure":null}}}`;

const balance_sponsor_result = `{"CLValue":{"cl_type":"U256","bytes":"0340420f","parsed":"${(
  +total_supply - +amount
).toString()}"}}`;
const balance_investor_result = `{"CLValue":{"cl_type":"U256","bytes":"0340420f","parsed":"${amount}"}}`;

const mockAppService = {
  get_hello: jest.fn().mockReturnValue(hello_casper),
  get_peers: jest.fn().mockReturnValue(get_peers_result),
  get_node_status: jest.fn().mockReturnValue(get_node_status_result),
  install: jest.fn().mockResolvedValue(install_result),
  transfer: jest.fn().mockResolvedValue(invest_result),
  get_balance: jest.fn(),
};

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('Endpoints', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });

    it(`should return "${hello_casper}"`, () => {
      expect(appController.get_hello()).toBe(hello_casper);
    });

    it('should return peers', async () => {
      expect(await appController.get_peers()).toEqual(get_peers_result);
    });

    it('should return status', async () => {
      expect(await appController.get_node_status()).toEqual(
        get_node_status_result,
      );
    });

    it('should install', async () => {
      const result = await appController.install(
        id_offer,
        id_sponsor,
        name,
        symbol,
        decimals,
        total_supply,
        events_mode,
      );
      expect(result).toEqual(install_result);
    });

    it('should invest', async () => {
      const result = await appController.invest(
        id_offer,
        amount,
        id_sponsor,
        id_investor,
      );

      expect(result).toEqual(invest_result);
    });

    it('should redeem', async () => {
      mockAppService.transfer.mockReturnValueOnce(redeem_result);
      const result = await appController.redeem(
        id_offer,
        amount,
        id_investor,
        id_sponsor,
      );
      expect(result).toEqual(redeem_result);
    });

    it('should get balance for sponsor', async () => {
      mockAppService.get_balance.mockReturnValueOnce(balance_sponsor_result);
      const result = await appController.get_balance(id_offer, id_sponsor);
      expect(result).toEqual(balance_sponsor_result);
    });

    it('should get balance for investor', async () => {
      mockAppService.get_balance.mockReturnValueOnce(balance_investor_result);
      const result = await appController.get_balance(id_offer, id_investor);
      expect(result).toEqual(balance_investor_result);
    });
  });
});
