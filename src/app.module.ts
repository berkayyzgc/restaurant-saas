import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';

@Module({
  imports: [RestaurantsModule, PrismaModule, UsersModule, AuthModule, MenuModule, TablesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
