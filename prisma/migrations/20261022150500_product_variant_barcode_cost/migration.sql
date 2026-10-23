ALTER TABLE "ProductVariant"
ADD COLUMN "barcode" TEXT,
ADD COLUMN "cost" DECIMAL(10,2);

CREATE INDEX "ProductVariant_barcode_idx" ON "ProductVariant"("barcode");
