import { Global, Module } from '@nestjs/common';
import { ENV_TOKEN, parseEnv } from './env';

/**
 * Registers validated configuration as a injectable provider.
 * @Global() so any module can inject ENV without re-importing this module.
 */
@Global()
@Module({
  providers: [
    {
      provide: ENV_TOKEN,
      useFactory: () => parseEnv(),
    },
  ],
  exports: [ENV_TOKEN],
})
export class AppConfigModule {}
