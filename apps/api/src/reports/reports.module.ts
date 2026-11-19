import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpacesModule } from '../spaces/spaces.module';
import { ConsumptionService } from './consumption.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [SpacesModule, AuthModule],
  controllers: [ReportsController],
  providers: [ConsumptionService],
})
export class ReportsModule {}
