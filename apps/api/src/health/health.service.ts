import { Injectable } from '@nestjs/common';
import type { HealthLivenessResponseDto } from './dto/health-responses.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus(): HealthLivenessResponseDto {
    return {
      status: 'ok',
      service: 'wealthspace-api',
    };
  }

  async isDatabaseReady(): Promise<boolean> {
    return this.prisma.isDatabaseReachable();
  }
}
