import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Registers OpenAPI document and Swagger UI (paths include global prefix when configured). */
export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wealthspace API')
    .setDescription(
      'REST API for Wealthspace (personal and shared finances). ' +
        'Phase 8 (cross-space cash links): shared-expenses link-personal-payment, ' +
        'settlements personalCashFlow / link-personal-cash-flow, contributions, ' +
        'crossSpaceSummary on personal transaction GET. ' +
        'Catalog: docs/development/frontend-api-dependencies.md.',
    )
    .setVersion('1.0')
    .addServer('/api/v1', 'API v1')
    .addTag('contributions', 'SHARED account contributions (P-05/P-06)')
    .addTag('shared-expenses', 'Shared expenses and personal payment links (P-02)')
    .addTag('settlements', 'Settlements and personal cash-flow links (P-07)')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
}
