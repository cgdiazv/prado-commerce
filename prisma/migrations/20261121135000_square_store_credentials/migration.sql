-- AlterTable
ALTER TABLE "Store" ADD COLUMN "squareApplicationId" TEXT,
ADD COLUMN "squareLocationId" TEXT,
ADD COLUMN "squareAccessTokenEncrypted" TEXT,
ADD COLUMN "squareEnv" TEXT NOT NULL DEFAULT 'sandbox';

