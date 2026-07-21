import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  createCategory(
    createMenuCategoryDto: CreateMenuCategoryDto,
    restaurantId: number,
  ) {
    return this.prisma.menuCategory.create({
      data: {
        name: createMenuCategoryDto.name,
        restaurantId,
      },
    });
  }

  findCategoriesByRestaurant(
    restaurantId: number,
  ) {
    return this.prisma.menuCategory.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        menuItems: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  }

  async createItem(
    createMenuItemDto: CreateMenuItemDto,
    restaurantId: number,
  ) {
    const category =
      await this.prisma.menuCategory.findFirst({
        where: {
          id: createMenuItemDto.categoryId,
          restaurantId,
        },
      });

    if (!category) {
      throw new BadRequestException(
        'Seçilen kategori bu restorana ait değil.',
      );
    }

    return this.prisma.menuItem.create({
      data: {
        name: createMenuItemDto.name,
        price: createMenuItemDto.price,
        description:
          createMenuItemDto.description,
        isAvailable:
          createMenuItemDto.isAvailable ?? true,
        categoryId:
          createMenuItemDto.categoryId,
        restaurantId,
      },
      include: {
        category: true,
      },
    });
  }

  findItemsByRestaurant(
    restaurantId: number,
  ) {
    return this.prisma.menuItem.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        category: true,
      },
    });
  }

  async updateItem(
    id: number,
    updateMenuItemDto: UpdateMenuItemDto,
    restaurantId: number,
  ) {
    const menuItem =
      await this.prisma.menuItem.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

    if (!menuItem) {
      throw new NotFoundException(
        'Menü ürünü bulunamadı.',
      );
    }

    if (
      updateMenuItemDto.categoryId !== undefined
    ) {
      const category =
        await this.prisma.menuCategory.findFirst({
          where: {
            id: updateMenuItemDto.categoryId,
            restaurantId,
          },
        });

      if (!category) {
        throw new BadRequestException(
          'Seçilen kategori bu restorana ait değil.',
        );
      }
    }

    return this.prisma.menuItem.update({
      where: {
        id,
      },
      data: updateMenuItemDto,
      include: {
        category: true,
      },
    });
  }

  async deleteItem(id: number, restaurantId: number) {
  const item = await this.prisma.menuItem.findFirst({
    where: {
      id,
      restaurantId,
    },
  });

  if (!item) {
    throw new NotFoundException('Ürün bulunamadı.');
  }

  return this.prisma.menuItem.update({
    where: { id },
    data: {
      isAvailable: false,
    },
  });
}

  findMenuByRestaurant(
    restaurantId: number,
  ) {
    return this.prisma.menuCategory.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  }
}