import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../../src/app.module';
import { TEST_DB } from './helpers';
import { applyTestApiEnv } from './test-api-env';

describe('OpenAPI (phase 8 catalog)', () => {
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

  it('includes phase 8 HTTP paths and schemas', () => {
    const config = new DocumentBuilder()
      .setTitle('Wealthspace API')
      .setVersion('1')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const paths = Object.keys(document.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/spaces/{spaceId}/contributions',
        '/spaces/{spaceId}/shared-expenses/{sharedExpenseId}/link-personal-payment',
        '/spaces/{spaceId}/settlements/{settlementId}/link-personal-cash-flow',
      ]),
    );

    const schemas = document.components?.schemas ?? {};
    expect(schemas).toHaveProperty('ContributionResponseDto');
    expect(schemas).toHaveProperty('CrossSpaceSummaryDto');
    expect(schemas).toHaveProperty('MyPersonalCashLinkDto');
    expect(schemas).toHaveProperty('MyPersonalCashLinkSettlementDto');
  });
});
