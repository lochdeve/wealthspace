import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrossSpaceCashLinksService } from './cross-space-cash-links.service';

@Module({
  imports: [PrismaModule],
  providers: [CrossSpaceCashLinksService],
  exports: [CrossSpaceCashLinksService],
})
export class CrossSpaceCashLinksModule {}
