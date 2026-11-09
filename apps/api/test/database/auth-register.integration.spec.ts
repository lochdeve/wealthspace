import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { setupSwagger } from '../../src/swagger/setup-swagger';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_DB,
  resetSchema,
  truncateFinancialData,
  withClient,
} from './helpers';
import { applyTestApiEnv } from './test-api-env';

type RegisterResponseBody = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  personalSpaceId: string;
};

type ConflictBody = {
  code?: string;
};

describe('POST /auth/register (integration)', () => {
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

  it('creates user, PERSONAL space and OWNER membership atomically', async () => {
    const email = `new-${randomUUID()}@test.local`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'ValidPass10chars!',
        displayName: 'Test User',
        timezone: 'Europe/Madrid',
      })
      .expect(201);

    const body = res.body as RegisterResponseBody;
    expect(body).toMatchObject({
      email,
      displayName: 'Test User',
      timezone: 'Europe/Madrid',
    });
    expect(body.id).toBeDefined();
    expect(body.personalSpaceId).toBeDefined();

    const prisma = app.get(PrismaService);
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: true,
        personalSpace: true,
      },
    });
    if (user === null) {
      throw new Error('expected user to exist');
    }
    expect(user.personalSpace.type).toBe('PERSONAL');
    expect(user.memberships).toHaveLength(1);
    const membership = user.memberships[0];
    expect(membership?.role).toBe('OWNER');
    expect(membership?.status).toBe('ACTIVE');
  });

  it('returns 409 when email is already registered', async () => {
    const email = `dup-${randomUUID()}@test.local`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'ValidPass10chars!',
        displayName: 'First',
        timezone: 'UTC',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'OtherPass10ch!',
        displayName: 'Second',
        timezone: 'UTC',
      })
      .expect(409)
      .expect((r) => {
        expect((r.body as ConflictBody).code).toBe('EMAIL_ALREADY_REGISTERED');
      });
  });
});
