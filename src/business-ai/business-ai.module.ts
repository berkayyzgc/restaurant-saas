import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessAiController } from './business-ai.controller';
import { BusinessAiService } from './business-ai.service';

@Module({
  imports: [
    PrismaModule,
    DashboardModule,
    AuthModule,
  ],
  controllers: [BusinessAiController],
  providers: [BusinessAiService],
})
export class BusinessAiModule {}