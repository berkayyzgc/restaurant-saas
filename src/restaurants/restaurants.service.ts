import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRestaurantDto: CreateRestaurantDto, userId: number) {
  return this.prisma.restaurant.create({
    data: {
      name: createRestaurantDto.name,
      city: createRestaurantDto.city,
      address: createRestaurantDto.address,
      phone: createRestaurantDto.phone,
      description: createRestaurantDto.description,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

  findAll(userId: number) {
  return this.prisma.restaurant.findMany({
    where: {
      userId: userId,
    },
  });
}

  async findOne(id: number, userId: number) {
  const restaurant = await this.prisma.restaurant.findFirst({
    where: {
      id: id,
      userId: userId,
    },
  });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(
  id: number,
  updateRestaurantDto: UpdateRestaurantDto,
  userId: number,
) {
  const restaurant = await this.prisma.restaurant.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  return this.prisma.restaurant.update({
    where: {
      id,
    },
    data: updateRestaurantDto,
  });
}
  async remove(id: number, userId: number) {
  const restaurant = await this.prisma.restaurant.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  return this.prisma.restaurant.delete({
    where: {
      id,
    },
  });
}
}