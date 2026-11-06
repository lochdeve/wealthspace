import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Registers OpenAPI document and Swagger UI (paths include global prefix when configured). */
export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wealthspace API')
    .setDescription('REST API for Wealthspace (personal and shared finances).')
    .setVersion('1.0')
    .addServer('/api/v1', 'API v1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
}
