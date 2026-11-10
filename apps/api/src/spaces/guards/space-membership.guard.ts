import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { SpacesService } from '../spaces.service';

/** Requires JwtAuthGuard first. Ensures ACTIVE membership for `params.spaceId`. */
@Injectable()
export class SpaceMembershipGuard implements CanActivate {
  constructor(private readonly spacesService: SpacesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: RequestUser; params: { spaceId?: string } }>();
    const user = request.user;
    if (user === undefined) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    const spaceId = request.params.spaceId;
    if (typeof spaceId !== 'string' || spaceId.length === 0) {
      return false;
    }

    await this.spacesService.requireActiveMembership(user.userId, spaceId);
    return true;
  }
}
