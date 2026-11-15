import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SharedExpenseRevisionDto {
  @ApiProperty()
  revisionNumber!: number;

  @ApiProperty({ format: 'date-time' })
  changedAt!: string;

  @ApiProperty({ format: 'uuid' })
  changedByUserId!: string;

  @ApiPropertyOptional({ nullable: true })
  reason?: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  snapshot!: Record<string, unknown>;
}
