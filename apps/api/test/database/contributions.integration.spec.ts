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

type ContributionBody = {
  sharedIncomeTransactionId: string;
  contributionGroupId?: string;
  personalLegLinked: boolean;
  attributedToUserId?: string;
  amount: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Contributions (integration)', () => {
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

  async function createSharedSpace(cookies: string[]): Promise<{ id: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Piso', displayCurrency: 'EUR' })
      .expect(201);
    return res.body as { id: string };
  }

  async function acceptInvite(
    ownerCookies: string[],
    invitee: { cookies: string[]; email: string },
    spaceId: string,
  ): Promise<void> {
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/invitations`)
      .set('Cookie', ownerCookies)
      .send({ email: invitee.email })
      .expect(201);

    const invitationId = (inviteRes.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invitationId}/accept`)
      .set('Cookie', invitee.cookies)
      .expect(204);
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
      .send({ amount: '300.0000' })
      .expect(201);
    return accountId;
  }

  it('B-8.7: CONTRIBUTION_PAIR updates shared and personal balances', async () => {
    const owner = await registerAndLogin('ana');
    const carlos = await registerAndLogin('carlos');
    const space = await createSharedSpace(owner.cookies);
    await acceptInvite(owner.cookies, carlos, space.id);

    const sharedAccountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Caja', currency: 'EUR' })
      .expect(201);

    const sharedAccountId = (sharedAccountRes.body as { id: string }).id;
    const walletId = await createPersonalWallet(
      carlos.cookies,
      carlos.profile.personalSpaceId,
    );

    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/contributions`)
      .set('Cookie', carlos.cookies)
      .send({
        sharedAccountId,
        amount: '80.00',
        currency: 'EUR',
        personalAccountId: walletId,
        note: 'Aporte caja',
      })
      .expect(201);

    const body = res.body as ContributionBody;
    expect(body.personalLegLinked).toBe(true);
    expect(body.contributionGroupId).toBeDefined();
    expect(body.attributedToUserId).toBe(carlos.profile.id);
    expect(body.amount).toBe('80.0000');
    expect(JSON.stringify(body)).not.toContain(walletId);

    const sharedAccount = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${space.id}/accounts/${sharedAccountId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((sharedAccount.body as { balance: string }).balance).toBe('80.0000');

    const personalWallet = await request(app.getHttpServer())
      .get(
        `/api/v1/spaces/${carlos.profile.personalSpaceId}/accounts/${walletId}`,
      )
      .set('Cookie', carlos.cookies)
      .expect(200);

    expect((personalWallet.body as { balance: string }).balance).toBe(
      '220.0000',
    );
  });

  it('B-8.7: shared-only contribution without personal leg', async () => {
    const owner = await registerAndLogin('ana');
    const space = await createSharedSpace(owner.cookies);

    const sharedAccountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Caja', currency: 'EUR' })
      .expect(201);

    const sharedAccountId = (sharedAccountRes.body as { id: string }).id;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/contributions`)
      .set('Cookie', owner.cookies)
      .send({
        sharedAccountId,
        amount: '25.00',
        currency: 'EUR',
        note: 'Efectivo',
      })
      .expect(201);

    const body = res.body as ContributionBody;
    expect(body.personalLegLinked).toBe(false);
    expect(body.contributionGroupId).toBeUndefined();
    expect(body.attributedToUserId).toBeUndefined();

    const sharedAccount = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${space.id}/accounts/${sharedAccountId}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    expect((sharedAccount.body as { balance: string }).balance).toBe('25.0000');
  });

  it('B-8.8: personal transaction list includes crossSpaceSummary', async () => {
    const owner = await registerAndLogin('ana');
    const carlos = await registerAndLogin('carlos');
    const space = await createSharedSpace(owner.cookies);
    await acceptInvite(owner.cookies, carlos, space.id);

    const sharedAccountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Piso común', currency: 'EUR' })
      .expect(201);

    const walletId = await createPersonalWallet(
      carlos.cookies,
      carlos.profile.personalSpaceId,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/contributions`)
      .set('Cookie', carlos.cookies)
      .send({
        sharedAccountId: (sharedAccountRes.body as { id: string }).id,
        amount: '40.00',
        currency: 'EUR',
        personalAccountId: walletId,
      })
      .expect(201);

    const personalList = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${carlos.profile.personalSpaceId}/transactions`)
      .set('Cookie', carlos.cookies)
      .expect(200);

    const expense = (
      personalList.body as {
        type: string;
        crossSpaceSummary?: {
          kind: string;
          sharedSpaceName: string;
          contributionGroupId: string;
        };
      }[]
    ).find((tx) => tx.type === 'EXPENSE');

    expect(expense?.crossSpaceSummary).toMatchObject({
      kind: 'CONTRIBUTION_PAIR',
      sharedSpaceName: 'Piso',
    });
    expect(expense?.crossSpaceSummary?.contributionGroupId).toBeDefined();

    const sharedList = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${space.id}/transactions`)
      .set('Cookie', owner.cookies)
      .expect(200);

    for (const tx of sharedList.body as { crossSpaceSummary?: unknown }[]) {
      expect(tx.crossSpaceSummary).toBeUndefined();
    }
  });

  it('rejects foreign personal account', async () => {
    const owner = await registerAndLogin('ana');
    const carlos = await registerAndLogin('carlos');
    const space = await createSharedSpace(owner.cookies);
    await acceptInvite(owner.cookies, carlos, space.id);

    const sharedAccountRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/accounts`)
      .set('Cookie', owner.cookies)
      .send({ name: 'Caja', currency: 'EUR' })
      .expect(201);

    const walletId = await createPersonalWallet(
      owner.cookies,
      owner.profile.personalSpaceId,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${space.id}/contributions`)
      .set('Cookie', carlos.cookies)
      .send({
        sharedAccountId: (sharedAccountRes.body as { id: string }).id,
        amount: '10.00',
        currency: 'EUR',
        personalAccountId: walletId,
      })
      .expect(403);
  });
});
