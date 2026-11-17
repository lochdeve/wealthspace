import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { BalancesService } from './balances.service';
import { SpaceBalancesDto } from './dto/space-balances.dto';

@ApiTags('balances')
@Controller('spaces/:spaceId/balances')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  @ApiOperation({
    summary: 'Net debts and member balances by currency (P-08)',
  })
  @ApiOkResponse({ type: SpaceBalancesDto })
  @ApiBadRequestResponse({ description: 'SHARED_SPACE_REQUIRED' })
  async getBalances(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ): Promise<SpaceBalancesDto> {
    return this.balancesService.getInSpace(user.userId, spaceId);
  }
}
