import {
  Body,
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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('space-invitations')
@Controller('spaces/:spaceId/invitations')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class SpaceInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite by email (OWNER/ADMIN, SHARED only)' })
  @ApiCreatedResponse({ type: InvitationDto })
  @ApiForbiddenResponse({
    schema: {
      example: {
        statusCode: 403,
        code: 'INSUFFICIENT_ROLE',
        message: 'Only owners and admins can manage invitations',
      },
    },
  })
  @ApiConflictResponse({ description: 'Duplicate pending or already member' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationDto> {
    return this.invitationsService.createForSpace(user.userId, spaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pending invitations for a space' })
  @ApiOkResponse({ type: InvitationDto, isArray: true })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ): Promise<InvitationDto[]> {
    return this.invitationsService.listPendingForSpace(user.userId, spaceId);
  }

  @Post(':invitationId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiNoContentResponse()
  async revoke(
    @CurrentUser() user: RequestUser,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.invitationsService.revoke(user.userId, spaceId, invitationId);
  }
}
