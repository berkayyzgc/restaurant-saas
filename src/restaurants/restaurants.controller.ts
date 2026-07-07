import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('restaurants')
@Controller('restaurants')
@ApiTags('restaurants')
@ApiBearerAuth('access-token')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @ApiOperation({ summary: 'Create a new restaurant' })
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
  @Body() createRestaurantDto: CreateRestaurantDto,
  @Req() req,
) {
  return this.restaurantsService.create(createRestaurantDto, req.user.sub);
}

  @Get()
@UseGuards(JwtAuthGuard)
findAll(@Req() req) {
  return this.restaurantsService.findAll(req.user.sub);
}

  @Get(':id')
@UseGuards(JwtAuthGuard)
findOne(@Param('id') id: string, @Req() req) {
  return this.restaurantsService.findOne(+id, req.user.sub);
}

  @Patch(':id')
@UseGuards(JwtAuthGuard)
update(
  @Param('id') id: string,
  @Body() updateRestaurantDto: UpdateRestaurantDto,
  @Req() req,
) {
  return this.restaurantsService.update(
    +id,
    updateRestaurantDto,
    req.user.sub,
  );
}

  @Delete(':id')
@UseGuards(JwtAuthGuard)
remove(@Param('id') id: string, @Req() req) {
  return this.restaurantsService.remove(+id, req.user.sub);
}
}