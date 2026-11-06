import { ApiProperty } from '@nestjs/swagger';

/** GET /health — process is alive. */
export class HealthLivenessResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'wealthspace-api' })
  service!: string;
}

/** GET /health/ready — PostgreSQL reachable. */
export class HealthReadinessResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({
    example: 'up',
    description: 'Database connectivity check passed',
  })
  database!: string;
}

/** GET /health/ready — PostgreSQL not reachable. */
export class HealthDatabaseUnavailableDto {
  @ApiProperty({ example: 503 })
  statusCode!: number;

  @ApiProperty({ example: 'DATABASE_UNAVAILABLE' })
  code!: string;

  @ApiProperty({ example: 'Database is not reachable' })
  message!: string;
}
