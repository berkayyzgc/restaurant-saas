import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post('categories')
  createCategory(@Body() createMenuCategoryDto: CreateMenuCategoryDto) {
    return this.menuService.createCategory(createMenuCategoryDto);
  }

  @Get('categories/restaurant/:restaurantId')
  findCategoriesByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findCategoriesByRestaurant(+restaurantId);
  }

  @Post('items')
  createItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuService.createItem(createMenuItemDto);
  }

  @Get('items/restaurant/:restaurantId')
  findItemsByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findItemsByRestaurant(+restaurantId);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(+id, updateMenuItemDto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(+id);
  }
  @Get('restaurant/:restaurantId')
findMenuByRestaurant(@Param('restaurantId') restaurantId: string) {
  return this.menuService.findMenuByRestaurant(+restaurantId);
}
}