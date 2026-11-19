import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
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
import { AuthService } from '../auth/auth.service';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { ConsumptionService } from './consumption.service';
import { ConsumptionReportDto } from './dto/consumption-report.dto';

@ApiTags('reports')
@Controller('spaces/:spaceId/reports')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class ReportsController {
  constructor(
    private readonly consumptionService: ConsumptionService,
    private readonly authService: AuthService,
  ) {}

  @Get('consumption')
  @ApiOperation({
    summary: 'Monthly consumption report (P-17)',
    description:
      'Calendar month in the authenticated user timezone. Consumption excludes cross-space cash-flow legs, contributions and settlements.',
  })
  @ApiQuery({ name: 'year', example: 2026 })
  @ApiQuery({ name: 'month', example: 11 })
  @ApiOkResponse({ type: ConsumptionReportDto })
  async consumption(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ): Promise<ConsumptionReportDto> {
    const profile = await this.authService.getProfileById(user.userId);
    return this.consumptionService.monthlyConsumptionReport(
      user.userId,
      spaceId,
      year,
      month,
      profile.timezone,
    );
  }
}
