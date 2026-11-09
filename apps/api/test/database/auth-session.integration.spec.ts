import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AUTH_COOKIE_NAME } from '../../src/auth/auth.constants';
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
  email: string;
};

function asCookieSetHeader(setCookie: string | string[] | undefined): string[] {
  if (setCookie === undefined) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

describe('Auth session (integration)', () => {
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

  async function registerUser(
    email: string,
    password: string,
  ): Promise<UserProfileBody> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        displayName: 'Session User',
        timezone: 'UTC',
      })
      .expect(201);
    return res.body as UserProfileBody;
  }

  it('login sets cookie and GET /auth/me returns profile', async () => {
    const email = `login-${randomUUID()}@test.local`;
    const password = 'ValidPass10chars!';
    const registered = await registerUser(email, password);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const setCookie = loginRes.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toContain(`${AUTH_COOKIE_NAME}=`);
    expect((loginRes.body as UserProfileBody).id).toBe(registered.id);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', asCookieSetHeader(loginRes.headers['set-cookie']))
      .expect(200);

    expect((meRes.body as UserProfileBody).email).toBe(email);
  });

  it('returns 401 for invalid credentials and unauthenticated /me', async () => {
    const email = `fail-${randomUUID()}@test.local`;
    await registerUser(email, 'ValidPass10chars!');

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPass10chars' })
      .expect(401)
      .expect((r) => {
        expect((r.body as { code?: string }).code).toBe('INVALID_CREDENTIALS');
      });

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('logout sends cookie clear header; /me without cookie is 401', async () => {
    const email = `logout-${randomUUID()}@test.local`;
    const password = 'ValidPass10chars!';
    await registerUser(email, password);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const cookies = asCookieSetHeader(loginRes.headers['set-cookie']);

    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(204);

    const cleared = logoutRes.headers['set-cookie'];
    expect(cleared).toBeDefined();
    expect(String(cleared)).toContain(`${AUTH_COOKIE_NAME}=`);

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });
});
