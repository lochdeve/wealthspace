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
import { InvitationDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Pending invitations for the authenticated user email',
  })
  @ApiOkResponse({ type: InvitationDto, isArray: true })
  async listMine(@CurrentUser() user: RequestUser): Promise<InvitationDto[]> {
    return this.invitationsService.listPendingForUser(user.userId);
  }

  @Post(':invitationId/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Expired or already a member' })
  async accept(
    @CurrentUser() user: RequestUser,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.invitationsService.accept(user.userId, invitationId);
  }

  @Post(':invitationId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject an invitation' })
  @ApiNoContentResponse()
  async reject(
    @CurrentUser() user: RequestUser,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.invitationsService.reject(user.userId, invitationId);
  }
}
