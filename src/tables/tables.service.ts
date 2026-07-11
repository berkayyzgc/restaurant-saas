import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  create(createTableDto: CreateTableDto) {
  return this.prisma.table.create({
    data: {
      ...createTableDto,
      qrToken: randomUUID(),
    },
  });
}

  findAll() {
    return this.prisma.table.findMany();
  }

  findOne(id: number) {
    return this.prisma.table.findUnique({
      where: { id },
    });
  }

  update(id: number, updateTableDto: UpdateTableDto) {
    return this.prisma.table.update({
      where: { id },
      data: updateTableDto,
    });
  }

  remove(id: number) {
  return this.prisma.table.delete({
    where: { id },
  });
}


async findByQrToken(qrToken: string) {
  const table = await this.prisma.table.findUnique({
    where: { qrToken },
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
    throw new NotFoundException('QR koduna ait masa bulunamadı');
  }

  return table;
  }
  async closeSession(tableId: number) {
  const table = await this.prisma.table.findUnique({
    where: { id: tableId },
  });

  if (!table) {
    throw new NotFoundException('Masa bulunamadı');
  }

  const tableSession = await this.prisma.tableSession.findFirst({
    where: {
      tableId,
      status: 'OPEN',
    },
    orderBy: {
      openedAt: 'desc',
    },
  });

  if (!tableSession) {
    throw new NotFoundException('Bu masa için açık oturum bulunamadı');
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