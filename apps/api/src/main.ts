import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppEnv, ENV_TOKEN, loadEnvFiles } from './config/env';
import { setupSwagger } from './swagger/setup-swagger';

async function bootstrap() {
  loadEnvFiles();
  const app = await NestFactory.create(AppModule);
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
  app.enableShutdownHooks();
  setupSwagger(app);

  const env = app.get<AppEnv>(ENV_TOKEN);
  await app.listen(env.port);
}
void bootstrap();
