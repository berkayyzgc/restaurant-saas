import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrdersModule,
  ],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}