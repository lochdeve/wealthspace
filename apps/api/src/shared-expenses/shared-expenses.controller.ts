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
  Patch,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import { SharedExpenseDetailDto } from './dto/shared-expense-detail.dto';
import { SharedExpenseRevisionDto } from './dto/shared-expense-revision.dto';
import { UpdateSharedExpenseDto } from './dto/update-shared-expense.dto';
import { LinkPersonalPaymentDto } from './dto/link-personal-payment.dto';
import { VoidSharedExpenseDto } from './dto/void-shared-expense.dto';
import { SharedExpensesService } from './shared-expenses.service';

const MAX_LIST_LIMIT = 100;

@ApiTags('shared-expenses')
@Controller('spaces/:spaceId/shared-expenses')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SharedExpensesController {
  constructor(private readonly sharedExpensesService: SharedExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List shared expenses in a SHARED space' })
  @ApiQuery({ name: 'from', required: false, format: 'date-time' })
  @ApiQuery({ name: 'to', required: false, format: 'date-time' })
  @ApiQuery({ name: 'participantUserId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'includeVoided', required: false, type: Boolean })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: `Max ${MAX_LIST_LIMIT}, default 50`,
  })
  @ApiOkResponse({ type: SharedExpenseDetailDto, isArray: true })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('participantUserId', new ParseUUIDPipe({ optional: true }))
    participantUserId?: string,
    @Query('includeVoided', new DefaultValuePipe(false), ParseBoolPipe)
    includeVoided?: boolean,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<SharedExpenseDetailDto[]> {
    const safeLimit = Math.min(Math.max(limit ?? 50, 1), MAX_LIST_LIMIT);
    return this.sharedExpensesService.listInSpace(user.userId, spaceId, {
      from: from !== undefined ? new Date(from) : undefined,
      to: to !== undefined ? new Date(to) : undefined,
      participantUserId,
      includeVoided,
      limit: safeLimit,
    });
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview shared expense split',
    description:
      'Same validation and allocation as create; does not persist (P-16).',
  })
  @ApiOkResponse({ type: SharedExpenseDetailDto })
  @ApiBadRequestResponse({ description: 'Split or validation error' })
  @ApiUnauthorizedResponse()
  async preview(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    return this.sharedExpensesService.previewInSpace(user.userId, spaceId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create shared expense' })
  @ApiCreatedResponse({ type: SharedExpenseDetailDto })
  @ApiForbiddenResponse({ description: 'PAYER_NOT_ALLOWED' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  async create(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    return this.sharedExpensesService.createInSpace(user.userId, spaceId, dto);
  }

  @Get(':sharedExpenseId/revisions')
  @ApiOperation({ summary: 'List immutable revisions for a shared expense' })
  @ApiOkResponse({ type: SharedExpenseRevisionDto, isArray: true })
  async listRevisions(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('sharedExpenseId', ParseUUIDPipe) sharedExpenseId: string,
  ): Promise<SharedExpenseRevisionDto[]> {
    return this.sharedExpensesService.listRevisionsInSpace(
      user.userId,
      spaceId,
      sharedExpenseId,
    );
  }

  @Post(':sharedExpenseId/link-personal-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link member payment to a personal account (payer only)',
  })
  @ApiOkResponse({ type: SharedExpenseDetailDto })
  @ApiForbiddenResponse({
    description: 'NOT_PAYER or PERSONAL_LINK_NOT_ALLOWED',
  })
  @ApiConflictResponse({
    description:
      'VERSION_CONFLICT, ALREADY_VOIDED, or PERSONAL_LINK_ALREADY_EXISTS',
  })
  async linkPersonalPayment(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('sharedExpenseId', ParseUUIDPipe) sharedExpenseId: string,
    @Body() dto: LinkPersonalPaymentDto,
  ): Promise<SharedExpenseDetailDto> {
    return this.sharedExpensesService.linkPersonalPaymentInSpace(
      user.userId,
      spaceId,
      sharedExpenseId,
      dto,
    );
  }

  @Post(':sharedExpenseId/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Void shared expense',
    description:
      'Logical void (P-13). SPACE_ACCOUNT payments void the linked transaction in the same operation.',
  })
  @ApiOkResponse({ type: SharedExpenseDetailDto })
  @ApiForbiddenResponse({ description: 'SHARED_EXPENSE_EDIT_FORBIDDEN' })
  @ApiConflictResponse({
    description: 'VERSION_CONFLICT or ALREADY_VOIDED',
  })
  async voidExpense(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('sharedExpenseId', ParseUUIDPipe) sharedExpenseId: string,
    @Body() dto: VoidSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    return this.sharedExpensesService.voidInSpace(
      user.userId,
      spaceId,
      sharedExpenseId,
      dto,
    );
  }

  @Get(':sharedExpenseId')
  @ApiOperation({ summary: 'Get shared expense detail' })
  @ApiOkResponse({ type: SharedExpenseDetailDto })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('sharedExpenseId', ParseUUIDPipe) sharedExpenseId: string,
  ): Promise<SharedExpenseDetailDto> {
    return this.sharedExpensesService.getInSpace(
      user.userId,
      spaceId,
      sharedExpenseId,
    );
  }

  @Patch(':sharedExpenseId')
  @ApiOperation({
    summary: 'Update shared expense',
    description:
      'Recalculates split and stores an immutable revision. payment.source cannot change.',
  })
  @ApiOkResponse({ type: SharedExpenseDetailDto })
  @ApiForbiddenResponse({ description: 'SHARED_EXPENSE_EDIT_FORBIDDEN' })
  @ApiConflictResponse({ description: 'VERSION_CONFLICT or ALREADY_VOIDED' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('sharedExpenseId', ParseUUIDPipe) sharedExpenseId: string,
    @Body() dto: UpdateSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    return this.sharedExpensesService.updateInSpace(
      user.userId,
      spaceId,
      sharedExpenseId,
      dto,
    );
  }
}
