import { KitchenGateway } from '../kitchen/kitchen.gateway';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly kitchenGateway: KitchenGateway,
) {}

  async create(createOrderDto: CreateOrderDto) {
    const { tableId, items, note } = createOrderDto;

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }

    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: {
          in: menuItemIds,
        },
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new NotFoundException(
        'Siparişteki ürünlerden biri veya birkaçı bulunamadı',
      );
    }

    const menuItemMap = new Map(
      menuItems.map((menuItem) => [menuItem.id, menuItem]),
    );

    let totalPrice = new Prisma.Decimal(0);

    const orderItems = items.map((requestedItem) => {
      const menuItem = menuItemMap.get(requestedItem.menuItemId);

      if (!menuItem) {
        throw new NotFoundException(
          `Ürün bulunamadı: ${requestedItem.menuItemId}`,
        );
      }

      if (!menuItem.isAvailable) {
        throw new BadRequestException(
          `${menuItem.name} şu anda satışa açık değil`,
        );
      }

      if (menuItem.restaurantId !== table.restaurantId) {
        throw new BadRequestException(
          `${menuItem.name} bu restorana ait değil`,
        );
      }

      const unitPrice = new Prisma.Decimal(menuItem.price);
      const itemTotal = unitPrice.mul(requestedItem.quantity);

      totalPrice = totalPrice.plus(itemTotal);

      return {
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        quantity: requestedItem.quantity,
        unitPrice,
        note: requestedItem.note,
      };
    });

    const createdOrder = await this.prisma.$transaction(async (transaction) => {
      let tableSession = await transaction.tableSession.findFirst({
        where: {
          tableId,
          status: 'OPEN',
        },
        orderBy: {
          openedAt: 'desc',
        },
      });

      if (!tableSession) {
        tableSession = await transaction.tableSession.create({
          data: {
            tableId,
            restaurantId: table.restaurantId,
          },
        });
      }

      return transaction.order.create({
        data: {
          tableSessionId: tableSession.id,
          note,
          totalPrice,
          items: {
            create: orderItems,
          },
        },
        include: {
          tableSession: {
            include: {
              table: true,
              restaurant: true,
            },
          },
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });
    });
    this.kitchenGateway.sendNewOrder(createdOrder);

return createdOrder;
  }
  

  findAll() {
    return this.prisma.order.findMany({
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
  const existingOrder = await this.findOne(id);

  if (
    updateOrderDto.status &&
    updateOrderDto.status !== existingOrder.status
  ) {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      ACCEPTED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.SERVED],
      SERVED: [],
      CANCELLED: [],
    };

    const allowedStatuses = allowedTransitions[existingOrder.status];

    if (!allowedStatuses.includes(updateOrderDto.status)) {
      throw new BadRequestException(
        `${existingOrder.status} durumundan ${updateOrderDto.status} durumuna geçilemez`,
      );
    }
  }

  const updatedOrder = await this.prisma.order.update({
  where: { id },
  data: {
    status: updateOrderDto.status,
    note: updateOrderDto.note,
  },
  include: {
    tableSession: {
      include: {
        table: true,
        restaurant: true,
      },
    },
    items: {
      include: {
        menuItem: true,
      },
    },
  },
});

this.kitchenGateway.sendOrderUpdated(updatedOrder);

return updatedOrder;
}
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.order.delete({
      where: { id },
    });
  }
  findKitchenOrders() {
  return this.prisma.order.findMany({
    where: {
      status: {
        in: [
          OrderStatus.PENDING,
          OrderStatus.ACCEPTED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
        ],
      },
    },
    select: {
      id: true,
      status: true,
      note: true,
      createdAt: true,
      tableSession: {
        select: {
          table: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      items: {
        select: {
          id: true,
          itemName: true,
          quantity: true,
          note: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
}