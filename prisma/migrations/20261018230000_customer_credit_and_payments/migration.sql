-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "lateInterestRate" DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "lateInterestGraceDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "cardFeePercentage" DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "cardFeeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allowCredit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditInterestRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "interestAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerPayment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "interestAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "reference" TEXT,
    "notes" TEXT,
    "receivedBy" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerPayment_storeId_idx" ON "CustomerPayment"("storeId");
CREATE INDEX IF NOT EXISTS "CustomerPayment_customerId_idx" ON "CustomerPayment"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerPayment_orderId_idx" ON "CustomerPayment"("orderId");
CREATE INDEX IF NOT EXISTS "CustomerPayment_paidAt_idx" ON "CustomerPayment"("paidAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CustomerPayment_storeId_fkey'
    ) THEN
        ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CustomerPayment_customerId_fkey'
    ) THEN
        ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CustomerPayment_orderId_fkey'
    ) THEN
        ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
