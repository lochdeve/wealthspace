import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthDatabaseUnavailableDto,
  HealthLivenessResponseDto,
  HealthReadinessResponseDto,
} from './dto/health-responses.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness',
    description:
      'Returns 200 if the API process is running. Does not query the database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is up',
    type: HealthLivenessResponseDto,
  })
  getHealth(): HealthLivenessResponseDto {
    return this.healthService.getStatus();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness',
    description:
      'Returns 200 if PostgreSQL is reachable (Prisma runs `SELECT 1`).',
  })
  @ApiResponse({
    status: 200,
    description: 'Database is up',
    type: HealthReadinessResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Cannot connect to the database or query failed',
    type: HealthDatabaseUnavailableDto,
  })
  async getReady(): Promise<HealthReadinessResponseDto> {
    const ready = await this.healthService.isDatabaseReady();
    if (!ready) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database is not reachable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: 'ok', database: 'up' };
  }
}
