/*
  Warnings:

  - Added the required column `address` to the `Restaurant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Restaurant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
