import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupSwagger } from '../../src/swagger/setup-swagger';
import {
  TEST_DB,
  resetSchema,
  truncateFinancialData,
  withClient,
} from './helpers';
import { applyTestApiEnv } from './test-api-env';
import { createTestValidationPipe } from './test-validation-pipe';

type UserProfileBody = {
  id: string;
  personalSpaceId: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

function assertJsonExcludesIds(json: string, ids: string[]): void {
  for (const id of ids) {
    expect(json).not.toContain(id);
  }
}

describe('Phase 8 — SHARED privacy (no personal leakage)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    applyTestApiEnv(TEST_DB);
    await resetSchema();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createTestValidationPipe());
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await withClient(truncateFinancialData);
  });

  async function registerAndLogin(
    label: string,
  ): Promise<{ cookies: string[]; profile: UserProfileBody; email: string }> {
    const email = `${label}-${randomUUID()}@test.local`;
    const password = 'ValidPass10chars!';

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        displayName: label,
        timezone: 'UTC',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      cookies: asCookieSetHeader(loginRes.headers['set-cookie']),
      profile: registerRes.body as UserProfileBody,
      email,
    };
  }

  async function createPersonalWallet(
    cookies: string[],
    personalSpaceId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Wallet', currency: 'EUR' })
      .expect(201);
    const accountId = (res.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '1000.0000' })
      .expect(201);
    return accountId;
  }

  it('other members never see personal account or personal transaction ids in SHARED reads', async () => {
    const owner = await registerAndLogin('ana');
    const carlos = await registerAndLogin('carlos');
    const maria = await registerAndLogin('maria');

    const spaceRes = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', owner.cookies)
      .send({ name: 'Piso', displayCurrency: 'EUR' })
      .expect(201);
    const spaceId = (spaceRes.body as { id: string }).id;

    for (const guest of [
      { cookies: carlos.cookies, email: carlos.email },
      { cookies: maria.cookies, email: maria.email },
    ]) {
      const inviteRes = await request(app.getHttpServer())
        .post(`/api/v1/spaces/${spaceId}/invitations`)
        .set('Cookie', owner.cookies)
        .send({ email: guest.email })
        .expect(201);
      const invitationId = (inviteRes.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`/api/v1/invitations/${invitationId}/accept`)
        .set('Cookie', guest.cookies)
        .expect(204);
    }

    const ownerWallet = await createPersonalWallet(
      owner.cookies,
      owner.profile.personalSpaceId,
    );
    const carlosWallet = await createPersonalWallet(
      carlos.cookies,
      carlos.profile.personalSpaceId,
    );

    const sharedAccountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Caja', currency: 'EUR' })
      .expect(201);
    const sharedAccountId = (sharedAccountRes.body as { id: string }).id;

    const ids = [owner.profile.id, carlos.profile.id, maria.profile.id];

    const expenseRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '90.00',
        currency: 'EUR',
        payment: {
          source: 'MEMBER',
          paidByUserId: owner.profile.id,
          personalAccountId: ownerWallet,
        },
        split: { mode: 'EQUAL', participantUserIds: ids },
      })
      .expect(201);

    const expenseId = (expenseRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/settlements`)
      .set('Cookie', carlos.cookies)
      .send({
        fromUserId: carlos.profile.id,
        toUserId: owner.profile.id,
        amount: '20.00',
        currency: 'EUR',
        personalCashFlow: { accountId: carlosWallet },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/contributions`)
      .set('Cookie', owner.cookies)
      .send({
        sharedAccountId,
        amount: '15.00',
        currency: 'EUR',
        personalAccountId: ownerWallet,
      })
      .expect(201);

    const sensitiveIds = await withClient(async (client) => {
      const links = await client.query<{ personal_transaction_id: string }>(
        `SELECT personal_transaction_id FROM cross_space_cash_links`,
      );
      return [
        ownerWallet,
        carlosWallet,
        ...links.rows.map((r) => r.personal_transaction_id),
      ];
    });

    const mariaExpenseList = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', maria.cookies)
      .expect(200);

    const mariaExpenseDetail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/shared-expenses/${expenseId}`)
      .set('Cookie', maria.cookies)
      .expect(200);

    const mariaSettlements = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/settlements`)
      .set('Cookie', maria.cookies)
      .expect(200);

    const mariaBalances = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${spaceId}/balances`)
      .set('Cookie', maria.cookies)
      .expect(200);

    assertJsonExcludesIds(JSON.stringify(mariaExpenseList.body), sensitiveIds);
    assertJsonExcludesIds(
      JSON.stringify(mariaExpenseDetail.body),
      sensitiveIds,
    );
    assertJsonExcludesIds(JSON.stringify(mariaSettlements.body), sensitiveIds);
    assertJsonExcludesIds(JSON.stringify(mariaBalances.body), sensitiveIds);

    expect(
      (mariaExpenseDetail.body as { myPersonalCashLink?: unknown })
        .myPersonalCashLink,
    ).toBeUndefined();
  });
});
