import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(createMenuCategoryDto: CreateMenuCategoryDto) {
    return this.prisma.menuCategory.create({
      data: createMenuCategoryDto,
    });
  }

  findCategoriesByRestaurant(restaurantId: number) {
    return this.prisma.menuCategory.findMany({
      where: { restaurantId },
      include: { menuItems: true },
    });
  }

  createItem(createMenuItemDto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: createMenuItemDto,
    });
  }

  findItemsByRestaurant(restaurantId: number) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: {
        category: true,
      },
    });
  }

  updateItem(id: number, updateMenuItemDto: UpdateMenuItemDto) {
    return this.prisma.menuItem.update({
      where: { id },
      data: updateMenuItemDto,
    });
  }

   deleteItem(id: number) {
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }

  findMenuByRestaurant(restaurantId: number) {
    return this.prisma.menuCategory.findMany({
      where: {
        restaurantId,
      },
      include: {
        menuItems: true,
      },
    });
  }
  }
