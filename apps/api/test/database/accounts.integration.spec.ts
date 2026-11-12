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
};

type AccountBody = {
  id: string;
  name: string;
  currency: string;
  balance: string;
  archivedAt?: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Accounts (integration)', () => {
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
      profile: registerRes.body as UserProfileBody,
    };
  }

  it('creates and lists accounts in personal space', async () => {
    const { cookies, profile } = await registerAndLogin('accounts');

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Cash', currency: 'eur' })
      .expect(201);

    const created = createRes.body as AccountBody;
    expect(created.name).toBe('Cash');
    expect(created.currency).toBe('EUR');
    expect(created.balance).toBe('0.0000');
    expect(created.archivedAt).toBeUndefined();

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .expect(200);

    const list = listRes.body as AccountBody[];
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(created.id);
  });

  it('returns 404 for account in another space (IDOR)', async () => {
    const userA = await registerAndLogin('ida');
    const userB = await registerAndLogin('idb');

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${userA.profile.personalSpaceId}/accounts`)
      .set('Cookie', userA.cookies)
      .send({ name: 'Secret', currency: 'USD' })
      .expect(201);

    const accountId = (createRes.body as AccountBody).id;

    await request(app.getHttpServer())
      .get(
        `/api/v1/spaces/${userB.profile.personalSpaceId}/accounts/${accountId}`,
      )
      .set('Cookie', userB.cookies)
      .expect(404)
      .expect((res) => {
        expect((res.body as { code?: string }).code).toBe('ACCOUNT_NOT_FOUND');
      });
  });

  it('archives account and hides it from default list', async () => {
    const { cookies, profile } = await registerAndLogin('archive');

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Old', currency: 'EUR' })
      .expect(201);

    const accountId = (createRes.body as AccountBody).id;

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/archive`,
      )
      .set('Cookie', cookies)
      .expect(204);

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/archive`,
      )
      .set('Cookie', cookies)
      .expect(409)
      .expect((res) => {
        expect((res.body as { code?: string }).code).toBe(
          'ACCOUNT_ALREADY_ARCHIVED',
        );
      });

    const activeList = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .expect(200);

    expect(activeList.body).toHaveLength(0);

    const allList = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .query({ includeArchived: true })
      .set('Cookie', cookies)
      .expect(200);

    const archivedList = allList.body as AccountBody[];
    expect(archivedList).toHaveLength(1);
    expect(archivedList[0]?.archivedAt).toBeDefined();
  });

  it('computes balance from opening balance transaction', async () => {
    const { cookies, profile } = await registerAndLogin('balance');

    const createRes = await request(app.getHttpServer())
      .post(`/api/v1/spaces/${profile.personalSpaceId}/accounts`)
      .set('Cookie', cookies)
      .send({ name: 'Wallet', currency: 'EUR' })
      .expect(201);

    const accountId = (createRes.body as AccountBody).id;

    await request(app.getHttpServer())
      .post(
        `/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}/opening-balance`,
      )
      .set('Cookie', cookies)
      .send({ amount: '1500.5' })
      .expect(201);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}/accounts/${accountId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect((detailRes.body as AccountBody).balance).toBe('1500.5000');
  });
});
