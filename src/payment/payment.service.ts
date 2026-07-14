import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderPaymentStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { KitchenGateway } from '../kitchen/kitchen.gateway';

@Injectable()
export class PaymentService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly kitchenGateway: KitchenGateway,
) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const {
      tableSessionId,
      method,
      keepSessionOpen = true,
    } = createPaymentDto;

    const tableSession =
      await this.prisma.tableSession.findFirst({
        where: {
          id: tableSessionId,
          status: 'OPEN',
        },
        include: {
          table: true,
          restaurant: true,
          orders: {
            where: {
              paymentStatus: OrderPaymentStatus.UNPAID,
              status: {
                not: 'CANCELLED',
              },
            },
          },
        },
      });

    if (!tableSession) {
      throw new NotFoundException(
        'Açık masa oturumu bulunamadı',
      );
    }

    if (tableSession.orders.length === 0) {
      throw new BadRequestException(
        'Bu masa için ödenmemiş sipariş bulunmuyor',
      );
    }

    const pendingPayment =
      await this.prisma.payment.findFirst({
        where: {
          tableSessionId,
          status: PaymentStatus.PENDING,
        },
      });

    if (pendingPayment) {
      throw new BadRequestException(
        'Bu masa için zaten bekleyen bir ödeme bulunuyor',
      );
    }

    const amount = tableSession.orders.reduce(
      (total, order) =>
        total.plus(order.totalPrice),
      new Prisma.Decimal(0),
    );

    return this.prisma.payment.create({
      data: {
        tableSessionId,
        amount,
        method,
        status: PaymentStatus.PENDING,
        keepSessionOpen,
      },
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
            orders: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });
  }

  async complete(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
            orders: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'Ödeme kaydı bulunamadı',
      );
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Bu ödeme zaten tamamlanmış',
      );
    }

    if (
      payment.status === PaymentStatus.CANCELLED ||
      payment.status === PaymentStatus.FAILED
    ) {
      throw new BadRequestException(
        'İptal edilmiş veya başarısız ödeme tamamlanamaz',
      );
    }

    

    const completedAt = new Date();

    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.order.updateMany({
          where: {
            tableSessionId: payment.tableSessionId,
            paymentStatus: OrderPaymentStatus.UNPAID,
            status: {
              not: 'CANCELLED',
            },
          },
          data: {
            paymentStatus: OrderPaymentStatus.PAID,
            paidAt: completedAt,
          },
        });

        const completedPayment =
          await transaction.payment.update({
            where: {
              id: paymentId,
            },
            data: {
              status: PaymentStatus.COMPLETED,
              completedAt,
            },
            include: {
              tableSession: {
                include: {
                  table: true,
                  restaurant: true,
                  orders: {
                    include: {
                      items: true,
                    },
                  },
                },
              },
            },
          });

        if (!payment.keepSessionOpen) {
          await transaction.tableSession.update({
            where: {
              id: payment.tableSessionId,
            },
            data: {
              status: 'CLOSED',
              closedAt: completedAt,
            },
          });
        }

        this.kitchenGateway.sendPaymentCompleted(completedPayment);

return completedPayment;
      },
    );
  }

  async cancel(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'Ödeme kaydı bulunamadı',
      );
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Tamamlanmış ödeme iptal edilemez',
      );
    }

    return this.prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.CANCELLED,
      },
    });
  }

  findAll() {
    return this.prisma.payment.findMany({
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
            orders: {
              include: {
                items: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        tableSession: {
          include: {
            table: true,
            restaurant: true,
            orders: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'Ödeme kaydı bulunamadı',
      );
    }

    return payment;
  }
}