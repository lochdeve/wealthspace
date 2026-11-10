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

type SpaceListItem = {
  id: string;
  type: string;
  name: string;
  role: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Spaces (integration)', () => {
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

    const profile = registerRes.body as UserProfileBody;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      profile,
      cookies: asCookieSetHeader(loginRes.headers['set-cookie']),
    };
  }

  it('GET /spaces lists ACTIVE memberships including PERSONAL space', async () => {
    const { cookies, profile } = await registerAndLogin('spaces-list');

    const res = await request(app.getHttpServer())
      .get('/api/v1/spaces')
      .set('Cookie', cookies)
      .expect(200);

    const items = res.body as SpaceListItem[];
    expect(items).toHaveLength(1);
    const personal = items[0];
    expect(personal?.id).toBe(profile.personalSpaceId);
    expect(personal?.type).toBe('PERSONAL');
    expect(personal?.role).toBe('OWNER');
  });

  it('GET /spaces/:spaceId returns detail for member', async () => {
    const { cookies, profile } = await registerAndLogin('spaces-detail');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/spaces/${profile.personalSpaceId}`)
      .set('Cookie', cookies)
      .expect(200);

    const body = res.body as SpaceListItem & { createdAt: string };
    expect(body.id).toBe(profile.personalSpaceId);
    expect(body.createdAt).toBeDefined();
  });

  it('returns 404 when accessing another user space (anti-IDOR)', async () => {
    const userA = await registerAndLogin('spaces-a');
    const userB = await registerAndLogin('spaces-b');

    await request(app.getHttpServer())
      .get(`/api/v1/spaces/${userB.profile.personalSpaceId}`)
      .set('Cookie', userA.cookies)
      .expect(404)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('SPACE_NOT_FOUND');
      });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/spaces').expect(401);
  });

  it('POST /spaces creates SHARED space with OWNER membership', async () => {
    const { cookies, profile } = await registerAndLogin('spaces-create');

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Roommates', displayCurrency: 'eur' })
      .expect(201);

    const created = createRes.body as SpaceListItem;
    expect(created.type).toBe('SHARED');
    expect(created.name).toBe('Roommates');
    expect(created.role).toBe('OWNER');

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/spaces')
      .set('Cookie', cookies)
      .expect(200);

    const items = listRes.body as SpaceListItem[];
    expect(items).toHaveLength(2);
    const ids = items.map((item) => item.id);
    expect(ids).toContain(profile.personalSpaceId);
    expect(ids).toContain(created.id);
  });

  it('rejects invalid displayCurrency on POST /spaces', async () => {
    const { cookies } = await registerAndLogin('spaces-currency');

    await request(app.getHttpServer())
      .post('/api/v1/spaces')
      .set('Cookie', cookies)
      .send({ name: 'Bad Currency', displayCurrency: 'EURO' })
      .expect(400);
  });
});
