import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  AccountDetailDto,
  AccountListItemDto,
} from './dto/account-response.dto';

@ApiTags('accounts')
@Controller('spaces/:spaceId/accounts')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({
    summary: 'List accounts',
    description:
      'Lists accounts in the space for any ACTIVE member. Balance is computed on read from transactions.',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'When true, includes archived accounts (default false)',
  })
  @ApiOkResponse({ type: AccountListItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: 404,
        code: 'SPACE_NOT_FOUND',
        message: 'Space not found',
      },
    },
  })
  async list(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe)
    includeArchived: boolean,
  ): Promise<AccountListItemDto[]> {
    return this.accountsService.listForSpace(spaceId, includeArchived);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create account',
    description:
      'Creates an account in the space (PERSONAL or SHARED). Currency is fixed after creation.',
  })
  @ApiCreatedResponse({ type: AccountDetailDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async create(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDetailDto> {
    return this.accountsService.createInSpace(spaceId, dto);
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account' })
  @ApiOkResponse({ type: AccountDetailDto })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      },
    },
  })
  async getOne(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<AccountDetailDto> {
    return this.accountsService.getInSpace(spaceId, accountId);
  }

  @Post(':accountId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Archive account',
    description:
      'Sets archivedAt. Archived accounts cannot receive new transactions (DB trigger).',
  })
  @ApiConflictResponse({
    schema: {
      example: {
        statusCode: 409,
        code: 'ACCOUNT_ALREADY_ARCHIVED',
        message: 'Account is already archived',
      },
    },
  })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      },
    },
  })
  async archive(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<void> {
    await this.accountsService.archiveInSpace(spaceId, accountId);
  }
}
