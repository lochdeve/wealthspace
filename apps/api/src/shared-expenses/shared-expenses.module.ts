import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CrossSpaceCashLinksModule } from '../cross-space-cash-links/cross-space-cash-links.module';
import { SpacesModule } from '../spaces/spaces.module';
import { SharedExpensesController } from './shared-expenses.controller';
import { SharedExpensesService } from './shared-expenses.service';

@Module({
  imports: [SpacesModule, AccountsModule, CrossSpaceCashLinksModule],
  controllers: [SharedExpensesController],
  providers: [SharedExpensesService],
  exports: [SharedExpensesService],
})
export class SharedExpensesModule {}
