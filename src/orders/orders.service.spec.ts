import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenGateway } from '../kitchen/kitchen.gateway';

describe('OrdersService', () => {
  let service: OrdersService;

  const prismaMock = {
    table: {
      findUnique: jest.fn(),
    },
    menuItem: {
      findMany: jest.fn(),
    },
    tableSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const kitchenGatewayMock = {
    sendNewOrder: jest.fn(),
    sendOrderUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: KitchenGateway,
          useValue: kitchenGatewayMock,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});