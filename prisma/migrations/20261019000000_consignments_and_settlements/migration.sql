-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ConsignmentType" AS ENUM ('RECEIVED', 'GIVEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ConsignmentStatus" AS ENUM ('ACTIVE', 'SETTLED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Consignment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "ConsignmentType" NOT NULL DEFAULT 'RECEIVED',
    "consignmentNumber" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "ConsignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "totalAgreedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalSettledAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConsignmentItem" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "variantId" TEXT,
    "productTitle" TEXT NOT NULL,
    "sku" TEXT,
    "initialQuantity" INTEGER NOT NULL,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "agreedCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "suggestedPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConsignmentSettlement" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "settlementNumber" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUnitsSold" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "reference" TEXT,
    "notes" TEXT,
    "settledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consignment_storeId_idx" ON "Consignment"("storeId");
CREATE INDEX IF NOT EXISTS "Consignment_status_idx" ON "Consignment"("status");
CREATE INDEX IF NOT EXISTS "Consignment_type_idx" ON "Consignment"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsignmentItem_consignmentId_idx" ON "ConsignmentItem"("consignmentId");
CREATE INDEX IF NOT EXISTS "ConsignmentItem_variantId_idx" ON "ConsignmentItem"("variantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsignmentSettlement_consignmentId_idx" ON "ConsignmentSettlement"("consignmentId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "Consignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ConsignmentSettlement" ADD CONSTRAINT "ConsignmentSettlement_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "Consignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
