import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpaceMembershipGuard } from './guards/space-membership.guard';
import { MembershipsService } from './memberships.service';
import { SpaceMembershipsController } from './space-memberships.controller';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  imports: [AuthModule],
  controllers: [SpacesController, SpaceMembershipsController],
  providers: [SpacesService, MembershipsService, SpaceMembershipGuard],
  exports: [SpacesService, SpaceMembershipGuard],
})
export class SpacesModule {}
