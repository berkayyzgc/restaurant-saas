import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KitchenGateway } from '../kitchen/kitchen.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, KitchenGateway],
})
export class OrdersModule {}