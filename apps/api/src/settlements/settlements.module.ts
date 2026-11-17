import { Module } from '@nestjs/common';
import { BalancesModule } from '../balances/balances.module';
import { SpacesModule } from '../spaces/spaces.module';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [SpacesModule, BalancesModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
})
export class SettlementsModule {}
