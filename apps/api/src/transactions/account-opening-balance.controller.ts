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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
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
import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';
import { FinancialTransactionDto } from './dto/transaction-response.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@Controller('spaces/:spaceId/accounts/:accountId')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class AccountOpeningBalanceController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('opening-balance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Set opening balance',
    description:
      'One OPENING_BALANCE per account. Amount may be negative or zero. Currency is taken from the account.',
  })
  @ApiCreatedResponse({ type: FinancialTransactionDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      },
    },
  })
  @ApiConflictResponse({
    schema: {
      examples: {
        exists: {
          value: {
            statusCode: 409,
            code: 'OPENING_BALANCE_EXISTS',
            message: 'This account already has an opening balance',
          },
        },
        archived: {
          value: {
            statusCode: 409,
            code: 'ACCOUNT_ARCHIVED',
            message: 'Cannot post to an archived account',
          },
        },
      },
    },
  })
  async createOpeningBalance(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: CreateOpeningBalanceDto,
  ): Promise<FinancialTransactionDto> {
    return this.transactionsService.createOpeningBalance(
      user.userId,
      spaceId,
      accountId,
      dto,
    );
  }
}
