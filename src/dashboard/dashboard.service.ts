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

  private buildHourlyRevenue(
  payments: Array<{
    amount: unknown;
    completedAt: Date | null;
  }>,
) {
  
  const hourlyRevenueMap = new Map<
    number,
    number
  >();

  for (
    let hour = 0;
    hour < 24;
    hour += 1
  ) {
    hourlyRevenueMap.set(hour, 0);
  }

  payments.forEach((payment) => {
    if (!payment.completedAt) {
      return;
    }

    const hour =
      new Date(
        payment.completedAt,
      ).getHours();

    const currentRevenue =
      hourlyRevenueMap.get(hour) ?? 0;

    hourlyRevenueMap.set(
      hour,
      currentRevenue +
        Number(payment.amount),
    );
  });

  return Array.from(
    hourlyRevenueMap.entries(),
  ).map(([hour, revenue]) => ({
    hour: `${String(hour).padStart(
      2,
      '0',
    )}:00`,
    revenue,
  }));
}

private buildDailyRevenue(
  payments: Array<{
    amount: unknown;
    completedAt: Date | null;
  }>,
  startDate: Date,
  endDate: Date,
) {
  const dailyRevenueMap = new Map<
    string,
    number
  >();

  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const finalDate = new Date(endDate);
  finalDate.setHours(0, 0, 0, 0);

  while (currentDate <= finalDate) {
    const dateKey =
      currentDate.toISOString().split('T')[0];

    dailyRevenueMap.set(dateKey, 0);

    currentDate.setDate(
      currentDate.getDate() + 1,
    );
  }

  payments.forEach((payment) => {
    if (!payment.completedAt) {
      return;
    }

    const paymentDate = new Date(
      payment.completedAt,
    );

    const dateKey =
      paymentDate.toISOString().split('T')[0];

    const currentRevenue =
      dailyRevenueMap.get(dateKey) ?? 0;

    dailyRevenueMap.set(
      dateKey,
      currentRevenue +
        Number(payment.amount),
    );
  });

  return Array.from(
    dailyRevenueMap.entries(),
  ).map(([date, revenue]) => ({
    date,
    label: new Intl.DateTimeFormat(
      'tr-TR',
      {
        day: '2-digit',
        month: 'short',
      },
    ).format(new Date(`${date}T00:00:00`)),
    revenue,
  }));
}

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

  async getComparisonReport(
  restaurantId: number,
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0')
    const day = String(
      date.getDate(),
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const todayDate = formatLocalDate(today)
  const yesterdayDate =
    formatLocalDate(yesterday)

  const [
    todayReport,
    yesterdayReport,
  ] = await Promise.all([
    this.getReports(
      'custom',
      todayDate,
      todayDate,
      restaurantId,
    ),
    this.getReports(
      'custom',
      yesterdayDate,
      yesterdayDate,
      restaurantId,
    ),
  ])

  const revenueDifference =
    todayReport.totalRevenue -
    yesterdayReport.totalRevenue

  const revenueChangePercentage =
    yesterdayReport.totalRevenue > 0
      ? Number(
          (
            (revenueDifference /
              yesterdayReport.totalRevenue) *
            100
          ).toFixed(2),
        )
      : todayReport.totalRevenue > 0
        ? 100
        : 0

  return {
    today: {
      totalRevenue:
        todayReport.totalRevenue,
      completedPayments:
        todayReport.completedPayments,
      averagePaymentValue:
        todayReport.averagePaymentValue,
      topSellingProduct:
        todayReport.topSellingProducts[0] ??
        null,
    },
    yesterday: {
      totalRevenue:
        yesterdayReport.totalRevenue,
      completedPayments:
        yesterdayReport.completedPayments,
      averagePaymentValue:
        yesterdayReport.averagePaymentValue,
      topSellingProduct:
        yesterdayReport
          .topSellingProducts[0] ?? null,
    },
    comparison: {
      revenueDifference,
      revenueChangePercentage,
      paymentDifference:
        todayReport.completedPayments -
        yesterdayReport.completedPayments,
    },
  }
}
async getReports(
  period = 'today',
  startDate?: string,
  endDate?: string,
  restaurantId?: number,
) {

  const now = new Date();

let reportStartDate: Date;
let reportEndDate: Date;

switch (period) {
  case '7d':
    reportStartDate = new Date(now);
    reportStartDate.setDate(
      reportStartDate.getDate() - 6,
    );
    reportStartDate.setHours(0, 0, 0, 0);

    reportEndDate = new Date(now);
    reportEndDate.setHours(23, 59, 59, 999);
    break;

  case '30d':
    reportStartDate = new Date(now);
    reportStartDate.setDate(
      reportStartDate.getDate() - 29,
    );
    reportStartDate.setHours(0, 0, 0, 0);

    reportEndDate = new Date(now);
    reportEndDate.setHours(23, 59, 59, 999);
    break;

  case 'thisMonth':
    reportStartDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    reportEndDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    break;

  case 'lastMonth':
    reportStartDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    reportEndDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    break;

  case 'custom':
    reportStartDate = startDate
      ? new Date(`${startDate}T00:00:00`)
      : new Date(now);

    reportEndDate = endDate
      ? new Date(`${endDate}T23:59:59.999`)
      : new Date(now);

    break;

  case 'today':
  default:
    reportStartDate = new Date(now);
    reportStartDate.setHours(0, 0, 0, 0);

    reportEndDate = new Date(now);
    reportEndDate.setHours(23, 59, 59, 999);
    break;
}

    const [
      completedPayments,
      soldItems,
      paymentRecords,
    ] = await Promise.all([

      this.prisma.payment.count({
        where: {
  ...(restaurantId && {
    tableSession: {
      restaurantId,
    },
  }),
          status: PaymentStatus.COMPLETED,
          completedAt: {
  gte: reportStartDate,
  lte: reportEndDate,
},
        },
      }),

      this.prisma.orderItem.findMany({
        where: {
  order: {
    tableSession: {
      restaurantId: restaurantId,
    },
          paymentStatus: OrderPaymentStatus.PAID,
           paidAt: {
            gte: reportStartDate,
             lte: reportEndDate,
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
  ...(restaurantId && {
    tableSession: {
      restaurantId,
    },
  }),
          status: PaymentStatus.COMPLETED,
          completedAt: {
  gte: reportStartDate,
  lte: reportEndDate,
},
        },
        select: {
  method: true,
  amount: true,
  completedAt: true,
},
      }),
    ]);

const selectedPeriodPayments =
  paymentRecords;

   const totalRevenue =
  selectedPeriodPayments.reduce(
    (total, payment) =>
      total + Number(payment.amount),
    0,
  );

  const averagePaymentValue =
  completedPayments > 0
    ? totalRevenue / completedPayments
    : 0;

  const hourlyRevenue =
  period === 'today'
    ? this.buildHourlyRevenue(
        selectedPeriodPayments,
      )
    : this.buildDailyRevenue(
        selectedPeriodPayments,
        reportStartDate,
        reportEndDate,
      ).map((dailyRevenue) => ({
        hour: dailyRevenue.label,
        date: dailyRevenue.date,
        revenue: dailyRevenue.revenue,
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
  period,
  startDate: reportStartDate,
  endDate: reportEndDate,
  totalRevenue,
  completedPayments,
  averagePaymentValue: Number(
    averagePaymentValue.toFixed(2),
  ),
  topSellingProducts,
  revenueChart: hourlyRevenue,
  paymentMethods,
};
  }
}