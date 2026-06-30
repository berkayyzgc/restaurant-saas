import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRestaurantDto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data: {
        name: createRestaurantDto.name,
        city: createRestaurantDto.city,
        address: createRestaurantDto.address,
        phone: createRestaurantDto.phone,
        description: createRestaurantDto.description,
        user: {
          connect: {
            id: 1,
          },
        },
      },
    });
  }

  findAll() {
    return this.prisma.restaurant.findMany();
  }

  async findOne(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: {
        id: id,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  update(id: number, updateRestaurantDto: UpdateRestaurantDto) {
    return this.prisma.restaurant.update({
      where: {
        id: id,
      },
      data: updateRestaurantDto,
    });
  }

  remove(id: number) {
    return this.prisma.restaurant.delete({
      where: {
        id: id,
      },
    });
  }
}