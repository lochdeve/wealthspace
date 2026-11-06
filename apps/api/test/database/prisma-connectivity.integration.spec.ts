import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { TEST_DB } from './helpers';

describe('Prisma connectivity (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = TEST_DB;
    process.env['API_PORT'] = '3001';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health/ready reaches PostgreSQL', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });
});
