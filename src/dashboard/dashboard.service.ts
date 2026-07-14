import { Injectable } from '@nestjs/common';
import {
  OrderPaymentStatus,
  OrderStatus,
  PaymentStatus,
  TableSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getSummary() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1,
    );

    const [
      revenueResult,
      activeOrders,
      occupiedTables,
      preparingOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          paymentStatus: OrderPaymentStatus.PAID,
          paidAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        _sum: {
          totalPrice: true,
        },
      }),

      this.prisma.order.count({
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
      }),

      this.prisma.tableSession.count({
        where: {
          status: TableSessionStatus.OPEN,
        },
      }),

      this.prisma.order.count({
        where: {
          status: OrderStatus.PREPARING,
        },
      }),
    ]);

    return {
      todayRevenue: Number(
        revenueResult._sum.totalPrice ?? 0,
      ),
      activeOrders,
      occupiedTables,
      preparingOrders,
    };
  }

  async getReports() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1,
    );

    const startOfLast7Days = new Date(startOfToday);
    startOfLast7Days.setDate(
      startOfLast7Days.getDate() - 6,
    );

    const [
      todayPaidOrders,
      last7DaysPaidOrders,
      completedPayments,
      soldItems,
      paymentRecords,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          paymentStatus: OrderPaymentStatus.PAID,
          paidAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        select: {
          id: true,
          totalPrice: true,
          paidAt: true,
        },
      }),

      this.prisma.order.findMany({
        where: {
          paymentStatus: OrderPaymentStatus.PAID,
          paidAt: {
            gte: startOfLast7Days,
            lt: startOfTomorrow,
          },
        },
        select: {
          totalPrice: true,
          paidAt: true,
        },
      }),

      this.prisma.payment.count({
        where: {
          status: PaymentStatus.COMPLETED,
          completedAt: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
      }),

      this.prisma.orderItem.findMany({
        where: {
          order: {
            paymentStatus: OrderPaymentStatus.PAID,
            paidAt: {
              gte: startOfLast7Days,
              lt: startOfTomorrow,
            },
          },
        },
        select: {
          itemName: true,
          quantity: true,
          unitPrice: true,
        },
      }),

      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.COMPLETED,
          completedAt: {
            gte: startOfLast7Days,
            lt: startOfTomorrow,
          },
        },
        select: {
          method: true,
          amount: true,
        },
      }),
    ]);

    const todayRevenue = todayPaidOrders.reduce(
      (total, order) =>
        total + Number(order.totalPrice),
      0,
    );

    const last7DaysRevenue =
      last7DaysPaidOrders.reduce(
        (total, order) =>
          total + Number(order.totalPrice),
        0,
      );

    const averageOrderValue =
      todayPaidOrders.length > 0
        ? todayRevenue / todayPaidOrders.length
        : 0;

    const hourlyRevenueMap = new Map<
      number,
      number
    >();

    for (let hour = 0; hour < 24; hour += 1) {
      hourlyRevenueMap.set(hour, 0);
    }

    todayPaidOrders.forEach((order) => {
      if (!order.paidAt) {
        return;
      }

      const hour = new Date(
        order.paidAt,
      ).getHours();

      const currentRevenue =
        hourlyRevenueMap.get(hour) ?? 0;

      hourlyRevenueMap.set(
        hour,
        currentRevenue +
          Number(order.totalPrice),
      );
    });

    const hourlyRevenue = Array.from(
      hourlyRevenueMap.entries(),
    ).map(([hour, revenue]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      revenue,
    }));

    const productMap = new Map<
      string,
      {
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    soldItems.forEach((item) => {
      const existingProduct =
        productMap.get(item.itemName);

      const itemRevenue =
        Number(item.unitPrice) * item.quantity;

      if (existingProduct) {
        existingProduct.quantity += item.quantity;
        existingProduct.revenue += itemRevenue;
        return;
      }

      productMap.set(item.itemName, {
        name: item.itemName,
        quantity: item.quantity,
        revenue: itemRevenue,
      });
    });

    const topSellingProducts = Array.from(
      productMap.values(),
    )
      .sort(
        (firstProduct, secondProduct) =>
          secondProduct.quantity -
          firstProduct.quantity,
      )
      .slice(0, 5);

    const paymentMethodMap = new Map<
      string,
      {
        method: string;
        count: number;
        amount: number;
      }
    >();

    paymentRecords.forEach((payment) => {
      const existingMethod =
        paymentMethodMap.get(payment.method);

      if (existingMethod) {
        existingMethod.count += 1;
        existingMethod.amount += Number(
          payment.amount,
        );
        return;
      }

      paymentMethodMap.set(payment.method, {
        method: payment.method,
        count: 1,
        amount: Number(payment.amount),
      });
    });

    const totalPaymentAmount =
      paymentRecords.reduce(
        (total, payment) =>
          total + Number(payment.amount),
        0,
      );

    const paymentMethods = Array.from(
      paymentMethodMap.values(),
    ).map((paymentMethod) => ({
      ...paymentMethod,
      percentage:
        totalPaymentAmount > 0
          ? Number(
              (
                (paymentMethod.amount /
                  totalPaymentAmount) *
                100
              ).toFixed(2),
            )
          : 0,
    }));

    return {
      todayRevenue,
      last7DaysRevenue,
      completedPayments,
      averageOrderValue: Number(
        averageOrderValue.toFixed(2),
      ),
      topSellingProducts,
      hourlyRevenue,
      paymentMethods,
    };
  }
}