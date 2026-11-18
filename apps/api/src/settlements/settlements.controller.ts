import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementResponseDto } from './dto/settlement-response.dto';
import { LinkPersonalCashFlowDto } from './dto/link-personal-cash-flow.dto';
import { VoidSettlementDto } from './dto/void-settlement.dto';
import { SettlementsService } from './settlements.service';

const MAX_LIST_LIMIT = 100;

@ApiTags('settlements')
@Controller('spaces/:spaceId/settlements')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  @ApiOperation({ summary: 'List settlements in a SHARED space' })
  @ApiQuery({ name: 'userId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'includeVoided', required: false, type: Boolean })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: `Max ${MAX_LIST_LIMIT}, default 50`,
  })
  @ApiOkResponse({ type: SettlementResponseDto, isArray: true })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
    @Query('includeVoided', new DefaultValuePipe(false), ParseBoolPipe)
    includeVoided?: boolean,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<SettlementResponseDto[]> {
    const safeLimit = Math.min(Math.max(limit ?? 50, 1), MAX_LIST_LIMIT);
    return this.settlementsService.listInSpace(user.userId, spaceId, {
      userId,
      includeVoided,
      limit: safeLimit,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a settlement payment (P-10, P-11)',
    description:
      'May return warnings including SETTLEMENT_EXCEEDS_PENDING_DEBT when amount exceeds net pending debt.',
  })
  @ApiCreatedResponse({ type: SettlementResponseDto })
  @ApiForbiddenResponse({ description: 'SETTLEMENT_FORBIDDEN' })
  @ApiBadRequestResponse({
    description: 'SETTLEMENT_SAME_USER or SETTLEMENT_USER_NOT_MEMBER',
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateSettlementDto,
  ): Promise<SettlementResponseDto> {
    return this.settlementsService.createInSpace(user.userId, spaceId, dto);
  }

  @Post(':settlementId/link-personal-cash-flow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link personal account for payer or payee (P-07)',
  })
  @ApiOkResponse({ type: SettlementResponseDto })
  @ApiForbiddenResponse({ description: 'PERSONAL_LINK_NOT_ALLOWED' })
  @ApiConflictResponse({
    description: 'VERSION_CONFLICT, ALREADY_VOIDED, or PERSONAL_LINK_ALREADY_EXISTS',
  })
  async linkPersonalCashFlow(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
    @Body() dto: LinkPersonalCashFlowDto,
  ): Promise<SettlementResponseDto> {
    return this.settlementsService.linkPersonalCashFlowInSpace(
      user.userId,
      spaceId,
      settlementId,
      dto,
    );
  }

  @Post(':settlementId/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void settlement (P-10, P-13)' })
  @ApiOkResponse({ type: SettlementResponseDto })
  @ApiForbiddenResponse({ description: 'SETTLEMENT_FORBIDDEN' })
  @ApiConflictResponse({ description: 'VERSION_CONFLICT or ALREADY_VOIDED' })
  async voidSettlement(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
    @Body() dto: VoidSettlementDto,
  ): Promise<SettlementResponseDto> {
    return this.settlementsService.voidInSpace(
      user.userId,
      spaceId,
      settlementId,
      dto,
    );
  }
}
