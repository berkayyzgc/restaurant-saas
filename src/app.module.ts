import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { KitchenGateway } from './kitchen/kitchen.gateway';
import { PaymentModule } from './payment/payment.module';
import { ServiceRequestModule } from './service-request/service-request.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [RestaurantsModule, PrismaModule, UsersModule, AuthModule, MenuModule, TablesModule, OrdersModule, PaymentModule, ServiceRequestModule,DashboardModule],
  controllers: [AppController],
  providers: [AppService, KitchenGateway],
})
export class AppModule {}
