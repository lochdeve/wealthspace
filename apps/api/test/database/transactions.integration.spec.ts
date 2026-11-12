import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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

type UserProfileBody = {
  id: string;
  personalSpaceId: string;
  email: string;
};

type AccountBody = { id: string; balance: string };

type TxBody = { id: string; type: string; amount: string };

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Transactions (integration)', () => {
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
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
  ): Promise<{ cookies: string[]; profile: UserProfileBody }> {
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
      profile: { ...(registerRes.body as UserProfileBody), email },
    };
  }

  async function createAccount(
    cookies: string[],
    spaceId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Wallet', currency: 'EUR' })
      .expect(201);
    return (res.body as AccountBody).id;
  }

  it('POST opening-balance sets balance on account', async () => {
    const { cookies, profile } = await registerAndLogin('opening-api');
    const accountId = await createAccount(cookies, profile.personalSpaceId);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '2000.25' })
      .expect(201)
      .expect((res) => {
        const body = res.body as TxBody;
        expect(body.type).toBe('OPENING_BALANCE');
        expect(body.amount).toBe('2000.2500');
      });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect((detail.body as AccountBody).balance).toBe('2000.2500');
  });

  it('rejects duplicate opening balance', async () => {
    const { cookies, profile } = await registerAndLogin('opening-dup');
    const accountId = await createAccount(cookies, profile.personalSpaceId);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '1' })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '2' })
      .expect(409)
      .expect((res) => {
        expect((res.body as { code?: string }).code).toBe(
          'OPENING_BALANCE_EXISTS',
        );
      });
  });

  it('POST income and expense in personal space updates balance', async () => {
    const { cookies, profile } = await registerAndLogin('cashflow');
    const accountId = await createAccount(cookies, profile.personalSpaceId);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '1000' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/transactions/income`)
      .set('Cookie', cookies)
      .send({ accountId, amount: '50' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/transactions/expense`)
      .set('Cookie', cookies)
      .send({ accountId, amount: '25.5' })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect((detail.body as AccountBody).balance).toBe('1024.5000');
  });

  it('POST income in SHARED space', async () => {
    const { cookies } = await registerAndLogin('shared-income');

    const spaceRes = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Shared', displayCurrency: 'EUR' })
      .expect(201);

    const sharedSpaceId = (spaceRes.body as { id: string }).id;
    const accountId = await createAccount(cookies, sharedSpaceId);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${sharedSpaceId}/transactions/income`)
      .set('Cookie', cookies)
      .send({ accountId, amount: '10' })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${sharedSpaceId}/accounts/${accountId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect((detail.body as AccountBody).balance).toBe('10.0000');
  });

  it('SHARED expense without account uses displayCurrency', async () => {
    const { cookies, profile } = await registerAndLogin('shared-no-acct');

    const spaceRes = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Shared', displayCurrency: 'EUR' })
      .expect(201);

    const sharedSpaceId = (spaceRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${sharedSpaceId}/transactions/expense`)
      .set('Cookie', cookies)
      .send({
        amount: '15',
        attributedToUserId: profile.id,
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as TxBody & { currency?: string };
        expect(body.type).toBe('EXPENSE');
        expect(body.currency).toBe('EUR');
      });
  });

  it('SHARED expense: MEMBER cannot attribute to another member', async () => {
    const owner = await registerAndLogin('owner-attr');
    const member = await registerAndLogin('member-attr');

    const spaceRes = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', owner.cookies)
      .send({ name: 'Home', displayCurrency: 'EUR' })
      .expect(201);

    const sharedSpaceId = (spaceRes.body as { id: string }).id;

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${sharedSpaceId}/invitations`)
      .set('Cookie', owner.cookies)
      .send({ email: member.profile.email, role: 'MEMBER' })
      .expect(201);

    const inviteId = (inviteRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${inviteId}/accept`)
      .set('Cookie', member.cookies)
      .expect(204);

    const ownerId = owner.profile.id;

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${sharedSpaceId}/transactions/expense`)
      .set('Cookie', member.cookies)
      .send({
        amount: '5',
        attributedToUserId: ownerId,
      })
      .expect(403)
      .expect((res) => {
        expect((res.body as { code?: string }).code).toBe(
          'ATTRIBUTION_NOT_ALLOWED',
        );
      });
  });

  it('POST transfer moves balance between accounts', async () => {
    const { cookies, profile } = await registerAndLogin('transfer');

    const fromId = await createAccount(cookies, profile.personalSpaceId);
    const toRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Savings', currency: 'EUR' })
      .expect(201);
    const toId = (toRes.body as AccountBody).id;

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${fromId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '100' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/transactions/transfer`)
      .set('Cookie', cookies)
      .send({
        sourceAccountId: fromId,
        destinationAccountId: toId,
        amount: '40',
      })
      .expect(201);

    const fromDetail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts/${fromId}`)
      .set('Cookie', cookies)
      .expect(200);
    const toDetail = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts/${toId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect((fromDetail.body as AccountBody).balance).toBe('60.0000');
    expect((toDetail.body as AccountBody).balance).toBe('40.0000');
  });
});
