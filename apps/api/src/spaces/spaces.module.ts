import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpaceMembershipGuard } from './guards/space-membership.guard';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  imports: [AuthModule],
  controllers: [SpacesController],
  providers: [SpacesService, SpaceMembershipGuard],
  exports: [SpacesService, SpaceMembershipGuard],
})
export class SpacesModule {}
