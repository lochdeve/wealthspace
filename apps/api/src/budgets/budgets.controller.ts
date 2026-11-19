import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetDto } from './dto/budget-response.dto';

@ApiTags('budgets')
@Controller('spaces/:spaceId/budgets')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List budgets',
    description:
      'Optional periodFrom/periodTo (YYYY-MM-DD) filter budgets overlapping the range.',
  })
  @ApiQuery({ name: 'periodFrom', required: false, example: '2026-11-01' })
  @ApiQuery({ name: 'periodTo', required: false, example: '2026-11-30' })
  @ApiOkResponse({ type: BudgetDto, isArray: true })
  async list(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ): Promise<BudgetDto[]> {
    return this.budgetsService.listForSpace(spaceId, periodFrom, periodTo);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create budget' })
  @ApiCreatedResponse({ type: BudgetDto })
  async create(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetDto> {
    return this.budgetsService.createInSpace(spaceId, dto);
  }

  @Patch(':budgetId')
  @ApiOperation({ summary: 'Update budget' })
  @ApiOkResponse({ type: BudgetDto })
  async update(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetDto> {
    return this.budgetsService.updateInSpace(spaceId, budgetId, dto);
  }

  @Delete(':budgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete budget' })
  @ApiNoContentResponse()
  async remove(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
  ): Promise<void> {
    await this.budgetsService.deleteInSpace(spaceId, budgetId);
  }
}
