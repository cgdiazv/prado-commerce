-- AlterTable
ALTER TABLE "Store"
ADD COLUMN "shipStationApiKeyEncrypted" TEXT,
ADD COLUMN "shipStationApiSecretEncrypted" TEXT,
ADD COLUMN "shipStationWebhookId" TEXT,
ADD COLUMN "shipStationWebhookSecretHash" TEXT,
ADD COLUMN "shippingOrigin" JSONB;

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'SHIPPED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingCarrier" TEXT,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "shipStationOrderId" TEXT,
ADD COLUMN "shipStationSyncedAt" TIMESTAMP(3),
ADD COLUMN "shipStationSyncError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_shipStationOrderId_key" ON "Order"("shipStationOrderId");