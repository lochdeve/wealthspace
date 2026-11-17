import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { InvitationsModule } from './invitations/invitations.module';
import { SpacesModule } from './spaces/spaces.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SharedExpensesModule } from './shared-expenses/shared-expenses.module';
import { BalancesModule } from './balances/balances.module';
import { SettlementsModule } from './settlements/settlements.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    SpacesModule,
    InvitationsModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    SharedExpensesModule,
    BalancesModule,
    SettlementsModule,
  ],
})
export class AppModule {}
