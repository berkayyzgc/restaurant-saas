-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TableSession" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "tableSessionId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
