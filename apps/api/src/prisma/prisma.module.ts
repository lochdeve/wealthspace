import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Exposes a single PrismaClient for the whole application process. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
