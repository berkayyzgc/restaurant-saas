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
import Iyzipay from 'iyzipay';
import { ProcessIyzicoPaymentDto } from './dto/process-iyzico-payment.dto';

  @Injectable()
export class PaymentService {
  private readonly iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri:
      process.env.IYZICO_BASE_URL ||
      'https://sandbox-api.iyzipay.com',
  });

 
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

  async processIyzicoPayment(
  processPaymentDto: ProcessIyzicoPaymentDto,
) {
  const {
    paymentId,
    cardHolderName,
    cardNumber,
    expireMonth,
    expireYear,
    cvc,
  } = processPaymentDto;

  const payment = await this.prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      tableSession: {
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

  if (payment.status !== PaymentStatus.PENDING) {
    throw new BadRequestException(
      'Yalnızca bekleyen ödemeler işleme alınabilir',
    );
  }

  if (payment.tableSession.orders.length === 0) {
    throw new BadRequestException(
      'Ödenecek sipariş bulunamadı',
    );
  }

  const amount = payment.amount.toFixed(2);

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: String(payment.id),
    price: amount,
    paidPrice: amount,
    currency: Iyzipay.CURRENCY.TRY,
    installment: '1',
    basketId: `PAYMENT-${payment.id}`,
    paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,

    paymentCard: {
      cardHolderName,
      cardNumber,
      expireMonth,
      expireYear,
      cvc,
      registerCard: '0',
    },

    buyer: {
      id: `TABLE-SESSION-${payment.tableSessionId}`,
      name: cardHolderName.split(' ')[0] || 'Misafir',
      surname:
        cardHolderName.split(' ').slice(1).join(' ') ||
        'Müşteri',
      gsmNumber: '+905350000000',
      email: 'berkayyzgc@gmail.com',
      identityNumber: '74300864791',
      registrationAddress:
        payment.tableSession.restaurant.address ||
        'Test restoran adresi',
      ip: '85.34.78.112',
      city:
        payment.tableSession.restaurant.city ||
        'Istanbul',
      country: 'Turkey',
    },

    shippingAddress: {
      contactName: cardHolderName,
      city:
        payment.tableSession.restaurant.city ||
        'Istanbul',
      country: 'Turkey',
      address:
        payment.tableSession.restaurant.address ||
        'Test restoran adresi',
    },

    billingAddress: {
      contactName: cardHolderName,
      city:
        payment.tableSession.restaurant.city ||
        'Istanbul',
      country: 'Turkey',
      address:
        payment.tableSession.restaurant.address ||
        'Test restoran adresi',
    },

    basketItems: [
      {
        id: `PAYMENT-${payment.id}`,
        name: `${payment.tableSession.table.name} hesabı`,
        category1: 'Restaurant',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: amount,
      },
    ],
  };

  const iyzicoResult = await new Promise<any>(
    (resolve, reject) => {
      this.iyzipay.payment.create(
        request,
        (error: unknown, result: any) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        },
      );
    },
  );

console.log('===== IYZICO RESPONSE =====');
console.log(iyzicoResult);
console.log('===========================');

  if (iyzicoResult.status !== 'success') {
    await this.prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    throw new BadRequestException(
      iyzicoResult.errorMessage ||
        'iyzico ödemesi başarısız oldu',
    );
  }

  const completedPayment =
    await this.complete(paymentId);

  return {
    success: true,
    message: 'Ödeme başarıyla tamamlandı',
    iyzicoPaymentId: iyzicoResult.paymentId,
    payment: completedPayment,
  };
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