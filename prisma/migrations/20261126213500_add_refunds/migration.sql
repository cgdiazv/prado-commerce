-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "refundNumber" SERIAL NOT NULL,
    "type" "RefundType" NOT NULL DEFAULT 'FULL',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "restockedUnits" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "items" JSONB,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Refund_refundNumber_key" ON "Refund"("refundNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Refund_storeId_idx" ON "Refund"("storeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Refund_createdAt_idx" ON "Refund"("createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Refund" ADD CONSTRAINT "Refund_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
