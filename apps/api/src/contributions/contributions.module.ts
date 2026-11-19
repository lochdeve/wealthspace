import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CrossSpaceCashLinksModule } from '../cross-space-cash-links/cross-space-cash-links.module';
import { SpacesModule } from '../spaces/spaces.module';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';

@Module({
  imports: [SpacesModule, AccountsModule, CrossSpaceCashLinksModule],
  controllers: [ContributionsController],
  providers: [ContributionsService],
})
export class ContributionsModule {}
