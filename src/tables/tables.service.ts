import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  create(
    createTableDto: CreateTableDto,
    restaurantId: number,
  ) {
    return this.prisma.table.create({
      data: {
        name: createTableDto.name,
        restaurantId,
        qrToken: randomUUID(),
      },
    });
  }

  async findAll(
    restaurantId: number,
  ) {
    const tables = await this.prisma.table.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        tableSessions: {
          where: {
            status: 'OPEN',
          },
          orderBy: {
            openedAt: 'desc',
          },
          take: 1,
          include: {
            orders: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    return tables.map((table) => {
      const activeSession =
        table.tableSessions[0] ?? null;

      const orders =
        activeSession?.orders ?? [];

      const hasReadyOrder =
        orders.some(
          (order) =>
            order.status === 'READY',
        );

      const hasActiveOrder =
        orders.some((order) =>
          [
            'PENDING',
            'ACCEPTED',
            'PREPARING',
          ].includes(order.status),
        );

      let operationalStatus:
        | 'AVAILABLE'
        | 'OCCUPIED'
        | 'ACTIVE_ORDER'
        | 'READY' = 'AVAILABLE';

      if (activeSession) {
        operationalStatus = 'OCCUPIED';

        if (hasReadyOrder) {
          operationalStatus = 'READY';
        } else if (hasActiveOrder) {
          operationalStatus =
            'ACTIVE_ORDER';
        }
      }

      return {
        id: table.id,
        name: table.name,
        qrToken: table.qrToken,
        restaurantId:
          table.restaurantId,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        operationalStatus,
        activeSession,
      };
    });
  }

  async findOne(
    id: number,
    restaurantId: number,
  ) {
    const table =
      await this.prisma.table.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

    if (!table) {
      throw new NotFoundException(
        'Masa bulunamadı',
      );
    }

    return table;
  }

  async update(
    id: number,
    updateTableDto: UpdateTableDto,
    restaurantId: number,
  ) {
    await this.findOne(
      id,
      restaurantId,
    );

    return this.prisma.table.update({
      where: {
        id,
      },
      data: {
        name: updateTableDto.name,
      },
    });
  }

  async remove(
    id: number,
    restaurantId: number,
  ) {
    await this.findOne(
      id,
      restaurantId,
    );

    return this.prisma.table.delete({
      where: {
        id,
      },
    });
  }

  async findByQrToken(
    qrToken: string,
  ) {
    const table =
      await this.prisma.table.findUnique({
        where: {
          qrToken,
        },
        include: {
          restaurant: {
            include: {
              menuCategories: {
                include: {
                  menuItems: {
                    where: {
                      isAvailable: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!table) {
      throw new NotFoundException(
        'QR koduna ait masa bulunamadı',
      );
    }

    return table;
  }

  async closeSession(
    tableId: number,
    restaurantId: number,
  ) {
    const table =
      await this.prisma.table.findFirst({
        where: {
          id: tableId,
          restaurantId,
        },
      });

    if (!table) {
      throw new NotFoundException(
        'Masa bulunamadı',
      );
    }

    const tableSession =
      await this.prisma.tableSession.findFirst({
        where: {
          tableId,
          restaurantId,
          status: 'OPEN',
        },
        orderBy: {
          openedAt: 'desc',
        },
      });

    if (!tableSession) {
      throw new NotFoundException(
        'Bu masa için açık oturum bulunamadı',
      );
    }

    return this.prisma.tableSession.update({
      where: {
        id: tableSession.id,
      },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
      include: {
        table: true,
        restaurant: true,
        orders: {
          include: {
            items: true,
          },
        },
      },
    });
  }
}