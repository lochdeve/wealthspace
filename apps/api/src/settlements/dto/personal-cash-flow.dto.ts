import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PersonalCashFlowDto {
  @ApiProperty({ format: 'uuid', description: 'Personal space account id' })
  @IsUUID()
  accountId!: string;
}