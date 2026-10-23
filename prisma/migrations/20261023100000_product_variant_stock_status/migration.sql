CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'ON_BACKORDER');

ALTER TABLE "ProductVariant"
ADD COLUMN "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK';

UPDATE "ProductVariant"
SET "stockStatus" = 'ON_BACKORDER'
WHERE "trackInventory" = false;

ALTER TABLE "ProductVariant"
DROP COLUMN "trackInventory";
