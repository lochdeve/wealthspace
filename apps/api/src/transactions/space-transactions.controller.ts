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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import { FinancialTransactionDto } from './dto/transaction-response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@Controller('spaces/:spaceId/transactions')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SpaceTransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

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
