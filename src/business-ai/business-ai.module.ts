import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessAiController } from './business-ai.controller';
import { BusinessAiService } from './business-ai.service';

@Module({
  imports: [
    PrismaModule,
    DashboardModule,
  ],
  controllers: [BusinessAiController],
  providers: [BusinessAiService],
})
export class BusinessAiModule {}