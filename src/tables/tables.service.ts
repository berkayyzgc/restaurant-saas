import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
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
  console.log('GELEN TOKEN:', qrToken);

  const table = await this.prisma.table.findUnique({
    where: { qrToken },
    include: {
      restaurant: true,
    },
  });

  console.log('BULUNAN MASA:', table);

  return table;
}
}