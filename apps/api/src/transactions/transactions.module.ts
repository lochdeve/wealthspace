import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { SpacesModule } from '../spaces/spaces.module';
import { AccountOpeningBalanceController } from './account-opening-balance.controller';
import { SpaceTransactionsController } from './space-transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [AuthModule, SpacesModule, AccountsModule],
  controllers: [AccountOpeningBalanceController, SpaceTransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
