import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SpaceMemberDto } from './dto/space-member.dto';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from './guards/space-membership.guard';
import { MembershipsService } from './memberships.service';

@ApiTags('space-memberships')
@Controller('spaces/:spaceId')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SpaceMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('members')
  @ApiOperation({
    summary: 'List active members',
    description: 'Active roster for a SHARED space (any active member).',
  })
  @ApiOkResponse({ type: SpaceMemberDto, isArray: true })
  async listMembers(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ): Promise<SpaceMemberDto[]> {
    return this.membershipsService.listActiveMembers(user.userId, spaceId);
  }

  @Post('membership/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Leave a shared space',
    description:
      'Sets membership to LEFT with leftAt. Sole OWNER cannot leave until ownership transfer exists (PENDIENTE DE DECISIÓN).',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({
    schema: { example: { statusCode: 403, code: 'SPACE_NOT_SHARED' } },
  })
  @ApiConflictResponse({
    schema: {
      example: {
        statusCode: 409,
        code: 'CANNOT_LEAVE_AS_SOLE_OWNER',
      },
    },
  })
  async leave(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ): Promise<void> {
    await this.membershipsService.leaveSpace(user.userId, spaceId);
  }

  @Post('members/:userId/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member (OWNER/ADMIN)',
    description:
      'Sets target membership to REMOVED with leftAt. ADMIN may remove MEMBER only.',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({
    schema: { example: { statusCode: 403, code: 'INSUFFICIENT_ROLE' } },
  })
  @ApiNotFoundResponse({
    schema: { example: { statusCode: 404, code: 'MEMBER_NOT_FOUND' } },
  })
  @ApiConflictResponse({
    description: 'USE_LEAVE_INSTEAD, CANNOT_REMOVE_SOLE_OWNER',
  })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ): Promise<void> {
    await this.membershipsService.removeMember(
      user.userId,
      spaceId,
      targetUserId,
    );
  }
}
