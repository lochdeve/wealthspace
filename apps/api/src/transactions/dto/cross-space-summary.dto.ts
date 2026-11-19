import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrossSpaceCashLinkKind } from '@prisma/client';

export class CrossSpaceSummaryDto {
  @ApiProperty({ enum: CrossSpaceCashLinkKind })
  kind!: CrossSpaceCashLinkKind;

  @ApiProperty({ format: 'uuid' })
  sharedSpaceId!: string;

  @ApiProperty({ description: 'SHARED space display name' })
  sharedSpaceName!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  sharedExpenseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  settlementId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  contributionGroupId?: string;
}
