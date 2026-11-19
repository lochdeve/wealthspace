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
  email: string;
  timezone: string;
  displayName: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Phase 9 budgets and consumption reports (integration)', () => {
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
    timezone = 'UTC',
  ): Promise<{ cookies: string[]; profile: UserProfileBody }> {
    const email = `${label}-${randomUUID()}@test.local`;
    const password = 'ValidPass10chars!';

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        displayName: label,
        timezone,
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

  async function createAccount(
    cookies: string[],
    spaceId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Wallet', currency: 'EUR' })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  it('PATCH /auth/me updates profile and drives report timezone', async () => {
    const { cookies } = await registerAndLogin('profile-patch');

    const patchRes = await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Cookie', cookies)
      .send({ displayName: 'Updated', timezone: 'Europe/Madrid' })
      .expect(200);

    expect((patchRes.body as UserProfileBody).displayName).toBe('Updated');
    expect((patchRes.body as UserProfileBody).timezone).toBe('Europe/Madrid');

    await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Cookie', cookies)
      .send({ timezone: 'Not/AZone' })
      .expect(400)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INVALID_TIMEZONE');
      });
  });

  it('manages budgets in a space', async () => {
    const { cookies, profile } = await registerAndLogin('budgets');
    const spaceId = profile.personalSpaceId;

    const created = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/budgets`)
      .set('Cookie', cookies)
      .send({
        name: 'Food',
        amount: '300',
        currency: 'EUR',
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
      })
      .expect(201);

    const budgetId = (created.body as { id: string }).id;

    const listRes = await request(app.getHttpServer())
      .get(
        `/api/v1/spaces/${spaceId}/budgets?periodFrom=2026-11-01&periodTo=2026-11-30`,
      )
      .set('Cookie', cookies)
      .expect(200);

    expect((listRes.body as unknown[]).length).toBe(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/spaces/${spaceId}/budgets/${budgetId}`)
      .set('Cookie', cookies)
      .send({ amount: '350.50' })
      .expect(200)
      .expect((r) => {
        expect((r.body as { amount: string }).amount).toBe('350.5000');
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/spaces/${spaceId}/budgets/${budgetId}`)
      .set('Cookie', cookies)
      .expect(204);
  });

  it('GET consumption report sums personal EXPENSE excluding cross-space links', async () => {
    const { cookies, profile } = await registerAndLogin('consumption');
    const accountId = await createAccount(cookies, profile.personalSpaceId);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '1000' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/transactions/expense`)
      .set('Cookie', cookies)
      .send({
        accountId,
        amount: '40',
        occurredAt: '2026-11-15T12:00:00.000Z',
        description: 'groceries',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/transactions/expense`)
      .set('Cookie', cookies)
      .send({
        accountId,
        amount: '25',
        occurredAt: '2026-10-20T12:00:00.000Z',
        description: 'other month',
      })
      .expect(201);

    const reportRes = await request(app.getHttpServer())
      .get(
        `/api/v1/spaces/${profile.personalSpaceId}/reports/consumption?year=2026&month=11`,
      )
      .set('Cookie', cookies)
      .expect(200);

    const body = reportRes.body as {
      totalsByCurrency: { currency: string; amount: string }[];
    };
    expect(body.totalsByCurrency).toEqual([
      { currency: 'EUR', amount: '40.0000' },
    ]);
  });

  it('excludes cross-space personal payment legs from personal consumption', async () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const monthPad = String(month).padStart(2, '0');
    const occurredAt = `${year}-${monthPad}-15T12:00:00.000Z`;

    const owner = await registerAndLogin('xspace-owner');
    const member = await registerAndLogin('xspace-member');
    const walletId = await createAccount(
      owner.cookies,
      owner.profile.personalSpaceId,
    );

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${owner.profile.personalSpaceId}/accounts/${walletId}/opening-balance`,
      )
      .set('Cookie', owner.cookies)
      .send({ amount: '1000' })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${owner.profile.personalSpaceId}/transactions/expense`,
      )
      .set('Cookie', owner.cookies)
      .send({
        accountId: walletId,
        amount: '40',
        occurredAt,
      })
      .expect(201);

    const shared = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', owner.cookies)
      .send({ name: 'Trip', displayCurrency: 'EUR' })
      .expect(201);
    const spaceId = (shared.body as { id: string }).id;

    const inviteRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/invitations`)
      .set('Cookie', owner.cookies)
      .send({ email: member.email })
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/api/v1/invitations/${(inviteRes.body as { id: string }).id}/accept`,
      )
      .set('Cookie', member.cookies)
      .expect(204);

    await request(app.getHttpServer())
      .post(`/api/v1/spaces/${spaceId}/shared-expenses`)
      .set('Cookie', owner.cookies)
      .send({
        totalAmount: '90.00',
        currency: 'EUR',
        payment: {
          source: 'MEMBER',
          paidByUserId: owner.profile.id,
          personalAccountId: walletId,
        },
        split: {
          mode: 'EQUAL',
          participantUserIds: [owner.profile.id, member.profile.id],
        },
      })
      .expect(201);

    const reportRes = await request(app.getHttpServer())
      .get(
        `/api/v1/spaces/${owner.profile.personalSpaceId}/reports/consumption?year=${year}&month=${month}`,
      )
      .set('Cookie', owner.cookies)
      .expect(200);

    expect(
      (reportRes.body as { totalsByCurrency: { amount: string }[] })
        .totalsByCurrency,
    ).toEqual([{ currency: 'EUR', amount: '40.0000' }]);
  });
});
