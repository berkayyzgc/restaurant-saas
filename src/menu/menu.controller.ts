import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuService } from './menu.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email: string;
    restaurantId: number;
  };
};

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
  ) {}

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  createCategory(
    @Body() createMenuCategoryDto: CreateMenuCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.createCategory(
      createMenuCategoryDto,
      request.user.restaurantId,
    );
  }

  @Get('categories/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard)
  findCategoriesByRestaurant(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.findCategoriesByRestaurant(
      request.user.restaurantId,
    );
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  createItem(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.createItem(
      createMenuItemDto,
      request.user.restaurantId,
    );
  }

  @Get('items/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard)
  findItemsByRestaurant(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.findItemsByRestaurant(
      request.user.restaurantId,
    );
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard)
  updateItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.updateItem(
      +id,
      updateMenuItemDto,
      request.user.restaurantId,
    );
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  deleteItem(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.menuService.deleteItem(
      +id,
      request.user.restaurantId,
    );
  }

  /*
   * Müşteri menüyü giriş yapmadan görebileceği için
   * bu endpoint açık kalıyor.
   */
  @Get('restaurant/:restaurantId')
  findMenuByRestaurant(
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.menuService.findMenuByRestaurant(
      +restaurantId,
    );
  }
}