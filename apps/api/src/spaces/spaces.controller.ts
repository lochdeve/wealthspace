import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
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
import { SpaceDetailDto } from './dto/space-detail.dto';
import { SpaceListItemDto } from './dto/space-list-item.dto';
import { SpaceMembershipGuard } from './guards/space-membership.guard';
import { SpacesService } from './spaces.service';

@ApiTags('spaces')
@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  @ApiOperation({
    summary: 'List spaces',
    description:
      'Returns spaces where the caller has an ACTIVE membership (dashboard global scope).',
  })
  @ApiOkResponse({ type: SpaceListItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async list(@CurrentUser() user: RequestUser): Promise<SpaceListItemDto[]> {
    return this.spacesService.listActiveSpacesForUser(user.userId);
  }

  @Get(':spaceId')
  @UseGuards(SpaceMembershipGuard)
  @ApiOperation({
    summary: 'Get space',
    description: 'Returns space details when the caller has ACTIVE membership.',
  })
  @ApiOkResponse({ type: SpaceDetailDto })
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
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ): Promise<SpaceDetailDto> {
    return this.spacesService.getSpaceForActiveMember(user.userId, spaceId);
  }
}
