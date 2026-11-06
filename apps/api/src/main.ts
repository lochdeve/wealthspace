import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppEnv, ENV_TOKEN, loadEnvFiles } from './config/env';
import { setupSwagger } from './swagger/setup-swagger';

async function bootstrap() {
  loadEnvFiles();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  setupSwagger(app);

  const env = app.get<AppEnv>(ENV_TOKEN);
  await app.listen(env.port);
}
void bootstrap();
