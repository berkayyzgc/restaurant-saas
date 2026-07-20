import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(
    createRestaurantDto: CreateRestaurantDto,
    userId: number,
  ) {
    return this.prisma.restaurant.create({
      data: {
        name: createRestaurantDto.name,
        city: createRestaurantDto.city,
        address: createRestaurantDto.address,
        phone: createRestaurantDto.phone,
        description:
          createRestaurantDto.description,
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
        userId,
      },
    });
  }

  async findOne(
    id: number,
    userId: number,
  ) {
    const restaurant =
      await this.prisma.restaurant.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }

    return restaurant;
  }

  async findPublicOne(id: number) {
    const restaurant =
      await this.prisma.restaurant.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          description: true,
          phone: true,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }

    return restaurant;
  }

  async update(
    id: number,
    updateRestaurantDto: UpdateRestaurantDto,
    userId: number,
  ) {
    const restaurant =
      await this.prisma.restaurant.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }

    return this.prisma.restaurant.update({
      where: {
        id,
      },
      data: updateRestaurantDto,
    });
  }

  async remove(
    id: number,
    userId: number,
  ) {
    const restaurant =
      await this.prisma.restaurant.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }

    return this.prisma.restaurant.delete({
      where: {
        id,
      },
    });
  }
}