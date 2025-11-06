import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../app/app.module';

const id_offer = '1';
const id_sponsor = '1';
const name = 'MyToken';
const symbol = 'MT';
const decimals = '18';
const total_supply = '1000000';
const id_investor = '1';
const events_mode = 'true';
const amount = '10';

describe('Equitybrix flow', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('Happy flow', () => {
    it('should get index', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello Casper!');
    });

    it('should install an offer for a sponsor', async () => {
      const response = await request(app.getHttpServer()).post(
        `/install?name=${name}&symbol=${symbol}&decimals=${decimals}&total_supply=${total_supply}&events_mode=${events_mode}&id_offer=${id_offer}&id_sponsor=${id_sponsor}`,
      );

      expect(response.status).toBe(201);
      const result = JSON.parse(response.text);
      expect(result.id_offer).toBe(id_offer);
      expect(result.id_sponsor).toBe(id_sponsor);
      expect(result.sponsor_public_key).toBeDefined();
      expect(result.contract_hash).toBeDefined();
      expect(result.deploy_processed).toBeDefined();
      expect(result.sponsor_public_key).toEqual(
        result.deploy_processed.account,
      );
      expect(
        result.deploy_processed.execution_result.Success.cost,
      ).toBeDefined();
    }, 45000);

    it('should transfer tokens to an investor', async () => {
      const response = await request(app.getHttpServer()).post(
        `/invest?id_offer=${id_offer}&amount=${amount}&id_sponsor=${id_sponsor}&id_investor=${id_investor}`,
      );
      expect(response.status).toBe(201);
      const result = JSON.parse(response.text);
      expect(result.id_offer).toBe(id_offer);
      expect(result.id_sponsor).toBe(id_sponsor);
      expect(result.id_investor).toBe(id_investor);
      expect(result.recipient_key).toBeDefined();
      expect(result.amount).toEqual(amount);
      expect(result.deploy_processed).toBeDefined();
      expect(result.deploy_processed.deploy_hash).toBeDefined();
      expect(result.deploy_processed.account).toBeDefined();
      expect(
        result.deploy_processed.execution_result.Success.cost,
      ).toBeDefined();
    }, 45000);

    it('should check balance of sponsor', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}&id_sponsor=${id_sponsor}`,
      );

      expect(response.status).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.CLValue.parsed).toBe((1000000 - +amount).toString());
    });

    it('should check balance of investor', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}&id_investor=${id_investor}`,
      );

      expect(response.status).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.CLValue.parsed).toBe(amount);
    });

    it('should redeem tokens from an investor', async () => {
      const response = await request(app.getHttpServer()).post(
        `/redeem?id_offer=${id_offer}&amount=${amount}&id_sponsor=${id_sponsor}&id_investor=${id_investor}`,
      );

      expect(response.status).toBe(201);
      const result = JSON.parse(response.text);
      expect(result.id_offer).toBe(id_offer);
      expect(result.id_sponsor).toBe(id_sponsor);
      expect(result.id_investor).toBe(id_investor);
      expect(result.recipient_key).toBeDefined();
      expect(result.amount).toEqual(amount);
      expect(result.deploy_processed).toBeDefined();
      expect(result.deploy_processed.deploy_hash).toBeDefined();
      expect(result.deploy_processed.account).toBeDefined();
      expect(
        result.deploy_processed.execution_result.Success.cost,
      ).toBeDefined();
    }, 45000);

    it('should check balance of sponsor/investor', async () => {
      let response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}&id_investor=${id_investor}`,
      );

      expect(response.status).toBe(200);
      let result = JSON.parse(response.text);
      expect(result.CLValue.parsed).toBe('0');

      response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}&id_sponsor=${id_sponsor}`,
      );

      expect(response.status).toBe(200);
      result = JSON.parse(response.text);
      expect(result.CLValue.parsed).toBe(total_supply);
    });

    it('should check balance with only offer as parameter nor sponsor', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}`,
      );
      expect(response.status).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.CLValue.parsed).toBe(total_supply);
    });

    it('should install a second offer for the sponsor', async () => {
      const response = await request(app.getHttpServer()).post(
        `/install?name=${name}2&symbol=${symbol}2&decimals=${decimals}&total_supply=${total_supply}&events_mode=${events_mode}&id_offer=2&id_sponsor=${id_sponsor}`,
      );

      expect(response.status).toBe(201);
      const result = JSON.parse(response.text);
      expect(result.id_offer).toBe('2');
      expect(result.id_sponsor).toBe(id_sponsor);
      expect(result.sponsor_public_key).toBeDefined();
      expect(result.contract_hash).toBeDefined();
      expect(result.deploy_processed).toBeDefined();
      expect(result.sponsor_public_key).toEqual(
        result.deploy_processed.account,
      );
      expect(
        result.deploy_processed.execution_result.Success.cost,
      ).toBeDefined();
    }, 45000);

    it('sponsor should have total supply on second offer', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=2&id_sponsor=${id_sponsor}`,
      );

      expect(response.status).toBe(200);
      const result = JSON.parse(response.text);
      expect(result.CLValue.parsed).toBe(total_supply);
    });

    it('should transfer tokens to two investors from second offer', async () => {
      let response = await request(app.getHttpServer()).post(
        `/invest?id_offer=2&amount=${amount}&id_sponsor=${id_sponsor}&id_investor=2`,
      );
      expect(response.status).toBe(201);
      let result = JSON.parse(response.text);
      expect(result.id_offer).toBe('2');
      expect(result.id_sponsor).toBe(id_sponsor);
      expect(result.id_investor).toBe('2');
      expect(result.recipient_key).toBeDefined();
      expect(result.amount).toEqual(amount);
      expect(result.deploy_processed).toBeDefined();
      expect(result.deploy_processed.deploy_hash).toBeDefined();
      expect(result.deploy_processed.account).toBeDefined();
      expect(
        result.deploy_processed.execution_result.Success.cost,
      ).toBeDefined();

      response = await request(app.getHttpServer()).post(
        `/invest?id_offer=2&amount=${amount}&id_sponsor=${id_sponsor}&id_investor=999`,
      );
      expect(response.status).toBe(201);
      result = JSON.parse(response.text);
      expect(
        result.deploy_processed.execution_result.Success.cost,
      ).toBeDefined();

      response = await request(app.getHttpServer()).get(
        `/balance?id_offer=2&id_sponsor=${id_sponsor}`,
      );

      expect(response.status).toBe(200);
      result = JSON.parse(response.text);
      const expected_balance = +total_supply - +amount * 2;
      expect(result.CLValue.parsed).toBe(expected_balance.toString());
    }, 45000);
  });

  describe('Unhappy flow', () => {
    it('should error on null balance of first investor on second offer', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=2&id_investor=${id_investor}`,
      );

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      const result = JSON.parse(response.text);

      expect(result).toEqual({
        message: expect.stringMatching(
          /Error occurred with Core\(ResponseIsRpcError/,
        ),
      });
    });

    it('should not install a duplicate offer id', async () => {
      const response = await request(app.getHttpServer()).post(
        `/install?name=${name}&symbol=${symbol}&decimals=${decimals}&total_supply=${total_supply}&events_mode=${events_mode}&id_offer=${id_offer}&id_sponsor=${id_sponsor}`,
      );
      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: `Offer id already created: ${id_offer}`,
      });
    });

    it('should not install a duplicate name', async () => {
      const response = await request(app.getHttpServer()).post(
        `/install?name=${name}&symbol=${symbol}&decimals=${decimals}&total_supply=${total_supply}&events_mode=${events_mode}&id_offer=9999&id_sponsor=${id_sponsor}`,
      );
      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: `Offer name or symbol already created: ${name} ${symbol}`,
      });
    });

    it('should not install a duplicate symbol', async () => {
      const new_name = name + 'test';
      const response = await request(app.getHttpServer()).post(
        `/install?name=${new_name}&symbol=${symbol}&decimals=${decimals}&total_supply=${total_supply}&events_mode=${events_mode}&id_offer=9999&id_sponsor=${id_sponsor}`,
      );
      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: `Offer name or symbol already created: ${name} ${symbol}`,
      });
    });

    it('should error on transfer without offer', async () => {
      const response = await request(app.getHttpServer()).post(
        `/invest?amount=${amount}&id_sponsor=${id_sponsor}&id_investor=${id_investor}`,
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Error missing id_offer in transfer parameters: {"amount":"10","id_sponsor":"${id_sponsor}","id_investor":"${id_investor}"}`,
      });
    });

    it('should error on transfer without amount', async () => {
      const response = await request(app.getHttpServer()).post(
        `/invest?id_offer=${id_offer}&id_sponsor=${id_sponsor}&id_investor=${id_investor}`,
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Error missing amount in transfer parameters: {"id_offer":"${id_offer}","id_sponsor":"${id_sponsor}","id_investor":"${id_investor}"}`,
      });
    });

    it('should error on transfer without sponsor', async () => {
      const response = await request(app.getHttpServer()).post(
        `/invest?id_offer=${id_offer}&amount=${amount}&id_investor=${id_investor}`,
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Error missing id_sponsor in transfer parameters: {"amount":"10","id_offer":"${id_offer}","id_investor":"${id_investor}"}`,
      });
    });

    it('should error on transfer without investor', async () => {
      const response = await request(app.getHttpServer()).post(
        `/invest?id_offer=${id_offer}&amount=${amount}&id_sponsor=${id_sponsor}`,
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Error missing id_investor in transfer parameters: {"amount":"10","id_offer":"${id_offer}","id_sponsor":"${id_sponsor}"}`,
      });
    });

    it('should error on balance for sponsor without offer', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_sponsor=${id_sponsor}`,
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Error missing id_offer in balance parameters: {"id_sponsor":"${id_sponsor}"}`,
      });
    });

    it('should error on balance for investor without offer ', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_investor=${id_investor}`,
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Error missing id_offer in balance parameters: {"id_investor":"${id_investor}"}`,
      });
    });

    it('should error on balance for investor with unknown offer ', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=999&id_investor=${id_investor}`,
      );
      expect(response.status).toBe(HttpStatus.PRECONDITION_REQUIRED);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.PRECONDITION_REQUIRED,
        message: `Error getting offer for id_offer 999`,
      });
    });

    it('should error on balance with unknown investor', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}&id_investor=3`,
      );
      expect(response.status).toBe(HttpStatus.PRECONDITION_REQUIRED);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.PRECONDITION_REQUIRED,
        message: `Error getting public_key for id_investor 3`,
      });
    });

    it('should error on balance with unknown sponsor', async () => {
      const response = await request(app.getHttpServer()).get(
        `/balance?id_offer=${id_offer}&id_sponsor=2`,
      );
      expect(response.status).toBe(HttpStatus.PRECONDITION_REQUIRED);
      const result = JSON.parse(response.text);
      expect(result).toEqual({
        statusCode: HttpStatus.PRECONDITION_REQUIRED,
        message: `Error getting public_key for id_sponsor 2`,
      });
    });

    it('should not redeem tokens from an investor more than its balance', async () => {
      const contract_error = 'User error: 60001';
      const error = `Error during deploy transfer: "${contract_error}"`;
      const response = await request(app.getHttpServer()).post(
        `/redeem?id_offer=${id_offer}&amount=20&id_sponsor=${id_sponsor}&id_investor=${id_investor}`,
      );
      expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      const result = JSON.parse(response.text);
      expect(result.error).toEqual(error);
    }, 45000);
  });
});
