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
  ApiOkResponse,
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
import { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import { SharedExpenseDetailDto } from './dto/shared-expense-detail.dto';
import { SharedExpensesService } from './shared-expenses.service';

@ApiTags('shared-expenses')
@Controller('spaces/:spaceId/shared-expenses')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SharedExpensesController {
  constructor(private readonly sharedExpensesService: SharedExpensesService) {}

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
}
