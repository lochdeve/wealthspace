import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let dbReady: boolean;

  beforeEach(async () => {
    dbReady = true;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getStatus: () => ({
              status: 'ok',
              service: 'wealthspace-api',
            }),
            isDatabaseReady: () => Promise.resolve(dbReady),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns ok status on GET /health', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'wealthspace-api',
    });
  });

  it('returns ready payload when database is up', async () => {
    dbReady = true;
    await expect(controller.getReady()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('throws 503 when database is down', async () => {
    dbReady = false;
    await expect(controller.getReady()).rejects.toMatchObject({
      response: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not reachable',
      },
    });
    await expect(controller.getReady()).rejects.toBeInstanceOf(HttpException);
  });
});
