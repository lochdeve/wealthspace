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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { validationErrorOpenApiExample } from '../common/swagger-validation-error';
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
  @ApiNotFoundResponse({
    description: 'Invitation not found for this user',
    schema: {
      example: {
        statusCode: 404,
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      },
    },
  })
  @ApiBadRequestResponse({
    schema: { example: validationErrorOpenApiExample },
  })
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
  @ApiNotFoundResponse({
    description: 'Invitation not found for this user',
    schema: {
      example: {
        statusCode: 404,
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      },
    },
  })
  @ApiBadRequestResponse({
    schema: { example: validationErrorOpenApiExample },
  })
  async reject(
    @CurrentUser() user: RequestUser,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.invitationsService.reject(user.userId, invitationId);
  }
}
