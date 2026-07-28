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
    items,
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
      },
    });

  if (!tableSession) {
    throw new NotFoundException(
      'Açık masa oturumu bulunamadı',
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

  const uniqueOrderItemIds = [
    ...new Set(items.map((item) => item.orderItemId)),
  ];

  if (uniqueOrderItemIds.length !== items.length) {
    throw new BadRequestException(
      'Aynı ürün ödeme listesine birden fazla kez eklenemez',
    );
  }

  const orderItems = await this.prisma.orderItem.findMany({
    where: {
      id: {
        in: uniqueOrderItemIds,
      },
      order: {
        tableSessionId,
        status: {
          not: 'CANCELLED',
        },
      },
    },
    include: {
      order: true,
    },
  });

  if (orderItems.length !== uniqueOrderItemIds.length) {
    throw new BadRequestException(
      'Seçilen ürünlerden biri bu masa oturumuna ait değil veya iptal edilmiş',
    );
  }

  const completedQuantities =
    await this.prisma.paymentItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItemId: {
          in: uniqueOrderItemIds,
        },
        payment: {
          status: PaymentStatus.COMPLETED,
        },
      },
      _sum: {
        quantity: true,
      },
    });

  const paidQuantityMap = new Map(
    completedQuantities.map((item) => [
      item.orderItemId,
      item._sum.quantity ?? 0,
    ]),
  );

  let amount = new Prisma.Decimal(0);

  const paymentItemsData = items.map((selectedItem) => {
    const orderItem = orderItems.find(
      (item) => item.id === selectedItem.orderItemId,
    );

    if (!orderItem) {
      throw new BadRequestException(
        'Seçilen sipariş ürünü bulunamadı',
      );
    }

    const paidQuantity =
      paidQuantityMap.get(orderItem.id) ?? 0;

    const remainingQuantity =
      orderItem.quantity - paidQuantity;

    if (remainingQuantity <= 0) {
      throw new BadRequestException(
        `${orderItem.itemName} ürünü zaten tamamen ödendi`,
      );
    }

    if (selectedItem.quantity > remainingQuantity) {
      throw new BadRequestException(
        `${orderItem.itemName} için en fazla ${remainingQuantity} adet ödenebilir`,
      );
    }

    const itemAmount = orderItem.unitPrice.mul(
      selectedItem.quantity,
    );

    amount = amount.plus(itemAmount);

    return {
      orderItemId: orderItem.id,
      quantity: selectedItem.quantity,
      unitPrice: orderItem.unitPrice,
      amount: itemAmount,
    };
  });

  if (amount.lessThanOrEqualTo(0)) {
    throw new BadRequestException(
      'Ödeme tutarı sıfırdan büyük olmalıdır',
    );
  }

  if (!keepSessionOpen) {
  const sessionOrders = await this.prisma.order.findMany({
    where: {
      tableSessionId,
      status: {
        not: 'CANCELLED',
      },
    },
    include: {
      items: {
        include: {
          paymentItems: {
            where: {
              payment: {
                status: PaymentStatus.COMPLETED,
              },
            },
          },
        },
      },
    },
  })

  let totalRemainingAmount = new Prisma.Decimal(0)

  for (const order of sessionOrders) {
    for (const orderItem of order.items) {
      const paidQuantity = orderItem.paymentItems.reduce(
        (total, paymentItem) =>
          total + paymentItem.quantity,
        0,
      )

      const remainingQuantity = Math.max(
        orderItem.quantity - paidQuantity,
        0,
      )

      totalRemainingAmount = totalRemainingAmount.plus(
        orderItem.unitPrice.mul(remainingQuantity),
      )
    }
  }

  if (!amount.equals(totalRemainingAmount)) {
    throw new BadRequestException(
      'Masadan ayrılmak için kalan hesabın tamamının ödenmesi gerekiyor',
    )
  }
}

  return this.prisma.payment.create({
    data: {
      tableSessionId,
      amount,
      method,
      status: PaymentStatus.PENDING,
      keepSessionOpen,
      items: {
        create: paymentItemsData,
      },
    },
    include: {
      items: {
        include: {
          orderItem: true,
        },
      },
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
      items: {
        include: {
          orderItem: {
            include: {
              order: true,
            },
          },
        },
      },
      tableSession: {
        include: {
          table: true,
          restaurant: true,
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

  if (payment.items.length === 0) {
    throw new BadRequestException(
      'Bu ödeme için seçilmiş ürün bulunmuyor',
    );
  }

  const completedAt = new Date();

  return this.prisma.$transaction(
    async (transaction) => {
      await transaction.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status: PaymentStatus.COMPLETED,
          completedAt,
        },
      });

      const affectedOrderIds = [
        ...new Set(
          payment.items.map(
            (paymentItem) =>
              paymentItem.orderItem.orderId,
          ),
        ),
      ];

      const affectedOrders =
        await transaction.order.findMany({
          where: {
            id: {
              in: affectedOrderIds,
            },
          },
          include: {
            items: {
              include: {
                paymentItems: {
                  where: {
                    payment: {
                      status: PaymentStatus.COMPLETED,
                    },
                  },
                },
              },
            },
          },
        });

      for (const order of affectedOrders) {
        const isFullyPaid = order.items.every(
          (orderItem) => {
            const paidQuantity =
              orderItem.paymentItems.reduce(
                (total, paymentItem) =>
                  total + paymentItem.quantity,
                0,
              );

            return paidQuantity >= orderItem.quantity;
          },
        );

        await transaction.order.update({
          where: {
            id: order.id,
          },
          data: isFullyPaid
            ? {
                paymentStatus:
                  OrderPaymentStatus.PAID,
                paidAt: completedAt,
              }
            : {
                paymentStatus:
                  OrderPaymentStatus.UNPAID,
                paidAt: null,
              },
        });
      }

      const sessionOrders =
        await transaction.order.findMany({
          where: {
            tableSessionId: payment.tableSessionId,
            status: {
              not: 'CANCELLED',
            },
          },
          include: {
            items: {
              include: {
                paymentItems: {
                  where: {
                    payment: {
                      status: PaymentStatus.COMPLETED,
                    },
                  },
                },
              },
            },
          },
        });

      const allSessionItemsPaid =
        sessionOrders.length > 0 &&
        sessionOrders.every((order) =>
          order.items.every((orderItem) => {
            const paidQuantity =
              orderItem.paymentItems.reduce(
                (total, paymentItem) =>
                  total + paymentItem.quantity,
                0,
              );

            return paidQuantity >= orderItem.quantity;
          }),
        );

      if (
        !payment.keepSessionOpen &&
        allSessionItemsPaid
      ) {
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

      const completedPayment =
        await transaction.payment.findUnique({
          where: {
            id: paymentId,
          },
          include: {
            items: {
              include: {
                orderItem: true,
              },
            },
            tableSession: {
              include: {
                table: true,
                restaurant: true,
                orders: {
                  include: {
                    items: {
                      include: {
                        paymentItems: {
                          include: {
                            payment: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

      if (!completedPayment) {
        throw new NotFoundException(
          'Tamamlanan ödeme bulunamadı',
        );
      }

      this.kitchenGateway.sendPaymentCompleted(
        completedPayment,
      );

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
  items: {
    include: {
      orderItem: true,
    },
  },
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

    basketItems: payment.items.map((paymentItem) => ({
  id: `ORDER-ITEM-${paymentItem.orderItemId}`,
  name: `${paymentItem.orderItem.itemName} x${paymentItem.quantity}`,
  category1: 'Restaurant',
  itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
  price: paymentItem.amount.toFixed(2),
})),
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
    items: {
      include: {
        orderItem: true,
      },
    },
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
  items: {
    include: {
      orderItem: true,
    },
  },
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
      if (payment.items.length === 0) {
  throw new BadRequestException(
    'Ödeme için seçilmiş ürün bulunamadı',
  );
}

    

    
    return payment;
  }
}