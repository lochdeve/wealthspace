import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { validationErrorOpenApiExample } from '../common/swagger-validation-error';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import {
  CreateExpenseDto,
  CreateIncomeDto,
  CreateTransferDto,
} from './dto/create-cashflow.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FinancialTransactionDto } from './dto/transaction-response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@Controller('spaces/:spaceId/transactions')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SpaceTransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions' })
  @ApiQuery({ name: 'accountId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max 100, default 50',
  })
  @ApiOkResponse({ type: FinancialTransactionDto, isArray: true })
  async list(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('accountId', new ParseUUIDPipe({ optional: true }))
    accountId?: string,
    @Query('type', new ParseEnumPipe(TransactionType, { optional: true }))
    type?: TransactionType,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<FinancialTransactionDto[]> {
    return this.transactionsService.listForSpace(spaceId, {
      accountId,
      type,
      limit,
    });
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction' })
  @ApiOkResponse({ type: FinancialTransactionDto })
  async getOne(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<FinancialTransactionDto> {
    return this.transactionsService.getInSpace(spaceId, transactionId);
  }

  @Patch(':transactionId')
  @ApiOperation({
    summary: 'Update transaction',
    description:
      'Optimistic lock via expectedVersion; stores FinancialRevision snapshot. categoryId nullable clears category (C-02).',
  })
  @ApiOkResponse({ type: FinancialTransactionDto })
  @ApiBadRequestResponse({
    description: 'VALIDATION_ERROR, NO_CHANGES, INVALID_CATEGORY_TYPE',
    schema: { example: validationErrorOpenApiExample },
  })
  @ApiNotFoundResponse({
    description: 'TRANSACTION_NOT_FOUND or CATEGORY_NOT_FOUND',
  })
  @ApiConflictResponse({
    schema: {
      example: {
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'Transaction was modified by another request',
      },
    },
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<FinancialTransactionDto> {
    return this.transactionsService.updateInSpace(
      user.userId,
      spaceId,
      transactionId,
      dto,
    );
  }

  @Post('income')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record income',
    description: 'Posts INCOME to the given account (PERSONAL or SHARED).',
  })
  @ApiCreatedResponse({ type: FinancialTransactionDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async createIncome(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateIncomeDto,
  ): Promise<FinancialTransactionDto> {
    return this.transactionsService.createIncome(user.userId, spaceId, dto);
  }

  @Post('expense')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record expense',
    description:
      'PERSONAL: account required; attribution to caller. SHARED: attributedToUserId required; account optional.',
  })
  @ApiCreatedResponse({ type: FinancialTransactionDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiBadRequestResponse({
    schema: {
      examples: {
        attribution: {
          value: {
            statusCode: 400,
            code: 'ATTRIBUTION_REQUIRED',
            message: 'Shared expenses require attributedToUserId',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    schema: {
      example: {
        statusCode: 403,
        code: 'ATTRIBUTION_NOT_ALLOWED',
        message: 'Members can only attribute expenses to themselves',
      },
    },
  })
  async createExpense(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<FinancialTransactionDto> {
    return this.transactionsService.createExpense(user.userId, spaceId, dto);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Transfer between accounts',
    description: 'Same space, same currency, distinct accounts.',
  })
  @ApiCreatedResponse({ type: FinancialTransactionDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiBadRequestResponse({
    schema: {
      example: {
        statusCode: 400,
        code: 'CURRENCY_MISMATCH',
        message: 'Transfer accounts must share the same currency',
      },
    },
  })
  async createTransfer(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateTransferDto,
  ): Promise<FinancialTransactionDto> {
    return this.transactionsService.createTransfer(user.userId, spaceId, dto);
  }
}
