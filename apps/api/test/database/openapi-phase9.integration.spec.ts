import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../../src/app.module';
import { TEST_DB } from './helpers';
import { applyTestApiEnv } from './test-api-env';

describe('OpenAPI (phase 9 catalog)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    applyTestApiEnv(TEST_DB);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('includes phase 9 HTTP paths and schemas', () => {
    const config = new DocumentBuilder().setTitle('Wealthspace API').setVersion('1').build();
    const document = SwaggerModule.createDocument(app, config);
    const paths = Object.keys(document.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/auth/me',
        '/spaces/{spaceId}/budgets',
        '/spaces/{spaceId}/budgets/{budgetId}',
        '/spaces/{spaceId}/reports/consumption',
      ]),
    );

    const schemas = document.components?.schemas ?? {};
    expect(schemas).toHaveProperty('UpdateProfileDto');
    expect(schemas).toHaveProperty('BudgetDto');
    expect(schemas).toHaveProperty('ConsumptionReportDto');
  });
});