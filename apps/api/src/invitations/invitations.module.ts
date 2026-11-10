import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpacesModule } from '../spaces/spaces.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { SpaceInvitationsController } from './space-invitations.controller';

@Module({
  imports: [AuthModule, SpacesModule],
  controllers: [SpaceInvitationsController, InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
