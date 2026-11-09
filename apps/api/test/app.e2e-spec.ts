import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { setupSwagger } from './../src/swagger/setup-swagger';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env['DATABASE_URL'] =
      process.env['DATABASE_URL'] ??
      'postgresql://wealthspace:wealthspace_dev@127.0.0.1:5432/wealthspace';
    process.env['JWT_SECRET'] =
      process.env['JWT_SECRET'] ?? 'e2e-test-jwt-secret-32-characters-min!!';

    const prismaStub: Pick<
      PrismaService,
      'onModuleInit' | 'onModuleDestroy' | 'isDatabaseReachable'
    > = {
      onModuleInit: () => Promise.resolve(undefined),
      onModuleDestroy: () => Promise.resolve(undefined),
      isDatabaseReachable: () => Promise.resolve(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupSwagger(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', service: 'wealthspace-api' });
  });

  it('/api/v1/health/ready (GET) with mocked database', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('/api/v1/docs (GET) serves Swagger UI', () => {
    return request(app.getHttpServer())
      .get('/api/v1/docs')
      .expect(200)
      .expect('Content-Type', /html/);
  });
});
