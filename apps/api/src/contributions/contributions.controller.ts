import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ContributionResponseDto } from './dto/contribution-response.dto';

@ApiTags('contributions')
@Controller('spaces/:spaceId/contributions')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Contribute to a SHARED account (P-05/P-06)',
    description:
      'Creates SHARED INCOME; with personalAccountId also debits the actor PERSONAL account in the same transaction.',
  })
  @ApiCreatedResponse({ type: ContributionResponseDto })
  @ApiForbiddenResponse({ description: 'PERSONAL_ACCOUNT_NOT_OWNED' })
  @ApiBadRequestResponse({
    description: 'SHARED_SPACE_REQUIRED or CROSS_SPACE_CURRENCY_MISMATCH',
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateContributionDto,
  ): Promise<ContributionResponseDto> {
    return this.contributionsService.createInSpace(user.userId, spaceId, dto);
  }
}
