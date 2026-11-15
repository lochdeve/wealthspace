import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CreateSharedExpenseDto } from './create-shared-expense.dto';

export class UpdateSharedExpenseDto extends CreateSharedExpenseDto {
  @ApiProperty({ description: 'Current row version from GET' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional({ description: 'Audit note stored on the revision' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
