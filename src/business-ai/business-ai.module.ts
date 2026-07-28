import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessAiController } from './business-ai.controller';
import { BusinessAiService } from './business-ai.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessAiController],
  providers: [BusinessAiService],
})
export class BusinessAiModule {}