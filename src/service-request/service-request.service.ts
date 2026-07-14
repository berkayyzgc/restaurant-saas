import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ServiceRequestStatus,
  ServiceRequestType,
} from '@prisma/client';
import { KitchenGateway } from '../kitchen/kitchen.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

@Injectable()
export class ServiceRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kitchenGateway: KitchenGateway,
  ) {}

  async create(
    createServiceRequestDto: CreateServiceRequestDto,
  ) {
    const { tableId, type } = createServiceRequestDto;

    const table = await this.prisma.table.findUnique({
      where: {
        id: tableId,
      },
    });

    if (!table) {
      throw new NotFoundException('Masa bulunamadı');
    }

    const serviceRequest =
      await this.prisma.$transaction(
        async (transaction) => {
          let tableSession =
            await transaction.tableSession.findFirst({
              where: {
                tableId,
                status: 'OPEN',
              },
              orderBy: {
                openedAt: 'desc',
              },
            });

          if (!tableSession) {
            tableSession =
              await transaction.tableSession.create({
                data: {
                  tableId,
                  restaurantId: table.restaurantId,
                },
              });
          }

          const existingRequest =
            await transaction.serviceRequest.findFirst({
              where: {
                tableSessionId: tableSession.id,
                type,
                status:
                  ServiceRequestStatus.PENDING,
              },
            });

          if (existingRequest) {
            throw new BadRequestException(
              type ===
                ServiceRequestType.CALL_WAITER
                ? 'Garson çağrınız zaten bekliyor'
                : 'Hesap talebiniz zaten bekliyor',
            );
          }

          return transaction.serviceRequest.create({
            data: {
              tableSessionId: tableSession.id,
              type,
            },
            include: {
              tableSession: {
                include: {
                  table: true,
                  restaurant: true,
                },
              },
            },
          });
        },
      );

    this.kitchenGateway.sendServiceRequestCreated(
      serviceRequest,
    );

    return serviceRequest;
  }

  findPending() {
    return this.prisma.serviceRequest.findMany({
      where: {
        status: ServiceRequestStatus.PENDING,
      },
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async complete(id: number) {
    const serviceRequest =
      await this.prisma.serviceRequest.findUnique({
        where: {
          id,
        },
      });

    if (!serviceRequest) {
      throw new NotFoundException(
        'Servis talebi bulunamadı',
      );
    }

    if (
      serviceRequest.status !==
      ServiceRequestStatus.PENDING
    ) {
      throw new BadRequestException(
        'Bu servis talebi artık beklemede değil',
      );
    }

    const completedRequest =
      await this.prisma.serviceRequest.update({
        where: {
          id,
        },
        data: {
          status: ServiceRequestStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          tableSession: {
            include: {
              table: true,
              restaurant: true,
            },
          },
        },
      });

    this.kitchenGateway.sendServiceRequestUpdated(
      completedRequest,
    );

    return completedRequest;
  }

  async cancel(id: number) {
    const serviceRequest =
      await this.prisma.serviceRequest.findUnique({
        where: {
          id,
        },
      });

    if (!serviceRequest) {
      throw new NotFoundException(
        'Servis talebi bulunamadı',
      );
    }

    if (
      serviceRequest.status !==
      ServiceRequestStatus.PENDING
    ) {
      throw new BadRequestException(
        'Bu servis talebi artık beklemede değil',
      );
    }

    const cancelledRequest =
      await this.prisma.serviceRequest.update({
        where: {
          id,
        },
        data: {
          status: ServiceRequestStatus.CANCELLED,
        },
        include: {
          tableSession: {
            include: {
              table: true,
              restaurant: true,
            },
          },
        },
      });

    this.kitchenGateway.sendServiceRequestUpdated(
      cancelledRequest,
    );

    return cancelledRequest;
  }
}