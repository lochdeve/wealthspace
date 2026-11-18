import { Module } from '@nestjs/common';
import { BalancesModule } from '../balances/balances.module';
import { CrossSpaceCashLinksModule } from '../cross-space-cash-links/cross-space-cash-links.module';
import { SpacesModule } from '../spaces/spaces.module';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [SpacesModule, BalancesModule, CrossSpaceCashLinksModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
})
export class SettlementsModule {}
