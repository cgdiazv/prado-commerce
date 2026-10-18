-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "costPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "costPrice" DECIMAL(10,2);
