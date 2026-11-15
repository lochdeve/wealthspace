import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { SpacesModule } from '../spaces/spaces.module';
import { SharedExpensesController } from './shared-expenses.controller';
import { SharedExpensesService } from './shared-expenses.service';

@Module({
  imports: [SpacesModule, AccountsModule],
  controllers: [SharedExpensesController],
  providers: [SharedExpensesService],
  exports: [SharedExpensesService],
})
export class SharedExpensesModule {}
